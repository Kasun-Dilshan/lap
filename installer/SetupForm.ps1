# Setup window for the company laptop agent.
# Asks for server, username, and password. Creates the user on the server,
# installs the agent on this laptop, and shows the person to admins.
$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.Windows.Forms
Add-Type -AssemblyName System.Drawing

$installer = Join-Path $PSScriptRoot 'install-agent-fixed.ps1'
if (-not (Test-Path $installer)) {
    $installer = Join-Path $PSScriptRoot 'install-agent.ps1'
}
if (-not (Test-Path $installer)) {
    [System.Windows.Forms.MessageBox]::Show("Could not find install-agent-fixed.ps1 next to this setup program.", "Company Laptop Agent")
    exit 1
}

function Get-LaptopSnapshot {
    $uuid = $null
    $serial = $null
    $manufacturer = $null
    $model = $null
    try {
        $product = Get-CimInstance -ClassName Win32_ComputerSystemProduct -ErrorAction Stop
        $uuid = [string]$product.UUID
        $serial = [string]$product.IdentifyingNumber
    } catch {
    }
    try {
        $cs = Get-CimInstance -ClassName Win32_ComputerSystem -ErrorAction Stop
        $manufacturer = [string]$cs.Manufacturer
        $model = [string]$cs.Model
    } catch {
    }
    if (-not $uuid) { $uuid = "HW-$env:COMPUTERNAME" }
    if (-not $serial) { $serial = $uuid }

    $ramGb = 0
    try {
        $ramGb = [math]::Round((Get-CimInstance Win32_ComputerSystem).TotalPhysicalMemory / 1GB)
    } catch {
    }

    return @{
        device_id      = $uuid
        hostname       = $env:COMPUTERNAME
        name           = "$env:COMPUTERNAME Laptop"
        manufacturer   = $(if ($manufacturer) { $manufacturer } else { 'Standard OEM' })
        model          = $(if ($model) { $model } else { 'Corporate Laptop' })
        serial_number  = $serial
        os             = 'Windows'
        os_version     = [System.Environment]::OSVersion.VersionString
        architecture   = $(if ([Environment]::Is64BitOperatingSystem) { 'x64' } else { 'x86' })
        ram_total_gb   = $ramGb
        windows_user   = $env:USERNAME
        session_state  = 'active'
        local_ip       = (
            Get-NetIPAddress -AddressFamily IPv4 -ErrorAction SilentlyContinue |
            Where-Object { $_.IPAddress -notlike '127.*' -and $_.PrefixOrigin -ne 'WellKnown' } |
            Select-Object -First 1 -ExpandProperty IPAddress
        )
    }
}

function Register-OwnerOnServer {
    param(
        [string]$ServerUrl,
        [string]$Username,
        [string]$Password,
        [string]$DisplayName,
        [hashtable]$Laptop
    )

    $uri = "$ServerUrl/api/owner/install-register"
    $body = @{
        username = $Username
        password = $Password
        name     = $DisplayName
        laptop   = $Laptop
    } | ConvertTo-Json -Depth 6

    try {
        $response = Invoke-RestMethod -Method Post -Uri $uri -Body $body -ContentType 'application/json; charset=utf-8' -TimeoutSec 60
    } catch {
        $msg = $_.Exception.Message
        if ($_.ErrorDetails -and $_.ErrorDetails.Message) {
            try {
                $parsed = $_.ErrorDetails.Message | ConvertFrom-Json
                if ($parsed.message) { $msg = [string]$parsed.message }
            } catch {
                $msg = [string]$_.ErrorDetails.Message
            }
        }
        throw $msg
    }

    if (-not $response.success -or -not $response.data.agent_install.device_token) {
        throw ($(if ($response.message) { $response.message } else { 'Server rejected signup.' }))
    }
    return $response.data
}

$form = New-Object System.Windows.Forms.Form
$form.Text = 'Company Laptop Agent Setup'
$form.FormBorderStyle = 'FixedDialog'
$form.MaximizeBox = $false
$form.MinimizeBox = $false
$form.StartPosition = 'CenterScreen'
$form.ClientSize = New-Object System.Drawing.Size(560, 460)
$form.Font = New-Object System.Drawing.Font('Segoe UI', 9)

$title = New-Object System.Windows.Forms.Label
$title.Text = "Create your account and install tracking on this laptop.`r`nAdmins can see you under Employees and Devices after install."
$title.Location = New-Object System.Drawing.Point(20, 16)
$title.Size = New-Object System.Drawing.Size(520, 40)

$serverLabel = New-Object System.Windows.Forms.Label
$serverLabel.Text = 'Server address'
$serverLabel.AutoSize = $true
$serverLabel.Location = New-Object System.Drawing.Point(20, 70)

$serverBox = New-Object System.Windows.Forms.TextBox
$serverBox.Location = New-Object System.Drawing.Point(20, 92)
$serverBox.Size = New-Object System.Drawing.Size(510, 24)

$nameLabel = New-Object System.Windows.Forms.Label
$nameLabel.Text = 'Full name'
$nameLabel.AutoSize = $true
$nameLabel.Location = New-Object System.Drawing.Point(20, 128)

$nameBox = New-Object System.Windows.Forms.TextBox
$nameBox.Location = New-Object System.Drawing.Point(20, 150)
$nameBox.Size = New-Object System.Drawing.Size(510, 24)
$nameBox.Text = $env:USERNAME

$userLabel = New-Object System.Windows.Forms.Label
$userLabel.Text = 'Username (email preferred)'
$userLabel.AutoSize = $true
$userLabel.Location = New-Object System.Drawing.Point(20, 186)

$userBox = New-Object System.Windows.Forms.TextBox
$userBox.Location = New-Object System.Drawing.Point(20, 208)
$userBox.Size = New-Object System.Drawing.Size(510, 24)

$passLabel = New-Object System.Windows.Forms.Label
$passLabel.Text = 'Password (at least 6 characters)'
$passLabel.AutoSize = $true
$passLabel.Location = New-Object System.Drawing.Point(20, 244)

$passBox = New-Object System.Windows.Forms.TextBox
$passBox.Location = New-Object System.Drawing.Point(20, 266)
$passBox.Size = New-Object System.Drawing.Size(510, 24)
$passBox.UseSystemPasswordChar = $true

$status = New-Object System.Windows.Forms.Label
$status.Text = 'Example server: https://your-company-site.com'
$status.Location = New-Object System.Drawing.Point(20, 308)
$status.Size = New-Object System.Drawing.Size(510, 56)

$installButton = New-Object System.Windows.Forms.Button
$installButton.Text = 'Create account and Install'
$installButton.Location = New-Object System.Drawing.Point(20, 390)
$installButton.Size = New-Object System.Drawing.Size(220, 36)

$installButton.Add_Click({
    $server = $serverBox.Text.Trim().TrimEnd('/')
    $username = $userBox.Text.Trim()
    $password = $passBox.Text
    $displayName = $nameBox.Text.Trim()

    if ($server -notmatch '^https?://') {
        [System.Windows.Forms.MessageBox]::Show($form, 'Server address must start with http:// or https://', 'Company Laptop Agent')
        return
    }
    if (-not $username -or -not $password) {
        [System.Windows.Forms.MessageBox]::Show($form, 'Enter username and password.', 'Company Laptop Agent')
        return
    }
    if ($password.Length -lt 6) {
        [System.Windows.Forms.MessageBox]::Show($form, 'Password must be at least 6 characters.', 'Company Laptop Agent')
        return
    }

    $installButton.Enabled = $false
    $status.Text = 'Creating your account on the server...'
    $form.Refresh()
    [System.Windows.Forms.Application]::DoEvents()

    try {
        $laptop = Get-LaptopSnapshot
        if ($displayName) {
            $laptop.name = "$displayName Laptop"
        }

        $data = Register-OwnerOnServer -ServerUrl $server -Username $username -Password $password -DisplayName $displayName -Laptop $laptop
        $agent = $data.agent_install

        $status.Text = 'Account ready. Installing the agent on this laptop...'
        $form.Refresh()
        [System.Windows.Forms.Application]::DoEvents()

        $params = @{
            ServerUrl          = $(if ($agent.server_url) { $agent.server_url } else { $server })
            DeviceToken        = [string]$agent.device_token
            DeviceId           = [string]$agent.device_id
            AssetId            = [string]$agent.asset_id
            HeartbeatInterval  = [int]($(if ($agent.heartbeat_interval) { $agent.heartbeat_interval } else { 60 }))
        }
        & $installer @params
        if ($LASTEXITCODE -and $LASTEXITCODE -ne 0) {
            throw "Installer exited with code $LASTEXITCODE"
        }

        $createdText = if ($data.created) { 'Your account was created.' } else { 'Signed in with your existing account.' }
        $status.Text = 'Installed. The agent will start whenever this laptop starts.'
        [System.Windows.Forms.MessageBox]::Show(
            $form,
            "$createdText`r`n`r`nUser: $($data.user.email)`r`nLaptop: $($data.device.asset_id)`r`n`r`nThe agent is running now and will start again at every Windows sign-in.`r`nAdmins can see this user under Employees and the laptop under Devices.",
            'Company Laptop Agent')
        $form.Close()
    } catch {
        $status.Text = $_.Exception.Message
        $installButton.Enabled = $true
        [System.Windows.Forms.MessageBox]::Show($form, $_.Exception.Message, 'Company Laptop Agent')
    }
})

$form.Controls.Add($title)
$form.Controls.Add($serverLabel)
$form.Controls.Add($serverBox)
$form.Controls.Add($nameLabel)
$form.Controls.Add($nameBox)
$form.Controls.Add($userLabel)
$form.Controls.Add($userBox)
$form.Controls.Add($passLabel)
$form.Controls.Add($passBox)
$form.Controls.Add($status)
$form.Controls.Add($installButton)
$form.AcceptButton = $installButton
[void]$form.ShowDialog()
