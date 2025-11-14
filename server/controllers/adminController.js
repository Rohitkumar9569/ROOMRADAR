const Room = require('../models/Room');
const User = require('../models/User');
const Application = require('../models/Application');
const asyncHandler = require('express-async-handler');
const Notification = require('../models/Notification');

/**
 * @desc    Get all key stats for the admin dashboard
 * @route   GET /api/admin/stats
 * @access  Private/Admin
 */
exports.getDashboardStats = asyncHandler(async (req, res) => {
    const totalUsers = await User.countDocuments();
    const totalLandlords = await User.countDocuments({ roles: 'Landlord' });
    const totalRooms = await Room.countDocuments();
    const pendingRoomsCount = await Room.countDocuments({ status: 'Pending' });
    const publishedRoomsCount = await Room.countDocuments({ status: 'Published' });
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
    const pendingRooms = await Room.find({ status: 'Pending' }).populate('landlord', 'name email');
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
        aggregatedData.listings = await Room.find({ landlord: userId }).sort({ createdAt: -1 });
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
    let filter = {};

    if (status && status !== 'All') {
        filter.status = status;
    }

    const rooms = await Room.find(filter).populate('landlord', 'name');
    res.json(rooms);
});

/**
 * @desc    Approve a room listing
 * @route   PATCH /api/admin/rooms/:id/approve
 * @access  Private/Admin
 */
exports.approveRoom = asyncHandler(async (req, res) => {
    const room = await Room.findById(req.params.id);
    if (room) {
        room.status = 'Published';
        const updatedRoom = await room.save();
        await Notification.create({
            user: room.landlord,
            title: 'Your Room is Live!',
            message: `Congratulations! Your room "${room.title}" has been approved.`,
            link: `/landlord/my-rooms`
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
    const room = await Room.findById(req.params.id);
    if (room) {
        room.status = 'Unpublished';
        room.rejectionReason = reason;
        const updatedRoom = await room.save();
        await Notification.create({
            user: room.landlord,
            title: 'Update on Your Room Submission',
            message: `Your room "${room.title}" was not approved. Reason: ${reason || 'Not provided'}.`,
            link: `/landlord/my-rooms`
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
    const room = await Room.findById(req.params.id);

    if (room) {
        await room.deleteOne();
        res.json({ message: 'Room permanently deleted' });
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
    const recentRooms = await Room.find({})
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