/**
 * =====================================================================
 * Fleet Heartbeat Simulator
 * Used for live testing, demonstration, and load verification
 * =====================================================================
 */

const http = require('http');

const SERVER = process.env.SERVER_URL || 'http://localhost:5000';
const INTERVAL_SEC = parseInt(process.argv.find(a => a.startsWith('--interval='))?.split('=')[1] || '15', 10);
const ONCE = process.argv.includes('--once');

// Simulated fleet laptop devices and tokens matching seed data
const FLEET = [
  { id: 1, asset_id: 'SG-LAP-001', name: "Alex's ThinkPad X1", token: 'dev_tok_8f91a27b819234ea7bc10984', os: 'Windows', ip: '198.51.100.42', baseBat: 89, batTrend: -1 },
  { id: 2, asset_id: 'SG-LAP-002', name: "Sarah's MacBook Pro 16", token: 'dev_tok_9b18ca09e81726a45bd88102', os: 'macOS', ip: '198.51.100.42', baseBat: 96, batTrend: 0 },
  { id: 3, asset_id: 'SG-LAP-003', name: "David's Dell XPS 15", token: 'dev_tok_4f0918ac89e17b3c4568910a', os: 'Windows', ip: '203.0.113.88', baseBat: 74, batTrend: -1 },
  { id: 4, asset_id: 'SG-LAP-004', name: "Emily's MacBook Air 15", token: 'dev_tok_1a2b3c4d5e6f7a8b9c0d1e2f', os: 'macOS', ip: '192.0.2.71', baseBat: 62, batTrend: -2 },
  { id: 5, asset_id: 'SG-LAP-005', name: "Marcus's HP EliteBook 840", token: 'dev_tok_7b8c9d0e1f2a3b4c5d6e7f8a', os: 'Windows', ip: '198.51.100.42', baseBat: 85, batTrend: 0 },
  { id: 7, asset_id: 'SG-LAP-007', name: "Liam's MacBook Pro 14", token: 'dev_tok_6e7f8a9b0c1d2e3f4a5b6c7d', os: 'macOS', ip: '81.2.69.142', baseBat: 92, batTrend: 0 },
  { id: 8, asset_id: 'SG-LAP-008', name: "Sophia's Dell Latitude 5440", token: 'dev_tok_9a8b7c6d5e4f3a2b1c0d9e8f', os: 'Windows', ip: '66.249.64.10', baseBat: 82, batTrend: 1 },
  { id: 10, asset_id: 'SG-LAP-010', name: "Jessica's MacBook Air 13", token: 'dev_tok_8a9b0c1d2e3f4a5b6c7d8e9f', os: 'macOS', ip: '198.51.100.42', baseBat: 100, batTrend: 0 },
  { id: 12, asset_id: 'SG-LAP-012', name: "Aisha's MacBook Pro 14", token: 'dev_tok_4a5b6c7d8e9f0a1b2c3d4e5f', os: 'macOS', ip: '175.45.176.10', baseBat: 68, batTrend: -1 }
];

function sendHeartbeat(device) {
  const url = new URL(`${SERVER}/api/devices/heartbeat`);
  
  // Random telemetry fluctuations
  const cpu = (Math.random() * 25 + 5).toFixed(1);
  const ram = (Math.random() * 20 + 40).toFixed(1);
  const disk = device.asset_id === 'SG-LAP-008' ? (93 + Math.random() * 2).toFixed(1) : (Math.random() * 15 + 40).toFixed(1);
  const bat = Math.max(10, Math.min(100, Math.round(device.baseBat + (Math.random() * 4 - 2))));
  const batStatus = bat === 100 ? 'Plugged In' : (device.batTrend >= 0 ? 'Charging' : 'Discharging');

  const payload = JSON.stringify({
    cpu_usage: parseFloat(cpu),
    ram_usage: parseFloat(ram),
    disk_usage: parseFloat(disk),
    battery_percent: bat,
    battery_status: batStatus,
    public_ip: device.ip,
    local_ip: `192.168.1.${100 + device.id}`
  });

  const req = http.request({
    hostname: url.hostname,
    port: url.port || 5000,
    path: url.pathname,
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Content-Length': Buffer.byteLength(payload),
      'Authorization': `Bearer ${device.token}`
    },
    timeout: 5000
  }, (res) => {
    let data = '';
    res.on('data', chunk => data += chunk);
    res.on('end', () => {
      if (res.statusCode === 200) {
        console.log(`[Simulator ✓] ${device.asset_id} (${device.name}): CPU ${cpu}%, RAM ${ram}%, Bat ${bat}% (${batStatus})`);
      } else {
        console.warn(`[Simulator ✗] ${device.asset_id} failed: HTTP ${res.statusCode} - ${data.slice(0, 80)}`);
      }
    });
  });

  req.on('error', err => {
    console.error(`[Simulator Error] ${device.asset_id}:`, err.message);
  });

  req.write(payload);
  req.end();
}

function runCycle() {
  console.log(`\n--- Simulating Fleet Telemetry Cycle at ${new Date().toLocaleTimeString()} ---`);
  FLEET.forEach(dev => sendHeartbeat(dev));
}

runCycle();

if (!ONCE) {
  console.log(`Simulating periodic fleet heartbeats every ${INTERVAL_SEC} seconds. Press Ctrl+C to stop.`);
  setInterval(runCycle, INTERVAL_SEC * 1000);
}
