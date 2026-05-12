import { flushSync } from 'react-dom';

const preloaders = {
  landlord: () => Promise.all([
    import('../layouts/LandlordProfileLayout.jsx'),
    import('../pages/landlord/LandlordOverviewPage.jsx'),
  ]),
  student: () => Promise.all([
    import('../layouts/StudentProfileLayout.jsx'),
    import('../components/features/profile/AboutMe.jsx'),
  ]),
  hostForm: () => import('../pages/landlord/AddRoomPage.jsx'),
};

const preloadCache = new Map();

export const preloadRoleDestination = (target) => {
  if (!preloaders[target]) return Promise.resolve();
  if (!preloadCache.has(target)) {
    preloadCache.set(target, preloaders[target]().catch(() => null));
  }
  return preloadCache.get(target);
};

const prefersReducedMotion = () => (
  typeof window !== 'undefined'
  && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
);

const clearSwitchClass = () => {
  if (typeof document === 'undefined') return;
  window.setTimeout(() => {
    document.documentElement.classList.remove('rr-role-switching');
  }, 360);
};

export const runRoleTransition = (commit) => {
  if (typeof document === 'undefined') {
    commit();
    return;
  }

  document.documentElement.classList.add('rr-role-switching');

  if (document.startViewTransition && !prefersReducedMotion()) {
    try {
      const transition = document.startViewTransition(() => {
        flushSync(commit);
      });
      transition.finished.finally(clearSwitchClass);
      return;
    } catch {
      // Fall through to the normal client-side navigation path.
    }
  }

  commit();
  clearSwitchClass();
};

export const switchRoleSmoothly = async ({
  role,
  path,
  switchRole,
  navigate,
  replace = false,
}) => {
  await preloadRoleDestination(role);
  runRoleTransition(() => {
    switchRole(role);
    navigate(path, { replace });
  });
};
