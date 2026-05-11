const mongoose = require('mongoose');

const supportTicketSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      index: true,
    },
    application: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Application',
      index: true,
    },
    room: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Room',
      index: true,
    },
    subject: {
      type: String,
      required: true,
      trim: true,
    },
    issueDescription: {
      type: String,
      required: true,
      trim: true,
    },
    category: {
      type: String,
      enum: ['booking', 'payment', 'listing', 'verification', 'account', 'damage', 'refund', 'safety', 'other'],
      default: 'other',
      index: true,
    },
    issueType: {
      type: String,
      enum: ['general', 'dispute', 'damage_claim', 'refund_request', 'security_deposit', 'misrepresentation', 'late_checkout'],
      default: 'general',
      index: true,
    },
    priority: {
      type: String,
      enum: ['low', 'medium', 'high', 'urgent'],
      default: 'medium',
      index: true,
    },
    status: {
      type: String,
      enum: ['open', 'in_progress', 'resolved', 'closed'],
      default: 'open',
      index: true,
    },
    assignedAdmin: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    evidence: [{
      url: { type: String, trim: true },
      type: { type: String, enum: ['image', 'video', 'pdf', 'chat', 'other'], default: 'other' },
      caption: { type: String, trim: true },
      uploadedAt: { type: Date, default: Date.now },
    }],
    requestedAmount: {
      type: Number,
      default: 0,
      min: 0,
    },
    escrowAction: {
      type: String,
      enum: ['none', 'freeze', 'release_to_landlord', 'refund_guest', 'partial_refund'],
      default: 'none',
      index: true,
    },
    escrowFrozenAt: Date,
    resolutionDecision: {
      type: String,
      enum: ['pending', 'refund_guest', 'release_to_landlord', 'partial_refund', 'deduct_deposit', 'dismissed'],
      default: 'pending',
      index: true,
    },
    resolutionNote: {
      type: String,
      trim: true,
    },
    resolvedAt: Date,
  },
  { timestamps: true }
);

supportTicketSchema.index({ status: 1, priority: 1, createdAt: -1 });
supportTicketSchema.index({ application: 1, issueType: 1 });

module.exports = mongoose.model('SupportTicket', supportTicketSchema);
