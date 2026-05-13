const mongoose = require('mongoose');

const guestReviewSchema = new mongoose.Schema(
  {
    rating: {
      type: Number,
      min: 1,
      max: 5,
      required: [true, 'Please provide a rating between 1 and 5.'],
    },
    comment: {
      type: String,
      required: [true, 'Please write a short guest review.'],
      trim: true,
      maxlength: 1000,
    },
    categoryRatings: {
      communication: { type: Number, min: 1, max: 5 },
      cleanliness: { type: Number, min: 1, max: 5 },
      houseRules: { type: Number, min: 1, max: 5 },
      payment: { type: Number, min: 1, max: 5 },
    },
    room: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Room',
      required: true,
    },
    guest: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    landlord: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    booking: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Application',
      required: true,
      unique: true,
    },
  },
  { timestamps: true }
);

guestReviewSchema.index({ guest: 1, createdAt: -1 });
guestReviewSchema.index({ landlord: 1, createdAt: -1 });

module.exports = mongoose.model('GuestReview', guestReviewSchema);
