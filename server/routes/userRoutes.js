const express = require('express');
const router = express.Router();

const {
  addToWishlist,
  removeFromWishlist,
  getWishlist,
  getStudentDashboardSummary,
  getLandlordDashboardSummary,
  updateProfile,
  getCurrentUser,
  requestAccountReview,
} = require('../controllers/userController');

const { protect, restrictTo } = require('../middleware/authMiddleware');


router.get('/wishlist', protect, restrictTo('Student'), getWishlist);
router.get('/me', protect, getCurrentUser);
router.put('/profile', protect, updateProfile);
router.post('/account-review', protect, requestAccountReview);


router.post('/wishlist', protect, restrictTo('Student'), addToWishlist);

router.delete('/wishlist/:roomId', protect, restrictTo('Student'), removeFromWishlist);




// @route   GET /api/users/dashboard-summary/student
// @desc    
// @access  Private (Student)
router.get('/dashboard-summary/student', protect, restrictTo('Student'), getStudentDashboardSummary);

// @route   GET /api/users/dashboard-summary/landlord
// @desc   
// @access  Private (Landlord Only)
router.get(
  '/dashboard-summary/landlord',
  protect,
  restrictTo('Landlord'), 
  getLandlordDashboardSummary
);


module.exports = router;
