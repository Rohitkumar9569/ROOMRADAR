const User = require('../models/User');
const Application = require('../models/Application');
const SupportTicket = require('../models/SupportTicket');
const { normalizeOptionalIndianMobile } = require('../utils/phoneUtils');
const Room = require('../models/Room'); // मकान मालिक के डैशबोर्ड के लिए आवश्यक

const profileFields = [
  'name', 'mobileNumber', 'phone', 'city', 'gender', 'occupation', 'bio', 'avatarUrl', 'profilePicture',
  'paymentCollectionMode', 'offlinePaymentAllowed', 'upiId', 'bankAccountHolder', 'bankAccountNumber',
  'bankIfsc', 'bankName', 'payoutNotes'
];
const roleProfileMap = {
  student: 'student',
  traveller: 'student',
  traveler: 'student',
  landlord: 'landlord',
  host: 'landlord',
};

const buildCurrentUserPayload = (user) => ({
  _id: user._id,
  name: user.name,
  email: user.email,
  roles: user.roles,
  status: user.status,
  accountRestriction: user.accountRestriction,
  wishlist: user.wishlist,
  profilePicture: user.profilePicture,
  avatarUrl: user.avatarUrl,
  mobileNumber: user.mobileNumber,
  phone: user.phone,
  city: user.city,
  gender: user.gender,
  occupation: user.occupation,
  bio: user.bio,
  roleProfiles: user.roleProfiles,
  isGoogleUser: user.isGoogleUser,
  isVerified: user.isVerified,
  kyc_status: user.kyc_status,
  trustScore: user.trustScore,
  verificationLevel: user.verificationLevel,
  verifications: user.verifications,
  verifiedEmails: user.verifiedEmails,
  verifiedPhone: user.verifiedPhone,
});

exports.getCurrentUser = async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select('-password');
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });

    res.status(200).json({ success: true, user: buildCurrentUserPayload(user) });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server Error' });
  }
};

const sanitizeProfilePayload = (body) => {
  const payload = {};
  profileFields.forEach((field) => {
    if (body[field] !== undefined) {
      payload[field] = typeof body[field] === 'string' ? body[field].trim() : body[field];
    }
  });
  return payload;
};

const normalizeProfilePhones = (payload) => {
  const hasMobileNumber = Object.prototype.hasOwnProperty.call(payload, 'mobileNumber');
  const hasPhone = Object.prototype.hasOwnProperty.call(payload, 'phone');

  if (hasMobileNumber) {
    payload.mobileNumber = normalizeOptionalIndianMobile(payload.mobileNumber, 'Mobile number');
  }
  if (hasPhone) {
    payload.phone = normalizeOptionalIndianMobile(payload.phone, 'Phone number');
  }
  if (hasMobileNumber && !hasPhone) {
    payload.phone = payload.mobileNumber;
  }
  if (hasPhone && !hasMobileNumber) {
    payload.mobileNumber = payload.phone;
  }

  return payload;
};

exports.updateProfile = async (req, res) => {
  try {
    const payload = normalizeProfilePhones(sanitizeProfilePayload(req.body));
    if (payload.bio && payload.bio.length > 500) {
      return res.status(400).json({ success: false, message: 'Bio must be 500 characters or less.' });
    }

    const profileRole = roleProfileMap[String(req.body.profileRole || req.body.mode || '').toLowerCase()];
    const update = {};

    if (profileRole) {
      Object.entries(payload).forEach(([key, value]) => {
        update[`roleProfiles.${profileRole}.${key}`] = value;
      });

      if (payload.mobileNumber && !payload.phone) {
        update[`roleProfiles.${profileRole}.phone`] = payload.mobileNumber;
      }
      if (payload.avatarUrl && !payload.profilePicture) {
        update[`roleProfiles.${profileRole}.profilePicture`] = payload.avatarUrl;
      }
      if (payload.avatarUrl) {
        update.avatarUrl = payload.avatarUrl;
      }
      if (payload.profilePicture || payload.avatarUrl) {
        update.profilePicture = payload.profilePicture || payload.avatarUrl;
      }
    } else {
      Object.assign(update, payload);
    }

    if (req.user?.email) {
      update['verifications.email'] = true;
    }

    const verifiedPhone = payload.mobileNumber || payload.phone;
    if (verifiedPhone) {
      update.verifiedPhone = verifiedPhone;
      update['verifications.phone'] = true;

      if (!req.user.mobileNumber && !req.user.phone) {
        update.mobileNumber = verifiedPhone;
        update.phone = verifiedPhone;
      }
    }

    const updateOperation = { $set: update };
    if (req.user?.email) {
      updateOperation.$addToSet = { verifiedEmails: req.user.email };
    }

    const user = await User.findByIdAndUpdate(req.user.id, updateOperation, { new: true, runValidators: true }).select('-password');
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });

    res.status(200).json({ success: true, user: buildCurrentUserPayload(user) });
  } catch (error) {
    res.status(error.statusCode || 500).json({ success: false, message: error.statusCode ? error.message : 'Server Error' });
  }
};

exports.requestAccountReview = async (req, res) => {
  try {
    const message = String(req.body?.message || '').trim();

    if (message.length < 20) {
      return res.status(400).json({
        success: false,
        message: 'Please add a little more detail so Trust & Safety can review your account.',
      });
    }

    if (message.length > 1000) {
      return res.status(400).json({
        success: false,
        message: 'Review request must be 1000 characters or less.',
      });
    }

    const user = await User.findById(req.user.id).select('-password');
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });

    if (user.status !== 'Banned') {
      return res.status(400).json({
        success: false,
        message: 'This account is not restricted.',
      });
    }

    let ticket = await SupportTicket.findOne({
      user: user._id,
      category: 'account',
      subject: 'Account restriction review',
      status: { $in: ['open', 'in_progress'] },
    }).sort({ createdAt: -1 });

    if (ticket) {
      ticket.issueDescription = message;
      ticket.priority = 'high';
      await ticket.save();
    } else {
      ticket = await SupportTicket.create({
        user: user._id,
        subject: 'Account restriction review',
        issueDescription: message,
        category: 'account',
        issueType: 'general',
        priority: 'high',
      });
    }

    user.accountRestriction = {
      ...(user.accountRestriction?.toObject?.() || user.accountRestriction || {}),
      appealStatus: 'pending',
      appealMessage: message,
      appealSubmittedAt: new Date(),
      supportTicket: ticket._id,
    };
    await user.save({ validateBeforeSave: false });

    const io = req.app.get('io');
    if (io) {
      io.emit('admin_support_ticket_created', {
        ticketId: ticket._id,
        priority: ticket.priority,
        issueType: ticket.issueType,
        category: ticket.category,
      });
    }

    res.status(201).json({
      success: true,
      message: 'Review request submitted. RoomRadar Trust & Safety will check it from the admin support queue.',
      ticketId: ticket._id,
      user: buildCurrentUserPayload(user),
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server Error' });
  }
};

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
    res.status(200).json({ success: true, user: buildCurrentUserPayload(updatedUser) });

  } catch (error) {
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
    res.status(200).json({ success: true, user: buildCurrentUserPayload(updatedUser) });

  } catch (error) {
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

    const [user, pendingCount, approvedCount, confirmedCount] = await Promise.all([
      User.findById(userId).select('wishlist'),
      Application.countDocuments({ student: userId, status: 'pending' }),
      Application.countDocuments({ student: userId, status: 'approved' }),
      Application.countDocuments({ student: userId, status: 'confirmed' }),
    ]);

    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    res.status(200).json({
      wishlistCount: user.wishlist.length,
      pendingCount,
      approvedCount,
      confirmedCount,
    });
  } catch (error) {
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
  
      const [roomCount, pendingCount, approvedCount, confirmedCount] = await Promise.all([
        Room.countDocuments({ landlord: userId, isDeleted: { $ne: true } }),
        Application.countDocuments({ landlord: userId, status: 'pending' }),
        Application.countDocuments({ landlord: userId, status: 'approved' }),
        Application.countDocuments({ landlord: userId, status: 'confirmed' }),
      ]);
  
      res.status(200).json({
        roomCount,
        pendingCount,
        approvedCount,
        confirmedCount,
      });
  
    } catch (error) {
      res.status(500).json({ success: false, message: 'Server Error' });
    }
  };
