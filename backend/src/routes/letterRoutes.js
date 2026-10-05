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
// NEW: Use Permit middleware instead of old RBAC
const { authorize, allowSelfOr } = require("../middleware/permitMiddleware");
const { authenticateJwt } = require("../middleware/authMiddleware");
const {
  uploadSingle,
  handleUploadError,
} = require("../middleware/templateUploadMiddleware");

const router = express.Router();

// Utility endpoints (all authenticated users)
router.get("/placeholders", authenticateJwt, getPlaceholders);

// Templates — read is open to all authenticated users; write requires permission
router.get("/templates", authenticateJwt, listLetterTemplates);
router.post("/templates", authorize("create", "letters"), uploadSingle, handleUploadError, createLetterTemplate);
router.patch("/templates/:uuid", authorize("update", "letters"), updateLetterTemplate);
router.delete("/templates/:uuid", authorize("delete", "letters"), deleteLetterTemplate);

// PDF template preview and download (all authenticated users)
router.get("/templates/:uuid/preview", authenticateJwt, getTemplatePDFPreview);
router.get("/templates/:uuid/download", authenticateJwt, downloadTemplatePDF);

// Letter generation & retrieval
router.post("/generate", authorize("create", "letters"), generateLetter);
router.get("/employee/:uuid", 
  allowSelfOr("view", "letters", req => req.params.uuid),
  listIssuedLetters
);
router.get("/:uuid/content", authenticateJwt, downloadLetterContent);

// Letter requests - employee workflow
router.post("/request", authenticateJwt, requestLetter);
router.get("/requests/my", authenticateJwt, getMyLetterRequests);
router.delete("/requests/:uuid", authenticateJwt, cancelLetterRequest);

// Letter requests - HR workflow - scope filtering in controller
router.get("/requests/pending", 
  authorize("approve", "letters"),
  getPendingLetterRequests
);
router.get("/requests/all", 
  authorize("view", "letters"),
  getAllLetterRequests
);
router.post("/requests/:uuid/approve", authorize("approve", "letters"), approveLetterRequest);
router.post("/requests/:uuid/reject", authorize("approve", "letters"), rejectLetterRequest);

module.exports = router;
