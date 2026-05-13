import api from '../api';

const SESSION_KEY = 'roomradar:usage-session:v1';
const LAST_PAGE_VIEW_KEY = 'roomradar:last-page-view:v1';

const createSessionId = () => {
  if (typeof window === 'undefined') return '';
  if (window.crypto?.randomUUID) return window.crypto.randomUUID();
  return `rr-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
};

export const getUsageSessionId = () => {
  if (typeof window === 'undefined') return '';

  try {
    const existing = window.sessionStorage.getItem(SESSION_KEY);
    if (existing) return existing;

    const nextSessionId = createSessionId();
    window.sessionStorage.setItem(SESSION_KEY, nextSessionId);
    return nextSessionId;
  } catch (error) {
    return createSessionId();
  }
};

const getDeviceType = () => {
  if (typeof window === 'undefined') return 'unknown';

  const userAgent = window.navigator?.userAgent || '';
  const width = window.innerWidth || 0;
  if (/ipad|tablet|playbook|silk/i.test(userAgent) || (width >= 640 && width <= 1024 && /mobile/i.test(userAgent))) {
    return 'tablet';
  }
  if (/mobi|android|iphone|ipod/i.test(userAgent) || width < 640) return 'mobile';
  if (width >= 1024) return 'desktop';
  return 'unknown';
};

const isStandaloneApp = () => {
  if (typeof window === 'undefined') return false;
  return Boolean(
    window.matchMedia?.('(display-mode: standalone)').matches
    || window.navigator?.standalone
  );
};

const getSource = (device, standalone) => {
  if (standalone) return 'pwa';
  if (device === 'mobile' || device === 'tablet') return 'mobile_web';
  if (device === 'desktop') return 'desktop_web';
  return 'web';
};

const getActiveRole = (fallbackRole) => {
  if (fallbackRole) return fallbackRole;
  try {
    return window.localStorage.getItem('activeRole') || undefined;
  } catch (error) {
    return undefined;
  }
};

const shouldSkipDuplicatePageView = (path) => {
  if (typeof window === 'undefined' || !path) return false;

  try {
    const previous = JSON.parse(window.sessionStorage.getItem(LAST_PAGE_VIEW_KEY) || '{}');
    const now = Date.now();
    if (previous.path === path && now - Number(previous.time || 0) < 4000) return true;
    window.sessionStorage.setItem(LAST_PAGE_VIEW_KEY, JSON.stringify({ path, time: now }));
  } catch (error) {
    return false;
  }

  return false;
};

export const trackUsageEvent = (eventType, options = {}) => {
  if (typeof window === 'undefined') return;

  const path = options.path || `${window.location.pathname}${window.location.search || ''}`;
  if (eventType === 'page_view' && shouldSkipDuplicatePageView(path)) return;

  const device = getDeviceType();
  const standalone = isStandaloneApp();
  const payload = {
    eventType,
    sessionId: getUsageSessionId(),
    path,
    role: getActiveRole(options.role),
    source: getSource(device, standalone),
    isStandalone: standalone,
    device,
    metadata: {
      ...(options.metadata || {}),
      referrer: eventType === 'session_start' ? document.referrer || undefined : undefined,
    },
  };

  api.post('/usage/event', payload).catch(() => {
    // Analytics should never interrupt browsing, booking, or hosting flows.
  });
};
