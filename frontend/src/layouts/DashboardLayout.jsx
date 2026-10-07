import React, { useState, useEffect, useRef } from 'react';
import { NavLink, Outlet, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';
import { formatAppTime } from '../utils/datetime';
import {
  LayoutDashboard,
  Laptop,
  Activity,
  Users,
  Building2,
  Wrench,
  AlertTriangle,
  FileBarChart2,
  ScrollText,
  Settings,
  Search,
  Bell,
  LogOut,
  ShieldCheck,
  Menu,
  X,
  ExternalLink,
  CheckCircle2,
  ChevronDown
} from 'lucide-react';

export default function DashboardLayout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  
  // Global search state
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [searchOpen, setSearchOpen] = useState(false);
  const searchRef = useRef(null);

  // Notification state
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [notifOpen, setNotifOpen] = useState(false);
  const notifRef = useRef(null);

  // Profile dropdown state
  const [profileOpen, setProfileOpen] = useState(false);
  const profileRef = useRef(null);

  // Fetch notifications
  useEffect(() => {
    async function fetchNotifs() {
      try {
        const res = await api.get('/notifications');
        if (res.success) {
          setNotifications(res.data);
          setUnreadCount(res.unread_count || 0);
        }
      } catch (err) {}
    }
    fetchNotifs();
    const interval = setInterval(fetchNotifs, 20000);
    return () => clearInterval(interval);
  }, []);

  // Global search trigger
  useEffect(() => {
    if (!searchQuery.trim()) {
      setSearchResults([]);
      setSearchOpen(false);
      return;
    }
    const timer = setTimeout(async () => {
      try {
        const res = await api.get('/devices', { search: searchQuery, limit: 5 });
        if (res.success) {
          setSearchResults(res.data);
          setSearchOpen(true);
        }
      } catch (e) {}
    }, 250);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Click outside listener
  useEffect(() => {
    function handleClickOutside(event) {
      if (searchRef.current && !searchRef.current.contains(event.target)) {
        setSearchOpen(false);
      }
      if (notifRef.current && !notifRef.current.contains(event.target)) {
        setNotifOpen(false);
      }
      if (profileRef.current && !profileRef.current.contains(event.target)) {
        setProfileOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Close mobile drawer on route change
  useEffect(() => {
    setMobileMenuOpen(false);
  }, [location.pathname]);

  const markAllRead = async () => {
    try {
      await api.put('/notifications/read-all');
      setNotifications(prev => prev.map(n => ({ ...n, is_read: 1 })));
      setUnreadCount(0);
    } catch (e) {}
  };

  const isOwner = user?.portal === 'owner' || user?.role === 'laptop_owner';

  useEffect(() => {
    if (isOwner && location.pathname !== '/my-laptop') {
      navigate('/my-laptop', { replace: true });
    }
  }, [isOwner, location.pathname, navigate]);

  const navItems = isOwner
    ? [{ name: 'My Laptop', path: '/my-laptop', icon: Laptop }]
    : [
    { name: 'Dashboard', path: '/', icon: LayoutDashboard },
    { name: 'Devices', path: '/devices', icon: Laptop },
    { name: 'Work Activity', path: '/activity', icon: Activity },
    { name: 'Employees', path: '/employees', icon: Users },
    { name: 'Departments', path: '/departments', icon: Building2 },
    { name: 'Maintenance', path: '/maintenance', icon: Wrench },
    { name: 'Alerts', path: '/alerts', icon: AlertTriangle },
    { name: 'Reports', path: '/reports', icon: FileBarChart2 },
    { name: 'Audit Logs', path: '/audit-logs', icon: ScrollText },
    { name: 'Settings', path: '/settings', icon: Settings },
  ];

  const getRoleBadge = (role) => {
    if (isOwner) {
      return { label: 'Laptop Owner', bg: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30' };
    }
    switch (role) {
      case 'super_admin': return { label: 'Super Admin', bg: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30' };
      case 'it_admin': return { label: 'IT Admin', bg: 'bg-blue-500/10 text-blue-400 border-blue-500/30' };
      case 'manager': return { label: 'Manager', bg: 'bg-amber-500/10 text-amber-400 border-amber-500/30' };
      case 'laptop_owner': return { label: 'Laptop Owner', bg: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30' };
      default: return isOwner
        ? { label: 'Laptop Owner', bg: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30' }
        : { label: 'Viewer', bg: 'bg-slate-500/10 text-slate-400 border-slate-500/30' };
    }
  };

  const roleBadge = getRoleBadge(user?.role);

  return (
    <div className="flex min-h-screen bg-slate-50 font-sans text-slate-900">
      {/* ------------------- DESKTOP SIDEBAR ------------------- */}
      <aside className="hidden lg:flex lg:w-64 flex-col bg-slate-950 text-slate-300 border-r border-slate-800 select-none shrink-0">
        {/* Brand */}
        <div className="h-16 flex items-center px-6 gap-3 border-b border-slate-800/80 bg-slate-950/60">
          <div className="w-9 h-9 rounded-lg bg-emerald-500 flex items-center justify-center shadow-lg shadow-emerald-500/20 text-slate-950 font-black">
            <Laptop className="w-5 h-5 text-slate-950 stroke-[2.5]" />
          </div>
          <div>
            <span className="font-bold tracking-tight text-white text-base">Apex CLTMS</span>
            <span className="block text-[11px] font-medium text-emerald-400 uppercase tracking-wider">Asset Fleet Hub</span>
          </div>
        </div>

        {/* Navigation Links */}
        <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
          <div className="px-3 pb-2 text-[11px] font-semibold tracking-wider text-slate-500 uppercase">
            Asset Management
          </div>
          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.path}
                to={item.path}
                end={item.path === '/'}
                className={({ isActive }) =>
                  `flex items-center gap-3 px-3.5 py-2.5 rounded-lg text-sm font-medium transition-all duration-150 ${
                    isActive
                      ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/30 font-semibold'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
                  }`
                }
              >
                <Icon className="w-4 h-4 shrink-0" />
                <span>{item.name}</span>
              </NavLink>
            );
          })}
        </nav>

        {/* User Card at Bottom of Sidebar */}
        <div className="p-3 border-t border-slate-800/80 bg-slate-950/80">
          <div className="flex items-center gap-3 px-3 py-2.5 rounded-lg bg-slate-900/80 border border-slate-800">
            <div className="w-8 h-8 rounded-full bg-emerald-700/40 border border-emerald-500/30 text-emerald-300 flex items-center justify-center font-bold text-xs uppercase shrink-0">
              {user?.name?.slice(0, 2) || 'AD'}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-xs font-semibold text-white truncate">{user?.name || 'Administrator'}</p>
              <p className="text-[11px] text-slate-400 truncate">{user?.email}</p>
            </div>
            <button
              onClick={logout}
              title="Sign Out"
              className="text-slate-400 hover:text-rose-400 p-1 rounded transition"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </aside>

      {/* ------------------- MOBILE DRAWER ------------------- */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-50 flex lg:hidden">
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={() => setMobileMenuOpen(false)} />
          <div className="relative flex-1 flex flex-col max-w-xs w-full bg-slate-950 text-slate-300">
            <div className="flex items-center justify-between h-16 px-6 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <Laptop className="w-5 h-5 text-emerald-400" />
                <span className="font-bold text-white">Apex CLTMS</span>
              </div>
              <button onClick={() => setMobileMenuOpen(false)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>
            <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
              {navItems.map((item) => {
                const Icon = item.icon;
                return (
                  <NavLink
                    key={item.path}
                    to={item.path}
                    end={item.path === '/'}
                    className={({ isActive }) =>
                      `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium ${
                        isActive ? 'bg-emerald-600 text-white font-semibold' : 'text-slate-400 hover:bg-slate-900'
                      }`
                    }
                  >
                    <Icon className="w-4 h-4" />
                    <span>{item.name}</span>
                  </NavLink>
                );
              })}
            </nav>
          </div>
        </div>
      )}

      {/* ------------------- MAIN CONTENT AREA ------------------- */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* TOP BAR */}
        <header className="h-16 bg-white border-b border-slate-200/90 flex items-center justify-between px-4 sm:px-8 shrink-0 z-30">
          <div className="flex items-center gap-3 flex-1 max-w-lg">
            <button
              onClick={() => setMobileMenuOpen(true)}
              className="lg:hidden p-2 text-slate-600 hover:text-slate-900 rounded-lg hover:bg-slate-100"
            >
              <Menu className="w-5 h-5" />
            </button>

            {/* Dynamic Global Search */}
            <div className="relative w-full" ref={searchRef}>
              <div className="relative">
                <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onFocus={() => { if (searchResults.length > 0) setSearchOpen(true); }}
                  placeholder="Global search: Asset ID, Laptop, Serial, Employee, IP..."
                  className="w-full pl-9 pr-4 py-2 bg-slate-100/80 border border-slate-200 text-slate-800 placeholder-slate-400 text-sm rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition"
                />
              </div>

              {/* Search Dropdown Results */}
              {searchOpen && searchResults.length > 0 && (
                <div className="absolute left-0 right-0 top-full mt-2 bg-white rounded-xl shadow-xl border border-slate-200 p-2 z-50 overflow-hidden animate-in fade-in slide-in-from-top-1">
                  <div className="px-3 py-1.5 text-xs font-semibold uppercase tracking-wider text-slate-400">
                    Matching Laptops ({searchResults.length})
                  </div>
                  <div className="divide-y divide-slate-100">
                    {searchResults.map((dev) => (
                      <div
                        key={dev.id}
                        onClick={() => {
                          navigate(`/devices/${dev.id}`);
                          setSearchOpen(false);
                          setSearchQuery('');
                        }}
                        className="px-3 py-2.5 hover:bg-emerald-50/60 rounded-lg cursor-pointer transition flex items-center justify-between"
                      >
                        <div className="flex items-center gap-2.5">
                          <span className={`w-2 h-2 rounded-full ${dev.status === 'online' ? 'bg-emerald-500' : 'bg-slate-400'}`} />
                          <div>
                            <div className="text-xs font-bold text-slate-900 flex items-center gap-2">
                              <span>{dev.asset_id}</span>
                              <span className="text-slate-400 font-normal">|</span>
                              <span className="font-medium text-slate-700">{dev.name}</span>
                            </div>
                            <div className="text-[11px] text-slate-500">
                              {dev.model} • {dev.employee_name ? `Assigned to ${dev.employee_name}` : 'Unassigned Pool'}
                            </div>
                          </div>
                        </div>
                        <span className="text-[11px] font-mono bg-slate-100 px-2 py-0.5 rounded text-slate-600">
                          {dev.os}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Right Action Icons: Notifications, Profile, Role */}
          <div className="flex items-center gap-3">
            {/* Role Badge */}
            <span className={`hidden sm:inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded-full border ${roleBadge.bg}`}>
              <ShieldCheck className="w-3.5 h-3.5" />
              {roleBadge.label}
            </span>

            {/* Notifications Menu */}
            <div className="relative" ref={notifRef}>
              <button
                onClick={() => setNotifOpen(!notifOpen)}
                className="relative p-2 text-slate-600 hover:text-slate-900 rounded-lg hover:bg-slate-100 transition"
              >
                <Bell className="w-5 h-5" />
                {unreadCount > 0 && (
                  <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-rose-500 ring-2 ring-white animate-pulse" />
                )}
              </button>

              {notifOpen && (
                <div className="absolute right-0 top-full mt-2 w-80 sm:w-96 bg-white rounded-xl shadow-2xl border border-slate-200 p-3 z-50">
                  <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                    <span className="font-semibold text-sm text-slate-900">Notifications ({unreadCount})</span>
                    {unreadCount > 0 && (
                      <button onClick={markAllRead} className="text-xs font-medium text-emerald-600 hover:text-emerald-700">
                        Mark all read
                      </button>
                    )}
                  </div>
                  <div className="max-h-80 overflow-y-auto divide-y divide-slate-100 mt-2">
                    {notifications.length === 0 ? (
                      <div className="py-6 text-center text-xs text-slate-400">No active notifications</div>
                    ) : (
                      notifications.map(n => (
                        <div
                          key={n.id}
                          onClick={() => {
                            if (n.link) navigate(n.link);
                            setNotifOpen(false);
                          }}
                          className={`p-2.5 hover:bg-slate-50 rounded-lg cursor-pointer transition ${n.is_read ? 'opacity-60' : 'bg-slate-50/50'}`}
                        >
                          <div className="flex items-center justify-between text-xs">
                            <span className="font-semibold text-slate-900">{n.title}</span>
                            <span className="text-[10px] text-slate-400">{formatAppTime(n.created_at)}</span>
                          </div>
                          <p className="text-xs text-slate-600 mt-1 line-clamp-2">{n.message}</p>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Profile Dropdown */}
            <div className="relative" ref={profileRef}>
              <button
                onClick={() => setProfileOpen(!profileOpen)}
                className="flex items-center gap-2 p-1.5 rounded-lg hover:bg-slate-100 transition"
              >
                <div className="w-8 h-8 rounded-full bg-emerald-600 text-white font-semibold flex items-center justify-center text-xs">
                  {user?.name?.slice(0, 2) || 'AD'}
                </div>
                <ChevronDown className="w-4 h-4 text-slate-500" />
              </button>

              {profileOpen && (
                <div className="absolute right-0 top-full mt-2 w-56 bg-white rounded-xl shadow-xl border border-slate-200 p-2 z-50">
                  <div className="px-3 py-2 border-b border-slate-100 mb-1">
                    <p className="text-sm font-semibold text-slate-900 truncate">{user?.name}</p>
                    <p className="text-xs text-slate-500 truncate">{user?.email}</p>
                  </div>
                  <button
                    onClick={() => { navigate('/settings'); setProfileOpen(false); }}
                    className="w-full text-left px-3 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50 rounded-lg flex items-center gap-2"
                  >
                    <Settings className="w-3.5 h-3.5 text-slate-400" /> Settings & System
                  </button>
                  <button
                    onClick={logout}
                    className="w-full text-left px-3 py-2 text-xs font-medium text-rose-600 hover:bg-rose-50 rounded-lg flex items-center gap-2"
                  >
                    <LogOut className="w-3.5 h-3.5 text-rose-500" /> Sign Out
                  </button>
                </div>
              )}
            </div>
          </div>
        </header>

        {/* Content Body */}
        <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8 bg-slate-50/70">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
