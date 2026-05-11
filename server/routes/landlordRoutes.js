const express = require('express');
const router = express.Router();

//Import both controller functions 
const { getDashboardDetails, getLandlordStats, getCalendarData } = require('../controllers/landlordController');
const { protect, restrictTo } = require('../middleware/authMiddleware');

// This middleware will protect all routes in this file
router.use(protect, restrictTo('Landlord'));

// Route for the main dashboard overview
router.get('/dashboard-details', getDashboardDetails);
router.get('/stats', getLandlordStats);

// Add the new route for calendar data 
router.get('/calendar-data', getCalendarData);

module.exports = router;
