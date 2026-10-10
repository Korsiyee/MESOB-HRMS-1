const express = require("express");
const router = express.Router();
const enhancedLetterController = require("../controllers/enhancedLetterController");
const { authenticateJwt } = require("../middleware/authMiddleware");

/* ─── Template Management ─────────────────────────────── */

// Create template (body only, uses master layout)

// Update template

// Get templates by category (all authenticated users)
router.get("/templates/category/:category", authenticateJwt, enhancedLetterController.getTemplatesByCategory);

// Get template version history

/* ─── Letter Generation ─────────────────────────────── */

// Generate and download letter as PDF

// Preview letter without saving (all authenticated users)
router.post("/preview", authenticateJwt, enhancedLetterController.previewEnhancedLetter);

module.exports = router;
