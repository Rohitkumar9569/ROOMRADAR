const ROLE_SCOPE_ALIASES = {
  account: 'account',
  user: 'account',
  global: 'account',
  student: 'student',
  travelling: 'student',
  traveler: 'student',
  traveller: 'student',
  guest: 'student',
  landlord: 'landlord',
  host: 'landlord',
};

const ROLE_KEY_TO_ROLE = {
  student: 'Student',
  landlord: 'Landlord',
};

const ROLE_KEY_TO_LABEL = {
  student: 'Travelling',
  landlord: 'Landlord',
};

const normalizeRoleScope = (scope) => {
  const key = String(scope || '').trim().toLowerCase();
  return ROLE_SCOPE_ALIASES[key] || 'account';
};

const roleToRestrictionKey = (role) => normalizeRoleScope(role);

const getRoleRestriction = (user, scope) => {
  const key = normalizeRoleScope(scope);
  if (key === 'account') return user?.accountRestriction || {};
  return user?.roleRestrictions?.[key] || {};
};

const isRoleRestricted = (user, scope) => {
  const key = normalizeRoleScope(scope);
  if (key === 'account') return user?.status === 'Banned';
  return user?.roleRestrictions?.[key]?.status === 'Banned';
};

const isAccountRestricted = (user) => user?.status === 'Banned';

const getRestrictionStatus = (user, scope) => {
  const key = normalizeRoleScope(scope);
  if (key === 'account') return user?.status || 'Active';
  return user?.roleRestrictions?.[key]?.status || 'Active';
};

const getScopeLabel = (scope) => {
  const key = normalizeRoleScope(scope);
  if (key === 'account') return 'Account';
  return ROLE_KEY_TO_LABEL[key] || 'Account';
};

const getRoleForScope = (scope) => ROLE_KEY_TO_ROLE[normalizeRoleScope(scope)];

module.exports = {
  ROLE_KEY_TO_ROLE,
  ROLE_KEY_TO_LABEL,
  getRestrictionStatus,
  getRoleForScope,
  getRoleRestriction,
  getScopeLabel,
  isAccountRestricted,
  isRoleRestricted,
  normalizeRoleScope,
  roleToRestrictionKey,
};
