const requireViteEnv = (key) => {
  const value = import.meta.env[key];
  if (!value) {
    throw new Error(`${key} must be configured in client/.env before running RoomRadar.`);
  }
  return value;
};

export const API_URL = requireViteEnv('VITE_API_URL');

const normalizeSocketUrl = (value) =>
  value
    .replace(/^ws:\/\//i, 'http://')
    .replace(/^wss:\/\//i, 'https://');

export const SOCKET_URL = normalizeSocketUrl(requireViteEnv('VITE_SOCKET_URL'));
