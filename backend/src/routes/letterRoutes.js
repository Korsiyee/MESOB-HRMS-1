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
const { authorize, requireScopeFilter } = require("../middleware/authorize");
const { authenticateJwt } = require("../middleware/authMiddleware");
const {
  uploadSingle,
  handleUploadError,
} = require("../middleware/templateUploadMiddleware");

const router = express.Router();

// Helper middleware for self-access OR permission
const allowSelfOrPermission = (permission) => {
  return (req, res, next) => {
    const isSelf = req.params.uuid === req.user.employee_uuid;
    if (isSelf) return next();
    return authorize(permission)(req, res, next);
  };
};

// Utility endpoints (all authenticated users)
router.get("/placeholders", authenticateJwt, getPlaceholders);

// Templates — read is open to all authenticated users; write requires permission
router.get("/templates", authenticateJwt, listLetterTemplates);
router.post("/templates", authorize("Letters.Create"), uploadSingle, handleUploadError, createLetterTemplate);
router.patch("/templates/:uuid", authorize("Letters.Update"), updateLetterTemplate);
router.delete("/templates/:uuid", authorize("Letters.Delete"), deleteLetterTemplate);

// PDF template preview and download (all authenticated users)
router.get("/templates/:uuid/preview", authenticateJwt, getTemplatePDFPreview);
router.get("/templates/:uuid/download", authenticateJwt, downloadTemplatePDF);

// Letter generation & retrieval
router.post("/generate", authorize("Letters.Create"), generateLetter);
router.get("/employee/:uuid", allowSelfOrPermission("Letters.View"), listIssuedLetters);
router.get("/:uuid/content", authenticateJwt, downloadLetterContent);

// Letter requests - employee workflow
router.post("/request", authenticateJwt, requestLetter);
router.get("/requests/my", authenticateJwt, getMyLetterRequests);
router.delete("/requests/:uuid", authenticateJwt, cancelLetterRequest);

// Letter requests - HR workflow - with scope filtering
router.get("/requests/pending", 
  authorize("Letters.Approve"),
  requireScopeFilter('letter'),
  getPendingLetterRequests
);
router.get("/requests/all", 
  authorize("Letters.View"),
  requireScopeFilter('letter'),
  getAllLetterRequests
);
router.post("/requests/:uuid/approve", authorize("Letters.Approve"), approveLetterRequest);
router.post("/requests/:uuid/reject", authorize("Letters.Approve"), rejectLetterRequest);

module.exports = router;
