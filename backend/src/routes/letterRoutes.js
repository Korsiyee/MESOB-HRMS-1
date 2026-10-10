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
// Use module-level authorization
const { requireModule, checkSelfAccess } = require("../middleware/moduleAuth");
const { authenticateJwt } = require("../middleware/authMiddleware");
const {
  uploadSingle,
  handleUploadError,
} = require("../middleware/templateUploadMiddleware");

const router = express.Router();

// Utility endpoints (all authenticated users)
router.get("/placeholders", authenticateJwt, getPlaceholders);

// Templates — read is open to all authenticated users; write requires LETTERS module
router.get("/templates", authenticateJwt, listLetterTemplates);
router.post("/templates", requireModule('LETTERS'), uploadSingle, handleUploadError, createLetterTemplate);
router.patch("/templates/:uuid", requireModule('LETTERS'), updateLetterTemplate);
router.delete("/templates/:uuid", requireModule('LETTERS'), deleteLetterTemplate);

// PDF template preview and download (all authenticated users)
router.get("/templates/:uuid/preview", authenticateJwt, getTemplatePDFPreview);
router.get("/templates/:uuid/download", authenticateJwt, downloadTemplatePDF);

// Letter generation & retrieval
router.post("/generate", requireModule('LETTERS'), generateLetter);
router.get("/employee/:uuid", checkSelfAccess('LETTERS'), listIssuedLetters);
router.get("/:uuid/content", authenticateJwt, downloadLetterContent);

// Letter requests - employee workflow (always allowed)
router.post("/request", authenticateJwt, requestLetter);
router.get("/requests/my", authenticateJwt, getMyLetterRequests);
router.delete("/requests/:uuid", authenticateJwt, cancelLetterRequest);

// Letter requests - HR workflow with scope filtering
router.get("/requests/pending", requireModule('LETTERS'), getPendingLetterRequests);
router.get("/requests/all", requireModule('LETTERS'), getAllLetterRequests);
router.post("/requests/:uuid/approve", requireModule('LETTERS'), approveLetterRequest);
router.post("/requests/:uuid/reject", requireModule('LETTERS'), rejectLetterRequest);

module.exports = router;
