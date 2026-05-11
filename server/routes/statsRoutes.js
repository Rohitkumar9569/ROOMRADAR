const express = require('express');
const Room = require('../models/Room');
const User = require('../models/User');

const router = express.Router();

router.get('/', async (req, res) => {
  const [totalRooms, cities, totalUsers, verifiedRooms] = await Promise.all([
    Room.countDocuments({ status: 'Published', isDeleted: { $ne: true } }),
    Room.distinct('location.city', { status: 'Published', isDeleted: { $ne: true } }),
    User.countDocuments({ roles: 'Student' }),
    Room.countDocuments({ status: 'Published', isDeleted: { $ne: true }, 'verifications.property': true }),
  ]);

  res.json({
    totalRooms,
    totalCities: cities.filter(Boolean).length,
    totalUsers,
    verifiedRooms,
  });
});

router.get('/cities', async (req, res) => {
  const cities = await Room.aggregate([
    { $match: { status: 'Published', isDeleted: { $ne: true }, 'location.city': { $exists: true, $ne: '' } } },
    {
      $group: {
        _id: '$location.city',
        count: { $sum: 1 },
        avgRent: { $avg: '$rent' },
      },
    },
    { $sort: { count: -1, _id: 1 } },
    { $limit: 8 },
  ]);

  res.json(cities.map((city) => ({
    name: city._id,
    count: city.count,
    avgRent: Math.round(city.avgRent || 0),
  })));
});

module.exports = router;
