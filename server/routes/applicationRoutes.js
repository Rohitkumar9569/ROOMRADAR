const express = require('express');

const router = express.Router();

const {
    createInquiry,
    createApplication,
    getApplicationById,
    getStudentApplications,
    getLandlordApplications,
    getCalendarStats,
    approveApplication,
    rejectApplication,
    confirmPayment,
    cancelApplication,
    cancelConfirmedByHost,
    requestStayChange,
    respondStayChange,
    updateApplication, 
} = require('../controllers/applicationController');

const { protect, restrictTo } = require('../middleware/authMiddleware');
const { bookingRateLimiter } = require('../middleware/rateLimiter');


// --- Student Routes ---

router.post('/inquiry', bookingRateLimiter, protect, restrictTo('student'), createInquiry);



router.post('/', bookingRateLimiter, protect, restrictTo('student'), createApplication);

router.get('/student', protect, restrictTo('student'), getStudentApplications);
router.get('/calendar-stats', protect, restrictTo('Landlord'), getCalendarStats);


//Landlord Routes
router.get('/landlord', protect, restrictTo('Landlord'), getLandlordApplications);
router.patch('/:id/approve', bookingRateLimiter, protect, restrictTo('Landlord'), approveApplication);
router.patch('/:id/reject', bookingRateLimiter, protect, restrictTo('Landlord'), rejectApplication);
router.patch('/:id/confirm-payment', bookingRateLimiter, protect, restrictTo('student'), confirmPayment);
router.put('/:id/confirm-payment', bookingRateLimiter, protect, restrictTo('student'), confirmPayment);


//Common Routes 
router.get('/:id', protect, getApplicationById);
router.patch('/:id', protect, restrictTo('student'), updateApplication);

router.patch('/:id/cancel', bookingRateLimiter, protect, cancelApplication);
router.patch('/:id/host-cancel', bookingRateLimiter, protect, restrictTo('Landlord'), cancelConfirmedByHost);
router.post('/:id/stay-change', bookingRateLimiter, protect, restrictTo('student'), requestStayChange);
router.patch('/:id/stay-change/respond', bookingRateLimiter, protect, restrictTo('Landlord'), respondStayChange);


module.exports = router;
