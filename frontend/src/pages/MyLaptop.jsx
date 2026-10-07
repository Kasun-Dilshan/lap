import React, { useEffect, useState } from 'react';
import { api } from '../services/api';
import { formatAppDateTime } from '../utils/datetime';
import { getAgentSetupStatus, savedLaptopId } from '../services/laptopSnapshot';
import { Laptop, RefreshCw, ShieldCheck } from 'lucide-react';

function Field({ label, value }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white px-4 py-3">
      <div className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">{label}</div>
      <div className="mt-1 text-sm font-semibold text-slate-900 break-words">{value || '—'}</div>
    </div>
  );
}

export default function MyLaptop() {
  const [device, setDevice] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [setup, setSetup] = useState(() => getAgentSetupStatus());

  async function load() {
    try {
      const res = await api.get('/owner/laptop', { device_id: savedLaptopId() });
      if (res.success) {
        setDevice(res.data);
        setError('');
      }
    } catch (err) {
      setError(err.message || 'Could not load this laptop');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    setSetup(getAgentSetupStatus());
    const timer = setInterval(load, 20000);
    return () => clearInterval(timer);
  }, []);

  if (loading) {
    return <div className="text-sm text-slate-500">Loading your laptop...</div>;
  }

  if (!device) {
    return (
      <div className="max-w-xl rounded-2xl border border-amber-200 bg-amber-50 p-6 text-sm text-amber-900">
        {error || 'No laptop is saved for this owner yet. Sign out and sign in again with Laptop Owner.'}
      </div>
    );
  }

  const online = device.status === 'online';

  return (
    <div className="max-w-5xl space-y-6">
      {setup?.status === 'downloaded' && (
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-900">
          <strong className="font-bold">Finish setup:</strong> open the downloaded{' '}
          <code className="rounded bg-white px-1.5 py-0.5 text-xs">CLTMS-Setup.cmd</code> file.
          It installs Node.js 18+ (if missing) and the tracking agent, then starts it for every Windows sign-in.
          If your browser blocked the download, allow it and run the file once.
        </div>
      )}
      {setup?.status === 'running' && (
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-900">
          Tracking agent is running on this laptop. Node.js and auto-start are already configured.
        </div>
      )}
      {setup?.status === 'failed' && (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          Automatic setup could not finish ({setup.reason || 'unknown'}). Sign out and sign in again with Laptop Owner,
          or ask IT to run the company laptop setup on this PC.
        </div>
      )}

      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-emerald-700 text-xs font-bold uppercase tracking-wide">
            <ShieldCheck className="w-4 h-4" />
            {device.agent_installed_at ? 'Agent installed on this laptop' : 'Browser session tracking'}
          </div>
          <h1 className="mt-1 text-2xl font-black text-slate-900">{device.name}</h1>
          <p className="text-sm text-slate-500">
            {device.asset_id} · {device.employee_name || 'Laptop owner'} · saved from this sign-in
          </p>
        </div>
        <button
          type="button"
          onClick={load}
          className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          Refresh
        </button>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-2xl bg-slate-950 text-white p-4">
          <Laptop className="w-5 h-5 text-emerald-400" />
          <div className="mt-3 text-xs text-slate-400">Status</div>
          <div className="text-lg font-bold capitalize">{device.status}</div>
          <div className={`mt-1 text-xs ${online ? 'text-emerald-400' : 'text-slate-400'}`}>
            {online ? 'Heartbeat is reaching the system' : 'Waiting for the next check-in'}
          </div>
        </div>
        <Field label="Battery" value={device.battery_percent != null ? `${device.battery_percent}% · ${device.battery_status || ''}` : '—'} />
        <Field label="Current app" value={device.current_app || 'Company Portal'} />
        <Field label="Last seen" value={device.last_seen ? formatAppDateTime(device.last_seen) : 'Just now'} />
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <Field label="Hostname" value={device.hostname} />
        <Field label="Manufacturer" value={device.manufacturer} />
        <Field label="Model" value={device.model} />
        <Field label="Serial" value={device.serial_number} />
        <Field label="Operating system" value={[device.os, device.os_version].filter(Boolean).join(' · ')} />
        <Field label="CPU" value={device.cpu_model} />
        <Field label="Memory" value={device.ram_total_gb ? `${device.ram_total_gb} GB` : '—'} />
        <Field label="Storage" value={device.storage_total_gb ? `${device.storage_total_gb} GB` : '—'} />
        <Field label="Disk use" value={device.disk_usage != null ? `${device.disk_usage}%` : '—'} />
        <Field label="CPU use" value={device.cpu_usage != null ? `${device.cpu_usage}%` : '—'} />
        <Field label="RAM use" value={device.ram_usage != null ? `${device.ram_usage}%` : '—'} />
        <Field label="Local IP" value={device.local_ip} />
        <Field label="Public IP" value={device.public_ip} />
        <Field label="MAC address" value={device.mac_address} />
        <Field label="Signed-in user" value={device.windows_user} />
        <Field label="Department" value={device.department_name} />
        <Field label="Branch" value={device.branch} />
      </div>
    </div>
  );
}
