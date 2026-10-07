import {
  mockStats,
  mockDevices,
  mockEmployees,
  mockDepartments,
  mockMaintenance,
  mockAlerts,
  mockNotifications,
  mockSettings,
  mockTokens,
  mockUsers,
  mockAuditLogs,
  mockWorkSummary,
  mockActivities,
  mockDeviceWork
} from './mockData';

const API_BASE = '/api';

// In-memory state for standalone frontend mock mode
let localDevices = [...mockDevices];
let localEmployees = [...mockEmployees];
let localMaintenance = [...mockMaintenance];
let localAlerts = [...mockAlerts];
let localTokens = [...mockTokens];
let localNotifications = [...mockNotifications];
let localDeviceWork = JSON.parse(JSON.stringify(mockDeviceWork));

function applyOwnerTrackingToAdmin(devicePatch, activityPatch = {}) {
  const ownerName = (devicePatch.employee_name || 'Alex Rivera').toLowerCase();
  let targetIndex = localDevices.findIndex(d =>
    Number(d.employee_id) === Number(devicePatch.employee_id || 1)
    || d.asset_id === devicePatch.asset_id
    || d.device_id === devicePatch.device_id
    || (d.name && d.name.toLowerCase() === ownerName)
    || (d.name && d.name.toLowerCase().includes(ownerName))
  );
  if (targetIndex < 0) {
    targetIndex = localDevices.findIndex(d => Number(d.employee_id) === 1 || d.asset_id === 'SG-LAP-001' || d.id === 1);
  }
  const base = targetIndex >= 0 ? localDevices[targetIndex] : localDevices[0];
  const next = {
    ...base,
    ...devicePatch,
    id: base?.id || 1,
    asset_id: base?.asset_id || devicePatch.asset_id || 'SG-LAP-001',
    name: base?.name || devicePatch.name || "Alex's ThinkPad X1",
    employee_id: devicePatch.employee_id || base?.employee_id || 1,
    employee_name: devicePatch.employee_name || base?.employee_name || 'Alex Rivera',
    employee_code: devicePatch.employee_code || base?.employee_code || 'EMP-1001',
    department_name: devicePatch.department_name || base?.department_name || 'Engineering & DevOps',
    status: devicePatch.status ?? base?.status ?? 'offline',
    asset_status: devicePatch.asset_status ?? base?.asset_status ?? 'assigned',
    agent_installed_at: devicePatch.agent_installed_at ?? base?.agent_installed_at ?? new Date().toISOString(),
    last_seen: new Date().toISOString()
  };
  if (targetIndex >= 0) localDevices[targetIndex] = next;
  else localDevices.unshift(next);

  const workId = String(next.id);
  const currentWork = localDeviceWork[workId] || localDeviceWork[1] || {
    current: null,
    open_apps: [],
    software: [],
    usage_today: [],
    activities: []
  };

  const runningNames = Array.isArray(activityPatch.running_apps)
    ? activityPatch.running_apps.map(a => (typeof a === 'string' ? a : a?.name)).filter(Boolean)
    : (next.current_app ? [next.current_app] : []);

  let software = [...(currentWork.software || [])];
  for (const name of runningNames) {
    const idx = software.findIndex(s => s.name === name);
    if (idx >= 0) software[idx] = { ...software[idx], is_running: 1 };
    else software.unshift({ name, version: '', publisher: 'Open application', is_running: 1 });
  }
  software = software.map(s => ({
    ...s,
    is_running: runningNames.includes(s.name) ? 1 : 0
  }));

  if (Array.isArray(activityPatch.software)) {
    for (const row of activityPatch.software) {
      if (!row?.name) continue;
      const idx = software.findIndex(s => s.name === row.name);
      if (idx >= 0) software[idx] = { ...software[idx], ...row };
      else software.push({ ...row, is_running: runningNames.includes(row.name) ? 1 : 0 });
    }
  }

  const openApps = software.filter(s => Number(s.is_running) === 1);
  const activityRow = {
    id: Date.now(),
    device_id: next.id,
    asset_id: next.asset_id,
    employee_name: next.employee_name,
    event_type: activityPatch.event === 'session_end' ? 'session_end' : 'app_focus',
    app_name: next.current_app,
    windows_user: next.windows_user,
    summary: activityPatch.event === 'session_end'
      ? `${next.windows_user || 'Owner'} signed out`
      : `${next.windows_user || 'Owner'} is using ${next.current_app || 'an application'}`,
    occurred_at: new Date().toISOString()
  };

  localDeviceWork[workId] = {
    ...currentWork,
    device: {
      id: next.id,
      asset_id: next.asset_id,
      name: next.name,
      current_app: next.current_app,
      windows_user: next.windows_user,
      session_state: next.session_state,
      status: next.status
    },
    current: next.current_app
      ? {
          app_name: next.current_app,
          windows_user: next.windows_user,
          duration_seconds: 60,
          is_active: 1
        }
      : null,
    open_apps: openApps,
    software,
    usage_today: [
      ...(next.current_app
        ? [{ app_name: next.current_app, duration_seconds: 120 }]
        : []),
      ...((currentWork.usage_today || []).filter(u => u.app_name !== next.current_app))
    ].slice(0, 8),
    activities: [activityRow, ...(currentWork.activities || [])].slice(0, 40)
  };

  localStorage.setItem('mockOwnerLaptop', JSON.stringify(next));
  return next;
}

function handleMockRoute(endpoint, options = {}) {
  const method = options.method || 'GET';
  const url = new URL(endpoint, 'http://localhost');
  const path = url.pathname;
  const params = Object.fromEntries(url.searchParams.entries());
  const body = options.body ? (typeof options.body === 'string' ? JSON.parse(options.body) : options.body) : {};

  // 1. Auth routes
  if (path === '/api/auth/login') {
    const user = mockUsers.find(u => u.email.toLowerCase() === (body.email || '').toLowerCase()) || mockUsers[0];
    return {
      success: true,
      message: 'Login successful (Offline Demo Mode)',
      data: {
        token: 'mock-jwt-token-preview-2026',
        user
      }
    };
  }

  if (path === '/api/auth/owner-login') {
    const laptop = body.laptop || {};
    const running = Array.isArray(laptop.running_apps) && laptop.running_apps.length
      ? laptop.running_apps
      : [laptop.foreground_app || 'Company Portal'].filter(Boolean);
    const device = applyOwnerTrackingToAdmin({
      device_id: laptop.device_id || 'WEB-DEMO',
      name: "Alex's ThinkPad X1",
      hostname: laptop.hostname || 'LAPTOP',
      manufacturer: laptop.manufacturer || 'PC',
      model: laptop.model || 'Corporate Laptop',
      serial_number: laptop.serial_number || laptop.device_id || 'WEB-DEMO',
      os: laptop.os || 'Windows',
      os_version: laptop.os_version || '',
      architecture: laptop.architecture || 'x64',
      cpu_model: laptop.cpu_model || '',
      ram_total_gb: laptop.ram_total_gb || 16,
      storage_total_gb: laptop.storage_total_gb || 0,
      battery_percent: laptop.battery_percent ?? 80,
      battery_status: laptop.battery_status || 'Unknown',
      cpu_usage: laptop.cpu_usage ?? 12,
      ram_usage: laptop.ram_usage ?? 48,
      disk_usage: laptop.disk_usage ?? 52,
      public_ip: '127.0.0.1',
      local_ip: laptop.local_ip || '',
      mac_address: laptop.mac_address || '',
      current_app: laptop.foreground_app || 'Company Portal',
      windows_user: laptop.windows_user || 'alex.rivera',
      session_state: 'active',
    }, {
      running_apps: running,
      software: laptop.software,
      event: 'session_start'
    });
    return {
      success: true,
      message: 'Laptop saved. Install the tracking agent on this machine to run at every sign-in.',
      data: {
        token: 'mock-owner-token',
        user: {
          id: 20,
          name: 'Alex Rivera',
          email: body.email || 'alex.rivera@company.com',
          role: 'laptop_owner',
          employee_id: 1,
          employee_code: 'EMP-1001'
        },
        device,
        agent_install: {
          device_id: device.device_id,
          asset_id: device.asset_id,
          device_token: 'mock-device-token',
          server_url: window.location.origin,
          heartbeat_interval: 60,
          agent_allowed: 1
        }
      }
    };
  }

  if (path === '/api/owner/laptop' && method === 'GET') {
    const raw = localStorage.getItem('mockOwnerLaptop');
    if (!raw) {
      return { success: false, message: 'No laptop is saved for this owner yet.' };
    }
    return { success: true, data: JSON.parse(raw) };
  }

  if (path === '/api/owner/track' && method === 'POST') {
    const raw = localStorage.getItem('mockOwnerLaptop');
    const current = raw ? JSON.parse(raw) : localDevices.find(d => Number(d.employee_id) === 1);
    if (!current) {
      return { success: false, message: 'No laptop is saved for this owner yet.' };
    }
    const running = Array.isArray(body.running_apps) && body.running_apps.length
      ? body.running_apps
      : [body.foreground_app || current.current_app].filter(Boolean);
    const next = applyOwnerTrackingToAdmin({
      ...current,
      battery_percent: body.battery_percent ?? current.battery_percent,
      battery_status: body.battery_status || current.battery_status,
      cpu_usage: body.cpu_usage ?? current.cpu_usage,
      ram_usage: body.ram_usage ?? current.ram_usage,
      disk_usage: body.disk_usage ?? current.disk_usage,
      hostname: body.hostname || current.hostname,
      local_ip: body.local_ip || current.local_ip,
      mac_address: body.mac_address || current.mac_address,
      current_app: body.event === 'session_end' ? null : (body.foreground_app || current.current_app),
      windows_user: body.windows_user || current.windows_user,
      session_state: body.event === 'session_end' ? 'logged_off' : (body.session_state || 'active')
    }, {
      running_apps: body.event === 'session_end' ? [] : running,
      software: body.software,
      event: body.event
    });
    return {
      success: true,
      data: {
        device_id: next.device_id,
        asset_id: next.asset_id,
        status: next.status,
        current_app: next.current_app,
        open_apps: running
      }
    };
  }

  if (path === '/api/auth/me') {
    const saved = localStorage.getItem('user');
    const user = saved ? JSON.parse(saved) : mockUsers[0];
    return { success: true, data: user };
  }

  // 2. Dashboard Stats
  if (path === '/api/devices/stats') {
    return {
      success: true,
      data: {
        ...mockStats,
        total: localDevices.length,
        online: localDevices.filter(d => d.status === 'online').length,
        offline: localDevices.filter(d => d.status === 'offline').length,
        maintenance: localDevices.filter(d => d.status === 'maintenance').length,
        assigned: localDevices.filter(d => d.employee_id).length,
        unassigned: localDevices.filter(d => !d.employee_id).length
      }
    };
  }

  // 3. Devices list & search
  if (path === '/api/devices' && method === 'GET') {
    let result = [...localDevices];
    if (params.status && params.status !== 'all') {
      result = result.filter(d => d.status === params.status);
    }
    if (params.os && params.os !== 'all') {
      result = result.filter(d => d.os.toLowerCase() === params.os.toLowerCase());
    }
    if (params.department_id && params.department_id !== 'all') {
      result = result.filter(d => String(d.department_id) === String(params.department_id));
    }
    if (params.assigned === 'true') {
      result = result.filter(d => d.employee_id);
    } else if (params.assigned === 'false') {
      result = result.filter(d => !d.employee_id);
    }
    if (params.search) {
      const s = params.search.toLowerCase();
      result = result.filter(d =>
        d.asset_id.toLowerCase().includes(s) ||
        d.name.toLowerCase().includes(s) ||
        d.serial_number.toLowerCase().includes(s) ||
        (d.employee_name && d.employee_name.toLowerCase().includes(s)) ||
        d.model.toLowerCase().includes(s) ||
        (d.public_ip && d.public_ip.includes(s))
      );
    }
    return { success: true, data: result };
  }

  // 4. Device Details by ID
  const devMatch = path.match(/^\/api\/devices\/([^\/]+)$/);
  if (devMatch && method === 'GET') {
    const id = devMatch[1];
    const dev = localDevices.find(d => String(d.id) === id || d.device_id === id) || localDevices[0];
    
    // Generate 15 simulated heartbeats for chart
    const heartbeats = Array.from({ length: 15 }).map((_, i) => ({
      cpu_usage: Math.round(15 + Math.sin(i) * 10 + Math.random() * 8),
      ram_usage: Math.round(45 + Math.cos(i) * 5 + Math.random() * 5),
      disk_usage: dev.disk_usage || 50,
      battery_percent: Math.max(20, (dev.battery_percent || 90) - i),
      recorded_at: new Date(Date.now() - (15 - i) * 60000).toISOString()
    }));

    return {
      success: true,
      data: {
        ...dev,
        heartbeats,
        latest_location: dev.latest_location || { city: 'New York', region: 'New York', country: 'United States', latitude: 40.7128, longitude: -74.0060, isp: 'Verizon Enterprise' },
        maintenance: localMaintenance.filter(m => m.device_id === dev.id),
        alerts: localAlerts.filter(a => a.device_id === dev.id)
      }
    };
  }

  // 5. Device assignment / maintenance mutations
  if (path.includes('/assign') && method === 'PUT') {
    const id = parseInt(path.split('/')[3], 10);
    const emp = localEmployees.find(e => String(e.id) === String(body.employee_id));
    localDevices = localDevices.map(d => d.id === id ? { ...d, employee_id: body.employee_id, employee_name: emp?.name, status: 'online' } : d);
    return { success: true, message: 'Device assigned.' };
  }

  if (path.includes('/maintenance') && method === 'PUT') {
    const id = parseInt(path.split('/')[3], 10);
    localDevices = localDevices.map(d => d.id === id ? { ...d, status: d.status === 'maintenance' ? 'offline' : 'maintenance' } : d);
    return { success: true, message: 'Maintenance state updated.' };
  }

  if (path.includes('/deactivate') && method === 'PUT') {
    const id = parseInt(path.split('/')[3], 10);
    localDevices = localDevices.filter(d => d.id !== id);
    return { success: true, message: 'Device deactivated.' };
  }

  // 6. Employees
  if (path === '/api/employees' && method === 'GET') {
    return { success: true, data: localEmployees };
  }
  const empMatch = path.match(/^\/api\/employees\/(\d+)$/);
  if (empMatch && method === 'GET') {
    const emp = localEmployees.find(e => String(e.id) === empMatch[1]) || localEmployees[0];
    const devList = localDevices.filter(d => d.employee_id === emp.id);
    return { success: true, data: { ...emp, devices: devList } };
  }
  if (path === '/api/employees' && method === 'POST') {
    const newEmp = { id: Date.now(), ...body, assigned_devices_count: 0, status: 'active' };
    localEmployees.push(newEmp);
    return { success: true, message: 'Employee added.', data: newEmp };
  }

  // 7. Departments
  if (path === '/api/departments' && method === 'GET') {
    return { success: true, data: mockDepartments };
  }
  if (path === '/api/departments' && method === 'POST') {
    return { success: true, message: 'Department created.' };
  }

  // 8. Maintenance Tickets
  if (path === '/api/maintenance' && method === 'GET') {
    return { success: true, data: localMaintenance };
  }
  if (path === '/api/maintenance' && method === 'POST') {
    const dev = localDevices.find(d => String(d.id) === String(body.device_id));
    const newTicket = {
      id: Date.now(),
      ticket_id: `MNT-2026-${String(localMaintenance.length + 1).padStart(3, '0')}`,
      device_id: body.device_id,
      device_asset_id: dev?.asset_id || 'SG-LAP-001',
      device_name: dev?.name || 'Company Laptop',
      issue: body.issue,
      priority: body.priority || 'medium',
      status: 'open',
      technician: body.technician || 'IT Support',
      reported_date: new Date().toISOString()
    };
    localMaintenance.unshift(newTicket);
    return { success: true, data: newTicket };
  }
  if (path.startsWith('/api/maintenance/') && method === 'PUT') {
    const id = parseInt(path.split('/')[3], 10);
    localMaintenance = localMaintenance.map(m => m.id === id ? { ...m, ...body } : m);
    return { success: true, message: 'Ticket updated.' };
  }

  // 9. Alerts
  if (path === '/api/alerts' && method === 'GET') {
    return { success: true, data: localAlerts };
  }
  if (path.includes('/acknowledge') && method === 'PUT') {
    const id = parseInt(path.split('/')[3], 10);
    localAlerts = localAlerts.map(a => a.id === id ? { ...a, status: 'acknowledged' } : a);
    return { success: true, message: 'Alert acknowledged.' };
  }
  if (path.includes('/resolve') && method === 'PUT') {
    const id = parseInt(path.split('/')[3], 10);
    localAlerts = localAlerts.map(a => a.id === id ? { ...a, status: 'resolved' } : a);
    return { success: true, message: 'Alert resolved.' };
  }
  if (path === '/api/alerts/check' && method === 'POST') {
    return { success: true, message: 'Audit completed.', overdue_marked_offline: 0 };
  }

  // 10. Notifications
  if (path === '/api/notifications' && method === 'GET') {
    return { success: true, data: localNotifications, unread_count: localNotifications.filter(n => !n.is_read).length };
  }
  if (path === '/api/notifications/read-all' && method === 'PUT') {
    localNotifications = localNotifications.map(n => ({ ...n, is_read: 1 }));
    return { success: true, message: 'All read.' };
  }

  // 11. Settings & Tokens
  if (path === '/api/settings' && method === 'GET') {
    return { success: true, data: { map: mockSettings } };
  }
  if (path === '/api/settings' && method === 'PUT') {
    return { success: true, message: 'Settings saved.' };
  }
  if (path === '/api/enrollment-tokens' && method === 'GET') {
    return { success: true, data: localTokens };
  }
  if (path === '/api/enrollment-tokens' && method === 'POST') {
    const newToken = {
      id: Date.now(),
      token: `ENROLL-${Math.random().toString(36).substring(2, 6).toUpperCase()}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`,
      name: body.name || 'Quick Token',
      max_uses: body.max_uses || 10,
      uses_count: 0,
      expires_at: new Date(Date.now() + 14 * 86400000).toISOString(),
      current_status: 'active'
    };
    localTokens.unshift(newToken);
    return { success: true, data: newToken };
  }
  if (path.includes('/enrollment-tokens/') && path.includes('/revoke')) {
    const id = parseInt(path.split('/')[3], 10);
    localTokens = localTokens.map(t => t.id === id ? { ...t, current_status: 'revoked' } : t);
    return { success: true, message: 'Token revoked.' };
  }

  // 12. Users
  if (path === '/api/users' && method === 'GET') {
    return { success: true, data: mockUsers };
  }

  // 13. Audit logs
  if (path === '/api/audit-logs' && method === 'GET') {
    return { success: true, data: mockAuditLogs };
  }

  if (path === '/api/activity/summary' && method === 'GET') {
    const liveFromWork = Object.values(localDeviceWork)
      .filter(w => w?.current?.app_name)
      .map((w, idx) => ({
        id: idx + 1,
        device_id: w.device?.id || 1,
        asset_id: w.device?.asset_id || 'SG-LAP-001',
        device_name: w.device?.name || 'Tracked Laptop',
        employee_name: 'Alex Rivera',
        department_name: 'Engineering & DevOps',
        windows_user: w.current.windows_user,
        app_name: w.current.app_name,
        duration_seconds: w.current.duration_seconds || 60
      }));
    return {
      success: true,
      data: {
        ...mockWorkSummary,
        active_sessions: Math.max(mockWorkSummary.active_sessions, liveFromWork.length),
        live: liveFromWork.length ? [...liveFromWork, ...mockWorkSummary.live.filter(r => r.device_id !== 1)] : mockWorkSummary.live
      }
    };
  }

  if (path === '/api/activity' && method === 'GET') {
    const liveActs = Object.values(localDeviceWork).flatMap(w => w?.activities || []);
    let rows = [...liveActs, ...mockActivities];
    if (params.event_type) rows = rows.filter(row => row.event_type === params.event_type);
    if (params.search) {
      const q = params.search.toLowerCase();
      rows = rows.filter(row => `${row.summary} ${row.app_name || ''} ${row.employee_name || ''} ${row.asset_id}`.toLowerCase().includes(q));
    }
    return { success: true, data: rows };
  }

  const workMatch = path.match(/^\/api\/devices\/([^/]+)\/work$/);
  if (workMatch && method === 'GET') {
    const id = workMatch[1];
    return { success: true, data: localDeviceWork[id] || localDeviceWork[1] || mockDeviceWork[1] };
  }

  // 14. Reports
  if (path.startsWith('/api/reports/')) {
    if (path.includes('devices')) return { success: true, data: localDevices };
    if (path.includes('employees')) return { success: true, data: localEmployees };
    if (path.includes('departments')) return { success: true, data: mockDepartments };
    if (path.includes('maintenance')) return { success: true, data: localMaintenance };
  }

  // Default fallback
  return { success: true, data: [] };
}

export async function request(endpoint, options = {}) {
  const token = localStorage.getItem('token');
  
  const headers = {
    'Content-Type': 'application/json',
    ...(options.headers || {})
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const config = {
    ...options,
    headers
  };

  if (config.body && typeof config.body === 'object' && !(config.body instanceof FormData)) {
    config.body = JSON.stringify(config.body);
  }

  try {
    const res = await fetch(`${API_BASE}${endpoint}`, config);

    if (res.status === 401 && !endpoint.includes('/auth/login')) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/login';
      throw new Error('Session expired. Please log in again.');
    }

    const contentType = res.headers.get('content-type');
    if (contentType && (contentType.includes('text/csv') || contentType.includes('application/octet-stream'))) {
      return await res.text();
    }

    let data = null;
    try {
      data = await res.json();
    } catch {
      data = null;
    }
    if (!res.ok) {
      const error = new Error((data && data.message) || `HTTP ${res.status}`);
      error.status = res.status;
      throw error;
    }
    return data;
  } catch (err) {
    const network = err instanceof TypeError || /failed to fetch|networkerror|load failed/i.test(err.message || '');
    if (!network) {
      throw err;
    }
    // Backend is not running, so the screen can still be previewed with local demo data.
    console.info(`[Frontend Standalone Mode] Serving fallback for ${endpoint}`);
    return handleMockRoute(`${API_BASE}${endpoint}`, options);
  }
}

export const api = {
  get: (endpoint, params = {}) => {
    const query = new URLSearchParams(
      Object.entries(params).filter(([_, v]) => v !== undefined && v !== null && v !== '')
    ).toString();
    return request(query ? `${endpoint}?${query}` : endpoint, { method: 'GET' });
  },
  post: (endpoint, body) => request(endpoint, { method: 'POST', body }),
  put: (endpoint, body) => request(endpoint, { method: 'PUT', body }),
  delete: (endpoint) => request(endpoint, { method: 'DELETE' })
};

export default api;
