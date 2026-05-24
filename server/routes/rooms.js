// server/routes/rooms.js 

const express = require('express');
const router = express.Router();
const { 
  createRoom, 
  getAllRooms, 
  getRoomById,
  getMyRooms,
  updateRoom,
  deleteRoom,
  createBooking,
  searchRooms,
  updateRoomStatus,
  getRecommendedRooms,
  getPriceRange,
  getSimilarRooms
} = require('../controllers/roomController');
const { protect, restrictTo } = require('../middleware/authMiddleware');
const { bookingRateLimiter } = require('../middleware/rateLimiter');
const { validateRoomConfig } = require('../middleware/roomConfigValidation');
const { roomConfig } = require('../utils/roomConfigUtils');
const { suggestPrice, getRoomSentiment } = require('../controllers/aiFeatureController');

//  General public routes
router.route('/').get(getAllRooms);
router.get('/config/fields', (req, res) => res.json(roomConfig));

// Specific search route
router.route('/search').post(searchRooms);
router.route('/recommended').get(getRecommendedRooms);
router.route('/price-range').get(getPriceRange);
router.route('/similar/:id').get(getSimilarRooms);
router.route('/suggest-price').post(protect, restrictTo('Student', 'Landlord'), suggestPrice);

//  Specific protected routes
router.route('/my-rooms').get(protect, restrictTo('Landlord'), getMyRooms);

//Protected POST route for creating
router.route('/').post(protect, validateRoomConfig, createRoom);

// Booking route
router.route('/:id/book').post(bookingRateLimiter, protect, restrictTo('Student'), createBooking);

router.route('/:id/status').patch(protect, restrictTo('Landlord'), updateRoomStatus);
router.route('/:id/sentiment').get(getRoomSentiment);

// Wildcard/Dynamic routes 
router.route('/:id')
  .get(getRoomById)
  .put(protect, restrictTo('Landlord'), validateRoomConfig, updateRoom)
  .delete(protect, restrictTo('Landlord'), deleteRoom);

module.exports = router;
