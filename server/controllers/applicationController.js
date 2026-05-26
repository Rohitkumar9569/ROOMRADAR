const Application = require('../models/Application');
const Room = require('../models/Room');
const Conversation = require('../models/Conversation');
const Message = require('../models/Message');
const asyncHandler = require('express-async-handler');
const PlatformSetting = require('../models/PlatformSetting');
const Transaction = require('../models/Transaction');
const Review = require('../models/Review');
const GuestReview = require('../models/GuestReview');
const mongoose = require('mongoose');
const { toOptionalDate } = require('../utils/dateUtils');
const { normalizeOptionalIndianMobile, requireValidIndianMobile } = require('../utils/phoneUtils');

const ACTIVE_APPLICATION_STATUSES = ['pending', 'approved', 'confirmed'];
const LOCKED_INVENTORY_STATUSES = ['approved', 'confirmed', 'external', 'blocked'];
const BOOKABLE_ROOM_STATUSES = new Set(['published', 'available']);
const INQUIRY_ROOM_STATUSES = new Set(['published', 'available', 'booked', 'confirmed']);

const hasRoomStatus = (room, statuses) => statuses.has(String(room?.status || '').toLowerCase());

const getDateInputValue = (date) => {
    const copy = new Date(date);
    copy.setMinutes(copy.getMinutes() - copy.getTimezoneOffset());
    return copy.toISOString().slice(0, 10);
};

const getTomorrowDateInputValue = () => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    return getDateInputValue(tomorrow);
};

const normalizeOccupantsPayload = (occupants) => {
    const source = occupants && typeof occupants === 'object' ? occupants : { adults: occupants };
    const normalizeCount = (value, fallback, minimum = 0) => {
        const count = Number(value);
        return Number.isFinite(count) ? Math.max(count, minimum) : fallback;
    };

    return {
        adults: normalizeCount(source.adults, 1, 1),
        children: normalizeCount(source.children, 0, 0),
        males: normalizeCount(source.males, 0, 0),
        females: normalizeCount(source.females, 0, 0),
    };
};

const makeHttpError = (statusCode, message) => {
    const error = new Error(message);
    error.statusCode = statusCode;
    return error;
};

const getUnreadConversationCountForUser = async (userId) => {
    const normalizedUserId = new mongoose.Types.ObjectId(userId);
    const conversations = await Conversation.find({ members: normalizedUserId }).select('_id').lean();
    const conversationIds = conversations.map((conversation) => conversation._id);

    if (conversationIds.length === 0) return 0;

    return Message.countDocuments({
        conversationId: { $in: conversationIds },
        sender: { $ne: normalizedUserId },
        readBy: { $ne: normalizedUserId }
    });
};

const emitUnreadConversationCount = async (userId) => {
    try {
        const { io } = require('../index');
        if (!io || !userId) return;
        const count = await getUnreadConversationCountForUser(userId);
        io.to(userId.toString()).emit('unread_count_update', { count });
    } catch (error) {
        // Socket count sync should not block booking actions.
    }
};

const emitChatMessageToRecipients = async ({
    conversationId,
    message,
    senderId,
    receiverIds = [],
    text = '',
    messageType = 'text',
    senderName = '',
    roomTitle = '',
}) => {
    try {
        const { io } = require('../index');
        if (!io || !conversationId || !message) return;

        const payload = {
            _id: message._id,
            senderId: senderId?.toString(),
            senderName,
            text,
            messageType,
            conversationId: conversationId.toString(),
            roomTitle,
            createdAt: message.createdAt,
        };

        receiverIds.forEach((receiverId) => {
            if (receiverId) io.to(receiverId.toString()).emit('getMessage', payload);
        });

        await Promise.all(receiverIds.map((receiverId) => emitUnreadConversationCount(receiverId)));
    } catch (error) {
        // Realtime fan-out is best-effort; persisted booking state is the source of truth.
    }
};

const getApplicationDateRange = (application) => {
    const startDate = toOptionalDate(application.checkInDate);
    const endDate = toOptionalDate(application.checkOutDate);

    if (!startDate || !endDate || endDate.getTime() <= startDate.getTime()) {
        throw makeHttpError(400, 'Please choose a valid move-in and move-out date.');
    }

    return { startDate, endDate };
};

const canUseTransactions = () => {
    const topologyType = mongoose.connection.client?.topology?.description?.type;
    return ['ReplicaSetWithPrimary', 'Sharded'].includes(topologyType);
};

const runWithOptionalTransaction = async (work) => {
    if (!canUseTransactions()) return work(null);

    const session = await mongoose.startSession();
    let result;
    try {
        await session.withTransaction(async () => {
            result = await work(session);
        });
        return result;
    } finally {
        await session.endSession();
    }
};

const withSession = (query, session) => (session ? query.session(session) : query);
const saveWithSession = (document, session) => (session ? document.save({ session }) : document.save());

const getRoomId = (application) => application.room?._id || application.room;

const allowsOfflinePayment = (room = {}) => {
    const preference = String(room.paymentPreference || '').toLowerCase();
    return Boolean(
        room.offlinePaymentAllowed ||
        preference.includes('offline') ||
        preference.includes('cash') ||
        preference.includes('upi') ||
        preference.includes('bank transfer')
    );
};

const getRangeForApplication = (application, status) => ({
    application: application._id,
    ...getApplicationDateRange(application),
    status,
    source: 'RoomRadar',
});

const lockApplicationRange = async (application, session) => {
    const roomId = getRoomId(application);
    const { startDate, endDate } = getApplicationDateRange(application);

    const lockedRoom = await withSession(Room.findOneAndUpdate(
        {
            _id: roomId,
            isDeleted: { $ne: true },
            unavailableRanges: {
                $not: {
                    $elemMatch: {
                        status: { $in: LOCKED_INVENTORY_STATUSES },
                        startDate: { $lt: endDate },
                        endDate: { $gt: startDate },
                    },
                },
            },
        },
        { $push: { unavailableRanges: getRangeForApplication(application, 'approved') } },
        { new: true }
    ), session);

    if (!lockedRoom) {
        throw makeHttpError(409, 'These dates were just reserved by another booking. Please choose another room or date.');
    }

    return lockedRoom;
};

const confirmApplicationRange = async (application, session) => {
    const roomId = getRoomId(application);
    const { startDate, endDate } = getApplicationDateRange(application);
    const bookingPayload = {
        student: application.student,
        checkInDate: application.checkInDate,
        paymentMethod: application.paymentMethod === 'cash' ? 'Cash' : 'Online',
        paymentStatus: 'Paid',
        bookedAt: new Date(),
    };

    let room = await withSession(Room.findOneAndUpdate(
        {
            _id: roomId,
            'unavailableRanges.application': application._id,
        },
        {
            $set: {
                'unavailableRanges.$.status': 'confirmed',
                status: 'Booked',
                booking: bookingPayload,
                availableFrom: endDate,
            },
        },
        { new: true }
    ), session);

    if (!room) {
        room = await withSession(Room.findOneAndUpdate(
            {
                _id: roomId,
                isDeleted: { $ne: true },
                unavailableRanges: {
                    $not: {
                        $elemMatch: {
                            status: { $in: LOCKED_INVENTORY_STATUSES },
                            startDate: { $lt: endDate },
                            endDate: { $gt: startDate },
                        },
                    },
                },
            },
            {
                $push: { unavailableRanges: getRangeForApplication(application, 'confirmed') },
                $set: {
                    status: 'Booked',
                    booking: bookingPayload,
                    availableFrom: endDate,
                },
            },
            { new: true }
        ), session);
    }

    if (!room) {
        throw makeHttpError(409, 'This room is no longer available for the selected dates.');
    }

    return room;
};

const releaseApplicationRange = async (application, session) => {
    return withSession(Room.findByIdAndUpdate(getRoomId(application), {
        $pull: { unavailableRanges: { application: application._id } },
    }), session);
};

const normalizeMoney = (value) => {
    if (typeof value === 'number') return value;

    if (typeof value === 'string') {
        const numeric = Number(value.replace(/[^\d.]/g, ''));
        return Number.isFinite(numeric) ? numeric : 0;
    }

    return 0;
};

const hasExplicitMoneyValue = (value) => (
    value !== undefined
    && value !== null
    && String(value).trim() !== ''
);

const getPlatformSettings = async () => {
    const defaults = {
        platformFee: Number(process.env.PLATFORM_FEE || 500),
        platformFeePercentage: Number(process.env.PLATFORM_FEE_PERCENTAGE || 5),
        bookingRequestExpiryHours: Number(process.env.BOOKING_REQUEST_EXPIRY_HOURS || 24),
        payoutHoldHoursAfterCheckIn: Number(process.env.PAYOUT_HOLD_HOURS_AFTER_CHECKIN || 24),
        escrowEnabled: process.env.ESCROW_ENABLED !== 'false',
        offlinePaymentAllowed: process.env.OFFLINE_PAYMENT_ALLOWED !== 'false',
    };

    const settings = await PlatformSetting.findOne({ key: 'platform' }).lean();
    return { ...defaults, ...(settings || {}) };
};

const buildAmountBreakdown = async (room, durationMonths = 1) => {
    const rent = normalizeMoney(room?.rent);
    const securityDeposit = hasExplicitMoneyValue(room?.securityDeposit)
        ? normalizeMoney(room.securityDeposit)
        : rent;
    const months = Math.max(Number(durationMonths) || 1, 1);
    const settings = await getPlatformSettings();
    const rentVolume = rent * months;
    const platformFee = Math.round(
        Number(settings.platformFee || 0) + (rentVolume * (Number(settings.platformFeePercentage || 0) / 100))
    );

    return {
        rent,
        durationMonths: months,
        securityDeposit,
        platformFee,
        total: rentVolume + securityDeposit + platformFee
    };
};

const getExpiryDate = async () => {
    const settings = await getPlatformSettings();
    const hours = Math.max(Number(settings.bookingRequestExpiryHours || 24), 1);
    return new Date(Date.now() + hours * 60 * 60 * 1000);
};

const getPayoutReleaseAfter = async (checkInDate) => {
    const settings = await getPlatformSettings();
    const releaseAfter = toOptionalDate(checkInDate) || new Date();
    releaseAfter.setHours(releaseAfter.getHours() + Number(settings.payoutHoldHoursAfterCheckIn || 24));
    return releaseAfter;
};

const expirePendingApplications = async (filter = {}) => {
    const now = new Date();
    await Application.updateMany(
        {
            ...filter,
            type: 'request',
            status: 'pending',
            requestExpiresAt: { $lte: now },
        },
        {
            $set: {
                status: 'expired',
                paymentStatus: 'refunded',
                'escrow.status': 'refunded',
                'escrow.refundedAt': now,
                'escrow.notes': 'Auto-expired after landlord response window.',
            },
        }
    );
};

const expireApplicationIfNeeded = async (application, session) => {
    if (
        application?.status === 'pending' &&
        application.requestExpiresAt &&
        toOptionalDate(application.requestExpiresAt)?.getTime() <= Date.now()
    ) {
        application.status = 'expired';
        application.paymentStatus = 'refunded';
        application.escrow = {
            ...(application.escrow || {}),
            status: 'refunded',
            refundedAt: new Date(),
            notes: 'Auto-expired after landlord response window.',
        };
        await saveWithSession(application, session);
        throw makeHttpError(410, 'This booking request expired because the 24-hour landlord response window is over.');
    }
};

const calculateHostCancellationPenalty = (application) => {
    const total = Number(application.amountBreakdown?.total || 0);
    const checkIn = toOptionalDate(application.checkInDate) || new Date();
    const hoursUntilCheckIn = (checkIn.getTime() - Date.now()) / (1000 * 60 * 60);
    let percent = 10;
    let reason = 'More than 30 days before check-in';

    if (hoursUntilCheckIn <= 48) {
        percent = 50;
        reason = 'Within 48 hours of check-in';
    } else if (hoursUntilCheckIn <= 30 * 24) {
        percent = 25;
        reason = 'Within 30 days of check-in';
    }

    return {
        percent,
        amount: Math.round(total * (percent / 100)),
        reason,
        calendarBlocked: true,
        waived: false,
    };
};

const blockCancelledDates = async (application, session) => {
    const { startDate, endDate } = getApplicationDateRange(application);
    return withSession(Room.findByIdAndUpdate(getRoomId(application), {
        $pull: { unavailableRanges: { application: application._id } },
        $push: {
            unavailableRanges: {
                application: application._id,
                startDate,
                endDate,
                status: 'blocked',
                source: 'RoomRadar',
                reason: 'Host cancellation penalty block',
            },
        },
        $set: { status: 'Published', booking: null },
    }), session);
};

const getDayStart = (value = new Date()) => {
    const date = toOptionalDate(value) || new Date();
    date.setHours(0, 0, 0, 0);
    return date;
};

const applyApprovedStayChangeInventory = async (application, session) => {
    const roomId = getRoomId(application);
    const { startDate, endDate } = getApplicationDateRange(application);
    const today = getDayStart();
    const isAlreadyMovedOut = endDate.getTime() <= today.getTime();
    const bookingPayload = isAlreadyMovedOut
        ? null
        : {
            student: application.student,
            checkInDate: application.checkInDate,
            paymentMethod: application.paymentMethod === 'cash' ? 'Cash' : 'Online',
            paymentStatus: application.paymentStatus === 'paid' ? 'Paid' : 'Pending',
            bookedAt: application.confirmedAt || new Date(),
        };

    const room = await withSession(Room.findOne(
        {
            _id: roomId,
            isDeleted: { $ne: true },
            unavailableRanges: {
                $not: {
                    $elemMatch: {
                        application: { $ne: application._id },
                        status: { $in: LOCKED_INVENTORY_STATUSES },
                        startDate: { $lt: endDate },
                        endDate: { $gt: startDate },
                    },
                },
            },
        }
    ), session);

    if (!room) {
        throw makeHttpError(409, 'The requested date conflicts with another booking. Please choose another date.');
    }

    room.unavailableRanges = (room.unavailableRanges || []).filter((range) => (
        range.application?.toString() !== application._id.toString()
    ));
    room.unavailableRanges.push(getRangeForApplication(application, 'confirmed'));
    room.status = isAlreadyMovedOut ? 'Published' : 'Booked';
    room.booking = bookingPayload;
    room.availableFrom = endDate;
    await saveWithSession(room, session);

    return room;
};

const createBookingTransaction = async (application, session) => {
    const amount = Number(application.amountBreakdown?.total || 0);
    const platformFee = Number(application.amountBreakdown?.platformFee || 0);
    const landlordPayout = Math.max(amount - platformFee, 0);
    const releaseAfter = await getPayoutReleaseAfter(application.checkInDate);
    const paymentMethod = application.paymentMethod || 'manual';

    return withSession(Transaction.findOneAndUpdate(
        { application: application._id, type: 'booking_payment' },
        {
            $set: {
                student: application.student,
                landlord: application.landlord,
                room: getRoomId(application),
                amount,
                platformFee,
                landlordPayout,
                status: paymentMethod === 'cash' ? 'pending' : 'held',
                provider: paymentMethod,
                releaseAfter,
                notes: paymentMethod === 'cash'
                    ? 'Offline payment selected; admin can reconcile manually.'
                    : 'Escrow-style hold until post check-in payout release.',
            },
            $setOnInsert: { type: 'booking_payment' },
        },
        { upsert: true, new: true }
    ), session);
};

const buildGuidebookMessage = (room) => {
    const guidebook = {
        ...(room?.guidebook || {}),
        wifiName: room?.guidebook?.wifiName || room?.wifiName,
        wifiPassword: room?.guidebook?.wifiPassword || room?.wifiPassword,
        checkInInstructions: room?.guidebook?.checkInInstructions || room?.checkInInstructions,
        applianceInstructions: room?.guidebook?.applianceInstructions || room?.applianceInstructions,
        localTips: room?.guidebook?.localTips || room?.localTips,
        emergencyContactName: room?.guidebook?.emergencyContactName || room?.emergencyContactName,
        emergencyContactPhone: room?.guidebook?.emergencyContactPhone || room?.emergencyContactPhone,
    };
    const parts = [
        `Digital guidebook for "${room?.title || 'your room'}":`,
        guidebook.checkInInstructions ? `Check-in: ${guidebook.checkInInstructions}` : null,
        guidebook.wifiName ? `WiFi: ${guidebook.wifiName}` : null,
        guidebook.wifiPassword ? `WiFi password: ${guidebook.wifiPassword}` : null,
        guidebook.applianceInstructions ? `Appliances: ${guidebook.applianceInstructions}` : null,
        guidebook.localTips ? `Local tips: ${guidebook.localTips}` : null,
        guidebook.emergencyContactName || guidebook.emergencyContactPhone
            ? `Emergency contact: ${[guidebook.emergencyContactName, guidebook.emergencyContactPhone].filter(Boolean).join(' - ')}`
            : null,
    ].filter(Boolean);

    return parts.length > 1
        ? parts.join('\n')
        : `Booking confirmed for "${room?.title || 'your room'}". The host will share final check-in instructions before move-in.`;
};

const isApplicationMember = (application, userId) => {
    const normalizedUserId = userId.toString();
    return (
        application.student?.toString() === normalizedUserId ||
        application.student?._id?.toString() === normalizedUserId ||
        application.landlord?.toString() === normalizedUserId ||
        application.landlord?._id?.toString() === normalizedUserId
    );
};

const emitBookingStatus = (application, status) => {
    const { io } = require('../index');
    if (!io) return;

    io.to(application.landlord.toString()).emit('bookingStatusUpdated', {
        applicationId: application._id,
        status
    });
    io.to(application.student.toString()).emit('bookingStatusUpdated', {
        applicationId: application._id,
        status
    });
};

const postSystemMessage = async ({ landlordId, studentId, roomId, text, senderId }) => {
    try {
        const conversation = await Conversation.findOne({
            roomId,
            members: { $all: [studentId, landlordId] }
        });

        if (!conversation) return;

        const messageSender = senderId || landlordId;
        const systemMessage = new Message({
            conversationId: conversation._id,
            sender: messageSender,
            messageType: 'system_update',
            text,
            readBy: [messageSender]
        });

        await systemMessage.save();
        conversation.lastMessage = systemMessage._id;
        await conversation.save();
        await emitChatMessageToRecipients({
            conversationId: conversation._id,
            message: systemMessage,
            senderId: messageSender,
            receiverIds: [landlordId, studentId].filter((memberId) => memberId?.toString() !== messageSender.toString()),
            text,
            messageType: 'system_update',
            senderName: 'RoomRadar',
        });
    } catch (error) {}
};

const syncBookingRequestMessage = async (application) => {
    await Message.findOneAndUpdate(
        { 'bookingRequest.applicationId': application._id },
        {
            $set: {
                'bookingRequest.status': application.status,
                'bookingRequest.fullName': application.fullName,
                'bookingRequest.mobileNumber': application.mobileNumber,
                'bookingRequest.profileType': application.profileType,
                'bookingRequest.message': application.message,
                'bookingRequest.checkInDate': application.checkInDate,
                'bookingRequest.checkOutDate': application.checkOutDate,
                'bookingRequest.occupants': application.occupants
            }
        }
    );
};

const createInquiry = asyncHandler(async (req, res) => {
    const { roomId, message } = req.body;
    const studentId = req.user._id;
    const cleanMessage = String(message || '').trim();

    if (!roomId) {
        res.status(400);
        throw new Error('Room ID is required.');
    }

    if (cleanMessage.length < 10) {
        res.status(400);
        throw new Error('Please write at least 10 characters before contacting the landlord.');
    }

    const room = await Room.findOne({ _id: roomId, isDeleted: { $ne: true } });
    if (!room) {
        res.status(404);
        throw new Error('Room not found');
    }

    if (!hasRoomStatus(room, INQUIRY_ROOM_STATUSES)) {
        res.status(409);
        throw new Error('This room is not currently accepting inquiries.');
    }

    const landlordId = room.landlord;
    if (studentId.toString() === landlordId.toString()) {
        res.status(400);
        throw new Error('You cannot inquire about your own room.');
    }

    const existingInquiry = await Application.findOne({
        room: roomId,
        student: studentId,
        landlord: landlordId,
        type: 'inquiry',
        status: 'pending',
    }).sort({ createdAt: -1 });

    if (existingInquiry) {
        return res.status(200).json({
            ...existingInquiry.toObject(),
            duplicate: true,
        });
    }

    const inquiry = new Application({
        room: roomId,
        student: studentId,
        landlord: landlordId,
        message: cleanMessage,
        type: 'inquiry',
        status: 'pending'
    });

    const createdInquiry = await inquiry.save();
    res.status(201).json(createdInquiry);
});

const createApplication = asyncHandler(async (req, res) => {
    const {
        roomId,
        checkInDate,
        checkOutDate,
        occupants,
        message: studentMessage,
        fullName,
        mobileNumber,
        profileType,
        durationMonths,
        agreedToTerms,
        ...otherDetails
    } = req.body;
    const studentId = req.user._id;

    const normalizedOccupants = normalizeOccupantsPayload(occupants);
    const normalizedProfileType = String(profileType || otherDetails.purposeOfStay || 'Travelling').trim();
    const normalizedFullName = String(fullName || req.user.name || '').trim();
    const normalizedMobileNumber = normalizeOptionalIndianMobile(mobileNumber || req.user.mobileNumber || req.user.phone || '', 'Mobile number');
    const rawEmergencyContact = otherDetails.emergencyContact && typeof otherDetails.emergencyContact === 'object'
        ? otherDetails.emergencyContact
        : {};
    const normalizedEmergencyContact = {
        name: String(rawEmergencyContact.name || '').trim(),
        phone: rawEmergencyContact.phone
            ? requireValidIndianMobile(rawEmergencyContact.phone, 'Emergency contact number')
            : '',
    };
    const normalizedPurposeOfStay = String(otherDetails.purposeOfStay || normalizedProfileType).trim();
    const normalizedGender = String(otherDetails.gender || '').trim();
    const normalizedOccupantComposition = String(otherDetails.occupantComposition || '').trim();
    const normalizedStudentMessage = String(studentMessage || '').trim();

    const requestedStartDate = toOptionalDate(checkInDate);
    const requestedEndDate = toOptionalDate(checkOutDate);
    const normalizedDurationMonths = Math.max(Number(durationMonths) || 1, 1);
    const normalizedIdProofType = String(otherDetails.idProofType || '').trim();
    const normalizedIdProofImage = String(otherDetails.idProofImage || '').trim();

    if (!roomId || !checkInDate || !checkOutDate || !normalizedOccupants.adults) {
        res.status(400);
        throw new Error('Please provide all required fields.');
    }

    if (!requestedStartDate || !requestedEndDate || requestedEndDate.getTime() <= requestedStartDate.getTime()) {
        res.status(400);
        throw new Error('Please choose a valid move-in and move-out date.');
    }

    if (getDateInputValue(requestedStartDate) < getTomorrowDateInputValue()) {
        res.status(400);
        throw new Error('Move-in date must be tomorrow or later.');
    }

    if (normalizedDurationMonths > 36) {
        res.status(400);
        throw new Error('Please choose a stay duration between 1 and 36 months.');
    }

    if (normalizedStudentMessage.length > 500) {
        res.status(400);
        throw new Error('Message must be 500 characters or shorter.');
    }

    if (!normalizedFullName || !normalizedMobileNumber || !normalizedProfileType) {
        res.status(400);
        throw new Error('Full name, mobile number, and profile type are required for booking requests.');
    }

    if (!normalizedIdProofType || !normalizedIdProofImage) {
        res.status(400);
        throw new Error('ID proof type and image are required for booking requests.');
    }

    if (!normalizedEmergencyContact.name || !normalizedEmergencyContact.phone) {
        res.status(400);
        throw new Error('Emergency contact name and phone are required for booking requests.');
    }

    if (agreedToTerms !== true) {
        res.status(400);
        throw new Error('Please agree to the booking terms before sending your request.');
    }

    const room = await Room.findOne({ _id: roomId, isDeleted: { $ne: true } });
    if (!room) {
        res.status(404);
        throw new Error('Room not found');
    }

    if (!hasRoomStatus(room, BOOKABLE_ROOM_STATUSES)) {
        res.status(409);
        throw new Error('This room is not accepting booking requests right now.');
    }

    const landlordId = room.landlord;
    if (studentId.toString() === landlordId.toString()) {
        res.status(400);
        throw new Error('You cannot book your own room.');
    }

    const existingActiveApplication = await Application.findOne({
        room: roomId,
        student: studentId,
        type: 'request',
        status: { $in: ACTIVE_APPLICATION_STATUSES }
    });

    if (existingActiveApplication) {
        const existingConversation = await Conversation.findOne({
            roomId,
            members: { $all: [studentId, landlordId] }
        });

        return res.status(200).json({
            success: true,
            duplicate: true,
            message: 'You already have an active request for this room. Continue from your applications or inbox.',
            application: existingActiveApplication,
            conversationId: existingConversation?._id
        });
    }

    const dateConflict = await Room.exists({
        _id: roomId,
        unavailableRanges: {
            $elemMatch: {
                status: { $in: LOCKED_INVENTORY_STATUSES },
                startDate: { $lt: requestedEndDate },
                endDate: { $gt: requestedStartDate },
            },
        },
    });

    if (dateConflict) {
        res.status(409);
        throw new Error('This room is unavailable for the selected dates.');
    }

    const application = new Application({
        room: roomId,
        student: studentId,
        landlord: landlordId,
        checkInDate: requestedStartDate,
        checkOutDate: requestedEndDate,
        occupants: normalizedOccupants,
        message: normalizedStudentMessage,
        fullName: normalizedFullName,
        mobileNumber: normalizedMobileNumber,
        profileType: normalizedProfileType,
        durationMonths: normalizedDurationMonths,
        agreedToTerms: Boolean(agreedToTerms),
        type: 'request',
        requestExpiresAt: await getExpiryDate(),
        paymentStatus: allowsOfflinePayment(room) ? 'not_required' : 'pending',
        escrow: {
            status: allowsOfflinePayment(room) ? 'not_required' : 'pending',
            notes: 'Awaiting landlord approval inside the platform response window.',
        },
        amountBreakdown: await buildAmountBreakdown(room, normalizedDurationMonths),
        purposeOfStay: normalizedPurposeOfStay,
        idProofType: normalizedIdProofType,
        idProofImage: normalizedIdProofImage,
        emergencyContact: normalizedEmergencyContact,
        ...(normalizedGender ? { gender: normalizedGender } : {}),
        ...(normalizedOccupantComposition ? { occupantComposition: normalizedOccupantComposition } : {}),
    });

    const createdApplication = await application.save();

    let conversation = await Conversation.findOne({
        roomId,
        members: { $all: [studentId, landlordId] }
    });

    if (!conversation) {
        conversation = new Conversation({
            roomId,
            members: [studentId, landlordId],
            conversationType: 'booking'
        });
        await conversation.save();
    } else if (conversation.conversationType !== 'booking') {
        conversation.conversationType = 'booking';
        await conversation.save();
    }

    createdApplication.conversation = conversation._id;
    await createdApplication.save({ validateBeforeSave: false });

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

    await emitChatMessageToRecipients({
        conversationId: conversation._id,
        message: systemMessage,
        senderId: studentId,
        receiverIds: [landlordId],
        text: `${normalizedFullName || 'A student'} sent a booking request for "${room.title}".`,
        messageType: 'booking_request',
        senderName: normalizedFullName || req.user.name || 'RoomRadar student',
        roomTitle: room.title,
    });

    emitBookingStatus(createdApplication, 'pending');

    res.status(201).json({
        success: true,
        application: createdApplication,
        conversationId: conversation._id
    });
});

const getStudentApplications = asyncHandler(async (req, res) => {
    await expirePendingApplications({ student: req.user._id });
    const applications = await Application.find({ student: req.user._id })
        .populate('room', 'title rent securityDeposit imageUrl images location status averageRating numReviews paymentPreference offlinePaymentAllowed')
        .populate('landlord', 'name avatarUrl profilePicture verificationLevel trustScore')
        .sort({ createdAt: -1 })
        .lean();

    const applicationIds = applications.map((application) => application._id);
    const [roomReviews, guestReviews] = await Promise.all([
        Review.find({ booking: { $in: applicationIds } }).select('_id booking rating comment createdAt').lean(),
        GuestReview.find({ booking: { $in: applicationIds } }).select('_id booking rating comment createdAt').lean(),
    ]);
    const roomReviewByBooking = new Map(roomReviews.map((review) => [review.booking.toString(), review]));
    const guestReviewByBooking = new Map(guestReviews.map((review) => [review.booking.toString(), review]));

    res.status(200).json(applications.map((application) => {
        const bookingKey = application._id.toString();
        const review = roomReviewByBooking.get(bookingKey) || null;
        const guestReview = guestReviewByBooking.get(bookingKey) || null;
        return {
            ...application,
            hasReview: Boolean(review),
            review,
            guestReview,
        };
    }));
});

const getLandlordApplications = asyncHandler(async (req, res) => {
    await expirePendingApplications({ landlord: req.user._id });
    const applications = await Application.find({ landlord: req.user._id })
        .populate('student', 'name email mobileNumber phone avatarUrl profilePicture verificationLevel trustScore guestAverageRating guestReviewsCount')
        .populate('room', 'title rent securityDeposit imageUrl images location status averageRating numReviews paymentPreference offlinePaymentAllowed')
        .sort({ createdAt: -1 })
        .lean();

    const applicationIds = applications.map((application) => application._id);
    const guestReviews = await GuestReview.find({ booking: { $in: applicationIds } }).select('_id booking rating comment createdAt').lean();
    const guestReviewByBooking = new Map(guestReviews.map((review) => [review.booking.toString(), review]));

    res.status(200).json(applications.map((application) => {
        const guestReview = guestReviewByBooking.get(application._id.toString()) || null;
        return {
            ...application,
            hasGuestReview: Boolean(guestReview),
            guestReview,
        };
    }));
});

const getCalendarStats = asyncHandler(async (req, res) => {
    const requestedLandlordId = req.query.landlordId || req.user._id;
    const userRoles = req.user.roles || [];

    if (
        userRoles.map((role) => role.toLowerCase()).includes('landlord') &&
        requestedLandlordId.toString() !== req.user._id.toString() &&
        !userRoles.includes('Admin')
    ) {
        res.status(403);
        throw new Error('Not authorized to view calendar stats for this landlord.');
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const weekEnd = new Date(today);
    weekEnd.setDate(weekEnd.getDate() + 7);
    await expirePendingApplications({ landlord: requestedLandlordId });

    const [pending, approved, rejected, thisWeek] = await Promise.all([
        Application.countDocuments({ landlord: requestedLandlordId, status: 'pending' }),
        Application.countDocuments({ landlord: requestedLandlordId, status: 'approved' }),
        Application.countDocuments({ landlord: requestedLandlordId, status: 'rejected' }),
        Application.countDocuments({
            landlord: requestedLandlordId,
            checkInDate: { $gte: today, $lte: weekEnd },
            status: { $in: ['pending', 'approved', 'confirmed'] }
        })
    ]);

    res.json({ pending, approved, thisWeek, rejected });
});

const getApplicationById = asyncHandler(async (req, res) => {
    const application = await Application.findById(req.params.id)
        .populate('room', 'title description rent securityDeposit imageUrl images location status averageRating cancellationPolicy paymentPreference offlinePaymentAllowed')
        .populate('landlord', 'name email mobileNumber avatarUrl profilePicture verificationLevel trustScore')
        .populate('student', 'name email mobileNumber avatarUrl profilePicture verificationLevel trustScore');

    if (!application) {
        res.status(404);
        throw new Error('Application not found');
    }

    if (!isApplicationMember(application, req.user._id)) {
        res.status(401);
        throw new Error('Not authorized to view this application');
    }

    res.status(200).json(application);
});

const approveApplication = asyncHandler(async (req, res) => {
    let application;

    await runWithOptionalTransaction(async (session) => {
        application = await withSession(Application.findById(req.params.id).populate('room'), session);

        if (!application) throw makeHttpError(404, 'Application not found');
        if (application.landlord.toString() !== req.user._id.toString()) throw makeHttpError(401, 'Not authorized');
        await expireApplicationIfNeeded(application, session);
        if (application.status !== 'pending') throw makeHttpError(400, 'Application already processed');

        await lockApplicationRange(application, session);

        application.status = 'approved';
        application.approvedAt = new Date();
        application.amountBreakdown = application.amountBreakdown?.total ? application.amountBreakdown : await buildAmountBreakdown(application.room, application.durationMonths);
        await saveWithSession(application, session);
    });

    await syncBookingRequestMessage(application);
    await postSystemMessage({
        landlordId: application.landlord,
        studentId: application.student,
        roomId: application.room._id,
        text: `Your booking request for "${application.room.title}" has been approved. Please confirm your booking to lock the room.`,
        senderId: req.user._id
    });
    emitBookingStatus(application, 'approved');

    res.status(200).json({ message: 'Application approved.', application });
});

const rejectApplication = asyncHandler(async (req, res) => {
    const application = await Application.findById(req.params.id).populate('room');

    if (!application) {
        res.status(404);
        throw new Error('Application not found');
    }

    if (application.landlord.toString() !== req.user._id.toString()) {
        res.status(401);
        throw new Error('Not authorized');
    }

    await expireApplicationIfNeeded(application, null);

    if (application.status !== 'pending') {
        res.status(400);
        throw new Error('Application already processed');
    }

    application.status = 'rejected';
    await application.save();

    await syncBookingRequestMessage(application);
    await postSystemMessage({
        landlordId: application.landlord,
        studentId: application.student,
        roomId: application.room._id,
        text: `Unfortunately, your booking request for "${application.room.title}" has been declined.`,
        senderId: req.user._id
    });
    emitBookingStatus(application, 'rejected');

    res.status(200).json({ message: 'Application rejected successfully', application });
});

const cancelApplication = asyncHandler(async (req, res) => {
    let application;

    await runWithOptionalTransaction(async (session) => {
        application = await withSession(Application.findById(req.params.id).populate('room'), session);

        if (!application) throw makeHttpError(404, 'Application not found');
        if (!isApplicationMember(application, req.user._id)) throw makeHttpError(401, 'Not authorized to cancel this booking request');
        if (application.status === 'confirmed') throw makeHttpError(400, 'Confirmed bookings cannot be cancelled from this screen. Please contact support.');

        if (application.status === 'approved') {
            await releaseApplicationRange(application, session);
        }

        application.status = 'cancelled';
        await saveWithSession(application, session);
    });

    await syncBookingRequestMessage(application);
    await postSystemMessage({
        landlordId: application.landlord,
        studentId: application.student,
        roomId: application.room._id,
        text: `The booking request for "${application.room.title}" has been cancelled.`,
        senderId: req.user._id
    });
    emitBookingStatus(application, 'cancelled');

    res.status(200).json({ message: 'Booking cancelled', application });
});

const cancelConfirmedByHost = asyncHandler(async (req, res) => {
    let application;
    let penalty;

    await runWithOptionalTransaction(async (session) => {
        application = await withSession(Application.findById(req.params.id).populate('room'), session);

        if (!application) throw makeHttpError(404, 'Application not found');
        if (application.landlord.toString() !== req.user._id.toString()) throw makeHttpError(401, 'Only the host can use host cancellation.');
        if (application.status !== 'confirmed') throw makeHttpError(400, 'Only confirmed bookings can be cancelled from this host workflow.');

        penalty = calculateHostCancellationPenalty(application);
        await blockCancelledDates(application, session);

        application.status = 'cancelled';
        application.paymentStatus = 'refunded';
        application.cancelledAt = new Date();
        application.cancelledBy = req.user._id;
        application.cancellationReason = req.body.reason || 'Host cancelled a confirmed booking.';
        application.cancellationPenalty = penalty;
        application.escrow = {
            ...(application.escrow || {}),
            status: 'refunded',
            refundedAt: new Date(),
            notes: 'Host cancelled after confirmation. Calendar remains blocked and penalty is recorded.',
        };

        await withSession(Transaction.findOneAndUpdate(
            { application: application._id, type: 'booking_payment' },
            {
                $set: {
                    status: 'refunded',
                    escrowFrozen: false,
                    notes: 'Refund triggered due to host cancellation.',
                },
            },
            { new: true }
        ), session);

        await withSession(Transaction.findOneAndUpdate(
            { application: application._id, type: 'penalty' },
            {
                $set: {
                    student: application.student,
                    landlord: application.landlord,
                    room: getRoomId(application),
                    amount: penalty.amount,
                    platformFee: 0,
                    landlordPayout: 0,
                    status: 'pending',
                    provider: 'internal_ledger',
                    notes: penalty.reason,
                },
                $setOnInsert: { type: 'penalty' },
            },
            { upsert: true, new: true }
        ), session);

        await saveWithSession(application, session);
    });

    await syncBookingRequestMessage(application);
    await postSystemMessage({
        landlordId: application.landlord,
        studentId: application.student,
        roomId: getRoomId(application),
        text: `The host cancelled this confirmed booking. Refund has been marked for processing. Host penalty: ${penalty.percent}% of booking value.`,
        senderId: req.user._id
    });
    emitBookingStatus(application, 'cancelled');

    res.status(200).json({ message: 'Confirmed booking cancelled by host. Penalty recorded and dates blocked.', application, penalty });
});

const requestStayChange = asyncHandler(async (req, res) => {
    const { requestedCheckOutDate, message = '' } = req.body || {};
    const nextCheckOut = toOptionalDate(requestedCheckOutDate);

    if (!nextCheckOut) throw makeHttpError(400, 'Please choose a valid move-out or extension date.');

    const application = await Application.findById(req.params.id).populate('room');
    if (!application) throw makeHttpError(404, 'Application not found');
    if (application.student.toString() !== req.user._id.toString()) throw makeHttpError(401, 'Only the tenant can request a stay change.');
    if (application.status !== 'confirmed') throw makeHttpError(400, 'Stay changes are available only after the booking is confirmed.');

    const currentCheckOut = toOptionalDate(application.checkOutDate);
    const checkInDate = toOptionalDate(application.checkInDate);
    if (!currentCheckOut || !checkInDate) throw makeHttpError(400, 'This booking does not have valid stay dates.');
    if (nextCheckOut.getTime() <= checkInDate.getTime()) throw makeHttpError(400, 'Move-out date must be after move-in date.');
    if (nextCheckOut.toDateString() === currentCheckOut.toDateString()) throw makeHttpError(400, 'Choose a different date from the current move-out date.');
    if (application.stayChangeRequest?.status === 'pending') throw makeHttpError(409, 'A stay change request is already waiting for landlord response.');

    const requestType = nextCheckOut.getTime() > currentCheckOut.getTime() ? 'extend' : 'move_out';
    application.stayChangeRequest = {
        status: 'pending',
        type: requestType,
        originalCheckOutDate: currentCheckOut,
        requestedCheckOutDate: nextCheckOut,
        message: String(message || '').trim().slice(0, 700),
        requestedBy: req.user._id,
        requestedAt: new Date(),
        responseNote: '',
        respondedBy: undefined,
        respondedAt: undefined,
    };

    await application.save();

    const title = application.room?.title || 'your room';
    const actionLabel = requestType === 'extend' ? 'extend the stay' : 'move out earlier';
    await postSystemMessage({
        landlordId: application.landlord,
        studentId: application.student,
        roomId: getRoomId(application),
        text: `${req.user.name || 'Tenant'} requested to ${actionLabel} for "${title}". Requested move-out: ${nextCheckOut.toLocaleDateString('en-IN')}. Please approve or reject from Applications.`,
        senderId: req.user._id,
    });

    emitBookingStatus(application, 'stay_change_requested');
    res.status(200).json({ message: 'Stay change request sent to landlord.', application });
});

const respondStayChange = asyncHandler(async (req, res) => {
    const { action, responseNote = '' } = req.body || {};
    const isApproved = action === 'approve' || action === 'approved';
    const isRejected = action === 'reject' || action === 'rejected';
    if (!isApproved && !isRejected) throw makeHttpError(400, 'Action must be approve or reject.');

    let application;
    const originalDateLabel = {};

    await runWithOptionalTransaction(async (session) => {
        application = await withSession(Application.findById(req.params.id).populate('room'), session);
        if (!application) throw makeHttpError(404, 'Application not found');
        if (application.landlord.toString() !== req.user._id.toString()) throw makeHttpError(401, 'Only the landlord can respond to this request.');
        if (application.status !== 'confirmed') throw makeHttpError(400, 'Only confirmed bookings can be changed.');
        if (application.stayChangeRequest?.status !== 'pending') throw makeHttpError(400, 'No pending stay change request found.');

        const requestedDate = toOptionalDate(application.stayChangeRequest.requestedCheckOutDate);
        if (!requestedDate) throw makeHttpError(400, 'Requested date is invalid.');

        originalDateLabel.value = application.checkOutDate;

        application.stayChangeRequest.responseNote = String(responseNote || '').trim().slice(0, 500);
        application.stayChangeRequest.respondedBy = req.user._id;
        application.stayChangeRequest.respondedAt = new Date();

        if (isApproved) {
            const checkInDate = toOptionalDate(application.checkInDate);
            if (!checkInDate) throw makeHttpError(400, 'This booking does not have a valid move-in date.');
            application.checkOutDate = requestedDate;
            application.durationMonths = Math.max(1, Math.ceil((requestedDate.getTime() - checkInDate.getTime()) / (30 * 24 * 60 * 60 * 1000)));
            application.amountBreakdown = {
                ...(application.amountBreakdown || {}),
                durationMonths: application.durationMonths,
            };
            application.stayChangeRequest.status = 'approved';
            application.checkInStatus = requestedDate.getTime() <= getDayStart().getTime() ? 'checked_out' : application.checkInStatus;
            await applyApprovedStayChangeInventory(application, session);
        } else {
            application.stayChangeRequest.status = 'rejected';
        }

        await saveWithSession(application, session);
    });

    await syncBookingRequestMessage(application);
    const requestedDate = toOptionalDate(application.stayChangeRequest?.requestedCheckOutDate);
    const currentDate = toOptionalDate(originalDateLabel.value);
    await postSystemMessage({
        landlordId: application.landlord,
        studentId: application.student,
        roomId: getRoomId(application),
        text: isApproved
            ? `Stay change approved. Move-out changed from ${currentDate?.toLocaleDateString('en-IN') || 'the original date'} to ${requestedDate?.toLocaleDateString('en-IN') || 'the requested date'}. Agreement is updated.`
            : `Stay change request was declined. Original move-out date remains ${currentDate?.toLocaleDateString('en-IN') || 'unchanged'}.${application.stayChangeRequest?.responseNote ? ` Note: ${application.stayChangeRequest.responseNote}` : ''}`,
        senderId: req.user._id,
    });

    emitBookingStatus(application, isApproved ? 'stay_change_approved' : 'stay_change_rejected');
    res.status(200).json({
        message: isApproved ? 'Stay change approved and calendar updated.' : 'Stay change request rejected.',
        application,
    });
});

const confirmPayment = asyncHandler(async (req, res) => {
    const requestBody = req.body || {};
    let application = await Application.findById(req.params.id).populate('room');

    if (!application) throw makeHttpError(404, 'Application not found');
    if (!isApplicationMember(application, req.user._id)) throw makeHttpError(401, 'Not authorized to confirm this booking');
    if (application.status === 'confirmed') {
        return res.status(200).json({ message: 'Booking already confirmed', application });
    }
    if (application.status !== 'approved') {
        throw makeHttpError(400, 'This request must be approved by the landlord before it can be confirmed.');
    }

    const settings = await getPlatformSettings();
    const requestedPaymentMethod = requestBody.paymentMethod || 'manual';
    const isOfflinePayment = requestedPaymentMethod === 'cash';
    const roomAllowsOffline = allowsOfflinePayment(application.room);

    if (isOfflinePayment && (!settings.offlinePaymentAllowed || !roomAllowsOffline)) {
        throw makeHttpError(400, 'Offline payment is not enabled for this room.');
    }

    await runWithOptionalTransaction(async (session) => {
        application = await withSession(Application.findById(req.params.id).populate('room'), session);
        if (!application) throw makeHttpError(404, 'Application not found');
        if (application.status !== 'approved') throw makeHttpError(400, 'This request must be approved by the landlord before it can be confirmed.');

        application.status = 'confirmed';
        application.paymentStatus = 'paid';
        application.paymentMethod = requestedPaymentMethod;
        application.confirmedAt = new Date();
        application.amountBreakdown = application.amountBreakdown?.total ? application.amountBreakdown : await buildAmountBreakdown(application.room, application.durationMonths);
        application.escrow = {
            ...(application.escrow || {}),
            status: application.paymentMethod === 'cash' ? 'not_required' : 'held',
            provider: application.paymentMethod || 'manual',
            providerPaymentId: requestBody.providerPaymentId || application.escrow?.providerPaymentId,
            providerOrderId: requestBody.providerOrderId || application.escrow?.providerOrderId,
            releaseAfter: await getPayoutReleaseAfter(application.checkInDate),
            notes: application.paymentMethod === 'cash'
                ? 'Offline payment selected; payout reconciliation is handled manually.'
                : 'Funds are held until the post check-in payout window.',
        };
        application.checkInStatus = 'guidebook_sent';
        application.guidebookSentAt = new Date();

        await confirmApplicationRange(application, session);
        await createBookingTransaction(application, session);
        await saveWithSession(application, session);
    });

    try {
        await syncBookingRequestMessage(application);
        const roomWithGuidebook = await Room.findById(getRoomId(application))
            .select('+wifiPassword +guidebook.wifiPassword title guidebook wifiName checkInInstructions applianceInstructions localTips emergencyContactName emergencyContactPhone')
            .lean();

        await postSystemMessage({
            landlordId: application.landlord,
            studentId: application.student,
            roomId: getRoomId(application),
            text: buildGuidebookMessage(roomWithGuidebook || application.room),
            senderId: req.user._id
        });
        emitBookingStatus(application, 'confirmed');
    } catch (sideEffectError) {
        process.stderr.write(`Booking confirmed but post-confirmation notification failed: ${sideEffectError.message}\n`);
    }

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

    const hasUpdate = (field) => Object.prototype.hasOwnProperty.call(req.body, field);
    const safeUpdates = {};

    if (hasUpdate('fullName')) safeUpdates.fullName = String(req.body.fullName || '').trim();
    if (hasUpdate('profileType')) safeUpdates.profileType = String(req.body.profileType || '').trim();
    if (hasUpdate('purposeOfStay')) safeUpdates.purposeOfStay = String(req.body.purposeOfStay || '').trim();
    if (hasUpdate('gender')) safeUpdates.gender = String(req.body.gender || '').trim();
    if (hasUpdate('occupantComposition')) safeUpdates.occupantComposition = String(req.body.occupantComposition || '').trim();
    if (hasUpdate('idProofType')) safeUpdates.idProofType = String(req.body.idProofType || '').trim();
    if (hasUpdate('idProofImage')) safeUpdates.idProofImage = String(req.body.idProofImage || '').trim();
    if (hasUpdate('message')) {
        safeUpdates.message = String(req.body.message || '').trim();
        if (safeUpdates.message.length > 500) {
            res.status(400);
            throw new Error('Message must be 500 characters or shorter.');
        }
    }
    if (hasUpdate('mobileNumber')) {
        safeUpdates.mobileNumber = requireValidIndianMobile(req.body.mobileNumber, 'Mobile number');
    }
    if (hasUpdate('durationMonths')) {
        const normalizedDurationMonths = Math.max(Number(req.body.durationMonths) || 1, 1);
        if (normalizedDurationMonths > 36) {
            res.status(400);
            throw new Error('Please choose a stay duration between 1 and 36 months.');
        }
        safeUpdates.durationMonths = normalizedDurationMonths;
    }
    if (hasUpdate('occupants')) {
        safeUpdates.occupants = normalizeOccupantsPayload(req.body.occupants);
    }
    if (hasUpdate('emergencyContact')) {
        const emergencyContact = req.body.emergencyContact && typeof req.body.emergencyContact === 'object'
            ? req.body.emergencyContact
            : {};
        safeUpdates.emergencyContact = {
            name: String(emergencyContact.name || '').trim(),
            phone: emergencyContact.phone
                ? requireValidIndianMobile(emergencyContact.phone, 'Emergency contact number')
                : '',
        };
    }
    if (hasUpdate('agreedToTerms')) safeUpdates.agreedToTerms = req.body.agreedToTerms === true;

    if (hasUpdate('checkInDate') || hasUpdate('checkOutDate')) {
        const nextCheckInDate = hasUpdate('checkInDate') ? toOptionalDate(req.body.checkInDate) : toOptionalDate(application.checkInDate);
        const nextCheckOutDate = hasUpdate('checkOutDate') ? toOptionalDate(req.body.checkOutDate) : toOptionalDate(application.checkOutDate);

        if (!nextCheckInDate || !nextCheckOutDate || nextCheckOutDate.getTime() <= nextCheckInDate.getTime()) {
            res.status(400);
            throw new Error('Please choose a valid move-in and move-out date.');
        }
        if (getDateInputValue(nextCheckInDate) < getTomorrowDateInputValue()) {
            res.status(400);
            throw new Error('Move-in date must be tomorrow or later.');
        }

        safeUpdates.checkInDate = nextCheckInDate;
        safeUpdates.checkOutDate = nextCheckOutDate;
    }

    Object.assign(application, safeUpdates);
    application.isUpdated = true;

    const updatedApplication = await application.save();

    await syncBookingRequestMessage(updatedApplication);
    await postSystemMessage({
        landlordId: application.landlord,
        studentId: application.student,
        roomId: application.room,
        text: 'The booking application for this room has been updated by the applicant.',
        senderId: req.user._id
    });
    emitBookingStatus(application, 'pending');

    res.status(200).json({
        message: 'Application updated successfully',
        application: updatedApplication
    });
});

module.exports = {
    createApplication,
    createInquiry,
    getApplicationById,
    getStudentApplications,
    getLandlordApplications,
    getCalendarStats,
    approveApplication,
    rejectApplication,
    cancelApplication,
    cancelConfirmedByHost,
    requestStayChange,
    respondStayChange,
    confirmPayment,
    updateApplication
};
