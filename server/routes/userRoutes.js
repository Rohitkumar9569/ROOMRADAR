const express = require('express');
const router = express.Router();

const {
  addToWishlist,
  removeFromWishlist,
  getWishlist,
  getStudentDashboardSummary,
  getLandlordDashboardSummary,
} = require('../controllers/userController');

const { protect, restrictTo } = require('../middleware/authMiddleware');


router.get('/wishlist', protect, getWishlist);


router.post('/wishlist', protect, addToWishlist);

router.delete('/wishlist/:roomId', protect, removeFromWishlist);




// @route   GET /api/users/dashboard-summary/student
// @desc    
// @access  Private (Student)
router.get('/dashboard-summary/student', protect, getStudentDashboardSummary);

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