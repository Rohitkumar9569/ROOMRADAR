const jwt = require('jsonwebtoken');
const asyncHandler = require('express-async-handler');
const UsageEvent = require('../models/UsageEvent');

const ALLOWED_EVENTS = new Set(['session_start', 'page_view', 'pwa_install', 'app_open', 'heartbeat']);
const ALLOWED_SOURCES = new Set(['web', 'mobile_web', 'desktop_web', 'pwa']);
const ALLOWED_DEVICES = new Set(['mobile', 'tablet', 'desktop', 'unknown']);

const safeString = (value, maxLength = 300) => {
  if (value === undefined || value === null) return undefined;
  const normalized = String(value).trim();
  return normalized ? normalized.slice(0, maxLength) : undefined;
};

const safeMetadata = (value) => {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return undefined;

  try {
    const serialized = JSON.stringify(value);
    if (serialized.length > 2000) return undefined;
    return JSON.parse(serialized);
  } catch (error) {
    return undefined;
  }
};

const getUserIdFromRequest = (req) => {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : '';
  if (!token || !process.env.JWT_SECRET) return undefined;

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    return decoded?.id || decoded?._id || decoded?.userId;
  } catch (error) {
    return undefined;
  }
};

exports.trackUsageEvent = asyncHandler(async (req, res) => {
  const eventType = safeString(req.body?.eventType, 40);
  if (!ALLOWED_EVENTS.has(eventType)) {
    res.status(400);
    throw new Error('Invalid usage event type.');
  }

  const sessionId = safeString(req.body?.sessionId, 120);
  const source = ALLOWED_SOURCES.has(req.body?.source) ? req.body.source : 'web';
  const device = ALLOWED_DEVICES.has(req.body?.device) ? req.body.device : 'unknown';
  const userId = getUserIdFromRequest(req);
  const payload = {
    eventType,
    sessionId,
    user: userId,
    role: safeString(req.body?.role, 40),
    path: safeString(req.body?.path, 300),
    source,
    isStandalone: Boolean(req.body?.isStandalone),
    device,
    userAgent: safeString(req.get('user-agent'), 500),
    metadata: safeMetadata(req.body?.metadata),
  };

  if ((eventType === 'session_start' || eventType === 'app_open') && sessionId) {
    await UsageEvent.updateOne(
      { eventType, sessionId },
      { $setOnInsert: payload },
      { upsert: true }
    );
  } else {
    await UsageEvent.create(payload);
  }

  res.status(204).end();
});
