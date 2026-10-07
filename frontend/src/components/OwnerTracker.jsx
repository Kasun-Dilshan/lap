import { useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';
import { collectTrackingSample, savedLaptopId } from '../services/laptopSnapshot';

export default function OwnerTracker() {
  const { user } = useAuth();
  const tracking = user?.portal === 'owner' || user?.role === 'laptop_owner';

  useEffect(() => {
    if (!tracking) return undefined;

    let stopped = false;

    async function send(extra = {}) {
      const deviceId = savedLaptopId();
      if (!deviceId || stopped) return;
      try {
        const sample = extra.event === 'session_end'
          ? { device_id: deviceId, event: 'session_end', track_apps: false, session_state: 'logged_off' }
          : await collectTrackingSample(deviceId);
        if (stopped) return;
        await api.post('/owner/track', { ...sample, ...extra });
      } catch {
        // Next interval retries. Login already created the device record.
      }
    }

    send();
    const timer = setInterval(send, 20000);
    // Browser tab hide is not a Windows lock — only refresh activity on focus.
    const onFocus = () => send({ session_state: 'active' });
    window.addEventListener('focus', onFocus);

    return () => {
      stopped = true;
      clearInterval(timer);
      window.removeEventListener('focus', onFocus);
    };
  }, [tracking, user?.email]);

  return null;
}
