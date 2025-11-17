const User = require('../models/User');
const jwt = require('jsonwebtoken');
const asyncHandler = require('express-async-handler');
const axios = require('axios'); //  Added axios import

// --- Register User (No changes) ---
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

// --- Login User (No changes) ---
exports.loginUser = asyncHandler(async (req, res) => {
    const { email, password } = req.body;
    const user = await User.findOne({ email });

    if (user && (await user.matchPassword(password))) {
        res.json({
            _id: user._id,
            name: user.name,
            email: user.email,
            roles: user.roles, 
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

// ---  New: Google Auth Function ---
exports.googleAuth = asyncHandler(async (req, res) => {
    const { token } = req.body;

    // 1. Verify Google Token
    const googleRes = await axios.get(
        `https://www.googleapis.com/oauth2/v3/userinfo`,
        {
            headers: { Authorization: `Bearer ${token}` },
        }
    );

    const { email, name, picture, sub } = googleRes.data;

    // 2. Check if user exists
    let user = await User.findOne({ email });

    if (!user) {
        // 3. Create new user if not exists
        user = await User.create({
            name,
            email,
            // Google users don't have a password, so we create a secure dummy one
            password: sub + process.env.JWT_SECRET, 
            profilePicture: picture,
            roles: ['Student'], // Default role
            isGoogleUser: true
        });
    }

    // 4. Generate Token & Send Response (Matching loginUser structure)
    if (user) {
        res.status(200).json({
            _id: user._id,
            name: user.name,
            email: user.email,
            roles: user.roles, // Important for frontend redirect
            wishlist: user.wishlist,
            profilePicture: user.profilePicture,
            token: jwt.sign({ id: user._id, roles: user.roles }, process.env.JWT_SECRET, {
                expiresIn: '30d',
            }),
        });
    } else {
        res.status(400);
        throw new Error('Invalid user data');
    }
});