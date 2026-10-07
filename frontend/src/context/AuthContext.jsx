import React, { createContext, useContext, useState, useEffect } from 'react';
import { api } from '../services/api';
import { installTrackingAgent } from '../services/laptopSnapshot';

const AuthContext = createContext(null);

function readSavedUser() {
  try {
    const saved = localStorage.getItem('user');
    if (!saved) return null;
    const parsed = JSON.parse(saved);
    return parsed && typeof parsed === 'object' ? parsed : null;
  } catch {
    localStorage.removeItem('user');
    return null;
  }
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(readSavedUser);
  const [token, setToken] = useState(() => localStorage.getItem('token'));
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function verifyUser() {
      if (token) {
        try {
          const res = await api.get('/auth/me');
          if (res.success && res.data) {
            const portal = localStorage.getItem('portal') || (res.data.role === 'laptop_owner' ? 'owner' : 'admin');
            const next = { ...res.data, portal };
            setUser(next);
            localStorage.setItem('user', JSON.stringify(next));
          }
        } catch (err) {
          console.warn('[AuthContext] Session invalid, signing out.');
          logout();
        }
      }
      setLoading(false);
    }
    verifyUser();
  }, [token]);

  const login = async (email, password, extra = {}) => {
    const requestedOwner = extra.portal === 'owner';
    const res = await api.post(
      requestedOwner ? '/auth/owner-login' : '/auth/login',
      requestedOwner ? { email, password, laptop: extra.laptop || {} } : { email, password }
    );
    if (res.success && res.data) {
      const { token: newToken, user: newUser, device } = res.data;
      const portal = newUser.role === 'laptop_owner' || requestedOwner ? 'owner' : 'admin';
      const sessionUser = { ...newUser, portal };
      localStorage.setItem('token', newToken);
      localStorage.setItem('user', JSON.stringify(sessionUser));
      localStorage.setItem('portal', portal);
      if (device?.device_id) {
        localStorage.setItem('cltms_laptop_id', String(device.device_id));
      }
      if (device?.id) {
        localStorage.setItem('cltms_laptop_db_id', String(device.id));
      }
      setToken(newToken);
      setUser(sessionUser);
      if (portal === 'owner') {
        try {
          await installTrackingAgent({
            token: newToken,
            agentInstall: res.data.agent_install,
            laptop: extra.laptop
          });
        } catch {
          // Banner on My Laptop shows setup status.
        }
      }
      return sessionUser;
    }
    throw new Error(res.message || 'Authentication failed');
  };

  const logout = () => {
    const portal = localStorage.getItem('portal');
    const currentToken = localStorage.getItem('token');
    const deviceId = localStorage.getItem('cltms_laptop_id');
    if (portal === 'owner' && currentToken && deviceId) {
      fetch('/api/owner/track', {
        method: 'POST',
        keepalive: true,
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${currentToken}`
        },
        body: JSON.stringify({ device_id: deviceId, event: 'session_end', track_apps: false, session_state: 'logged_off' })
      }).catch(() => {});
    }
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    localStorage.removeItem('portal');
    setToken(null);
    setUser(null);
  };

  const hasRole = (allowedRoles) => {
    if (!user) return false;
    return allowedRoles.includes(user.role);
  };

  return (
    <AuthContext.Provider value={{ user, token, loading, login, logout, hasRole }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within an AuthProvider');
  return ctx;
}
