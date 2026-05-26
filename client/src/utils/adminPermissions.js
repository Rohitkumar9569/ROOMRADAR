const ROLE_PERMISSIONS = {
  Super_Admin: ['*'],
  Admin: [
    'admin:view',
    'dashboard:view',
    'analytics:view',
    'users:view',
    'users:restrict',
    'users:roles',
    'users:verify',
    'rooms:view',
    'rooms:moderate',
    'rooms:delete',
    'verifications:view',
    'revenue:view',
    'tickets:manage',
    'logs:view',
    'settings:manage',
  ],
  Moderator: [
    'admin:view',
    'dashboard:view',
    'analytics:view',
    'users:view',
    'users:verify',
    'rooms:view',
    'rooms:moderate',
    'verifications:view',
    'tickets:manage',
    'logs:view',
  ],
  Support: [
    'admin:view',
    'dashboard:view',
    'users:view',
    'rooms:view',
    'tickets:manage',
  ],
};

const normalizeRoles = (roles = []) => (Array.isArray(roles) ? roles : [roles].filter(Boolean));

export const getAdminPermissionsForRoles = (roles = []) => {
  const permissions = new Set();
  normalizeRoles(roles).forEach((role) => {
    (ROLE_PERMISSIONS[role] || []).forEach((permission) => permissions.add(permission));
  });
  return permissions;
};

export const hasAdminPermission = (user, permission) => {
  if (!user || !permission) return false;
  const permissions = getAdminPermissionsForRoles(user.roles);
  return permissions.has('*') || permissions.has(permission);
};

export const canAccessAdminItem = (user, item = {}) => {
  if (!item.permission) return hasAdminPermission(user, 'admin:view');
  return hasAdminPermission(user, item.permission);
};

export const getAdminPermissionForPath = (pathname = '', search = '') => {
  if (pathname === '/admin' || pathname === '/admin/dashboard') return 'dashboard:view';
  if (pathname === '/admin/profile') return 'admin:view';
  if (pathname === '/admin/analytics') return 'analytics:view';
  if (pathname === '/admin/verifications') return 'verifications:view';
  if (pathname === '/admin/revenue') return 'revenue:view';
  if (pathname === '/admin/tickets') return 'tickets:manage';
  if (pathname === '/admin/logs') return 'logs:view';
  if (pathname === '/admin/settings') return 'settings:manage';
  if (pathname.startsWith('/admin/users')) return 'users:view';
  if (pathname.startsWith('/admin/rooms')) return 'rooms:view';
  if (pathname === '/admin/users' && search.includes('role=Landlord')) return 'users:view';
  return 'admin:view';
};

export const canAccessAdminPath = (user, pathname = '', search = '') => (
  hasAdminPermission(user, getAdminPermissionForPath(pathname, search))
);

export const describeAdminPermission = (permission = '') => ({
  'analytics:view': 'Analytics access',
  'users:view': 'User management access',
  'users:restrict': 'Trust and Safety restriction access',
  'users:roles': 'RBAC role management access',
  'users:verify': 'Verification access',
  'rooms:view': 'Listing moderation access',
  'rooms:moderate': 'Approve/reject listing access',
  'rooms:delete': 'Delete listing access',
  'verifications:view': 'KYC verification access',
  'revenue:view': 'Financial report access',
  'tickets:manage': 'Support queue access',
  'logs:view': 'Audit log access',
  'settings:manage': 'Platform settings access',
}[permission] || 'Admin access');
