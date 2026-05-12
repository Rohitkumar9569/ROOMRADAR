const ICON_URL = '/pwa-icon.svg';
const BADGE_URL = '/pwa-maskable.svg';
const PERMISSION_PROMPT_KEY = 'roomradar:notification-permission-prompted';

const cleanText = (value, fallback = '') => {
  const text = String(value || fallback).replace(/\s+/g, ' ').trim();
  return text.length > 160 ? `${text.slice(0, 157)}...` : text;
};

const getAbsolutePath = (url = '/') => {
  try {
    const parsed = new URL(url, window.location.origin);
    return `${parsed.pathname}${parsed.search}${parsed.hash}`;
  } catch (error) {
    return '/';
  }
};

export const canUseBrowserNotifications = () => (
  typeof window !== 'undefined' &&
  typeof Notification !== 'undefined'
);

export const requestRoomRadarNotificationPermission = async ({ force = false } = {}) => {
  if (!canUseBrowserNotifications()) return 'unsupported';
  if (Notification.permission !== 'default') return Notification.permission;

  if (!force && localStorage.getItem(PERMISSION_PROMPT_KEY) === '1') {
    return Notification.permission;
  }

  localStorage.setItem(PERMISSION_PROMPT_KEY, '1');
  try {
    return await Notification.requestPermission();
  } catch (error) {
    return Notification.permission;
  }
};

export const primeRoomRadarNotifications = () => {
  if (!canUseBrowserNotifications() || Notification.permission !== 'default') {
    return () => {};
  }

  if (localStorage.getItem(PERMISSION_PROMPT_KEY) === '1') {
    return () => {};
  }

  const askOnce = () => {
    requestRoomRadarNotificationPermission();
    cleanup();
  };

  const cleanup = () => {
    window.removeEventListener('pointerdown', askOnce);
    window.removeEventListener('keydown', askOnce);
  };

  window.addEventListener('pointerdown', askOnce, { once: true, passive: true });
  window.addEventListener('keydown', askOnce, { once: true });

  return cleanup;
};

export const isCurrentPageTarget = (url) => {
  if (typeof document === 'undefined' || document.visibilityState !== 'visible') return false;
  return window.location.pathname === getAbsolutePath(url).split(/[?#]/)[0];
};

export const showRoomRadarNotification = async ({
  title = 'RoomRadar',
  body = '',
  url = '/',
  tag = 'roomradar-update',
  data = {},
  icon = ICON_URL,
  badge = BADGE_URL,
} = {}) => {
  if (!canUseBrowserNotifications() || Notification.permission !== 'granted') return false;

  const targetUrl = getAbsolutePath(url);
  const notificationTitle = cleanText(title, 'RoomRadar');
  const notificationBody = cleanText(body, 'New RoomRadar update');
  if (!notificationBody) return false;

  const options = {
    body: notificationBody,
    icon,
    badge,
    tag,
    renotify: true,
    requireInteraction: false,
    silent: false,
    timestamp: Date.now(),
    vibrate: [90, 45, 90],
    actions: [
      { action: 'open', title: 'Open inbox' },
    ],
    data: {
      ...data,
      url: targetUrl,
    },
  };

  try {
    if ('serviceWorker' in navigator) {
      const registration = await navigator.serviceWorker.ready;
      if (registration?.showNotification) {
        await registration.showNotification(notificationTitle, options);
        return true;
      }
    }
  } catch (error) {
    // Fall back to the page Notification constructor below.
  }

  try {
    const notification = new Notification(notificationTitle, options);
    notification.onclick = () => {
      window.focus();
      window.location.assign(targetUrl);
      notification.close();
    };
    return true;
  } catch (error) {
    return false;
  }
};
