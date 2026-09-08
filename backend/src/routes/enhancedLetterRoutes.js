const express = require("express");
const router = express.Router();
const enhancedLetterController = require("../controllers/enhancedLetterController");
const { authenticateJwt } = require("../middleware/authMiddleware");
const { authorize } = require("../middleware/authorize");

/* ─── Template Management ─────────────────────────────── */

// Create template (body only, uses master layout)
router.post("/templates", authorize("Letters.Create"), enhancedLetterController.createEnhancedLetterTemplate);

// Update template
router.put("/templates/:uuid", authorize("Letters.Update"), enhancedLetterController.updateEnhancedLetterTemplate);

// Get templates by category (all authenticated users)
router.get("/templates/category/:category", authenticateJwt, enhancedLetterController.getTemplatesByCategory);

// Get template version history
router.get("/templates/:uuid/versions", authorize("Letters.View"), enhancedLetterController.getTemplateVersionHistory);

/* ─── Letter Generation ─────────────────────────────── */

// Generate and download letter as PDF
router.post("/generate", authorize("Letters.Create"), enhancedLetterController.generateEnhancedLetter);

// Preview letter without saving (all authenticated users)
router.post("/preview", authenticateJwt, enhancedLetterController.previewEnhancedLetter);

module.exports = router;
