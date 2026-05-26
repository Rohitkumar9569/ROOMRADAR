// server/controllers/landlordController.js 
const Room = require('../models/Room');
const Application = require('../models/Application');
const asyncHandler = require('express-async-handler');
const mongoose = require('mongoose');

const getDashboardDetails = async (req, res) => {
    // (your existing getDashboardDetails function - no changes needed here)
};

const getLandlordStats = asyncHandler(async (req, res) => {
    const landlordId = req.user._id;
    const landlordObjectId = landlordId instanceof mongoose.Types.ObjectId
        ? landlordId
        : new mongoose.Types.ObjectId(landlordId);
    const monthStart = new Date();
    monthStart.setDate(1);
    monthStart.setHours(0, 0, 0, 0);

    const [
        totalRooms,
        pendingRequests,
        confirmedBookings,
        viewsResult,
        statusBreakdown,
        pendingApplications,
        confirmedThisMonth
    ] = await Promise.all([
        Room.countDocuments({ landlord: landlordId, isDeleted: { $ne: true } }),
        Application.countDocuments({ landlord: landlordId, status: 'pending' }),
        Application.countDocuments({ landlord: landlordId, status: 'confirmed' }),
        Room.aggregate([
            { $match: { landlord: landlordObjectId, isDeleted: { $ne: true } } },
            { $group: { _id: null, total: { $sum: { $ifNull: ['$views', 0] } } } }
        ]),
        Room.aggregate([
            { $match: { landlord: landlordObjectId, isDeleted: { $ne: true } } },
            { $group: { _id: '$status', value: { $sum: 1 } } },
            { $project: { _id: 0, name: { $ifNull: ['$_id', 'Unpublished'] }, value: 1 } }
        ]),
        Application.find({ landlord: landlordId, status: 'pending' })
            .populate('room', 'title rent imageUrl images location')
            .populate('student', 'name email mobileNumber avatarUrl profilePicture')
            .sort({ createdAt: -1 })
            .limit(6)
            .lean(),
        Application.find({
            landlord: landlordId,
            status: 'confirmed',
            confirmedAt: { $gte: monthStart }
        })
            .populate('room', 'rent')
            .lean()
    ]);

    const monthlyEarnings = confirmedThisMonth.reduce((total, application) => {
        if (application.amountBreakdown?.total) return total + Number(application.amountBreakdown.total);
        const rent = Number(application.room?.rent || 0);
        const months = Number(application.durationMonths || application.amountBreakdown?.durationMonths || 1);
        return total + (rent * months);
    }, 0);

    res.json({
        totalRooms,
        pendingRequests,
        confirmedBookings,
        thisMonthViews: viewsResult[0]?.total || 0,
        monthlyEarnings,
        statusBreakdown: statusBreakdown || [],
        pendingApplications: pendingApplications || []
    });
});


// @desc    Get all data needed for the landlord's booking calendar
// @route   GET /api/landlords/calendar-data
// @access  Private/Landlord
const getCalendarData = asyncHandler(async (req, res) => {
    const landlordId = req.user._id;

    // Get a simple list of the landlord's rooms for the filter dropdown
    const rooms = await Room.find({ landlord: landlordId, isDeleted: { $ne: true } }).select('_id title');

    // Get all pending and confirmed applications for this landlord
    const applications = await Application.find({
        landlord: landlordId,
        status: { $in: ['confirmed', 'pending'] }
    })
    .populate('room', 'title color rent imageUrl images')
    .populate('student', 'name email mobileNumber phone');

    //Format the applications into events for FullCalendar
    const bookings = applications.map(app => {
        const roomTitle = app.room?.title || 'Room';
        const studentName = app.student?.name || app.fullName || 'Applicant';
        let title = '';

        if (app.status === 'confirmed') {
            title = `${roomTitle} - Booked by ${studentName}`;
        } else { // 'pending'
            title = `${roomTitle} - Pending Request`;
        }

        const roomId = app.room?._id || app.room;
        
        return {
            id: app._id,
            _id: app._id,
            applicationId: app._id,
            roomId,
            title: title,
            start: app.checkInDate,
            end: app.checkOutDate,
            checkInDate: app.checkInDate,
            checkOutDate: app.checkOutDate,
            status: app.status,
            type: app.type,
            message: app.message,
            durationMonths: app.durationMonths,
            room: app.room ? {
                _id: app.room._id,
                title: app.room.title,
                color: app.room.color,
                rent: app.room.rent,
                imageUrl: app.room.imageUrl,
                images: app.room.images || [],
            } : null,
            student: app.student ? {
                _id: app.student._id,
                name: app.student.name,
                email: app.student.email,
                phone: app.student.mobileNumber || app.student.phone || app.mobileNumber,
            } : {
                name: app.fullName || 'Applicant',
                phone: app.mobileNumber,
            },
            url: `/landlord/applications?status=${app.status}`,
            // Using the color from the Room model 
            backgroundColor: app.room?.color || '#3b82f6',
            borderColor: app.room?.color || '#3b82f6',
        };
    });

    // Send both lists back to the frontend
    res.json({ rooms, bookings });
});


module.exports = {
    getDashboardDetails,
    getLandlordStats,
    getCalendarData,
};
