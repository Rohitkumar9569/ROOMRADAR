const buckets = new Map();

const getClientKey = (req, scope) => {
  const forwarded = req.headers['x-forwarded-for'];
  const ip = Array.isArray(forwarded)
    ? forwarded[0]
    : String(forwarded || req.ip || req.socket?.remoteAddress || 'unknown').split(',')[0].trim();
  return `${scope}:${ip}`;
};

const createRateLimiter = ({ windowMs = 15 * 60 * 1000, max = 100, scope = 'api', message } = {}) => {
  return (req, res, next) => {
    const now = Date.now();
    const key = getClientKey(req, scope);
    const current = buckets.get(key);

    if (!current || current.resetAt <= now) {
      buckets.set(key, { count: 1, resetAt: now + windowMs });
      return next();
    }

    current.count += 1;
    buckets.set(key, current);

    if (current.count > max) {
      res.set('Retry-After', Math.ceil((current.resetAt - now) / 1000));
      return res.status(429).json({
        message: message || 'Too many requests. Please try again shortly.',
      });
    }

    return next();
  };
};

const authRateLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000,
  max: 20,
  scope: 'auth',
  message: 'Too many authentication attempts. Please wait a few minutes.',
});

const bookingRateLimiter = createRateLimiter({
  windowMs: 10 * 60 * 1000,
  max: 30,
  scope: 'booking',
  message: 'Too many booking actions. Please slow down and try again.',
});

module.exports = {
  createRateLimiter,
  authRateLimiter,
  bookingRateLimiter,
};
