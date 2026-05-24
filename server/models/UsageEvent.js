const mongoose = require('mongoose');

const usageEventSchema = new mongoose.Schema(
  {
    eventType: {
      type: String,
      enum: [
        'session_start',
        'page_view',
        'pwa_install',
        'app_open',
        'heartbeat',
        'search_run',
        'filter_apply',
        'room_click',
        'room_view',
        'wishlist_add',
        'wishlist_remove',
        'search_alert_save',
        'booking_request',
      ],
      required: true,
      index: true,
    },
    sessionId: {
      type: String,
      trim: true,
      index: true,
    },
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      index: true,
    },
    role: {
      type: String,
      trim: true,
      index: true,
    },
    path: {
      type: String,
      trim: true,
      maxlength: 300,
    },
    source: {
      type: String,
      enum: ['web', 'mobile_web', 'desktop_web', 'pwa'],
      default: 'web',
      index: true,
    },
    isStandalone: {
      type: Boolean,
      default: false,
    },
    device: {
      type: String,
      enum: ['mobile', 'tablet', 'desktop', 'unknown'],
      default: 'unknown',
      index: true,
    },
    userAgent: {
      type: String,
      trim: true,
      maxlength: 500,
    },
    metadata: {
      type: mongoose.Schema.Types.Mixed,
    },
  },
  { timestamps: true }
);

usageEventSchema.index({ createdAt: -1 });
usageEventSchema.index({ eventType: 1, createdAt: -1 });
usageEventSchema.index({ sessionId: 1, eventType: 1, createdAt: -1 });

module.exports = mongoose.model('UsageEvent', usageEventSchema);
