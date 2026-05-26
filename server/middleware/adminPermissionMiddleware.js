const { hasAdminPermission } = require('../utils/adminPermissions');

const authorizeAdminPermission = (permission) => (req, res, next) => {
  if (hasAdminPermission(req.user, permission)) {
    return next();
  }

  return res.status(403).json({
    message: 'Your admin role does not have permission to perform this action.',
    code: 'ADMIN_PERMISSION_DENIED',
    permission,
  });
};

module.exports = {
  authorizeAdminPermission,
};
