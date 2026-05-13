const Notification = require('../models/Notification');
const PushSubscription = require('../models/PushSubscription');
const asyncHandler = require('express-async-handler');
const { getVapidPublicKey, isWebPushConfigured } = require('../utils/pushNotifications');

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

exports.getPushPublicKey = asyncHandler(async (req, res) => {
    res.json({
        publicKey: getVapidPublicKey(),
        configured: isWebPushConfigured(),
    });
});

exports.savePushSubscription = asyncHandler(async (req, res) => {
    const { subscription } = req.body || {};
    const endpoint = String(subscription?.endpoint || '').trim();
    const p256dh = String(subscription?.keys?.p256dh || '').trim();
    const auth = String(subscription?.keys?.auth || '').trim();

    if (!endpoint || !p256dh || !auth) {
        return res.status(400).json({ message: 'Invalid push subscription.' });
    }

    const expirationTime = subscription.expirationTime ? new Date(subscription.expirationTime) : null;

    await PushSubscription.findOneAndUpdate(
        { endpoint },
        {
            $set: {
                user: req.user._id,
                endpoint,
                expirationTime: expirationTime && !Number.isNaN(expirationTime.valueOf()) ? expirationTime : null,
                keys: { p256dh, auth },
                userAgent: String(req.headers['user-agent'] || '').slice(0, 260),
                failedAt: null,
            },
        },
        { upsert: true, new: true, setDefaultsOnInsert: true }
    );

    res.status(201).json({ message: 'Push subscription saved.' });
});

exports.deletePushSubscription = asyncHandler(async (req, res) => {
    const endpoint = String(req.body?.endpoint || '').trim();
    if (!endpoint) return res.status(400).json({ message: 'Endpoint is required.' });

    await PushSubscription.deleteOne({ endpoint, user: req.user._id });
    res.json({ message: 'Push subscription removed.' });
});
