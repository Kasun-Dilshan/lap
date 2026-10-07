import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { api } from '../services/api';
import { formatAppDate, formatAppDateTime, formatAppTime } from '../utils/datetime';
import { useAuth } from '../context/AuthContext';
import {
  Laptop,
  ArrowLeft,
  Cpu,
  HardDrive,
  BatteryMedium,
  Wifi,
  Globe,
  User,
  Building,
  Calendar,
  Clock,
  Wrench,
  AlertTriangle,
  MapPin,
  RefreshCw,
  ShieldCheck,
  CheckCircle2,
  XCircle,
  Copy,
  Check
} from 'lucide-react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  Legend
} from 'recharts';

export default function DeviceDetails() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { hasRole } = useAuth();

  const [device, setDevice] = useState(null);
  const [work, setWork] = useState(null);
  const [softwareQuery, setSoftwareQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [tokenCopied, setTokenCopied] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [agentBusy, setAgentBusy] = useState(false);

  const isAdmin = hasRole(['super_admin', 'it_admin']);
  const agentInstalled = Boolean(device?.agent_installed_at);
  const agentAllowed = device?.agent_allowed !== 0 && device?.agent_allowed !== false;

  const fetchDevice = async () => {
    try {
      const res = await api.get(`/devices/${id}`);
      if (res.success) setDevice(res.data);
      try {
        const workRes = await api.get(`/devices/${id}/work`);
        if (workRes.success) setWork(workRes.data);
      } catch (workErr) {
        console.error(workErr);
      }
    } catch (err) {
      console.error('Failed to fetch device details:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchDevice();
    const interval = setInterval(fetchDevice, 15000); // 15s refresh for live telemetry
    return () => clearInterval(interval);
  }, [id]);

  async function handleRemoveAgent() {
    if (!window.confirm(`Remove the tracking agent from ${device?.asset_id}? Only an administrator can do this.`)) return;
    setAgentBusy(true);
    try {
      await api.put(`/devices/${id}/remove-agent`);
      await fetchDevice();
    } catch (err) {
      alert(err.message || 'Could not remove agent');
    } finally {
      setAgentBusy(false);
    }
  }

  async function handleAllowAgent() {
    setAgentBusy(true);
    try {
      await api.put(`/devices/${id}/allow-agent`);
      await fetchDevice();
    } catch (err) {
      alert(err.message || 'Could not allow agent');
    } finally {
      setAgentBusy(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="flex flex-col items-center gap-3">
          <RefreshCw className="w-8 h-8 text-emerald-500 animate-spin" />
          <p className="text-sm font-medium text-slate-500">Loading Device Profile...</p>
        </div>
      </div>
    );
  }

  if (!device) {
    return (
      <div className="text-center py-16 bg-white rounded-2xl border border-slate-200">
        <Laptop className="w-12 h-12 text-slate-300 mx-auto" />
        <h3 className="text-lg font-bold text-slate-800 mt-3">Device Not Found</h3>
        <p className="text-xs text-slate-500 mt-1">The requested laptop record does not exist or has been removed.</p>
        <button
          onClick={() => navigate('/devices')}
          className="mt-4 px-4 py-2 text-xs font-semibold text-emerald-600 bg-emerald-50 rounded-lg hover:bg-emerald-100"
        >
          Return to Devices
        </button>
      </div>
    );
  }

  // Telemetry chart data formatting
  const chartData = (device.heartbeats || []).map((h) => ({
    time: formatAppTime(h.recorded_at),
    cpu: Number(h.cpu_usage || 0),
    ram: Number(h.ram_usage || 0),
    battery: Number(h.battery_percent || 0)
  }));

  const loc = device.latest_location;

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* Top Breadcrumb & Navigation */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate('/devices')}
            className="p-2 text-slate-600 hover:text-slate-900 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div>
            <div className="flex items-center gap-2.5">
              <span className="font-mono text-xl font-black text-slate-900">{device.asset_id}</span>
              <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                device.status === 'online'
                  ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                  : device.status === 'maintenance'
                  ? 'bg-amber-50 text-amber-700 border border-amber-200'
                  : 'bg-slate-100 text-slate-600 border border-slate-200'
              }`}>
                <span className={`w-1.5 h-1.5 rounded-full ${
                  device.status === 'online' ? 'bg-emerald-500 animate-pulse' : device.status === 'maintenance' ? 'bg-amber-500' : 'bg-slate-400'
                }`} />
                {device.status.toUpperCase()}
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">{device.name} • {device.model}</p>
            {work?.current?.app_name && (
              <p className="text-xs font-semibold text-emerald-700 mt-1">
                Using {work.current.app_name}
                {work.current.windows_user ? ` · ${work.current.windows_user}` : ''}
                {work?.open_apps?.length ? ` · ${work.open_apps.length} apps open` : ''}
              </p>
            )}
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {isAdmin && agentInstalled && agentAllowed && (
            <button
              type="button"
              onClick={handleRemoveAgent}
              disabled={agentBusy}
              className="inline-flex items-center gap-2 px-3 py-1.5 text-xs font-semibold text-rose-700 bg-rose-50 border border-rose-200 rounded-lg hover:bg-rose-100 transition disabled:opacity-60"
            >
              Remove tracking agent
            </button>
          )}
          {isAdmin && !agentAllowed && (
            <button
              type="button"
              onClick={handleAllowAgent}
              disabled={agentBusy}
              className="inline-flex items-center gap-2 px-3 py-1.5 text-xs font-semibold text-emerald-800 bg-emerald-50 border border-emerald-200 rounded-lg hover:bg-emerald-100 transition disabled:opacity-60"
            >
              Allow agent install
            </button>
          )}
          <button
            onClick={() => { setRefreshing(true); fetchDevice(); }}
            disabled={refreshing}
            className="inline-flex items-center gap-2 px-3 py-1.5 text-xs font-semibold text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition"
          >
            <RefreshCw className={`w-3.5 h-3.5 text-slate-500 ${refreshing ? 'animate-spin' : ''}`} />
            Sync
          </button>
        </div>
      </div>

      {/* ----------------- SECTION 1: HARDWARE & TELEMETRY OVERVIEW ----------------- */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {/* CPU */}
        <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-sm">
          <div className="flex items-center justify-between text-slate-500 text-xs font-semibold">
            <span>CPU UTILIZATION</span>
            <Cpu className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="mt-3">
            <span className="text-2xl font-black text-slate-900">{device.cpu_usage || 0}%</span>
            <div className="w-full bg-slate-100 h-1.5 rounded-full mt-2 overflow-hidden">
              <div
                className="bg-emerald-500 h-full rounded-full transition-all"
                style={{ width: `${Math.min(100, device.cpu_usage || 0)}%` }}
              />
            </div>
            <span className="block text-[10px] text-slate-400 mt-1 truncate">{device.cpu_model || 'Multi-Core Processor'}</span>
          </div>
        </div>

        {/* RAM */}
        <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-sm">
          <div className="flex items-center justify-between text-slate-500 text-xs font-semibold">
            <span>RAM MEMORY</span>
            <Laptop className="w-4 h-4 text-blue-600" />
          </div>
          <div className="mt-3">
            <span className="text-2xl font-black text-slate-900">{device.ram_usage || 0}%</span>
            <div className="w-full bg-slate-100 h-1.5 rounded-full mt-2 overflow-hidden">
              <div
                className="bg-blue-500 h-full rounded-full transition-all"
                style={{ width: `${Math.min(100, device.ram_usage || 0)}%` }}
              />
            </div>
            <span className="block text-[10px] text-slate-400 mt-1">Total: {device.ram_total_gb || 16} GB DDR5</span>
          </div>
        </div>

        {/* Storage */}
        <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-sm">
          <div className="flex items-center justify-between text-slate-500 text-xs font-semibold">
            <span>STORAGE USAGE</span>
            <HardDrive className={`w-4 h-4 ${device.disk_usage > 90 ? 'text-rose-500' : 'text-purple-600'}`} />
          </div>
          <div className="mt-3">
            <span className={`text-2xl font-black ${device.disk_usage > 90 ? 'text-rose-600' : 'text-slate-900'}`}>
              {device.disk_usage || 0}%
            </span>
            <div className="w-full bg-slate-100 h-1.5 rounded-full mt-2 overflow-hidden">
              <div
                className={`h-full rounded-full transition-all ${device.disk_usage > 90 ? 'bg-rose-500' : 'bg-purple-500'}`}
                style={{ width: `${Math.min(100, device.disk_usage || 0)}%` }}
              />
            </div>
            <span className="block text-[10px] text-slate-400 mt-1">Total: {device.storage_total_gb || 512} GB NVMe</span>
          </div>
        </div>

        {/* Battery */}
        <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-sm">
          <div className="flex items-center justify-between text-slate-500 text-xs font-semibold">
            <span>BATTERY HEALTH</span>
            <BatteryMedium className={`w-4 h-4 ${device.battery_percent <= 20 ? 'text-rose-500' : 'text-amber-500'}`} />
          </div>
          <div className="mt-3">
            <span className="text-2xl font-black text-slate-900">{device.battery_percent || 100}%</span>
            <div className="w-full bg-slate-100 h-1.5 rounded-full mt-2 overflow-hidden">
              <div
                className={`h-full rounded-full transition-all ${device.battery_percent <= 20 ? 'bg-rose-500' : 'bg-emerald-500'}`}
                style={{ width: `${Math.min(100, device.battery_percent || 100)}%` }}
              />
            </div>
            <span className="block text-[10px] text-slate-400 mt-1">{device.battery_status || 'Plugged In'}</span>
          </div>
        </div>
      </div>

      {/* ----------------- SECTION 2: LIVE TELEMETRY CHART ----------------- */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div>
            <h3 className="text-sm font-bold text-slate-900">Heartbeat Telemetry History</h3>
            <p className="text-xs text-slate-500">Live CPU and RAM utilization metrics sent by Laptop Agent</p>
          </div>
          <span className="text-xs font-mono text-slate-500">Cycle: Every 60s</span>
        </div>

        <div className="h-64 mt-4">
          {chartData.length === 0 ? (
            <div className="h-full flex items-center justify-center text-xs text-slate-400">
              Awaiting telemetry records from background agent...
            </div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="cpuGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                  </linearGradient>
                  <linearGradient id="ramGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <XAxis dataKey="time" tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis domain={[0, 100]} tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#0f172a', borderRadius: '8px', color: '#fff', fontSize: '12px' }}
                />
                <Legend iconType="circle" wrapperStyle={{ fontSize: '12px', paddingTop: '8px' }} />
                <Area type="monotone" dataKey="cpu" name="CPU Usage %" stroke="#10b981" strokeWidth={2} fillOpacity={1} fill="url(#cpuGrad)" />
                <Area type="monotone" dataKey="ram" name="RAM Usage %" stroke="#3b82f6" strokeWidth={2} fillOpacity={1} fill="url(#ramGrad)" />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* ----------------- SECTION 3: SYSTEM, NETWORK & ASSIGNMENT PROFILES ----------------- */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Device Information */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm space-y-3">
          <div className="flex items-center gap-2 pb-2 border-b border-slate-100">
            <Laptop className="w-4 h-4 text-emerald-600" />
            <h3 className="text-sm font-bold text-slate-900">Device Specifications</h3>
          </div>
          <div className="space-y-2 text-xs divide-y divide-slate-50">
            <div className="flex justify-between py-1">
              <span className="text-slate-400">Device UUID:</span>
              <span className="font-mono font-medium text-slate-800">{device.device_id}</span>
            </div>
            <div className="flex justify-between py-1">
              <span className="text-slate-400">Asset Tag:</span>
              <span className="font-mono font-bold text-slate-900">{device.asset_id}</span>
            </div>
            <div className="flex justify-between py-1">
              <span className="text-slate-400">Hostname:</span>
              <span className="font-mono text-slate-800">{device.hostname}</span>
            </div>
            <div className="flex justify-between py-1">
              <span className="text-slate-400">Manufacturer:</span>
              <span className="font-medium text-slate-800">{device.manufacturer}</span>
            </div>
            <div className="flex justify-between py-1">
              <span className="text-slate-400">Model:</span>
              <span className="font-medium text-slate-800">{device.model}</span>
            </div>
            <div className="flex justify-between py-1">
              <span className="text-slate-400">Serial Number:</span>
              <span className="font-mono text-slate-800">{device.serial_number}</span>
            </div>
            <div className="flex justify-between py-1">
              <span className="text-slate-400">OS & Build:</span>
              <span className="font-medium text-slate-800">{device.os} ({device.os_version || 'Latest'})</span>
            </div>
            <div className="flex justify-between py-1">
              <span className="text-slate-400">Architecture:</span>
              <span className="font-mono text-slate-800">{device.architecture}</span>
            </div>
          </div>
        </div>

        {/* Network & Location */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm space-y-3">
          <div className="flex items-center gap-2 pb-2 border-b border-slate-100">
            <Wifi className="w-4 h-4 text-blue-600" />
            <h3 className="text-sm font-bold text-slate-900">Network & Connectivity</h3>
          </div>
          <div className="space-y-2 text-xs divide-y divide-slate-50">
            <div className="flex justify-between py-1">
              <span className="text-slate-400">Local IP:</span>
              <span className="font-mono font-medium text-slate-800">{device.local_ip || '127.0.0.1'}</span>
            </div>
            <div className="flex justify-between py-1">
              <span className="text-slate-400">Public IP:</span>
              <span className="font-mono font-medium text-slate-800">{device.public_ip || '198.51.100.42'}</span>
            </div>
            <div className="flex justify-between py-1">
              <span className="text-slate-400">MAC Address:</span>
              <span className="font-mono text-slate-800">{device.mac_address || '00:1A:2B:3C:4D:5E'}</span>
            </div>
            <div className="flex justify-between py-1">
              <span className="text-slate-400">Approx. Geolocation:</span>
              <span className="font-medium text-slate-800">
                {loc ? `${loc.city}, ${loc.region}, ${loc.country}` : 'New York, US'}
              </span>
            </div>
            <div className="flex justify-between py-1">
              <span className="text-slate-400">ISP Uplink:</span>
              <span className="font-medium text-slate-800 truncate max-w-[170px]">{loc?.isp || 'Corporate Uplink'}</span>
            </div>
            <div className="flex justify-between py-1">
              <span className="text-slate-400">First Registered:</span>
              <span className="text-slate-700">{formatAppDate(device.first_seen)}</span>
            </div>
            <div className="flex justify-between py-1">
              <span className="text-slate-400">Last Telemetry:</span>
              <span className="font-semibold text-emerald-600">{formatAppTime(device.last_seen, true)}</span>
            </div>
          </div>
        </div>

        {/* Corporate Assignment */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm space-y-3">
          <div className="flex items-center gap-2 pb-2 border-b border-slate-100">
            <User className="w-4 h-4 text-purple-600" />
            <h3 className="text-sm font-bold text-slate-900">Current Assignment</h3>
          </div>
          <div className="space-y-2 text-xs divide-y divide-slate-50">
            <div className="flex justify-between py-1">
              <span className="text-slate-400">Assigned Employee:</span>
              <span className="font-bold text-slate-900">{device.employee_name || 'Unassigned Stock Pool'}</span>
            </div>
            {device.employee_name && (
              <>
                <div className="flex justify-between py-1">
                  <span className="text-slate-400">Employee ID:</span>
                  <span className="font-mono text-slate-800">{device.employee_code}</span>
                </div>
                <div className="flex justify-between py-1">
                  <span className="text-slate-400">Department:</span>
                  <span className="font-medium text-slate-800">{device.department_name} ({device.department_code})</span>
                </div>
                <div className="flex justify-between py-1">
                  <span className="text-slate-400">Position:</span>
                  <span className="text-slate-700">{device.employee_position}</span>
                </div>
                <div className="flex justify-between py-1">
                  <span className="text-slate-400">Workstation Branch:</span>
                  <span className="text-slate-700">{device.branch}</span>
                </div>
              </>
            )}
            <div className="flex justify-between py-1">
              <span className="text-slate-400">Purchase Date:</span>
              <span className="text-slate-700">{device.purchase_date || 'N/A'}</span>
            </div>
            <div className="flex justify-between py-1">
              <span className="text-slate-400">Warranty Expiration:</span>
              <span className="text-slate-700">{device.warranty_expiry || 'N/A'}</span>
            </div>
            <div className="flex justify-between py-1">
              <span className="text-slate-400">Supplier:</span>
              <span className="text-slate-700">{device.supplier || 'Lenovo Enterprise'}</span>
            </div>
          </div>
        </div>
      </div>

      <DeviceWorkPanel work={work} softwareQuery={softwareQuery} setSoftwareQuery={setSoftwareQuery} />

      {/* ----------------- SECTION 4: RESPONSIBLE GEOLOCATION MAP ----------------- */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <MapPin className="w-4 h-4 text-emerald-600" />
            <div>
              <h3 className="text-sm font-bold text-slate-900">Approximate Network Location</h3>
              <p className="text-xs text-slate-500">
                Network-based IP geolocation for legitimate asset tracking. Strictly non-invasive, no continuous GPS tracking.
              </p>
            </div>
          </div>
          <span className="text-xs font-mono bg-slate-100 px-2 py-1 rounded text-slate-700">
            {loc?.latitude || '40.7128'}° N, {loc?.longitude || '-74.0060'}° W
          </span>
        </div>

        {/* Embedded OpenStreetMap Iframe for 100% reliable zero-dependency rendering */}
        <div className="h-72 mt-3 rounded-xl overflow-hidden border border-slate-200 relative bg-slate-100">
          <iframe
            title="Device Location Map"
            width="100%"
            height="100%"
            frameBorder="0"
            scrolling="no"
            marginHeight="0"
            marginWidth="0"
            src={`https://www.openstreetmap.org/export/embed.html?bbox=${(loc?.longitude || -74.0060) - 0.05}%2C${(loc?.latitude || 40.7128) - 0.05}%2C${(loc?.longitude || -74.0060) + 0.05}%2C${(loc?.latitude || 40.7128) + 0.05}&layer=mapnik&marker=${loc?.latitude || 40.7128}%2C${loc?.longitude || -74.0060}`}
          />
        </div>
      </div>

      {/* ----------------- SECTION 5: MAINTENANCE RECORDS & ALERTS ----------------- */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Maintenance History */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm space-y-3">
          <div className="flex items-center justify-between pb-2 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <Wrench className="w-4 h-4 text-amber-600" />
              <h3 className="text-sm font-bold text-slate-900">Maintenance Records</h3>
            </div>
            <button
              onClick={() => navigate('/maintenance')}
              className="text-xs font-semibold text-emerald-600 hover:text-emerald-700"
            >
              Open Ticket &rarr;
            </button>
          </div>

          <div className="space-y-2.5 text-xs">
            {(!device.maintenance || device.maintenance.length === 0) ? (
              <p className="text-slate-400 py-4 text-center">No maintenance incidents logged for this device.</p>
            ) : (
              device.maintenance.map((m) => (
                <div key={m.id} className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                  <div className="flex items-center justify-between">
                    <span className="font-mono font-bold text-slate-900">{m.ticket_id}</span>
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                      m.status === 'completed' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                    }`}>
                      {m.status.replace('_', ' ')}
                    </span>
                  </div>
                  <p className="text-slate-700 mt-1">{m.issue}</p>
                  <div className="flex items-center justify-between text-[11px] text-slate-400 mt-2">
                    <span>Tech: {m.technician || 'IT Helpdesk'}</span>
                    <span>{formatAppDate(m.reported_date)}</span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Device Alert Log */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm space-y-3">
          <div className="flex items-center justify-between pb-2 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-rose-600" />
              <h3 className="text-sm font-bold text-slate-900">Alerts & Incidents</h3>
            </div>
            <button
              onClick={() => navigate('/alerts')}
              className="text-xs font-semibold text-emerald-600 hover:text-emerald-700"
            >
              View Alerts &rarr;
            </button>
          </div>

          <div className="space-y-2.5 text-xs">
            {(!device.alerts || device.alerts.length === 0) ? (
              <p className="text-slate-400 py-4 text-center">All telemetry health checks nominal. No alerts active.</p>
            ) : (
              device.alerts.map((a) => (
                <div key={a.id} className="p-3 bg-rose-50/50 rounded-xl border border-rose-100">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-rose-900">{a.title}</span>
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                      a.severity === 'critical' ? 'bg-rose-200 text-rose-900' : 'bg-amber-200 text-amber-900'
                    }`}>
                      {a.severity}
                    </span>
                  </div>
                  <p className="text-slate-700 mt-1">{a.message}</p>
                  <span className="block text-[10px] text-slate-400 mt-2">
                    {formatAppDateTime(a.created_at)}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function formatWorkDuration(seconds) {
  const total = Math.max(0, Number(seconds) || 0);
  const hours = Math.floor(total / 3600);
  const minutes = Math.floor((total % 3600) / 60);
  if (hours > 0) return `${hours}h ${minutes}m`;
  if (minutes > 0) return `${minutes}m`;
  return 'under 1m';
}

function DeviceWorkPanel({ work, softwareQuery, setSoftwareQuery }) {
  const openApps = work?.open_apps?.length
    ? work.open_apps
    : (work?.software || []).filter(item => Number(item.is_running) === 1);
  const software = (work?.software || []).filter(item => {
    const q = softwareQuery.trim().toLowerCase();
    if (!q) return true;
    return `${item.name} ${item.publisher || ''}`.toLowerCase().includes(q);
  });
  const usage = work?.usage_today || [];
  const activities = work?.activities || [];
  const current = work?.current;

  return (
    <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3 pb-3 border-b border-slate-100">
        <div>
          <h3 className="text-sm font-bold text-slate-900">Live software and work activity</h3>
          <p className="text-xs text-slate-500 mt-0.5">
            What the laptop owner is using now, open programs, installed software, and the activity timeline.
          </p>
        </div>
        <input
          value={softwareQuery}
          onChange={(e) => setSoftwareQuery(e.target.value)}
          placeholder="Search installed software"
          className="px-3 py-2 text-xs border border-slate-200 rounded-lg w-full sm:w-56 focus:outline-none focus:ring-2 focus:ring-emerald-500/30"
        />
      </div>

      <div className="rounded-xl border border-emerald-200 bg-emerald-50/70 p-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <div className="text-[11px] font-bold uppercase tracking-wide text-emerald-700">Currently using</div>
            <div className="text-base font-black text-slate-900 mt-0.5">
              {current?.app_name || work?.device?.current_app || 'No active application'}
            </div>
            <div className="text-xs text-slate-500 mt-1">
              User: {current?.windows_user || work?.device?.windows_user || '—'}
              {work?.device?.session_state ? ` · Session: ${work.device.session_state}` : ''}
            </div>
          </div>
          <span className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-white border border-emerald-200 text-emerald-700">
            {openApps.length} open now
          </span>
        </div>
        {openApps.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-1.5">
            {openApps.map((app) => (
              <span
                key={app.name || app}
                className="px-2 py-1 rounded-lg bg-white border border-emerald-100 text-[11px] font-semibold text-slate-800"
              >
                {app.name || app}
              </span>
            ))}
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <div className="lg:col-span-1">
          <h4 className="text-xs font-bold uppercase tracking-wide text-slate-500 mb-2">Today</h4>
          {usage.length === 0 ? (
            <p className="text-xs text-slate-400">No application time recorded today.</p>
          ) : (
            <div className="space-y-2">
              {usage.map(item => (
                <div key={item.app_name} className="flex items-center justify-between text-xs bg-slate-50 rounded-lg px-3 py-2">
                  <span className="font-semibold text-slate-800">{item.app_name}</span>
                  <span className="text-slate-500">{formatWorkDuration(item.duration_seconds)}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="lg:col-span-2">
          <h4 className="text-xs font-bold uppercase tracking-wide text-slate-500 mb-2">
            Installed / open software ({software.length})
          </h4>
          <div className="max-h-64 overflow-y-auto border border-slate-100 rounded-xl">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-[11px] uppercase tracking-wide text-slate-400 sticky top-0">
                <tr>
                  <th className="py-2 px-3">Application</th>
                  <th className="py-2 px-3">Version</th>
                  <th className="py-2 px-3">Publisher</th>
                  <th className="py-2 px-3">State</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {software.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="py-6 text-center text-slate-400">No software inventory yet. Start the laptop agent for a full list.</td>
                  </tr>
                ) : software.map(item => (
                  <tr key={item.name} className={Number(item.is_running) === 1 ? 'bg-emerald-50/40' : ''}>
                    <td className="py-2 px-3 font-semibold text-slate-800">{item.name}</td>
                    <td className="py-2 px-3 text-slate-500">{item.version || '—'}</td>
                    <td className="py-2 px-3 text-slate-500">{item.publisher || '—'}</td>
                    <td className="py-2 px-3">
                      {Number(item.is_running) === 1 ? (
                        <span className="text-emerald-700 font-semibold">Open now</span>
                      ) : (
                        <span className="text-slate-400">Installed</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <div>
        <h4 className="text-xs font-bold uppercase tracking-wide text-slate-500 mb-2">Recent activity</h4>
        {activities.length === 0 ? (
          <p className="text-xs text-slate-400">No activity recorded for this laptop.</p>
        ) : (
          <div className="space-y-2">
            {activities.slice(0, 12).map((event, index) => (
              <div key={`${event.occurred_at}-${index}`} className="flex items-start justify-between gap-3 text-xs">
                <p className="text-slate-700">{event.summary}</p>
                <span className="text-slate-400 shrink-0">
                  {event.occurred_at ? formatAppDateTime(event.occurred_at, { year: false }) : ''}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
