const jwt = require('jsonwebtoken');
const User = require('../models/User.js');
const { getScopeLabel, isRoleRestricted } = require('../utils/roleRestrictions');

const protect = async (req, res, next) => {
  let token;

  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    token = req.headers.authorization.split(' ')[1];
  }

  if (!token) {
    return res.status(401).json({ success: false, message: 'Not authorized, no token' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    req.user = await User.findById(decoded.id).select('-password');

    if (!req.user) {
      return res.status(401).json({ success: false, message: 'Not authorized, user not found' });
    }

    next();

  } catch (error) {
    return res.status(401).json({ success: false, message: 'Not authorized, token failed' });
  }
};

const restrictTo = (...requiredRoles) => {
  return (req, res, next) => {
    if (!req.user || !req.user.roles) {
      return res.status(403).json({ message: 'You do not have permission to perform this action' });
    }

    if (req.user.status === 'Banned') {
      return res.status(403).json({
        message: 'Account access is restricted by RoomRadar Trust & Safety.',
        roleScope: 'account',
        code: 'ACCOUNT_RESTRICTED',
      });
    }

    // Convert both user's roles and required roles to lowercase before comparing.
    // A role-scoped Trust & Safety restriction removes only that role from the
    // effective permission set; a landlord restriction should not block travel.
    const userRoles = req.user.roles.map(role => role.toLowerCase());
    const requiredRolesLower = requiredRoles.map(role => role.toLowerCase());
    const restrictedRoles = new Set();

    if (isRoleRestricted(req.user, 'student')) restrictedRoles.add('student');
    if (isRoleRestricted(req.user, 'landlord')) restrictedRoles.add('landlord');

    const effectiveUserRoles = userRoles.filter((role) => !restrictedRoles.has(role));

    const hasRequiredRole = effectiveUserRoles.some(role => requiredRolesLower.includes(role));

    if (!hasRequiredRole) {
      const blockedRole = [...restrictedRoles].find((role) => userRoles.includes(role) && requiredRolesLower.includes(role));
      if (blockedRole) {
        return res.status(403).json({
          message: `${getScopeLabel(blockedRole)} access is restricted by RoomRadar Trust & Safety.`,
          roleScope: blockedRole,
          code: 'ROLE_RESTRICTED',
        });
      }
      return res.status(403).json({ message: 'You do not have permission to perform this action' });
    }

    next();
  };
};

module.exports = { protect, restrictTo };
