const express = require("express");
const router = express.Router();
const enhancedLetterController = require("../controllers/enhancedLetterController");
const { authenticateJwt } = require("../middleware/authMiddleware");
const { requirePermission } = require("../middleware/requirePermission");

// Letters occupation allows managing letter templates
const canManageLetterTemplates = requirePermission({ 
  occupations: 'Letters' 
});

/* ─── Template Management ─────────────────────────────── */

// Create template (body only, uses master layout)
router.post(
  "/templates",
  canManageLetterTemplates,
  enhancedLetterController.createEnhancedLetterTemplate
);

// Update template
router.put(
  "/templates/:uuid",
  canManageLetterTemplates,
  enhancedLetterController.updateEnhancedLetterTemplate
);

// Get templates by category (all authenticated users)
router.get(
  "/templates/category/:category",
  authenticateJwt,
  enhancedLetterController.getTemplatesByCategory
);

// Get template version history (requires Letters occupation)
router.get(
  "/templates/:uuid/versions",
  canManageLetterTemplates,
  enhancedLetterController.getTemplateVersionHistory
);

/* ─── Letter Generation ─────────────────────────────── */

// Generate and download letter as PDF (requires Letters occupation)
router.post(
  "/generate",
  canManageLetterTemplates,
  enhancedLetterController.generateEnhancedLetter
);

// Preview letter without saving (all authenticated users)
router.post(
  "/preview",
  authenticateJwt,
  enhancedLetterController.previewEnhancedLetter
);

module.exports = router;
