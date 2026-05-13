const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const optionalIndianMobileValidator = {
    validator(value) {
        return !value || /^[6-9]\d{9}$/.test(String(value));
    },
    message: 'Mobile number must be a valid 10-digit number.',
};

const RoleProfileSchema = new mongoose.Schema({
    name: { type: String, default: '' },
    profilePicture: { type: String, default: '' },
    avatarUrl: { type: String, default: '' },
    mobileNumber: { type: String, default: '', validate: optionalIndianMobileValidator },
    phone: { type: String, default: '', validate: optionalIndianMobileValidator },
    city: { type: String, default: '' },
    gender: {
        type: String,
        enum: ['', 'Male', 'Female', 'Other', 'Prefer not to say'],
        default: ''
    },
    occupation: { type: String, default: '' },
    bio: { type: String, default: '', maxlength: 500 },
    paymentCollectionMode: {
        type: String,
        enum: ['', 'Online escrow preferred', 'UPI / Bank transfer', 'Offline cash allowed', 'Online or Offline'],
        default: ''
    },
    offlinePaymentAllowed: { type: Boolean, default: false },
    upiId: { type: String, default: '', trim: true },
    bankAccountHolder: { type: String, default: '', trim: true },
    bankAccountNumber: { type: String, default: '', trim: true },
    bankIfsc: { type: String, default: '', trim: true, uppercase: true },
    bankName: { type: String, default: '', trim: true },
    payoutNotes: { type: String, default: '', trim: true, maxlength: 300 },
}, { _id: false });

const UserSchema = new mongoose.Schema({
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    
    roles: {
        type: [String],
        enum: ['Student', 'Landlord', 'Admin', 'Super_Admin', 'Moderator', 'Support'],
        default: ['Student']
    },

    /**
     * The user's current account status, managed by admins.
     */
    status: {
        type: String,
        enum: ['Active', 'Banned'],
        default: 'Active'
    },
    accountRestriction: {
        reason: { type: String, default: '', trim: true, maxlength: 500 },
        note: { type: String, default: '', trim: true, maxlength: 500 },
        bannedAt: Date,
        bannedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
        appealStatus: {
            type: String,
            enum: ['none', 'pending', 'reviewing', 'resolved'],
            default: 'none',
        },
        appealMessage: { type: String, default: '', trim: true, maxlength: 1000 },
        appealSubmittedAt: Date,
        supportTicket: { type: mongoose.Schema.Types.ObjectId, ref: 'SupportTicket' },
        resolvedAt: Date,
    },
    
    profilePicture: { 
        type: String, 
        default: '' 
    },
    avatarUrl: {
        type: String,
        default: ''
    },
    mobileNumber: {
        type: String,
        default: '',
        validate: optionalIndianMobileValidator
    },
    phone: {
        type: String,
        default: '',
        validate: optionalIndianMobileValidator
    },
    city: {
        type: String,
        default: ''
    },
    gender: {
        type: String,
        enum: ['', 'Male', 'Female', 'Other', 'Prefer not to say'],
        default: ''
    },
    occupation: {
        type: String,
        default: ''
    },
    bio: {
        type: String,
        default: '',
        maxlength: 500
    },
    roleProfiles: {
        student: { type: RoleProfileSchema, default: () => ({}) },
        landlord: { type: RoleProfileSchema, default: () => ({}) },
    },
    isVerified: {
        type: Boolean,
        default: false,
        index: true,
    },
    isGoogleUser: {
        type: Boolean,
        default: false,
    },
    isOnline: {
        type: Boolean,
        default: false,
    },
    lastSeen: {
        type: Date,
    },
    wishlist: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Room'
    }],

    // Verification fields
    kyc_status: {
        type: String,
        enum: ['Unverified', 'Pending', 'Verified', 'Rejected'],
        default: 'Unverified',
        index: true
    },
    kyc_documents: [{
        type: {
            type: String,
            trim: true
        },
        url: {
            type: String,
            trim: true
        },
        status: {
            type: String,
            enum: ['Pending', 'Verified', 'Rejected'],
            default: 'Pending'
        },
        uploadedAt: {
            type: Date,
            default: Date.now
        }
    }],
    verifiedEmails: [String],
    verifiedPhone: String,
    trustScore: { type: Number, default: 0, min: 0, max: 100 },
    verificationLevel: {
        type: String,
        enum: ['unverified', 'basic', 'verified', 'premium'],
        default: 'unverified'
    },
    verifications: {
        email: { type: Boolean, default: false },
        phone: { type: Boolean, default: false },
        identity: { type: Boolean, default: false },
        address: { type: Boolean, default: false },
        student: { type: Boolean, default: false },
        employment: { type: Boolean, default: false },
        property: { type: Boolean, default: false },
        background: { type: Boolean, default: false }
    }
}, { timestamps: true });


UserSchema.pre('save', async function(next) {
    if (!this.isModified('password')) {
        return next();
    }
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    next();
});

UserSchema.methods.matchPassword = async function (enteredPassword) {
    return await bcrypt.compare(enteredPassword, this.password);
};

module.exports = mongoose.model('User', UserSchema);
