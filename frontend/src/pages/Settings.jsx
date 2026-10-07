import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import { formatAppDate, formatAppDateTime } from '../utils/datetime';
import { useAuth } from '../context/AuthContext';
import {
  Settings as SettingsIcon,
  Save,
  KeyRound,
  ShieldCheck,
  UserPlus,
  RefreshCw,
  Plus,
  X,
  Trash2,
  CheckCircle,
  Copy,
  Check
} from 'lucide-react';

export default function Settings() {
  const { user, hasRole } = useAuth();
  const [activeTab, setActiveTab] = useState('thresholds');

  const [settings, setSettings] = useState({
    company_name: 'Apex Global Technologies, Inc.',
    offline_threshold_minutes: '5',
    heartbeat_interval_seconds: '60',
    low_disk_threshold_percent: '90',
    low_battery_threshold_percent: '15',
    warranty_reminder_days: '30',
    admin_email: 'it-admin@company.com'
  });

  const [tokens, setTokens] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [tokenCopiedId, setTokenCopiedId] = useState(null);

  // New user modal
  const [userModalOpen, setUserModalOpen] = useState(false);
  const [userForm, setUserForm] = useState({
    name: '',
    email: '',
    password: '',
    role: 'it_admin'
  });

  const fetchSettings = async () => {
    try {
      const res = await api.get('/settings');
      if (res.success && res.data.map) {
        setSettings(prev => ({ ...prev, ...res.data.map }));
      }
    } catch (e) {}
  };

  const fetchTokens = async () => {
    try {
      const res = await api.get('/enrollment-tokens');
      if (res.success) setTokens(res.data);
    } catch (e) {}
  };

  const fetchUsers = async () => {
    if (!hasRole(['super_admin'])) return;
    try {
      const res = await api.get('/users');
      if (res.success) setUsers(res.data);
    } catch (e) {}
  };

  useEffect(() => {
    Promise.all([fetchSettings(), fetchTokens(), fetchUsers()]).finally(() => setLoading(false));
  }, []);

  const handleSaveSettings = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await api.put('/settings', settings);
      if (res.success) alert('System configuration saved successfully!');
    } catch (err) {
      alert(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleRevokeToken = async (id) => {
    if (!confirm('Revoke this enrollment token? Future laptops cannot register with it.')) return;
    try {
      await api.put(`/enrollment-tokens/${id}/revoke`);
      fetchTokens();
    } catch (err) {
      alert(err.message);
    }
  };

  const handleCreateUser = async (e) => {
    e.preventDefault();
    try {
      const res = await api.post('/users', userForm);
      if (res.success) {
        setUserModalOpen(false);
        setUserForm({ name: '', email: '', password: '', role: 'it_admin' });
        fetchUsers();
      }
    } catch (err) {
      alert(err.message);
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">System Configuration & Governance</h1>
        <p className="text-sm text-slate-500 mt-1">
          Tune fleet heartbeat thresholds, manage device enrollment tokens, and control RBAC administrator credentials.
        </p>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-slate-200 text-xs font-semibold gap-6">
        <button
          onClick={() => setActiveTab('thresholds')}
          className={`pb-3 flex items-center gap-2 border-b-2 transition ${
            activeTab === 'thresholds'
              ? 'border-emerald-600 text-emerald-700'
              : 'border-transparent text-slate-500 hover:text-slate-900'
          }`}
        >
          <SettingsIcon className="w-4 h-4" /> Monitoring Thresholds
        </button>
        <button
          onClick={() => setActiveTab('tokens')}
          className={`pb-3 flex items-center gap-2 border-b-2 transition ${
            activeTab === 'tokens'
              ? 'border-emerald-600 text-emerald-700'
              : 'border-transparent text-slate-500 hover:text-slate-900'
          }`}
        >
          <KeyRound className="w-4 h-4" /> Device Enrollment Tokens
        </button>
        {hasRole(['super_admin']) && (
          <button
            onClick={() => setActiveTab('users')}
            className={`pb-3 flex items-center gap-2 border-b-2 transition ${
              activeTab === 'users'
                ? 'border-emerald-600 text-emerald-700'
                : 'border-transparent text-slate-500 hover:text-slate-900'
            }`}
          >
            <ShieldCheck className="w-4 h-4" /> Admin Access Control (RBAC)
          </button>
        )}
      </div>

      {/* ----------------- TAB 1: THRESHOLDS ----------------- */}
      {activeTab === 'thresholds' && (
        <form onSubmit={handleSaveSettings} className="bg-white rounded-2xl border border-slate-200/80 shadow-sm p-6 space-y-5 max-w-3xl">
          <div>
            <h3 className="text-sm font-bold text-slate-900">Fleet Heartbeat & Health Trigger Rules</h3>
            <p className="text-xs text-slate-500 mt-0.5">
              These values dictate when the central server automatically classifies devices as offline or raises alerts.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Company Legal Name</label>
              <input
                type="text"
                value={settings.company_name}
                onChange={(e) => setSettings({ ...settings, company_name: e.target.value })}
                className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:border-emerald-500"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">IT Operations Contact Email</label>
              <input
                type="email"
                value={settings.admin_email}
                onChange={(e) => setSettings({ ...settings, admin_email: e.target.value })}
                className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:border-emerald-500"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                Offline Detection Threshold (Minutes)
              </label>
              <input
                type="number"
                min="1"
                max="60"
                value={settings.offline_threshold_minutes}
                onChange={(e) => setSettings({ ...settings, offline_threshold_minutes: e.target.value })}
                className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:border-emerald-500"
              />
              <span className="block text-[11px] text-slate-400 mt-1">If no heartbeat is received within this time, mark OFFLINE.</span>
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                Default Heartbeat Interval (Seconds)
              </label>
              <input
                type="number"
                min="15"
                max="300"
                value={settings.heartbeat_interval_seconds}
                onChange={(e) => setSettings({ ...settings, heartbeat_interval_seconds: e.target.value })}
                className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:border-emerald-500"
              />
              <span className="block text-[11px] text-slate-400 mt-1">Frequency at which Laptop Agent transmits telemetry.</span>
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                Low Storage Alert Threshold (%)
              </label>
              <input
                type="number"
                min="50"
                max="99"
                value={settings.low_disk_threshold_percent}
                onChange={(e) => setSettings({ ...settings, low_disk_threshold_percent: e.target.value })}
                className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:border-emerald-500"
              />
              <span className="block text-[11px] text-slate-400 mt-1">Triggers disk warning when volume usage exceeds this percentage.</span>
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                Low Battery Warning Threshold (%)
              </label>
              <input
                type="number"
                min="5"
                max="50"
                value={settings.low_battery_threshold_percent}
                onChange={(e) => setSettings({ ...settings, low_battery_threshold_percent: e.target.value })}
                className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:border-emerald-500"
              />
              <span className="block text-[11px] text-slate-400 mt-1">Triggers alert when discharging below this percentage.</span>
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                Warranty Expiration Reminder (Days)
              </label>
              <input
                type="number"
                min="7"
                max="180"
                value={settings.warranty_reminder_days}
                onChange={(e) => setSettings({ ...settings, warranty_reminder_days: e.target.value })}
                className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:border-emerald-500"
              />
              <span className="block text-[11px] text-slate-400 mt-1">Days in advance to generate renewal/replacement alerts.</span>
            </div>
          </div>

          {hasRole(['super_admin', 'it_admin']) && (
            <div className="pt-3 border-t border-slate-100 flex justify-end">
              <button
                type="submit"
                disabled={saving}
                className="inline-flex items-center gap-2 px-5 py-2.5 text-xs font-semibold text-white bg-emerald-600 rounded-lg shadow-sm hover:bg-emerald-700 transition"
              >
                <Save className="w-4 h-4" />
                {saving ? 'Saving...' : 'Save System Settings'}
              </button>
            </div>
          )}
        </form>
      )}

      {/* ----------------- TAB 2: ENROLLMENT TOKENS ----------------- */}
      {activeTab === 'tokens' && (
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden p-6 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-slate-900">Active & Historical Enrollment Tokens</h3>
              <p className="text-xs text-slate-500">Tokens used by IT administrators during agent provisioning</p>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-600">
              <thead className="bg-slate-50 text-[11px] font-semibold uppercase tracking-wider text-slate-400 border-b border-slate-200">
                <tr>
                  <th className="py-3 px-4">Token Key</th>
                  <th className="py-3 px-4">Batch Name</th>
                  <th className="py-3 px-4">Usage Count</th>
                  <th className="py-3 px-4">Expires</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium font-mono text-[11px]">
                {tokens.map((t) => (
                  <tr key={t.id} className="hover:bg-slate-50/70 font-sans">
                    <td className="py-3 px-4 font-mono font-bold text-slate-900">
                      {t.token}
                    </td>
                    <td className="py-3 px-4 font-semibold text-slate-900">
                      {t.name}
                    </td>
                    <td className="py-3 px-4 font-mono">
                      {t.uses_count} / {t.max_uses} laptops
                    </td>
                    <td className="py-3 px-4 text-slate-500">
                      {formatAppDate(t.expires_at)}
                    </td>
                    <td className="py-3 px-4">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                        t.current_status === 'active'
                          ? 'bg-emerald-100 text-emerald-800'
                          : t.current_status === 'revoked'
                          ? 'bg-rose-100 text-rose-800'
                          : 'bg-slate-200 text-slate-700'
                      }`}>
                        {t.current_status}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right font-sans">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => {
                            navigator.clipboard.writeText(t.token);
                            setTokenCopiedId(t.id);
                            setTimeout(() => setTokenCopiedId(null), 2000);
                          }}
                          className="px-2 py-1 text-xs text-slate-700 bg-slate-100 hover:bg-slate-200 rounded flex items-center gap-1"
                        >
                          {tokenCopiedId === t.id ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
                          {tokenCopiedId === t.id ? 'Copied' : 'Copy'}
                        </button>
                        {t.current_status === 'active' && hasRole(['super_admin', 'it_admin']) && (
                          <button
                            onClick={() => handleRevokeToken(t.id)}
                            className="px-2 py-1 text-xs text-rose-600 hover:bg-rose-50 rounded"
                          >
                            Revoke
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ----------------- TAB 3: ADMIN USERS (RBAC) ----------------- */}
      {activeTab === 'users' && hasRole(['super_admin']) && (
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden p-6 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-slate-900">Administrator Accounts & Roles</h3>
              <p className="text-xs text-slate-500">Manage dashboard users and role-based permissions</p>
            </div>
            <button
              onClick={() => setUserModalOpen(true)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-emerald-600 rounded-lg hover:bg-emerald-700"
            >
              <UserPlus className="w-3.5 h-3.5" />
              Add Admin User
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-600">
              <thead className="bg-slate-50 text-[11px] font-semibold uppercase tracking-wider text-slate-400 border-b border-slate-200">
                <tr>
                  <th className="py-3 px-4">Name</th>
                  <th className="py-3 px-4">Email</th>
                  <th className="py-3 px-4">Role</th>
                  <th className="py-3 px-4">Account Status</th>
                  <th className="py-3 px-4">Last Login</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium">
                {users.map((u) => (
                  <tr key={u.id} className="hover:bg-slate-50/70">
                    <td className="py-3 px-4 font-bold text-slate-900">{u.name}</td>
                    <td className="py-3 px-4">{u.email}</td>
                    <td className="py-3 px-4">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                        u.role === 'super_admin' ? 'bg-purple-100 text-purple-800' :
                        u.role === 'it_admin' ? 'bg-blue-100 text-blue-800' :
                        u.role === 'manager' ? 'bg-amber-100 text-amber-800' : 'bg-slate-100 text-slate-700'
                      }`}>
                        {u.role.replace('_', ' ')}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <span className="text-emerald-600 font-semibold uppercase text-[10px]">{u.status}</span>
                    </td>
                    <td className="py-3 px-4 text-slate-500 text-[11px]">
                      {u.last_login ? formatAppDateTime(u.last_login) : 'Never'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ----------------- CREATE USER MODAL ----------------- */}
      {userModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 border border-slate-200">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="font-bold text-base text-slate-900">Create System Administrator</h3>
              <button onClick={() => setUserModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleCreateUser} className="mt-4 space-y-3 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Full Name</label>
                <input
                  type="text"
                  required
                  value={userForm.name}
                  onChange={(e) => setUserForm({ ...userForm, name: e.target.value })}
                  placeholder="e.g. Rachel Zane"
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:border-emerald-500"
                />
              </div>
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Corporate Email</label>
                <input
                  type="email"
                  required
                  value={userForm.email}
                  onChange={(e) => setUserForm({ ...userForm, email: e.target.value })}
                  placeholder="e.g. rachel@company.com"
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:border-emerald-500"
                />
              </div>
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Password</label>
                <input
                  type="password"
                  required
                  value={userForm.password}
                  onChange={(e) => setUserForm({ ...userForm, password: e.target.value })}
                  placeholder="Min 6 characters"
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:border-emerald-500"
                />
              </div>
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Assigned Role</label>
                <select
                  value={userForm.role}
                  onChange={(e) => setUserForm({ ...userForm, role: e.target.value })}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg"
                >
                  <option value="super_admin">Super Admin (Full Access)</option>
                  <option value="it_admin">IT Admin (Devices, Maintenance)</option>
                  <option value="manager">Manager (Read & Reports)</option>
                  <option value="viewer">Viewer (Read-Only)</option>
                  <option value="laptop_owner">Laptop Owner</option>
                </select>
              </div>
              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setUserModalOpen(false)}
                  className="flex-1 py-2 text-xs font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg shadow-sm"
                >
                  Create User
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
