const mongoose = require('mongoose');

const messageSchema = new mongoose.Schema({
    conversationId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Conversation',
        required: true,
    },
    sender: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
    },
    messageType: {
        type: String,
        enum: ['text', 'booking_request'], // Can be a regular text or a special request
        default: 'text',
        required: true,
    },
    text: {
        type: String,
        // Text is only required if the messageType is 'text'
        required: function () { return this.messageType === 'text'; }
    },
    // server/models/Message.js

    bookingRequest: {
        applicationId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Application',
            required: function () { return this.messageType === 'booking_request'; }
        },
        roomTitle: String,
        status: { type: String, default: 'pending' },
        fullName: String,
        mobileNumber: String,
        profileType: String,
        message: String,
        checkInDate: Date,
        checkOutDate: Date,
        occupants: {
            adults: Number,
            children: Number,
            males: Number,
            females: Number,
            gender: String,
            occupantComposition: String
        }
    },
    readBy: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    }]
}, { timestamps: true });

module.exports = mongoose.model('Message', messageSchema);