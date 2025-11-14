const express = require('express');
const router = express.Router();
const { 
    getNotifications, 
    markAsRead,
    getUnreadCount // Import the new controller function
} = require('../controllers/notificationController');
const { protect } = require('../middleware/authMiddleware');

// Add the new route to get the count of unread notifications
router.route('/unread-count').get(protect, getUnreadCount);

router.route('/').get(protect, getNotifications);
router.route('/:id/read').patch(protect, markAsRead);

module.exports = router;