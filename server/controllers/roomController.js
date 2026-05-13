const Room = require('../models/Room');
const User = require('../models/User');
const mongoose = require('mongoose');
const asyncHandler = require('express-async-handler');
const Application = require('../models/Application');
const Notification = require('../models/Notification');
const jwt = require('jsonwebtoken');
const { getFilterableFields } = require('../utils/roomConfigUtils');
const { sanitizeDateRange, toOptionalDate } = require('../utils/dateUtils');
const { normalizeOptionalIndianMobile } = require('../utils/phoneUtils');
const {
    appendAndClause,
    buildLocationQuery,
    createGenderPreferenceClause,
    findDiscoveryFallbackRooms,
} = require('../utils/roomDiscoveryUtils');

const LANDLORD_PUBLIC_FIELDS = [
    'name',
    'createdAt',
    'avatarUrl',
    'profilePicture',
    'roleProfiles.landlord.name',
    'roleProfiles.landlord.profilePicture',
    'roleProfiles.landlord.avatarUrl',
    'roleProfiles.landlord.city',
    'roleProfiles.landlord.occupation',
    'roleProfiles.landlord.bio',
    'verificationLevel',
    'trustScore',
    'isVerified',
    'kyc_status',
    'verifications',
    'isOnline',
    'lastSeen'
].join(' ');
const LANDLORD_DETAIL_FIELDS = `${LANDLORD_PUBLIC_FIELDS} email mobileNumber phone`;
const handledRoomQueryKeys = new Set([
    'keyword', 'city', 'type', 'sort', 'limit', 'page', 'exclude', 'minRent', 'maxRent',
    'beds', 'maxOccupants', 'roomType', 'gender', 'familyStatus', 'amenities', 'availableFrom',
    'checkInDate', 'checkOutDate', 'moveInDate', 'latitude', 'longitude', 'radius', 'verifiedOnly'
]);
const lockedInventoryStatuses = ['approved', 'confirmed', 'external', 'blocked'];

const normalizePreferredOccupant = (value) => {
    if (!value) return value;
    if (String(value).toLowerCase() === 'student') return 'Individual';
    if (String(value).toLowerCase() === 'room seeker') return 'Individual';
    return value;
};

const toNumberLike = (value) => {
    const rawValue = value && typeof value === 'object' ? value.value : value;
    if (rawValue === undefined || rawValue === null || rawValue === '') return undefined;
    if (typeof rawValue === 'string' && /\b(no\s*deposit|none|free|n\/a|na)\b/i.test(rawValue)) return 0;
    const numericValue = Number(String(rawValue).replace(/[^\d.-]/g, ''));
    return Number.isFinite(numericValue) ? numericValue : undefined;
};

const numericRoomFields = [
    'rent',
    'maxOccupants',
    'bathrooms',
    'beds',
    'totalFloors',
    'securityDeposit',
    'maintenanceCharge',
    'waterCharge',
    'originalRent',
    'responseRate',
    'recentReviewsCount',
    'activeApplicationsCount',
    'views',
];

const numericFieldDefaults = {
    rent: 0,
    maxOccupants: 1,
    bathrooms: 1,
    beds: 1,
    securityDeposit: 0,
    maintenanceCharge: 0,
    waterCharge: 0,
    recentReviewsCount: 0,
    activeApplicationsCount: 0,
    views: 0,
};

const normalizeNumericRoomPayload = (payload = {}) => {
    if (!payload || typeof payload !== 'object') return payload;
    const normalizedPayload = { ...payload };

    numericRoomFields.forEach((field) => {
        if (!Object.prototype.hasOwnProperty.call(normalizedPayload, field)) return;

        const numericValue = toNumberLike(normalizedPayload[field]);
        if (numericValue !== undefined) {
            normalizedPayload[field] = numericValue;
            return;
        }

        if (Object.prototype.hasOwnProperty.call(numericFieldDefaults, field)) {
            normalizedPayload[field] = numericFieldDefaults[field];
        } else {
            delete normalizedPayload[field];
        }
    });

    return normalizedPayload;
};

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

const normalizeValueUnitPayload = (payload = {}) => {
    if (!payload || typeof payload !== 'object') return payload;
    const normalizedPayload = { ...payload };
    Object.entries(valueUnitDefaults).forEach(([field, unit]) => {
        if (!Object.prototype.hasOwnProperty.call(normalizedPayload, field)) return;
        const fieldValue = normalizedPayload[field];
        const numericValue = toNumberLike(fieldValue);
        if (numericValue === undefined) {
            delete normalizedPayload[field];
            return;
        }
        normalizedPayload[field] = {
            value: numericValue,
            unit: fieldValue && typeof fieldValue === 'object' ? fieldValue.unit || unit : unit,
        };
    });
    return normalizedPayload;
};

const normalizeRoomPhonePayload = (payload = {}) => {
    if (!payload || typeof payload !== 'object') return payload;
    const normalizedPayload = { ...payload };

    if (Object.prototype.hasOwnProperty.call(normalizedPayload, 'emergencyContactPhone')) {
        normalizedPayload.emergencyContactPhone = normalizeOptionalIndianMobile(
            normalizedPayload.emergencyContactPhone,
            'Emergency contact phone'
        );
    }

    if (normalizedPayload.guidebook && typeof normalizedPayload.guidebook === 'object') {
        normalizedPayload.guidebook = { ...normalizedPayload.guidebook };
        if (Object.prototype.hasOwnProperty.call(normalizedPayload.guidebook, 'emergencyContactPhone')) {
            normalizedPayload.guidebook.emergencyContactPhone = normalizeOptionalIndianMobile(
                normalizedPayload.guidebook.emergencyContactPhone,
                'Emergency contact phone'
            );
        }
    }

    return normalizedPayload;
};

const normalizeRulesPayload = (rules = {}) => {
    if (!rules || typeof rules !== 'object') return rules;
    const normalizedRules = { ...rules };
    if (Object.prototype.hasOwnProperty.call(normalizedRules, 'noticePeriod')) {
        const numericNoticePeriod = toNumberLike(normalizedRules.noticePeriod);
        if (numericNoticePeriod === undefined) delete normalizedRules.noticePeriod;
        else normalizedRules.noticePeriod = numericNoticePeriod;
    }
    return normalizedRules;
};

const sanitizeRoomDatePayload = (payload = {}) => {
    if (!payload || typeof payload !== 'object') return payload;
    const normalizedPayload = { ...payload };

    ['startDate', 'endDate', 'checkInDate', 'checkOutDate', 'availableTo'].forEach((field) => {
        delete normalizedPayload[field];
    });

    ['availableFrom', 'deletedAt', 'submittedForReviewAt'].forEach((field) => {
        if (!Object.prototype.hasOwnProperty.call(normalizedPayload, field)) return;
        const date = toOptionalDate(normalizedPayload[field]);
        if (date) normalizedPayload[field] = date;
        else delete normalizedPayload[field];
    });

    if (Array.isArray(normalizedPayload.unavailableRanges)) {
        normalizedPayload.unavailableRanges = normalizedPayload.unavailableRanges
            .map(sanitizeDateRange)
            .filter(Boolean);
    }

    return normalizedPayload;
};

const buildConfiguredFilter = (query, field, rawValue) => {
    if (rawValue === undefined || rawValue === null || rawValue === '') return;
    if (field.sectionId === 'amenities') {
        query[`facilities.${field.key}`] = rawValue === true || rawValue === 'true' || rawValue === '1';
        return;
    }
    if (field.sectionId === 'rules') {
        query[`rules.${field.key}`] = field.type === 'boolean' ? (rawValue === true || rawValue === 'true' || rawValue === '1') : rawValue;
        return;
    }
    if (field.sectionId === 'location') {
        const value = String(rawValue).trim();
        if (value) query[`location.${field.key}`] = { $regex: value, $options: 'i' };
        return;
    }
    if (field.type === 'boolean') {
        query[field.key] = rawValue === true || rawValue === 'true' || rawValue === '1';
        return;
    }
    if (field.type === 'number') {
        const numericValue = Number(rawValue);
        if (!Number.isNaN(numericValue)) {
            query[field.key] = field.searchOperator === 'gte' ? { $gte: numericValue } : numericValue;
        }
        return;
    }
    if (field.type === 'text') {
        query[field.key] = { $regex: String(rawValue), $options: 'i' };
        return;
    }
    query[field.key] = rawValue;
};

const addAvailabilityExclusion = (query, { startDate, endDate }) => {
    if (!startDate) return;
    const start = toOptionalDate(startDate);
    if (!start) return;

    const end = endDate ? toOptionalDate(endDate) : new Date(start);
    if (!endDate) end.setDate(end.getDate() + 30);
    if (!end || end.getTime() <= start.getTime()) return;

    query.unavailableRanges = {
        $not: {
            $elemMatch: {
                status: { $in: lockedInventoryStatuses },
                startDate: { $lt: end },
                endDate: { $gt: start },
            },
        },
    };
};

// CREATE ROOM
exports.createRoom = asyncHandler(async (req, res) => {
    try {
        const roomPayload = normalizeRoomPhonePayload(normalizeNumericRoomPayload(sanitizeRoomDatePayload(normalizeValueUnitPayload({ ...req.body }))));
        roomPayload.rules = normalizeRulesPayload(roomPayload.rules);

        if (!roomPayload.location || !roomPayload.location.coordinates || !roomPayload.location.fullAddress || !roomPayload.location.city) {
            return res.status(400).json({ message: 'A complete location object is required.' });
        }

        const familyStatus = roomPayload.familyStatus || roomPayload.tenantPreferences?.familyStatus || 'Any';
        const normalizedFamilyStatus = familyStatus === 'Bachelors Only' ? 'Bachelors' : familyStatus === 'Family Only' ? 'Family' : familyStatus;
        const allowedGender = roomPayload.gender || roomPayload.tenantPreferences?.allowedGender || 'Any';

        const room = new Room({
            ...roomPayload,
            preferredOccupant: normalizePreferredOccupant(roomPayload.preferredOccupant),
            landlord: req.user._id,
            tenantPreferences: {
                familyStatus: normalizedFamilyStatus,
                allowedGender,
            },
            familyStatus: normalizedFamilyStatus,
            gender: allowedGender,
            location: {
                ...roomPayload.location,
                postalCode: roomPayload.location.postalCode || roomPayload.location.pincode,
                pincode: roomPayload.location.pincode || roomPayload.location.postalCode,
            },
            status: 'Pending'
        });

        const createdRoom = await room.save();
        
        await User.findByIdAndUpdate(req.user._id, { $addToSet: { roles: 'Landlord' } });

        res.status(201).json(createdRoom);
    } catch (error) {
        res.status(400).json({ message: 'Error creating room', error: error.message });
    }
});

// GET ALL ROOMS
exports.getAllRooms = asyncHandler(async (req, res) => {
    try {
        const {
            keyword,
            city,
            type,
            sort,
            limit = 0,
            page,
            exclude,
            minRent,
            maxRent,
            beds,
            maxOccupants,
            roomType,
            gender,
            familyStatus,
            amenities,
            availableFrom,
            checkInDate,
            checkOutDate,
            moveInDate,
            latitude,
            longitude,
            radius,
            verifiedOnly,
        } = req.query;
        const query = { status: 'Published', isDeleted: { $ne: true } };

        const cityKeyword = city || keyword;
        if (cityKeyword) {
            const locationQuery = buildLocationQuery(cityKeyword, { matchAll: true });
            if (locationQuery) appendAndClause(query, locationQuery);
        }
        if (latitude && longitude && radius) {
            const radiusInMeters = Math.max(Number(radius) || 5, 1) * 1000;
            query.location = {
                $geoWithin: {
                    $centerSphere: [[Number(longitude), Number(latitude)], radiusInMeters / 6378100]
                }
            };
        }
        if (exclude) query._id = { $ne: exclude };
        if (roomType) query.roomType = roomType;
        if (type && type !== 'All') {
            if (type === 'Rooms') query.roomType = { $regex: 'Room', $options: 'i' };
            else if (type === 'Flats') query.roomType = { $regex: 'Flat|BHK', $options: 'i' };
            else query.roomType = { $regex: type, $options: 'i' };
        }
        if (verifiedOnly === true || verifiedOnly === 'true' || verifiedOnly === '1') {
            query['verifications.property'] = true;
        }
        if (gender && gender !== 'Any') {
            const genderClause = createGenderPreferenceClause(gender);
            if (genderClause) appendAndClause(query, genderClause);
        }
        if (familyStatus && familyStatus !== 'Any') {
            const normalizedFamily = familyStatus === 'Bachelors Only' ? 'Bachelors' : familyStatus === 'Family Only' ? 'Family' : familyStatus;
            query.$and = [
                ...(query.$and || []),
                {
                    $or: [
                        { familyStatus: normalizedFamily },
                        { 'tenantPreferences.familyStatus': normalizedFamily },
                        { familyStatus: 'Any' },
                        { 'tenantPreferences.familyStatus': 'Any' },
                    ],
                },
            ];
        }
        if (minRent || maxRent) {
            query.rent = {};
            if (minRent) query.rent.$gte = Number(minRent);
            if (maxRent) query.rent.$lte = Number(maxRent);
        }
        const occupantCount = Number(maxOccupants);
        if (Number.isFinite(occupantCount) && occupantCount > 0) {
            query.$and = [
                ...(query.$and || []),
                {
                    $or: [
                        { maxOccupants: { $gte: occupantCount } },
                        { beds: { $gte: occupantCount } },
                    ],
                },
            ];
        }
        if (beds) query.beds = Number(beds);
        const availableFromDate = toOptionalDate(availableFrom);
        if (availableFromDate) query.availableFrom = { $lte: availableFromDate };
        addAvailabilityExclusion(query, {
            startDate: checkInDate || moveInDate,
            endDate: checkOutDate,
        });
        if (amenities) {
            String(amenities).split(',').filter(Boolean).forEach((amenity) => {
                query[`facilities.${amenity}`] = true;
            });
        }
        getFilterableFields().forEach((field) => {
            if (handledRoomQueryKeys.has(field.key)) return;
            buildConfiguredFilter(query, field, req.query[field.key]);
        });

        let sortOption = { createdAt: -1 };
        if (sort === 'views' || sort === 'popular') sortOption = { views: -1, createdAt: -1 };
        if (sort === 'price_asc') sortOption = { rent: 1 };
        if (sort === 'price_desc') sortOption = { rent: -1 };
        if (sort === 'rating') sortOption = { averageRating: -1, numReviews: -1 };

        const pageNumber = page ? Math.max(Number(page), 1) : null;
        const limitNumber = Number(limit) > 0 ? Math.min(Number(limit), 48) : 0;
        const skip = pageNumber && limitNumber ? (pageNumber - 1) * limitNumber : 0;

        const findQuery = Room.find(query).populate('landlord', LANDLORD_PUBLIC_FIELDS).sort(sortOption);
        if (skip) findQuery.skip(skip);
        if (limitNumber) findQuery.limit(limitNumber);

        let [rooms, total] = await Promise.all([
            findQuery.lean(),
            pageNumber ? Room.countDocuments(query) : Promise.resolve(0),
        ]);
        let fallbackMeta = null;
        const exactTotal = total;
        const hasLocationIntent = Boolean(cityKeyword || (latitude && longitude));

        if (pageNumber === 1 && hasLocationIntent && limitNumber && rooms.length < limitNumber) {
            let fallbackRooms = await findDiscoveryFallbackRooms(Room, {
                ...req.query,
                city: cityKeyword || city,
                sort,
                limit: limitNumber - rooms.length,
            }, {
                resultLimit: limitNumber - rooms.length,
                candidateLimit: 180,
                excludeIds: [
                    ...(exclude ? [exclude] : []),
                    ...rooms.map((room) => room._id),
                ],
            });

            if (fallbackRooms.length > 0) {
                fallbackRooms = await Room.populate(fallbackRooms, { path: 'landlord', select: LANDLORD_PUBLIC_FIELDS });
                rooms = [...rooms, ...fallbackRooms].slice(0, limitNumber);
                total = Math.max(total, rooms.length);
                fallbackMeta = {
                    type: exactTotal > 0 ? 'location_expanded' : 'location_primary',
                    message: exactTotal > 0
                        ? 'Showing exact matches first, then more rooms from this location.'
                        : 'No exact match found. Showing rooms from this location first, then closest alternatives.',
                };
            }
        }

        if (pageNumber === 1 && rooms.length === 0) {
            let fallbackRooms = await findDiscoveryFallbackRooms(Room, {
                ...req.query,
                sort,
                limit: limitNumber || 12,
            }, {
                resultLimit: limitNumber || 12,
                candidateLimit: 180,
                excludeIds: exclude ? [exclude] : [],
            });

            if (fallbackRooms.length > 0) {
                fallbackRooms = await Room.populate(fallbackRooms, { path: 'landlord', select: LANDLORD_PUBLIC_FIELDS });
                rooms = fallbackRooms;
                total = fallbackRooms.length;
                fallbackMeta = {
                    type: 'relaxed',
                    message: 'No exact match found. Showing the closest available rooms based on your search filters.',
                };
            }
        }

        if (pageNumber) {
            return res.json({
                data: rooms,
                count: rooms.length,
                total,
                exactTotal,
                page: pageNumber,
                totalPages: limitNumber ? Math.ceil(total / limitNumber) : 1,
                fallback: fallbackMeta,
            });
        }

        res.json(rooms);
    } catch (error) {
        res.status(500).json({ message: 'Server Error' });
    }
});


// SEARCH ROOMS 
exports.searchRooms = asyncHandler(async (req, res) => {
    try {
        const { latitude, longitude, radius, city, minRent, maxRent, beds, roomType, checkInDate, checkOutDate, moveInDate } = req.body;
        let query = { status: 'Published', isDeleted: { $ne: true } };

        if (latitude && longitude && radius) {
            const radiusInMeters = parseFloat(radius) * 1000;
            query.location = {
                $geoWithin: { $centerSphere: [[parseFloat(longitude), parseFloat(latitude)], radiusInMeters / 6378100] }
            };
        }
        else if (city) {
            const locationQuery = buildLocationQuery(city, { matchAll: true });
            if (locationQuery) appendAndClause(query, locationQuery);
        }
        if (minRent || maxRent) {
            query.rent = {};
            if (minRent) query.rent.$gte = parseFloat(minRent);
            if (maxRent) query.rent.$lte = parseFloat(maxRent);
        }
        if (beds) { query.beds = parseInt(beds); }
        if (roomType) { query.roomType = roomType; }
        addAvailabilityExclusion(query, {
            startDate: checkInDate || moveInDate,
            endDate: checkOutDate,
        });

        let rooms = await Room.find(query)
            .populate('landlord', LANDLORD_PUBLIC_FIELDS)
            .lean();
        let fallback = null;
        if (rooms.length === 0) {
            rooms = await findDiscoveryFallbackRooms(Room, req.body, {
                resultLimit: 12,
                candidateLimit: 180,
            });
            if (rooms.length) {
                rooms = await Room.populate(rooms, { path: 'landlord', select: LANDLORD_PUBLIC_FIELDS });
                fallback = {
                    type: 'relaxed',
                    message: 'No exact match found. Showing the closest available rooms based on your search filters.',
                };
            }
        }
        res.status(200).json({
            message: `${rooms.length} rooms found.`,
            count: rooms.length,
            data: rooms,
            fallback
        });
    } catch (error) {
        res.status(500).json({ message: 'Server Error', error: error.message });
    }
});

exports.getRecommendedRooms = asyncHandler(async (req, res) => {
    const limit = Math.min(Number(req.query.limit) || 8, 24);
    let userId = req.query.userId;

    if (!userId && req.headers.authorization?.startsWith('Bearer ') && process.env.JWT_SECRET) {
        try {
            const decoded = jwt.verify(req.headers.authorization.split(' ')[1], process.env.JWT_SECRET);
            userId = decoded.id;
        } catch (error) {
            userId = null;
        }
    }

    if (userId) {
        const user = await User.findById(userId).populate('wishlist', 'location rent').lean();
        const wishlistRooms = user?.wishlist || [];
        const cities = [...new Set(wishlistRooms.map((room) => room.location?.city).filter(Boolean))];
        const rents = wishlistRooms.map((room) => Number(room.rent || 0)).filter((rent) => rent > 0);

        if (cities.length || rents.length) {
            const query = { status: 'Published', isDeleted: { $ne: true } };
            if (cities.length) query['location.city'] = { $in: cities };
            if (rents.length) {
                const avgRent = rents.reduce((sum, rent) => sum + rent, 0) / rents.length;
                query.rent = { $gte: Math.max(0, avgRent * 0.7), $lte: avgRent * 1.3 };
            }
            if (wishlistRooms.length) query._id = { $nin: wishlistRooms.map((room) => room._id) };

            const personalized = await Room.find(query)
                .populate('landlord', LANDLORD_PUBLIC_FIELDS)
                .sort({ averageRating: -1, views: -1, createdAt: -1 })
                .limit(limit)
                .lean();

            if (personalized.length) {
                return res.json({ data: personalized, count: personalized.length, personalized: true });
            }
        }
    }

    const rooms = await Room.find({ status: 'Published', isDeleted: { $ne: true } })
        .populate('landlord', LANDLORD_PUBLIC_FIELDS)
        .sort({ views: -1, averageRating: -1, createdAt: -1 })
        .limit(limit)
        .lean();

    res.json({ data: rooms, count: rooms.length, personalized: false });
});

exports.getPriceRange = asyncHandler(async (req, res) => {
    const result = await Room.aggregate([
        { $match: { status: 'Published', isDeleted: { $ne: true } } },
        { $group: { _id: null, min: { $min: '$rent' }, max: { $max: '$rent' } } }
    ]);

    res.json(result[0] || { min: 0, max: 0 });
});

const normalizeSimilarityText = (value) => String(value || '').trim().toLowerCase();

const escapeRegex = (value) => String(value || '').replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const getRoomCoordinates = (room = {}) => {
    const coordinates = room.location?.coordinates;
    if (!Array.isArray(coordinates) || coordinates.length !== 2) return null;
    const [longitude, latitude] = coordinates.map(Number);
    if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) return null;
    return { latitude, longitude };
};

const calculateDistanceKm = (from, to) => {
    if (!from || !to) return null;
    const toRadians = (degrees) => (degrees * Math.PI) / 180;
    const earthRadiusKm = 6371;
    const dLat = toRadians(to.latitude - from.latitude);
    const dLon = toRadians(to.longitude - from.longitude);
    const lat1 = toRadians(from.latitude);
    const lat2 = toRadians(to.latitude);
    const a = Math.sin(dLat / 2) ** 2
        + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) ** 2;
    return earthRadiusKm * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
};

const getTruthyFacilities = (room = {}) => Object.entries(room.facilities || {})
    .filter(([, enabled]) => Boolean(enabled))
    .map(([key]) => key);

const valuesMatchOrOpen = (candidateValue, sourceValue) => {
    const candidate = normalizeSimilarityText(candidateValue || 'Any');
    const source = normalizeSimilarityText(sourceValue || 'Any');
    if (!candidate || !source) return false;
    return candidate === source || candidate === 'any' || source === 'any';
};

const calculateRoomSimilarityScore = (candidate, source, { group = 'similar', distanceKm } = {}) => {
    if (!candidate || !source || String(candidate._id) === String(source._id)) return -1;

    const candidateRent = Number(candidate.rent || 0);
    const sourceRent = Number(source.rent || 0);
    const rentGap = candidateRent && sourceRent ? Math.abs(candidateRent - sourceRent) / sourceRent : 1;
    const candidateAmenities = getTruthyFacilities(candidate);
    const sourceAmenities = getTruthyFacilities(source);
    const sharedAmenities = candidateAmenities.filter((amenity) => sourceAmenities.includes(amenity)).length;
    let score = 0;

    if (group === 'nearby') score += 28;
    if (group === 'host') score += 34;

    if (normalizeSimilarityText(candidate.location?.city) === normalizeSimilarityText(source.location?.city)) score += 70;
    if (normalizeSimilarityText(candidate.location?.locality) && normalizeSimilarityText(candidate.location?.locality) === normalizeSimilarityText(source.location?.locality)) score += 30;
    if (normalizeSimilarityText(candidate.location?.state) && normalizeSimilarityText(candidate.location?.state) === normalizeSimilarityText(source.location?.state)) score += 12;

    if (Number.isFinite(distanceKm)) {
        if (distanceKm <= 5) score += 60;
        else if (distanceKm <= 10) score += 45;
        else if (distanceKm <= 25) score += 28;
    }

    if (normalizeSimilarityText(candidate.roomType) === normalizeSimilarityText(source.roomType)) score += 34;
    if (candidateRent && sourceRent) score += Math.max(0, 30 - Math.round(rentGap * 46));
    if (candidateRent && sourceRent && candidateRent <= sourceRent) score += 4;
    if (Number(candidate.beds || 0) === Number(source.beds || 0)) score += 9;
    if (Number(candidate.maxOccupants || 0) && Number(candidate.maxOccupants || 0) >= Number(source.maxOccupants || source.beds || 1)) score += 6;
    if (valuesMatchOrOpen(candidate.gender || candidate.tenantPreferences?.allowedGender, source.gender || source.tenantPreferences?.allowedGender)) score += 12;
    if (valuesMatchOrOpen(candidate.familyStatus || candidate.tenantPreferences?.familyStatus, source.familyStatus || source.tenantPreferences?.familyStatus)) score += 8;
    score += Math.min(sharedAmenities * 3, 21);
    score += Math.min(Number(candidate.averageRating || 0), 5) * 2;
    score += Math.min(Number(candidate.numReviews || 0), 20) / 4;
    score += Math.min(Number(candidate.views || 0), 120) / 20;

    return score;
};

exports.getSimilarRooms = asyncHandler(async (req, res) => {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
        return res.status(400).json({ message: 'Invalid room id.' });
    }

    const room = await Room.findById(req.params.id).lean();
    if (!room || room.isDeleted) {
        return res.status(404).json({ message: 'Room not found' });
    }

    const baseQuery = {
        status: 'Published',
        isDeleted: { $ne: true },
    };
    const baseSelection = 'title rent location roomType images imageUrl averageRating numReviews beds maxOccupants bathrooms washroomType attachedWashroom furnishingStatus gender familyStatus tenantPreferences facilities securityDeposit maintenanceCharge electricityBilling availableFrom paymentPreference offlinePaymentAllowed rentNegotiable minimumStay createdAt landlord views';
    const seenIds = new Set([String(room._id)]);
    const sourceCoordinates = getRoomCoordinates(room);
    const rankCandidates = (rooms, group = 'similar') => rooms
        .map((candidate, index) => ({
            candidate,
            index,
            distanceKm: candidate._distanceKm ?? calculateDistanceKm(sourceCoordinates, getRoomCoordinates(candidate)),
        }))
        .map((entry) => ({
            ...entry,
            score: calculateRoomSimilarityScore(entry.candidate, room, { group, distanceKm: entry.distanceKm }),
        }))
        .filter(({ score }) => score >= (group === 'similar' ? 42 : 18))
        .sort((a, b) => (
            b.score - a.score
            || (Number.isFinite(a.distanceKm) ? a.distanceKm : Number.MAX_SAFE_INTEGER) - (Number.isFinite(b.distanceKm) ? b.distanceKm : Number.MAX_SAFE_INTEGER)
            || Number(b.candidate.averageRating || 0) - Number(a.candidate.averageRating || 0)
            || Number(b.candidate.views || 0) - Number(a.candidate.views || 0)
            || new Date(b.candidate.createdAt || 0).getTime() - new Date(a.candidate.createdAt || 0).getTime()
            || a.index - b.index
        ))
        .map(({ candidate, score, distanceKm }) => ({
            ...candidate,
            _recommendation: {
                group,
                tier: group === 'nearby' ? 0 : group === 'host' ? 1 : 2,
                score: Math.round(score),
                distanceKm: Number.isFinite(distanceKm) ? Math.round(distanceKm * 10) / 10 : undefined,
                reason: group === 'host'
                    ? 'More from this host'
                    : group === 'nearby'
                        ? Number.isFinite(distanceKm)
                            ? `${Math.round(distanceKm * 10) / 10} km from this listing`
                            : `Near ${room.location?.city || 'this listing'}`
                        : 'Similar price and room type',
            },
        }));
    const appendUnique = (target, candidates, maxItems) => {
        for (const candidate of candidates) {
            if (target.length >= maxItems) break;
            const id = String(candidate._id);
            if (seenIds.has(id)) continue;
            seenIds.add(id);
            target.push(candidate);
        }
        return target;
    };

    const appendCandidatePool = (target, rooms) => {
        const poolSeen = new Set(target.map((item) => String(item._id)));
        rooms.forEach((candidate) => {
            const id = String(candidate._id);
            if (poolSeen.has(id) || seenIds.has(id)) return;
            poolSeen.add(id);
            target.push(candidate);
        });
        return target;
    };

    const locationQuery = buildLocationQuery([
        room.location?.city,
        room.location?.locality,
        room.location?.landmark,
    ].filter(Boolean).join(' '), { matchAll: false });

    const locationCandidates = locationQuery
        ? await Room.find({
            ...baseQuery,
            _id: { $ne: room._id },
            ...locationQuery,
        })
            .populate('landlord', LANDLORD_PUBLIC_FIELDS)
            .select(baseSelection)
            .sort({ averageRating: -1, views: -1, createdAt: -1 })
            .limit(48)
            .lean()
        : [];

    const nearbyCandidates = [];
    if (sourceCoordinates) {
        try {
            const geoCandidates = await Room.aggregate([
                {
                    $geoNear: {
                        near: {
                            type: 'Point',
                            coordinates: [sourceCoordinates.longitude, sourceCoordinates.latitude],
                        },
                        distanceField: '_distanceMeters',
                        spherical: true,
                        maxDistance: 25000,
                        query: {
                            status: 'Published',
                            isDeleted: { $ne: true },
                            _id: { $ne: room._id },
                        },
                    },
                },
                { $limit: 72 },
                {
                    $project: {
                        title: 1,
                        rent: 1,
                        location: 1,
                        roomType: 1,
                        images: 1,
                        imageUrl: 1,
                        averageRating: 1,
                        numReviews: 1,
                        beds: 1,
                        maxOccupants: 1,
                        bathrooms: 1,
                        washroomType: 1,
                        attachedWashroom: 1,
                        furnishingStatus: 1,
                        gender: 1,
                        familyStatus: 1,
                        tenantPreferences: 1,
                        facilities: 1,
                        securityDeposit: 1,
                        maintenanceCharge: 1,
                        electricityBilling: 1,
                        availableFrom: 1,
                        paymentPreference: 1,
                        offlinePaymentAllowed: 1,
                        rentNegotiable: 1,
                        minimumStay: 1,
                        createdAt: 1,
                        landlord: 1,
                        views: 1,
                        _distanceMeters: 1,
                    },
                },
            ]);
            geoCandidates.forEach((candidate) => {
                candidate._distanceKm = Number(candidate._distanceMeters || 0) / 1000;
            });
            appendCandidatePool(nearbyCandidates, await Room.populate(geoCandidates, { path: 'landlord', select: LANDLORD_PUBLIC_FIELDS }));
        } catch {
            // Location text matches below still keep the recommendation rail useful if geo search is unavailable.
        }
    }

    appendCandidatePool(nearbyCandidates, locationCandidates);

    const similar = appendUnique([], rankCandidates(nearbyCandidates, 'nearby'), 8);

    if (similar.length < 8 && room.landlord) {
        const landlordCandidates = await Room.find({
            ...baseQuery,
            _id: { $nin: [...seenIds] },
            landlord: room.landlord,
        })
            .populate('landlord', LANDLORD_PUBLIC_FIELDS)
            .select(baseSelection)
            .sort({ averageRating: -1, views: -1, createdAt: -1 })
            .limit(48)
            .lean();

        appendUnique(similar, rankCandidates(landlordCandidates, 'host'), 8);
    }

    if (similar.length < 8) {
        const rent = Number(room.rent || 0);
        const fallbackClauses = [];
        if (room.location?.state) fallbackClauses.push({ 'location.state': { $regex: `^${escapeRegex(room.location.state)}$`, $options: 'i' } });
        if (room.roomType) fallbackClauses.push({ roomType: room.roomType });
        if (room.gender && room.gender !== 'Any') fallbackClauses.push({ $or: [{ gender: room.gender }, { 'tenantPreferences.allowedGender': room.gender }, { gender: 'Any' }, { 'tenantPreferences.allowedGender': 'Any' }] });
        if (rent > 0) fallbackClauses.push({ rent: { $gte: rent * 0.65, $lte: rent * 1.35 } });
        getTruthyFacilities(room).slice(0, 4).forEach((amenity) => fallbackClauses.push({ [`facilities.${amenity}`]: true }));

        const fallbackCandidates = fallbackClauses.length ? await Room.find({
            ...baseQuery,
            _id: { $nin: [...seenIds] },
            $or: fallbackClauses,
        })
            .populate('landlord', LANDLORD_PUBLIC_FIELDS)
            .select(baseSelection)
            .sort({ averageRating: -1, views: -1, createdAt: -1 })
            .limit(48)
            .lean() : [];

        appendUnique(similar, rankCandidates(fallbackCandidates, 'similar'), 8);
    }

    res.json({ data: similar, count: similar.length });
});


// GET ROOM BY ID
exports.getRoomById = asyncHandler(async (req, res) => {
    try {
        if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
            return res.status(400).json({ message: 'Invalid room id.' });
        }

        // Use populate to fetch related landlord details, including name, email, and join date.
        const room = await Room.findById(req.params.id)
            .populate('landlord', LANDLORD_DETAIL_FIELDS)
            .lean();
        
        if (room && !room.isDeleted) {
            if (room.status === 'Published' && req.user?.roles && !req.user.roles.includes('Landlord')) {
                await Room.findByIdAndUpdate(room._id, { $inc: { views: 1 } });
                room.views = (room.views || 0) + 1;
            }
            const [totalRequests, respondedRequests] = await Promise.all([
                Application.countDocuments({ room: room._id, type: 'request' }),
                Application.countDocuments({ room: room._id, type: 'request', status: { $in: ['approved', 'rejected', 'confirmed'] } })
            ]);
            room.responseRate = totalRequests > 0 ? Math.round((respondedRequests / totalRequests) * 100) : null;
            // The frontend expects the room object directly, not nested under a 'data' key.
            res.json(room);
        } else {
            res.status(404).json({ message: 'Room not found' });
        }
    } catch (error) {
        res.status(500).json({ message: 'Could not load room details.', error: error.message });
    }
});

// GET MY ROOMS (for Landlord)
exports.getMyRooms = asyncHandler(async (req, res) => {
    try {
        const [rooms, landlord] = await Promise.all([
            Room.find({ landlord: req.user._id, isDeleted: { $ne: true } }).sort({ createdAt: -1 }).lean(),
            User.findById(req.user._id).select(LANDLORD_PUBLIC_FIELDS).lean(),
        ]);
        const roomsWithStats = await Promise.all(
            rooms.map(async (room) => {
                const applicationCount = await Application.countDocuments({ room: room._id });
                return {
                    ...room,
                    landlord,
                    stats: {
                        views: room.views || 0,
                        applications: applicationCount,
                        messages: applicationCount
                    }
                };
            })
        );
        res.json(roomsWithStats);
    } catch (error) {
        res.status(500).json({ message: 'Server Error' });
    }
});


// DELETE ROOM
exports.deleteRoom = asyncHandler(async (req, res) => {
    try {
        const room = await Room.findOne({ _id: req.params.id, isDeleted: { $ne: true } });
        if (room) {
            if (room.landlord.toString() !== req.user._id.toString()) {
                return res.status(401).json({ message: 'Not authorized' });
            }
            room.isDeleted = true;
            room.deletedAt = new Date();
            room.deletedBy = req.user._id;
            room.status = 'Unpublished';
            await room.save({ validateBeforeSave: false });
            res.json({ message: 'Room archived' });
        } else {
            res.status(404).json({ message: 'Room not found' });
        }
    } catch (error) {
        res.status(500).json({ message: 'Server Error' });
    }
});


// UPDATE ROOM
exports.updateRoom = asyncHandler(async (req, res) => {
    try {
        if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
            return res.status(400).json({ message: 'Invalid room id.' });
        }

        const room = await Room.findById(req.params.id);
        if (!room || room.isDeleted) {
            return res.status(404).json({ message: 'Room not found' });
        }
        if (room.landlord.toString() !== req.user._id.toString()) {
            return res.status(401).json({ message: 'Not authorized' });
        }

        const newRoomData = normalizeRoomPhonePayload(normalizeNumericRoomPayload(sanitizeRoomDatePayload(normalizeValueUnitPayload({ ...req.body }))));
        newRoomData.rules = normalizeRulesPayload(newRoomData.rules);
        if (Object.prototype.hasOwnProperty.call(newRoomData, 'preferredOccupant')) {
            newRoomData.preferredOccupant = normalizePreferredOccupant(newRoomData.preferredOccupant);
        }
        if (newRoomData.familyStatus || newRoomData.gender || newRoomData.tenantPreferences) {
            const familyStatus = newRoomData.familyStatus || newRoomData.tenantPreferences?.familyStatus || room.tenantPreferences?.familyStatus || 'Any';
            const normalizedFamilyStatus = familyStatus === 'Bachelors Only' ? 'Bachelors' : familyStatus === 'Family Only' ? 'Family' : familyStatus;
            const allowedGender = newRoomData.gender || newRoomData.tenantPreferences?.allowedGender || room.tenantPreferences?.allowedGender || 'Any';
            newRoomData.tenantPreferences = {
                familyStatus: normalizedFamilyStatus,
                allowedGender,
            };
            newRoomData.familyStatus = normalizedFamilyStatus;
            newRoomData.gender = allowedGender;
        }
        if (newRoomData.location) {
            newRoomData.location = {
                ...newRoomData.location,
                postalCode: newRoomData.location.postalCode || newRoomData.location.pincode,
                pincode: newRoomData.location.pincode || newRoomData.location.postalCode,
            };
        }
        const majorFields = [
            'title',
            'description',
            'images',
            'imageUrl',
            'location',
            'roomType',
            'rent',
            'securityDeposit',
            'maintenanceCharge',
            'maxOccupants',
            'bathrooms',
            'washroomType',
            'furnishingStatus',
            'gender',
            'familyStatus',
            'tenantPreferences',
            'preferredOccupant',
            'facilities',
            'rules',
            'availableFrom',
            'documents',
            'videoUrl',
        ];
        let isMajorChange = false;

        for (const field of majorFields) {
            if (Object.prototype.hasOwnProperty.call(newRoomData, field) && JSON.stringify(newRoomData[field]) !== JSON.stringify(room[field])) {
                isMajorChange = true;
                break;
            }
        }
        if (!isMajorChange && Object.prototype.hasOwnProperty.call(newRoomData, 'rent') && room.rent) {
            const rentChangePercentage = Math.abs(Number(newRoomData.rent) - Number(room.rent)) / Number(room.rent);
            if (rentChangePercentage > 0.20) {
                isMajorChange = true;
            }
        }
        if (isMajorChange) {
            newRoomData.status = 'Pending';
            newRoomData.rejectionReason = '';
            newRoomData.rejection_reason = '';
            newRoomData.submittedForReviewAt = new Date();
            newRoomData.reviewReason = room.status === 'Published'
                ? 'Landlord edited live listing details.'
                : 'Landlord submitted updated listing details.';
        }

        const updatedRoom = await Room.findByIdAndUpdate(
            req.params.id,
            newRoomData,
            { new: true, runValidators: true }
        );
        res.json(updatedRoom);

    } catch (error) {
        res.status(400).json({ message: 'Error updating room', error: error.message });
    }
});


// Update Room Status
exports.updateRoomStatus = asyncHandler(async (req, res) => {
    try {
        const { status } = req.body;
        if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
            return res.status(400).json({ message: 'Invalid room id.' });
        }
        const room = await Room.findOne({ _id: req.params.id, isDeleted: { $ne: true } });
        if (!room) { return res.status(404).json({ message: 'Room not found' }); }
        if (!room.landlord) {
            return res.status(400).json({ message: 'This listing has no host attached. Please contact support.' });
        }
        if (room.landlord.toString() !== req.user._id.toString()) {
            return res.status(401).json({ message: 'User not authorized' });
        }
        if (!['Published', 'Unpublished'].includes(status)) {
            return res.status(400).json({ message: 'Invalid status value.' });
        }
        if (room.status === status) {
            return res.status(200).json(room.toObject());
        }
        if (['Booked', 'Confirmed'].includes(room.status)) {
            return res.status(409).json({ message: 'Booked listings cannot be unpublished. Close or cancel the active booking first.' });
        }
        if (['Pending', 'Pending_Review'].includes(room.status)) {
            return res.status(409).json({ message: 'This listing is already waiting for admin review.' });
        }
        const nextStatus = status === 'Published' && ['Unpublished', 'Rejected', 'Suspended'].includes(room.status)
            ? 'Pending'
            : status;

        room.status = nextStatus;
        if (nextStatus === 'Pending') {
            room.rejectionReason = '';
            room.rejection_reason = '';
            room.submittedForReviewAt = new Date();
            room.reviewReason = 'Landlord requested publishing review.';
        }

        const updatedRoom = await room.save({ validateBeforeSave: false });
        const roomObject = updatedRoom.toObject();
        roomObject.landlord = req.user;

        res.status(200).json(roomObject);
    } catch (error) {
        console.error('Room status update failed:', error);
        res.status(400).json({ message: 'Could not update room status.', error: error.message });
    }
});

//  Booking Functions 
exports.createBooking = asyncHandler(async (req, res) => {
    const { id: roomId } = req.params;
    const { message, occupants } = req.body;
    const studentId = req.user._id;

    // Find the room to ensure it exists and to get the landlord's ID.
    const room = await Room.findOne({ _id: roomId, isDeleted: { $ne: true } });
    if (!room) {
        res.status(404);
        throw new Error('Room not found');
    }

    const landlordId = room.landlord;

    // Prevent a landlord from applying to their own room.
    if (landlordId.toString() === studentId.toString()) {
        res.status(400);
        throw new Error('You cannot apply to your own room.');
    }
    
    // Check if the user has already applied for this specific room.
    const existingApplication = await Application.findOne({
        room: roomId,
        student: studentId,
    });

    if (existingApplication) {
        res.status(400);
        throw new Error('You have already applied for this room.');
    }

    // If all checks pass, create the new application.
    const application = new Application({
        student: studentId,
        landlord: landlordId,
        room: roomId,
        message,
        occupants, // This should be an object e.g., { males: 1, females: 0 }
        status: 'pending',
    });

    const createdApplication = await application.save();

    //Create a notification for the landlord about the new application.
    await Notification.create({
        user: landlordId,
        title: 'New Room Application!',
        message: `${req.user.name} has applied for your room: "${room.title}".`,
        link: `/landlord/inbox` // Or a dedicated applications page
    });

    // Send a success response back to the student.
    res.status(201).json(createdApplication);
});
