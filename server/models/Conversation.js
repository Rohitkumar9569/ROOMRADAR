// server/models/Conversation.js 
const mongoose = require('mongoose');

const conversationSchema = new mongoose.Schema({
    members: [
        {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            required: true,
        },
    ],
    roomId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Room',
        required: true,
    },
    // Change lastMessage from a String to an ObjectId referencing the Message model.
    lastMessage: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Message',
    },
    conversationType: {
        type: String,
        enum: ['booking', 'inquiry'],
        required: true,
    }
}, {
    // We will use the built-in 'updatedAt' for sorting. It updates automatically.
    timestamps: true
});

module.exports = mongoose.model('Conversation', conversationSchema);