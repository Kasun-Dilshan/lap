import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { collectLaptopSnapshot } from '../services/laptopSnapshot';
import {
  Laptop,
  Lock,
  Mail,
  ShieldCheck,
  AlertCircle,
  ArrowRight,
  UserCheck
} from 'lucide-react';

export default function Login() {
  const navigate = useNavigate();
  const { login } = useAuth();

  const [mode, setMode] = useState('admin');
  const [email, setEmail] = useState('admin@company.com');
  const [password, setPassword] = useState('Admin@123456');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState('');
  const [forgotMsg, setForgotMsg] = useState('');

  const switchMode = (next) => {
    setMode(next);
    setError('');
    setForgotMsg('');
    setStatus('');
    if (next === 'owner') {
      setEmail('alex.rivera@company.com');
      setPassword('Owner@123456');
    } else {
      setEmail('admin@company.com');
      setPassword('Admin@123456');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setForgotMsg('');
    setLoading(true);

    try {
      if (mode === 'owner') {
        setStatus('Reading this laptop...');
        const laptop = await collectLaptopSnapshot();
        setStatus('Saving laptop and installing Node.js + tracking agent...');
        const user = await login(email, password, { portal: 'owner', laptop });
        navigate(user?.portal === 'owner' ? '/my-laptop' : '/');
      } else {
        setStatus('');
        const user = await login(email, password, { portal: 'admin' });
        navigate(user?.portal === 'owner' ? '/my-laptop' : '/');
      }
    } catch (err) {
      setError(err.message || 'Login failed');
    } finally {
      setLoading(false);
      setStatus('');
    }
  };

  const handleQuickFill = (demoEmail, demoPass) => {
    setEmail(demoEmail);
    setPassword(demoPass);
    setError('');
    setForgotMsg('');
  };

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col justify-center items-center p-4 relative overflow-hidden select-none">
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[350px] bg-emerald-500/10 blur-[120px] rounded-full pointer-events-none" />
      <div className="absolute bottom-0 right-0 w-[500px] h-[250px] bg-blue-500/5 blur-[100px] rounded-full pointer-events-none" />

      <div className="max-w-md w-full relative z-10 space-y-6">
        <div className="text-center space-y-2">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-emerald-500 shadow-xl shadow-emerald-500/20 text-slate-950 mx-auto">
            <Laptop className="w-8 h-8 stroke-[2.5]" />
          </div>
          <h1 className="text-2xl font-black text-white tracking-tight">Apex Enterprise CLTMS</h1>
          <p className="text-xs text-slate-400">
            Company Laptop Tracking & Management System
          </p>
        </div>

        <div className="bg-slate-900/90 border border-slate-800/80 rounded-2xl p-6 sm:p-8 shadow-2xl backdrop-blur-xl">
          <div className="grid grid-cols-2 gap-2 p-1 mb-5 bg-slate-950 border border-slate-800 rounded-xl">
            <button
              type="button"
              onClick={() => switchMode('admin')}
              className={`py-2 rounded-lg text-xs font-bold transition ${
                mode === 'admin' ? 'bg-emerald-500 text-slate-950' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Admin Portal
            </button>
            <button
              type="button"
              onClick={() => switchMode('owner')}
              className={`py-2 rounded-lg text-xs font-bold transition inline-flex items-center justify-center gap-1.5 ${
                mode === 'owner' ? 'bg-emerald-500 text-slate-950' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <UserCheck className="w-3.5 h-3.5" />
              Laptop Owner
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {mode === 'owner' && (
              <p className="text-[11px] leading-relaxed text-slate-400">
                Owner sign-in saves this laptop, then installs Node.js 18+ (if needed) and the tracking agent so it runs at every Windows sign-in. Only IT administrators can remove the agent. Fleet online/offline status is not changed by this login.
              </p>
            )}

            {error && (
              <div className="p-3 bg-rose-500/10 border border-rose-500/30 rounded-xl flex items-center gap-2.5 text-rose-400 text-xs">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            {forgotMsg && (
              <div className="p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-xl text-emerald-400 text-xs">
                {forgotMsg}
              </div>
            )}

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                {mode === 'owner' ? 'Owner Email' : 'Corporate Email'}
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder={mode === 'owner' ? 'alex.rivera@company.com' : 'admin@company.com'}
                  className="w-full pl-10 pr-4 py-2.5 text-xs bg-slate-950 border border-slate-800 text-slate-100 placeholder-slate-600 rounded-xl focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition"
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-xs font-semibold text-slate-300">
                  Password
                </label>
                <button
                  type="button"
                  onClick={() => setForgotMsg('Password reset instructions forwarded to IT Super Administrator.')}
                  className="text-[11px] text-emerald-400 hover:text-emerald-300"
                >
                  Forgot Password?
                </button>
              </div>
              <div className="relative">
                <Lock className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" />
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••••••"
                  className="w-full pl-10 pr-4 py-2.5 text-xs bg-slate-950 border border-slate-800 text-slate-100 placeholder-slate-600 rounded-xl focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full mt-2 py-2.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs rounded-xl shadow-lg shadow-emerald-500/20 transition flex items-center justify-center gap-2"
            >
              {loading ? (
                status || 'Authenticating...'
              ) : mode === 'owner' ? (
                <>
                  <span>Sign In and Track This Laptop</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              ) : (
                <>
                  <span>Sign In to Admin Portal</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          {mode === 'admin' ? (
            <div className="mt-6 pt-5 border-t border-slate-800/80">
              <span className="block text-[11px] font-semibold text-slate-500 uppercase tracking-wider text-center mb-2.5">
                Instant Demo Role Switcher
              </span>
              <div className="grid grid-cols-2 gap-2 text-[11px]">
                <button
                  type="button"
                  onClick={() => handleQuickFill('admin@company.com', 'Admin@123456')}
                  className="p-2 bg-slate-950 hover:bg-slate-800 border border-slate-800 rounded-lg text-slate-300 text-left transition"
                >
                  <span className="font-bold text-emerald-400 block">Super Admin</span>
                  <span className="text-[10px] text-slate-500">Full IT Privileges</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleQuickFill('itadmin@company.com', 'ItAdmin@123456')}
                  className="p-2 bg-slate-950 hover:bg-slate-800 border border-slate-800 rounded-lg text-slate-300 text-left transition"
                >
                  <span className="font-bold text-blue-400 block">IT Admin</span>
                  <span className="text-[10px] text-slate-500">Fleet Operations</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleQuickFill('manager@company.com', 'Manager@123456')}
                  className="p-2 bg-slate-950 hover:bg-slate-800 border border-slate-800 rounded-lg text-slate-300 text-left transition"
                >
                  <span className="font-bold text-amber-400 block">Manager</span>
                  <span className="text-[10px] text-slate-500">View & Reports</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleQuickFill('viewer@company.com', 'Viewer@123456')}
                  className="p-2 bg-slate-950 hover:bg-slate-800 border border-slate-800 rounded-lg text-slate-300 text-left transition"
                >
                  <span className="font-bold text-slate-400 block">Viewer</span>
                  <span className="text-[10px] text-slate-500">Read-Only Access</span>
                </button>
              </div>
            </div>
          ) : (
            <div className="mt-6 pt-5 border-t border-slate-800/80">
              <button
                type="button"
                onClick={() => handleQuickFill('alex.rivera@company.com', 'Owner@123456')}
                className="w-full p-2 bg-slate-950 hover:bg-slate-800 border border-slate-800 rounded-lg text-slate-300 text-left transition text-[11px]"
              >
                <span className="font-bold text-emerald-400 block">Demo Laptop Owner</span>
                <span className="text-[10px] text-slate-500">alex.rivera@company.com · Owner@123456</span>
              </button>
            </div>
          )}
        </div>

        <div className="text-center text-[11px] text-slate-500 space-y-1">
          <p className="flex items-center justify-center gap-1.5 text-slate-400 font-medium">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
            Legitimate IT Asset Management Only
          </p>
          <p className="max-w-xs mx-auto text-[10px]">
            Strictly limited to company-owned hardware monitoring. Zero keystroke logging, webcam access, or invasive user surveillance.
          </p>
        </div>
      </div>
    </div>
  );
}
