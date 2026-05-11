const mongoose = require('mongoose');

const transactionSchema = new mongoose.Schema(
  {
    application: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Application',
      index: true,
    },
    student: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      index: true,
    },
    landlord: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      index: true,
    },
    room: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Room',
      index: true,
    },
    amount: {
      type: Number,
      default: 0,
      min: 0,
    },
    platformFee: {
      type: Number,
      default: 0,
      min: 0,
    },
    landlordPayout: {
      type: Number,
      default: 0,
      min: 0,
    },
    type: {
      type: String,
      enum: ['booking_payment', 'escrow_hold', 'platform_fee', 'payout', 'refund', 'penalty'],
      default: 'booking_payment',
      index: true,
    },
    status: {
      type: String,
      enum: ['pending', 'held', 'frozen', 'completed', 'failed', 'refunded', 'released'],
      default: 'pending',
      index: true,
    },
    provider: String,
    providerReference: String,
    escrowFrozen: {
      type: Boolean,
      default: false,
      index: true,
    },
    frozenAt: Date,
    releaseAfter: Date,
    notes: {
      type: String,
      trim: true,
    },
  },
  { timestamps: true }
);

transactionSchema.index({ application: 1, status: 1, type: 1 });
transactionSchema.index({ landlord: 1, status: 1, createdAt: -1 });

module.exports = mongoose.model('Transaction', transactionSchema);
