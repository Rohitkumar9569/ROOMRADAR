const ROLE_SCOPE_ALIASES = {
  account: 'account',
  global: 'account',
  user: 'account',
  student: 'student',
  travelling: 'student',
  traveller: 'student',
  traveler: 'student',
  guest: 'student',
  landlord: 'landlord',
  host: 'landlord',
};

const ROLE_SCOPE_LABELS = {
  account: 'Account',
  student: 'Room seeker',
  landlord: 'Landlord',
};

const ROLE_SCOPE_ROUTES = {
  account: '/',
  student: '/',
  landlord: '/landlord/overview',
};

export const normalizeRoleScope = (scope = 'account') => {
  const key = String(scope || '').trim().toLowerCase();
  return ROLE_SCOPE_ALIASES[key] || 'account';
};

export const getScopeLabel = (scope = 'account') => ROLE_SCOPE_LABELS[normalizeRoleScope(scope)] || 'Account';

export const getScopeHomePath = (scope = 'account') => ROLE_SCOPE_ROUTES[normalizeRoleScope(scope)] || '/';

export const getRoleRestriction = (user, scope = 'account') => {
  const key = normalizeRoleScope(scope);
  if (key === 'account') return user?.accountRestriction || {};
  return user?.roleRestrictions?.[key] || {};
};

export const getScopeStatus = (user, scope = 'account') => {
  const key = normalizeRoleScope(scope);
  if (key === 'account') return user?.status || 'Active';
  return user?.roleRestrictions?.[key]?.status || 'Active';
};

export const isScopeRestricted = (user, scope = 'account') => getScopeStatus(user, scope) === 'Banned';

export const isAccountRestricted = (user) => user?.status === 'Banned';

export const getAccessScopeForPath = (path = '', allowedRoles = []) => {
  const normalizedPath = String(path || '');
  if (normalizedPath.startsWith('/landlord') || normalizedPath.startsWith('/list-your-room')) return 'landlord';
  if (normalizedPath.startsWith('/profile') || /\/room\/[^/]+\/book\/?$/.test(normalizedPath)) return 'student';

  const roles = allowedRoles.map((role) => String(role || '').toLowerCase());
  if (roles.includes('landlord') && !roles.includes('student')) return 'landlord';
  if (roles.includes('student') && !roles.includes('landlord')) return 'student';
  return null;
};
