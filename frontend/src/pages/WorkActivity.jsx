import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../services/api';
import { formatAppDateTime } from '../utils/datetime';
import {
  Activity,
  AppWindow,
  Clock,
  Laptop,
  Package,
  RefreshCw,
  Search,
  User
} from 'lucide-react';

const EVENT_LABELS = {
  session_start: 'Signed in',
  session_end: 'Signed out',
  screen_lock: 'Locked screen',
  screen_unlock: 'Unlocked screen',
  app_focus: 'Started app',
  app_close: 'Closed app',
  software_installed: 'Installed',
  software_removed: 'Removed',
  inventory_sync: 'Inventory'
};

function formatDuration(seconds) {
  const total = Math.max(0, Number(seconds) || 0);
  const hours = Math.floor(total / 3600);
  const minutes = Math.floor((total % 3600) / 60);
  if (hours > 0) return `${hours}h ${minutes}m`;
  if (minutes > 0) return `${minutes}m`;
  return 'under 1m';
}

function formatWhen(value) {
  if (!value) return '';
  return formatAppDateTime(value, { year: false }) || String(value);
}

export default function WorkActivity() {
  const navigate = useNavigate();
  const [summary, setSummary] = useState(null);
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [eventType, setEventType] = useState('all');

  const load = async () => {
    try {
      const [summaryRes, eventsRes] = await Promise.all([
        api.get('/activity/summary'),
        api.get('/activity', {
          limit: 80,
          search,
          event_type: eventType !== 'all' ? eventType : ''
        })
      ]);
      if (summaryRes.success) setSummary(summaryRes.data);
      if (eventsRes.success) setEvents(eventsRes.data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    const timer = setInterval(load, 20000);
    return () => clearInterval(timer);
  }, [search, eventType]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="flex flex-col items-center gap-3">
          <RefreshCw className="w-8 h-8 text-emerald-500 animate-spin" />
          <p className="text-sm font-medium text-slate-500">Loading work activity...</p>
        </div>
      </div>
    );
  }

  const live = summary?.live || [];
  const top = summary?.top_software || [];
  const maxSeconds = Math.max(1, ...top.map(item => Number(item.duration_seconds) || 0));

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">Work Activity</h1>
        <p className="text-sm text-slate-500 mt-1 max-w-3xl">
          See which programs are installed on each company laptop, which one the employee is using, and a timeline of sign-in, lock, and application switches.
          This records application names and time only.
        </p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
        <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-sm">
          <div className="flex items-center justify-between text-[11px] font-semibold tracking-wider text-emerald-700 uppercase">
            Working now
            <Activity className="w-4 h-4" />
          </div>
          <div className="mt-3 text-2xl font-black text-slate-900">{summary?.active_sessions || 0}</div>
          <p className="text-[11px] text-slate-400 mt-0.5">Laptops with an open application</p>
        </div>
        <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-sm">
          <div className="flex items-center justify-between text-[11px] font-semibold tracking-wider text-slate-500 uppercase">
            Software titles
            <Package className="w-4 h-4" />
          </div>
          <div className="mt-3 text-2xl font-black text-slate-900">{summary?.software_titles || 0}</div>
          <p className="text-[11px] text-slate-400 mt-0.5">Installed applications in inventory</p>
        </div>
        <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-sm">
          <div className="flex items-center justify-between text-[11px] font-semibold tracking-wider text-slate-500 uppercase">
            Events today
            <Clock className="w-4 h-4" />
          </div>
          <div className="mt-3 text-2xl font-black text-slate-900">{summary?.events_today || 0}</div>
          <p className="text-[11px] text-slate-400 mt-0.5">Sign-ins, locks, and app changes</p>
        </div>
        <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-sm">
          <div className="flex items-center justify-between text-[11px] font-semibold tracking-wider text-slate-500 uppercase">
            Time in apps
            <AppWindow className="w-4 h-4" />
          </div>
          <div className="mt-3 text-2xl font-black text-slate-900">{formatDuration(summary?.seconds_today || 0)}</div>
          <p className="text-[11px] text-slate-400 mt-0.5">Tracked application time today</p>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-5 gap-6">
        <div className="xl:col-span-3 bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
            <div>
              <h2 className="text-sm font-bold text-slate-900">In use right now</h2>
              <p className="text-xs text-slate-500">Foreground application on each online laptop</p>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-600">
              <thead className="bg-slate-50 text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                <tr>
                  <th className="py-3 px-4">Employee</th>
                  <th className="py-3 px-4">Laptop</th>
                  <th className="py-3 px-4">Application</th>
                  <th className="py-3 px-4">Duration</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {live.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="py-8 text-center text-slate-400">
                      No application is currently in use. Activity appears after the laptop agent reports in.
                    </td>
                  </tr>
                ) : live.map(row => (
                  <tr key={row.id} className="hover:bg-slate-50/80">
                    <td className="py-3 px-4">
                      <div className="font-semibold text-slate-900 flex items-center gap-1.5">
                        <User className="w-3.5 h-3.5 text-slate-400" />
                        {row.employee_name || row.windows_user || 'Unassigned'}
                      </div>
                      <div className="text-[11px] text-slate-400">{row.department_name || row.windows_user}</div>
                    </td>
                    <td className="py-3 px-4">
                      <button
                        onClick={() => navigate(`/devices/${row.device_id}`)}
                        className="font-mono font-bold text-slate-900 hover:text-emerald-600"
                      >
                        {row.asset_id}
                      </button>
                      <div className="text-[11px] text-slate-400">{row.device_name}</div>
                    </td>
                    <td className="py-3 px-4">
                      <span className="inline-flex items-center gap-1.5 px-2 py-1 rounded-lg bg-emerald-50 text-emerald-800 font-semibold">
                        <AppWindow className="w-3.5 h-3.5" />
                        {row.app_name}
                      </span>
                    </td>
                    <td className="py-3 px-4 font-semibold text-slate-800">{formatDuration(row.duration_seconds)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="xl:col-span-2 bg-white rounded-2xl border border-slate-200/80 shadow-sm p-5">
          <h2 className="text-sm font-bold text-slate-900">Most used software today</h2>
          <p className="text-xs text-slate-500 mt-0.5 mb-4">Time spent in each application across the fleet</p>
          <div className="space-y-3">
            {top.length === 0 ? (
              <p className="text-xs text-slate-400 py-6 text-center">No usage recorded yet today.</p>
            ) : top.map(item => (
              <div key={item.app_name}>
                <div className="flex items-center justify-between text-xs mb-1">
                  <span className="font-semibold text-slate-800">{item.app_name}</span>
                  <span className="text-slate-500">{formatDuration(item.duration_seconds)}</span>
                </div>
                <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-emerald-500 rounded-full"
                    style={{ width: `${Math.max(6, (Number(item.duration_seconds) / maxSeconds) * 100)}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-100 flex flex-col md:flex-row md:items-center gap-3 md:justify-between">
          <div>
            <h2 className="text-sm font-bold text-slate-900">Activity timeline</h2>
            <p className="text-xs text-slate-500">Every recorded workstation event</p>
          </div>
          <div className="flex flex-col sm:flex-row gap-2">
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search employee, laptop, or app"
                className="pl-8 pr-3 py-2 text-xs border border-slate-200 rounded-lg w-full sm:w-64 focus:outline-none focus:ring-2 focus:ring-emerald-500/30"
              />
            </div>
            <select
              value={eventType}
              onChange={(e) => setEventType(e.target.value)}
              className="px-3 py-2 text-xs border border-slate-200 rounded-lg bg-white"
            >
              <option value="all">All events</option>
              {Object.entries(EVENT_LABELS).map(([value, label]) => (
                <option key={value} value={value}>{label}</option>
              ))}
            </select>
          </div>
        </div>
        <div className="divide-y divide-slate-100">
          {events.length === 0 ? (
            <p className="text-xs text-slate-400 py-8 text-center">No activity matches this filter.</p>
          ) : events.map(event => (
            <div key={event.id} className="px-5 py-3 flex flex-col sm:flex-row sm:items-center gap-2 sm:justify-between">
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-bold uppercase tracking-wide px-2 py-0.5 rounded bg-slate-100 text-slate-600">
                    {EVENT_LABELS[event.event_type] || event.event_type}
                  </span>
                  <button
                    onClick={() => navigate(`/devices/${event.device_id}`)}
                    className="inline-flex items-center gap-1 text-[11px] font-mono font-bold text-slate-500 hover:text-emerald-600"
                  >
                    <Laptop className="w-3 h-3" />
                    {event.asset_id}
                  </button>
                </div>
                <p className="text-sm text-slate-800 mt-1">{event.summary}</p>
                <p className="text-[11px] text-slate-400">{event.employee_name || event.windows_user || 'Unassigned laptop'}</p>
              </div>
              <span className="text-[11px] text-slate-400 shrink-0">{formatWhen(event.occurred_at)}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
