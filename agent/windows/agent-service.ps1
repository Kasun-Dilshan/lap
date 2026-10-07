# =====================================================================
# Company Laptop Tracking & Management System (CLTMS)
# Windows Background Agent Launcher
# =====================================================================
param(
    [string]$ServerUrl = "http://localhost:5000",
    [string]$EnrollmentToken = ""
)

$scriptDir = Split-Path $PSScriptRoot -Parent
$agentScript = Join-Path $scriptDir "agent.js"

$nodePath = (Get-Command node -ErrorAction SilentlyContinue).Path
if (-not $nodePath) {
    Write-Error "Node.js not installed or not in PATH."
    exit 1
}

$argsList = @("`"$agentScript`"", "--server=`"$ServerUrl`"")
if ($EnrollmentToken) {
    $argsList += "--token=`"$EnrollmentToken`""
}

Write-Host "Starting Company Laptop Background Agent..." -ForegroundColor Green
Start-Process -FilePath "$nodePath" -ArgumentList $argsList -NoNewWindow
