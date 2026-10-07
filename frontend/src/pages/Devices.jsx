import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { api } from '../services/api';
import { formatAppDate, formatAppTime } from '../utils/datetime';
import { useAuth } from '../context/AuthContext';
import {
  Laptop,
  Search,
  Filter,
  Plus,
  KeyRound,
  Eye,
  Edit,
  UserPlus,
  Wrench,
  PowerOff,
  Trash2,
  LayoutGrid,
  List,
  CheckCircle,
  XCircle,
  BatteryMedium,
  HardDrive,
  MapPin,
  ChevronRight,
  ChevronDown,
  X,
  Copy,
  Check,
  AlertTriangle
} from 'lucide-react';

export default function Devices() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { user, hasRole } = useAuth();

  const [devices, setDevices] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [canScrollDown, setCanScrollDown] = useState(false);
  const tableScrollRef = useRef(null);
  const gridScrollRef = useRef(null);

  // Filters & Search
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [osFilter, setOsFilter] = useState('all');
  const [deptFilter, setDeptFilter] = useState('all');
  const [assignedFilter, setAssignedFilter] = useState('all');
  const [viewMode, setViewMode] = useState('table'); // 'table' or 'grid'

  // Modals state
  const [enrollModalOpen, setEnrollModalOpen] = useState(searchParams.get('enroll') === 'true');
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [assignModalOpen, setAssignModalOpen] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [maintModalOpen, setMaintModalOpen] = useState(false);

  const [selectedDevice, setSelectedDevice] = useState(null);

  // Enrollment token generation state
  const [generatedToken, setGeneratedToken] = useState(null);
  const [tokenName, setTokenName] = useState('HQ Batch Enrollment');
  const [tokenMaxUses, setTokenMaxUses] = useState(10);
  const [tokenCopied, setTokenCopied] = useState(false);

  // Manual Add Device Form
  const [newDevice, setNewDevice] = useState({
    name: '',
    asset_id: '',
    manufacturer: 'Lenovo',
    model: 'ThinkPad T14 Gen 4',
    serial_number: '',
    os: 'Windows',
    os_version: 'Windows 11 Pro',
    cpu_model: 'Intel Core i7-1365U',
    ram_total_gb: 16,
    storage_total_gb: 512,
    branch: 'Headquarters',
    employee_id: '',
    department_id: '',
    purchase_price: 1500
  });

  // Assign Form
  const [assignForm, setAssignForm] = useState({
    employee_id: '',
    department_id: '',
    notes: 'Assigned from asset dashboard'
  });

  // Maintenance Form
  const [maintForm, setMaintForm] = useState({
    issue: 'Hardware diagnostics and inspection',
    priority: 'medium',
    technician: 'IT Support'
  });

  const fetchDevices = useCallback(async () => {
    try {
      const baseParams = {
        search: search.trim(),
        status: statusFilter === 'all' ? '' : statusFilter,
        os: osFilter === 'all' ? '' : osFilter,
        department_id: deptFilter === 'all' ? '' : deptFilter,
        assigned: assignedFilter === 'assigned' ? 'true' : (assignedFilter === 'unassigned' ? 'false' : ''),
        sort_by: 'last_seen',
        order: 'DESC',
        limit: 1000
      };

      // Load every page so the inventory always shows the full fleet without searching.
      let page = 1;
      let all = [];
      let totalPages = 1;

      do {
        const res = await api.get('/devices', { ...baseParams, page });
        if (!res?.success || !Array.isArray(res.data)) break;
        all = all.concat(res.data);
        totalPages = Math.max(1, Number(res.pagination?.totalPages) || 1);
        page += 1;
      } while (page <= totalPages && page <= 50);

      setDevices(all);
    } catch (err) {
      console.error('Failed to fetch devices:', err);
    } finally {
      setLoading(false);
    }
  }, [search, statusFilter, osFilter, deptFilter, assignedFilter]);

  const updateScrollHint = useCallback(() => {
    const el = viewMode === 'table' ? tableScrollRef.current : gridScrollRef.current;
    if (!el) {
      setCanScrollDown(false);
      return;
    }
    const remaining = el.scrollHeight - el.scrollTop - el.clientHeight;
    setCanScrollDown(remaining > 12);
  }, [viewMode]);

  const scrollListDown = () => {
    const el = viewMode === 'table' ? tableScrollRef.current : gridScrollRef.current;
    if (!el) return;
    el.scrollBy({ top: Math.max(220, el.clientHeight * 0.7), behavior: 'smooth' });
  };

  useEffect(() => {
    const frame = requestAnimationFrame(() => updateScrollHint());
    const el = viewMode === 'table' ? tableScrollRef.current : gridScrollRef.current;
    if (!el) {
      return () => cancelAnimationFrame(frame);
    }
    const onScroll = () => updateScrollHint();
    el.addEventListener('scroll', onScroll);
    window.addEventListener('resize', updateScrollHint);
    return () => {
      cancelAnimationFrame(frame);
      el.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', updateScrollHint);
    };
  }, [devices, viewMode, updateScrollHint]);

  const fetchDependencies = useCallback(async () => {
    try {
      const [empRes, deptRes] = await Promise.all([
        api.get('/employees'),
        api.get('/departments')
      ]);
      if (empRes?.success) {
        const list = Array.isArray(empRes.data)
          ? empRes.data
          : Array.isArray(empRes.data?.data)
            ? empRes.data.data
            : [];
        setEmployees(list);
      }
      if (deptRes?.success && Array.isArray(deptRes.data)) {
        setDepartments(deptRes.data);
      }
    } catch (e) {
      console.error('Failed to fetch employees/departments:', e);
    }
  }, []);

  useEffect(() => {
    fetchDependencies();
  }, [fetchDependencies]);

  // Keep employee list fresh when returning to this page or focusing the window
  // (e.g. after adding employees on another page/tab).
  useEffect(() => {
    const onFocus = () => fetchDependencies();
    const onVisible = () => {
      if (document.visibilityState === 'visible') fetchDependencies();
    };
    window.addEventListener('focus', onFocus);
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      window.removeEventListener('focus', onFocus);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, [fetchDependencies]);

  useEffect(() => {
    const delay = search.trim() ? 250 : 0;
    const debounce = setTimeout(() => {
      fetchDevices();
    }, delay);
    const timer = setInterval(fetchDevices, 15000);
    return () => {
      clearTimeout(debounce);
      clearInterval(timer);
    };
  }, [fetchDevices]);

  // Show every employee from the directory (same source as Employees page).
  // Only hide terminated records so inactive/on-leave staff remain assignable.
  const assignableEmployees = employees
    .filter((e) => {
      const status = String(e?.status || 'active').toLowerCase().trim();
      return status !== 'terminated';
    })
    .slice()
    .sort((a, b) => String(a.name || '').localeCompare(String(b.name || '')));

  const openAddModal = async () => {
    await fetchDependencies();
    setAddModalOpen(true);
  };

  const openAssignModal = async (dev) => {
    setSelectedDevice(dev);
    setAssignForm({
      employee_id: dev.employee_id || '',
      department_id: dev.department_id || '',
      notes: 'Reassigned via quick menu'
    });
    await fetchDependencies();
    setAssignModalOpen(true);
  };

  const handleEmployeeSelect = (employeeId, formSetter, currentForm) => {
    const emp = employees.find((e) => String(e.id) === String(employeeId));
    formSetter({
      ...currentForm,
      employee_id: employeeId,
      department_id: emp?.department_id ? String(emp.department_id) : currentForm.department_id
    });
  };

  // Handle Enrollment Token Generation
  const handleGenerateToken = async () => {
    try {
      const res = await api.post('/enrollment-tokens', {
        name: tokenName,
        max_uses: tokenMaxUses,
        expiry_days: 14
      });
      if (res.success) {
        setGeneratedToken(res.data);
      }
    } catch (err) {
      alert(err.message);
    }
  };

  // Handle Manual Device Creation
  const handleCreateDevice = async (e) => {
    e.preventDefault();
    try {
      const res = await api.post('/devices', newDevice);
      if (res.success) {
        setAddModalOpen(false);
        fetchDevices();
        alert('Device successfully created!');
      }
    } catch (err) {
      alert(err.message);
    }
  };

  // Handle Device Assignment
  const handleAssignSubmit = async (e) => {
    e.preventDefault();
    if (!selectedDevice) return;
    try {
      const res = await api.put(`/devices/${selectedDevice.id}/assign`, assignForm);
      if (res.success) {
        setAssignModalOpen(false);
        fetchDevices();
      }
    } catch (err) {
      alert(err.message);
    }
  };

  // Handle Maintenance Toggle
  const handleMaintenanceSubmit = async (e) => {
    e.preventDefault();
    if (!selectedDevice) return;
    try {
      const res = await api.put(`/devices/${selectedDevice.id}/maintenance`, maintForm);
      if (res.success) {
        setMaintModalOpen(false);
        fetchDevices();
      }
    } catch (err) {
      alert(err.message);
    }
  };

  // Deactivate Device
  const handleDeactivate = async (dev) => {
    if (!confirm(`Are you sure you want to deactivate laptop ${dev.asset_id}?`)) return;
    try {
      await api.put(`/devices/${dev.id}/deactivate`);
      fetchDevices();
    } catch (err) {
      alert(err.message);
    }
  };

  // Delete Device
  const handleDelete = async (dev) => {
    if (!confirm(`CAUTION: Permanently delete device ${dev.asset_id}? This action is irreversible.`)) return;
    try {
      await api.delete(`/devices/${dev.id}`);
      fetchDevices();
    } catch (err) {
      alert(err.message);
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Company Laptop Inventory</h1>
          <p className="text-sm text-slate-500 mt-1">
            Browse, inspect, assign, and manage all company-owned hardware assets.
          </p>
        </div>
        <div className="flex items-center gap-2.5">
          <button
            onClick={() => setEnrollModalOpen(true)}
            className="inline-flex items-center gap-2 px-3.5 py-2 text-xs font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-lg hover:bg-emerald-100 transition"
          >
            <KeyRound className="w-3.5 h-3.5" />
            Device Enrollment
          </button>
          {hasRole(['super_admin', 'it_admin']) && (
            <button
              onClick={openAddModal}
              className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold text-white bg-emerald-600 rounded-lg shadow-sm shadow-emerald-600/20 hover:bg-emerald-700 transition"
            >
              <Plus className="w-3.5 h-3.5" />
              Add Laptop
            </button>
          )}
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-sm space-y-3">
        <div className="flex flex-col md:flex-row items-center gap-3">
          {/* Search box */}
          <div className="relative flex-1 w-full">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search Asset ID, Laptop Name, Serial Number, Employee, IP..."
              className="w-full pl-9 pr-4 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
            />
          </div>

          {/* View Mode Toggle */}
          <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-lg border border-slate-200 shrink-0">
            <button
              onClick={() => setViewMode('table')}
              className={`p-1.5 rounded text-xs font-medium ${viewMode === 'table' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500'}`}
              title="Table View"
            >
              <List className="w-4 h-4" />
            </button>
            <button
              onClick={() => setViewMode('grid')}
              className={`p-1.5 rounded text-xs font-medium ${viewMode === 'grid' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500'}`}
              title="Grid View"
            >
              <LayoutGrid className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Filters dropdowns */}
        <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-5 gap-2.5 pt-2 border-t border-slate-100 text-xs">
          {/* Status Filter */}
          <div>
            <label className="block text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-1">Status</label>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full p-1.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-700 text-xs focus:outline-none focus:border-emerald-500"
            >
              <option value="all">All Statuses</option>
              <option value="online">Online (Heartbeat)</option>
              <option value="offline">Offline</option>
              <option value="maintenance">Maintenance</option>
            </select>
          </div>

          {/* OS Filter */}
          <div>
            <label className="block text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-1">Operating System</label>
            <select
              value={osFilter}
              onChange={(e) => setOsFilter(e.target.value)}
              className="w-full p-1.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-700 text-xs focus:outline-none focus:border-emerald-500"
            >
              <option value="all">All OS</option>
              <option value="Windows">Windows</option>
              <option value="macOS">macOS</option>
            </select>
          </div>

          {/* Department Filter */}
          <div>
            <label className="block text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-1">Department</label>
            <select
              value={deptFilter}
              onChange={(e) => setDeptFilter(e.target.value)}
              className="w-full p-1.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-700 text-xs focus:outline-none focus:border-emerald-500"
            >
              <option value="all">All Departments</option>
              {departments.map(d => (
                <option key={d.id} value={d.id}>{d.name} ({d.code})</option>
              ))}
            </select>
          </div>

          {/* Assigned Filter */}
          <div>
            <label className="block text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-1">Allocation</label>
            <select
              value={assignedFilter}
              onChange={(e) => setAssignedFilter(e.target.value)}
              className="w-full p-1.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-700 text-xs focus:outline-none focus:border-emerald-500"
            >
              <option value="all">All Laptops</option>
              <option value="assigned">Assigned to Employee</option>
              <option value="unassigned">Unassigned Stock Pool</option>
            </select>
          </div>

          {/* Reset Filters */}
          <div className="flex items-end">
            <button
              onClick={() => {
                setSearch('');
                setStatusFilter('all');
                setOsFilter('all');
                setDeptFilter('all');
                setAssignedFilter('all');
              }}
              className="w-full py-1.5 text-xs text-slate-500 hover:text-slate-800 bg-slate-100 hover:bg-slate-200 rounded-lg transition"
            >
              Reset Filters
            </button>
          </div>
        </div>
      </div>

      {/* ----------------- DATA PRESENTATION (TABLE OR GRID) ----------------- */}
      <div className="flex items-center justify-between gap-3">
        <p className="text-xs text-slate-500">
          Showing <span className="font-semibold text-slate-700">{devices.length}</span> laptop{devices.length === 1 ? '' : 's'}
        </p>
      </div>

      {viewMode === 'table' ? (
        <div className="relative bg-white rounded-xl border border-slate-200/80 shadow-sm overflow-hidden">
          <div
            ref={tableScrollRef}
            onScroll={updateScrollHint}
            className="max-h-[min(70vh,720px)] overflow-auto"
          >
            <table className="w-full text-left text-xs text-slate-600">
              <thead className="sticky top-0 z-10 bg-slate-50 text-[11px] font-semibold uppercase tracking-wider text-slate-400 border-b border-slate-200">
                <tr>
                  <th className="py-3 px-4">Asset ID / Name</th>
                  <th className="py-3 px-4">Serial & Model</th>
                  <th className="py-3 px-4">Employee / Dept</th>
                  <th className="py-3 px-4">OS & Arch</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4">IP & Location</th>
                  <th className="py-3 px-4">Battery</th>
                  <th className="py-3 px-4">Disk</th>
                  <th className="py-3 px-4">Last Seen</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium">
                {devices.length === 0 ? (
                  <tr>
                    <td colSpan={10} className="py-8 text-center text-slate-400">
                      No laptops found matching filter criteria.
                    </td>
                  </tr>
                ) : (
                  devices.map((dev) => (
                    <tr key={dev.id} className="hover:bg-slate-50/70 transition">
                      {/* Asset & Name */}
                      <td className="py-3 px-4">
                        <div
                          onClick={() => navigate(`/devices/${dev.id}`)}
                          className="font-mono font-bold text-slate-900 hover:text-emerald-600 cursor-pointer flex items-center gap-1.5"
                        >
                          <Laptop className="w-3.5 h-3.5 text-slate-400" />
                          {dev.asset_id}
                        </div>
                        <div className="text-[11px] text-slate-500 truncate max-w-[150px]">{dev.name}</div>
                        {dev.current_app && (
                          <div className="text-[11px] text-emerald-700 truncate max-w-[150px]">Using {dev.current_app}</div>
                        )}
                        {dev.session_state && (
                          <div className="text-[10px] text-slate-400 capitalize">Session: {dev.session_state}</div>
                        )}
                      </td>

                      {/* Serial & Model */}
                      <td className="py-3 px-4">
                        <div className="text-slate-900 truncate max-w-[140px]">{dev.model}</div>
                        <div className="text-[10px] font-mono text-slate-400">{dev.serial_number}</div>
                      </td>

                      {/* Employee / Dept */}
                      <td className="py-3 px-4">
                        {dev.employee_name ? (
                          <div>
                            <div className="font-semibold text-slate-900">{dev.employee_name}</div>
                            <div className="text-[11px] text-slate-400">{dev.department_name}</div>
                          </div>
                        ) : (
                          <span className="text-slate-400 italic text-[11px]">Unassigned Pool</span>
                        )}
                      </td>

                      {/* OS */}
                      <td className="py-3 px-4">
                        <span className="px-2 py-0.5 rounded bg-slate-100 font-mono text-[11px] text-slate-700">
                          {dev.os}
                        </span>
                        <div className="text-[10px] text-slate-400 mt-0.5">{dev.architecture}</div>
                      </td>

                      {/* Status */}
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
                          {String(dev.status || 'offline').toUpperCase()}
                        </span>
                      </td>

                      {/* IP & Location */}
                      <td className="py-3 px-4">
                        <div className="font-mono text-[11px] text-slate-700">{dev.public_ip || dev.local_ip || 'N/A'}</div>
                        <div className="text-[10px] text-slate-400 flex items-center gap-0.5">
                          <MapPin className="w-2.5 h-2.5" />
                          {dev.location_city ? `${dev.location_city}, ${dev.location_country}` : 'Headquarters'}
                        </div>
                      </td>

                      {/* Battery */}
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-1">
                          <BatteryMedium className={`w-3.5 h-3.5 ${dev.battery_percent <= 20 ? 'text-rose-500' : 'text-slate-500'}`} />
                          <span>{dev.battery_percent}%</span>
                        </div>
                        <span className="text-[10px] text-slate-400">{dev.battery_status}</span>
                      </td>

                      {/* Disk */}
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-1.5">
                          <div className="w-12 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                            <div
                              className={`h-full rounded-full ${dev.disk_usage > 90 ? 'bg-rose-500' : 'bg-emerald-500'}`}
                              style={{ width: `${Math.min(100, dev.disk_usage)}%` }}
                            />
                          </div>
                          <span className="font-mono text-[10px]">{dev.disk_usage}%</span>
                        </div>
                      </td>

                      {/* Last Seen */}
                      <td className="py-3 px-4 text-slate-500 text-[11px]">
                        {dev.last_seen ? (
                          <>
                            {formatAppDate(dev.last_seen, { year: false })}{' '}
                            {formatAppTime(dev.last_seen)}
                          </>
                        ) : (
                          '—'
                        )}
                      </td>

                      {/* Actions */}
                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={() => navigate(`/devices/${dev.id}`)}
                            title="View Profile"
                            className="p-1 text-slate-500 hover:text-emerald-600 hover:bg-slate-100 rounded transition"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                          {hasRole(['super_admin', 'it_admin']) && (
                            <>
                              <button
                                onClick={() => openAssignModal(dev)}
                                title="Assign Employee"
                                className="p-1 text-slate-500 hover:text-blue-600 hover:bg-slate-100 rounded transition"
                              >
                                <UserPlus className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => {
                                  setSelectedDevice(dev);
                                  setMaintModalOpen(true);
                                }}
                                title="Maintenance"
                                className="p-1 text-slate-500 hover:text-amber-600 hover:bg-slate-100 rounded transition"
                              >
                                <Wrench className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => handleDeactivate(dev)}
                                title="Deactivate"
                                className="p-1 text-slate-500 hover:text-rose-600 hover:bg-slate-100 rounded transition"
                              >
                                <PowerOff className="w-4 h-4" />
                              </button>
                            </>
                          )}
                          {hasRole(['super_admin']) && (
                            <button
                              onClick={() => handleDelete(dev)}
                              title="Delete"
                              className="p-1 text-slate-500 hover:text-rose-700 hover:bg-rose-50 rounded transition"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {canScrollDown && (
            <div className="pointer-events-none absolute inset-x-0 bottom-0 flex justify-center pb-3 pt-10 bg-gradient-to-t from-white via-white/90 to-transparent">
              <button
                type="button"
                onClick={scrollListDown}
                className="pointer-events-auto inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-full shadow-lg shadow-emerald-600/25 transition"
                title="Scroll down to see more devices"
              >
                <ChevronDown className="w-4 h-4" />
                Scroll down
              </button>
            </div>
          )}
        </div>
      ) : (
        /* GRID VIEW */
        <div className="relative">
          <div
            ref={gridScrollRef}
            onScroll={updateScrollHint}
            className="max-h-[min(70vh,720px)] overflow-y-auto pr-1"
          >
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {devices.map((dev) => (
                <div
                  key={dev.id}
                  className="bg-white p-5 rounded-xl border border-slate-200/80 shadow-sm hover:border-emerald-300 hover:shadow-md transition flex flex-col justify-between"
                >
                  <div>
                    <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                      <div className="flex items-center gap-2">
                        <div className="p-1.5 bg-slate-100 rounded-lg text-slate-700">
                          <Laptop className="w-4 h-4" />
                        </div>
                        <div>
                          <span className="font-mono font-bold text-slate-900 text-sm">{dev.asset_id}</span>
                          <span className="block text-[10px] text-slate-400 font-mono">{dev.serial_number}</span>
                        </div>
                      </div>
                      <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold ${
                        dev.status === 'online'
                          ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                          : dev.status === 'maintenance'
                          ? 'bg-amber-50 text-amber-700 border border-amber-200'
                          : 'bg-slate-100 text-slate-600 border border-slate-200'
                      }`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${
                          dev.status === 'online' ? 'bg-emerald-500 animate-pulse' : dev.status === 'maintenance' ? 'bg-amber-500' : 'bg-slate-400'
                        }`} />
                        {String(dev.status || 'offline').toUpperCase()}
                      </span>
                    </div>

                    <div className="mt-3 space-y-2 text-xs">
                      <div>
                        <h4 className="font-semibold text-slate-900">{dev.name}</h4>
                        <p className="text-[11px] text-slate-500">{dev.model} • {dev.os}</p>
                        {dev.current_app && (
                          <p className="text-[11px] font-semibold text-emerald-700 mt-1">Using {dev.current_app}</p>
                        )}
                      </div>

                      <div className="p-2.5 bg-slate-50 rounded-lg flex items-center justify-between">
                        <span className="text-slate-500">Assigned To:</span>
                        <span className="font-semibold text-slate-900">
                          {dev.employee_name || <span className="italic text-slate-400 font-normal">Unassigned</span>}
                        </span>
                      </div>

                      <div className="grid grid-cols-2 gap-2 text-[11px]">
                        <div className="flex items-center gap-1.5 text-slate-600">
                          <BatteryMedium className="w-3.5 h-3.5" />
                          <span>{dev.battery_percent}% ({dev.battery_status})</span>
                        </div>
                        <div className="flex items-center gap-1.5 text-slate-600">
                          <HardDrive className="w-3.5 h-3.5" />
                          <span>Disk: {dev.disk_usage}%</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between">
                    <span className="text-[10px] text-slate-400">
                      Last: {formatAppTime(dev.last_seen)}
                    </span>
                    <button
                      onClick={() => navigate(`/devices/${dev.id}`)}
                      className="text-xs font-semibold text-emerald-600 hover:text-emerald-700 flex items-center gap-1"
                    >
                      View Profile &rarr;
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {canScrollDown && (
            <div className="pointer-events-none absolute inset-x-0 bottom-0 flex justify-center pb-3 pt-10 bg-gradient-to-t from-slate-50 via-slate-50/90 to-transparent">
              <button
                type="button"
                onClick={scrollListDown}
                className="pointer-events-auto inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-full shadow-lg shadow-emerald-600/25 transition"
                title="Scroll down to see more devices"
              >
                <ChevronDown className="w-4 h-4" />
                Scroll down
              </button>
            </div>
          )}
        </div>
      )}

      {/* ----------------- ENROLLMENT TOKEN MODAL ----------------- */}
      {enrollModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white rounded-2xl shadow-2xl max-w-xl w-full p-6 border border-slate-200">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-emerald-50 text-emerald-600 rounded-lg">
                  <KeyRound className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-base text-slate-900">Device Enrollment Onboarding</h3>
                  <p className="text-xs text-slate-500">Generate secure enrollment tokens for laptop agents</p>
                </div>
              </div>
              <button onClick={() => setEnrollModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="mt-4 space-y-4">
              {!generatedToken ? (
                <div>
                  <div className="space-y-3">
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">Enrollment Batch Name</label>
                      <input
                        type="text"
                        value={tokenName}
                        onChange={(e) => setTokenName(e.target.value)}
                        placeholder="e.g. Q4 Engineering Laptop Onboarding"
                        className="w-full p-2.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:border-emerald-500"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">Maximum Device Uses</label>
                      <input
                        type="number"
                        min="1"
                        max="200"
                        value={tokenMaxUses}
                        onChange={(e) => setTokenMaxUses(e.target.value)}
                        className="w-full p-2.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:border-emerald-500"
                      />
                    </div>
                  </div>

                  <button
                    onClick={handleGenerateToken}
                    className="mt-5 w-full py-2.5 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg transition shadow-sm"
                  >
                    Generate Enrollment Token
                  </button>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="p-4 bg-emerald-50/70 border border-emerald-200 rounded-xl">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-800">Enrollment Token Active</span>
                    <div className="flex items-center justify-between mt-1">
                      <code className="text-base font-mono font-bold text-emerald-950">{generatedToken.token}</code>
                      <button
                        onClick={() => {
                          navigator.clipboard.writeText(generatedToken.token);
                          setTokenCopied(true);
                          setTimeout(() => setTokenCopied(false), 2000);
                        }}
                        className="p-1.5 bg-white text-emerald-700 rounded-lg shadow-sm border border-emerald-200 hover:bg-emerald-100 flex items-center gap-1 text-xs"
                      >
                        {tokenCopied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                        {tokenCopied ? 'Copied' : 'Copy'}
                      </button>
                    </div>
                    <p className="text-[11px] text-emerald-700 mt-2">
                      Valid for {generatedToken.max_uses} devices. Expires in {generatedToken.expiry_days} days.
                    </p>
                  </div>

                  <div className="space-y-2">
                    <span className="text-xs font-semibold text-slate-700">Quick Agent Command (Windows / macOS):</span>
                    <div className="p-3 bg-slate-900 text-slate-200 rounded-lg font-mono text-[11px] relative overflow-x-auto">
                      <code>node agent.js --server=http://localhost:5000 --token={generatedToken.token}</code>
                    </div>
                    <p className="text-[11px] text-slate-500">
                      Once executed, the agent automatically inventories the hardware, acquires a persistent device token, and begins streaming heartbeats.
                    </p>
                  </div>

                  <button
                    onClick={() => {
                      setGeneratedToken(null);
                      setEnrollModalOpen(false);
                      fetchDevices();
                    }}
                    className="w-full py-2 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition"
                  >
                    Done
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ----------------- ASSIGN MODAL ----------------- */}
      {assignModalOpen && selectedDevice && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 border border-slate-200">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="font-bold text-base text-slate-900">Assign Laptop {selectedDevice.asset_id}</h3>
              <button onClick={() => setAssignModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleAssignSubmit} className="mt-4 space-y-3.5 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Select Employee</label>
                <select
                  value={assignForm.employee_id}
                  onChange={(e) => handleEmployeeSelect(e.target.value, setAssignForm, assignForm)}
                  required
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:border-emerald-500"
                >
                  <option value="">Choose Employee...</option>
                  {assignableEmployees.map(e => (
                    <option key={e.id} value={e.id}>
                      {e.name} ({e.employee_id}) - {e.department_name || 'No Dept'}
                      {e.status && e.status !== 'active' ? ` [${e.status}]` : ''}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Select Department</label>
                <select
                  value={assignForm.department_id}
                  onChange={(e) => setAssignForm({ ...assignForm, department_id: e.target.value })}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:border-emerald-500"
                >
                  <option value="">Match Employee Department</option>
                  {departments.map(d => (
                    <option key={d.id} value={d.id}>{d.name} ({d.code})</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Assignment Notes</label>
                <input
                  type="text"
                  value={assignForm.notes}
                  onChange={(e) => setAssignForm({ ...assignForm, notes: e.target.value })}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setAssignModalOpen(false)}
                  className="flex-1 py-2 text-xs font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg shadow-sm"
                >
                  Save Assignment
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ----------------- MAINTENANCE MODAL ----------------- */}
      {maintModalOpen && selectedDevice && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 border border-slate-200">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="font-bold text-base text-slate-900">
                {selectedDevice.status === 'maintenance' ? 'Resolve Maintenance' : 'Set Maintenance Mode'}
              </h3>
              <button onClick={() => setMaintModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleMaintenanceSubmit} className="mt-4 space-y-3.5 text-xs">
              <p className="text-slate-600">
                {selectedDevice.status === 'maintenance'
                  ? `Device ${selectedDevice.asset_id} is currently in maintenance. Submitting will resolve open tickets and restore fleet operational status.`
                  : `Mark ${selectedDevice.asset_id} for maintenance and generate a technician work ticket.`}
              </p>

              {selectedDevice.status !== 'maintenance' && (
                <>
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Reported Issue</label>
                    <input
                      type="text"
                      value={maintForm.issue}
                      onChange={(e) => setMaintForm({ ...maintForm, issue: e.target.value })}
                      required
                      className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:border-emerald-500"
                    />
                  </div>
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Priority</label>
                    <select
                      value={maintForm.priority}
                      onChange={(e) => setMaintForm({ ...maintForm, priority: e.target.value })}
                      className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg"
                    >
                      <option value="low">Low</option>
                      <option value="medium">Medium</option>
                      <option value="high">High</option>
                      <option value="critical">Critical</option>
                    </select>
                  </div>
                </>
              )}

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setMaintModalOpen(false)}
                  className="flex-1 py-2 text-xs font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2 text-xs font-semibold text-white bg-amber-600 hover:bg-amber-700 rounded-lg shadow-sm"
                >
                  Confirm Change
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ----------------- MANUAL ADD LAPTOP MODAL ----------------- */}
      {addModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full p-6 border border-slate-200 my-8">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="font-bold text-base text-slate-900">Add Company Laptop Manually</h3>
              <button onClick={() => setAddModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleCreateDevice} className="mt-4 space-y-3.5 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Laptop Friendly Name</label>
                  <input
                    type="text"
                    required
                    value={newDevice.name}
                    onChange={(e) => setNewDevice({ ...newDevice, name: e.target.value })}
                    placeholder="e.g. Finance Team ThinkPad"
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:border-emerald-500"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Asset ID (Optional)</label>
                  <input
                    type="text"
                    value={newDevice.asset_id}
                    onChange={(e) => setNewDevice({ ...newDevice, asset_id: e.target.value })}
                    placeholder="Auto-generated e.g. SG-LAP-016"
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Manufacturer</label>
                  <input
                    type="text"
                    required
                    value={newDevice.manufacturer}
                    onChange={(e) => setNewDevice({ ...newDevice, manufacturer: e.target.value })}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Model</label>
                  <input
                    type="text"
                    required
                    value={newDevice.model}
                    onChange={(e) => setNewDevice({ ...newDevice, model: e.target.value })}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Serial Number</label>
                  <input
                    type="text"
                    required
                    value={newDevice.serial_number}
                    onChange={(e) => setNewDevice({ ...newDevice, serial_number: e.target.value })}
                    placeholder="e.g. LNV-99821-X"
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">OS</label>
                  <select
                    value={newDevice.os}
                    onChange={(e) => setNewDevice({ ...newDevice, os: e.target.value })}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg"
                  >
                    <option value="Windows">Windows</option>
                    <option value="macOS">macOS</option>
                  </select>
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">RAM (GB)</label>
                  <input
                    type="number"
                    value={newDevice.ram_total_gb}
                    onChange={(e) => setNewDevice({ ...newDevice, ram_total_gb: e.target.value })}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Storage (GB)</label>
                  <input
                    type="number"
                    value={newDevice.storage_total_gb}
                    onChange={(e) => setNewDevice({ ...newDevice, storage_total_gb: e.target.value })}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Assign to Employee</label>
                  <select
                    value={newDevice.employee_id}
                    onChange={(e) => handleEmployeeSelect(e.target.value, setNewDevice, newDevice)}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg"
                  >
                    <option value="">Leave in Stock Pool</option>
                    {assignableEmployees.map(e => (
                      <option key={e.id} value={e.id}>
                        {e.name} ({e.employee_id})
                        {e.department_name ? ` - ${e.department_name}` : ''}
                        {e.status && e.status !== 'active' ? ` [${e.status}]` : ''}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Department</label>
                  <select
                    value={newDevice.department_id}
                    onChange={(e) => setNewDevice({ ...newDevice, department_id: e.target.value })}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg"
                  >
                    <option value="">Select Department</option>
                    {departments.map(d => (
                      <option key={d.id} value={d.id}>{d.name} ({d.code})</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="flex gap-2 pt-3">
                <button
                  type="button"
                  onClick={() => setAddModalOpen(false)}
                  className="flex-1 py-2.5 text-xs font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg shadow-sm"
                >
                  Create Device Record
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
