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
router.get("/organization", authenticateJwt, letterConfigController.getOrganizationConfig);
router.put("/organization", authenticateJwt, letterConfigController.updateOrganizationConfig);
router.post("/organization/logo", authenticateJwt, upload.single("logo"), letterConfigController.uploadOrganizationLogo);

/* ─── Letter Layout Configuration ─────────────────────────────── */
router.get("/layouts", authenticateJwt, letterConfigController.getLetterLayouts);
router.get("/layouts/active", authenticateJwt, letterConfigController.getActiveLetterLayout);
router.post("/layouts/:id/activate", authenticateJwt, letterConfigController.activateLetterLayout);

/* ─── Placeholders & Categories ─────────────────────────────── */
router.get("/placeholders", authenticateJwt, letterConfigController.getAvailablePlaceholders);
router.get("/categories", authenticateJwt, letterConfigController.getLetterCategories);

module.exports = router;
