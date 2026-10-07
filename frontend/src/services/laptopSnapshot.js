const DEVICE_KEY = 'cltms_laptop_id';
const AGENT_ORIGIN = 'http://127.0.0.1:47321';
const INVENTORY_KEY = 'cltms_last_inventory_at';

function stableDeviceId() {
  const saved = localStorage.getItem(DEVICE_KEY);
  if (saved) return saved;
  const id = `WEB-${crypto.randomUUID()}`;
  localStorage.setItem(DEVICE_KEY, id);
  return id;
}

function browserName() {
  const ua = navigator.userAgent || '';
  if (ua.includes('Edg/')) return 'Microsoft Edge';
  if (ua.includes('Chrome/')) return 'Google Chrome';
  if (ua.includes('Firefox/')) return 'Mozilla Firefox';
  if (ua.includes('Safari/')) return 'Safari';
  return 'Company Portal';
}

function detectOs(ua, platform) {
  const text = `${ua} ${platform}`;
  if (/Windows/i.test(text)) return 'Windows';
  if (/Mac OS|Macintosh/i.test(text)) return 'macOS';
  if (/Linux/i.test(text)) return 'Linux';
  return 'Unknown';
}

async function readBattery() {
  try {
    if (!navigator.getBattery) return { percent: null, status: null };
    const battery = await navigator.getBattery();
    let status = 'Unknown';
    if (battery.charging && battery.level >= 0.99) status = 'Plugged In';
    else if (battery.charging) status = 'Charging';
    else status = 'Discharging';
    return {
      percent: Math.round(battery.level * 100),
      status
    };
  } catch {
    return { percent: null, status: null };
  }
}

async function fetchAgent(path, timeoutMs) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(`${AGENT_ORIGIN}${path}`, { signal: controller.signal });
    if (!res.ok) return null;
    const data = await res.json();
    return data?.data || data || null;
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

function shouldCollectInventory() {
  const last = Number(localStorage.getItem(INVENTORY_KEY) || 0);
  return Date.now() - last > 10 * 60 * 1000;
}

function markInventoryCollected() {
  localStorage.setItem(INVENTORY_KEY, String(Date.now()));
}

export async function collectLaptopSnapshot() {
  const battery = await readBattery();
  const ua = navigator.userAgent || '';
  const platform = navigator.platform || '';
  const os = detectOs(ua, platform);
  const cores = navigator.hardwareConcurrency || null;
  const memory = navigator.deviceMemory || null;
  const gpu = readGpu();
  const id = stableDeviceId();
  const app = browserName();

  const browser = {
    device_id: id,
    serial_number: id,
    hostname: platform ? `LAPTOP-${platform.replace(/\s+/g, '-').slice(0, 40)}` : 'LAPTOP',
    manufacturer: os === 'macOS' ? 'Apple' : 'PC',
    model: gpu || `${os} Laptop`,
    os,
    os_version: ua.slice(0, 100),
    architecture: /arm|aarch64/i.test(ua) ? 'arm64' : 'x64',
    cpu_model: [cores ? `${cores} cores` : null, gpu].filter(Boolean).join(' · ').slice(0, 150) || null,
    ram_total_gb: memory,
    storage_total_gb: null,
    mac_address: null,
    local_ip: null,
    battery_percent: battery.percent,
    battery_status: battery.status,
    cpu_usage: null,
    ram_usage: null,
    disk_usage: null,
    windows_user: null,
    foreground_app: app,
    running_apps: [app, 'Company Portal'].filter(Boolean),
    session_state: 'active',
    source: 'browser'
  };

  const agent = await fetchAgent(shouldCollectInventory() ? '/snapshot?inventory=1' : '/snapshot', 12000);
  if (!agent || typeof agent !== 'object') {
    return browser;
  }

  if (agent.device_id) {
    localStorage.setItem(DEVICE_KEY, String(agent.device_id));
  }
  if (Array.isArray(agent.software) && agent.software.length > 0) {
    markInventoryCollected();
  }

  const foreground = agent.foreground_app || browser.foreground_app;
  const running = Array.isArray(agent.running_apps) && agent.running_apps.length > 0
    ? agent.running_apps
    : [foreground].filter(Boolean);

  return {
    ...browser,
    ...agent,
    device_id: agent.device_id || browser.device_id,
    serial_number: agent.serial_number || agent.device_id || browser.serial_number,
    battery_percent: agent.battery_percent ?? browser.battery_percent,
    battery_status: agent.battery_status || browser.battery_status,
    foreground_app: foreground,
    running_apps: running,
    software: agent.software || undefined,
    full_inventory: Array.isArray(agent.software) && agent.software.length > 0,
    source: 'system_agent'
  };
}

export async function collectTrackingSample(deviceId) {
  const battery = await readBattery();
  const wantInventory = shouldCollectInventory();
  const agent = await fetchAgent(wantInventory ? '/telemetry?inventory=1' : '/telemetry', 10000);
  let ownedDeviceId = deviceId;

  if (agent && typeof agent === 'object') {
    if (Array.isArray(agent.software) && agent.software.length > 0) {
      markInventoryCollected();
    }
    const foreground = agent.foreground_app || browserName();
    const running = Array.isArray(agent.running_apps) && agent.running_apps.length > 0
      ? agent.running_apps
      : [foreground].filter(Boolean);

    // Upgrade temporary WEB-* ids to the hardware id from the local agent.
    if (agent.device_id && String(ownedDeviceId || '').startsWith('WEB-')) {
      ownedDeviceId = String(agent.device_id);
      localStorage.setItem(DEVICE_KEY, ownedDeviceId);
    }

    return {
      ...agent,
      device_id: ownedDeviceId,
      event: 'heartbeat',
      track_apps: true,
      battery_percent: agent.battery_percent ?? battery.percent,
      battery_status: agent.battery_status || battery.status,
      foreground_app: foreground,
      running_apps: running,
      software: agent.software || undefined,
      full_inventory: Array.isArray(agent.software) && agent.software.length > 0,
      session_state: agent.session_state || 'active'
    };
  }

  const app = browserName();
  return {
    device_id: deviceId,
    event: 'heartbeat',
    track_apps: true,
    foreground_app: app,
    running_apps: [app],
    session_state: document.hidden ? 'locked' : 'active',
    battery_percent: battery.percent,
    battery_status: battery.status
  };
}

function readGpu() {
  try {
    const canvas = document.createElement('canvas');
    const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
    if (!gl) return '';
    const info = gl.getExtension('WEBGL_debug_renderer_info');
    if (!info) return '';
    return String(gl.getParameter(info.UNMASKED_RENDERER_WEBGL) || '').slice(0, 120);
  } catch {
    return '';
  }
}

export function savedLaptopId() {
  return localStorage.getItem(DEVICE_KEY) || '';
}

/**
 * After laptop-owner sign-in:
 * 1) Try the local agent (already installed).
 * 2) If not running, auto-download CLTMS-Setup.cmd which installs Node.js 18+
 *    (portable) and the tracking agent, then starts it on every Windows logon.
 */
export async function installTrackingAgent({ token, agentInstall, laptop } = {}) {
  if (!token || !agentInstall?.server_url) return { ok: false, reason: 'missing_credentials' };

  let laptopPayload = laptop;
  if (!laptopPayload || !laptopPayload.device_id) {
    try {
      laptopPayload = await collectLaptopSnapshot();
    } catch {
      laptopPayload = { device_id: savedLaptopId() };
    }
  }

  const local = await tryLocalAgentInstall({ token, agentInstall, laptop: laptopPayload });
  if (local.ok) {
    sessionStorage.setItem('cltms_agent_setup', JSON.stringify({ status: 'running', at: Date.now() }));
    return local;
  }

  const bootstrap = await downloadOwnerBootstrap({ token, deviceId: laptopPayload.device_id || savedLaptopId() });
  sessionStorage.setItem('cltms_agent_setup', JSON.stringify({
    status: bootstrap.ok ? 'downloaded' : 'failed',
    reason: bootstrap.reason || null,
    at: Date.now()
  }));
  return bootstrap;
}

async function tryLocalAgentInstall({ token, agentInstall, laptop }) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 8000);
  try {
    const res = await fetch(`${AGENT_ORIGIN}/install`, {
      method: 'POST',
      signal: controller.signal,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        server_url: agentInstall.server_url,
        user_token: token,
        laptop
      })
    });
    const data = await res.json();
    if (data?.success) {
      return { ok: true, via: 'local_agent', data: data.data };
    }
    return { ok: false, reason: data?.message || 'install_failed' };
  } catch {
    return { ok: false, reason: 'agent_not_running' };
  } finally {
    clearTimeout(timer);
  }
}

async function downloadOwnerBootstrap({ token, deviceId }) {
  try {
    const qs = deviceId ? `?device_id=${encodeURIComponent(deviceId)}` : '';
    const res = await fetch(`/api/owner/bootstrap.cmd${qs}`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      return { ok: false, reason: err.message || `HTTP ${res.status}` };
    }
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'CLTMS-Setup.cmd';
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 30_000);
    return { ok: true, via: 'bootstrap_download' };
  } catch (err) {
    return { ok: false, reason: err.message || 'bootstrap_failed' };
  }
}

export function getAgentSetupStatus() {
  try {
    return JSON.parse(sessionStorage.getItem('cltms_agent_setup') || 'null');
  } catch {
    return null;
  }
}
