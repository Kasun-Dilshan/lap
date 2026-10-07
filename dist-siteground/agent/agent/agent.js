/**
 * =====================================================================
 * Company Laptop Tracking & Management System (CLTMS)
 * Cross-Platform Lightweight Laptop Agent (Windows & macOS)
 * =====================================================================
 * 
 * Responsibilities:
 * 1. Automatic OS Hardware & Identity Discovery
 * 2. Device Enrollment with Enrollment Token
 * 3. Secure Persistent Token Storage (agent_config.json)
 * 4. Periodic Lightweight Heartbeat Telemetry (CPU, RAM, Disk, Battery, IP)
 * 5. Installed software inventory and foreground application name
 * 6. Session events: sign-in, lock, and which program is in use
 * 7. Offline Connectivity Detection & Exponential Retry
 *
 * Privacy boundary: application names and durations only.
 * Never collects keystrokes, screenshots, passwords, window titles, or page contents.
 */

const fs = require('fs');
const path = require('path');
const os = require('os');
const { execSync } = require('child_process');

const CONFIG_PATH = path.join(__dirname, 'agent_config.json');

// Default Config
let config = {
  server_url: process.env.SERVER_URL || 'http://localhost:5000',
  device_token: process.env.DEVICE_TOKEN || null,
  device_id: null,
  asset_id: null,
  heartbeat_interval: parseInt(process.env.HEARTBEAT_INTERVAL || '60', 10)
};

// Load existing config if available
if (fs.existsSync(CONFIG_PATH)) {
  try {
    const saved = JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf8'));
    config = { ...config, ...saved };
  } catch (e) {
    console.warn('[Agent] Could not read config file, using defaults.');
  }
}

function saveConfig() {
  fs.writeFileSync(CONFIG_PATH, JSON.stringify(config, null, 2), 'utf8');
}

// ---------------------------------------------------------------------
// 1. Hardware & System Identity Gathering (Cross-Platform)
// ---------------------------------------------------------------------

function getMachineUuid() {
  try {
    if (os.platform() === 'win32') {
      const output = execSync('wmic csproduct get uuid', { stdio: ['ignore', 'pipe', 'ignore'], timeout: 3000 }).toString();
      const lines = output.trim().split('\n');
      if (lines.length > 1 && lines[1].trim()) return lines[1].trim();
    } else if (os.platform() === 'darwin') {
      const output = execSync('ioreg -d2 -c IOPlatformExpertDevice | grep IOPlatformUUID', { stdio: ['ignore', 'pipe', 'ignore'], timeout: 3000 }).toString();
      const match = output.match(/"IOPlatformUUID"\s*=\s*"([^"]+)"/);
      if (match && match[1]) return match[1];
    }
  } catch (e) {
    // Fallback
  }
  // Fallback to stable hash of hostname + mac
  const mac = getMacAddress();
  return `HW-${os.hostname().toUpperCase()}-${(mac || 'GEN').replace(/[^a-zA-Z0-9]/g, '').slice(-8)}`;
}

function getSerialNumber() {
  try {
    if (os.platform() === 'win32') {
      const output = execSync('wmic bios get serialnumber', { stdio: ['ignore', 'pipe', 'ignore'], timeout: 3000 }).toString();
      const lines = output.trim().split('\n');
      if (lines.length > 1 && lines[1].trim()) return lines[1].trim();
    } else if (os.platform() === 'darwin') {
      const output = execSync('system_profiler SPHardwareDataType | grep "Serial Number"', { stdio: ['ignore', 'pipe', 'ignore'], timeout: 3000 }).toString();
      const match = output.match(/Serial Number[^:]*:\s*(\S+)/);
      if (match && match[1]) return match[1];
    }
  } catch (e) {
    // Fallback
  }
  return `SN-${os.hostname().toUpperCase()}-CORP`;
}

function getManufacturerAndModel() {
  let manufacturer = 'Generic OEM';
  let model = 'Standard Workstation';

  try {
    if (os.platform() === 'win32') {
      const mfg = execSync('wmic computersystem get manufacturer', { stdio: ['ignore', 'pipe', 'ignore'], timeout: 3000 }).toString().split('\n')[1];
      const mdl = execSync('wmic computersystem get model', { stdio: ['ignore', 'pipe', 'ignore'], timeout: 3000 }).toString().split('\n')[1];
      if (mfg && mfg.trim()) manufacturer = mfg.trim();
      if (mdl && mdl.trim()) model = mdl.trim();
    } else if (os.platform() === 'darwin') {
      manufacturer = 'Apple';
      const mdl = execSync('sysctl -n hw.model', { stdio: ['ignore', 'pipe', 'ignore'], timeout: 3000 }).toString().trim();
      if (mdl) model = mdl;
    }
  } catch (e) {
    if (os.platform() === 'darwin') manufacturer = 'Apple';
  }

  return { manufacturer, model };
}

function getMacAddress() {
  const interfaces = os.networkInterfaces();
  for (const name of Object.keys(interfaces)) {
    for (const net of interfaces[name]) {
      if (!net.internal && net.mac && net.mac !== '00:00:00:00:00:00') {
        return net.mac;
      }
    }
  }
  return '00:11:22:33:44:55';
}

function getLocalIp() {
  const interfaces = os.networkInterfaces();
  for (const name of Object.keys(interfaces)) {
    for (const net of interfaces[name]) {
      if (!net.internal && net.family === 'IPv4') {
        return net.address;
      }
    }
  }
  return '127.0.0.1';
}

function getBatteryInfo() {
  let percent = 100;
  let status = 'Plugged In';

  try {
    if (os.platform() === 'win32') {
      const out = execSync('powershell -Command "Get-CimInstance Win32_Battery | Select-Object -Property EstimatedChargeRemaining, BatteryStatus | ConvertTo-Json"', {
        stdio: ['ignore', 'pipe', 'ignore'],
        timeout: 4000
      }).toString();
      if (out && out.trim()) {
        const parsed = JSON.parse(out);
        if (parsed.EstimatedChargeRemaining !== undefined) {
          percent = Number(parsed.EstimatedChargeRemaining);
          // BatteryStatus 1: Discharging, 2: AC Connected, 3: Fully Charged, etc.
          status = parsed.BatteryStatus === 1 ? 'Discharging' : (parsed.BatteryStatus === 2 ? 'Charging' : 'Plugged In');
        }
      }
    } else if (os.platform() === 'darwin') {
      const out = execSync('pmset -g batt', { stdio: ['ignore', 'pipe', 'ignore'], timeout: 3000 }).toString();
      const match = out.match(/(\d+)%/);
      if (match) percent = parseInt(match[1], 10);
      if (out.includes('discharging')) status = 'Discharging';
      else if (out.includes('charging')) status = 'Charging';
      else status = 'Plugged In';
    }
  } catch (e) {
    // If desktop or battery not detected, assume AC power
    percent = 100;
    status = 'Plugged In';
  }

  return { percent, status };
}

function getDiskUsage() {
  try {
    if (os.platform() === 'win32') {
      const out = execSync('powershell -Command "Get-PSDrive -PSProvider FileSystem | Where-Object {$_.Used -gt 0} | Select-Object -First 1 -Property Free, Used | ConvertTo-Json"', {
        stdio: ['ignore', 'pipe', 'ignore'],
        timeout: 4000
      }).toString();
      if (out && out.trim()) {
        const data = JSON.parse(out);
        const total = (data.Used || 0) + (data.Free || 0);
        if (total > 0) {
          const usedPct = ((data.Used / total) * 100).toFixed(1);
          return {
            usage_percent: parseFloat(usedPct),
            total_gb: Math.round(total / (1024 * 1024 * 1024))
          };
        }
      }
    } else {
      const out = execSync("df -k / | tail -1 | awk '{print $5, $2}'", { stdio: ['ignore', 'pipe', 'ignore'], timeout: 3000 }).toString().trim();
      const parts = out.split(/\s+/);
      if (parts.length >= 2) {
        return {
          usage_percent: parseFloat(parts[0].replace('%', '')),
          total_gb: Math.round(parseInt(parts[1], 10) / (1024 * 1024))
        };
      }
    }
  } catch (e) {}

  return { usage_percent: 45.0, total_gb: 512 };
}

function getCpuUsage(callback) {
  const cpus1 = os.cpus();
  setTimeout(() => {
    const cpus2 = os.cpus();
    let idleDiff = 0;
    let totalDiff = 0;

    for (let i = 0; i < cpus1.length; i++) {
      const c1 = cpus1[i].times;
      const c2 = cpus2[i].times;

      const idle = c2.idle - c1.idle;
      const total = (c2.user - c1.user) + (c2.nice - c1.nice) + (c2.sys - c1.sys) + (c2.irq - c1.irq) + idle;

      idleDiff += idle;
      totalDiff += total;
    }

    const usage = totalDiff > 0 ? ((1 - idleDiff / totalDiff) * 100).toFixed(1) : 0;
    callback(parseFloat(usage));
  }, 1000);
}

// ---------------------------------------------------------------------
// 2. HTTP Request Helper
// ---------------------------------------------------------------------

function apiRequest(endpoint, method, payload, token) {
  return new Promise((resolve, reject) => {
    const url = new URL(`${config.server_url}${endpoint}`);
    const isHttps = url.protocol === 'https:';
    const httpModule = isHttps ? require('https') : require('http');

    const bodyData = payload ? JSON.stringify(payload) : null;
    const headers = {
      'Content-Type': 'application/json',
      'User-Agent': 'CLTMS-Agent/1.0'
    };

    if (bodyData) {
      headers['Content-Length'] = Buffer.byteLength(bodyData);
    }
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const req = httpModule.request({
      hostname: url.hostname,
      port: url.port || (isHttps ? 443 : 80),
      path: url.pathname + url.search,
      method: method,
      headers: headers,
      timeout: 10000
    }, (res) => {
      let rawData = '';
      res.on('data', chunk => rawData += chunk);
      res.on('end', () => {
        try {
          const parsed = JSON.parse(rawData);
          if (res.statusCode >= 200 && res.statusCode < 300) {
            resolve(parsed);
          } else {
            reject(new Error(parsed.message || `HTTP ${res.statusCode}`));
          }
        } catch (e) {
          reject(new Error(`Failed to parse response: ${rawData.slice(0, 100)}`));
        }
      });
    });

    req.on('error', err => reject(err));
    req.on('timeout', () => {
      req.destroy();
      reject(new Error('Connection timed out.'));
    });

    if (bodyData) req.write(bodyData);
    req.end();
  });
}

// ---------------------------------------------------------------------
// 3. Device Registration / Enrollment
// ---------------------------------------------------------------------

async function registerDevice(enrollmentToken) {
  console.log(`[Agent] Registering device with token: ${enrollmentToken}...`);

  const { manufacturer, model } = getManufacturerAndModel();
  const disk = getDiskUsage();
  const cpus = os.cpus();
  const cpuModel = cpus.length > 0 ? cpus[0].model : 'Standard Multi-Core CPU';

  const registrationPayload = {
    enrollment_token: enrollmentToken,
    device_id: config.device_id || getMachineUuid(),
    hostname: os.hostname(),
    manufacturer,
    model,
    serial_number: getSerialNumber(),
    os: os.platform() === 'win32' ? 'Windows' : (os.platform() === 'darwin' ? 'macOS' : 'Linux'),
    os_version: `${os.type()} ${os.release()}`,
    architecture: os.arch(),
    cpu_model: cpuModel,
    ram_total_gb: Math.round(os.totalmem() / (1024 * 1024 * 1024)),
    storage_total_gb: disk.total_gb,
    mac_address: getMacAddress(),
    local_ip: getLocalIp()
  };

  const response = await apiRequest('/api/devices/register', 'POST', registrationPayload);

  if (response.success && response.data) {
    config.device_token = response.data.device_token;
    config.device_id = response.data.device_id;
    config.asset_id = response.data.asset_id;
    config.heartbeat_interval = response.data.heartbeat_interval || 60;
    saveConfig();
    console.log(`[Agent] Registration Successful!`);
    console.log(`[Agent] Asset ID: ${config.asset_id}`);
    console.log(`[Agent] Device ID: ${config.device_id}`);
    console.log(`[Agent] Device Token Saved.`);
    return true;
  } else {
    throw new Error(response.message || 'Registration rejected by server.');
  }
}

// ---------------------------------------------------------------------
// 4. Work activity: installed software + foreground application name
// ---------------------------------------------------------------------

const FRIENDLY_APPS = {
  chrome: 'Google Chrome',
  msedge: 'Microsoft Edge',
  firefox: 'Mozilla Firefox',
  excel: 'Microsoft Excel',
  winword: 'Microsoft Word',
  outlook: 'Microsoft Outlook',
  powerpnt: 'Microsoft PowerPoint',
  onenote: 'Microsoft OneNote',
  teams: 'Microsoft Teams',
  code: 'Visual Studio Code',
  slack: 'Slack',
  explorer: 'File Explorer',
  notion: 'Notion',
  spotify: 'Spotify',
  zoom: 'Zoom',
  acrobat: 'Adobe Acrobat',
  windowsterminal: 'Windows Terminal',
  finder: 'Finder',
  figma: 'Figma'
};

function friendlyAppName(raw) {
  const name = String(raw || '').replace(/[\u0000-\u001F]/g, '').trim();
  if (!name) return '';
  const mapped = FRIENDLY_APPS[name.toLowerCase()];
  return (mapped || name).slice(0, 180);
}

function runPowerShell(script, timeout = 8000) {
  const encoded = Buffer.from(script, 'utf16le').toString('base64');
  return execSync(`powershell -NoProfile -NonInteractive -EncodedCommand ${encoded}`, {
    stdio: ['ignore', 'pipe', 'ignore'],
    timeout,
    windowsHide: true
  }).toString();
}

function getConsoleSession() {
  if (os.platform() === 'win32') {
    try {
      const out = execSync('quser', { stdio: ['ignore', 'pipe', 'ignore'], timeout: 4000, windowsHide: true }).toString();
      const lines = out.split(/\r?\n/).slice(1).filter(Boolean);
      for (const line of lines) {
        const match = line.trim().replace(/^>/, '').match(/^(\S+)\s+(?:(\S+)\s+)?(\d+)\s+(Active|Disc)\b/i);
        if (match) {
          return {
            user: match[1],
            state: /disc/i.test(match[4]) ? 'locked' : 'active'
          };
        }
      }
    } catch (e) {
      // quser is unavailable when no interactive session exists
    }
    return { user: process.env.USERNAME || 'unknown', state: 'active' };
  }

  try {
    return { user: os.userInfo().username, state: 'active' };
  } catch (e) {
    return { user: 'unknown', state: 'active' };
  }
}

function getForegroundApp() {
  try {
    if (os.platform() === 'win32') {
      const script = `
$ErrorActionPreference = 'Stop'
Add-Type -TypeDefinition @"
using System;
using System.Runtime.InteropServices;
public class FgWin {
  [DllImport("user32.dll")] public static extern IntPtr GetForegroundWindow();
  [DllImport("user32.dll")] public static extern uint GetWindowThreadProcessId(IntPtr hWnd, out uint processId);
}
"@
$hwnd = [FgWin]::GetForegroundWindow()
$procId = [uint32]0
[void][FgWin]::GetWindowThreadProcessId($hwnd, [ref]$procId)
if ($procId -gt 0) { (Get-Process -Id $procId -ErrorAction SilentlyContinue).ProcessName }
`;
      return friendlyAppName(runPowerShell(script, 6000).trim());
    }

    if (os.platform() === 'darwin') {
      const out = execSync(
        'osascript -e \'tell application "System Events" to get name of first application process whose frontmost is true\'',
        { stdio: ['ignore', 'pipe', 'ignore'], timeout: 4000 }
      ).toString();
      return friendlyAppName(out.trim());
    }
  } catch (e) {}
  return '';
}

function getRunningApps() {
  try {
    if (os.platform() === 'win32') {
      const script = `Get-Process | Where-Object { $_.MainWindowHandle -ne 0 } | Select-Object -ExpandProperty ProcessName -Unique`;
      return runPowerShell(script, 6000)
        .split(/\r?\n/)
        .map(friendlyAppName)
        .filter(Boolean)
        .slice(0, 40);
    }

    if (os.platform() === 'darwin') {
      const out = execSync(
        'osascript -e \'tell application "System Events" to get name of every application process whose background only is false\'',
        { stdio: ['ignore', 'pipe', 'ignore'], timeout: 5000 }
      ).toString();
      return out.split(',').map(part => friendlyAppName(part.trim())).filter(Boolean).slice(0, 40);
    }
  } catch (e) {}
  return [];
}

function getInstalledSoftware() {
  try {
    if (os.platform() === 'win32') {
      const script = `
$paths = @(
  'HKLM:\\Software\\Microsoft\\Windows\\CurrentVersion\\Uninstall\\*',
  'HKLM:\\Software\\Wow6432Node\\Microsoft\\Windows\\CurrentVersion\\Uninstall\\*',
  'HKCU:\\Software\\Microsoft\\Windows\\CurrentVersion\\Uninstall\\*'
)
Get-ItemProperty $paths -ErrorAction SilentlyContinue |
  Where-Object {
    $_.DisplayName -and $_.DisplayName -notmatch 'Update for|Hotfix|Security Update|Definition Update|KB[0-9]{5,}'
  } |
  Sort-Object DisplayName -Unique |
  Select-Object -First 200 DisplayName, DisplayVersion, Publisher |
  ConvertTo-Json -Compress
`;
      const raw = runPowerShell(script, 20000).trim();
      if (!raw) return [];
      const parsed = JSON.parse(raw);
      const rows = Array.isArray(parsed) ? parsed : [parsed];
      return rows.map(row => ({
        name: friendlyAppName(row.DisplayName),
        version: String(row.DisplayVersion || '').slice(0, 80),
        publisher: String(row.Publisher || '').slice(0, 150)
      })).filter(row => row.name);
    }

    if (os.platform() === 'darwin') {
      const out = execSync('ls -1 /Applications', { stdio: ['ignore', 'pipe', 'ignore'], timeout: 5000 }).toString();
      return out.split('\n')
        .filter(name => name.endsWith('.app'))
        .slice(0, 200)
        .map(name => ({ name: name.replace(/\.app$/, ''), version: '', publisher: 'macOS Application' }));
    }
  } catch (e) {
    console.warn('[Agent] Software inventory skipped:', e.message);
  }
  return [];
}

let lastInventoryAt = Number(config.last_inventory_at || 0);

async function reportWorkActivity() {
  const session = getConsoleSession();
  const payload = {
    windows_user: session.user,
    session_state: session.state,
    foreground_app: getForegroundApp(),
    running_apps: getRunningApps()
  };

  if (payload.foreground_app && /^(LockApp|LogonUI)$/i.test(payload.foreground_app)) {
    payload.session_state = 'locked';
    payload.foreground_app = '';
  }

  const now = Date.now();
  if (now - lastInventoryAt > 15 * 60 * 1000) {
    const software = getInstalledSoftware();
    if (software.length > 0) {
      payload.software = software;
      payload.full_inventory = true;
      lastInventoryAt = now;
      config.last_inventory_at = now;
      saveConfig();
    }
  }

  await apiRequest('/api/devices/activity', 'POST', payload, config.device_token);
  const appLabel = payload.foreground_app || payload.session_state;
  console.log(`[Agent Work] ${session.user} | ${appLabel}`);
}

// ---------------------------------------------------------------------
// 5. Heartbeat Loop
// ---------------------------------------------------------------------

let consecutiveFailures = 0;
let heartbeatTimer = null;

function sendHeartbeat() {
  getCpuUsage(async (cpuUsage) => {
    try {
      const disk = getDiskUsage();
      const battery = getBatteryInfo();
      const totalMem = os.totalmem();
      const freeMem = os.freemem();
      const ramUsage = (((totalMem - freeMem) / totalMem) * 100).toFixed(1);

      const heartbeatData = {
        cpu_usage: cpuUsage,
        ram_usage: parseFloat(ramUsage),
        disk_usage: disk.usage_percent,
        battery_percent: battery.percent,
        battery_status: battery.status,
        local_ip: getLocalIp()
      };

      const res = await apiRequest('/api/devices/heartbeat', 'POST', heartbeatData, config.device_token);
      consecutiveFailures = 0;
      console.log(`[Agent Telemetry] Heartbeat ACK at ${new Date().toLocaleTimeString()} | CPU: ${cpuUsage}% | RAM: ${ramUsage}% | Disk: ${disk.usage_percent}% | Bat: ${battery.percent}% (${battery.status})`);
      try {
        await reportWorkActivity();
      } catch (activityErr) {
        console.warn(`[Agent Work] Activity report failed (${activityErr.message}).`);
      }
    } catch (err) {
      if (/removed by IT|no longer enrolled/i.test(err.message || '')) {
        console.error('[Agent] Tracking revoked by administrator. Stopping agent.');
        config.device_token = null;
        saveConfig();
        if (heartbeatTimer) clearInterval(heartbeatTimer);
        process.exit(0);
      }
      consecutiveFailures++;
      const backoffSec = Math.min(300, Math.pow(2, Math.min(consecutiveFailures, 6)) * 5);
      console.warn(`[Agent Warning] Heartbeat failed (${err.message}). Retrying in ${backoffSec}s (Failures: ${consecutiveFailures})`);
    }
  });
}

function startHeartbeatLoop() {
  if (heartbeatTimer) return;
  sendHeartbeat();
  const intervalMs = (config.heartbeat_interval || 60) * 1000;
  heartbeatTimer = setInterval(sendHeartbeat, intervalMs);
  console.log(`[Agent] Heartbeat schedule running every ${config.heartbeat_interval}s.\n`);
}

function installDirPath() {
  if (os.platform() === 'win32') {
    return 'C:\\ProgramData\\CompanyLaptopAgent';
  }
  if (os.platform() === 'darwin') {
    return '/Library/Application Support/CompanyLaptopAgent';
  }
  return path.join(os.homedir(), '.company-laptop-agent');
}

function ensureInstalledCopy() {
  const installDir = installDirPath();
  if (!fs.existsSync(installDir)) {
    fs.mkdirSync(installDir, { recursive: true });
  }
  const targetScript = path.join(installDir, 'agent.js');
  try {
    fs.copyFileSync(__filename, targetScript);
    config.installed_path = targetScript;
    saveConfig();
    console.log(`[Agent] Installed to ${targetScript}`);
  } catch (e) {
    console.warn('[Agent] Could not copy to ProgramData:', e.message);
  }
  return installDir;
}

function ensureAutoStart(serverUrl) {
  const installDir = config.installed_path ? path.dirname(config.installed_path) : installDirPath();
  const scriptPath = config.installed_path || path.join(installDir, 'agent.js');
  const nodePath = process.execPath;

  if (os.platform() === 'win32') {
    const taskName = 'CompanyLaptopMonitoringAgent';
    const ps = `
$taskName = '${taskName}'
$node = '${nodePath.replace(/'/g, "''")}'
$script = '${scriptPath.replace(/'/g, "''")}'
$server = '${String(serverUrl).replace(/'/g, "''")}'
Unregister-ScheduledTask -TaskName $taskName -Confirm:$false -ErrorAction SilentlyContinue
$action = New-ScheduledTaskAction -Execute $node -Argument ('"' + $script + '" --server="' + $server + '"') -WorkingDirectory '${installDir.replace(/'/g, "''")}'
$trigger = New-ScheduledTaskTrigger -AtLogOn -User $env:USERNAME
$principal = New-ScheduledTaskPrincipal -UserId $env:USERNAME -LogonType Interactive -RunLevel Limited
$settings = New-ScheduledTaskSettingsSet -AllowStartIfOnBatteries -DontStopIfGoingOnBatteries -RestartCount 3 -RestartInterval (New-TimeSpan -Minutes 1)
Register-ScheduledTask -TaskName $taskName -Action $action -Trigger $trigger -Principal $principal -Settings $settings -Description 'Company Laptop IT Asset Tracking Agent' | Out-Null
`;
    try {
      runPowerShell(ps, 15000);
      console.log('[Agent] Registered Windows logon scheduled task.');
    } catch (e) {
      console.warn('[Agent] Scheduled task registration failed:', e.message);
    }
    return;
  }

  if (os.platform() === 'darwin') {
    console.warn('[Agent] macOS auto-start: run agent/macos/install-agent.sh once with administrator rights.');
  }
}

async function enrollFromOwnerPortal(payload) {
  const serverUrl = (payload.server_url || config.server_url || '').replace(/\/$/, '');
  const userToken = payload.user_token;
  const body = payload.laptop && typeof payload.laptop === 'object' ? payload.laptop : buildSystemSnapshot(false);

  if (!serverUrl || !userToken) {
    throw new Error('server_url and user_token are required.');
  }

  config.server_url = serverUrl;
  const response = await apiRequest('/api/owner/agent-install', 'POST', {
    device_id: body.device_id || config.device_id,
    ...body
  }, userToken);

  if (!response.success || !response.data) {
    throw new Error(response.message || 'Owner agent install rejected.');
  }

  const data = response.data;
  config.device_token = data.device_token;
  config.device_id = data.device_id;
  config.asset_id = data.asset_id;
  config.heartbeat_interval = data.heartbeat_interval || config.heartbeat_interval || 60;
  config.server_url = data.server_url || serverUrl;
  saveConfig();

  ensureInstalledCopy();
  ensureAutoStart(config.server_url);
  startHeartbeatLoop();
  return data;
}

function buildSystemSnapshot(includeInventory = false) {
  const { manufacturer, model } = getManufacturerAndModel();
  const disk = getDiskUsage();
  const battery = getBatteryInfo();
  const cpus = os.cpus();
  const totalMem = os.totalmem();
  const ramUsage = totalMem > 0 ? Number((((totalMem - os.freemem()) / totalMem) * 100).toFixed(1)) : 0;
  const session = getConsoleSession();
  const foreground = getForegroundApp();
  const running = getRunningApps();
  if (foreground && !running.includes(foreground)) {
    running.unshift(foreground);
  }

  const snapshot = {
    device_id: getMachineUuid(),
    hostname: os.hostname(),
    manufacturer,
    model,
    serial_number: getSerialNumber(),
    os: os.platform() === 'win32' ? 'Windows' : (os.platform() === 'darwin' ? 'macOS' : 'Linux'),
    os_version: `${os.type()} ${os.release()}`.slice(0, 100),
    architecture: os.arch(),
    cpu_model: cpus.length > 0 ? String(cpus[0].model || '').slice(0, 150) : '',
    ram_total_gb: Math.round(totalMem / (1024 * 1024 * 1024)),
    storage_total_gb: disk.total_gb,
    mac_address: getMacAddress(),
    local_ip: getLocalIp(),
    battery_percent: battery.percent,
    battery_status: battery.status,
    ram_usage: ramUsage,
    disk_usage: disk.usage_percent,
    windows_user: session.user,
    session_state: session.state,
    foreground_app: foreground,
    running_apps: running
  };

  if (includeInventory) {
    const software = getInstalledSoftware();
    if (software.length > 0) {
      snapshot.software = software;
      snapshot.full_inventory = true;
    }
  }

  return snapshot;
}

function buildTelemetry(includeInventory = false) {
  return new Promise((resolve) => {
    getCpuUsage((cpuUsage) => {
      const snap = buildSystemSnapshot(includeInventory);
      snap.cpu_usage = cpuUsage;
      resolve(snap);
    });
  });
}

function startLocalSnapshotServer() {
  const http = require('http');
  const server = http.createServer((req, res) => {
    const headers = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization'
    };
    if (req.method === 'OPTIONS') {
      res.writeHead(204, headers);
      res.end();
      return;
    }

    const parsed = new URL(req.url || '/', 'http://127.0.0.1');
    const urlPath = parsed.pathname;
    const wantInventory = parsed.searchParams.get('inventory') === '1';
    const finish = (payload) => {
      res.writeHead(200, { ...headers, 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ success: true, data: payload }));
    };

    if (urlPath === '/snapshot') {
      try {
        finish(buildSystemSnapshot(wantInventory || true));
      } catch (err) {
        res.writeHead(500, headers);
        res.end(JSON.stringify({ success: false, message: err.message }));
      }
      return;
    }

    if (urlPath === '/telemetry') {
      buildTelemetry(wantInventory).then(finish).catch((err) => {
        res.writeHead(500, headers);
        res.end(JSON.stringify({ success: false, message: err.message }));
      });
      return;
    }

    if (urlPath === '/install' && req.method === 'POST') {
      let raw = '';
      req.on('data', chunk => { raw += chunk; });
      req.on('end', () => {
        (async () => {
          try {
            const payload = raw ? JSON.parse(raw) : {};
            const data = await enrollFromOwnerPortal(payload);
            res.writeHead(200, { ...headers, 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ success: true, data }));
          } catch (err) {
            res.writeHead(500, headers);
            res.end(JSON.stringify({ success: false, message: err.message }));
          }
        })();
      });
      return;
    }

    res.writeHead(404, headers);
    res.end();
  });

  server.on('error', (err) => {
    console.warn(`[Agent] Local laptop reader unavailable: ${err.message}`);
  });
  server.listen(47321, '127.0.0.1', () => {
    console.log('[Agent] Local laptop reader on http://127.0.0.1:47321');
  });
}

// ---------------------------------------------------------------------
// 5. Agent Main Entry Point
// ---------------------------------------------------------------------

async function main() {
  console.log(`\n======================================================`);
  console.log(`🖥️  Company Laptop Monitoring Agent v1.0.0`);
  console.log(`💻  Host: ${os.hostname()} (${os.platform()} ${os.arch()})`);
  console.log(`🌐  Server URL: ${config.server_url}`);
  console.log(`======================================================\n`);

  startLocalSnapshotServer();

  // Parse command line arguments
  const args = process.argv.slice(2);
  let enrollmentTokenArg = null;
  args.forEach(arg => {
    if (arg.startsWith('--token=')) enrollmentTokenArg = arg.split('=')[1];
    if (arg.startsWith('--server=')) config.server_url = arg.split('=')[1];
  });

  // Check if registered
  if (!config.device_token) {
    const token = enrollmentTokenArg || process.env.ENROLLMENT_TOKEN;
    if (!token) {
      console.warn('[Agent] Not enrolled yet. Local laptop reader stays available for Laptop Owner sign-in.');
      console.warn('To enroll for background tracking: node agent.js --token=ENROLL-XXXX-XXXX-XXXX');
      return;
    }

    try {
      await registerDevice(token);
    } catch (e) {
      console.error('[Agent Fatal] Failed to enroll device:', e.message);
      process.exit(1);
    }
  } else {
    console.log(`[Agent] Active Device Token found for Asset: ${config.asset_id || config.device_id}`);
  }

  startHeartbeatLoop();
}

if (require.main === module) {
  main().catch(err => {
    console.error('Agent runtime crash:', err);
  });
}

module.exports = {
  getMachineUuid,
  getBatteryInfo,
  getDiskUsage,
  getManufacturerAndModel
};
