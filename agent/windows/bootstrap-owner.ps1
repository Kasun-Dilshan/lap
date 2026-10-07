# =====================================================================
# CLTMS — Owner laptop bootstrap
# Installs Node.js 18+ (portable) if missing, installs the agent,
# registers logon auto-start, and starts tracking.
# Safe to re-run. Prefer user-local install (no admin required).
# =====================================================================
param(
    [Parameter(Mandatory = $true)][string]$ServerUrl,
    [Parameter(Mandatory = $true)][string]$UserToken,
    [string]$DeviceId = "",
    [string]$NodeVersion = "20.18.1"
)

$ErrorActionPreference = 'Stop'
$ProgressPreference = 'SilentlyContinue'

function Write-Step([string]$msg) {
    Write-Host "[CLTMS] $msg" -ForegroundColor Cyan
}

function Write-Ok([string]$msg) {
    Write-Host "[CLTMS] $msg" -ForegroundColor Green
}

function Write-Warn([string]$msg) {
    Write-Host "[CLTMS] $msg" -ForegroundColor Yellow
}

$ServerUrl = $ServerUrl.TrimEnd('/')
$installDir = Join-Path $env:LOCALAPPDATA 'CompanyLaptopAgent'
$nodeHome = Join-Path $installDir 'node'
$nodeExe = Join-Path $nodeHome 'node.exe'
$agentJs = Join-Path $installDir 'agent.js'
$configPath = Join-Path $installDir 'agent_config.json'
$taskName = 'CompanyLaptopMonitoringAgent'

if (-not (Test-Path $installDir)) {
    New-Item -ItemType Directory -Path $installDir -Force | Out-Null
}

# ---------------------------------------------------------------------
# 1. Ensure Node.js 18+ (prefer existing PATH, else portable install)
# ---------------------------------------------------------------------

function Get-NodeMajor([string]$exe) {
    try {
        $ver = & $exe -v 2>$null
        if ($ver -match 'v?(\d+)\.') { return [int]$Matches[1] }
    } catch {}
    return 0
}

$resolvedNode = $null
$pathNode = (Get-Command node -ErrorAction SilentlyContinue)?.Path
if ($pathNode -and (Get-NodeMajor $pathNode) -ge 18) {
    $resolvedNode = $pathNode
    Write-Ok "Found Node.js on PATH: $resolvedNode"
}

if (-not $resolvedNode -and (Test-Path $nodeExe) -and (Get-NodeMajor $nodeExe) -ge 18) {
    $resolvedNode = $nodeExe
    Write-Ok "Found portable Node.js: $resolvedNode"
}

if (-not $resolvedNode) {
    Write-Step "Node.js 18+ not found. Downloading portable Node.js $NodeVersion..."
    $arch = if ([Environment]::Is64BitOperatingSystem) { 'x64' } else { 'x86' }
    $zipName = "node-v$NodeVersion-win-$arch.zip"
    $zipUrl = "https://nodejs.org/dist/v$NodeVersion/$zipName"
    $zipPath = Join-Path $env:TEMP $zipName
    $extractRoot = Join-Path $env:TEMP "node-extract-$NodeVersion"

    try {
        Invoke-WebRequest -Uri $zipUrl -OutFile $zipPath -UseBasicParsing
    } catch {
        # Fallback: winget (may prompt / need admin)
        Write-Warn "Direct Node download failed. Trying winget..."
        $winget = Get-Command winget -ErrorAction SilentlyContinue
        if (-not $winget) { throw "Could not download Node.js and winget is unavailable. Install Node.js 18+ manually, then sign in again." }
        & winget install -e --id OpenJS.NodeJS.LTS --accept-package-agreements --accept-source-agreements --silent
        $pathNode = (Get-Command node -ErrorAction SilentlyContinue)?.Path
        if (-not $pathNode -or (Get-NodeMajor $pathNode) -lt 18) {
            throw "Node.js install via winget did not succeed."
        }
        $resolvedNode = $pathNode
    }

    if (-not $resolvedNode) {
        if (Test-Path $extractRoot) { Remove-Item $extractRoot -Recurse -Force -ErrorAction SilentlyContinue }
        Expand-Archive -Path $zipPath -DestinationPath $extractRoot -Force
        $inner = Get-ChildItem $extractRoot -Directory | Select-Object -First 1
        if (-not $inner) { throw "Node.js zip extracted empty." }
        if (Test-Path $nodeHome) { Remove-Item $nodeHome -Recurse -Force -ErrorAction SilentlyContinue }
        Move-Item -Path $inner.FullName -Destination $nodeHome -Force
        Remove-Item $zipPath -Force -ErrorAction SilentlyContinue
        Remove-Item $extractRoot -Recurse -Force -ErrorAction SilentlyContinue
        if (-not (Test-Path $nodeExe)) { throw "Portable Node.js install failed (node.exe missing)." }
        $resolvedNode = $nodeExe
        Write-Ok "Portable Node.js $NodeVersion installed to $nodeHome"
    }
}

# ---------------------------------------------------------------------
# 2. Download agent.js from the company server
# ---------------------------------------------------------------------

Write-Step "Downloading tracking agent..."
$agentUrl = "$ServerUrl/api/agent/agent.js"
Invoke-WebRequest -Uri $agentUrl -OutFile $agentJs -UseBasicParsing
if (-not (Test-Path $agentJs)) { throw "Failed to download agent.js" }
Write-Ok "Agent saved to $agentJs"

# ---------------------------------------------------------------------
# 3. Register device token via owner agent-install API
# ---------------------------------------------------------------------

Write-Step "Registering this laptop with the tracking system..."
$hostname = $env:COMPUTERNAME
$bodyObj = @{
    device_id     = $(if ($DeviceId) { $DeviceId } else { "HW-$hostname" })
    hostname      = $hostname
    os            = 'Windows'
    os_version    = [System.Environment]::OSVersion.VersionString
    architecture  = if ([Environment]::Is64BitOperatingSystem) { 'x64' } else { 'x86' }
    windows_user  = $env:USERNAME
    session_state = 'active'
}
$bodyJson = $bodyObj | ConvertTo-Json -Compress

$headers = @{
    Authorization  = "Bearer $UserToken"
    'Content-Type' = 'application/json'
}

try {
    $reg = Invoke-RestMethod -Method POST -Uri "$ServerUrl/api/owner/agent-install" -Headers $headers -Body $bodyJson
} catch {
    throw "Agent registration failed: $($_.Exception.Message)"
}

if (-not $reg.success -or -not $reg.data.device_token) {
    throw ($reg.message -or 'Agent registration rejected by server.')
}

$config = @{
    server_url          = ($reg.data.server_url -or $ServerUrl)
    device_token        = $reg.data.device_token
    device_id           = $reg.data.device_id
    asset_id            = $reg.data.asset_id
    heartbeat_interval  = ($reg.data.heartbeat_interval -or 60)
    installed_path      = $agentJs
}
$utf8 = New-Object System.Text.UTF8Encoding $false
[System.IO.File]::WriteAllText($configPath, (($config | ConvertTo-Json) + "`n"), $utf8)
Write-Ok "Registered as $($reg.data.asset_id)"

# ---------------------------------------------------------------------
# 4. Scheduled task — run at every Windows sign-in
# ---------------------------------------------------------------------

Write-Step "Configuring auto-start on Windows logon..."
$arg = "`"$agentJs`" --server=`"$($config.server_url)`""
try {
    Unregister-ScheduledTask -TaskName $taskName -Confirm:$false -ErrorAction SilentlyContinue
    $action = New-ScheduledTaskAction -Execute $resolvedNode -Argument $arg -WorkingDirectory $installDir
    $trigger = New-ScheduledTaskTrigger -AtLogOn -User $env:USERNAME
    $principal = New-ScheduledTaskPrincipal -UserId $env:USERNAME -LogonType Interactive -RunLevel Limited
    $settings = New-ScheduledTaskSettingsSet -AllowStartIfOnBatteries -DontStopIfGoingOnBatteries -RestartCount 3 -RestartInterval (New-TimeSpan -Minutes 1)
    Register-ScheduledTask -TaskName $taskName -Action $action -Trigger $trigger -Principal $principal -Settings $settings -Description 'Company Laptop Tracking Agent (auto-installed on owner login)' | Out-Null
    Write-Ok "Scheduled task '$taskName' registered."
} catch {
    Write-Warn "Scheduled task failed ($($_.Exception.Message)). Creating Startup shortcut instead..."
    $startup = [Environment]::GetFolderPath('Startup')
    $lnk = Join-Path $startup 'CompanyLaptopAgent.lnk'
    $w = New-Object -ComObject WScript.Shell
    $s = $w.CreateShortcut($lnk)
    $s.TargetPath = $resolvedNode
    $s.Arguments = $arg
    $s.WorkingDirectory = $installDir
    $s.Save()
}

# ---------------------------------------------------------------------
# 5. Start agent now
# ---------------------------------------------------------------------

Write-Step "Starting tracking agent..."
Start-Process -FilePath $resolvedNode -ArgumentList $arg -WorkingDirectory $installDir -WindowStyle Hidden
Write-Ok "Done. Node.js + tracking agent are installed and running on this laptop."
Write-Host ""
Write-Host "You can close this window. Tracking continues in the background." -ForegroundColor Green
Start-Sleep -Seconds 4
