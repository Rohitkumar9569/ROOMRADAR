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

const normalizeRoles = (roles = []) => (
  Array.isArray(roles) ? roles : [roles].filter(Boolean)
);

const getAdminPermissionsForRoles = (roles = []) => {
  const permissions = new Set();

  normalizeRoles(roles).forEach((role) => {
    const rolePermissions = ROLE_PERMISSIONS[role] || [];
    rolePermissions.forEach((permission) => permissions.add(permission));
  });

  return permissions;
};

const hasAdminPermission = (user, permission) => {
  if (!user || !permission) return false;
  const permissions = getAdminPermissionsForRoles(user.roles);
  return permissions.has('*') || permissions.has(permission);
};

module.exports = {
  ROLE_PERMISSIONS,
  getAdminPermissionsForRoles,
  hasAdminPermission,
};
