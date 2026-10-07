import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import { formatAppDate, formatAppDateTime } from '../utils/datetime';
import {
  FileBarChart2,
  Download,
  Printer,
  Laptop,
  Users,
  Building2,
  Wrench,
  FileSpreadsheet,
  FileText
} from 'lucide-react';

export default function Reports() {
  const [activeTab, setActiveTab] = useState('devices');
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchReport = async (tab) => {
    setLoading(true);
    try {
      let endpoint = '/reports/devices';
      if (tab === 'employees') endpoint = '/reports/employees';
      if (tab === 'departments') endpoint = '/reports/departments';
      if (tab === 'maintenance') endpoint = '/reports/maintenance';

      const res = await api.get(endpoint);
      if (res.success) setData(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReport(activeTab);
  }, [activeTab]);

  const handleExportCsv = () => {
    let endpoint = `/api/reports/${activeTab}?format=csv`;
    const token = localStorage.getItem('token');
    
    // Download via fetch blob
    fetch(endpoint, {
      headers: { Authorization: `Bearer ${token}` }
    })
      .then(res => res.blob())
      .then(blob => {
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${activeTab}-report-${new Date().toISOString().slice(0, 10)}.csv`;
        document.body.appendChild(a);
        a.click();
        a.remove();
      });
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 print:hidden">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">IT Asset Auditing & Reports</h1>
          <p className="text-sm text-slate-500 mt-1">
            Generate and export comprehensive reports for compliance, financial audits, and fleet oversight.
          </p>
        </div>
        <div className="flex items-center gap-2.5">
          <button
            onClick={handleExportCsv}
            className="inline-flex items-center gap-2 px-3.5 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-200 rounded-lg shadow-sm hover:bg-slate-50 transition"
          >
            <Download className="w-3.5 h-3.5 text-slate-500" />
            Export CSV
          </button>
          <button
            onClick={handlePrint}
            className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold text-white bg-slate-900 rounded-lg shadow-sm hover:bg-slate-800 transition"
          >
            <Printer className="w-3.5 h-3.5" />
            Print Report
          </button>
        </div>
      </div>

      {/* Report Tabs */}
      <div className="flex border-b border-slate-200 text-xs font-semibold gap-6 print:hidden">
        <button
          onClick={() => setActiveTab('devices')}
          className={`pb-3 flex items-center gap-2 border-b-2 transition ${
            activeTab === 'devices'
              ? 'border-emerald-600 text-emerald-700'
              : 'border-transparent text-slate-500 hover:text-slate-900'
          }`}
        >
          <Laptop className="w-4 h-4" /> Device Inventory Report
        </button>
        <button
          onClick={() => setActiveTab('employees')}
          className={`pb-3 flex items-center gap-2 border-b-2 transition ${
            activeTab === 'employees'
              ? 'border-emerald-600 text-emerald-700'
              : 'border-transparent text-slate-500 hover:text-slate-900'
          }`}
        >
          <Users className="w-4 h-4" /> Employee Asset Report
        </button>
        <button
          onClick={() => setActiveTab('departments')}
          className={`pb-3 flex items-center gap-2 border-b-2 transition ${
            activeTab === 'departments'
              ? 'border-emerald-600 text-emerald-700'
              : 'border-transparent text-slate-500 hover:text-slate-900'
          }`}
        >
          <Building2 className="w-4 h-4" /> Department Report
        </button>
        <button
          onClick={() => setActiveTab('maintenance')}
          className={`pb-3 flex items-center gap-2 border-b-2 transition ${
            activeTab === 'maintenance'
              ? 'border-emerald-600 text-emerald-700'
              : 'border-transparent text-slate-500 hover:text-slate-900'
          }`}
        >
          <Wrench className="w-4 h-4" /> Maintenance Log Report
        </button>
      </div>

      {/* Printable Heading (shown during print) */}
      <div className="hidden print:block pb-4 border-b border-slate-200 mb-4">
        <h2 className="text-xl font-bold">Apex Global Technologies - Official Asset Audit Report</h2>
        <p className="text-xs text-slate-500">Report Category: {activeTab.toUpperCase()} | Generated: {formatAppDateTime(new Date())}</p>
      </div>

      {/* Report Table Content */}
      <div className="bg-white rounded-xl border border-slate-200/80 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          {activeTab === 'devices' && (
            <table className="w-full text-left text-xs text-slate-600">
              <thead className="bg-slate-50 text-[11px] font-semibold uppercase tracking-wider text-slate-400 border-b border-slate-200">
                <tr>
                  <th className="py-3 px-4">Asset ID</th>
                  <th className="py-3 px-4">Laptop Name</th>
                  <th className="py-3 px-4">Model & Make</th>
                  <th className="py-3 px-4">Serial Number</th>
                  <th className="py-3 px-4">OS</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4">Custodian</th>
                  <th className="py-3 px-4">Department</th>
                  <th className="py-3 px-4">Value ($)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium">
                {data.map((r, i) => (
                  <tr key={i} className="hover:bg-slate-50/70">
                    <td className="py-3 px-4 font-mono font-bold text-slate-900">{r.asset_id}</td>
                    <td className="py-3 px-4 text-slate-900 font-semibold">{r.name}</td>
                    <td className="py-3 px-4">{r.manufacturer} {r.model}</td>
                    <td className="py-3 px-4 font-mono text-[11px]">{r.serial_number}</td>
                    <td className="py-3 px-4">{r.os}</td>
                    <td className="py-3 px-4 uppercase font-bold text-[10px]">{r.status}</td>
                    <td className="py-3 px-4">{r.employee_name || 'Unassigned'}</td>
                    <td className="py-3 px-4">{r.department_name || 'N/A'}</td>
                    <td className="py-3 px-4 font-mono">${Number(r.purchase_price || 0).toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}

          {activeTab === 'employees' && (
            <table className="w-full text-left text-xs text-slate-600">
              <thead className="bg-slate-50 text-[11px] font-semibold uppercase tracking-wider text-slate-400 border-b border-slate-200">
                <tr>
                  <th className="py-3 px-4">Employee ID</th>
                  <th className="py-3 px-4">Staff Member</th>
                  <th className="py-3 px-4">Email</th>
                  <th className="py-3 px-4">Department</th>
                  <th className="py-3 px-4">Position</th>
                  <th className="py-3 px-4">Assigned Laptop</th>
                  <th className="py-3 px-4">Laptop Model</th>
                  <th className="py-3 px-4">Device Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium">
                {data.map((r, i) => (
                  <tr key={i} className="hover:bg-slate-50/70">
                    <td className="py-3 px-4 font-mono font-bold text-slate-900">{r.employee_id}</td>
                    <td className="py-3 px-4 font-bold text-slate-900">{r.employee_name}</td>
                    <td className="py-3 px-4">{r.email}</td>
                    <td className="py-3 px-4">{r.department_name || 'Unassigned'}</td>
                    <td className="py-3 px-4">{r.position || 'Staff'}</td>
                    <td className="py-3 px-4 font-mono font-bold text-emerald-700">{r.asset_id || 'None'}</td>
                    <td className="py-3 px-4">{r.model || 'N/A'}</td>
                    <td className="py-3 px-4 uppercase font-bold text-[10px]">{r.device_status || 'N/A'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}

          {activeTab === 'departments' && (
            <table className="w-full text-left text-xs text-slate-600">
              <thead className="bg-slate-50 text-[11px] font-semibold uppercase tracking-wider text-slate-400 border-b border-slate-200">
                <tr>
                  <th className="py-3 px-4">Dept Code</th>
                  <th className="py-3 px-4">Department Name</th>
                  <th className="py-3 px-4">Total Staff</th>
                  <th className="py-3 px-4">Laptops</th>
                  <th className="py-3 px-4">Online</th>
                  <th className="py-3 px-4">Offline</th>
                  <th className="py-3 px-4">In Repair</th>
                  <th className="py-3 px-4">Total Hardware Value</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium">
                {data.map((r, i) => (
                  <tr key={i} className="hover:bg-slate-50/70">
                    <td className="py-3 px-4 font-mono font-bold text-slate-900">{r.code}</td>
                    <td className="py-3 px-4 font-bold text-slate-900">{r.department_name}</td>
                    <td className="py-3 px-4">{r.total_employees}</td>
                    <td className="py-3 px-4 font-bold">{r.total_devices}</td>
                    <td className="py-3 px-4 text-emerald-600 font-semibold">{r.online_devices}</td>
                    <td className="py-3 px-4 text-slate-500">{r.offline_devices}</td>
                    <td className="py-3 px-4 text-amber-600">{r.maintenance_devices}</td>
                    <td className="py-3 px-4 font-mono font-bold text-slate-900">${Number(r.total_hardware_value || 0).toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}

          {activeTab === 'maintenance' && (
            <table className="w-full text-left text-xs text-slate-600">
              <thead className="bg-slate-50 text-[11px] font-semibold uppercase tracking-wider text-slate-400 border-b border-slate-200">
                <tr>
                  <th className="py-3 px-4">Ticket ID</th>
                  <th className="py-3 px-4">Laptop Device</th>
                  <th className="py-3 px-4">Reported Issue</th>
                  <th className="py-3 px-4">Priority</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4">Technician</th>
                  <th className="py-3 px-4">Reported Date</th>
                  <th className="py-3 px-4">Completed Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium">
                {data.map((r, i) => (
                  <tr key={i} className="hover:bg-slate-50/70">
                    <td className="py-3 px-4 font-mono font-bold text-slate-900">{r.ticket_id}</td>
                    <td className="py-3 px-4 font-semibold text-slate-900">{r.asset_id} ({r.device_name})</td>
                    <td className="py-3 px-4 max-w-xs">{r.issue}</td>
                    <td className="py-3 px-4 uppercase font-bold text-[10px]">{r.priority}</td>
                    <td className="py-3 px-4 uppercase font-bold text-[10px]">{r.status}</td>
                    <td className="py-3 px-4">{r.technician || 'IT Support'}</td>
                    <td className="py-3 px-4">{formatAppDate(r.reported_date)}</td>
                    <td className="py-3 px-4">{r.completed_date ? formatAppDate(r.completed_date) : 'Pending'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}
