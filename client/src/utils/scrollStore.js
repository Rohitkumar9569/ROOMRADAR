const positions = new Map();
const visitedTabs = new Set();

const studentTabs = [
  ['student:explore', (path) => path === '/'],
  ['student:search', (path) => path === '/rooms'],
  ['student:saved', (path) => path === '/profile/wishlist'],
  ['student:inbox', (path) => path === '/profile/inbox' || path.startsWith('/profile/inbox/')],
  ['student:trips', (path) => path === '/profile/my-applications'],
];

const landlordTabs = [
  ['landlord:today', (path) => ['/landlord/overview', '/landlord/calendar', '/landlord/applications'].includes(path)],
  ['landlord:listings', (path) => path === '/landlord/my-rooms'],
  ['landlord:add', (path) => path === '/landlord/add-room' || path.startsWith('/landlord/edit-room/')],
  ['landlord:inbox', (path) => path === '/landlord/inbox' || path.startsWith('/landlord/inbox/')],
  ['landlord:profile', (path) => path === '/landlord/profile'],
];

const tabRoutes = [...studentTabs, ...landlordTabs];

export const getTabScrollKey = (pathname = '') => {
  const match = tabRoutes.find(([, matches]) => matches(pathname));
  return match?.[0] || null;
};

export const saveScroll = (key, y) => {
  if (!key || typeof window === 'undefined') return;
  const nextY = typeof y === 'number' ? y : window.scrollY || 0;
  positions.set(key, Math.max(0, Math.round(nextY)));
};

export const readScroll = (key) => positions.get(key) || 0;

export const hasVisitedTab = (key) => Boolean(key && visitedTabs.has(key));

export const markVisitedTab = (key) => {
  if (key) visitedTabs.add(key);
};

export const clearScroll = (key) => {
  if (!key) {
    positions.clear();
    visitedTabs.clear();
    return;
  }

  positions.delete(key);
  visitedTabs.delete(key);
};

export const restoreScroll = (key, fallbackY = 0, options = {}) => {
  if (typeof window === 'undefined') return;

  const targetY = Math.max(0, Math.round(key ? readScroll(key) : fallbackY));
  const maxFrames = options.maxFrames ?? 8;
  let frames = 0;

  const apply = () => {
    window.scrollTo({ top: targetY, left: 0, behavior: 'auto' });
    frames += 1;

    if (frames >= maxFrames) return;

    const canStillGrow = document.documentElement.scrollHeight > window.innerHeight;
    const stillOffTarget = Math.abs((window.scrollY || 0) - targetY) > 2;
    if (targetY > 0 && canStillGrow && stillOffTarget) {
      window.requestAnimationFrame(apply);
    }
  };

  apply();
};
