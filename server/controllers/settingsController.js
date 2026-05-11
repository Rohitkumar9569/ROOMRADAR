const asyncHandler = require('express-async-handler');
const PlatformSetting = require('../models/PlatformSetting');

const getDefaultSettings = () => ({
  key: 'platform',
  platformFee: Number(process.env.PLATFORM_FEE || 500),
  platformFeePercentage: Number(process.env.PLATFORM_FEE_PERCENTAGE || 5),
  commissionPercent: Number(process.env.PLATFORM_COMMISSION_PERCENT || 0),
  maintenanceMode: false,
  allowNewSignups: true,
  supportEmail: process.env.SUPPORT_EMAIL || 'support@roomradar.in',
  verificationRequired: true,
  autoPublishVerifiedLandlords: false,
  bookingRequestExpiryHours: Number(process.env.BOOKING_REQUEST_EXPIRY_HOURS || 24),
  payoutHoldHoursAfterCheckIn: Number(process.env.PAYOUT_HOLD_HOURS_AFTER_CHECKIN || 24),
  disputeWindowHoursAfterCheckIn: Number(process.env.DISPUTE_WINDOW_HOURS || 72),
  escrowEnabled: process.env.ESCROW_ENABLED !== 'false',
  offlinePaymentAllowed: process.env.OFFLINE_PAYMENT_ALLOWED !== 'false',
});

exports.getPublicSettings = asyncHandler(async (req, res) => {
  const settings = await PlatformSetting.findOneAndUpdate(
    { key: 'platform' },
    { $setOnInsert: getDefaultSettings() },
    { upsert: true, new: true }
  ).select('-__v');

  res.json(settings);
});

exports.getDefaultSettings = getDefaultSettings;
