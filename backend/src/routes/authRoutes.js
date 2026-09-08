const express = require("express");
const {
  register,
  login,
  refreshToken,
  getCurrentUser,
  logout,
  changePassword,
  forceLogout,
} = require("../controllers/authController");
const { authenticateJwt } = require("../middleware/authMiddleware");
const { authorize } = require("../middleware/authorize"); // NEW: Use authorize instead of requireRole
const validateRequest = require("../middleware/validateRequest");
const { authRateLimiter, refreshTokenRateLimiter } = require("../middleware/rateLimiters");

const router = express.Router();

// FIXED: Registration now requires authentication and accounts.create permission
router.post("/register", 
  authRateLimiter, 
  authenticateJwt,
  authorize({ permissions: 'accounts.create' }),
  register
);
router.post(
  "/login",
  authRateLimiter,
  validateRequest({
    required: ["username", "password"],
    sanitize: ["username"],
  }),
  login,
);
router.post(
  "/refresh",
  refreshTokenRateLimiter, // Use separate rate limiter with higher limit
  validateRequest({ required: ["refreshToken"] }),
  refreshToken,
);
router.get("/me", authenticateJwt, getCurrentUser);
router.post("/logout", authRateLimiter, authenticateJwt, logout);
router.patch(
  "/change-password",
  authRateLimiter,
  authenticateJwt,
  validateRequest({ required: ["oldPassword", "newPassword"] }),
  changePassword,
);
// Admin-only forced logout endpoint
router.post(
  "/force-logout/:userUuid",
  authRateLimiter,
  authenticateJwt,
  authorize({ permissions: 'accounts.manage' }), // FIXED: Use database-driven permission
  forceLogout,
);

module.exports = router;
