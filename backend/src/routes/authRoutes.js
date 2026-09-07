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
const { requireRole } = require("../middleware/requireRole");
const validateRequest = require("../middleware/validateRequest");
const { authRateLimiter, refreshTokenRateLimiter } = require("../middleware/rateLimiters");

const router = express.Router();

router.post("/register", authRateLimiter, register);
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
  requireRole(["HR_ADMIN", "SUPER_ADMIN"]),
  forceLogout,
);

module.exports = router;
