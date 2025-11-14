const express = require('express');

const router = express.Router();

const {
    createInquiry,
    createApplication,
    getStudentApplications,
    getLandlordApplications,
    approveApplication,
    rejectApplication,
    confirmPayment,
    cancelApplication,
    updateApplication, 
} = require('../controllers/applicationController');

const { protect, restrictTo } = require('../middleware/authMiddleware');


// --- Student Routes ---

router.post('/inquiry', protect, restrictTo('student'), createInquiry);



router.post('/', protect, restrictTo('student', 'Landlord'), createApplication);

router.get('/student', protect, restrictTo('student', 'Landlord'), getStudentApplications);


//Landlord Routes
router.get('/landlord', protect, restrictTo('Landlord'), getLandlordApplications);
router.patch('/:id/approve', protect, restrictTo('Landlord'), approveApplication);
router.patch('/:id/reject', protect, restrictTo('Landlord'), rejectApplication);
router.patch('/:id/confirm-payment', protect, restrictTo('Landlord'), confirmPayment);


//Common Routes 
router.patch('/:id', protect, restrictTo('student', 'Landlord'), updateApplication);

router.patch('/:id/cancel', protect, cancelApplication);


module.exports = router;