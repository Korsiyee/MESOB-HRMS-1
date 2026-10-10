const express = require("express");
const router = express.Router();
const letterConfigController = require("../controllers/letterConfigController");
const { authenticateJwt } = require("../middleware/authMiddleware");
const multer = require("multer");

// Configure multer for logo upload
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit
  },
});

/* ─── Organization Configuration ─────────────────────────────── */

// Get organization configuration (all authenticated users)
router.get("/organization", authenticateJwt, letterConfigController.getOrganizationConfig);

// Update organization configuration

// Upload organization logo

/* ─── Letter Layout Configuration ─────────────────────────────── */

// Get all letter layouts

// Get active letter layout (all authenticated users)
router.get("/layouts/active", authenticateJwt, letterConfigController.getActiveLetterLayout);

// Activate a specific letter layout

/* ─── Placeholders & Categories ─────────────────────────────── */

// Get available placeholders (all authenticated users)
router.get("/placeholders", authenticateJwt, letterConfigController.getAvailablePlaceholders);

// Get letter categories (all authenticated users)
router.get("/categories", authenticateJwt, letterConfigController.getLetterCategories);

module.exports = router;
