const Notification = require('../models/Notification');
const asyncHandler = require('express-async-handler');

exports.getNotifications = asyncHandler(async (req, res) => {
    const notifications = await Notification.find({ user: req.user._id })
        .sort({ createdAt: -1 })
        .limit(20);
    res.json(notifications);
});

exports.markAsRead = asyncHandler(async (req, res) => {
    const notification = await Notification.findById(req.params.id);
    if (notification && notification.user.toString() === req.user._id.toString()) {
        notification.isRead = true;
        await notification.save();
        res.json({ message: 'Notification marked as read.' });
    } else {
        res.status(404).json({ message: 'Notification not found.' });
    }
});


/**
 * @desc    Get the count of unread notifications for the logged-in user
 * @route   GET /api/notifications/unread-count
 * @access  Private
 */
exports.getUnreadCount = asyncHandler(async (req, res) => {
    const count = await Notification.countDocuments({ 
        user: req.user._id, 
        isRead: false 
    });
    res.json({ count });
});