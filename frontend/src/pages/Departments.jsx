import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';
import {
  Building2,
  Plus,
  Edit,
  Trash2,
  Laptop,
  Users,
  DollarSign,
  X
} from 'lucide-react';

export default function Departments() {
  const { hasRole } = useAuth();
  const [departments, setDepartments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [selectedDept, setSelectedDept] = useState(null);

  const [form, setForm] = useState({
    name: '',
    code: '',
    description: '',
    budget_allocated: 100000
  });

  const fetchDepartments = async () => {
    try {
      const res = await api.get('/departments');
      if (res.success) setDepartments(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDepartments();
  }, []);

  const handleCreate = async (e) => {
    e.preventDefault();
    try {
      const res = await api.post('/departments', form);
      if (res.success) {
        setAddModalOpen(false);
        setForm({ name: '', code: '', description: '', budget_allocated: 100000 });
        fetchDepartments();
      }
    } catch (err) {
      alert(err.message);
    }
  };

  const handleUpdate = async (e) => {
    e.preventDefault();
    if (!selectedDept) return;
    try {
      const res = await api.put(`/departments/${selectedDept.id}`, form);
      if (res.success) {
        setEditModalOpen(false);
        fetchDepartments();
      }
    } catch (err) {
      alert(err.message);
    }
  };

  const handleDelete = async (dept) => {
    if (!confirm(`Delete department ${dept.name}? Associated laptops will be set to unassigned.`)) return;
    try {
      await api.delete(`/departments/${dept.id}`);
      fetchDepartments();
    } catch (err) {
      alert(err.message);
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Company Departments & Cost Centers</h1>
          <p className="text-sm text-slate-500 mt-1">
            Track hardware allocation, budgets, and laptop distribution across corporate divisions.
          </p>
        </div>
        {hasRole(['super_admin', 'it_admin']) && (
          <button
            onClick={() => setAddModalOpen(true)}
            className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold text-white bg-emerald-600 rounded-lg shadow-sm shadow-emerald-600/20 hover:bg-emerald-700 transition"
          >
            <Plus className="w-3.5 h-3.5" />
            Add Department
          </button>
        )}
      </div>

      {/* Departments Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {departments.map((dept) => (
          <div
            key={dept.id}
            className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm hover:border-emerald-300 hover:shadow-md transition flex flex-col justify-between"
          >
            <div>
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 bg-slate-100 rounded-lg text-slate-700">
                    <Building2 className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="font-bold text-slate-900 text-sm">{dept.name}</h3>
                    <span className="text-[11px] font-mono font-semibold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded">
                      {dept.code}
                    </span>
                  </div>
                </div>

                {hasRole(['super_admin', 'it_admin']) && (
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => {
                        setSelectedDept(dept);
                        setForm({
                          name: dept.name,
                          code: dept.code,
                          description: dept.description || '',
                          budget_allocated: dept.budget_allocated || 0
                        });
                        setEditModalOpen(true);
                      }}
                      className="p-1 text-slate-400 hover:text-blue-600 rounded"
                    >
                      <Edit className="w-3.5 h-3.5" />
                    </button>
                    {hasRole(['super_admin']) && (
                      <button
                        onClick={() => handleDelete(dept)}
                        className="p-1 text-slate-400 hover:text-rose-600 rounded"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                )}
              </div>

              <p className="text-xs text-slate-500 mt-3 min-h-[36px]">
                {dept.description || 'Corporate operations and asset management.'}
              </p>

              <div className="grid grid-cols-2 gap-2 mt-4 pt-3 border-t border-slate-50 text-xs">
                <div className="p-2.5 bg-slate-50 rounded-xl">
                  <div className="flex items-center gap-1 text-[11px] text-slate-400">
                    <Laptop className="w-3.5 h-3.5" /> Laptops
                  </div>
                  <div className="font-bold text-slate-900 text-base mt-1">
                    {dept.device_count || 0}
                    <span className="text-[10px] text-emerald-600 font-normal ml-1">
                      ({dept.online_device_count || 0} online)
                    </span>
                  </div>
                </div>

                <div className="p-2.5 bg-slate-50 rounded-xl">
                  <div className="flex items-center gap-1 text-[11px] text-slate-400">
                    <Users className="w-3.5 h-3.5" /> Employees
                  </div>
                  <div className="font-bold text-slate-900 text-base mt-1">
                    {dept.employee_count || 0}
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
              <span className="text-slate-400">Total Hardware Value:</span>
              <span className="font-mono font-bold text-emerald-700">
                ${Number(dept.total_asset_value || 0).toLocaleString()}
              </span>
            </div>
          </div>
        ))}
      </div>

      {/* ----------------- CREATE DEPARTMENT MODAL ----------------- */}
      {addModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 border border-slate-200">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="font-bold text-base text-slate-900">Add New Department</h3>
              <button onClick={() => setAddModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleCreate} className="mt-4 space-y-3 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Department Name</label>
                <input
                  type="text"
                  required
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder="e.g. Quality Assurance"
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:border-emerald-500"
                />
              </div>
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Department Code</label>
                <input
                  type="text"
                  required
                  value={form.code}
                  onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase() })}
                  placeholder="e.g. QA"
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:border-emerald-500 font-mono"
                />
              </div>
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Description</label>
                <textarea
                  rows="2"
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  placeholder="Scope of work and responsibilities..."
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:border-emerald-500"
                />
              </div>
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Budget Allocated ($)</label>
                <input
                  type="number"
                  value={form.budget_allocated}
                  onChange={(e) => setForm({ ...form, budget_allocated: e.target.value })}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:border-emerald-500"
                />
              </div>
              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setAddModalOpen(false)}
                  className="flex-1 py-2 text-xs font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg shadow-sm"
                >
                  Create Department
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ----------------- EDIT DEPARTMENT MODAL ----------------- */}
      {editModalOpen && selectedDept && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 border border-slate-200">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="font-bold text-base text-slate-900">Edit Department</h3>
              <button onClick={() => setEditModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleUpdate} className="mt-4 space-y-3 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Department Name</label>
                <input
                  type="text"
                  required
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg"
                />
              </div>
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Department Code</label>
                <input
                  type="text"
                  required
                  value={form.code}
                  onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase() })}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg font-mono"
                />
              </div>
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Description</label>
                <textarea
                  rows="2"
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg"
                />
              </div>
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Budget Allocated ($)</label>
                <input
                  type="number"
                  value={form.budget_allocated}
                  onChange={(e) => setForm({ ...form, budget_allocated: e.target.value })}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg"
                />
              </div>
              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setEditModalOpen(false)}
                  className="flex-1 py-2 text-xs font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg shadow-sm"
                >
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
