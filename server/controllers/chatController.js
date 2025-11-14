const Conversation = require('../models/Conversation');
const Message = require('../models/Message');
const Room = require('../models/Room');
const asyncHandler = require('express-async-handler');
const mongoose = require('mongoose');

// Base aggregation pipeline that gathers all necessary data
const getBaseConversationPipeline = (userId) => [
    //  Find all conversations the user is a member of
    { $match: { members: userId } },
    { $sort: { updatedAt: -1 } },
    
    //  Get details of the associated room
    { $lookup: {
        from: 'rooms',
        localField: 'roomId',
        foreignField: '_id',
        pipeline: [{ $project: { title: 1, images: 1, landlord: 1 } }],
        as: 'roomDetails'
    }},
    { $unwind: { path: '$roomDetails', preserveNullAndEmptyArrays: true } },

    //  Explicitly define the user's role
    { $addFields: {
        userRoleInConvo: {
            $cond: { if: { $eq: ['$roomDetails.landlord', userId] }, then: 'landlord', else: 'student' }
        }
    }},

    //  Gather all other necessary details
    { $lookup: { 
        from: 'users', 
        localField: 'members', 
        foreignField: '_id', 
        pipeline: [{ $project: { _id: 1, name: 1, avatarUrl: 1 } }],
        as: 'memberInfo' 
    }},
    { $lookup: { from: 'messages', localField: 'lastMessage', foreignField: '_id', pipeline: [{ $project: { text: 1, messageType: 1, createdAt: 1 } }], as: 'lastMessageInfo' }},
    
   
    /*
    { $lookup: { 
        from: 'applications', 
        let: { roomId: '$roomId', members: '$members' }, 
        pipeline: [ 
            { $match: { $expr: { $and: [ { $eq: ['$room', '$$roomId'] }, { $in: ['$student', '$$members'] }, { $in: ['$landlord', '$$members'] } ] } }}, 
            { $project: { status: 1, checkInDate: 1, checkOutDate: 1 } } 
        ], 
        as: 'applicationInfo' 
    }},
    */
    
    //  Project the final clean structure
    { $project: {
        _id: 1,
        conversationType: 1,
        room: { _id: '$roomDetails._id', title: '$roomDetails.title', images: '$roomDetails.images' },
        members: '$memberInfo',
        lastMessage: { $arrayElemAt: ['$lastMessageInfo', 0] },
        userRoleInConvo: 1,
        otherParticipant: {
             $first: {
                $filter: {
                    input: "$memberInfo",
                    as: "member",
                    cond: { $ne: [ "$$member._id", userId ] }
                }
            }
        }
    }}
];


//  GET CONVERSATIONS AS A STUDENT (UNCHANGED) 
exports.getConversationsAsStudent = asyncHandler(async (req, res) => {
    const userId = new mongoose.Types.ObjectId(req.user.id);
    const pipeline = getBaseConversationPipeline(userId);
    pipeline.push({ $match: { userRoleInConvo: 'student' } });
    const conversations = await Conversation.aggregate(pipeline);
    res.json(conversations);
});


// GET CONVERSATIONS AS A LANDLORD 
exports.getConversationsAsLandlord = asyncHandler(async (req, res) => {
    const userId = new mongoose.Types.ObjectId(req.user.id);
    const pipeline = getBaseConversationPipeline(userId);
    pipeline.push({ $match: { userRoleInConvo: 'landlord' } });
    const conversations = await Conversation.aggregate(pipeline);
    res.json(conversations);
});

// FUNCTION TO FIX THE 404 ERROR
exports.findOrCreateConversation = asyncHandler(async (req, res) => {
    const { roomId, otherUserId, message } = req.body;
    const currentUserId = req.user.id;

    if (!roomId || !otherUserId) {
        return res.status(400).json({ message: "Room ID and other user ID are required." });
    }
    let conversation = await Conversation.findOne({
        roomId: roomId,
        members: { $all: [currentUserId, otherUserId] }
    });
    if (!conversation) {
        const room = await Room.findById(roomId);
        if (!room || room.landlord.toString() !== otherUserId) {
            return res.status(404).json({ message: "Invalid room or landlord." });
        }
        conversation = new Conversation({
            members: [currentUserId, otherUserId],
            roomId: roomId,
            conversationType: 'inquiry'
        });
        await conversation.save();
    }
    if (message) {
        const initialMessage = new Message({ conversationId: conversation._id, sender: currentUserId, text: message, readBy: [currentUserId] });
        const savedMessage = await initialMessage.save();
        conversation.lastMessage = savedMessage._id;
        await conversation.save();
    }
    res.status(200).json({ message: "Conversation ready.", conversationId: conversation._id });
});


exports.getSingleConversation = asyncHandler(async (req, res) => {
    const userId = new mongoose.Types.ObjectId(req.user.id);
    const conversationId = new mongoose.Types.ObjectId(req.params.id);

    const pipeline = getBaseConversationPipeline(userId);
    // For a single view, we DO want the application details, so we add the lookup back in.
    pipeline.splice(6, 0, {
        $lookup: { 
            from: 'applications', 
            let: { roomId: '$roomId', members: '$members' }, 
            pipeline: [ 
                { $match: { $expr: { $and: [ { $eq: ['$room', '$$roomId'] }, { $in: ['$student', '$$members'] }, { $in: ['$landlord', '$$members'] } ] } }}, 
                { $project: { status: 1, checkInDate: 1, checkOutDate: 1, occupants: 1, message: 1, fullName: 1, mobileNumber: 1, room: 1 } } 
            ], 
            as: 'applicationDetails'
        }
    });
    // Add applicationDetails back to the final project stage
    pipeline[7].$project.applicationDetails = '$applicationDetails';
    
    pipeline.unshift({ $match: { _id: conversationId } });

    const result = await Conversation.aggregate(pipeline);
    if (!result || result.length === 0) {
        return res.status(404).json({ message: "Conversation not found or you're not a member." });
    }
    res.json(result[0]);
});

exports.getMessages = asyncHandler(async (req, res) => {
    const messages = await Message.find({ conversationId: req.params.conversationId })
        .populate('sender', 'name profilePicture')
        .sort({ createdAt: 1 });
    res.status(200).json(messages);
});

exports.createMessage = asyncHandler(async (req, res) => {
    const { conversationId, text } = req.body;
    const senderId = new mongoose.Types.ObjectId(req.user.id);
    const newMessage = new Message({ conversationId, sender: senderId, text, readBy: [senderId] });
    const savedMessage = await newMessage.save();
    await Conversation.findByIdAndUpdate(conversationId, { lastMessage: savedMessage._id });
    const populatedMessage = await Message.findById(savedMessage._id).populate('sender', 'name profilePicture');
    res.status(201).json(populatedMessage);
});

exports.markConversationAsRead = asyncHandler(async (req, res) => {
    const userId = new mongoose.Types.ObjectId(req.user.id);
    await Message.updateMany(
        { conversationId: req.params.id, sender: { $ne: userId } },
        { $addToSet: { readBy: userId } }
    );
    res.status(200).json({ message: 'Messages marked as read' });
});

exports.getConversations = asyncHandler(async (req, res) => {
    res.status(400).json({ message: "This route is deprecated." });
});