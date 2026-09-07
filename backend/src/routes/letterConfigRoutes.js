const express = require("express");
const router = express.Router();
const letterConfigController = require("../controllers/letterConfigController");
const { authenticateJwt } = require("../middleware/authMiddleware");
const { requirePermission } = require("../middleware/requirePermission");
const multer = require("multer");

// Configure multer for logo upload
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit
  },
});

// Letters occupation allows managing letter configuration
const canManageLetterConfig = requirePermission({ 
  occupations: 'Letters' 
});

/* ─── Organization Configuration ─────────────────────────────── */

// Get organization configuration (all authenticated users)
router.get(
  "/organization",
  authenticateJwt,
  letterConfigController.getOrganizationConfig
);

// Update organization configuration (requires Letters occupation)
router.put(
  "/organization",
  canManageLetterConfig,
  letterConfigController.updateOrganizationConfig
);

// Upload organization logo (requires Letters occupation)
router.post(
  "/organization/logo",
  canManageLetterConfig,
  upload.single("logo"),
  letterConfigController.uploadOrganizationLogo
);

/* ─── Letter Layout Configuration ─────────────────────────────── */

// Get all letter layouts (requires Letters occupation)
router.get(
  "/layouts",
  canManageLetterConfig,
  letterConfigController.getLetterLayouts
);

// Get active letter layout (all authenticated users)
router.get(
  "/layouts/active",
  authenticateJwt,
  letterConfigController.getActiveLetterLayout
);

// Activate a specific letter layout (requires Letters occupation)
router.post(
  "/layouts/:id/activate",
  canManageLetterConfig,
  letterConfigController.activateLetterLayout
);

/* ─── Placeholders & Categories ─────────────────────────────── */

// Get available placeholders (all authenticated users)
router.get(
  "/placeholders",
  authenticateJwt,
  letterConfigController.getAvailablePlaceholders
);

// Get letter categories (all authenticated users)
router.get(
  "/categories",
  authenticateJwt,
  letterConfigController.getLetterCategories
);

module.exports = router;
