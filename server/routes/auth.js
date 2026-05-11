const express = require('express');
const router = express.Router();
const { authRateLimiter } = require('../middleware/rateLimiter');

//  Added googleAuth to imports
const { registerUser, loginUser, googleAuth } = require('../controllers/authController');

router.post('/register', authRateLimiter, registerUser);
router.post('/login', authRateLimiter, loginUser);
router.post('/google', authRateLimiter, googleAuth); //  Added Google route

module.exports = router;
