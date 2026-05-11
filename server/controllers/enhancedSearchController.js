const Room = require('../models/Room');
const User = require('../models/User');
const { toOptionalDate } = require('../utils/dateUtils');

const activePublishedQuery = () => ({ status: 'Published', isDeleted: { $ne: true } });

// Advanced search with multiple filters
exports.advancedSearch = async (req, res) => {
  try {
    const {
      // Location
      latitude,
      longitude,
      radius = 5,
      city,
      locality,
      
      // Price
      minPrice,
      maxPrice,
      
      // Room details
      roomType,
      bhk,
      preferredGender,
      furnished,
      
      // Amenities
      amenities,
      
      // Availability
      availableFrom,
      availableTo,
      
      // Property features
      securityDeposit,
      minDeposit,
      maxDeposit,
      
      // Verification
      verifiedOnly,
      
      // Sorting
      sortBy = 'relevance',
      sortOrder = 'desc',
      
      // Pagination
      page = 1,
      limit = 20
    } = req.body;
    
    const query = activePublishedQuery();
    
    // Location filter
    if (latitude && longitude) {
      query['location.coordinates'] = {
        $near: {
          $geometry: {
            type: 'Point',
            coordinates: [parseFloat(longitude), parseFloat(latitude)]
          },
          $maxDistance: radius * 1000 // Convert km to meters
        }
      };
    } else if (city) {
      query['location.city'] = new RegExp(city, 'i');
    } else if (locality) {
      query['location.locality'] = new RegExp(locality, 'i');
    }
    
    // Price filter
    if (minPrice || maxPrice) {
      query.rent = {};
      if (minPrice) query.rent.$gte = parseInt(minPrice);
      if (maxPrice) query.rent.$lte = parseInt(maxPrice);
    }
    
    // Room type
    if (roomType) {
      query.roomType = roomType;
    }
    
    // BHK
    if (bhk) {
      query.bhk = bhk;
    }
    
    // Gender preference
    if (preferredGender) {
      query.preferredGender = { $in: [preferredGender, 'Any'] };
    }
    
    // Furnished
    if (furnished !== undefined) {
      query.furnished = furnished === true || furnished === 'true';
    }
    
    // Amenities
    if (amenities && amenities.length > 0) {
      query.amenities = { $all: amenities };
    }
    
    // Availability
    const availableFromDate = toOptionalDate(availableFrom);
    if (availableFromDate) {
      query.availableFrom = { $lte: availableFromDate };
    }
    
    // Security deposit
    if (minDeposit || maxDeposit) {
      query.securityDeposit = {};
      if (minDeposit) query.securityDeposit.$gte = parseInt(minDeposit);
      if (maxDeposit) query.securityDeposit.$lte = parseInt(maxDeposit);
    }
    
    // Verified only
    if (verifiedOnly === true || verifiedOnly === 'true') {
      query['verifications.property'] = true;
    }
    
    // Sorting
    let sortOption = {};
    switch (sortBy) {
      case 'price_low':
        sortOption = { rent: 1 };
        break;
      case 'price_high':
        sortOption = { rent: -1 };
        break;
      case 'rating':
        sortOption = { averageRating: -1 };
        break;
      case 'newest':
        sortOption = { createdAt: -1 };
        break;
      case 'distance':
        if (latitude && longitude) {
          sortOption = { 'location.coordinates': 1 };
        }
        break;
      default:
        sortOption = { createdAt: -1 };
    }
    
    // Execute query
    const skip = (parseInt(page) - 1) * parseInt(limit);
    
    const [rooms, totalCount] = await Promise.all([
      Room.find(query)
        .populate('landlord', 'name trustScore verificationLevel verifications')
        .sort(sortOption)
        .skip(skip)
        .limit(parseInt(limit))
        .lean(),
      Room.countDocuments(query)
    ]);
    
    // Calculate distance for each room if coordinates provided
    let roomsWithDistance = rooms;
    if (latitude && longitude) {
      roomsWithDistance = rooms.map(room => {
        if (room.location?.coordinates) {
          const distance = calculateDistance(
            parseFloat(latitude),
            parseFloat(longitude),
            room.location.coordinates[1],
            room.location.coordinates[0]
          );
          return { ...room, distance: parseFloat(distance.toFixed(1)) };
        }
        return room;
      });
    }
    
    res.json({
      data: roomsWithDistance,
      count: roomsWithDistance.length,
      totalCount,
      page: parseInt(page),
      totalPages: Math.ceil(totalCount / parseInt(limit)),
      hasMore: skip + rooms.length < totalCount
    });
    
  } catch (error) {
    res.status(500).json({ message: 'Failed to search rooms', error: error.message });
  }
};

// Get trending searches
exports.getTrendingSearches = async (req, res) => {
  try {
    // Get popular locations
    const popularLocations = await Room.aggregate([
      { $match: activePublishedQuery() },
      {
        $group: {
          _id: '$location.city',
          count: { $sum: 1 },
          avgRent: { $avg: '$rent' }
        }
      },
      { $sort: { count: -1 } },
      { $limit: 10 }
    ]);
    
    // Get popular room types
    const popularRoomTypes = await Room.aggregate([
      { $match: activePublishedQuery() },
      {
        $group: {
          _id: '$roomType',
          count: { $sum: 1 }
        }
      },
      { $sort: { count: -1 } }
    ]);
    
    const trending = [
      ...popularLocations.map((item) => ({
        type: 'location',
        value: item._id,
        searches: item.count
      })),
      ...popularRoomTypes.map((item) => ({
        type: 'roomType',
        value: item._id,
        searches: item.count
      }))
    ]
      .filter((item) => item.value)
      .sort((a, b) => b.searches - a.searches)
      .slice(0, 10);

    res.json({
      locations: popularLocations,
      roomTypes: popularRoomTypes,
      trending
    });
    
  } catch (error) {
    res.status(500).json({ message: 'Failed to get trending searches' });
  }
};

// Get search suggestions
exports.getSearchSuggestions = async (req, res) => {
  try {
    const { query } = req.query;
    
    if (!query || query.length < 2) {
      return res.json({ suggestions: [] });
    }
    
    const searchRegex = new RegExp(query, 'i');
    
    // Search in multiple fields
    const suggestions = await Room.aggregate([
      {
        $match: {
          ...activePublishedQuery(),
          $or: [
            { 'location.city': searchRegex },
            { 'location.locality': searchRegex },
            { 'location.fullAddress': searchRegex },
            { title: searchRegex }
          ]
        }
      },
      {
        $group: {
          _id: {
            $cond: [
              { $regexMatch: { input: '$location.city', regex: searchRegex } },
              '$location.city',
              {
                $cond: [
                  { $regexMatch: { input: '$location.locality', regex: searchRegex } },
                  '$location.locality',
                  '$location.fullAddress'
                ]
              }
            ]
          },
          type: { $first: 'location' },
          count: { $sum: 1 }
        }
      },
      { $sort: { count: -1 } },
      { $limit: 8 }
    ]);
    
    const formattedSuggestions = suggestions.map(s => ({
      text: s._id,
      type: 'location',
      count: s.count
    }));
    
    res.json({ suggestions: formattedSuggestions });
    
  } catch (error) {
    res.status(500).json({ message: 'Failed to get search suggestions' });
  }
};

// Get similar rooms
exports.getSimilarRooms = async (req, res) => {
  try {
    const { roomId } = req.params;
    const limit = parseInt(req.query.limit) || 4;
    
    const room = await Room.findOne({ _id: roomId, isDeleted: { $ne: true } });
    
    if (!room) {
      return res.status(404).json({ message: 'Room not found' });
    }
    
    // Find similar rooms based on location and price
    const query = {
      _id: { $ne: roomId },
      ...activePublishedQuery(),
      $or: [
        { 'location.city': room.location?.city },
        { rent: { $gte: room.rent * 0.8, $lte: room.rent * 1.2 } }
      ]
    };
    
    if (room.roomType) {
      query.roomType = room.roomType;
    }
    
    const similarRooms = await Room.find(query)
      .populate('landlord', 'name trustScore')
      .limit(limit)
      .lean();
    
    res.json({
      data: similarRooms,
      count: similarRooms.length
    });
    
  } catch (error) {
    res.status(500).json({ message: 'Failed to get similar rooms' });
  }
};

// Get search filters metadata
exports.getSearchFilters = async (req, res) => {
  try {
    // Get price range
    const priceStats = await Room.aggregate([
      { $match: activePublishedQuery() },
      {
        $group: {
          _id: null,
          minPrice: { $min: '$rent' },
          maxPrice: { $max: '$rent' },
          avgPrice: { $avg: '$rent' }
        }
      }
    ]);
    
    // Get all amenities
    const amenities = await Room.distinct('amenities', activePublishedQuery());
    
    // Get room types
    const roomTypes = await Room.distinct('roomType', activePublishedQuery());
    
    // Get cities
    const cities = await Room.distinct('location.city', activePublishedQuery());
    
    res.json({
      priceRange: priceStats[0] || { minPrice: 0, maxPrice: 100000, avgPrice: 15000 },
      amenities,
      roomTypes,
      cities,
      furnished: ['Furnished', 'Semi-furnished', 'Unfurnished'],
      preferredGender: ['Male', 'Female', 'Any'],
      bhk: ['1 RK', '1 BHK', '2 BHK', '3 BHK', '3+ BHK']
    });
    
  } catch (error) {
    res.status(500).json({ message: 'Failed to get search filters' });
  }
};

// Get rooms by location autocomplete
exports.locationAutocomplete = async (req, res) => {
  try {
    const { query } = req.query;
    
    if (!query || query.length < 2) {
      return res.json({ locations: [] });
    }
    
    const searchRegex = new RegExp(query, 'i');
    
    // Get unique locations
    const locations = await Room.aggregate([
      {
        $match: {
          ...activePublishedQuery(),
          $or: [
            { 'location.city': searchRegex },
            { 'location.locality': searchRegex },
            { 'location.fullAddress': searchRegex }
          ]
        }
      },
      {
        $project: {
          city: '$location.city',
          locality: '$location.locality',
          fullAddress: '$location.fullAddress'
        }
      },
      { $limit: 10 }
    ]);
    
    // Format and deduplicate
    const formatted = [];
    const seen = new Set();
    
    locations.forEach(loc => {
      const key = `${loc.city}-${loc.locality}`;
      if (!seen.has(key)) {
        seen.add(key);
        formatted.push({
          city: loc.city,
          locality: loc.locality,
          fullAddress: loc.fullAddress,
          display: loc.locality ? `${loc.locality}, ${loc.city}` : loc.city
        });
      }
    });
    
    res.json({ locations: formatted });
    
  } catch (error) {
    res.status(500).json({ message: 'Failed to get location suggestions' });
  }
};

// Helper function to calculate distance between two coordinates
function calculateDistance(lat1, lon1, lat2, lon2) {
  const R = 6371; // Radius of the Earth in km
  const dLat = deg2rad(lat2 - lat1);
  const dLon = deg2rad(lon2 - lon1);
  const a = 
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(deg2rad(lat1)) * Math.cos(deg2rad(lat2)) * 
    Math.sin(dLon/2) * Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c;
}

function deg2rad(deg) {
  return deg * (Math.PI/180);
}
