const User = require('../models/User');
const jwt = require('jsonwebtoken');
const asyncHandler = require('express-async-handler');
const axios = require('axios'); //  Added axios import

const normalizeEmail = (email = '') => String(email || '').trim().toLowerCase();

const getJwtSecret = () => {
    const secret = process.env.JWT_SECRET;
    if (secret) return secret;

    const error = new Error('Authentication service is temporarily unavailable.');
    error.statusCode = 503;
    throw error;
};

const createAuthToken = (user) => jwt.sign(
    { id: user._id, roles: user.roles },
    getJwtSecret(),
    { expiresIn: '30d' }
);

const buildAuthUserPayload = (user) => ({
    _id: user._id,
    name: user.name,
    email: user.email,
    roles: user.roles,
    status: user.status,
    accountRestriction: user.accountRestriction,
    roleRestrictions: user.roleRestrictions,
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
    const setUpdate = {};
    const addToSetUpdate = {};
    const currentVerifiedEmails = user.verifiedEmails || [];
    const verificationState = user.verifications?.toObject?.() || user.verifications || {};

    if (user.email && !verificationState.email) {
        setUpdate['verifications.email'] = true;
        user.verifications = { ...verificationState, email: true };
    }
    if (user.email && !currentVerifiedEmails.includes(user.email)) {
        addToSetUpdate.verifiedEmails = user.email;
        user.verifiedEmails = [...currentVerifiedEmails, user.email];
    }
    if (isGoogleUser && !user.isGoogleUser) {
        setUpdate.isGoogleUser = true;
        user.isGoogleUser = true;
    }
    if (picture && !user.profilePicture && !user.avatarUrl) {
        setUpdate.profilePicture = picture;
        setUpdate.avatarUrl = picture;
        user.profilePicture = picture;
        user.avatarUrl = picture;
    }

    const updateOperation = {};
    if (Object.keys(setUpdate).length) updateOperation.$set = setUpdate;
    if (Object.keys(addToSetUpdate).length) updateOperation.$addToSet = addToSetUpdate;

    if (Object.keys(updateOperation).length) {
        await User.updateOne({ _id: user._id }, updateOperation);
    }

    return user;
};

// --- Register User (No changes) ---
exports.registerUser = asyncHandler(async (req, res) => {
    const name = String(req.body.name || '').trim();
    const email = normalizeEmail(req.body.email);
    const password = String(req.body.password || '');

    if (!name || !email || !password) {
        res.status(400);
        throw new Error('Name, email, and password are required.');
    }

    if (password.length < 6) {
        res.status(400);
        throw new Error('Password must be at least 6 characters.');
    }

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
    const email = normalizeEmail(req.body.email);
    const password = String(req.body.password || '');

    if (!email || !password) {
        res.status(400);
        throw new Error('Email and password are required.');
    }

    const user = await User.findOne({ email });

    if (user && (await user.matchPassword(password))) {
        await ensureAccountEmailVerified(user);
        res.json({
            ...buildAuthUserPayload(user),
            token: createAuthToken(user),
        });
    } else {
        res.status(401);
        throw new Error('Invalid email or password');
    }
});

// ---  New: Google Auth Function ---
exports.googleAuth = asyncHandler(async (req, res) => {
    const { token } = req.body;
    if (!token) {
        res.status(400);
        throw new Error('Google token is required.');
    }

    // 1. Verify Google Token
    const googleRes = await axios.get(
        `https://www.googleapis.com/oauth2/v3/userinfo`,
        {
            headers: { Authorization: `Bearer ${token}` },
        }
    );

    const { name, picture, sub } = googleRes.data;
    const email = normalizeEmail(googleRes.data.email);

    if (!email || !sub) {
        res.status(400);
        throw new Error('Google account details could not be verified.');
    }

    // 2. Check if user exists
    let user = await User.findOne({ email });

    if (!user) {
        // 3. Create new user if not exists
        user = await User.create({
            name,
            email,
            // Google users authenticate externally, so store a secure generated value.
            password: `${sub}:${getJwtSecret()}`,
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
            token: createAuthToken(user),
        });
    } else {
        res.status(400);
        throw new Error('Invalid user data');
    }
});
