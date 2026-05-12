// server/models/Room.js

const mongoose = require('mongoose');
const { sanitizeDateRange, toOptionalDate, toRequiredDate } = require('../utils/dateUtils');

const optionalIndianMobileValidator = {
    validator(value) {
        return !value || /^[6-9]\d{9}$/.test(String(value));
    },
    message: 'Emergency contact phone must be a valid 10-digit number.',
};

const bookingSchema = new mongoose.Schema({
    student: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    checkInDate: { type: Date, set: toOptionalDate },
    paymentMethod: { type: String, enum: ['Online', 'Cash'] },
    paymentStatus: { type: String, enum: ['Paid', 'Unpaid', 'Pending'] },
    bookedAt: { type: Date, set: toOptionalDate }
});

const unavailableRangeSchema = new mongoose.Schema({
    application: { type: mongoose.Schema.Types.ObjectId, ref: 'Application' },
    startDate: { type: Date, required: true, set: toRequiredDate },
    endDate: { type: Date, required: true, set: toRequiredDate },
    status: {
        type: String,
        enum: ['soft', 'approved', 'confirmed', 'external', 'blocked'],
        default: 'approved',
        index: true,
    },
    source: {
        type: String,
        enum: ['RoomRadar', 'Admin', 'External Calendar'],
        default: 'RoomRadar',
    },
    reason: { type: String, trim: true },
    createdAt: { type: Date, default: Date.now, set: toOptionalDate },
}, { _id: false });

const valueUnitSchema = new mongoose.Schema({
    value: { type: Number }, // Changed from String to Number
    unit: { type: String }
}, { _id: false });

const valueUnitDefaults = {
    noticePeriod: 'days',
    minimumStay: 'months',
    distanceCollege: 'km',
    distanceHospital: 'km',
    distanceMetro: 'km',
    distanceBusStand: 'km',
    distanceRailway: 'km',
    distanceMarket: 'km',
};

const numericRoomDefaults = {
    rent: 0,
    maxOccupants: 1,
    bathrooms: 1,
    beds: 1,
    totalFloors: undefined,
    securityDeposit: 0,
    maintenanceCharge: 0,
    waterCharge: 0,
    originalRent: undefined,
    responseRate: undefined,
    recentReviewsCount: 0,
    activeApplicationsCount: 0,
    views: 0,
};

const toLooseNumber = (value) => {
    const rawValue = value && typeof value === 'object' && !Array.isArray(value) ? value.value : value;
    if (rawValue === undefined || rawValue === null || rawValue === '') return undefined;
    if (typeof rawValue === 'string' && /\b(no\s*deposit|none|free|n\/a|na)\b/i.test(rawValue)) return 0;

    const normalized = String(rawValue).replace(/[^\d.-]/g, '');
    if (!normalized || normalized === '-' || normalized === '.' || normalized === '-.') return undefined;

    const parsed = Number(normalized);
    return Number.isFinite(parsed) ? parsed : undefined;
};

const normalizeValueUnit = (field, value) => {
    if (value === undefined || value === null || value === '') return undefined;
    const numericValue = toLooseNumber(value);
    if (numericValue === undefined) return undefined;

    return {
        value: numericValue,
        unit: value && typeof value === 'object' && !Array.isArray(value)
            ? value.unit || valueUnitDefaults[field]
            : valueUnitDefaults[field],
    };
};

const cleanInvalidRoomNumbers = (target, { deleteInvalid = false } = {}) => {
    if (!target || typeof target !== 'object') return;
    const isDocument = typeof target.get === 'function' && typeof target.set === 'function';
    const hasField = (field) => {
        if (isDocument) return target.get(field) !== undefined || target[field] !== undefined;
        return Object.prototype.hasOwnProperty.call(target, field);
    };
    const readField = (field) => (isDocument ? target.get(field) ?? target[field] : target[field]);
    const writeField = (field, value) => {
        if (isDocument) target.set(field, value, { strict: false });
        else target[field] = value;
    };
    const removeField = (field) => {
        if (isDocument) target.set(field, undefined, { strict: false });
        else delete target[field];
    };

    Object.entries(numericRoomDefaults).forEach(([field, fallback]) => {
        if (!hasField(field)) return;

        const numericValue = toLooseNumber(readField(field));
        if (numericValue !== undefined) {
            writeField(field, numericValue);
            return;
        }

        if (deleteInvalid || fallback === undefined) removeField(field);
        else writeField(field, fallback);
    });

    Object.keys(valueUnitDefaults).forEach((field) => {
        if (!hasField(field)) return;

        const normalized = normalizeValueUnit(field, readField(field));
        if (normalized) writeField(field, normalized);
        else removeField(field);
    });

    const rules = readField('rules');
    if (rules && typeof rules === 'object' && Object.prototype.hasOwnProperty.call(rules, 'noticePeriod')) {
        const noticePeriod = toLooseNumber(rules.noticePeriod);
        const normalizedRules = rules.toObject ? rules.toObject() : { ...rules };
        if (noticePeriod === undefined) delete normalizedRules.noticePeriod;
        else normalizedRules.noticePeriod = noticePeriod;
        writeField('rules', normalizedRules);
    }
};


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
        locality: { type: String },
        landmark: { type: String },
        city: { type: String, required: true, index: true },
        state: { type: String },
        postalCode: { type: String },
        pincode: { type: String }
    },
    rent: { type: Number, required: true, default: 0, index: true },
    maxOccupants: { type: Number, default: 1, index: true },
    bathrooms: { type: Number, default: 1, index: true },
    washroomType: { type: String, enum: ['Attached', 'Shared', 'Common'], default: 'Attached', index: true },
    furnishingStatus: { type: String, enum: ['Fully Furnished', 'Semi Furnished', 'Unfurnished'], default: 'Semi Furnished', index: true },
    preferredOccupant: { type: String, enum: ['Student', 'Individual', 'Working Professional', 'Family', 'Couple', 'Any'], default: 'Any', index: true },
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
    familyStatus: { type: String, default: 'Any', index: true },
    gender: { type: String, enum: ['Male', 'Female', 'Any'], default: 'Any', index: true },
    cancellationPolicy: { type: String, enum: ['Flexible', 'Moderate', 'Strict'], required: true, default: 'Flexible' },
    locality: { type: String, trim: true, index: true },
    landmark: { type: String, trim: true },
    kitchen: { type: String },
    floor: { type: String },
    totalFloors: { type: Number },
    videoUrl: { type: String },
    securityDeposit: { type: Number, default: 0 },
    maintenanceCharge: { type: Number, default: 0 },
    electricityBilling: { type: String, enum: ['Included in rent', 'Metered separately', 'Fixed monthly', 'Not included'], default: 'Metered separately' },
    waterCharge: { type: Number, default: 0 },
    paymentPreference: { type: String, enum: ['Online only', 'Offline cash allowed', 'UPI / Bank transfer', 'Online or Offline'], default: 'Online or Offline', index: true },
    offlinePaymentAllowed: { type: Boolean, default: false, index: true },
    rentNegotiable: { type: Boolean, default: false },
    noticePeriod: valueUnitSchema,
    minimumStay: valueUnitSchema,
    gateClosingTime: { time: { type: String }, period: { type: String }, noRestriction: { type: Boolean } },
    distanceCollege: valueUnitSchema,
    distanceHospital: valueUnitSchema,
    distanceMetro: valueUnitSchema,
    distanceBusStand: valueUnitSchema,
    distanceRailway: valueUnitSchema,
    distanceMarket: valueUnitSchema,
    guidebook: {
        wifiName: { type: String, trim: true },
        wifiPassword: { type: String, trim: true, select: false },
        checkInInstructions: { type: String, trim: true },
        applianceInstructions: { type: String, trim: true },
        localTips: { type: String, trim: true },
        emergencyContactName: { type: String, trim: true },
        emergencyContactPhone: { type: String, trim: true, validate: optionalIndianMobileValidator },
    },
    wifiName: { type: String, trim: true },
    wifiPassword: { type: String, trim: true, select: false },
    checkInInstructions: { type: String, trim: true },
    applianceInstructions: { type: String, trim: true },
    localTips: { type: String, trim: true },
    emergencyContactName: { type: String, trim: true },
    emergencyContactPhone: { type: String, trim: true, validate: optionalIndianMobileValidator },
    status: {
        type: String,
        required: true,
        enum: ['Draft', 'Pending_Review', 'Published', 'Unpublished', 'Pending', 'Available', 'Booked', 'Confirmed', 'Rejected', 'Suspended'],
        default: 'Pending',
        index: true
    },
    
    color: {
        type: String,
        default: '#3b82f6'
    },
    
    booking: { type: bookingSchema, default: null },
    unavailableRanges: [unavailableRangeSchema],
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
        meals: { type: Boolean, default: false },
        cctv: { type: Boolean, default: false },
        gym: { type: Boolean, default: false },
        hotWater: { type: Boolean, default: false },
        studyTable: { type: Boolean, default: false },
        wardrobe: { type: Boolean, default: false },
        kitchenAccess: { type: Boolean, default: false },
        waterPurifier: { type: Boolean, default: false },
        housekeeping: { type: Boolean, default: false },
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
        entryTiming: { type: String },
        visitorTiming: { type: String },
        quietHours: { type: String },
        noticePeriod: { type: Number },
    },
     rejectionReason: {
        type: String,
        trim: true,
    },
    rejection_reason: {
        type: String,
        trim: true,
    },
    documents: [{
        type: String,
        trim: true,
    }],

    // Verification fields
    verifications: {
        property: { type: Boolean, default: false },
        photos: { type: Boolean, default: false },
        amenities: { type: Boolean, default: false }
    },
    originalRent: { type: Number },
    responseRate: { type: Number, default: null, min: 0, max: 100 },
    recentReviewsCount: { type: Number, default: 0 },
    activeApplicationsCount: { type: Number, default: 0 },

    // Additional fields for enhanced search
    preferredGender: { type: String, enum: ['Male', 'Female', 'Any'] },
    furnished: { type: Boolean, default: false },
    bhk: { type: String, enum: ['1 RK', '1 BHK', '2 BHK', '3 BHK', '3+ BHK'] },
    amenities: [String],
    availableFrom: { type: Date, set: toOptionalDate },
    photos: [{ type: String }],
    isDeleted: { type: Boolean, default: false, index: true },
    deletedAt: { type: Date, set: toOptionalDate },
    deletedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }

}, {
    timestamps: true,
    strict: false,
});

roomSchema.index({ location: '2dsphere' });
roomSchema.index({ isDeleted: 1, status: 1, 'location.city': 1, rent: 1, roomType: 1 });
roomSchema.index({ 'unavailableRanges.startDate': 1, 'unavailableRanges.endDate': 1, 'unavailableRanges.status': 1 });
roomSchema.index({ landlord: 1, isDeleted: 1, status: 1, createdAt: -1 });

function cleanInvalidRoomDates(doc) {
    cleanInvalidRoomNumbers(doc);

    ['startDate', 'endDate', 'checkInDate', 'checkOutDate', 'availableTo'].forEach((field) => {
        if (doc.get?.(field) !== undefined || doc[field] !== undefined) {
            doc.set?.(field, undefined, { strict: false });
            delete doc[field];
        }
    });

    if (doc.availableFrom && !toOptionalDate(doc.availableFrom)) doc.availableFrom = undefined;
    if (doc.deletedAt && !toOptionalDate(doc.deletedAt)) doc.deletedAt = undefined;
    if (doc.booking?.checkInDate && !toOptionalDate(doc.booking.checkInDate)) doc.booking.checkInDate = undefined;
    if (doc.booking?.bookedAt && !toOptionalDate(doc.booking.bookedAt)) doc.booking.bookedAt = undefined;

    if (Array.isArray(doc.unavailableRanges)) {
        doc.unavailableRanges = doc.unavailableRanges
            .map((range) => sanitizeDateRange(range?.toObject ? range.toObject() : range))
            .filter(Boolean);
    }
}

roomSchema.pre('validate', function cleanInvalidRoomDatesBeforeValidate(next) {
    cleanInvalidRoomDates(this);
    next();
});

roomSchema.pre('save', function cleanInvalidRoomDatesBeforeSave(next) {
    cleanInvalidRoomDates(this);
    next();
});

roomSchema.pre('findOneAndUpdate', function cleanInvalidRoomDateUpdates(next) {
    const update = this.getUpdate();
    if (!update) return next();

    const containers = [update, update.$set].filter(Boolean);
    containers.forEach((container) => {
        cleanInvalidRoomNumbers(container, { deleteInvalid: true });
        ['startDate', 'endDate', 'checkInDate', 'checkOutDate', 'availableTo'].forEach((field) => {
            delete container[field];
        });
        if (Object.prototype.hasOwnProperty.call(container, 'availableFrom') && !toOptionalDate(container.availableFrom)) {
            delete container.availableFrom;
        }
        if (Object.prototype.hasOwnProperty.call(container, 'unavailableRanges') && Array.isArray(container.unavailableRanges)) {
            container.unavailableRanges = container.unavailableRanges.map(sanitizeDateRange).filter(Boolean);
        }
    });

    if (update.$push?.unavailableRanges) {
        const sanitizedRange = sanitizeDateRange(update.$push.unavailableRanges);
        if (sanitizedRange) update.$push.unavailableRanges = sanitizedRange;
        else delete update.$push.unavailableRanges;
        if (update.$push && Object.keys(update.$push).length === 0) delete update.$push;
    }

    this.setUpdate(update);
    next();
});

function cleanInvalidRoomDateBulkUpdates(next) {
    const update = this.getUpdate();
    if (!update) return next();

    [update, update.$set].filter(Boolean).forEach((container) => {
        cleanInvalidRoomNumbers(container, { deleteInvalid: true });
        ['startDate', 'endDate', 'checkInDate', 'checkOutDate', 'availableTo'].forEach((field) => {
            delete container[field];
        });
    });

    if (update.$set?.availableFrom && !toOptionalDate(update.$set.availableFrom)) {
        delete update.$set.availableFrom;
    }
    if (update.$push?.unavailableRanges) {
        const sanitizedRange = sanitizeDateRange(update.$push.unavailableRanges);
        if (sanitizedRange) update.$push.unavailableRanges = sanitizedRange;
        else delete update.$push.unavailableRanges;
        if (update.$push && Object.keys(update.$push).length === 0) delete update.$push;
    }

    this.setUpdate(update);
    next();
}

roomSchema.pre('updateOne', cleanInvalidRoomDateBulkUpdates);
roomSchema.pre('updateMany', cleanInvalidRoomDateBulkUpdates);

const Room = mongoose.model('Room', roomSchema);
module.exports = Room;
