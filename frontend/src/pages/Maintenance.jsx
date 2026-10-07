import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../services/api';
import { formatAppDate } from '../utils/datetime';
import { useAuth } from '../context/AuthContext';
import {
  Wrench,
  Search,
  Plus,
  Filter,
  CheckCircle2,
  Clock,
  AlertCircle,
  Laptop,
  User,
  X,
  Edit
} from 'lucide-react';

export default function Maintenance() {
  const navigate = useNavigate();
  const { hasRole } = useAuth();

  const [tickets, setTickets] = useState([]);
  const [devices, setDevices] = useState([]);
  const [loading, setLoading] = useState(true);

  const [statusFilter, setStatusFilter] = useState('all');
  const [priorityFilter, setPriorityFilter] = useState('all');

  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [updateModalOpen, setUpdateModalOpen] = useState(false);
  const [selectedTicket, setSelectedTicket] = useState(null);

  const [ticketForm, setTicketForm] = useState({
    device_id: '',
    issue: '',
    priority: 'medium',
    technician: 'Sarah Jenkins',
    notes: ''
  });

  const [updateForm, setUpdateForm] = useState({
    status: 'in_progress',
    technician: '',
    notes: ''
  });

  const fetchTickets = async () => {
    try {
      const res = await api.get('/maintenance', {
        status: statusFilter !== 'all' ? statusFilter : '',
        priority: priorityFilter !== 'all' ? priorityFilter : ''
      });
      if (res.success) setTickets(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const fetchDevices = async () => {
    try {
      const res = await api.get('/devices', { limit: 100 });
      if (res.success) setDevices(res.data);
    } catch (e) {}
  };

  useEffect(() => {
    fetchDevices();
  }, []);

  useEffect(() => {
    fetchTickets();
  }, [statusFilter, priorityFilter]);

  const handleCreate = async (e) => {
    e.preventDefault();
    try {
      const res = await api.post('/maintenance', ticketForm);
      if (res.success) {
        setCreateModalOpen(false);
        setTicketForm({ device_id: '', issue: '', priority: 'medium', technician: 'Sarah Jenkins', notes: '' });
        fetchTickets();
      }
    } catch (err) {
      alert(err.message);
    }
  };

  const handleUpdate = async (e) => {
    e.preventDefault();
    if (!selectedTicket) return;
    try {
      const res = await api.put(`/maintenance/${selectedTicket.id}`, updateForm);
      if (res.success) {
        setUpdateModalOpen(false);
        fetchTickets();
      }
    } catch (err) {
      alert(err.message);
    }
  };

  const getPriorityBadge = (priority) => {
    switch (priority) {
      case 'critical': return 'bg-rose-100 text-rose-800 border-rose-200';
      case 'high': return 'bg-orange-100 text-orange-800 border-orange-200';
      case 'medium': return 'bg-amber-100 text-amber-800 border-amber-200';
      default: return 'bg-slate-100 text-slate-700 border-slate-200';
    }
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'completed': return 'bg-emerald-100 text-emerald-800 border-emerald-200';
      case 'in_progress': return 'bg-blue-100 text-blue-800 border-blue-200';
      default: return 'bg-rose-50 text-rose-700 border-rose-200';
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Hardware Maintenance & Repairs</h1>
          <p className="text-sm text-slate-500 mt-1">
            Track hardware diagnostic tickets, technician assignments, and service resolutions.
          </p>
        </div>
        {hasRole(['super_admin', 'it_admin']) && (
          <button
            onClick={() => setCreateModalOpen(true)}
            className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold text-white bg-emerald-600 rounded-lg shadow-sm shadow-emerald-600/20 hover:bg-emerald-700 transition"
          >
            <Plus className="w-3.5 h-3.5" />
            Create Work Ticket
          </button>
        )}
      </div>

      {/* Filter Tabs */}
      <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-2">
          <span className="font-semibold text-slate-500 uppercase text-[10px] tracking-wider">Status:</span>
          {['all', 'open', 'in_progress', 'completed'].map((st) => (
            <button
              key={st}
              onClick={() => setStatusFilter(st)}
              className={`px-3 py-1.5 rounded-lg capitalize font-medium transition ${
                statusFilter === st
                  ? 'bg-slate-900 text-white shadow-sm'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {st.replace('_', ' ')}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <span className="font-semibold text-slate-500 uppercase text-[10px] tracking-wider">Priority:</span>
          <select
            value={priorityFilter}
            onChange={(e) => setPriorityFilter(e.target.value)}
            className="p-1.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-700 focus:outline-none focus:border-emerald-500"
          >
            <option value="all">All Priorities</option>
            <option value="critical">Critical</option>
            <option value="high">High</option>
            <option value="medium">Medium</option>
            <option value="low">Low</option>
          </select>
        </div>
      </div>

      {/* Tickets List */}
      <div className="bg-white rounded-xl border border-slate-200/80 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-600">
            <thead className="bg-slate-50 text-[11px] font-semibold uppercase tracking-wider text-slate-400 border-b border-slate-200">
              <tr>
                <th className="py-3 px-4">Ticket ID</th>
                <th className="py-3 px-4">Laptop Device</th>
                <th className="py-3 px-4">Issue Description</th>
                <th className="py-3 px-4">Priority</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4">Technician</th>
                <th className="py-3 px-4">Reported Date</th>
                <th className="py-3 px-4 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium">
              {tickets.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-8 text-center text-slate-400">
                    No maintenance tickets found for the selected filter.
                  </td>
                </tr>
              ) : (
                tickets.map((t) => (
                  <tr key={t.id} className="hover:bg-slate-50/70 transition">
                    <td className="py-3 px-4 font-mono font-bold text-slate-900">
                      {t.ticket_id}
                    </td>
                    <td className="py-3 px-4">
                      <div
                        onClick={() => navigate(`/devices/${t.device_id}`)}
                        className="font-bold text-slate-900 hover:text-emerald-600 cursor-pointer flex items-center gap-1.5"
                      >
                        <Laptop className="w-3.5 h-3.5 text-slate-400" />
                        {t.device_asset_id}
                      </div>
                      <div className="text-[11px] text-slate-400">{t.device_name}</div>
                    </td>
                    <td className="py-3 px-4 max-w-xs">
                      <div className="text-slate-800 line-clamp-1">{t.issue}</div>
                      {t.notes && <div className="text-[10px] text-slate-400 italic line-clamp-1 mt-0.5">Note: {t.notes}</div>}
                    </td>
                    <td className="py-3 px-4">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase border ${getPriorityBadge(t.priority)}`}>
                        {t.priority}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase border ${getStatusBadge(t.status)}`}>
                        {t.status.replace('_', ' ')}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-slate-700">
                      {t.technician || 'IT Support'}
                    </td>
                    <td className="py-3 px-4 text-slate-500">
                      {formatAppDate(t.reported_date)}
                    </td>
                    <td className="py-3 px-4 text-right">
                      {hasRole(['super_admin', 'it_admin']) && (
                        <button
                          onClick={() => {
                            setSelectedTicket(t);
                            setUpdateForm({
                              status: t.status,
                              technician: t.technician || '',
                              notes: t.notes || ''
                            });
                            setUpdateModalOpen(true);
                          }}
                          className="px-2.5 py-1 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition"
                        >
                          Update &rarr;
                        </button>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ----------------- CREATE TICKET MODAL ----------------- */}
      {createModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 border border-slate-200">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="font-bold text-base text-slate-900">Create Maintenance Ticket</h3>
              <button onClick={() => setCreateModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleCreate} className="mt-4 space-y-3 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Select Laptop</label>
                <select
                  required
                  value={ticketForm.device_id}
                  onChange={(e) => setTicketForm({ ...ticketForm, device_id: e.target.value })}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:border-emerald-500"
                >
                  <option value="">Select laptop device...</option>
                  {devices.map(d => (
                    <option key={d.id} value={d.id}>{d.asset_id} - {d.name} ({d.model})</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Issue Description</label>
                <textarea
                  required
                  rows="2"
                  value={ticketForm.issue}
                  onChange={(e) => setTicketForm({ ...ticketForm, issue: e.target.value })}
                  placeholder="Describe hardware symptom, malfunction, or required repair..."
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:border-emerald-500"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Priority</label>
                  <select
                    value={ticketForm.priority}
                    onChange={(e) => setTicketForm({ ...ticketForm, priority: e.target.value })}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg"
                  >
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                    <option value="critical">Critical</option>
                  </select>
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Assigned Technician</label>
                  <input
                    type="text"
                    value={ticketForm.technician}
                    onChange={(e) => setTicketForm({ ...ticketForm, technician: e.target.value })}
                    placeholder="e.g. Sarah Jenkins"
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg"
                  />
                </div>
              </div>
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Initial Diagnostic Notes</label>
                <input
                  type="text"
                  value={ticketForm.notes}
                  onChange={(e) => setTicketForm({ ...ticketForm, notes: e.target.value })}
                  placeholder="Part serials, diagnostic codes..."
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg"
                />
              </div>
              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setCreateModalOpen(false)}
                  className="flex-1 py-2 text-xs font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg shadow-sm"
                >
                  Submit Ticket
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ----------------- UPDATE TICKET MODAL ----------------- */}
      {updateModalOpen && selectedTicket && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 border border-slate-200">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="font-bold text-base text-slate-900">Update Ticket {selectedTicket.ticket_id}</h3>
              <button onClick={() => setUpdateModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleUpdate} className="mt-4 space-y-3 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Ticket Status</label>
                <select
                  value={updateForm.status}
                  onChange={(e) => setUpdateForm({ ...updateForm, status: e.target.value })}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg font-semibold"
                >
                  <option value="open">Open (Awaiting Inspection)</option>
                  <option value="in_progress">In Progress (Active Bench Repair)</option>
                  <option value="completed">Completed (Resolved & Recommissioned)</option>
                </select>
              </div>
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Technician</label>
                <input
                  type="text"
                  value={updateForm.technician}
                  onChange={(e) => setUpdateForm({ ...updateForm, technician: e.target.value })}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg"
                />
              </div>
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Resolution & Service Notes</label>
                <textarea
                  rows="3"
                  value={updateForm.notes}
                  onChange={(e) => setUpdateForm({ ...updateForm, notes: e.target.value })}
                  placeholder="Parts replaced, stress test result, completion notes..."
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg"
                />
              </div>
              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setUpdateModalOpen(false)}
                  className="flex-1 py-2 text-xs font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg shadow-sm"
                >
                  Save Status
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
