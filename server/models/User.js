const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const UserSchema = new mongoose.Schema({
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    
    roles: {
        type: [String],
        enum: ['Student', 'Landlord', 'Admin'],
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
    
    profilePicture: { 
        type: String, 
        default: '' 
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
    }]
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