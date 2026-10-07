import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../services/api';
import { formatAppTime } from '../utils/datetime';
import {
  Laptop,
  CheckCircle,
  XCircle,
  Wrench,
  Clock,
  UserCheck,
  UserX,
  AlertTriangle,
  ArrowUpRight,
  RefreshCw,
  PlusCircle,
  KeyRound,
  ShieldAlert,
  BatteryMedium,
  HardDrive
} from 'lucide-react';
import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Legend
} from 'recharts';

export default function Dashboard() {
  const navigate = useNavigate();
  const [stats, setStats] = useState(null);
  const [recentDevices, setRecentDevices] = useState([]);
  const [activeAlerts, setActiveAlerts] = useState([]);
  const [liveWork, setLiveWork] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchData = async () => {
    try {
      const [statsRes, devRes, alertsRes, workRes] = await Promise.all([
        api.get('/devices/stats'),
        api.get('/devices', { limit: 6, sort_by: 'last_seen', order: 'DESC' }),
        api.get('/alerts', { status: 'active' }),
        api.get('/activity/summary')
      ]);

      if (statsRes.success) setStats(statsRes.data);
      if (devRes.success) setRecentDevices(Array.isArray(devRes.data) ? devRes.data : []);
      if (alertsRes.success) setActiveAlerts(Array.isArray(alertsRes.data) ? alertsRes.data.slice(0, 3) : []);
      if (workRes.success) setLiveWork(Array.isArray(workRes.data?.live) ? workRes.data.live : []);
    } catch (err) {
      console.error('Failed to load dashboard:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchData();
    const timer = setInterval(fetchData, 20000); // 20s live sync
    return () => clearInterval(timer);
  }, []);

  const handleRefresh = () => {
    setRefreshing(true);
    fetchData();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="flex flex-col items-center gap-3">
          <RefreshCw className="w-8 h-8 text-emerald-500 animate-spin" />
          <p className="text-sm font-medium text-slate-500">Loading Fleet Telemetry...</p>
        </div>
      </div>
    );
  }

  // Chart data formatting
  const statusPieData = [
    { name: 'Online', value: stats?.online || 0, color: '#10b981' },
    { name: 'Offline', value: stats?.offline || 0, color: '#94a3b8' },
    { name: 'Maintenance', value: stats?.maintenance || 0, color: '#f59e0b' }
  ];

  const osData = (stats?.os_distribution || []).map(item => {
    const name = item?.os || 'Unknown';
    return {
      name,
      count: Number(item?.count) || 0,
      color: String(name).toLowerCase().includes('mac') ? '#6366f1' : '#0284c7'
    };
  });

  const deptData = (stats?.departments || []).map(d => ({
    name: d.code || d.name,
    fullName: d.name,
    devices: d.device_count
  }));

  const maintData = (stats?.maintenance_distribution || []).map(m => {
    const status = m?.status || 'unknown';
    return {
      status: String(status).replace('_', ' ').toUpperCase(),
      count: Number(m?.count) || 0,
      fill: status === 'open' ? '#ef4444' : status === 'in_progress' ? '#f59e0b' : '#10b981'
    };
  });

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">IT Fleet Monitoring Dashboard</h1>
          <p className="text-sm text-slate-500 mt-1">
            Real-time status, telemetry, and asset allocation across all company-owned workstations.
          </p>
        </div>
        <div className="flex items-center gap-2.5">
          <button
            onClick={handleRefresh}
            disabled={refreshing}
            className="inline-flex items-center gap-2 px-3.5 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-200 rounded-lg shadow-sm hover:bg-slate-50 transition"
          >
            <RefreshCw className={`w-3.5 h-3.5 text-slate-500 ${refreshing ? 'animate-spin' : ''}`} />
            Refresh
          </button>
          <button
            onClick={() => navigate('/devices?enroll=true')}
            className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold text-white bg-emerald-600 rounded-lg shadow-sm shadow-emerald-600/20 hover:bg-emerald-700 transition"
          >
            <KeyRound className="w-3.5 h-3.5" />
            Enroll Device
          </button>
        </div>
      </div>

      {/* Critical Alerts Banner (if any) */}
      {activeAlerts.length > 0 && (
        <div className="bg-amber-50 border border-amber-200/80 rounded-xl p-4 flex flex-col md:flex-row items-start md:items-center justify-between gap-3">
          <div className="flex items-start gap-3">
            <div className="p-2 bg-amber-100 rounded-lg text-amber-700 shrink-0">
              <ShieldAlert className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-xs font-bold text-amber-900 uppercase tracking-wide">
                Active Fleet Attention Needed ({activeAlerts.length})
              </h4>
              <p className="text-xs text-amber-800 mt-0.5">
                {activeAlerts[0]?.title}: {activeAlerts[0]?.message}
              </p>
            </div>
          </div>
          <button
            onClick={() => navigate('/alerts')}
            className="text-xs font-semibold text-amber-900 hover:text-amber-950 underline shrink-0"
          >
            Review All Alerts &rarr;
          </button>
        </div>
      )}

      {liveWork.length > 0 && (
        <div className="bg-white border border-slate-200/80 rounded-xl p-4">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-bold text-slate-900">Working now</h2>
            <button
              onClick={() => navigate('/activity')}
              className="text-xs font-semibold text-emerald-700 hover:text-emerald-800"
            >
              Open work activity
            </button>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2">
            {liveWork.slice(0, 4).map(row => (
              <button
                key={row.id}
                onClick={() => navigate(`/devices/${row.device_id}`)}
                className="text-left px-3 py-2 rounded-lg bg-slate-50 hover:bg-emerald-50 border border-slate-100"
              >
                <div className="text-xs font-semibold text-slate-900">{row.employee_name || row.windows_user || row.asset_id}</div>
                <div className="text-[11px] text-emerald-700 mt-0.5">{row.app_name}</div>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* ----------------- METRIC CARDS ----------------- */}
      <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3.5">
        {/* Total Laptops */}
        <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-sm hover:border-slate-300 transition">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold tracking-wider text-slate-500 uppercase">Total Devices</span>
            <div className="p-1.5 rounded-lg bg-slate-100 text-slate-700">
              <Laptop className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <span className="text-2xl font-black text-slate-900">{stats?.total || 0}</span>
            <span className="block text-[11px] text-slate-400 mt-0.5">Fleet Inventory</span>
          </div>
        </div>

        {/* Online Devices */}
        <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-sm hover:border-emerald-300 transition relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold tracking-wider text-emerald-700 uppercase">Online</span>
            <div className="p-1.5 rounded-lg bg-emerald-50 text-emerald-600">
              <CheckCircle className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl font-black text-emerald-600">{stats?.online || 0}</span>
            <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              Live Heartbeat
            </span>
          </div>
        </div>

        {/* Offline Devices */}
        <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-sm hover:border-slate-300 transition">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold tracking-wider text-slate-500 uppercase">Offline</span>
            <div className="p-1.5 rounded-lg bg-slate-100 text-slate-500">
              <XCircle className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <span className="text-2xl font-black text-slate-700">{stats?.offline || 0}</span>
            <span className="block text-[11px] text-slate-400 mt-0.5">&gt; 5m Threshold</span>
          </div>
        </div>

        {/* Recently Seen */}
        <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-sm hover:border-slate-300 transition">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold tracking-wider text-slate-500 uppercase">Recent (24h)</span>
            <div className="p-1.5 rounded-lg bg-blue-50 text-blue-600">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <span className="text-2xl font-black text-slate-900">{stats?.recently_seen || 0}</span>
            <span className="block text-[11px] text-slate-400 mt-0.5">Active Today</span>
          </div>
        </div>

        {/* Maintenance */}
        <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-sm hover:border-amber-300 transition">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold tracking-wider text-amber-700 uppercase">Maintenance</span>
            <div className="p-1.5 rounded-lg bg-amber-50 text-amber-600">
              <Wrench className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <span className="text-2xl font-black text-amber-600">{stats?.maintenance || 0}</span>
            <span className="block text-[11px] text-slate-400 mt-0.5">Diagnostic / Repair</span>
          </div>
        </div>

        {/* Assigned */}
        <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-sm hover:border-slate-300 transition">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold tracking-wider text-slate-500 uppercase">Assigned</span>
            <div className="p-1.5 rounded-lg bg-purple-50 text-purple-600">
              <UserCheck className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <span className="text-2xl font-black text-slate-900">{stats?.assigned || 0}</span>
            <span className="block text-[11px] text-slate-400 mt-0.5">Employee In-Use</span>
          </div>
        </div>

        {/* Unassigned Pool */}
        <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-sm hover:border-slate-300 transition">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold tracking-wider text-slate-500 uppercase">Unassigned</span>
            <div className="p-1.5 rounded-lg bg-cyan-50 text-cyan-600">
              <UserX className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <span className="text-2xl font-black text-slate-900">{stats?.unassigned || 0}</span>
            <span className="block text-[11px] text-slate-400 mt-0.5">Available Stock</span>
          </div>
        </div>
      </div>

      {/* ----------------- CHARTS ROW 1 ----------------- */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Chart 1: Status Donut */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm flex flex-col">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div>
              <h3 className="text-sm font-bold text-slate-900">Device Status</h3>
              <p className="text-xs text-slate-500">Fleet online vs offline ratio</p>
            </div>
            <span className="text-xs font-mono font-semibold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded">
              {stats?.total ? Math.round(((stats.online || 0) / stats.total) * 100) : 0}% Online
            </span>
          </div>

          <div className="h-64 mt-2">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={statusPieData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={85}
                  paddingAngle={4}
                  dataKey="value"
                >
                  {statusPieData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip
                  formatter={(val, name) => [`${val} laptops`, name]}
                  contentStyle={{ backgroundColor: '#0f172a', borderRadius: '8px', color: '#fff', fontSize: '12px' }}
                />
                <Legend iconType="circle" wrapperStyle={{ fontSize: '12px', paddingTop: '10px' }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Chart 2: Devices by Department */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm flex flex-col lg:col-span-2">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div>
              <h3 className="text-sm font-bold text-slate-900">Laptops by Department</h3>
              <p className="text-xs text-slate-500">Asset distribution across organizational units</p>
            </div>
            <button
              onClick={() => navigate('/departments')}
              className="text-xs font-semibold text-emerald-600 hover:text-emerald-700 flex items-center gap-1"
            >
              Departments <ArrowUpRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="h-64 mt-2">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={deptData} margin={{ top: 15, right: 15, left: -15, bottom: 0 }}>
                <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} tickLine={false} allowDecimals={false} />
                <Tooltip
                  formatter={(val, name, item) => [`${val} laptops`, item.payload.fullName]}
                  contentStyle={{ backgroundColor: '#0f172a', borderRadius: '8px', color: '#fff', fontSize: '12px' }}
                />
                <Bar dataKey="devices" fill="#10b981" radius={[4, 4, 0, 0]} barSize={28} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* ----------------- CHARTS ROW 2 ----------------- */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Chart 3: Operating System */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm flex flex-col">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div>
              <h3 className="text-sm font-bold text-slate-900">Operating System Distribution</h3>
              <p className="text-xs text-slate-500">Fleet OS environment (Windows vs macOS)</p>
            </div>
          </div>

          <div className="h-60 mt-3 flex items-center">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart layout="vertical" data={osData} margin={{ top: 10, right: 30, left: 30, bottom: 10 }}>
                <XAxis type="number" tick={{ fontSize: 11 }} axisLine={false} tickLine={false} allowDecimals={false} />
                <YAxis type="category" dataKey="name" tick={{ fontSize: 12, fontWeight: 600 }} axisLine={false} tickLine={false} />
                <Tooltip
                  formatter={(val) => [`${val} devices`, 'Count']}
                  contentStyle={{ backgroundColor: '#0f172a', borderRadius: '8px', color: '#fff', fontSize: '12px' }}
                />
                <Bar dataKey="count" radius={[0, 6, 6, 0]} barSize={24}>
                  {osData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Chart 4: Maintenance Status */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm flex flex-col">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div>
              <h3 className="text-sm font-bold text-slate-900">Maintenance Tickets Breakdown</h3>
              <p className="text-xs text-slate-500">Open diagnostics, in repair, and resolved</p>
            </div>
            <button
              onClick={() => navigate('/maintenance')}
              className="text-xs font-semibold text-emerald-600 hover:text-emerald-700 flex items-center gap-1"
            >
              All Tickets <ArrowUpRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="h-60 mt-3">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={maintData} margin={{ top: 15, right: 20, left: -15, bottom: 0 }}>
                <XAxis dataKey="status" tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} tickLine={false} allowDecimals={false} />
                <Tooltip
                  formatter={(val) => [`${val} tickets`, 'Count']}
                  contentStyle={{ backgroundColor: '#0f172a', borderRadius: '8px', color: '#fff', fontSize: '12px' }}
                />
                <Bar dataKey="count" radius={[6, 6, 0, 0]} barSize={34}>
                  {maintData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.fill} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* ----------------- RECENT DEVICES TABLE ----------------- */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
        <div className="p-5 border-b border-slate-100 flex items-center justify-between">
          <div>
            <h3 className="text-sm font-bold text-slate-900">Recently Active Laptops</h3>
            <p className="text-xs text-slate-500">Workstations with live telemetry feeds</p>
          </div>
          <button
            onClick={() => navigate('/devices')}
            className="text-xs font-semibold text-emerald-600 hover:text-emerald-700 flex items-center gap-1"
          >
            View All Devices ({stats?.total || 0}) <ArrowUpRight className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-600">
            <thead className="bg-slate-50 text-[11px] font-semibold uppercase tracking-wider text-slate-400 border-b border-slate-200/60">
              <tr>
                <th className="py-3 px-4">Asset ID</th>
                <th className="py-3 px-4">Laptop Name & Model</th>
                <th className="py-3 px-4">Assigned To</th>
                <th className="py-3 px-4">OS</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4">Battery</th>
                <th className="py-3 px-4">Disk Usage</th>
                <th className="py-3 px-4">Last Seen</th>
                <th className="py-3 px-4 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium">
              {recentDevices.map((dev) => (
                <tr
                  key={dev.id}
                  onClick={() => navigate(`/devices/${dev.id}`)}
                  className="hover:bg-slate-50/80 cursor-pointer transition"
                >
                  <td className="py-3 px-4 font-mono font-bold text-slate-900">
                    {dev.asset_id}
                  </td>
                  <td className="py-3 px-4">
                    <div className="font-semibold text-slate-900">{dev.name}</div>
                    <div className="text-[11px] text-slate-400">{dev.model}</div>
                  </td>
                  <td className="py-3 px-4">
                    {dev.employee_name ? (
                      <div>
                        <div className="text-slate-900 font-semibold">{dev.employee_name}</div>
                        <div className="text-[11px] text-slate-400">{dev.department_name}</div>
                      </div>
                    ) : (
                      <span className="text-slate-400 italic">Unassigned pool</span>
                    )}
                  </td>
                  <td className="py-3 px-4">
                    <span className="px-2 py-0.5 rounded bg-slate-100 font-mono text-[11px] text-slate-700">
                      {dev.os}
                    </span>
                  </td>
                  <td className="py-3 px-4">
                    <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold ${
                      dev.status === 'online'
                        ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                        : dev.status === 'maintenance'
                        ? 'bg-amber-50 text-amber-700 border border-amber-200'
                        : 'bg-slate-100 text-slate-600 border border-slate-200'
                    }`}>
                      <span className={`w-1.5 h-1.5 rounded-full ${
                        dev.status === 'online' ? 'bg-emerald-500 animate-pulse' : dev.status === 'maintenance' ? 'bg-amber-500' : 'bg-slate-400'
                      }`} />
                      {String(dev.status || 'unknown').toUpperCase()}
                    </span>
                  </td>
                  <td className="py-3 px-4">
                    <div className="flex items-center gap-1.5">
                      <BatteryMedium className={`w-3.5 h-3.5 ${dev.battery_percent <= 20 ? 'text-rose-500' : 'text-slate-500'}`} />
                      <span>{dev.battery_percent}%</span>
                    </div>
                  </td>
                  <td className="py-3 px-4">
                    <div className="flex items-center gap-1.5">
                      <div className="w-16 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full ${dev.disk_usage > 90 ? 'bg-rose-500' : 'bg-emerald-500'}`}
                          style={{ width: `${Math.min(100, dev.disk_usage)}%` }}
                        />
                      </div>
                      <span className="font-mono text-[11px]">{dev.disk_usage}%</span>
                    </div>
                  </td>
                  <td className="py-3 px-4 text-slate-500">
                    {formatAppTime(dev.last_seen, true)}
                  </td>
                  <td className="py-3 px-4 text-right">
                    <span className="text-emerald-600 font-semibold hover:underline">View &rarr;</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
