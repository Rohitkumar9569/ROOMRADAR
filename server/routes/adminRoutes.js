const express = require('express');
const router = express.Router();
const { 
    getDashboardStats,
    getPendingRooms, 
    approveRoom, 
    rejectRoom,
    getAllUsers,
    getUserDetails,
    getAllRooms,
    getRoomReviewDetails,
    deleteRoom,
    updateUserStatus,
    updateUserRoles,
    verifyUser,
    revokeVerification,
    getUserSignups,
    getRecentActivities,
    getAnalyticsReport,
    getVerificationCenter,
    getRevenueReport,
    getSupportTickets,
    getAuditLogs,
    getPlatformSettings,
    updatePlatformSettings
} = require('../controllers/adminController');
const { protect, restrictTo } = require('../middleware/authMiddleware');
const { authorizeAdminPermission } = require('../middleware/adminPermissionMiddleware');
const { updateSupportTicket } = require('../controllers/supportController');

// Protect all routes in this file for Admin access only
router.use(protect, restrictTo('Admin', 'Super_Admin', 'Moderator', 'Support'));

// Dashboard and Stats routes
router.route('/stats').get(authorizeAdminPermission('dashboard:view'), getDashboardStats);
router.route('/stats/user-signups').get(authorizeAdminPermission('analytics:view'), getUserSignups);
router.route('/pending-rooms').get(authorizeAdminPermission('rooms:view'), getPendingRooms);
router.route('/activities').get(authorizeAdminPermission('dashboard:view'), getRecentActivities);
router.route('/analytics').get(authorizeAdminPermission('analytics:view'), getAnalyticsReport);
router.route('/verifications').get(authorizeAdminPermission('verifications:view'), getVerificationCenter);
router.route('/revenue').get(authorizeAdminPermission('revenue:view'), getRevenueReport);
router.route('/tickets').get(authorizeAdminPermission('tickets:manage'), getSupportTickets);
router.route('/tickets/:id').patch(authorizeAdminPermission('tickets:manage'), updateSupportTicket);
router.route('/logs').get(authorizeAdminPermission('logs:view'), getAuditLogs);
router.route('/settings')
  .get(authorizeAdminPermission('settings:manage'), getPlatformSettings)
  .patch(authorizeAdminPermission('settings:manage'), updatePlatformSettings);

// Management Pages
router.route('/users').get(authorizeAdminPermission('users:view'), getAllUsers);
router.route('/rooms').get(authorizeAdminPermission('rooms:view'), getAllRooms);
router.route('/rooms/:id/details').get(authorizeAdminPermission('rooms:view'), getRoomReviewDetails);

// Actions on a specific user
router.route('/users/:id/details').get(authorizeAdminPermission('users:view'), getUserDetails);
router.route('/users/:id/status').patch(authorizeAdminPermission('users:restrict'), updateUserStatus);
router.route('/users/:id/roles').patch(authorizeAdminPermission('users:roles'), updateUserRoles);
router.route('/users/:id/verify').patch(authorizeAdminPermission('users:verify'), verifyUser);
router.route('/users/:id/revoke-verification').patch(authorizeAdminPermission('users:verify'), revokeVerification);

// Actions on a specific room
router.route('/rooms/:id/approve').patch(authorizeAdminPermission('rooms:moderate'), approveRoom);
router.route('/rooms/:id/reject').patch(authorizeAdminPermission('rooms:moderate'), rejectRoom);
router.route('/rooms/:id').delete(authorizeAdminPermission('rooms:delete'), deleteRoom);

module.exports = router;
