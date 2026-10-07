import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';
import {
  Users,
  Search,
  Plus,
  Mail,
  Phone,
  Building2,
  Laptop,
  CheckCircle,
  XCircle,
  Edit,
  PowerOff,
  Trash2,
  Eye,
  X
} from 'lucide-react';

export default function Employees() {
  const navigate = useNavigate();
  const { hasRole } = useAuth();

  const [employees, setEmployees] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [deptFilter, setDeptFilter] = useState('all');

  const [addModalOpen, setAddModalOpen] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [viewDevicesModalOpen, setViewDevicesModalOpen] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState(null);
  const [employeeDevices, setEmployeeDevices] = useState([]);

  const [empForm, setEmpForm] = useState({
    employee_id: '',
    name: '',
    email: '',
    password: '',
    phone: '',
    department_id: '',
    branch: 'Headquarters (NY)',
    position: ''
  });

  const fetchData = async () => {
    try {
      const [empRes, deptRes] = await Promise.all([
        api.get('/employees', { search, department_id: deptFilter !== 'all' ? deptFilter : '' }),
        api.get('/departments')
      ]);
      if (empRes.success) setEmployees(empRes.data);
      if (deptRes.success) setDepartments(deptRes.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [search, deptFilter]);

  const handleCreate = async (e) => {
    e.preventDefault();
    try {
      const res = await api.post('/employees', empForm);
      if (res.success) {
        setAddModalOpen(false);
        setEmpForm({ employee_id: '', name: '', email: '', password: '', phone: '', department_id: '', branch: 'Headquarters', position: '' });
        fetchData();
      }
    } catch (err) {
      alert(err.message);
    }
  };

  const handleUpdate = async (e) => {
    e.preventDefault();
    if (!selectedEmployee) return;
    try {
      const res = await api.put(`/employees/${selectedEmployee.id}`, empForm);
      if (res.success) {
        setEditModalOpen(false);
        fetchData();
      }
    } catch (err) {
      alert(err.message);
    }
  };

  const handleDeactivate = async (emp) => {
    if (!confirm(`Mark employee ${emp.name} as inactive?`)) return;
    try {
      await api.put(`/employees/${emp.id}/deactivate`);
      fetchData();
    } catch (err) {
      alert(err.message);
    }
  };

  const openViewDevices = async (emp) => {
    setSelectedEmployee(emp);
    try {
      const res = await api.get(`/employees/${emp.id}`);
      if (res.success) {
        setEmployeeDevices(res.data.devices || []);
        setViewDevicesModalOpen(true);
      }
    } catch (err) {
      alert(err.message);
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Company Staff & Asset Custodians</h1>
          <p className="text-sm text-slate-500 mt-1">
            Manage company employees, their departments, and assigned hardware assets.
          </p>
        </div>
        {hasRole(['super_admin', 'it_admin']) && (
          <button
            onClick={() => setAddModalOpen(true)}
            className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold text-white bg-emerald-600 rounded-lg shadow-sm shadow-emerald-600/20 hover:bg-emerald-700 transition"
          >
            <Plus className="w-3.5 h-3.5" />
            Add Employee
          </button>
        )}
      </div>

      {/* Search and Filters */}
      <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-sm flex flex-col sm:flex-row items-center gap-3">
        <div className="relative flex-1 w-full">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search employee name, ID, email, position..."
            className="w-full pl-9 pr-4 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
          />
        </div>
        <div className="w-full sm:w-60">
          <select
            value={deptFilter}
            onChange={(e) => setDeptFilter(e.target.value)}
            className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-700 focus:outline-none focus:border-emerald-500"
          >
            <option value="all">All Departments</option>
            {departments.map(d => (
              <option key={d.id} value={d.id}>{d.name}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Employees Table */}
      <div className="bg-white rounded-xl border border-slate-200/80 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-600">
            <thead className="bg-slate-50 text-[11px] font-semibold uppercase tracking-wider text-slate-400 border-b border-slate-200">
              <tr>
                <th className="py-3 px-4">Employee ID</th>
                <th className="py-3 px-4">Name & Title</th>
                <th className="py-3 px-4">Department & Branch</th>
                <th className="py-3 px-4">Contact Info</th>
                <th className="py-3 px-4">Assigned Laptops</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium">
              {employees.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-slate-400">
                    No employees found matching search criteria.
                  </td>
                </tr>
              ) : (
                employees.map((emp) => (
                  <tr key={emp.id} className="hover:bg-slate-50/70 transition">
                    <td className="py-3 px-4 font-mono font-bold text-slate-900">
                      {emp.employee_id}
                    </td>
                    <td className="py-3 px-4">
                      <div className="font-bold text-slate-900">{emp.name}</div>
                      <div className="text-[11px] text-slate-400">{emp.position || 'Staff Member'}</div>
                    </td>
                    <td className="py-3 px-4">
                      <div className="text-slate-800 font-medium">{emp.department_name || 'Unassigned'}</div>
                      <div className="text-[11px] text-slate-400">{emp.branch}</div>
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-1 text-slate-700">
                        <Mail className="w-3 h-3 text-slate-400" />
                        <span>{emp.email}</span>
                      </div>
                      {emp.phone && (
                        <div className="flex items-center gap-1 text-[11px] text-slate-400 mt-0.5">
                          <Phone className="w-3 h-3 text-slate-400" />
                          <span>{emp.phone}</span>
                        </div>
                      )}
                    </td>
                    <td className="py-3 px-4">
                      <button
                        onClick={() => openViewDevices(emp)}
                        className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold ${
                          emp.assigned_devices_count > 0
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100'
                            : 'bg-slate-100 text-slate-500'
                        }`}
                      >
                        <Laptop className="w-3.5 h-3.5" />
                        <span>{emp.assigned_devices_count} Laptop{emp.assigned_devices_count !== 1 ? 's' : ''}</span>
                      </button>
                    </td>
                    <td className="py-3 px-4">
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                        emp.status === 'active' ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-600'
                      }`}>
                        {emp.status}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => openViewDevices(emp)}
                          title="View Assigned Devices"
                          className="p-1 text-slate-500 hover:text-emerald-600 hover:bg-slate-100 rounded"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        {hasRole(['super_admin', 'it_admin']) && (
                          <>
                            <button
                              onClick={() => {
                                setSelectedEmployee(emp);
                                setEmpForm({
                                  employee_id: emp.employee_id,
                                  name: emp.name,
                                  email: emp.email,
                                  password: '',
                                  phone: emp.phone || '',
                                  department_id: emp.department_id || '',
                                  branch: emp.branch || 'Headquarters',
                                  position: emp.position || ''
                                });
                                setEditModalOpen(true);
                              }}
                              title="Edit Employee"
                              className="p-1 text-slate-500 hover:text-blue-600 hover:bg-slate-100 rounded"
                            >
                              <Edit className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleDeactivate(emp)}
                              title="Deactivate"
                              className="p-1 text-slate-500 hover:text-rose-600 hover:bg-slate-100 rounded"
                            >
                              <PowerOff className="w-4 h-4" />
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ----------------- VIEW ASSIGNED DEVICES MODAL ----------------- */}
      {viewDevicesModalOpen && selectedEmployee && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full p-6 border border-slate-200">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div>
                <h3 className="font-bold text-base text-slate-900">Laptops Assigned to {selectedEmployee.name}</h3>
                <p className="text-xs text-slate-500">{selectedEmployee.employee_id} • {selectedEmployee.department_name}</p>
              </div>
              <button onClick={() => setViewDevicesModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="mt-4 space-y-3">
              {employeeDevices.length === 0 ? (
                <div className="text-center py-6 text-slate-400 text-xs">
                  No laptops currently assigned to this employee.
                </div>
              ) : (
                employeeDevices.map((dev) => (
                  <div
                    key={dev.id}
                    onClick={() => {
                      setViewDevicesModalOpen(false);
                      navigate(`/devices/${dev.id}`);
                    }}
                    className="p-3 bg-slate-50 hover:bg-emerald-50/60 rounded-xl border border-slate-100 cursor-pointer transition flex items-center justify-between"
                  >
                    <div>
                      <div className="font-mono font-bold text-slate-900 text-xs">{dev.asset_id}</div>
                      <div className="text-xs text-slate-700 font-semibold">{dev.name}</div>
                      <div className="text-[11px] text-slate-400">{dev.model} • {dev.os}</div>
                    </div>
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                      dev.status === 'online' ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-200 text-slate-700'
                    }`}>
                      {dev.status}
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* ----------------- ADD EMPLOYEE MODAL ----------------- */}
      {addModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 border border-slate-200">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="font-bold text-base text-slate-900">Add New Employee</h3>
              <button onClick={() => setAddModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleCreate} className="mt-4 space-y-3 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Employee ID</label>
                <input
                  type="text"
                  required
                  value={empForm.employee_id}
                  onChange={(e) => setEmpForm({ ...empForm, employee_id: e.target.value })}
                  placeholder="e.g. EMP-1015"
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:border-emerald-500"
                />
              </div>
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Full Name</label>
                <input
                  type="text"
                  required
                  value={empForm.name}
                  onChange={(e) => setEmpForm({ ...empForm, name: e.target.value })}
                  placeholder="e.g. Jonathan Hayes"
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:border-emerald-500"
                />
              </div>
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Corporate Email</label>
                <input
                  type="email"
                  required
                  value={empForm.email}
                  onChange={(e) => setEmpForm({ ...empForm, email: e.target.value })}
                  placeholder="e.g. j.hayes@company.com"
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:border-emerald-500"
                />
              </div>
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Password</label>
                <input
                  type="password"
                  required
                  minLength={6}
                  value={empForm.password}
                  onChange={(e) => setEmpForm({ ...empForm, password: e.target.value })}
                  placeholder="Min 6 characters (laptop owner login)"
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:border-emerald-500"
                />
              </div>
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Department</label>
                <select
                  value={empForm.department_id}
                  onChange={(e) => setEmpForm({ ...empForm, department_id: e.target.value })}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:border-emerald-500"
                >
                  <option value="">Select Department...</option>
                  {departments.map(d => (
                    <option key={d.id} value={d.id}>{d.name} ({d.code})</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Job Position</label>
                <input
                  type="text"
                  value={empForm.position}
                  onChange={(e) => setEmpForm({ ...empForm, position: e.target.value })}
                  placeholder="e.g. Senior Security Analyst"
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
                  Create Employee
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ----------------- EDIT EMPLOYEE MODAL ----------------- */}
      {editModalOpen && selectedEmployee && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 border border-slate-200">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="font-bold text-base text-slate-900">Edit Employee Profile</h3>
              <button onClick={() => setEditModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleUpdate} className="mt-4 space-y-3 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Full Name</label>
                <input
                  type="text"
                  required
                  value={empForm.name}
                  onChange={(e) => setEmpForm({ ...empForm, name: e.target.value })}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:border-emerald-500"
                />
              </div>
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Corporate Email</label>
                <input
                  type="email"
                  required
                  value={empForm.email}
                  onChange={(e) => setEmpForm({ ...empForm, email: e.target.value })}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:border-emerald-500"
                />
              </div>
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Password</label>
                <input
                  type="password"
                  minLength={6}
                  value={empForm.password}
                  onChange={(e) => setEmpForm({ ...empForm, password: e.target.value })}
                  placeholder="Leave blank to keep current password"
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:border-emerald-500"
                />
              </div>
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Phone</label>
                <input
                  type="text"
                  value={empForm.phone}
                  onChange={(e) => setEmpForm({ ...empForm, phone: e.target.value })}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:border-emerald-500"
                />
              </div>
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Department</label>
                <select
                  value={empForm.department_id}
                  onChange={(e) => setEmpForm({ ...empForm, department_id: e.target.value })}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg"
                >
                  <option value="">Select Department...</option>
                  {departments.map(d => (
                    <option key={d.id} value={d.id}>{d.name} ({d.code})</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Position</label>
                <input
                  type="text"
                  value={empForm.position}
                  onChange={(e) => setEmpForm({ ...empForm, position: e.target.value })}
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
