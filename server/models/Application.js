// server/models/Application.js
const mongoose = require('mongoose');

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
    type: {
      type: String,
      enum: ['request', 'inquiry'],
      default: 'inquiry',
      required: true,
    },
    status: {
      type: String,
      enum: ['pending', 'approved', 'rejected', 'cancelled', 'confirmed'],
      default: 'pending',
    },

    fullName: {
      type: String,
      required: function () { return this.type === 'request'; }
    },
    mobileNumber: {
      type: String,
      required: function () { return this.type === 'request'; }
    },
    profileType: {
      type: String,
      required: function () { return this.type === 'request'; }
    },

    checkInDate: {
      type: Date,
      required: function () { return this.type === 'request'; },
    },
    checkOutDate: {
      type: Date,
      required: function () { return this.type === 'request'; },
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

    // This field was in our controller, so let's add it to the schema too
    isUpdated: {
      type: Boolean,
      default: false
    }
  },
  {
    timestamps: true,
  }
);

const Application = mongoose.model('Application', applicationSchema);
module.exports = Application;