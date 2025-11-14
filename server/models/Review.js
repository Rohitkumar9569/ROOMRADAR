const mongoose = require('mongoose');

// --- Review Schema ---
const reviewSchema = new mongoose.Schema(
  {
    rating: {
      type: Number,
      min: 1,
      max: 5,
      required: [true, 'Please provide a rating between 1 and 5.'],
    },
    comment: {
      type: String,
      required: [true, 'Please provide a comment for your review.'],
      trim: true,
      maxlength: 1000,
    },
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
    
    booking: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Application',
        required: true,
        unique: true, 
    }
  },
  {
    timestamps: true,
  }
);

const Review = mongoose.model('Review', reviewSchema);

module.exports = Review;