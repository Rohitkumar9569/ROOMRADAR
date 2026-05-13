// server/models/Application.js
const mongoose = require('mongoose');
const { toOptionalDate } = require('../utils/dateUtils');

const optionalIndianMobileValidator = {
  validator(value) {
    return !value || /^[6-9]\d{9}$/.test(String(value));
  },
  message: 'Mobile number must be a valid 10-digit number.',
};

const applicationSchema = new mongoose.Schema(
  {
    room: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Room',
      required: true,
    },
    student: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    landlord: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    conversation: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Conversation',
    },
    type: {
      type: String,
      enum: ['request', 'inquiry'],
      default: 'inquiry',
      required: true,
    },
    status: {
      type: String,
      enum: ['pending', 'approved', 'rejected', 'cancelled', 'confirmed', 'expired'],
      default: 'pending',
    },

    fullName: {
      type: String,
      required: function () { return this.type === 'request'; }
    },
    mobileNumber: {
      type: String,
      required: function () { return this.type === 'request'; },
      validate: optionalIndianMobileValidator,
    },
    profileType: {
      type: String,
      required: function () { return this.type === 'request'; }
    },
    durationMonths: {
      type: Number,
      min: 1,
    },
    purposeOfStay: {
      type: String,
      trim: true,
    },
    idProofType: {
      type: String,
      trim: true,
    },
    idProofImage: {
      type: String,
    },
    emergencyContact: {
      name: { type: String, trim: true },
      phone: { type: String, trim: true, validate: optionalIndianMobileValidator },
    },
    agreedToTerms: {
      type: Boolean,
      default: false,
    },

    checkInDate: {
      type: Date,
      required: function () { return this.type === 'request'; },
      set: toOptionalDate,
    },
    checkOutDate: {
      type: Date,
      required: function () { return this.type === 'request'; },
      set: toOptionalDate,
    },

    occupants: {
      adults: {
        type: Number,
        min: 1,
        required: function () { return this.type === 'request'; },
      },
      children: { type: Number, default: 0 },
      males: { type: Number, default: 0 },
      females: { type: Number, default: 0 },
    },

    gender: {
      type: String
    },
    occupantComposition: {
      type: String
    },

    message: {
      type: String,
      maxLength: 500,
    },

    approvedAt: { type: Date, set: toOptionalDate },
    confirmedAt: { type: Date, set: toOptionalDate },
    requestExpiresAt: {
      type: Date,
      index: true,
      set: toOptionalDate,
    },
    cancelledAt: { type: Date, set: toOptionalDate },
    cancelledBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    cancellationReason: {
      type: String,
      trim: true,
    },
    cancellationPenalty: {
      percent: { type: Number, default: 0 },
      amount: { type: Number, default: 0 },
      reason: { type: String, trim: true },
      calendarBlocked: { type: Boolean, default: false },
      waived: { type: Boolean, default: false },
    },
    guidebookSentAt: { type: Date, set: toOptionalDate },
    smartLockPin: {
      type: String,
      trim: true,
      select: false,
    },
    checkInStatus: {
      type: String,
      enum: ['not_started', 'guidebook_sent', 'checked_in', 'checked_out', 'issue_reported'],
      default: 'not_started',
      index: true,
    },
    stayChangeRequest: {
      status: {
        type: String,
        enum: ['none', 'pending', 'approved', 'rejected', 'cancelled'],
        default: 'none',
        index: true,
      },
      type: {
        type: String,
        enum: ['move_out', 'extend'],
      },
      originalCheckOutDate: { type: Date, set: toOptionalDate },
      requestedCheckOutDate: { type: Date, set: toOptionalDate },
      message: { type: String, trim: true, maxLength: 700 },
      responseNote: { type: String, trim: true, maxLength: 500 },
      requestedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
      },
      respondedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
      },
      requestedAt: { type: Date, set: toOptionalDate },
      respondedAt: { type: Date, set: toOptionalDate },
    },
    paymentMethod: {
      type: String,
      enum: ['card', 'upi', 'netbanking', 'cash', 'manual', 'other'],
    },
    paymentStatus: {
      type: String,
      enum: ['not_required', 'pending', 'paid', 'failed', 'refunded'],
      default: 'pending',
    },
    amountBreakdown: {
      rent: { type: Number, default: 0 },
      durationMonths: { type: Number, default: 1 },
      securityDeposit: { type: Number, default: 0 },
      platformFee: { type: Number, default: 0 },
      total: { type: Number, default: 0 },
    },
    escrow: {
      status: {
        type: String,
        enum: ['not_required', 'pending', 'held', 'frozen', 'released', 'refunded', 'failed'],
        default: 'pending',
        index: true,
      },
      provider: { type: String, trim: true },
      providerOrderId: { type: String, trim: true },
      providerPaymentId: { type: String, trim: true },
      frozenAt: { type: Date, set: toOptionalDate },
      releasedAt: { type: Date, set: toOptionalDate },
      refundedAt: { type: Date, set: toOptionalDate },
      releaseAfter: { type: Date, set: toOptionalDate },
      notes: { type: String, trim: true },
    },

    isUpdated: {
      type: Boolean,
      default: false
    }
  },
  {
    timestamps: true,
  }
);

applicationSchema.index({ landlord: 1, status: 1, requestExpiresAt: 1 });
applicationSchema.index({ student: 1, status: 1, createdAt: -1 });
applicationSchema.index({ room: 1, checkInDate: 1, checkOutDate: 1, status: 1 });
applicationSchema.index({ landlord: 1, 'stayChangeRequest.status': 1, updatedAt: -1 });

const Application = mongoose.model('Application', applicationSchema);
module.exports = Application;
