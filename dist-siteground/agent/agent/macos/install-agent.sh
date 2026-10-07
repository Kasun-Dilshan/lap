#!/bin/bash
# =====================================================================
# Company Laptop Tracking & Management System (CLTMS)
# macOS Agent Installer & Launchd Auto-Start Configuration
# =====================================================================

SERVER_URL=${1:-"http://localhost:5000"}
ENROLLMENT_TOKEN=${2:-""}

echo "======================================================"
echo "   Company Laptop Agent - macOS Installer"
echo "======================================================"

# 1. Locate Node.js
NODE_PATH=$(which node)
if [ -z "$NODE_PATH" ]; then
    echo "Error: Node.js is not found in PATH. Please install Node.js before running."
    exit 1
fi
echo "Found Node.js binary at: $NODE_PATH"

# 2. Setup Agent Directory
INSTALL_DIR="/Library/Application Support/CompanyLaptopAgent"
sudo mkdir -p "$INSTALL_DIR"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

sudo cp "$SCRIPT_DIR/agent.js" "$INSTALL_DIR/agent.js"
sudo chown -R root:wheel "$INSTALL_DIR"
sudo chmod 755 "$INSTALL_DIR/agent.js"
echo "Copied agent to $INSTALL_DIR/agent.js"

# 3. Initial Enrollment
if [ -n "$ENROLLMENT_TOKEN" ]; then
    echo "Registering device with token $ENROLLMENT_TOKEN..."
    cd "$INSTALL_DIR" && "$NODE_PATH" agent.js --server="$SERVER_URL" --token="$ENROLLMENT_TOKEN"
fi

# 4. Setup Launchd LaunchDaemon
PLIST_PATH="/Library/LaunchDaemons/com.company.laptopagent.plist"

cat <<EOF | sudo tee "$PLIST_PATH" > /dev/null
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>Label</key>
    <string>com.company.laptopagent</string>
    <key>ProgramArguments</key>
    <array>
        <string>$NODE_PATH</string>
        <string>$INSTALL_DIR/agent.js</string>
        <string>--server=$SERVER_URL</string>
    </array>
    <key>WorkingDirectory</key>
    <string>$INSTALL_DIR</string>
    <key>RunAtLoad</key>
    <true/>
    <key>KeepAlive</key>
    <true/>
    <key>StandardOutPath</key>
    <string>/var/log/company_laptop_agent.log</string>
    <key>StandardErrorPath</key>
    <string>/var/log/company_laptop_agent_err.log</string>
</dict>
</plist>
EOF

sudo chmod 644 "$PLIST_PATH"
sudo chown root:wheel "$PLIST_PATH"

# Load Daemon
sudo launchctl unload "$PLIST_PATH" 2>/dev/null || true
sudo launchctl load -w "$PLIST_PATH"

echo "LaunchDaemon installed and loaded. Agent is running in background!"
