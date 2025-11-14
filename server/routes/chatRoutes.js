const express = require('express');
const router = express.Router();

const {
    getConversations,
    getMessages,
    createMessage,
    markConversationAsRead,
    getConversationsAsStudent,
    getConversationsAsLandlord,
    findOrCreateConversation // Import the new function
} = require('../controllers/chatController');

const { protect } = require('../middleware/authMiddleware');

// Get conversations based on user role 
router.route('/conversations/as-student').get(protect, getConversationsAsStudent);
router.route('/conversations/as-landlord').get(protect, getConversationsAsLandlord);


router.route('/conversations/find-or-create').post(protect, findOrCreateConversation);

//  Other conversation/message routes 
router.route('/conversations/:id/read').patch(protect, markConversationAsRead);
router.route('/messages/:conversationId').get(protect, getMessages);
router.route('/messages').post(protect, createMessage);

// Deprecated route
router.route('/conversations').get(protect, getConversations);

module.exports = router;