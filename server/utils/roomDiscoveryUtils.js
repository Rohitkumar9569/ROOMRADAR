const LOCATION_FIELDS = [
  'location.city',
  'location.locality',
  'location.fullAddress',
  'location.landmark',
  'location.state',
  'location.pincode',
  'location.postalCode',
  'city',
  'locality',
  'landmark',
  'title',
];

const ROOM_DISCOVERY_SELECT = 'title rent location roomType listingCategory pricingMode stayType pricePerNight maxGuests bedrooms instantBook gender familyStatus tenantPreferences beds maxOccupants bathrooms washroomType attachedWashroom furnishingStatus facilities securityDeposit maintenanceCharge electricityBilling availableFrom paymentPreference offlinePaymentAllowed rentNegotiable minimumStay imageUrl images averageRating numReviews views status createdAt _id landlord';

const LOCATION_STOP_WORDS = new Set([
  'room', 'rooms', 'pg', 'flat', 'flats', 'bhk', 'rk', 'hostel', 'studio',
  'me', 'mein', 'in', 'near', 'around', 'at', 'city', 'area', 'location',
  'chahiye', 'chaheye', 'dikhao', 'show', 'find', 'give', 'list',
  'boys', 'boy', 'male', 'men', 'girls', 'girl', 'female', 'women',
  'for', 'ke', 'ka', 'ki', 'liye', 'under', 'below', 'budget', 'sasta',
]);

const LOCATION_ALIAS_GROUPS = [
  {
    name: 'Mughalsarai / Pandit Deen Dayal Upadhyay Nagar',
    aliases: [
      'mughalsarai',
      'mughal sarai',
      'mugal sarai',
      'mugalsarai',
      'mughalsarai chandauli',
      'mughal sarai chandauli',
      'pandit deen dayal upadhyay nagar',
      'pandit deendayal upadhyay nagar',
      'pandit deen dayal upadhyay junction',
      'pandit deendayal upadhyay junction',
      'pt deen dayal upadhyay nagar',
      'pt deendayal upadhyay nagar',
      'pt deen dayal upadhyay junction',
      'pt deendayal upadhyay junction',
      'pdt deen dayal upadhyay nagar',
      'deen dayal upadhyay nagar',
      'deendayal upadhyay nagar',
      'deen dayal upadhyay junction',
      'deendayal upadhyay junction',
      'pandit deen dayal nagar',
      'pandit deendayal nagar',
      'pt deen dayal nagar',
      'pt deendayal nagar',
      'deen dayal nagar',
      'deendayal nagar',
      'pandit deen dayal',
      'pandit deendayal',
      'pt deen dayal',
      'pt deendayal',
      'deen dayal',
      'deendayal',
      'ddu nagar',
      'ddu junction',
      'dd upadhyay nagar',
      'dd upadhyay junction',
      'mughalsarai junction',
      'mughal sarai junction',
      'pddun',
      'pd dun',
    ],
    searchTerms: [
      'mughalsarai',
      'mughal sarai',
      'mughalsarai chandauli',
      'mughal sarai chandauli',
    ],
  },
];

const escapeRegex = (value = '') => String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const activePublishedQuery = () => ({
  status: { $in: ['Published', 'Available', 'Booked', 'Confirmed', 'published', 'available', 'booked', 'confirmed'] },
  isDeleted: { $ne: true },
});

const toSearchText = (value = '') => String(value || '')
  .toLowerCase()
  .replace(/[^a-z0-9\s-]/g, ' ')
  .replace(/\s+/g, ' ')
  .trim();

const toNumber = (value) => {
  if (value === undefined || value === null || value === '') return undefined;
  const raw = value && typeof value === 'object' ? value.value : value;
  const numeric = Number(String(raw).replace(/[^\d.-]/g, ''));
  return Number.isFinite(numeric) ? numeric : undefined;
};

const unique = (items) => [...new Set(items.filter(Boolean))];

const compactAliasText = (value = '') => toSearchText(value).replace(/\s+/g, '');

const getLocationAliasGroup = (value = '') => {
  const normalized = toSearchText(value);
  const compact = compactAliasText(value);
  if (!normalized || compact.length < 3) return null;

  return LOCATION_ALIAS_GROUPS.find((group) => group.aliases.some((alias) => {
    const normalizedAlias = toSearchText(alias);
    const compactAlias = compactAliasText(alias);

    if (normalized === normalizedAlias || compact === compactAlias) return true;
    if (normalized.length >= 6 && normalizedAlias.includes(normalized)) return true;
    if (normalizedAlias.length >= 6 && normalized.includes(normalizedAlias)) return true;
    if (compact.length >= 6 && compactAlias.includes(compact)) return true;
    return compactAlias.length >= 6 && compact.includes(compactAlias);
  })) || null;
};

const expandLocationAliases = (value = '') => {
  const aliasGroup = getLocationAliasGroup(value);
  if (!aliasGroup) return unique([String(value || '').trim()]);
  return unique([String(value || '').trim(), ...aliasGroup.searchTerms, ...aliasGroup.aliases]);
};

const getLocationTokens = (value = '') => unique(
  toSearchText(value)
    .split(/\s+/)
    .map((token) => token.trim())
    .filter((token) => token.length >= 2 && !LOCATION_STOP_WORDS.has(token))
).slice(0, 6);

const compactToken = (value = '') => toSearchText(value).replace(/[aeiou]/g, '');

const tokenMatchesLocation = (locationText, locationTokens, token) => {
  if (!token) return false;
  if (locationText.includes(token)) return true;

  const compactSearchToken = compactToken(token);
  if (compactSearchToken.length < 4) return false;

  return locationTokens.some((locationToken) => {
    const compactLocationToken = compactToken(locationToken);
    return compactLocationToken.length >= 4
      && (compactLocationToken === compactSearchToken
        || compactLocationToken.includes(compactSearchToken)
        || compactSearchToken.includes(compactLocationToken));
  });
};

const fieldRegexClauses = (regex) => LOCATION_FIELDS.map((field) => ({ [field]: regex }));

const buildSingleLocationQuery = (value = '', { matchAll = true } = {}) => {
  const phrase = toSearchText(value);
  const tokens = getLocationTokens(value);
  if (!phrase && tokens.length === 0) return null;

  if (matchAll && tokens.length > 1) {
    return {
      $and: tokens.map((token) => ({
        $or: fieldRegexClauses(new RegExp(escapeRegex(token), 'i')),
      })),
    };
  }

  const terms = tokens.length ? tokens : [phrase];
  return {
    $or: terms.flatMap((term) => fieldRegexClauses(new RegExp(escapeRegex(term), 'i'))),
  };
};

const buildLocationQuery = (value = '', { matchAll = true } = {}) => {
  const terms = expandLocationAliases(value);
  const clauses = terms
    .map((term) => buildSingleLocationQuery(term, { matchAll }))
    .filter(Boolean);

  if (clauses.length === 0) return null;
  if (clauses.length === 1) return clauses[0];
  return { $or: clauses };
};

const appendAndClause = (query, clause) => {
  if (!clause) return query;
  query.$and = [...(query.$and || []), clause];
  return query;
};

const createSortOption = (sort) => {
  if (sort === 'price_asc') return { rent: 1, createdAt: -1 };
  if (sort === 'price_desc') return { rent: -1, createdAt: -1 };
  if (sort === 'rating') return { averageRating: -1, numReviews: -1, views: -1 };
  if (sort === 'popular' || sort === 'views') return { views: -1, createdAt: -1 };
  return { createdAt: -1 };
};

const normalizeGender = (value = '') => {
  const normalized = toSearchText(value);
  if (/(^|\s)(girl|girls|female|females|women|ladki|ladkiyo|ladkiyon|mahila)(\s|$)/.test(normalized)) return 'Female';
  if (/(^|\s)(boy|boys|male|males|men|ladka|ladke|ladko)(\s|$)/.test(normalized)) return 'Male';
  if (normalized === 'any') return 'Any';
  return value || undefined;
};

const getOppositeGender = (gender) => {
  if (gender === 'Male') return 'Female';
  if (gender === 'Female') return 'Male';
  return '';
};

const getOppositeGenderTitleRegex = (gender) => {
  if (gender === 'Male') return /\b(female|females|women|girls?)\b/i;
  if (gender === 'Female') return /\b(male|males|men|boys?)\b/i;
  return null;
};

const createGenderPreferenceClause = (value = '') => {
  const gender = normalizeGender(value);
  if (!gender || gender === 'Any') return null;

  const opposite = getOppositeGender(gender);
  const oppositeTitleRegex = getOppositeGenderTitleRegex(gender);
  const openValues = [gender, 'Any', '', null];

  return {
    $and: [
      {
        $or: [
          { gender: { $in: openValues } },
          { preferredGender: { $in: openValues } },
          { 'tenantPreferences.allowedGender': { $in: openValues } },
          { 'tenantPreferences.gender': { $in: openValues } },
        ],
      },
      { gender: { $ne: opposite } },
      { preferredGender: { $ne: opposite } },
      { 'tenantPreferences.allowedGender': { $ne: opposite } },
      { 'tenantPreferences.gender': { $ne: opposite } },
      ...(oppositeTitleRegex ? [{ title: { $not: oppositeTitleRegex } }] : []),
    ],
  };
};

const normalizeFamilyStatus = (value = '') => {
  const normalized = toSearchText(value);
  if (!normalized) return undefined;
  if (normalized.includes('bachelor')) return 'Bachelors';
  if (normalized.includes('family')) return 'Family';
  if (normalized === 'any') return 'Any';
  return value;
};

const normalizeListingCategory = (value = '') => {
  const normalized = String(value || '').trim();
  const lower = normalized.toLowerCase();
  if (!lower || lower === 'all' || lower === 'any') return '';
  if (lower.includes('pg') || lower.includes('paying guest')) return 'PG';
  if (lower.includes('hostel')) return 'Hostel';
  if (lower.includes('co') && lower.includes('living')) return 'Co-living';
  if (lower.includes('studio')) return 'Studio';
  if (lower.includes('apartment')) return 'Apartment';
  if (lower.includes('flat') || lower.includes('bhk') || lower.includes('rk')) return 'Flat';
  if (lower.includes('room')) return 'Room';
  return ['PG', 'Hostel', 'Flat', 'Apartment', 'Studio', 'Co-living', 'Room', 'Other'].includes(normalized)
    ? normalized
    : '';
};

const normalizePricingMode = (value = '') => {
  const normalized = String(value || '').trim().toLowerCase();
  if (!normalized || normalized === 'all' || normalized === 'any') return '';
  if (['daily', 'day'].includes(normalized)) return 'daily';
  if (['nightly', 'night'].includes(normalized)) return 'nightly';
  return 'monthly';
};

const normalizeStayType = (value = '') => {
  const normalized = String(value || '').trim().toLowerCase().replace(/[\s-]+/g, '_');
  if (!normalized || normalized === 'all' || normalized === 'any') return '';
  if (['short_term', 'short'].includes(normalized)) return 'short_term';
  if (['flexible', 'flex'].includes(normalized)) return 'flexible';
  return 'long_term';
};

const normalizeRoomType = (value = '') => toSearchText(value).replace(/\s+/g, '');

const roomTypeMatches = (roomType, wanted) => {
  const room = normalizeRoomType(roomType);
  const target = normalizeRoomType(wanted);
  if (!target) return true;
  if (!room) return false;
  if (room.includes(target) || target.includes(room)) return true;
  if (target === 'pg') return room.includes('pg') || room.includes('hostel');
  if (target === 'flat') return room.includes('flat') || room.includes('bhk') || room.includes('rk');
  if (target.includes('single')) return room.includes('single') || room.includes('independent') || room.includes('private');
  if (target.includes('shared')) return room.includes('shared') || room.includes('sharing');
  return false;
};

const listingCategoryMatches = (room = {}, wanted) => {
  const target = normalizeListingCategory(wanted);
  if (!target) return true;
  const explicit = normalizeListingCategory(room.listingCategory);
  if (explicit === target) return true;
  const combined = `${room.roomType || ''} ${room.title || ''}`;
  const derived = normalizeListingCategory(combined);
  if (derived === target) return true;
  if (target === 'Apartment') return derived === 'Flat';
  return false;
};

const pricingModeMatches = (room = {}, wanted) => {
  const target = normalizePricingMode(wanted);
  if (!target) return true;
  const roomMode = normalizePricingMode(room.pricingMode || 'monthly');
  return roomMode === target;
};

const stayTypeMatches = (room = {}, wanted) => {
  const target = normalizeStayType(wanted);
  if (!target) return true;
  const roomStayType = normalizeStayType(room.stayType || 'long_term');
  return roomStayType === target;
};

const normalizeAmenityKey = (value = '') => {
  const key = toSearchText(value).replace(/\s+/g, '');
  const aliases = {
    wifi: 'wifi',
    'wi-fi': 'wifi',
    ac: 'ac',
    airconditioner: 'ac',
    airconditioning: 'ac',
    parking: 'parking',
    laundry: 'laundry',
    meals: 'meals',
    food: 'meals',
    security: 'security',
    cctv: 'cctv',
    gym: 'gym',
    geyser: 'geyser',
    hotwater: 'hotWater',
    water: 'waterSupply',
    watersupply: 'waterSupply',
    powerbackup: 'powerBackup',
    attachedwashroom: 'attachedWashroom',
    balcony: 'balcony',
    lift: 'lift',
    studytable: 'studyTable',
    kitchen: 'kitchenAccess',
    kitchenaccess: 'kitchenAccess',
    waterpurifier: 'waterPurifier',
    housekeeping: 'housekeeping',
  };
  return aliases[key] || value;
};

const normalizeAmenities = (value) => {
  if (Array.isArray(value)) return unique(value.map(normalizeAmenityKey));
  if (typeof value === 'string') return unique(value.split(',').map(normalizeAmenityKey));
  return [];
};

const normalizeDiscoveryFilters = (input = {}) => {
  const maxRent = toNumber(input.maxRent ?? input.max_price ?? input.budget);
  const minRent = toNumber(input.minRent ?? input.min_price);
  const maxDeposit = toNumber(input.maxDeposit ?? input.max_deposit ?? input.deposit);
  const occupants = toNumber(input.maxGuests ?? input.maxOccupants ?? input.occupants ?? input.people);
  const latitude = toNumber(input.latitude ?? input.lat);
  const longitude = toNumber(input.longitude ?? input.lon ?? input.lng);
  const radius = toNumber(input.radius);
  const limit = toNumber(input.limit);
  const type = input.roomType || input.room_type || (input.type && !['All', 'Rooms'].includes(input.type) ? input.type : '');
  const occupancyType = String(input.occupancyType || input.occupancy || '').trim().toLowerCase().replace(/[\s_-]+/g, '-');

  return {
    city: String(input.city || input.keyword || input.search || input.location || '').trim(),
    roomType: type ? String(type).trim() : '',
    listingCategory: normalizeListingCategory(input.listingCategory || input.category || ''),
    pricingMode: normalizePricingMode(input.pricingMode || input.priceMode || ''),
    stayType: normalizeStayType(input.stayType || input.stay || ''),
    maxRent,
    minRent,
    maxDeposit,
    occupants,
    occupancyType,
    gender: normalizeGender(input.gender || input.allowedGender || ''),
    familyStatus: normalizeFamilyStatus(input.familyStatus || input.family_status || ''),
    amenities: normalizeAmenities(input.amenities),
    sort: input.sort || input.sort_by || '',
    limit: Number.isFinite(limit) && limit > 0 ? Math.min(Math.max(Math.round(limit), 1), 48) : undefined,
    latitude,
    longitude,
    radius: Number.isFinite(radius) && radius > 0 ? radius : undefined,
  };
};

const getRoomLocationText = (room = {}) => toSearchText([
  room.location?.city,
  room.location?.locality,
  room.location?.fullAddress,
  room.location?.landmark,
  room.location?.state,
  room.location?.pincode,
  room.location?.postalCode,
  room.city,
  room.locality,
  room.landmark,
  room.title,
].filter(Boolean).join(' '));

const getRoomCoordinates = (room = {}) => {
  const coordinates = room.location?.coordinates;
  if (!Array.isArray(coordinates) || coordinates.length !== 2) return null;
  const [longitude, latitude] = coordinates.map(Number);
  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) return null;
  return { latitude, longitude };
};

const distanceKm = (from, to) => {
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

const genderMatches = (room, wanted) => {
  if (!wanted || wanted === 'Any') return true;
  const opposite = getOppositeGender(wanted);
  const oppositeTitleRegex = getOppositeGenderTitleRegex(wanted);
  if (oppositeTitleRegex?.test(String(room.title || ''))) return false;

  const values = [
    room.gender,
    room.preferredGender,
    room.tenantPreferences?.allowedGender,
    room.tenantPreferences?.gender,
  ].map((value) => normalizeGender(value || 'Any'));

  if (opposite && values.includes(opposite)) return false;
  return values.some((value) => value === wanted || value === 'Any');
};

const familyMatches = (room, wanted) => {
  const normalizedWanted = normalizeFamilyStatus(wanted);
  if (!normalizedWanted || normalizedWanted === 'Any') return true;
  const values = [
    room.familyStatus,
    room.tenantPreferences?.familyStatus,
  ].map(normalizeFamilyStatus);
  return values.some((value) => value === normalizedWanted || value === 'Any');
};

const getCapacity = (room) => Math.max(Number(room.maxGuests || 0), Number(room.maxOccupants || 0), Number(room.beds || 0));

const occupancyTypeMatches = (room = {}, requested = '') => {
  const type = String(requested || '').trim().toLowerCase();
  if (!type) return true;
  const text = toSearchText([
    room.roomType,
    room.listingCategory,
    room.title,
    room.familyStatus,
    room.tenantPreferences?.familyStatus,
  ].filter(Boolean).join(' '));
  const capacity = getCapacity(room);

  if (type === 'single' || type === 'private') {
    return capacity <= 1 || /\b(single|private|independent|studio|1\s*rk)\b/.test(text);
  }
  if (type === 'sharing' || type === 'shared') {
    return capacity >= 2 || /\b(shared|hostel|pg|co\s*living|co-living)\b/.test(text);
  }
  if (type === 'family' || type === 'couple') {
    return familyMatches(room, 'Family') || /\b(bhk|flat|apartment|house|family|studio)\b/.test(text);
  }
  if (type === 'group' || type === 'full-flat' || type === 'flat') {
    return capacity >= 3 || /\b(bhk|flat|apartment|house|shared)\b/.test(text);
  }
  return true;
};

const getSingleLocationScore = (room, city) => {
  const locationText = getRoomLocationText(room);
  const phrase = toSearchText(city);
  const tokens = getLocationTokens(city);
  const locationTokens = getLocationTokens(locationText);
  if (!locationText || (!phrase && tokens.length === 0)) return { score: 0, matched: false };

  let score = 0;
  let hits = 0;
  if (phrase.length >= 3 && locationText.includes(phrase)) score += 80;
  tokens.forEach((token) => {
    if (tokenMatchesLocation(locationText, locationTokens, token)) {
      hits += 1;
      score += 35;
    }
  });
  if (tokens.length > 1 && hits === tokens.length) score += 35;
  return { score: Math.min(score, 145), matched: hits > 0 && (tokens.length <= 1 || hits === tokens.length) };
};

const getLocationScore = (room, city) => {
  if (!city) return { score: 0, matched: false };

  return expandLocationAliases(city).reduce((best, term) => {
    const current = getSingleLocationScore(room, term);
    if (current.matched && !best.matched) return current;
    return current.score > best.score ? current : best;
  }, { score: 0, matched: false });
};

const getPrimaryLocationRank = (room, filters = {}) => {
  const hasCity = Boolean(filters.city);
  const hasGeo = filters.latitude !== undefined && filters.longitude !== undefined;
  if (!hasCity && !hasGeo) return { bucket: 0, score: 0 };

  let best = { bucket: 4, score: 0 };

  if (hasCity) {
    const location = getLocationScore(room, filters.city);
    if (location.matched) {
      best = { bucket: 0, score: location.score };
    } else if (location.score > 0) {
      best = { bucket: 1, score: location.score };
    }
  }

  if (hasGeo) {
    const roomCoordinates = getRoomCoordinates(room);
    const distance = distanceKm({ latitude: filters.latitude, longitude: filters.longitude }, roomCoordinates);
    if (distance !== null) {
      const radius = filters.radius || 5;
      const geoScore = Math.max(0, 120 - Math.round(distance * 3));
      const geoBucket = distance <= radius
        ? (hasCity ? 1 : 0)
        : distance <= Math.max(radius * 3, 15)
          ? (hasCity ? 2 : 1)
          : 3;

      if (geoBucket < best.bucket || (geoBucket === best.bucket && geoScore > best.score)) {
        best = { bucket: geoBucket, score: geoScore, distanceKm: Math.round(distance * 10) / 10 };
      }
    }
  }

  return best;
};

const scoreRoomAgainstFilters = (room, rawFilters = {}) => {
  const filters = normalizeDiscoveryFilters(rawFilters);
  const relaxed = [];
  const matchedLabels = [];
  let requestedCount = 0;
  let matchedCount = 0;
  let score = 0;
  let distance = null;

  const addDimension = (key, label, matched, weight, partial = 0) => {
    requestedCount += 1;
    if (matched) {
      matchedCount += 1;
      matchedLabels.push(label);
      score += weight;
      return;
    }
    relaxed.push(key);
    score += Math.max(0, partial);
  };

  if (filters.latitude !== undefined && filters.longitude !== undefined) {
    const roomCoordinates = getRoomCoordinates(room);
    distance = distanceKm({ latitude: filters.latitude, longitude: filters.longitude }, roomCoordinates);
    const radius = filters.radius || 5;
    const matched = distance !== null && distance <= radius;
    const partial = distance === null ? 0 : Math.max(0, 85 - Math.round((distance / Math.max(radius, 1)) * 18));
    addDimension('location', 'nearby location', matched, 130, partial);
  } else if (filters.city) {
    const location = getLocationScore(room, filters.city);
    addDimension('location', 'location', location.matched, 130, location.score);
  }

  if (filters.roomType) {
    addDimension('roomType', 'room type', roomTypeMatches(room.roomType, filters.roomType), 70, 0);
  }

  if (filters.listingCategory) {
    addDimension('listingCategory', 'listing category', listingCategoryMatches(room, filters.listingCategory), 55, 0);
  }

  if (filters.pricingMode) {
    addDimension('pricingMode', 'pricing mode', pricingModeMatches(room, filters.pricingMode), 35, 0);
  }

  if (filters.stayType) {
    addDimension('stayType', 'stay type', stayTypeMatches(room, filters.stayType), 35, 0);
  }

  if (filters.gender && filters.gender !== 'Any') {
    addDimension('gender', `${filters.gender.toLowerCase()} preference`, genderMatches(room, filters.gender), 65, 0);
  }

  if (filters.familyStatus && filters.familyStatus !== 'Any') {
    addDimension('familyStatus', 'stay type', familyMatches(room, filters.familyStatus), 45, 0);
  }

  if (Number.isFinite(filters.occupants) && filters.occupants > 0) {
    const capacity = getCapacity(room);
    const matched = capacity >= filters.occupants;
    const partial = capacity > 0 ? Math.min(30, Math.round((capacity / filters.occupants) * 22)) : 0;
    addDimension('occupants', 'capacity', matched, 55, partial);
  }

  if (filters.occupancyType) {
    addDimension('occupancyType', 'occupancy type', occupancyTypeMatches(room, filters.occupancyType), 55, 0);
  }

  const rent = Number(room.rent || 0);
  if (Number.isFinite(filters.maxRent) && filters.maxRent > 0) {
    const matched = rent > 0 && rent <= filters.maxRent;
    const overRatio = rent > filters.maxRent ? (rent - filters.maxRent) / Math.max(filters.maxRent, 1) : 0;
    addDimension('maxRent', 'budget', matched, 65, Math.max(0, 36 - Math.round(overRatio * 28)));
  }

  if (Number.isFinite(filters.minRent) && filters.minRent > 0) {
    const matched = rent >= filters.minRent;
    addDimension('minRent', 'minimum price', matched, 35, matched ? 35 : 0);
  }

  if (Number.isFinite(filters.maxDeposit) && filters.maxDeposit >= 0) {
    const deposit = Number(room.securityDeposit || 0);
    const matched = deposit <= filters.maxDeposit;
    const overRatio = deposit > filters.maxDeposit ? (deposit - filters.maxDeposit) / Math.max(filters.maxDeposit || 1, 1) : 0;
    addDimension('maxDeposit', 'deposit', matched, 55, Math.max(0, 28 - Math.round(overRatio * 20)));
  }

  if (filters.amenities.length) {
    const matchedAmenities = filters.amenities.filter((amenity) => room.facilities?.[amenity]);
    const matched = matchedAmenities.length === filters.amenities.length;
    addDimension('amenities', 'amenities', matched, 12 * filters.amenities.length, 10 * matchedAmenities.length);
  }

  score += Math.min(Number(room.averageRating || 0), 5) * 3;
  score += Math.min(Number(room.numReviews || 0), 25) / 3;
  score += Math.min(Number(room.views || 0), 100) / 20;
  if (room.verifications?.property) score += 24;
  if (room.verifications?.photos) score += 8;
  if (String(room.status || '').toLowerCase() === 'available' || String(room.status || '').toLowerCase() === 'published') score += 12;

  return {
    score,
    requestedCount,
    matchedCount,
    relaxed,
    matchedLabels,
    distanceKm: distance === null ? undefined : Math.round(distance * 10) / 10,
  };
};

const compareByRequestedSort = (sort, leftRoom, rightRoom) => {
  if (sort === 'price_asc') return Number(leftRoom.rent || 0) - Number(rightRoom.rent || 0);
  if (sort === 'price_desc') return Number(rightRoom.rent || 0) - Number(leftRoom.rent || 0);
  if (sort === 'rating') {
    return Number(rightRoom.averageRating || 0) - Number(leftRoom.averageRating || 0)
      || Number(rightRoom.numReviews || 0) - Number(leftRoom.numReviews || 0);
  }
  if (sort === 'popular' || sort === 'views') return Number(rightRoom.views || 0) - Number(leftRoom.views || 0);
  return new Date(rightRoom.createdAt || 0).getTime() - new Date(leftRoom.createdAt || 0).getTime();
};

const rankRoomsByDiscovery = (rooms = [], rawFilters = {}, { limit } = {}) => {
  const filters = normalizeDiscoveryFilters(rawFilters);
  const outputLimit = limit || filters.limit || 12;
  const hasLocationIntent = Boolean(filters.city || (filters.latitude !== undefined && filters.longitude !== undefined));

  return (Array.isArray(rooms) ? rooms : [])
    .map((room, index) => ({
      room,
      index,
      match: scoreRoomAgainstFilters(room, filters),
      primaryLocation: getPrimaryLocationRank(room, filters),
    }))
    .filter(({ room }) => !filters.gender || filters.gender === 'Any' || genderMatches(room, filters.gender))
    .filter(({ match }) => match.score > 0 || match.requestedCount === 0)
    .sort((left, right) => (
      (hasLocationIntent ? left.primaryLocation.bucket - right.primaryLocation.bucket : 0)
      || right.match.matchedCount - left.match.matchedCount
      || right.primaryLocation.score - left.primaryLocation.score
      || right.match.score - left.match.score
      || compareByRequestedSort(filters.sort, left.room, right.room)
      || right.index - left.index
    ))
    .slice(0, outputLimit)
    .map(({ room, match }) => ({ ...room, _match: match }));
};

const findDiscoveryFallbackRooms = async (Room, rawFilters = {}, options = {}) => {
  const filters = normalizeDiscoveryFilters(rawFilters);
  const resultLimit = options.resultLimit || filters.limit || 12;
  const candidateLimit = options.candidateLimit || 180;
  const excludeIds = new Set((options.excludeIds || []).map(String));
  const baseQuery = options.baseQuery || activePublishedQuery();
  const sort = createSortOption(filters.sort);
  const candidates = [];
  const seen = new Set();

  const appendCandidates = (rooms) => {
    rooms.forEach((room) => {
      const id = String(room._id);
      if (seen.has(id) || excludeIds.has(id)) return;
      seen.add(id);
      candidates.push(room);
    });
  };

  if (filters.city) {
    const looseLocationQuery = buildLocationQuery(filters.city, { matchAll: false });
    if (looseLocationQuery) {
      const locationRooms = await Room.find({ ...baseQuery, ...looseLocationQuery })
        .select(ROOM_DISCOVERY_SELECT)
        .sort(sort)
        .limit(candidateLimit)
        .lean();
      appendCandidates(locationRooms);
    }
  }

  if (candidates.length < resultLimit * 2) {
    const broadRooms = await Room.find(baseQuery)
      .select(ROOM_DISCOVERY_SELECT)
      .sort(sort)
      .limit(candidateLimit)
      .lean();
    appendCandidates(broadRooms);
  }

  return rankRoomsByDiscovery(candidates, filters, { limit: resultLimit });
};

const getRequestedFilterLabels = (rawFilters = {}) => {
  const filters = normalizeDiscoveryFilters(rawFilters);
  return [
    filters.city || (filters.latitude !== undefined && filters.longitude !== undefined) ? 'location' : '',
    filters.roomType ? 'room type' : '',
    filters.listingCategory ? 'listing category' : '',
    filters.pricingMode ? 'pricing mode' : '',
    filters.stayType ? 'stay type' : '',
    filters.gender && filters.gender !== 'Any' ? `${filters.gender.toLowerCase()} preference` : '',
    filters.familyStatus && filters.familyStatus !== 'Any' ? 'stay type' : '',
    filters.occupancyType ? 'occupancy type' : '',
    filters.occupants ? 'capacity' : '',
    filters.maxRent || filters.minRent ? 'budget' : '',
    filters.maxDeposit !== undefined ? 'deposit' : '',
    filters.amenities.length ? 'amenities' : '',
  ].filter(Boolean);
};

module.exports = {
  ROOM_DISCOVERY_SELECT,
  activePublishedQuery,
  appendAndClause,
  buildLocationQuery,
  createSortOption,
  createGenderPreferenceClause,
  expandLocationAliases,
  findDiscoveryFallbackRooms,
  getRequestedFilterLabels,
  normalizeDiscoveryFilters,
  rankRoomsByDiscovery,
  scoreRoomAgainstFilters,
};
