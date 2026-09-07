const rateLimit = require("express-rate-limit");

const authRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 50, // Increased from 20 to 50 to accommodate token refreshes
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: "Too many authentication attempts. Please try again later.",
    error: "RATE_LIMITED",
  },
});

// Separate rate limiter for token refresh (more generous)
const refreshTokenRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100, // Allow more refresh attempts
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: "Too many token refresh attempts. Please try again later.",
    error: "RATE_LIMITED",
  },
});

const mutationRateLimiter = rateLimit({
  windowMs: 1 * 60 * 1000,
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: "Too many requests. Please slow down.",
    error: "RATE_LIMITED",
  },
});

module.exports = {
  authRateLimiter,
  refreshTokenRateLimiter,
  mutationRateLimiter,
};
