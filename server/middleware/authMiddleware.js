const jwt = require('jsonwebtoken');
const User = require('../models/User.js');

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

    // Convert both user's roles and required roles to lowercase before comparing
    const userRoles = req.user.roles.map(role => role.toLowerCase());
    const requiredRolesLower = requiredRoles.map(role => role.toLowerCase());

    const hasRequiredRole = userRoles.some(role => requiredRolesLower.includes(role));

    if (!hasRequiredRole) {
      console.log(`[RESTRICT]: Permission Denied. User Roles: [${req.user.roles.join(', ')}], Required: [${requiredRoles.join(', ')}]`);
      return res.status(403).json({ message: 'You do not have permission to perform this action' });
    }

    next();
  };
};

module.exports = { protect, restrictTo };