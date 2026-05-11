const mongoose = require('mongoose');

const platformSettingSchema = new mongoose.Schema(
  {
    key: {
      type: String,
      required: true,
      unique: true,
      default: 'platform',
    },
    platformFee: {
      type: Number,
      default: 500,
      min: 0,
    },
    platformFeePercentage: {
      type: Number,
      default: 5,
      min: 0,
      max: 100,
    },
    commissionPercent: {
      type: Number,
      default: 0,
      min: 0,
      max: 100,
    },
    allowNewSignups: {
      type: Boolean,
      default: true,
    },
    maintenanceMode: {
      type: Boolean,
      default: false,
    },
    supportEmail: {
      type: String,
      default: 'support@roomradar.in',
      trim: true,
    },
    verificationRequired: {
      type: Boolean,
      default: true,
    },
    autoPublishVerifiedLandlords: {
      type: Boolean,
      default: false,
    },
    bookingRequestExpiryHours: {
      type: Number,
      default: 24,
      min: 1,
      max: 168,
    },
    payoutHoldHoursAfterCheckIn: {
      type: Number,
      default: 24,
      min: 0,
      max: 720,
    },
    disputeWindowHoursAfterCheckIn: {
      type: Number,
      default: 72,
      min: 1,
      max: 720,
    },
    escrowEnabled: {
      type: Boolean,
      default: true,
    },
    offlinePaymentAllowed: {
      type: Boolean,
      default: true,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('PlatformSetting', platformSettingSchema);
