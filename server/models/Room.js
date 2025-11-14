// server/models/Room.js

const mongoose = require('mongoose');

const bookingSchema = new mongoose.Schema({
    student: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    checkInDate: { type: Date },
    paymentMethod: { type: String, enum: ['Online', 'Cash'] },
    paymentStatus: { type: String, enum: ['Paid', 'Unpaid', 'Pending'] },
    bookedAt: { type: Date }
});

const valueUnitSchema = new mongoose.Schema({
    value: { type: Number }, // Changed from String to Number
    unit: { type: String }
}, { _id: false });


const roomSchema = new mongoose.Schema({
    landlord: {
        type: mongoose.Schema.Types.ObjectId,
        required: true,
        ref: 'User',
        index: true,
    },
    title: { type: String, required: true },
    description: { type: String, required: true },
    location: {
        type: { type: String, enum: ['Point'], default: 'Point', required: true },
        coordinates: { type: [Number], required: true },
        fullAddress: { type: String, required: true },
        city: { type: String, required: true, index: true },
        state: { type: String },
        postalCode: { type: String }
    },
    rent: { type: Number, required: true, default: 0, index: true },
    averageRating: {
        type: Number,
        default: 0,
        min: 0,
        max: 5,
        set: (val) => Math.round(val * 100) / 100
    },
    numReviews: { type: Number, default: 0 },
    beds: { type: Number, required: true },
    roomType: { type: String, index: true },
    tenantPreferences: {
        familyStatus: { type: String, enum: ['Any', 'Bachelors', 'Family'], default: 'Any' },
        allowedGender: { type: String, enum: ['Any', 'Male', 'Female'], default: 'Any' },
    },
    cancellationPolicy: { type: String, enum: ['Flexible', 'Moderate', 'Strict'], required: true, default: 'Flexible' },
    kitchen: { type: String },
    floor: { type: String },
    videoUrl: { type: String },
    securityDeposit: { type: String },
    noticePeriod: valueUnitSchema,
    minimumStay: valueUnitSchema,
    gateClosingTime: { time: { type: String }, period: { type: String }, noRestriction: { type: Boolean } },
    distanceCollege: valueUnitSchema,
    distanceHospital: valueUnitSchema,
    distanceMetro: valueUnitSchema,
    distanceBusStand: valueUnitSchema,
    distanceRailway: valueUnitSchema,
    distanceMarket: valueUnitSchema,
    status: {
        type: String,
        required: true,
        enum: ['Published', 'Unpublished', 'Pending', 'Available', 'Booked', 'Confirmed'],
        default: 'Pending',
        index: true
    },
    
    color: {
        type: String,
        default: '#3b82f6'
    },
    
    booking: { type: bookingSchema, default: null },
    views: { type: Number, default: 0 },
    imageUrl: { type: String, required: true },
    images: [{ type: String }],
    facilities: {
        wifi: { type: Boolean, default: false },
        powerBackup: { type: Boolean, default: false },
        waterSupply: { type: Boolean, default: false },
        geyser: { type: Boolean, default: false },
        attachedWashroom: { type: Boolean, default: false },
        ac: { type: Boolean, default: false },
        balcony: { type: Boolean, default: false },
        fullyFurnished: { type: Boolean, default: false },
        parking: { type: Boolean, default: false },
        lift: { type: Boolean, default: false },
        security: { type: Boolean, default: false },
        laundry: { type: Boolean, default: false },
    },
    kitchenAmenities: {
        fridge: { type: Boolean, default: false },
        microwave: { type: Boolean, default: false },
        waterPurifier: { type: Boolean, default: false },
    },
    rules: {
        guestsAllowed: { type: Boolean, default: false },
        petsAllowed: { type: Boolean, default: false },
        smokingAllowed: { type: Boolean, default: false },
        drinkingAllowed: { type: Boolean, default: false },
    },
     rejectionReason: {
        type: String,
        trim: true,
    },

}, {
    timestamps: true,
});

roomSchema.index({ location: '2dsphere' });

const Room = mongoose.model('Room', roomSchema);
module.exports = Room;