const express = require("express");
const {
  listLetterTemplates,
  createLetterTemplate,
  updateLetterTemplate,
  deleteLetterTemplate,
  generateLetter,
  listIssuedLetters,
  downloadLetterContent,
  getTemplatePDFPreview,
  downloadTemplatePDF,
  requestLetter,
  getMyLetterRequests,
  getPendingLetterRequests,
  getAllLetterRequests,
  approveLetterRequest,
  rejectLetterRequest,
  cancelLetterRequest,
  getPlaceholders,
} = require("../controllers/letterController");
const { requirePermission, requirePermissionOrSelfAccess } = require("../middleware/requirePermission");
const { requireScope } = require("../middleware/requireScope");
const { authenticateJwt } = require("../middleware/authMiddleware");
const {
  uploadSingle,
  handleUploadError,
} = require("../middleware/templateUploadMiddleware");

const router = express.Router();

// Letters occupation allows managing letters
const canManageLetters = requirePermission({ 
  occupations: 'Letters' 
});

// Utility endpoints (all authenticated users)
router.get("/placeholders", authenticateJwt, getPlaceholders);

// Templates — read is open to all authenticated users; write requires Letters occupation
router.get("/templates", authenticateJwt, listLetterTemplates);
router.post("/templates", canManageLetters, uploadSingle, handleUploadError, createLetterTemplate);
router.patch("/templates/:uuid", canManageLetters, updateLetterTemplate);
router.delete("/templates/:uuid", canManageLetters, deleteLetterTemplate);

// PDF template preview and download (all authenticated users)
router.get("/templates/:uuid/preview", authenticateJwt, getTemplatePDFPreview);
router.get("/templates/:uuid/download", authenticateJwt, downloadTemplatePDF);

// Letter generation & retrieval
router.post("/generate", canManageLetters, generateLetter);
router.get("/employee/:uuid", 
  requirePermissionOrSelfAccess({
    occupations: 'Letters',
    isSelfAccess: (req) => req.params.uuid === req.user.employee_uuid
  }),
  listIssuedLetters
);
router.get("/:uuid/content", authenticateJwt, downloadLetterContent);

// Letter requests - employee workflow
router.post("/request", authenticateJwt, requestLetter);
router.get("/requests/my", authenticateJwt, getMyLetterRequests);
router.delete("/requests/:uuid", authenticateJwt, cancelLetterRequest);

// Letter requests - HR workflow - requires Letters occupation
router.get("/requests/pending", 
  canManageLetters, 
  requireScope('letter'),
  getPendingLetterRequests
);
router.get("/requests/all", 
  canManageLetters, 
  requireScope('letter'),
  getAllLetterRequests
);
router.post("/requests/:uuid/approve", canManageLetters, approveLetterRequest);
router.post("/requests/:uuid/reject", canManageLetters, rejectLetterRequest);

module.exports = router;
