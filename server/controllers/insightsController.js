const Room = require('../models/Room');
const Application = require('../models/Application');
const asyncHandler = require('express-async-handler');
const mongoose = require('mongoose');

// @desc    Get room status breakdown for the landlord
// @route   GET /api/insights/room-status
// @access  Private/Landlord
exports.getRoomStatusData = asyncHandler(async (req, res) => {
    const landlordId = req.user._id;

    const stats = await Room.aggregate([
        { $match: { landlord: landlordId } },
        { $group: { _id: '$status', count: { $sum: 1 } } }
    ]);

    const formattedStats = stats.map(stat => ({
        name: stat._id,
        value: stat.count
    }));

    res.json(formattedStats);
});

// @desc    Get earnings data for the last 6 months
// @route   GET /api/insights/earnings
// @access  Private/Landlord
exports.getEarningsData = asyncHandler(async (req, res) => {
    const landlordId = req.user._id;
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

    const earnings = await Application.aggregate([
        {
            $match: {
                landlord: landlordId,
                status: 'Confirmed',
                createdAt: { $gte: sixMonthsAgo }
            }
        },
        {
            $group: {
                _id: { month: { $month: '$createdAt' }, year: { $year: '$createdAt' } },
                totalEarnings: { $sum: '$rent' }
            }
        },
        { $sort: { '_id.year': 1, '_id.month': 1 } }
    ]);

    const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sept", "Oct", "Nov", "Dec"];
    const formattedEarnings = earnings.map(item => ({
        name: `${monthNames[item._id.month - 1]} '${String(item._id.year).slice(2)}`,
        earnings: item.totalEarnings
    }));

    res.json(formattedEarnings);
});

// @desc    Get top 5 most viewed listings for a landlord
// @route   GET /api/insights/top-listings
// @access  Private/Landlord
exports.getTopListingsData = asyncHandler(async (req, res) => {
    const landlordId = req.user._id;

    const topListings = await Room.find({ landlord: landlordId })
        .sort({ views: -1 }) // Sort by views in descending order
        .limit(5)           // Get only the top 5
        .select('title views'); // Select only the title and views fields

    res.json(topListings);
});