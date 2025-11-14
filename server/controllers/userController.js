const User = require('../models/User');
const Application = require('../models/Application');
const Room = require('../models/Room'); // मकान मालिक के डैशबोर्ड के लिए आवश्यक

// --- Wishlist Functions ---

/**
 * @desc     Add a room to the user's wishlist
 * @route    POST /api/users/wishlist
 * @access   Private
 */
exports.addToWishlist = async (req, res) => {
  try {
    // Get roomId from the request body as sent by the frontend
    const { roomId } = req.body;
    
    // Find user, add room to wishlist, and get the updated document back
    const updatedUser = await User.findByIdAndUpdate(
      req.user.id,
      { $addToSet: { wishlist: roomId } }, 
      { new: true } // This option tells Mongoose to return the updated user
    );

    // Send the entire updated user object back to the frontend
    res.status(200).json({ success: true, user: updatedUser });

  } catch (error) {
    console.error('Error adding to wishlist:', error);
    res.status(500).json({ success: false, message: 'Server Error' });
  }
};

/**
 * @desc     Remove a room from the user's wishlist
 * @route    DELETE /api/users/wishlist/:roomId
 * @access   Private
 */
exports.removeFromWishlist = async (req, res) => {
  try {
    // Get roomId from URL params for DELETE request
    const { roomId } = req.params;

    // Find user, remove room from wishlist, and get the updated document back
    const updatedUser = await User.findByIdAndUpdate(
      req.user.id,
      { $pull: { wishlist: roomId } },
      { new: true } // Return the updated user
    );

    // Send the entire updated user object back to the frontend
    res.status(200).json({ success: true, user: updatedUser });

  } catch (error) {
    console.error('Error removing from wishlist:', error);
    res.status(500).json({ success: false, message: 'Server Error' });
  }
};

/**
 * @desc     Get all rooms in the user's wishlist
 * @route    GET /api/users/wishlist
 * @access   Private
 */
exports.getWishlist = async (req, res) => {
  try {
    const user = await User.findById(req.user.id).populate('wishlist');
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }
    res.status(200).json({ success: true, wishlist: user.wishlist });
  } catch (error) {
    console.error('Error fetching wishlist:', error);
    res.status(500).json({ success: false, message: 'Server Error' });
  }
};



/**
 * @desc     Get summary data for the STUDENT dashboard
 * @route    GET /api/users/dashboard-summary/student
 * @access   Private (Student)
 */
exports.getStudentDashboardSummary = async (req, res) => {
  try {
    const userId = req.user.id;

    const [user, pendingCount, confirmedCount] = await Promise.all([
      User.findById(userId).select('wishlist'),
      Application.countDocuments({ student: userId, status: 'pending' }),
      Application.countDocuments({ student: userId, status: 'confirmed' }),
    ]);

    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    res.status(200).json({
      wishlistCount: user.wishlist.length,
      pendingCount,
      confirmedCount,
    });
  } catch (error) {
    console.error('Error fetching student dashboard summary:', error);
    res.status(500).json({ success: false, message: 'Server Error' });
  }
};

/**
 * @desc     Get summary data for the LANDLORD dashboard
 * @route    GET /api/users/dashboard-summary/landlord
 * @access   Private (Landlord)
 */
exports.getLandlordDashboardSummary = async (req, res) => {
    try {
      const userId = req.user.id;
  
      const [roomCount, pendingCount, confirmedCount] = await Promise.all([
        Room.countDocuments({ landlord: userId }),
        Application.countDocuments({ landlord: userId, status: 'pending' }),
        Application.countDocuments({ landlord: userId, status: 'confirmed' }),
      ]);
  
      res.status(200).json({
        roomCount,
        pendingCount,
        confirmedCount,
      });
  
    } catch (error) {
      console.error('Error fetching landlord dashboard summary:', error);
      res.status(500).json({ success: false, message: 'Server Error' });
    }
  };