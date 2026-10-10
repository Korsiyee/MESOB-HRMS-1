const express = require("express");
const router = express.Router();
const enhancedLetterController = require("../controllers/enhancedLetterController");
const { authenticateJwt } = require("../middleware/authMiddleware");

/* ─── Template Management ─────────────────────────────── */

// Create template (body only, uses master layout)
router.post("/templates", authenticateJwt, enhancedLetterController.createEnhancedLetterTemplate);

// Update template
router.put("/templates/:uuid", authenticateJwt, enhancedLetterController.updateEnhancedLetterTemplate);

// Get templates by category (all authenticated users)
router.get("/templates/category/:category", authenticateJwt, enhancedLetterController.getTemplatesByCategory);

// Get template version history
router.get("/templates/:uuid/versions", authenticateJwt, enhancedLetterController.getTemplateVersionHistory);

/* ─── Letter Generation ─────────────────────────────── */

// Generate and download letter as PDF
router.post("/generate", authenticateJwt, enhancedLetterController.generateEnhancedLetter);

// Preview letter without saving (all authenticated users)
router.post("/preview", authenticateJwt, enhancedLetterController.previewEnhancedLetter);

module.exports = router;
