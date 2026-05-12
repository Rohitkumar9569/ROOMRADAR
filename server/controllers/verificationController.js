const crypto = require('crypto');
const Verification = require('../models/Verification');
const User = require('../models/User');
const { requireValidIndianMobile } = require('../utils/phoneUtils');

// Generate random token
const generateToken = () => {
  return crypto.randomBytes(32).toString('hex');
};

// Generate OTP
const generateOTP = () => {
  return crypto.randomInt(100000, 1000000).toString();
};

// Get verification status
exports.getVerificationStatus = async (req, res) => {
  try {
    const { userId } = req.params;
    
    let verification = await Verification.findOne({ userId });
    
    if (!verification) {
      return res.json({
        trustScore: 0,
        level: 'unverified',
        verifications: {
          email: false,
          phone: false,
          identity: false,
          address: false,
          student: false,
          employment: false,
          property: false,
          background: false
        },
        verifiedCount: 0
      });
    }
    
    res.json(verification.getSummary());
  } catch (error) {
    res.status(500).json({ message: 'Failed to get verification status' });
  }
};

// Send email verification
exports.sendEmailVerification = async (req, res) => {
  try {
    const { userId, email } = req.body;
    
    const token = generateToken();
    const tokenExpires = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours
    
    let verification = await Verification.findOne({ userId });
    
    if (!verification) {
      verification = new Verification({ userId });
    }
    
    verification.email = {
      verified: false,
      token,
      tokenExpires
    };
    
    await verification.save();
    
    // Update user model
    await User.findByIdAndUpdate(userId, {
      $addToSet: { verifiedEmails: email }
    });
    
    // For now, return the token for testing
    res.json({
      message: 'Verification email sent',
      token, // Remove in production
      verificationUrl: `${process.env.CLIENT_URL}/verify-email?token=${token}`
    });
  } catch (error) {
    res.status(500).json({ message: 'Failed to send verification email' });
  }
};

// Verify email
exports.verifyEmail = async (req, res) => {
  try {
    const { token } = req.params;
    
    const verification = await Verification.findOne({
      'email.token': token,
      'email.tokenExpires': { $gt: new Date() }
    });
    
    if (!verification) {
      return res.status(400).json({ message: 'Invalid or expired token' });
    }
    
    verification.email.verified = true;
    verification.email.verifiedAt = new Date();
    verification.email.token = undefined;
    verification.email.tokenExpires = undefined;
    
    await verification.save();
    
    // Update user trust score
    await updateUserTrustScore(verification.userId);
    
    res.json({ message: 'Email verified successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Failed to verify email' });
  }
};

// Send phone OTP
exports.sendPhoneOTP = async (req, res) => {
  try {
    const { userId, phoneNumber } = req.body;
    const normalizedPhoneNumber = requireValidIndianMobile(phoneNumber, 'Phone number');
    
    const otp = generateOTP();
    const otpExpires = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes
    
    let verification = await Verification.findOne({ userId });
    
    if (!verification) {
      verification = new Verification({ userId });
    }
    
    verification.phone = {
      number: normalizedPhoneNumber,
      verified: false,
      otp,
      otpExpires
    };
    
    await verification.save();
    
    // For now, return the OTP for testing
    res.json({
      message: 'OTP sent successfully',
      otp, // Remove in production
      expiresIn: '10 minutes'
    });
  } catch (error) {
    res.status(error.statusCode || 500).json({ message: error.statusCode ? error.message : 'Failed to send OTP' });
  }
};

// Verify phone OTP
exports.verifyPhoneOTP = async (req, res) => {
  try {
    const { userId, otp } = req.body;
    
    const verification = await Verification.findOne({
      userId,
      'phone.otp': otp,
      'phone.otpExpires': { $gt: new Date() }
    });
    
    if (!verification) {
      return res.status(400).json({ message: 'Invalid or expired OTP' });
    }
    
    verification.phone.verified = true;
    verification.phone.verifiedAt = new Date();
    verification.phone.otp = undefined;
    verification.phone.otpExpires = undefined;
    
    await verification.save();
    
    // Update user
    await User.findByIdAndUpdate(userId, {
      verifiedPhone: verification.phone.number
    });
    
    // Update user trust score
    await updateUserTrustScore(userId);
    
    res.json({ message: 'Phone verified successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Failed to verify phone' });
  }
};

// Submit identity verification
exports.submitIdentityVerification = async (req, res) => {
  try {
    const { userId, documentType, documentNumber, documentImage } = req.body;
    
    let verification = await Verification.findOne({ userId });
    
    if (!verification) {
      verification = new Verification({ userId });
    }
    
    verification.identity = {
      verified: false, // Will be verified by admin
      documentType,
      documentNumber,
      documentImage,
      verifiedBy: null
    };
    
    await verification.save();
    
    res.json({ message: 'Identity verification submitted for review' });
  } catch (error) {
    res.status(500).json({ message: 'Failed to submit identity verification' });
  }
};

// Submit address verification
exports.submitAddressVerification = async (req, res) => {
  try {
    const { userId, address, city, state, pincode, documentImage } = req.body;
    
    let verification = await Verification.findOne({ userId });
    
    if (!verification) {
      verification = new Verification({ userId });
    }
    
    verification.address = {
      verified: false,
      address,
      city,
      state,
      pincode,
      documentImage
    };
    
    await verification.save();
    
    res.json({ message: 'Address verification submitted for review' });
  } catch (error) {
    res.status(500).json({ message: 'Failed to submit address verification' });
  }
};

// Submit travelling profile verification
exports.submitStudentVerification = async (req, res) => {
  try {
    const { userId, institutionName, course, studentId, idCardImage } = req.body;
    
    let verification = await Verification.findOne({ userId });
    
    if (!verification) {
      verification = new Verification({ userId });
    }
    
    verification.student = {
      verified: false,
      institutionName,
      course,
      studentId,
      idCardImage
    };
    
    await verification.save();
    
    res.json({ message: 'Travelling verification submitted for review' });
  } catch (error) {
    res.status(500).json({ message: 'Failed to submit travelling verification' });
  }
};

// Submit employment verification
exports.submitEmploymentVerification = async (req, res) => {
  try {
    const { userId, companyName, designation, employeeId, offerLetter } = req.body;
    
    let verification = await Verification.findOne({ userId });
    
    if (!verification) {
      verification = new Verification({ userId });
    }
    
    verification.employment = {
      verified: false,
      companyName,
      designation,
      employeeId,
      offerLetter
    };
    
    await verification.save();
    
    res.json({ message: 'Employment verification submitted for review' });
  } catch (error) {
    res.status(500).json({ message: 'Failed to submit employment verification' });
  }
};

// Submit property verification
exports.submitPropertyVerification = async (req, res) => {
  try {
    const { userId, propertyDocuments, ownershipType } = req.body;
    
    let verification = await Verification.findOne({ userId });
    
    if (!verification) {
      verification = new Verification({ userId });
    }
    
    verification.property = {
      verified: false,
      propertyDocuments,
      ownershipType
    };
    
    await verification.save();
    
    res.json({ message: 'Property verification submitted for review' });
  } catch (error) {
    res.status(500).json({ message: 'Failed to submit property verification' });
  }
};

// Admin: Approve verification
exports.approveVerification = async (req, res) => {
  try {
    const { userId, verificationType, adminId } = req.body;
    
    const verification = await Verification.findOne({ userId });
    
    if (!verification || !verification[verificationType]) {
      return res.status(404).json({ message: 'Verification not found' });
    }
    
    verification[verificationType].verified = true;
    verification[verificationType].verifiedAt = new Date();
    verification[verificationType].verifiedBy = adminId;
    
    await verification.save();
    
    // Update user trust score
    await updateUserTrustScore(userId);
    
    res.json({ message: `${verificationType} verification approved` });
  } catch (error) {
    res.status(500).json({ message: 'Failed to approve verification' });
  }
};

// Admin: Reject verification
exports.rejectVerification = async (req, res) => {
  try {
    const { userId, verificationType, reason } = req.body;
    
    const verification = await Verification.findOne({ userId });
    
    if (!verification || !verification[verificationType]) {
      return res.status(404).json({ message: 'Verification not found' });
    }
    
    verification[verificationType].verified = false;
    verification[verificationType].rejectedAt = new Date();
    verification[verificationType].rejectionReason = reason;
    
    await verification.save();
    
    // Update user trust score
    await updateUserTrustScore(userId);
    
    res.json({ message: `${verificationType} verification rejected` });
  } catch (error) {
    res.status(500).json({ message: 'Failed to reject verification' });
  }
};

// Helper function to update user trust score
const updateUserTrustScore = async (userId) => {
  try {
    const verification = await Verification.findOne({ userId });
    
    if (!verification) return;
    
    const summary = verification.getSummary();
    
    await User.findByIdAndUpdate(userId, {
      trustScore: summary.trustScore,
      verificationLevel: summary.level,
      verifications: summary.verifications
    });
  } catch (error) {
  }
};

// Get all pending verifications (admin)
exports.getPendingVerifications = async (req, res) => {
  try {
    const verifications = await Verification.find({
      $or: [
        { 'identity.verified': false, 'identity.documentType': { $exists: true } },
        { 'address.verified': false, 'address.address': { $exists: true } },
        { 'student.verified': false, 'student.institutionName': { $exists: true } },
        { 'employment.verified': false, 'employment.companyName': { $exists: true } },
        { 'property.verified': false, 'property.propertyDocuments': { $exists: true } }
      ]
    }).populate('userId', 'name email phone');
    
    res.json(verifications);
  } catch (error) {
    res.status(500).json({ message: 'Failed to get pending verifications' });
  }
};
