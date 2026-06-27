const rateLimit = require('express-rate-limit');

/**
 * Strict rate limiter for authentication endpoints (login / register).
 * Helps prevent brute-force attacks.
 */
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Increased for development flexibility
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    status: 'fail',
    message: 'Too many requests from this IP, please try again after 15 minutes',
  },
});

/**
 * General API rate limiter — applied to all routes.
 */
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 1000, // Increased for development flexibility
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    status: 'fail',
    message: 'Too many requests from this IP, please try again later',
  },
});

/**
 * Stricter limiter for code submission to prevent abuse of the executor.
 */
const codeLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 15,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    status: 'fail',
    message: 'Too many code submissions, please wait before trying again',
  },
});

module.exports = { authLimiter, apiLimiter, codeLimiter };
