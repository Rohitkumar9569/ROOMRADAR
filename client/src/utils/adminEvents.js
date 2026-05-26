export const notifyAdminCountsChanged = () => {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new Event('roomradar:admin-counts-refresh'));
};
