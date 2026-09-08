const express = require("express");
const router = express.Router();
const letterConfigController = require("../controllers/letterConfigController");
const { authenticateJwt } = require("../middleware/authMiddleware");
const { authorize } = require("../middleware/authorize");
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
router.put("/organization", authorize("Letters.Update"), letterConfigController.updateOrganizationConfig);

// Upload organization logo
router.post("/organization/logo", authorize("Letters.Update"), upload.single("logo"), letterConfigController.uploadOrganizationLogo);

/* ─── Letter Layout Configuration ─────────────────────────────── */

// Get all letter layouts
router.get("/layouts", authorize("Letters.View"), letterConfigController.getLetterLayouts);

// Get active letter layout (all authenticated users)
router.get("/layouts/active", authenticateJwt, letterConfigController.getActiveLetterLayout);

// Activate a specific letter layout
router.post("/layouts/:id/activate", authorize("Letters.Update"), letterConfigController.activateLetterLayout);

/* ─── Placeholders & Categories ─────────────────────────────── */

// Get available placeholders (all authenticated users)
router.get("/placeholders", authenticateJwt, letterConfigController.getAvailablePlaceholders);

// Get letter categories (all authenticated users)
router.get("/categories", authenticateJwt, letterConfigController.getLetterCategories);

module.exports = router;
