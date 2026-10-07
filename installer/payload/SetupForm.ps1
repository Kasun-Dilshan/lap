# Setup window for the company laptop agent.
# Collects the server address, then runs the existing Windows installer.
$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.Windows.Forms
Add-Type -AssemblyName System.Drawing

$installer = Join-Path $PSScriptRoot 'install-agent.ps1'
if (-not (Test-Path $installer)) {
    [System.Windows.Forms.MessageBox]::Show("Could not find install-agent.ps1 next to this setup program.", "Company Laptop Agent")
    exit 1
}

$form = New-Object System.Windows.Forms.Form
$form.Text = 'Company Laptop Agent Setup'
$form.FormBorderStyle = 'FixedDialog'
$form.MaximizeBox = $false
$form.MinimizeBox = $false
$form.StartPosition = 'CenterScreen'
$form.ClientSize = New-Object System.Drawing.Size(540, 340)
$form.Font = New-Object System.Drawing.Font('Segoe UI', 9)

$title = New-Object System.Windows.Forms.Label
$title.Text = "Install the laptop agent on this PC.`r`nIt will start automatically each time you sign in to Windows."
$title.Location = New-Object System.Drawing.Point(20, 16)
$title.Size = New-Object System.Drawing.Size(500, 48)

$serverLabel = New-Object System.Windows.Forms.Label
$serverLabel.Text = 'Server address (your company laptop website)'
$serverLabel.AutoSize = $true
$serverLabel.Location = New-Object System.Drawing.Point(20, 78)

$serverBox = New-Object System.Windows.Forms.TextBox
$serverBox.Location = New-Object System.Drawing.Point(20, 102)
$serverBox.Size = New-Object System.Drawing.Size(490, 24)
$serverBox.Text = 'http://localhost:5000'

$tokenLabel = New-Object System.Windows.Forms.Label
$tokenLabel.Text = 'Enrollment token (optional, from the dashboard)'
$tokenLabel.AutoSize = $true
$tokenLabel.Location = New-Object System.Drawing.Point(20, 142)

$tokenBox = New-Object System.Windows.Forms.TextBox
$tokenBox.Location = New-Object System.Drawing.Point(20, 166)
$tokenBox.Size = New-Object System.Drawing.Size(490, 24)

$status = New-Object System.Windows.Forms.Label
$status.Text = 'Click Install. You do not need to restart the laptop afterwards.'
$status.Location = New-Object System.Drawing.Point(20, 206)
$status.Size = New-Object System.Drawing.Size(490, 40)

$installButton = New-Object System.Windows.Forms.Button
$installButton.Text = 'Install'
$installButton.Location = New-Object System.Drawing.Point(20, 270)
$installButton.Size = New-Object System.Drawing.Size(140, 36)

$installButton.Add_Click({
    $server = $serverBox.Text.Trim().TrimEnd('/')
    if ($server -notmatch '^https?://') {
        [System.Windows.Forms.MessageBox]::Show($form, 'Server address must start with http:// or https://', 'Company Laptop Agent')
        return
    }
    $installButton.Enabled = $false
    $status.Text = 'Installing. Please wait...'
    $form.Refresh()
    [System.Windows.Forms.Application]::DoEvents()
    try {
        $params = @{
            ServerUrl = $server
            EnrollmentToken = $tokenBox.Text.Trim()
        }
        & $installer @params
        if ($LASTEXITCODE -and $LASTEXITCODE -ne 0) {
            throw "Installer exited with code $LASTEXITCODE"
        }
        $status.Text = 'Installed. The agent is running and will start at the next sign-in.'
        [System.Windows.Forms.MessageBox]::Show(
            $form,
            "Company Laptop Agent is installed.`r`n`r`nIt is running now. It will also start automatically every time this Windows user signs in after the laptop starts.`r`n`r`nServer: $server",
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
$form.Controls.Add($tokenLabel)
$form.Controls.Add($tokenBox)
$form.Controls.Add($status)
$form.Controls.Add($installButton)
$form.AcceptButton = $installButton
[void]$form.ShowDialog()
