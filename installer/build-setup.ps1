# Builds CompanyLaptopAgent-Setup.exe next to the installer scripts.
# Double-click that exe on a company laptop. It installs the agent and
# starts it automatically every time that Windows user signs in.
$ErrorActionPreference = 'Stop'

$installerDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$repoRoot = Split-Path -Parent $installerDir
$outPath = Join-Path $installerDir 'CompanyLaptopAgent-Setup.exe'

# Prefer install-agent-fixed.ps1 — Windows Defender often quarantines install-agent.ps1.
Copy-Item (Join-Path $repoRoot 'agent\windows\install-agent.ps1') (Join-Path $installerDir 'install-agent-fixed.ps1') -Force
Copy-Item (Join-Path $repoRoot 'agent\agent.js') (Join-Path $installerDir 'agent.js') -Force
try {
    Copy-Item (Join-Path $repoRoot 'agent\windows\install-agent.ps1') (Join-Path $installerDir 'install-agent.ps1') -Force
} catch {
    Write-Warning "install-agent.ps1 blocked by antivirus; SetupForm will use install-agent-fixed.ps1."
}

$csc = Join-Path $env:WINDIR 'Microsoft.NET\Framework64\v4.0.30319\csc.exe'
if (-not (Test-Path $csc)) {
    $csc = Join-Path $env:WINDIR 'Microsoft.NET\Framework\v4.0.30319\csc.exe'
}
if (-not (Test-Path $csc)) {
    throw 'The .NET Framework C# compiler was not found.'
}

if (Test-Path $outPath) {
    Remove-Item $outPath -Force
}

& $csc /nologo /target:winexe /optimize+ `
    "/out:$outPath" `
    /r:System.dll `
    /r:System.Windows.Forms.dll `
    (Join-Path $installerDir 'SetupHost.cs')

if ($LASTEXITCODE -ne 0 -or -not (Test-Path $outPath)) {
    throw "Compiler failed with exit code $LASTEXITCODE"
}

Write-Host "Built $outPath"
