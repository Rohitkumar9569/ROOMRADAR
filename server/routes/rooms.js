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
  updateRoomStatus
} = require('../controllers/roomController');
const { protect, restrictTo } = require('../middleware/authMiddleware');

// Checkpoint
router.use((req, res, next) => {
  console.log(`[ROUTER]: Request received for: ${req.originalUrl}`);
  next();
});



//  General public routes
router.route('/').get(getAllRooms);

// Specific search route
router.route('/search').post(searchRooms);

//  Specific protected routes
router.route('/my-rooms').get(protect, restrictTo('Landlord'), getMyRooms);

//Protected POST route for creating
router.route('/').post(protect, createRoom);

// Booking route
router.route('/:id/book').post(protect, restrictTo('Student'), createBooking);

router.route('/:id/status').patch(protect, restrictTo('Landlord'), updateRoomStatus);

// Wildcard/Dynamic routes 
router.route('/:id')
  .get(getRoomById)
  .put(protect, restrictTo('Landlord'), updateRoom)
  .delete(protect, restrictTo('Landlord'), deleteRoom);

module.exports = router;