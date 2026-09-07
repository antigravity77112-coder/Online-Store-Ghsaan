const rateLimit = require('express-rate-limit');
const PrismaStore = require('./prismaRateLimitStore');

const authLimiter = rateLimit({
  store: new PrismaStore({ windowMs: 15 * 60 * 1000 }),
  windowMs: 15 * 60 * 1000,
  max: 10,
  skipSuccessfulRequests: true,
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    const resetMs = req.rateLimit?.resetTime
      ? req.rateLimit.resetTime - Date.now()
      : 15 * 60 * 1000;
    const minutesLeft = Math.max(1, Math.ceil(resetMs / 1000 / 60));
    res.status(429).json({
      message: `لقد تجاوزت الحد المسموح به من المحاولات. يرجى المحاولة مرة أخرى بعد ${minutesLeft} دقيقة.`
    });
  }
});

const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 300,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: 'Too many requests, please try again later.' }
});

const chatLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: 'Too many chat requests, please slow down.' }
});

const uploadLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: 'Too many uploads, please try again later.' }
});

const bannerTrackLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 60,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: 'Too many tracking events.' }
});

module.exports = {
  authLimiter,
  globalLimiter,
  chatLimiter,
  uploadLimiter,
  bannerTrackLimiter
};
