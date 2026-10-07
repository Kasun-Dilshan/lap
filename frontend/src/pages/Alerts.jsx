import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../services/api';
import { formatAppDateTime } from '../utils/datetime';
import { useAuth } from '../context/AuthContext';
import {
  AlertTriangle,
  ShieldAlert,
  CheckCircle,
  XCircle,
  Clock,
  Laptop,
  Check,
  RefreshCw,
  Search,
  Filter
} from 'lucide-react';

export default function Alerts() {
  const navigate = useNavigate();
  const { hasRole } = useAuth();

  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('active');
  const [severityFilter, setSeverityFilter] = useState('all');
  const [scanning, setScanning] = useState(false);

  const fetchAlerts = async () => {
    try {
      const res = await api.get('/alerts', {
        status: statusFilter !== 'all' ? statusFilter : '',
        severity: severityFilter !== 'all' ? severityFilter : ''
      });
      if (res.success) setAlerts(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAlerts();
    const interval = setInterval(fetchAlerts, 20000);
    return () => clearInterval(interval);
  }, [statusFilter, severityFilter]);

  const handleAcknowledge = async (alertId) => {
    try {
      await api.put(`/alerts/${alertId}/acknowledge`);
      fetchAlerts();
    } catch (err) {
      alert(err.message);
    }
  };

  const handleResolve = async (alertId) => {
    try {
      await api.put(`/alerts/${alertId}/resolve`);
      fetchAlerts();
    } catch (err) {
      alert(err.message);
    }
  };

  const handleScanFleet = async () => {
    setScanning(true);
    try {
      const res = await api.post('/alerts/check');
      alert(`Fleet scan completed. Identified ${res.overdue_marked_offline || 0} overdue offline devices.`);
      fetchAlerts();
    } catch (err) {
      alert(err.message);
    } finally {
      setScanning(false);
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Fleet Anomaly & Hardware Alerts</h1>
          <p className="text-sm text-slate-500 mt-1">
            Automated alerts for offline timeouts, storage capacity limits, degraded batteries, and warranties.
          </p>
        </div>
        {hasRole(['super_admin', 'it_admin']) && (
          <button
            onClick={handleScanFleet}
            disabled={scanning}
            className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold text-white bg-slate-900 rounded-lg shadow-sm hover:bg-slate-800 transition"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${scanning ? 'animate-spin' : ''}`} />
            Run Fleet Health Audit
          </button>
        )}
      </div>

      {/* Filter Tabs */}
      <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-2">
          <span className="font-semibold text-slate-500 uppercase text-[10px] tracking-wider">Status:</span>
          {['active', 'acknowledged', 'resolved', 'all'].map((st) => (
            <button
              key={st}
              onClick={() => setStatusFilter(st)}
              className={`px-3 py-1.5 rounded-lg capitalize font-medium transition ${
                statusFilter === st
                  ? 'bg-slate-900 text-white shadow-sm'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {st}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <span className="font-semibold text-slate-500 uppercase text-[10px] tracking-wider">Severity:</span>
          <select
            value={severityFilter}
            onChange={(e) => setSeverityFilter(e.target.value)}
            className="p-1.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-700 focus:outline-none focus:border-emerald-500"
          >
            <option value="all">All Severities</option>
            <option value="critical">🔴 Critical</option>
            <option value="warning">🟠 Warning</option>
            <option value="info">🟡 Information</option>
          </select>
        </div>
      </div>

      {/* Alerts Feed */}
      <div className="space-y-3">
        {alerts.length === 0 ? (
          <div className="p-12 text-center bg-white rounded-2xl border border-slate-200">
            <CheckCircle className="w-10 h-10 text-emerald-500 mx-auto" />
            <h3 className="font-bold text-slate-800 text-sm mt-3">All Clear</h3>
            <p className="text-xs text-slate-400 mt-1">No alerts matching the selected status and severity.</p>
          </div>
        ) : (
          alerts.map((alert) => (
            <div
              key={alert.id}
              className={`p-4 rounded-2xl border transition flex flex-col sm:flex-row sm:items-center justify-between gap-4 ${
                alert.severity === 'critical'
                  ? 'bg-rose-50/40 border-rose-200'
                  : alert.severity === 'warning'
                  ? 'bg-amber-50/40 border-amber-200'
                  : 'bg-blue-50/40 border-blue-200'
              }`}
            >
              <div className="flex items-start gap-3.5">
                <div className={`p-2 rounded-xl shrink-0 mt-0.5 ${
                  alert.severity === 'critical'
                    ? 'bg-rose-100 text-rose-600'
                    : alert.severity === 'warning'
                    ? 'bg-amber-100 text-amber-600'
                    : 'bg-blue-100 text-blue-600'
                }`}>
                  <AlertTriangle className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-slate-900 text-sm">{alert.title}</span>
                    <span className={`px-2 py-0.2 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                      alert.severity === 'critical'
                        ? 'bg-rose-100 text-rose-800'
                        : alert.severity === 'warning'
                        ? 'bg-amber-100 text-amber-800'
                        : 'bg-blue-100 text-blue-800'
                    }`}>
                      {alert.severity}
                    </span>
                    <span className={`px-2 py-0.2 rounded-full text-[10px] font-bold uppercase ${
                      alert.status === 'resolved'
                        ? 'bg-emerald-100 text-emerald-800'
                        : alert.status === 'acknowledged'
                        ? 'bg-slate-200 text-slate-700'
                        : 'bg-rose-100 text-rose-800'
                    }`}>
                      {alert.status}
                    </span>
                  </div>

                  <p className="text-xs text-slate-700 mt-1 max-w-2xl">{alert.message}</p>

                  <div className="flex items-center gap-4 text-[11px] text-slate-400 mt-2">
                    {alert.device_asset_id && (
                      <button
                        onClick={() => navigate(`/devices/${alert.device_id}`)}
                        className="font-mono font-bold text-emerald-700 hover:underline flex items-center gap-1"
                      >
                        <Laptop className="w-3 h-3" />
                        {alert.device_asset_id} ({alert.device_name})
                      </button>
                    )}
                    <span>Reported: {formatAppDateTime(alert.created_at)}</span>
                  </div>
                </div>
              </div>

              {/* Actions */}
              {hasRole(['super_admin', 'it_admin']) && alert.status !== 'resolved' && (
                <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
                  {alert.status === 'active' && (
                    <button
                      onClick={() => handleAcknowledge(alert.id)}
                      className="px-3 py-1.5 text-xs font-semibold text-slate-700 bg-white border border-slate-300 rounded-lg shadow-sm hover:bg-slate-50 transition"
                    >
                      Acknowledge
                    </button>
                  )}
                  <button
                    onClick={() => handleResolve(alert.id)}
                    className="px-3 py-1.5 text-xs font-semibold text-white bg-emerald-600 rounded-lg shadow-sm hover:bg-emerald-700 transition flex items-center gap-1"
                  >
                    <Check className="w-3.5 h-3.5" />
                    Resolve
                  </button>
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
