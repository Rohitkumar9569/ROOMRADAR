const express = require('express');
const { getUnreadConversationCount } = require('../controllers/chatController');
const { protect } = require('../middleware/authMiddleware');

const router = express.Router();

router.get('/unread-count', protect, getUnreadConversationCount);

module.exports = router;
