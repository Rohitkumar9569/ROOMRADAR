const Room = require('../models/Room');
const User = require('../models/User');
const Application = require('../models/Application');
const asyncHandler = require('express-async-handler');
const Notification = require('../models/Notification');
const Conversation = require('../models/Conversation');
const Message = require('../models/Message');
const AuditLog = require('../models/AuditLog');
const SupportTicket = require('../models/SupportTicket');
const Transaction = require('../models/Transaction');
const PlatformSetting = require('../models/PlatformSetting');
const { getDefaultSettings } = require('./settingsController');
const mongoose = require('mongoose');

const writeAuditLog = async (req, action, targetType = 'System', target = null, metadata = {}) => {
    try {
        await AuditLog.create({
            action,
            admin: req.user?._id,
            targetType,
            target,
            metadata,
            ipAddress: req.ip,
            userAgent: req.get('user-agent'),
        });
    } catch (error) {
        // Audit failures should never block the admin action itself.
    }
};

const getPlatformDefaults = () => ({
    ...getDefaultSettings(),
});

const emitToUser = (req, userId, event, payload) => {
    const io = req.app.get('io');
    if (io && userId) {
        io.to(userId.toString()).emit(event, payload);
    }
};

const toRoomNumber = (value, fallback = 0) => {
    const rawValue = value && typeof value === 'object' && !Array.isArray(value) ? value.value : value;
    if (rawValue === undefined || rawValue === null || rawValue === '') return fallback;
    if (typeof rawValue === 'string' && /\b(no\s*deposit|none|free|n\/a|na)\b/i.test(rawValue)) return 0;

    const normalized = String(rawValue).replace(/[^\d.-]/g, '');
    if (!normalized || normalized === '-' || normalized === '.' || normalized === '-.') return fallback;

    const parsed = Number(normalized);
    return Number.isFinite(parsed) ? parsed : fallback;
};

const buildRoomNumericRepairPatch = (room = {}) => {
    const numericFields = {
        rent: 0,
        securityDeposit: 0,
        maintenanceCharge: 0,
        waterCharge: 0,
        maxOccupants: 1,
        bathrooms: 1,
        beds: 1,
        totalFloors: undefined,
        views: 0,
    };
    const patch = {};

    Object.entries(numericFields).forEach(([field, fallback]) => {
        if (!Object.prototype.hasOwnProperty.call(room, field)) return;
        const fallbackValue = fallback === undefined ? undefined : fallback;
        const normalizedValue = toRoomNumber(room[field], fallbackValue);

        if (normalizedValue === undefined) return;
        if (room[field] !== normalizedValue) patch[field] = normalizedValue;
    });

    if (room.rules && typeof room.rules === 'object' && Object.prototype.hasOwnProperty.call(room.rules, 'noticePeriod')) {
        patch['rules.noticePeriod'] = toRoomNumber(room.rules.noticePeriod, 0);
    }

    return patch;
};

const getUnreadConversationCountForUser = async (userId) => {
    const normalizedUserId = new mongoose.Types.ObjectId(userId);
    const conversations = await Conversation.find({ members: normalizedUserId }).select('_id').lean();
    const conversationIds = conversations.map((conversation) => conversation._id);

    if (conversationIds.length === 0) return 0;

    return Message.countDocuments({
        conversationId: { $in: conversationIds },
        sender: { $ne: normalizedUserId },
        readBy: { $ne: normalizedUserId },
    });
};

const emitUnreadConversationCount = async (req, userId) => {
    try {
        const count = await getUnreadConversationCountForUser(userId);
        emitToUser(req, userId, 'unread_count_update', { count });
    } catch (error) {
        // Socket count sync should not block the admin action.
    }
};

const sendRoomDecisionUpdateToLandlord = async (req, room, { decision, reason = '' }) => {
    const landlordId = room.landlord;
    const adminId = req.user?._id;
    if (!landlordId) return null;

    const isApproved = decision === 'approved';
    const title = isApproved ? 'Listing approved' : 'Listing needs changes';
    const message = isApproved
        ? `RoomRadar review: "${room.title}" has been approved and is now live. You can manage it from your listings.`
        : `RoomRadar review: "${room.title}" was not approved yet. ${reason ? `Reason: ${reason}` : 'Please review the listing details and photos.'} Edit and resubmit it for approval.`;

    let conversation = null;
    if (adminId && adminId.toString() !== landlordId.toString()) {
        conversation = await Conversation.findOne({
            roomId: room._id,
            members: { $all: [adminId, landlordId] },
        });

        if (!conversation) {
            conversation = await Conversation.create({
                members: [adminId, landlordId],
                roomId: room._id,
                conversationType: 'admin_update',
            });
        } else if (conversation.conversationType !== 'admin_update') {
            conversation.conversationType = 'admin_update';
            await conversation.save();
        }

        const systemMessage = await Message.create({
            conversationId: conversation._id,
            sender: adminId,
            messageType: 'admin_update',
            text: message,
            readBy: [adminId],
        });

        conversation.lastMessage = systemMessage._id;
        await conversation.save();

        emitToUser(req, landlordId, 'getMessage', {
            senderId: adminId,
            senderName: 'RoomRadar Admin',
            text: message,
            messageType: 'admin_update',
            conversationId: conversation._id,
            roomTitle: room.title,
            createdAt: systemMessage.createdAt,
        });
        await emitUnreadConversationCount(req, landlordId);
    }

    const notification = await Notification.create({
        user: landlordId,
        title,
        message,
        link: conversation ? `/landlord/inbox/${conversation._id}` : '/landlord/my-rooms',
        type: `room_${decision}`,
        metadata: {
            room: room._id,
            status: room.status,
            decision,
            reason,
            conversation: conversation?._id,
        },
    });

    emitToUser(req, landlordId, 'newNotification', notification);
    return { notification, conversation };
};

const emitPlatformSettings = (req, settings) => {
    const io = req.app.get('io');
    if (io) {
        io.emit('platform_settings_updated', settings);
    }
};

const currencySummaryPipeline = [
    {
        $match: { status: { $in: ['approved', 'confirmed'] } },
    },
    {
        $group: {
            _id: null,
            grossBookingValue: { $sum: { $ifNull: ['$amountBreakdown.total', 0] } },
            platformFees: { $sum: { $ifNull: ['$amountBreakdown.platformFee', 0] } },
            rentVolume: { $sum: { $ifNull: ['$amountBreakdown.rent', 0] } },
            pendingPayments: {
                $sum: {
                    $cond: [
                        { $eq: ['$paymentStatus', 'pending'] },
                        { $ifNull: ['$amountBreakdown.total', 0] },
                        0,
                    ],
                },
            },
            paidPayments: {
                $sum: {
                    $cond: [
                        { $eq: ['$paymentStatus', 'paid'] },
                        { $ifNull: ['$amountBreakdown.total', 0] },
                        0,
                    ],
                },
            },
        },
    },
];

/**
 * @desc    Get all key stats for the admin dashboard
 * @route   GET /api/admin/stats
 * @access  Private/Admin
 */
exports.getDashboardStats = asyncHandler(async (req, res) => {
    const totalUsers = await User.countDocuments();
    const totalLandlords = await User.countDocuments({ roles: 'Landlord' });
    const totalRooms = await Room.countDocuments({ isDeleted: { $ne: true } });
    const pendingRoomsCount = await Room.countDocuments({ status: 'Pending', isDeleted: { $ne: true } });
    const publishedRoomsCount = await Room.countDocuments({ status: 'Published', isDeleted: { $ne: true } });
    const totalApplications = await Application.countDocuments();

    res.json({
        totalUsers,
        totalLandlords,
        totalRooms,
        pendingRoomsCount,
        publishedRoomsCount,
        totalApplications
    });
});

/**
 * @desc    Get all rooms awaiting approval
 * @route   GET /api/admin/pending-rooms
 * @access  Private/Admin
 */
exports.getPendingRooms = asyncHandler(async (req, res) => {
    const pendingRooms = await Room.find({ status: 'Pending', isDeleted: { $ne: true } }).populate('landlord', 'name email');
    res.json(pendingRooms);
});

/**
 * @desc    Get all users for the management page
 * @route   GET /api/admin/users
 * @access  Private/Admin
 */
exports.getAllUsers = asyncHandler(async (req, res) => {
    const users = await User.find({}).select('-password');
    res.json(users);
});

/**
 * @desc    Get comprehensive details for a single user
 * @route   GET /api/admin/users/:id/details
 * @access  Private/Admin
 */
exports.getUserDetails = asyncHandler(async (req, res) => {
    const userId = req.params.id;

    const user = await User.findById(userId).select('-password');
    if (!user) {
        res.status(404);
        throw new Error('User not found');
    }

    let aggregatedData = {};

    aggregatedData.applications = await Application.find({
        $or: [{ student: userId }, { landlord: userId }]
    }).populate('room', 'title').sort({ createdAt: -1 });

    if (user.roles.includes('Landlord')) {
        aggregatedData.listings = await Room.find({ landlord: userId, isDeleted: { $ne: true } }).sort({ createdAt: -1 });
    }

    const userDetails = {
        ...user.toObject(),
        isVerified: user.isVerified,
        ...aggregatedData
    };

    res.json(userDetails);
});


/**
 * @desc    Get all rooms for the management page, with optional status filter
 * @route   GET /api/admin/rooms
 * @access  Private/Admin
 */
exports.getAllRooms = asyncHandler(async (req, res) => {
    const { status } = req.query;
    let filter = { isDeleted: { $ne: true } };

    if (status && status !== 'All') {
        filter.status = status;
    }

    const rooms = await Room.find(filter).populate('landlord', 'name');
    res.json(rooms);
});

/**
 * @desc    Get a complete room payload for admin review
 * @route   GET /api/admin/rooms/:id/details
 * @access  Private/Admin
 */
exports.getRoomReviewDetails = asyncHandler(async (req, res) => {
    const room = await Room.findOne({ _id: req.params.id, isDeleted: { $ne: true } })
        .populate(
            'landlord',
            'name email mobileNumber phone avatarUrl profilePicture roles createdAt isVerified kyc_status verificationLevel trustScore verifications roleProfiles'
        )
        .lean();

    if (!room) {
        res.status(404);
        throw new Error('Room not found');
    }

    const [applicationStats, recentApplications] = await Promise.all([
        Application.aggregate([
            { $match: { room: room._id } },
            { $group: { _id: '$status', count: { $sum: 1 } } },
        ]),
        Application.find({ room: room._id })
            .sort({ createdAt: -1 })
            .limit(5)
            .populate('student', 'name email mobileNumber profilePicture avatarUrl verificationLevel trustScore')
            .select('status type fullName mobileNumber checkInDate checkOutDate occupants amountBreakdown createdAt student')
            .lean(),
    ]);

    const stats = applicationStats.reduce(
        (acc, item) => {
            acc[item._id || 'unknown'] = item.count;
            acc.total += item.count;
            return acc;
        },
        { total: 0 }
    );

    res.json({
        room,
        stats,
        recentApplications,
    });
});

/**
 * @desc    Approve a room listing
 * @route   PATCH /api/admin/rooms/:id/approve
 * @access  Private/Admin
 */
exports.approveRoom = asyncHandler(async (req, res) => {
    const room = await Room.findOne({ _id: req.params.id, isDeleted: { $ne: true } }).lean();
    if (room) {
        const updatedRoom = await Room.findOneAndUpdate(
            { _id: req.params.id, isDeleted: { $ne: true } },
            {
                $set: {
                    ...buildRoomNumericRepairPatch(room),
                    status: 'Published',
                    rejectionReason: '',
                    rejection_reason: '',
                },
            },
            { new: true, runValidators: false }
        ).lean();
        await sendRoomDecisionUpdateToLandlord(req, updatedRoom, { decision: 'approved' });
        await writeAuditLog(req, 'ROOM_APPROVED', 'Room', updatedRoom._id, {
            title: updatedRoom.title,
            landlord: updatedRoom.landlord,
        });
        res.json(updatedRoom);
    } else {
        res.status(404).json({ message: 'Room not found' });
    }
});

/**
 * @desc    Reject a room listing
 * @route   PATCH /api/admin/rooms/:id/reject
 * @access  Private/Admin
 */
exports.rejectRoom = asyncHandler(async (req, res) => {
    const { reason } = req.body;
    const normalizedReason = String(reason || '').trim();
    const room = await Room.findOne({ _id: req.params.id, isDeleted: { $ne: true } }).lean();
    if (room) {
        const updatedRoom = await Room.findOneAndUpdate(
            { _id: req.params.id, isDeleted: { $ne: true } },
            {
                $set: {
                    ...buildRoomNumericRepairPatch(room),
                    status: 'Unpublished',
                    rejectionReason: normalizedReason,
                    rejection_reason: normalizedReason,
                },
            },
            { new: true, runValidators: false }
        ).lean();
        await sendRoomDecisionUpdateToLandlord(req, updatedRoom, { decision: 'rejected', reason: normalizedReason });
        await writeAuditLog(req, 'ROOM_REJECTED', 'Room', updatedRoom._id, {
            title: updatedRoom.title,
            reason: normalizedReason,
        });
        res.json(updatedRoom);
    } else {
        res.status(404).json({ message: 'Room not found' });
    }
});

/**
 * @desc    Permanently delete a room
 * @route   DELETE /api/admin/rooms/:id
 * @access  Private/Admin
 */
exports.deleteRoom = asyncHandler(async (req, res) => {
    const room = await Room.findOne({ _id: req.params.id, isDeleted: { $ne: true } });

    if (room) {
        const roomTitle = room.title;
        room.isDeleted = true;
        room.deletedAt = new Date();
        room.deletedBy = req.user?._id;
        room.status = 'Unpublished';
        await room.save({ validateBeforeSave: false });
        await writeAuditLog(req, 'ROOM_ARCHIVED', 'Room', req.params.id, {
            title: roomTitle,
        });
        res.json({ message: 'Room archived' });
    } else {
        res.status(404).json({ message: 'Room not found' });
    }
});

/**
 * @desc    Update a user's status (e.g., Ban/Unban)
 * @route   PATCH /api/admin/users/:id/status
 * @access  Private/Admin
 */
exports.updateUserStatus = asyncHandler(async (req, res) => {
    const { status } = req.body;
    const user = await User.findById(req.params.id);

    if (!user) {
        res.status(404);
        throw new Error('User not found');
    }

    if (user.roles.includes('Admin')) {
        res.status(403);
        throw new Error("Admins cannot be banned.");
    }

    user.status = status;
    const updatedUser = await user.save();
    await writeAuditLog(req, 'USER_STATUS_UPDATED', 'User', updatedUser._id, {
        status,
        email: updatedUser.email,
    });
    emitToUser(req, updatedUser._id, 'user_profile_updated', {
        reason: 'status_updated',
        userId: updatedUser._id,
    });

    res.json({
        _id: updatedUser._id,
        name: updatedUser.name,
        email: updatedUser.email,
        roles: updatedUser.roles,
        status: updatedUser.status,
    });
});

/**
 * @desc    Update a user's roles
 * @route   PATCH /api/admin/users/:id/roles
 * @access  Private/Admin
 */
exports.updateUserRoles = asyncHandler(async (req, res) => {
    const { roles } = req.body;
    const user = await User.findById(req.params.id);

    if (!user) {
        res.status(404);
        throw new Error('User not found');
    }

    if (user._id.toString() === req.user._id.toString() && !roles.includes('Admin')) {
        res.status(400);
        throw new Error("Cannot remove your own Admin role.");
    }

    user.roles = roles;
    const updatedUser = await user.save();
    await writeAuditLog(req, 'USER_ROLES_UPDATED', 'User', updatedUser._id, {
        roles,
        email: updatedUser.email,
    });
    emitToUser(req, updatedUser._id, 'user_profile_updated', {
        reason: 'roles_updated',
        userId: updatedUser._id,
    });

    res.json({
        _id: updatedUser._id,
        name: updatedUser.name,
        email: updatedUser.email,
        roles: updatedUser.roles,
        status: updatedUser.status,
    });
});

/**
 * @desc    Mark a user as verified
 * @route   PATCH /api/admin/users/:id/verify
 * @access  Private/Admin
 */
exports.verifyUser = asyncHandler(async (req, res) => {
    const user = await User.findById(req.params.id);

    if (!user) {
        res.status(404);
        throw new Error('User not found');
    }

    user.isVerified = true;
    user.kyc_status = 'Verified';
    user.verificationLevel = 'verified';
    user.trustScore = Math.max(user.trustScore || 0, 75);
    user.verifications = {
        ...(user.verifications || {}),
        identity: true,
        email: user.verifications?.email || user.verifiedEmails?.length > 0,
        phone: user.verifications?.phone || Boolean(user.verifiedPhone),
    };
    const updatedUser = await user.save();

    await Notification.create({
        user: user._id,
        title: 'Your Account is Verified!',
        message: 'Congratulations! An admin has manually verified your account.',
        link: `/profile`
    });

    res.json({
        _id: updatedUser._id,
        name: updatedUser.name,
        isVerified: updatedUser.isVerified,
    });
    await writeAuditLog(req, 'USER_VERIFIED', 'User', updatedUser._id, {
        email: updatedUser.email,
    });
    emitToUser(req, updatedUser._id, 'user_profile_updated', {
        reason: 'verification_updated',
        userId: updatedUser._id,
    });
});

/**
 * @desc    Revoke a user's verification
 * @route   PATCH /api/admin/users/:id/revoke-verification
 * @access  Private/Admin
 */
exports.revokeVerification = asyncHandler(async (req, res) => {
    const user = await User.findById(req.params.id);

    if (!user) {
        res.status(404);
        throw new Error('User not found');
    }

    user.isVerified = false;
    user.kyc_status = 'Rejected';
    user.verificationLevel = 'unverified';
    user.trustScore = Math.min(user.trustScore || 0, 40);
    if (user.verifications) {
        user.verifications.identity = false;
    }
    const updatedUser = await user.save();

    await Notification.create({
        user: user._id,
        title: 'Account Status Update',
        message: 'Your account verification has been revoked by an administrator.',
        link: `/profile`
    });

    res.json({
        _id: updatedUser._id,
        name: updatedUser.name,
        isVerified: updatedUser.isVerified,
    });
    await writeAuditLog(req, 'USER_VERIFICATION_REVOKED', 'User', updatedUser._id, {
        email: updatedUser.email,
    });
    emitToUser(req, updatedUser._id, 'user_profile_updated', {
        reason: 'verification_updated',
        userId: updatedUser._id,
    });
});

/**
 * @desc    Get user signup data grouped by month for charts
 * @route   GET /api/admin/stats/user-signups
 * @access  Private/Admin
 */
exports.getUserSignups = asyncHandler(async (req, res) => {
    const monthlySignups = await User.aggregate([
        {
            $group: {
                _id: {
                    year: { $year: "$createdAt" },
                    month: { $month: "$createdAt" }
                },
                count: { $sum: 1 }
            }
        },
        {
            $sort: { "_id.year": 1, "_id.month": 1 }
        }
    ]);

    const chartData = monthlySignups.map(item => {
        const date = new Date(item._id.year, item._id.month - 1);
        const monthName = date.toLocaleString('en-US', { month: 'short' });
        return {
            date: `${monthName} ${item._id.year}`,
            count: item.count
        };
    });

    res.json(chartData);
});

/**
 * @desc    Get recent platform activities for the dashboard feed
 * @route   GET /api/admin/activities
 * @access  Private/Admin
 */
exports.getRecentActivities = asyncHandler(async (req, res) => {
    // Fetch the 5 most recent user signups (excluding admins)
    const recentUsers = await User.find({ roles: { $ne: 'Admin' } })
        .sort({ createdAt: -1 })
        .limit(5);

    // Fetch the 5 most recent room submissions
    const recentRooms = await Room.find({ isDeleted: { $ne: true } })
        .sort({ createdAt: -1 })
        .limit(5)
        .populate('landlord', 'name'); // Populate landlord name for context

    // Map user signups to a standardized activity format
    const userActivities = recentUsers.map(user => ({
        _id: user._id,
        type: 'NEW_USER',
        timestamp: user.createdAt,
        text: `${user.name} created a new account.`,
        link: `/admin/users/${user._id}`
    }));

    // Map new room submissions to the same format
    const roomActivities = recentRooms.map(room => ({
        _id: room._id,
        type: 'NEW_ROOM',
        timestamp: room.createdAt,
        text: `${room.landlord?.name || 'A user'} listed a new room: "${room.title}"`,
        link: `/admin/rooms/${room._id}/review`
    }));

    // Combine the two arrays, sort by timestamp, and take the most recent 7
    const combinedActivities = [...userActivities, ...roomActivities];
    combinedActivities.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
    const finalFeed = combinedActivities.slice(0, 7);

    res.json(finalFeed);
});

/**
 * @desc    Premium analytics report for admin command center
 * @route   GET /api/admin/analytics
 * @access  Private/Admin
 */
exports.getAnalyticsReport = asyncHandler(async (req, res) => {
    const [
        roomStatusBreakdown,
        userRoleBreakdown,
        applicationStatusBreakdown,
        topCities,
        topRooms,
        weeklyApplications,
        revenueSummary,
    ] = await Promise.all([
        Room.aggregate([
            { $match: { isDeleted: { $ne: true } } },
            { $group: { _id: '$status', count: { $sum: 1 } } },
            { $sort: { count: -1 } },
        ]),
        User.aggregate([
            { $unwind: '$roles' },
            { $group: { _id: '$roles', count: { $sum: 1 } } },
            { $sort: { count: -1 } },
        ]),
        Application.aggregate([
            { $group: { _id: '$status', count: { $sum: 1 } } },
            { $sort: { count: -1 } },
        ]),
        Room.aggregate([
            { $match: { isDeleted: { $ne: true }, 'location.city': { $exists: true, $ne: '' } } },
            {
                $group: {
                    _id: '$location.city',
                    rooms: { $sum: 1 },
                    averageRent: { $avg: '$rent' },
                    views: { $sum: '$views' },
                },
            },
            { $sort: { rooms: -1, views: -1 } },
            { $limit: 8 },
        ]),
        Room.find({ isDeleted: { $ne: true } })
            .sort({ views: -1, createdAt: -1 })
            .limit(6)
            .populate('landlord', 'name email')
            .select('title rent status views location landlord createdAt'),
        Application.aggregate([
            {
                $match: {
                    createdAt: {
                        $gte: new Date(Date.now() - 1000 * 60 * 60 * 24 * 42),
                    },
                },
            },
            {
                $group: {
                    _id: { $dateToString: { format: '%d %b', date: '$createdAt' } },
                    count: { $sum: 1 },
                },
            },
            { $sort: { _id: 1 } },
        ]),
        Application.aggregate(currencySummaryPipeline),
    ]);

    res.json({
        roomStatusBreakdown,
        userRoleBreakdown,
        applicationStatusBreakdown,
        topCities,
        topRooms,
        weeklyApplications,
        revenue: revenueSummary[0] || {
            grossBookingValue: 0,
            platformFees: 0,
            rentVolume: 0,
            pendingPayments: 0,
            paidPayments: 0,
        },
    });
});

/**
 * @desc    Trust and safety report for KYC and listing verification
 * @route   GET /api/admin/verifications
 * @access  Private/Admin
 */
exports.getVerificationCenter = asyncHandler(async (req, res) => {
    const [
        kycStatusBreakdown,
        pendingKycUsers,
        pendingPropertyRooms,
        verificationTotals,
    ] = await Promise.all([
        User.aggregate([
            { $group: { _id: '$kyc_status', count: { $sum: 1 } } },
            { $sort: { count: -1 } },
        ]),
        User.find({
            roles: { $ne: 'Admin' },
            $or: [
                { kyc_status: 'Pending' },
                { kyc_status: 'Unverified' },
                { isVerified: false },
            ],
        })
            .sort({ updatedAt: -1 })
            .limit(20)
            .select('name email roles kyc_status verificationLevel verifications isVerified createdAt'),
        Room.find({
            isDeleted: { $ne: true },
            $or: [
                { status: 'Pending' },
                { status: 'Pending_Review' },
                { 'verifications.property': false },
            ],
        })
            .sort({ updatedAt: -1 })
            .limit(20)
            .populate('landlord', 'name email')
            .select('title status location landlord verifications documents createdAt'),
        User.aggregate([
            {
                $group: {
                    _id: null,
                    verified: { $sum: { $cond: ['$isVerified', 1, 0] } },
                    unverified: { $sum: { $cond: ['$isVerified', 0, 1] } },
                    identityVerified: { $sum: { $cond: ['$verifications.identity', 1, 0] } },
                    propertyVerified: { $sum: { $cond: ['$verifications.property', 1, 0] } },
                },
            },
        ]),
    ]);

    res.json({
        kycStatusBreakdown,
        pendingKycUsers,
        pendingPropertyRooms,
        totals: verificationTotals[0] || {
            verified: 0,
            unverified: 0,
            identityVerified: 0,
            propertyVerified: 0,
        },
    });
});

/**
 * @desc    Revenue, commission, payout and transaction report
 * @route   GET /api/admin/revenue
 * @access  Private/Admin
 */
exports.getRevenueReport = asyncHandler(async (req, res) => {
    const [applicationRevenue, transactionSummary, recentTransactions, payoutByLandlord] = await Promise.all([
        Application.aggregate(currencySummaryPipeline),
        Transaction.aggregate([
            {
                $group: {
                    _id: '$status',
                    count: { $sum: 1 },
                    amount: { $sum: '$amount' },
                    platformFees: { $sum: '$platformFee' },
                    payouts: { $sum: '$landlordPayout' },
                },
            },
            { $sort: { amount: -1 } },
        ]),
        Transaction.find({})
            .sort({ createdAt: -1 })
            .limit(12)
            .populate('student landlord room', 'name email title')
            .select('amount platformFee landlordPayout type status provider createdAt student landlord room'),
        Application.aggregate([
            { $match: { status: { $in: ['approved', 'confirmed'] } } },
            {
                $group: {
                    _id: '$landlord',
                    applications: { $sum: 1 },
                    payoutEstimate: {
                        $sum: {
                            $subtract: [
                                { $ifNull: ['$amountBreakdown.total', 0] },
                                { $ifNull: ['$amountBreakdown.platformFee', 0] },
                            ],
                        },
                    },
                },
            },
            { $sort: { payoutEstimate: -1 } },
            { $limit: 8 },
            {
                $lookup: {
                    from: 'users',
                    localField: '_id',
                    foreignField: '_id',
                    as: 'landlord',
                },
            },
            { $unwind: { path: '$landlord', preserveNullAndEmptyArrays: true } },
            {
                $project: {
                    applications: 1,
                    payoutEstimate: 1,
                    landlord: { name: '$landlord.name', email: '$landlord.email' },
                },
            },
        ]),
    ]);

    res.json({
        summary: applicationRevenue[0] || {
            grossBookingValue: 0,
            platformFees: 0,
            rentVolume: 0,
            pendingPayments: 0,
            paidPayments: 0,
        },
        transactionSummary,
        recentTransactions,
        payoutByLandlord,
    });
});

/**
 * @desc    Support ticket queue for admins
 * @route   GET /api/admin/tickets
 * @access  Private/Admin
 */
exports.getSupportTickets = asyncHandler(async (req, res) => {
    const [tickets, statusBreakdown, priorityBreakdown] = await Promise.all([
        SupportTicket.find({})
            .sort({ createdAt: -1 })
            .limit(50)
            .populate('user assignedAdmin', 'name email roles')
            .populate('application', 'status checkInDate checkOutDate amountBreakdown escrow')
            .populate('room', 'title location rent')
            .select('subject issueDescription category issueType priority status user assignedAdmin application room evidence requestedAmount escrowAction escrowFrozenAt resolutionDecision resolutionNote createdAt updatedAt'),
        SupportTicket.aggregate([
            { $group: { _id: '$status', count: { $sum: 1 } } },
            { $sort: { count: -1 } },
        ]),
        SupportTicket.aggregate([
            { $group: { _id: '$priority', count: { $sum: 1 } } },
            { $sort: { count: -1 } },
        ]),
    ]);

    res.json({ tickets, statusBreakdown, priorityBreakdown });
});

/**
 * @desc    Audit log feed for governance
 * @route   GET /api/admin/logs
 * @access  Private/Admin
 */
exports.getAuditLogs = asyncHandler(async (req, res) => {
    const logs = await AuditLog.find({})
        .sort({ createdAt: -1 })
        .limit(100)
        .populate('admin', 'name email roles')
        .select('action admin targetType target metadata ipAddress createdAt');

    res.json(logs);
});

/**
 * @desc    Platform settings
 * @route   GET /api/admin/settings
 * @access  Private/Admin
 */
exports.getPlatformSettings = asyncHandler(async (req, res) => {
    const defaults = getPlatformDefaults();
    const settings = await PlatformSetting.findOneAndUpdate(
        { key: 'platform' },
        { $setOnInsert: defaults },
        { upsert: true, new: true }
    );

    res.json(settings);
});

/**
 * @desc    Update platform settings
 * @route   PATCH /api/admin/settings
 * @access  Private/Admin
 */
exports.updatePlatformSettings = asyncHandler(async (req, res) => {
    const allowedFields = [
        'platformFee',
        'platformFeePercentage',
        'commissionPercent',
        'maintenanceMode',
        'allowNewSignups',
        'supportEmail',
        'verificationRequired',
        'autoPublishVerifiedLandlords',
        'bookingRequestExpiryHours',
        'payoutHoldHoursAfterCheckIn',
        'disputeWindowHoursAfterCheckIn',
        'escrowEnabled',
        'offlinePaymentAllowed',
    ];

    const numberFields = new Set([
        'platformFee',
        'platformFeePercentage',
        'commissionPercent',
        'bookingRequestExpiryHours',
        'payoutHoldHoursAfterCheckIn',
        'disputeWindowHoursAfterCheckIn',
    ]);
    const booleanFields = new Set([
        'maintenanceMode',
        'allowNewSignups',
        'verificationRequired',
        'autoPublishVerifiedLandlords',
        'escrowEnabled',
        'offlinePaymentAllowed',
    ]);

    const updates = {};
    allowedFields.forEach((field) => {
        if (Object.prototype.hasOwnProperty.call(req.body, field)) {
            if (numberFields.has(field)) {
                const value = Number(req.body[field]);
                if (Number.isFinite(value)) {
                    updates[field] = value;
                }
                return;
            }

            if (booleanFields.has(field)) {
                updates[field] = req.body[field] === true || req.body[field] === 'true';
                return;
            }

            updates[field] = req.body[field];
        }
    });

    const insertDefaults = Object.fromEntries(
        Object.entries(getPlatformDefaults()).filter(([field]) => !Object.prototype.hasOwnProperty.call(updates, field))
    );

    const settings = await PlatformSetting.findOneAndUpdate(
        { key: 'platform' },
        { $set: updates, $setOnInsert: insertDefaults },
        { upsert: true, new: true, runValidators: true }
    );

    await writeAuditLog(req, 'PLATFORM_SETTINGS_UPDATED', 'PlatformSetting', settings._id, updates);
    emitPlatformSettings(req, settings);
    res.json(settings);
});
