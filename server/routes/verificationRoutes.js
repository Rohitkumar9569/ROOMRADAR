const express = require('express');
const router = express.Router();
const verificationController = require('../controllers/verificationController');
const { protect, restrictTo } = require('../middleware/authMiddleware');

// Get verification status
router.get('/status/:userId', protect, verificationController.getVerificationStatus);

// Email verification
router.post('/email/send', protect, verificationController.sendEmailVerification);
router.get('/email/verify/:token', verificationController.verifyEmail);

// Phone verification
router.post('/phone/send', protect, verificationController.sendPhoneOTP);
router.post('/phone/verify', protect, verificationController.verifyPhoneOTP);

// Document verifications (all require auth)
router.post('/identity/submit', protect, verificationController.submitIdentityVerification);
router.post('/address/submit', protect, verificationController.submitAddressVerification);
router.post('/student/submit', protect, verificationController.submitStudentVerification);
router.post('/employment/submit', protect, verificationController.submitEmploymentVerification);
router.post('/property/submit', protect, verificationController.submitPropertyVerification);

// Admin routes
router.get('/admin/pending', protect, restrictTo('admin'), verificationController.getPendingVerifications);
router.post('/admin/approve', protect, restrictTo('admin'), verificationController.approveVerification);
router.post('/admin/reject', protect, restrictTo('admin'), verificationController.rejectVerification);

module.exports = router;
