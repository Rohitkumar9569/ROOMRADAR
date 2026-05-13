const User = require('../models/User');
const jwt = require('jsonwebtoken');
const asyncHandler = require('express-async-handler');
const axios = require('axios'); //  Added axios import

const buildAuthUserPayload = (user) => ({
    _id: user._id,
    name: user.name,
    email: user.email,
    roles: user.roles,
    status: user.status,
    accountRestriction: user.accountRestriction,
    wishlist: user.wishlist,
    profilePicture: user.profilePicture,
    avatarUrl: user.avatarUrl,
    mobileNumber: user.mobileNumber,
    phone: user.phone,
    city: user.city,
    gender: user.gender,
    occupation: user.occupation,
    bio: user.bio,
    roleProfiles: user.roleProfiles,
    isGoogleUser: user.isGoogleUser,
    isVerified: user.isVerified,
    kyc_status: user.kyc_status,
    trustScore: user.trustScore,
    verificationLevel: user.verificationLevel,
    verifications: user.verifications,
    verifiedEmails: user.verifiedEmails,
    verifiedPhone: user.verifiedPhone,
});

const ensureAccountEmailVerified = async (user, { isGoogleUser = false, picture = '' } = {}) => {
    if (!user) return user;
    let changed = false;

    if (!user.verifications) user.verifications = {};
    if (user.email && !user.verifications.email) {
        user.verifications.email = true;
        changed = true;
    }
    if (user.email && !user.verifiedEmails?.includes(user.email)) {
        user.verifiedEmails = [...(user.verifiedEmails || []), user.email];
        changed = true;
    }
    if (isGoogleUser && !user.isGoogleUser) {
        user.isGoogleUser = true;
        changed = true;
    }
    if (picture && !user.profilePicture && !user.avatarUrl) {
        user.profilePicture = picture;
        user.avatarUrl = picture;
        changed = true;
    }

    return changed ? user.save() : user;
};

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
        verifications: { email: true },
        verifiedEmails: [email],
    });

    if (user) {
        res.status(201).json({
            ...buildAuthUserPayload(user),
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
        await ensureAccountEmailVerified(user);
        res.json({
            ...buildAuthUserPayload(user),
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
            // Google users authenticate externally, so store a secure generated value.
            password: sub + process.env.JWT_SECRET, 
            profilePicture: picture,
            avatarUrl: picture,
            roles: ['Student'], // Default role
            isGoogleUser: true,
            verifications: { email: true },
            verifiedEmails: [email],
        });
    } else {
        await ensureAccountEmailVerified(user, { isGoogleUser: true, picture });
    }

    // 4. Generate Token & Send Response (Matching loginUser structure)
    if (user) {
        res.status(200).json({
            ...buildAuthUserPayload(user),
            token: jwt.sign({ id: user._id, roles: user.roles }, process.env.JWT_SECRET, {
                expiresIn: '30d',
            }),
        });
    } else {
        res.status(400);
        throw new Error('Invalid user data');
    }
});
