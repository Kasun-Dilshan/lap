import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import { formatAppDateTime } from '../utils/datetime';
import {
  ScrollText,
  Search,
  Filter,
  User,
  Shield,
  Clock,
  Terminal,
  Activity
} from 'lucide-react';

export default function AuditLogs() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [actionFilter, setActionFilter] = useState('all');

  const fetchLogs = async () => {
    try {
      const res = await api.get('/audit-logs', {
        search,
        action: actionFilter !== 'all' ? actionFilter : '',
        limit: 100
      });
      if (res.success) setLogs(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, [search, actionFilter]);

  const getActionColor = (action) => {
    if (action.includes('DELETED') || action.includes('DEACTIVATED')) return 'bg-rose-100 text-rose-800';
    if (action.includes('CREATED') || action.includes('ENROLLED')) return 'bg-emerald-100 text-emerald-800';
    if (action.includes('ASSIGNED')) return 'bg-blue-100 text-blue-800';
    if (action.includes('MAINTENANCE')) return 'bg-amber-100 text-amber-800';
    return 'bg-slate-100 text-slate-800';
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">Security & Administrative Audit Trail</h1>
        <p className="text-sm text-slate-500 mt-1">
          Immutable log of administrative operations, device allocations, authentications, and maintenance triggers.
        </p>
      </div>

      {/* Filter and Search */}
      <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-sm flex flex-col sm:flex-row items-center gap-3">
        <div className="relative flex-1 w-full">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search administrator email, action code, asset ID, or details..."
            className="w-full pl-9 pr-4 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
          />
        </div>
        <div className="w-full sm:w-56">
          <select
            value={actionFilter}
            onChange={(e) => setActionFilter(e.target.value)}
            className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-700 focus:outline-none focus:border-emerald-500"
          >
            <option value="all">All Audit Actions</option>
            <option value="USER_LOGIN">User Logins</option>
            <option value="DEVICE_CREATED">Device Created</option>
            <option value="DEVICE_ASSIGNED">Device Assigned</option>
            <option value="DEVICE_ENROLLED">Device Enrolled</option>
            <option value="MAINTENANCE_CREATED">Maintenance Logged</option>
            <option value="SETTINGS_UPDATED">Settings Modified</option>
          </select>
        </div>
      </div>

      {/* Logs Table */}
      <div className="bg-white rounded-xl border border-slate-200/80 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-600">
            <thead className="bg-slate-50 text-[11px] font-semibold uppercase tracking-wider text-slate-400 border-b border-slate-200">
              <tr>
                <th className="py-3 px-4">Timestamp</th>
                <th className="py-3 px-4">Operator / Email</th>
                <th className="py-3 px-4">Action</th>
                <th className="py-3 px-4">Entity Type</th>
                <th className="py-3 px-4">Target Entity</th>
                <th className="py-3 px-4">IP Address</th>
                <th className="py-3 px-4">Audit Details</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium font-mono text-[11px]">
              {logs.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-slate-400 font-sans">
                    No audit records matching query.
                  </td>
                </tr>
              ) : (
                logs.map((log) => (
                  <tr key={log.id} className="hover:bg-slate-50/70 font-sans">
                    <td className="py-3 px-4 text-slate-400 whitespace-nowrap font-mono text-[11px]">
                      {formatAppDateTime(log.created_at)}
                    </td>
                    <td className="py-3 px-4 font-semibold text-slate-900">
                      {log.user_email || 'System / Agent'}
                    </td>
                    <td className="py-3 px-4">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold ${getActionColor(log.action)}`}>
                        {log.action}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-slate-600 font-mono text-[11px]">
                      {log.entity_type}
                    </td>
                    <td className="py-3 px-4 font-bold text-slate-900 font-mono">
                      {log.entity_id || 'N/A'}
                    </td>
                    <td className="py-3 px-4 text-slate-500 font-mono text-[11px]">
                      {log.ip_address}
                    </td>
                    <td className="py-3 px-4 text-slate-600 max-w-sm truncate text-xs" title={log.details}>
                      {log.details || '—'}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
