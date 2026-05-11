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
const { updateSupportTicket } = require('../controllers/supportController');

// Protect all routes in this file for Admin access only
router.use(protect, restrictTo('Admin', 'Super_Admin', 'Moderator', 'Support'));

// Dashboard and Stats routes
router.route('/stats').get(getDashboardStats);
router.route('/stats/user-signups').get(getUserSignups);
router.route('/pending-rooms').get(getPendingRooms);
router.route('/activities').get(getRecentActivities);
router.route('/analytics').get(getAnalyticsReport);
router.route('/verifications').get(getVerificationCenter);
router.route('/revenue').get(getRevenueReport);
router.route('/tickets').get(getSupportTickets);
router.route('/tickets/:id').patch(updateSupportTicket);
router.route('/logs').get(getAuditLogs);
router.route('/settings').get(getPlatformSettings).patch(updatePlatformSettings);

// Management Pages
router.route('/users').get(getAllUsers);
router.route('/rooms').get(getAllRooms);
router.route('/rooms/:id/details').get(getRoomReviewDetails);

// Actions on a specific user
router.route('/users/:id/details').get(getUserDetails);
router.route('/users/:id/status').patch(updateUserStatus);
router.route('/users/:id/roles').patch(updateUserRoles);
router.route('/users/:id/verify').patch(verifyUser);
router.route('/users/:id/revoke-verification').patch(revokeVerification);

// Actions on a specific room
router.route('/rooms/:id/approve').patch(approveRoom);
router.route('/rooms/:id/reject').patch(rejectRoom);
router.route('/rooms/:id').delete(deleteRoom);

module.exports = router;
