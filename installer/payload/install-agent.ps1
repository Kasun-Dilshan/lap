# =====================================================================
# Company Laptop Tracking & Management System (CLTMS)
# Windows Agent Installer & Scheduled Task Auto-Start Setup
# =====================================================================
param (
    [string]$ServerUrl = "http://localhost:5000",
    [string]$EnrollmentToken = ""
)

Write-Host "======================================================" -ForegroundColor Cyan
Write-Host "   Company Laptop Agent - Windows Installer" -ForegroundColor Cyan
Write-Host "======================================================" -ForegroundColor Cyan

# 1. Check Administrator Privileges
$isAdmin = ([Security.Principal.WindowsPrincipal][Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)
if (-not $isAdmin) {
    Write-Warning "Running without elevated Admin privileges. Task will be installed in Current User scope."
}

# 2. Ensure Node.js 18+ (PATH, then portable under LocalAppData)
function Get-NodeMajor([string]$exe) {
    try {
        $ver = & $exe -v 2>$null
        if ($ver -match 'v?(\d+)\.') { return [int]$Matches[1] }
    } catch {}
    return 0
}

$userAgentDir = Join-Path $env:LOCALAPPDATA 'CompanyLaptopAgent'
$portableNode = Join-Path $userAgentDir 'node\node.exe'
$nodePath = (Get-Command node -ErrorAction SilentlyContinue).Path

if (-not $nodePath -or (Get-NodeMajor $nodePath) -lt 18) {
    if ((Test-Path $portableNode) -and (Get-NodeMajor $portableNode) -ge 18) {
        $nodePath = $portableNode
    }
}

if (-not $nodePath -or (Get-NodeMajor $nodePath) -lt 18) {
    Write-Host "Node.js 18+ not found. Installing portable Node.js LTS..." -ForegroundColor Yellow
    if (-not (Test-Path $userAgentDir)) {
        New-Item -ItemType Directory -Path $userAgentDir -Force | Out-Null
    }
    $nodeVer = '20.18.1'
    $arch = if ([Environment]::Is64BitOperatingSystem) { 'x64' } else { 'x86' }
    $zipName = "node-v$nodeVer-win-$arch.zip"
    $zipUrl = "https://nodejs.org/dist/v$nodeVer/$zipName"
    $zipPath = Join-Path $env:TEMP $zipName
    $extractRoot = Join-Path $env:TEMP "cltms-node-$nodeVer"
    $ProgressPreference = 'SilentlyContinue'
    try {
        Invoke-WebRequest -Uri $zipUrl -OutFile $zipPath -UseBasicParsing
        if (Test-Path $extractRoot) { Remove-Item $extractRoot -Recurse -Force -ErrorAction SilentlyContinue }
        Expand-Archive -Path $zipPath -DestinationPath $extractRoot -Force
        $inner = Get-ChildItem $extractRoot -Directory | Select-Object -First 1
        $nodeHome = Join-Path $userAgentDir 'node'
        if (Test-Path $nodeHome) { Remove-Item $nodeHome -Recurse -Force -ErrorAction SilentlyContinue }
        Move-Item -Path $inner.FullName -Destination $nodeHome -Force
        Remove-Item $zipPath -Force -ErrorAction SilentlyContinue
        Remove-Item $extractRoot -Recurse -Force -ErrorAction SilentlyContinue
        $nodePath = Join-Path $nodeHome 'node.exe'
    } catch {
        $winget = Get-Command winget -ErrorAction SilentlyContinue
        if ($winget) {
            Write-Host "Trying winget OpenJS.NodeJS.LTS..." -ForegroundColor Yellow
            & winget install -e --id OpenJS.NodeJS.LTS --accept-package-agreements --accept-source-agreements --silent
            $nodePath = (Get-Command node -ErrorAction SilentlyContinue).Path
        }
    }
}

if (-not $nodePath -or -not (Test-Path $nodePath) -or (Get-NodeMajor $nodePath) -lt 18) {
    Write-Error "Could not install Node.js 18+. Install it from https://nodejs.org then re-run this installer."
    exit 1
}
Write-Host "Using Node.js at: $nodePath" -ForegroundColor Green

# 3. Agent Directory Destination (prefer LocalAppData — no admin required)
$installDir = $userAgentDir
try {
    $programData = "C:\ProgramData\CompanyLaptopAgent"
    if (-not (Test-Path $programData)) {
        New-Item -ItemType Directory -Path $programData -Force -ErrorAction Stop | Out-Null
    }
    $installDir = $programData
} catch {
    if (-not (Test-Path $installDir)) {
        New-Item -ItemType Directory -Path $installDir -Force | Out-Null
    }
}

$agentSrc = Join-Path $PSScriptRoot "agent.js"
if (-not (Test-Path $agentSrc)) {
    $agentSrc = Join-Path (Split-Path $PSScriptRoot -Parent) "agent.js"
}
$targetScript = Join-Path $installDir "agent.js"

Copy-Item -Path $agentSrc -Destination $targetScript -Force
Write-Host "Copied Laptop Agent to $targetScript" -ForegroundColor Green

# 4. Create Windows Scheduled Task for Auto-Start on sign-in
$taskName = "CompanyLaptopMonitoringAgent"
$action = New-ScheduledTaskAction -Execute "$nodePath" -Argument "`"$targetScript`" --server=`"$ServerUrl`"" -WorkingDirectory "$installDir"
$trigger = New-ScheduledTaskTrigger -AtLogOn -User $env:USERNAME
$principal = New-ScheduledTaskPrincipal -UserId $env:USERNAME -LogonType Interactive -RunLevel Limited
$settings = New-ScheduledTaskSettingsSet -AllowStartIfOnBatteries -DontStopIfGoingOnBatteries -StartWhenAvailable -RestartCount 3 -RestartInterval (New-TimeSpan -Minutes 1)

try {
    Unregister-ScheduledTask -TaskName $taskName -Confirm:$false -ErrorAction SilentlyContinue
    Register-ScheduledTask -TaskName $taskName -Action $action -Trigger $trigger -Principal $principal -Settings $settings -Description "Company Laptop IT Asset Tracking & Telemetry Agent" | Out-Null
    Write-Host "Scheduled Task '$taskName' registered. It starts when this user signs in." -ForegroundColor Green
} catch {
    Write-Warning "Could not register Scheduled Task. Falling back to Startup folder shortcut..."
    $startupFolder = [Environment]::GetFolderPath("Startup")
    $shortcutPath = Join-Path $startupFolder "CompanyLaptopAgent.lnk"
    $wscript = New-Object -ComObject WScript.Shell
    $shortcut = $wscript.CreateShortcut($shortcutPath)
    $shortcut.TargetPath = "$nodePath"
    $shortcut.Arguments = "`"$targetScript`" --server=`"$ServerUrl`""
    $shortcut.WorkingDirectory = "$installDir"
    $shortcut.WindowStyle = 7
    $shortcut.Save()
    Write-Host "Created Startup shortcut at: $shortcutPath" -ForegroundColor Green
}

# 5. Start the agent now so the laptop does not have to be restarted first
$launchArgs = @($targetScript, "--server=$ServerUrl")
if ($EnrollmentToken) {
    Write-Host "Registering device with Enrollment Token: $EnrollmentToken..." -ForegroundColor Yellow
    $launchArgs += "--token=$EnrollmentToken"
} else {
    Write-Host "No enrollment token provided. The agent will start and can enroll when a token is supplied." -ForegroundColor Yellow
}
Start-Process -FilePath $nodePath -ArgumentList $launchArgs -WorkingDirectory $installDir -WindowStyle Hidden
Write-Host "Agent is running now, and it will start again at the next Windows sign-in." -ForegroundColor Green

Write-Host "`nAgent Installation and Auto-Start Configuration Complete!" -ForegroundColor Cyan
