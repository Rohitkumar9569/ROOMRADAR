const express = require('express');
const router = express.Router();
const { 
    getNotifications, 
    markAsRead,
    getUnreadCount,
    getPushPublicKey,
    savePushSubscription,
    deletePushSubscription
} = require('../controllers/notificationController');
const { protect } = require('../middleware/authMiddleware');

router.route('/push-public-key').get(getPushPublicKey);
router.route('/push-subscriptions').post(protect, savePushSubscription).delete(protect, deletePushSubscription);

// Add the new route to get the count of unread notifications
router.route('/unread-count').get(protect, getUnreadCount);

router.route('/').get(protect, getNotifications);
router.route('/:id/read').patch(protect, markAsRead);

module.exports = router;
