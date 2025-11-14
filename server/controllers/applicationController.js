const Application = require('../models/Application');
const Room = require('../models/Room');
const Conversation = require('../models/Conversation');
const Message = require('../models/Message');
const asyncHandler = require('express-async-handler');
const mongoose = require('mongoose');

// This helper function is used to send confirmation messages
const postSystemMessage = async ({ landlordId, studentId, roomId, text }) => {
    try {
        const conversation = await Conversation.findOne({ roomId, members: { $all: [studentId, landlordId] } });
        if (!conversation) return;
        const systemMessage = new Message({
            conversationId: conversation._id,
            sender: landlordId,
            messageType: 'text',
            text: text,
            readBy: [landlordId]
        });
        await systemMessage.save();
        conversation.lastMessage = systemMessage._id;
        await conversation.save();
    } catch (error) {
        console.error('Error posting system message:', error);
    }
};

const createInquiry = asyncHandler(async (req, res) => {
    const { roomId, message } = req.body;
    const studentId = req.user._id;
    if (!roomId) { res.status(400); throw new Error('Room ID is required.'); }
    const room = await Room.findById(roomId);
    if (!room) { res.status(404); throw new Error('Room not found'); }
    const landlordId = room.landlord;
    if (studentId.toString() === landlordId.toString()) { res.status(400); throw new Error('You cannot inquire about your own room.'); }
    const inquiry = new Application({ room: roomId, student: studentId, landlord: landlordId, message, type: 'inquiry', status: 'pending' });
    const createdInquiry = await inquiry.save();
    res.status(201).json(createdInquiry);
});

const createApplication = asyncHandler(async (req, res) => {
    const { roomId, checkInDate, checkOutDate, occupants, message: studentMessage, ...otherDetails } = req.body;
    const studentId = req.user._id;

    if (!roomId || !checkInDate || !checkOutDate || !occupants || !occupants.adults) {
        res.status(400); throw new Error('Please provide all required fields.');
    }

    const room = await Room.findById(roomId).populate('landlord');
    if (!room) { res.status(404); throw new Error('Room not found'); }

    const landlordId = room.landlord._id;
    const application = new Application({ room: roomId, student: studentId, landlord: landlordId, checkInDate, checkOutDate, occupants, message: studentMessage, type: 'request', ...otherDetails });
    const createdApplication = await application.save();

    let conversation = await Conversation.findOne({ roomId: roomId, members: { $all: [studentId, landlordId] } });
    if (!conversation) {
        conversation = new Conversation({ roomId: roomId, members: [studentId, landlordId], conversationType: 'booking' });
        await conversation.save();
    }

    const systemMessage = new Message({
        conversationId: conversation._id,
        sender: studentId,
        messageType: 'booking_request',
        bookingRequest: {
            applicationId: createdApplication._id,
            roomTitle: room.title,
            status: createdApplication.status,
            fullName: createdApplication.fullName,
            mobileNumber: createdApplication.mobileNumber,
            profileType: createdApplication.profileType,
            message: createdApplication.message,
            checkInDate: createdApplication.checkInDate,
            checkOutDate: createdApplication.checkOutDate,
            occupants: createdApplication.occupants
        },
        readBy: [studentId]
    });

    await systemMessage.save();
    conversation.lastMessage = systemMessage._id;
    await conversation.save();

    res.status(201).json({ success: true, application: createdApplication, conversationId: conversation._id });
});

const getStudentApplications = asyncHandler(async (req, res) => {
    const applications = await Application.find({ student: req.user._id }).populate('room', 'title address city rent images').populate('landlord', 'name').sort({ createdAt: -1 });
    res.status(200).json(applications);
});

const getLandlordApplications = asyncHandler(async (req, res) => {
    const applications = await Application.find({ landlord: req.user._id }).populate('student', 'name avatarUrl').populate('room', 'title');
    res.status(200).json(applications);
});

const approveApplication = asyncHandler(async (req, res) => {
    const application = await Application.findById(req.params.id).populate('room');
    if (!application) { res.status(404); throw new Error('Application not found'); }
    if (application.landlord.toString() !== req.user._id.toString()) { res.status(401); throw new Error('Not authorized'); }
    if (application.status !== 'pending') { res.status(400); throw new Error('Application already processed'); }

    application.status = 'approved';
    await application.save();

    await Message.findOneAndUpdate({ "bookingRequest.applicationId": application._id }, { $set: { "bookingRequest.status": "approved" } });

    await postSystemMessage({ landlordId: application.landlord, studentId: application.student, roomId: application.room._id, text: `Your booking request for "${application.room.title}" has been approved.` });

    res.status(200).json({ message: 'Application approved.', application });
});

const rejectApplication = asyncHandler(async (req, res) => {
    const application = await Application.findById(req.params.id).populate('room');
    if (!application) { res.status(404); throw new Error('Application not found'); }
    if (application.landlord.toString() !== req.user._id.toString()) { res.status(401); throw new Error('Not authorized'); }
    if (application.status !== 'pending') { res.status(400); throw new Error('Application already processed'); }

    application.status = 'rejected';
    await application.save();

    await Message.findOneAndUpdate({ "bookingRequest.applicationId": application._id }, { $set: { "bookingRequest.status": "rejected" } });

    await postSystemMessage({ landlordId: application.landlord, studentId: application.student, roomId: application.room._id, text: `Unfortunately, your booking request for "${application.room.title}" has been declined.` });

    res.status(200).json({ message: 'Application rejected successfully', application });
});

const cancelApplication = asyncHandler(async (req, res) => {
    const application = await Application.findById(req.params.id);
    if (!application) { res.status(404); throw new Error('Application not found'); }
    application.status = 'cancelled';
    await application.save();
    res.status(200).json({ message: 'Booking cancelled', application });
});

const confirmPayment = asyncHandler(async (req, res) => {
    const application = await Application.findById(req.params.id);
    if (!application) { res.status(404); throw new Error('Application not found'); }
    application.status = 'confirmed';
    await application.save();
    res.status(200).json({ message: 'Booking confirmed', application });
});

const updateApplication = asyncHandler(async (req, res) => {
    const application = await Application.findById(req.params.id);

    if (!application) {
        res.status(404);
        throw new Error('Application not found');
    }

    if (application.student.toString() !== req.user._id.toString()) {
        res.status(401);
        throw new Error('You are not authorized to update this application.');
    }

    if (application.status !== 'pending') {
        res.status(400);
        throw new Error(`You cannot update an application with '${application.status}' status.`);
    }

    Object.assign(application, req.body);
    application.isUpdated = true;

    const updatedApplication = await application.save();

    await postSystemMessage({
        landlordId: application.landlord,
        studentId: application.student,
        roomId: application.room,
        text: `The booking application for this room has been updated by the student.`
    });

    res.status(200).json({
        message: 'Application updated successfully',
        application: updatedApplication
    });
});

module.exports = {
    createApplication,
    createInquiry,
    getStudentApplications,
    getLandlordApplications,
    approveApplication,
    rejectApplication,
    cancelApplication,
    confirmPayment,
    updateApplication, 
};