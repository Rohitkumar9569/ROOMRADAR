import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { trackUsageEvent } from '../../utils/usageAnalytics';

const UsageAnalyticsTracker = () => {
  const location = useLocation();
  const { activeRole, user } = useAuth();

  useEffect(() => {
    trackUsageEvent('session_start', {
      role: activeRole,
      metadata: { signedIn: Boolean(user?._id) },
    });

    const standalone = window.matchMedia?.('(display-mode: standalone)').matches || window.navigator?.standalone;
    if (standalone) {
      trackUsageEvent('app_open', { role: activeRole });
    }
  }, []);

  useEffect(() => {
    trackUsageEvent('page_view', {
      role: activeRole,
      path: `${location.pathname}${location.search || ''}`,
      metadata: { signedIn: Boolean(user?._id) },
    });
  }, [activeRole, location.pathname, location.search, user?._id]);

  useEffect(() => {
    const handleInstall = () => trackUsageEvent('pwa_install', { role: activeRole });
    window.addEventListener('roomradar:pwa-installed', handleInstall);
    return () => window.removeEventListener('roomradar:pwa-installed', handleInstall);
  }, [activeRole]);

  useEffect(() => {
    const intervalId = window.setInterval(() => {
      if (document.visibilityState === 'visible') {
        trackUsageEvent('heartbeat', { role: activeRole });
      }
    }, 60 * 1000);

    return () => window.clearInterval(intervalId);
  }, [activeRole]);

  return null;
};

export default UsageAnalyticsTracker;
