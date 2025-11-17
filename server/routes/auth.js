const express = require('express');
const router = express.Router();

//  Added googleAuth to imports
const { registerUser, loginUser, googleAuth } = require('../controllers/authController');

router.post('/register', registerUser);
router.post('/login', loginUser);
router.post('/google', googleAuth); //  Added Google route

module.exports = router;