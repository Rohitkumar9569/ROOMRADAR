const express = require('express');
const { chat } = require('../controllers/chatbotController');
const { chatbotRateLimiter } = require('../middleware/rateLimiter');

const router = express.Router();

router.post('/', chatbotRateLimiter, chat);

module.exports = router;
