const express = require('express');
const router = express.Router();

// Review Controller 
const { 
    createReview, 
    getReviewsForRoom,
    createGuestReview,
    getGuestReviewsForUser,
} = require('../controllers/reviewController');

// Middleware import
const { protect } = require('../middleware/authMiddleware');

// --- Review Routes ---

// @route   POST /api/reviews/:roomId
// @desc   
// @access  Private only login student
router.route('/:roomId').post(protect, createReview);

// @route   GET /api/reviews/:roomId
// @desc    
// @access  Public
router.route('/:roomId').get(getReviewsForRoom);

router.route('/guest/:applicationId').post(protect, createGuestReview);
router.route('/guest/user/:userId').get(getGuestReviewsForUser);


module.exports = router;
