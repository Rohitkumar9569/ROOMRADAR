// server/controllers/authController.js

const User = require('../models/User');
const jwt = require('jsonwebtoken');
const asyncHandler = require('express-async-handler');

// Your registerUser function is correct. It creates a user with default 'Student' role.
exports.registerUser = asyncHandler(async (req, res) => {
    const { name, email, password } = req.body;
    const userExists = await User.findOne({ email });

    if (userExists) {
        res.status(400);
        throw new Error('User already exists');
    }
    
    const user = await User.create({
        name,
        email,
        password,
    });

    if (user) {
        res.status(201).json({
            _id: user._id,
            name: user.name,
            email: user.email,
            roles: user.roles,
        });
    } else {
        res.status(400);
        throw new Error('Invalid user data');
    }
});

// @desc    Auth user & get token
// @route   POST /api/auth/login
// @access  Public
exports.loginUser = asyncHandler(async (req, res) => {
    const { email, password } = req.body;
    const user = await User.findOne({ email });

    if (user && (await user.matchPassword(password))) {
        // This is the corrected login response. It includes the 'roles' array.
        res.json({
            _id: user._id,
            name: user.name,
            email: user.email,
            roles: user.roles, // Crucial for frontend redirection
            wishlist: user.wishlist,
            token: jwt.sign({ id: user._id, roles: user.roles }, process.env.JWT_SECRET, {
                expiresIn: '30d',
            }),
        });
    } else {
        res.status(401);
        throw new Error('Invalid email or password');
    }
});