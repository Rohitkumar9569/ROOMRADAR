const prefetchedRoutes = new Set();

const routePrefetchers = [
  {
    test: (path) => path === '/',
    load: () => import('../pages/student/HomePage.jsx'),
  },
  {
    test: (path) => path.startsWith('/rooms'),
    load: () => Promise.all([
      import('../layouts/StudentPagesLayout.jsx'),
      import('../pages/student/SearchPage.jsx'),
    ]),
  },
  {
    test: (path) => path.startsWith('/profile/wishlist'),
    load: () => Promise.all([
      import('../layouts/StudentPagesLayout.jsx'),
      import('../layouts/StudentProfileLayout.jsx'),
      import('../pages/student/WishlistPage.jsx'),
    ]),
  },
  {
    test: (path) => path.startsWith('/profile/my-applications'),
    load: () => Promise.all([
      import('../layouts/StudentPagesLayout.jsx'),
      import('../layouts/StudentProfileLayout.jsx'),
      import('../pages/student/MyApplicationsPage.jsx'),
    ]),
  },
  {
    test: (path) => path.startsWith('/profile/inbox'),
    load: () => Promise.all([
      import('../layouts/StudentPagesLayout.jsx'),
      import('../layouts/StudentProfileLayout.jsx'),
      import('../pages/inbox/InboxPage.jsx'),
    ]),
  },
  {
    test: (path) => path.startsWith('/landlord/inbox'),
    load: () => Promise.all([
      import('../layouts/LandlordProfileLayout.jsx'),
      import('../pages/inbox/InboxPage.jsx'),
    ]),
  },
  {
    test: (path) => path === '/login' || path === '/signup',
    load: () => import('../pages/auth/AuthPage.jsx'),
  },
  {
    test: (path) => path.startsWith('/landlord/overview'),
    load: () => Promise.all([
      import('../layouts/LandlordProfileLayout.jsx'),
      import('../pages/landlord/LandlordOverviewPage.jsx'),
    ]),
  },
  {
    test: (path) => path.startsWith('/landlord/my-rooms'),
    load: () => Promise.all([
      import('../layouts/LandlordProfileLayout.jsx'),
      import('../pages/landlord/MyRoomsPage.jsx'),
    ]),
  },
  {
    test: (path) => path.startsWith('/landlord/add-room'),
    load: () => Promise.all([
      import('../layouts/LandlordProfileLayout.jsx'),
      import('../pages/landlord/AddRoomPage.jsx'),
    ]),
  },
  {
    test: (path) => path.startsWith('/landlord/profile'),
    load: () => Promise.all([
      import('../layouts/LandlordProfileLayout.jsx'),
      import('../components/features/profile/LandlordAboutMe.jsx'),
    ]),
  },
  {
    test: (path) => path.startsWith('/admin/dashboard'),
    load: () => Promise.all([
      import('../layouts/AdminLayout.jsx'),
      import('../pages/admin/AdminDashboardPage.jsx'),
    ]),
  },
  {
    test: (path) => path.startsWith('/admin/analytics'),
    load: () => Promise.all([
      import('../layouts/AdminLayout.jsx'),
      import('../pages/admin/AdminInsightsPage.jsx'),
    ]),
  },
  {
    test: (path) => path.startsWith('/admin/users'),
    load: () => Promise.all([
      import('../layouts/AdminLayout.jsx'),
      import('../pages/admin/UserManagementPage.jsx'),
    ]),
  },
  {
    test: (path) => path.startsWith('/admin/rooms'),
    load: () => Promise.all([
      import('../layouts/AdminLayout.jsx'),
      import('../pages/admin/RoomManagementPage.jsx'),
    ]),
  },
  {
    test: (path) => path.startsWith('/admin/settings'),
    load: () => Promise.all([
      import('../layouts/AdminLayout.jsx'),
      import('../pages/admin/AdminProfilePage.jsx'),
    ]),
  },
];

export const prefetchRoute = (path) => {
  if (!path || prefetchedRoutes.has(path)) return;

  const prefetcher = routePrefetchers.find(({ test }) => test(path));
  if (!prefetcher) return;

  prefetchedRoutes.add(path);
  prefetcher.load().catch(() => {
    prefetchedRoutes.delete(path);
  });
};

export const warmRoutesWhenIdle = (paths = []) => {
  if (typeof window === 'undefined' || paths.length === 0) return undefined;

  const schedule = window.requestIdleCallback || ((callback) => window.setTimeout(callback, 900));
  const cancel = window.cancelIdleCallback || window.clearTimeout;
  const handle = schedule(() => {
    paths.forEach(prefetchRoute);
  });

  return () => cancel(handle);
};
