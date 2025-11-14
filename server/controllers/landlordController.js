// server/controllers/landlordController.js 
const Room = require('../models/Room');
const Application = require('../models/Application');
const asyncHandler = require('express-async-handler');
const mongoose = require('mongoose');

const getDashboardDetails = async (req, res) => {
    // (your existing getDashboardDetails function - no changes needed here)
};


// @desc    Get all data needed for the landlord's booking calendar
// @route   GET /api/landlords/calendar-data
// @access  Private/Landlord
const getCalendarData = asyncHandler(async (req, res) => {
    const landlordId = req.user._id;

    // Get a simple list of the landlord's rooms for the filter dropdown
    const rooms = await Room.find({ landlord: landlordId }).select('_id title');

    // Get all pending and confirmed applications for this landlord
    const applications = await Application.find({
        landlord: landlordId,
        status: { $in: ['confirmed', 'pending'] }
    })
    .populate('room', 'title color') 
    .populate('student', 'name');

    //Format the applications into events for FullCalendar
    const bookings = applications.map(app => {
        let title = '';

        if (app.status === 'confirmed') {
            title = `${app.room.title} - Booked by ${app.student.name}`;
        } else { // 'pending'
            title = `${app.room.title} - Pending Request`;
        }
        
        return {
            id: app._id,
            roomId: app.room._id,
            title: title,
            start: app.checkInDate,
            end: app.checkOutDate,
            // Using the color from the Room model 
            backgroundColor: app.room.color || '#3b82f6',
            borderColor: app.room.color || '#3b82f6',
        };
    });

    // Send both lists back to the frontend
    res.json({ rooms, bookings });
});


module.exports = {
    getDashboardDetails,
    getCalendarData,
};