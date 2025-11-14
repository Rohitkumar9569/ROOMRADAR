// server/routes/insightsRoutes.js
const express = require('express');
const router = express.Router();
// Import the new controller function 
const { getRoomStatusData, getEarningsData, getTopListingsData } = require('../controllers/insightsController');
const { protect, restrictTo } = require('../middleware/authMiddleware');

// All routes in this file are protected and for Landlords only
router.use(protect, restrictTo('Landlord'));

router.route('/room-status').get(getRoomStatusData);
router.route('/earnings').get(getEarningsData);
// Add the new route
router.route('/top-listings').get(getTopListingsData);

module.exports = router;