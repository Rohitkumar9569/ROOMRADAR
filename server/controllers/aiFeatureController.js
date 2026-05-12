const asyncHandler = require('express-async-handler');
const Room = require('../models/Room');
const Review = require('../models/Review');
const {
    appendAndClause,
    buildLocationQuery,
    createSortOption,
    findDiscoveryFallbackRooms,
} = require('../utils/roomDiscoveryUtils');

let Anthropic = null;
try {
    Anthropic = require('@anthropic-ai/sdk');
} catch (error) {
    Anthropic = null;
}

const sentimentCache = new Map();
const CACHE_TTL = 24 * 60 * 60 * 1000;

const getClient = () => {
    if (!Anthropic || !process.env.ANTHROPIC_API_KEY) return null;
    return new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
};

const modelName = () => process.env.ANTHROPIC_MODEL || 'claude-sonnet-4-20250514';

const escapeRegex = (value = '') => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const parseJson = (text = '') => {
    try {
        return JSON.parse(text);
    } catch (error) {
        const match = text.match(/\{[\s\S]*\}/);
        return match ? JSON.parse(match[0]) : null;
    }
};

const normalizeGender = (query = '') => {
    const value = query.toLowerCase();
    if (/(boys?|male|ladk[ae])/.test(value)) return 'Male';
    if (/(girls?|female|ladki|ladkiyon)/.test(value)) return 'Female';
    return undefined;
};

const parseSmartQueryLocally = (query = '') => {
    const lower = query.toLowerCase();
    const maxPriceMatch = lower.match(/(?:under|below|upto|up to|andar|ke andar|se kam)\s*(?:rs\.?|₹)?\s*(\d{3,6})/) || lower.match(/(\d{4,6})/);
    const cityBeforeHindi = query.match(/([a-zA-Z][a-zA-Z.\s-]{1,48}?)\s+(?:mein|me)\b/i);
    const cityAfterKeyword = query.match(/(?:in|near|around|mein|me|andar)\s+([a-zA-Z][a-zA-Z.\s-]{1,48}?)(?:\s+(?:under|below|upto|for|ke|se|boys?|girls?|family|bachelor|room|flat|pg)|$)/i);
    const roomTypeMatch = query.match(/\b(1bhk|2bhk|3bhk|pg|flat|studio|single|shared)\b/i);
    const city = (cityBeforeHindi?.[1] || cityAfterKeyword?.[1] || '')
        .replace(/[^\w\s-]/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();

    let roomType;
    if (roomTypeMatch) {
        const raw = roomTypeMatch[1].toLowerCase();
        if (raw === 'single') roomType = 'Single Room';
        else if (raw === 'shared') roomType = 'Shared Room';
        else roomType = raw.toUpperCase();
    }

    return {
        city,
        maxRent: maxPriceMatch ? Number(maxPriceMatch[1]) : undefined,
        roomType,
        gender: normalizeGender(query),
        familyStatus: lower.includes('family') ? 'Family' : lower.includes('bachelor') ? 'Bachelors' : undefined,
        sort: /(sabse sasta|sasta|cheapest|lowest|low to high|price wise|price view|by price)/i.test(lower)
            ? 'price_asc'
            : /(best|top|rating|rated|recommended)/i.test(lower)
                ? 'rating'
                : /(expensive|costly|high to low|premium)/i.test(lower)
                    ? 'price_desc'
                    : undefined,
    };
};

const activePublishedQuery = () => ({ status: 'Published', isDeleted: { $ne: true } });

const buildRoomQuery = (filters = {}) => {
    const query = activePublishedQuery();

    if (filters.city) {
        const locationQuery = buildLocationQuery(filters.city, { matchAll: true });
        if (locationQuery) appendAndClause(query, locationQuery);
    }
    if (filters.maxRent) query.rent = { $lte: Number(filters.maxRent) };
    if (filters.minRent) query.rent = { ...(query.rent || {}), $gte: Number(filters.minRent) };
    if (filters.roomType) query.roomType = new RegExp(escapeRegex(filters.roomType), 'i');
    if (filters.gender && filters.gender !== 'Any') {
        query.$or = [
            { gender: filters.gender },
            { gender: 'Any' },
            { 'tenantPreferences.allowedGender': filters.gender },
            { 'tenantPreferences.allowedGender': 'Any' }
        ];
    }
    if (filters.familyStatus && filters.familyStatus !== 'Any') {
        const normalizedFamily = filters.familyStatus === 'Bachelors Only' ? 'Bachelors' : filters.familyStatus === 'Family Only' ? 'Family' : filters.familyStatus;
        query.$and = [
            ...(query.$and || []),
            {
                $or: [
                    { familyStatus: normalizedFamily },
                    { familyStatus: 'Any' },
                    { 'tenantPreferences.familyStatus': normalizedFamily },
                    { 'tenantPreferences.familyStatus': 'Any' }
                ]
            }
        ];
    }

    return query;
};

exports.smartSearch = asyncHandler(async (req, res) => {
    const { query } = req.body;
    if (!query) {
        return res.status(400).json({ message: 'Search query is required.' });
    }

    let filters = parseSmartQueryLocally(query);
    const client = getClient();

    if (client) {
        try {
            const response = await client.messages.create({
                model: modelName(),
                max_tokens: 500,
                system: 'Extract RoomRadar search filters from Indian room-search text. Return only JSON with keys: city, minRent, maxRent, roomType, gender, familyStatus, sort. Use null for unknown.',
                messages: [{ role: 'user', content: query }]
            });
            const text = response.content?.find((block) => block.type === 'text')?.text;
            const aiFilters = parseJson(text);
            if (aiFilters) {
                filters = {
                    ...filters,
                    city: aiFilters.city || filters.city,
                    minRent: aiFilters.minRent || filters.minRent,
                    maxRent: aiFilters.maxRent || filters.maxRent,
                    roomType: aiFilters.roomType || filters.roomType,
                    gender: aiFilters.gender || filters.gender,
                    familyStatus: aiFilters.familyStatus || filters.familyStatus,
                    sort: aiFilters.sort || aiFilters.sort_by || filters.sort
                };
            }
        } catch (error) {
            // Local parsing keeps smart search usable when the AI provider is unavailable.
        }
    }

    let rooms = await Room.find(buildRoomQuery(filters))
        .populate('landlord', 'name avatarUrl profilePicture trustScore verificationLevel')
        .sort(createSortOption(filters.sort))
        .limit(12)
        .lean();
    let fallback = null;
    const exactCount = rooms.length;

    if (filters.city && rooms.length < 12) {
        const relaxedRooms = await findDiscoveryFallbackRooms(Room, filters, {
            resultLimit: 12 - rooms.length,
            candidateLimit: 180,
            excludeIds: rooms.map((room) => room._id),
        });
        if (relaxedRooms.length) {
            const populatedRelaxedRooms = await Room.populate(relaxedRooms, { path: 'landlord', select: 'name avatarUrl profilePicture trustScore verificationLevel' });
            rooms = [...rooms, ...populatedRelaxedRooms].slice(0, 12);
            fallback = {
                type: exactCount > 0 ? 'location_expanded' : 'location_primary',
                message: exactCount > 0
                    ? 'Showing exact matches first, then more rooms from this location.'
                    : 'No exact match found. Showing rooms from this location first, then closest alternatives.',
            };
        }
    }

    if (rooms.length === 0) {
        rooms = await findDiscoveryFallbackRooms(Room, filters, {
            resultLimit: 12,
            candidateLimit: 180,
        });
        if (rooms.length) {
            rooms = await Room.populate(rooms, { path: 'landlord', select: 'name avatarUrl profilePicture trustScore verificationLevel' });
            fallback = {
                type: 'relaxed',
                message: 'No exact match found. Showing the closest available rooms based on your smart search.',
            };
        }
    }

    res.json({ filters, rooms, count: rooms.length, exactCount, fallback });
});

exports.suggestPrice = asyncHandler(async (req, res) => {
    const { city, roomType, location } = req.body;
    const baseQuery = activePublishedQuery();
    const cityName = city || location?.city;

    if (cityName) baseQuery['location.city'] = new RegExp(escapeRegex(cityName), 'i');
    if (roomType) baseQuery.roomType = new RegExp(escapeRegex(roomType), 'i');

    let rooms = await Room.find(baseQuery).select('rent location roomType').lean();
    if (rooms.length < 3 && cityName) {
        rooms = await Room.find({ ...activePublishedQuery(), 'location.city': new RegExp(escapeRegex(cityName), 'i') }).select('rent location roomType').lean();
    }
    if (rooms.length < 3) {
        rooms = await Room.find(activePublishedQuery()).select('rent location roomType').lean();
    }

    const rents = rooms.map((room) => Number(room.rent || 0)).filter((rent) => rent > 0).sort((a, b) => a - b);
    if (rents.length === 0) {
        return res.json({
            suggestedRent: null,
            sampleSize: 0,
            explanation: 'No comparable published listings are available yet.'
        });
    }

    const middle = Math.floor(rents.length / 2);
    const median = rents.length % 2 ? rents[middle] : Math.round((rents[middle - 1] + rents[middle]) / 2);

    res.json({
        suggestedRent: median,
        sampleSize: rents.length,
        minRent: rents[0],
        maxRent: rents[rents.length - 1],
        explanation: `Suggested from the median rent of ${rents.length} comparable published listing${rents.length > 1 ? 's' : ''}.`
    });
});

exports.getRoomSentiment = asyncHandler(async (req, res) => {
    const roomId = req.params.id;
    const cached = sentimentCache.get(roomId);
    if (cached && Date.now() - cached.createdAt < CACHE_TTL) {
        return res.json(cached.data);
    }

    const reviews = await Review.find({ room: roomId }).select('rating comment createdAt').lean();
    if (reviews.length === 0) {
        const empty = { reviewCount: 0, positivePercentage: null, tags: [], summary: 'No reviews yet.' };
        sentimentCache.set(roomId, { data: empty, createdAt: Date.now() });
        return res.json(empty);
    }

    const client = getClient();
    if (client) {
        const response = await client.messages.create({
            model: modelName(),
            max_tokens: 500,
            system: 'Analyze room reviews. Return only JSON: { "positivePercentage": number, "tags": string[], "summary": string }. Tags must be short.',
            messages: [{ role: 'user', content: JSON.stringify(reviews.map((review) => ({ rating: review.rating, comment: review.comment }))) }]
        });
        const text = response.content?.find((block) => block.type === 'text')?.text;
        const parsed = parseJson(text);
        if (parsed) {
            const data = {
                reviewCount: reviews.length,
                positivePercentage: parsed.positivePercentage,
                tags: parsed.tags || [],
                summary: parsed.summary || ''
            };
            sentimentCache.set(roomId, { data, createdAt: Date.now() });
            return res.json(data);
        }
    }

    const positiveReviews = reviews.filter((review) => Number(review.rating) >= 4).length;
    const comments = reviews.map((review) => review.comment.toLowerCase()).join(' ');
    const tags = [
        ['Clean', /clean|safai|neat/.test(comments)],
        ['Safe', /safe|security|secure|cctv/.test(comments)],
        ['Value', /value|budget|affordable|cheap|worth/.test(comments)],
        ['Location', /location|near|market|metro|college/.test(comments)]
    ].filter(([, matched]) => matched).map(([tag]) => tag);

    const data = {
        reviewCount: reviews.length,
        positivePercentage: Math.round((positiveReviews / reviews.length) * 100),
        tags,
        summary: 'Calculated from real review ratings and review text.'
    };
    sentimentCache.set(roomId, { data, createdAt: Date.now() });
    res.json(data);
});
