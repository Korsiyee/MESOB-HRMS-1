const express = require("express");
const {
  createRequest,
  getRequestDocuments,
  streamRequestDocumentContent,
  addRequestDocuments,
  replaceRequestDocument,
  deleteRequestDocument,
  updateRequest,
  shortenApprovedRequest,
  getPendingRequests,
  getAdminRequests,
  getEmployeeRequests,
  previewLeaveDates,
  departmentApproveRejectRequest,
  getRequestById,
  cancelRequest,
} = require("../controllers/requestController");
const {
  uploadRequestDocuments,
  uploadSingleRequestDocument,
} = require("../middleware/requestUploadMiddleware");
// NEW: Use Permit middleware instead of old RBAC
const { authorize, allowSelfOr } = require("../middleware/permitMiddleware");
const { authenticateJwt } = require("../middleware/authMiddleware");

const router = express.Router();

// Preview (all authenticated users)
router.get("/preview", authenticateJwt, previewLeaveDates);

// Pending requests - MUST BE BEFORE /:uuid
router.get("/pending", 
  authenticateJwt,
  authorize("view", "requests"),
  getPendingRequests
);

// Admin routes (requires request management permission)
router.get("/admin/all", 
  authenticateJwt,
  authorize("view", "requests"),
  getAdminRequests
);

// Employee requests - MUST BE BEFORE /:uuid to avoid matching "employee" as uuid
router.get("/employee/:uuid", 
  authenticateJwt,
  allowSelfOr("view", "requests", req => req.params.uuid),
  getEmployeeRequests
);

// Create request (all employees)
router.post("/", 
  authenticateJwt,
  authorize("create", "requests"),
  uploadRequestDocuments,
  createRequest
);

// Get single request with complete details (self-access OR permission)
router.get("/:uuid", 
  authenticateJwt,
  authorize("view", "requests"), // Ownership validation in controller
  getRequestById
);

// Document management
router.get("/:uuid/documents", 
  authenticateJwt,
  authorize("view", "requests"), // Ownership validation in controller
  getRequestDocuments
);

router.post("/:uuid/documents",
  authenticateJwt,
  authorize("update", "requests"),
  uploadRequestDocuments,
  addRequestDocuments
);

router.get("/:uuid/documents/:documentUuid/content",
  authenticateJwt,
  authorize("view", "requests"),
  streamRequestDocumentContent
);

router.put("/:uuid/documents/:documentUuid",
  authenticateJwt,
  authorize("update", "requests"),
  uploadSingleRequestDocument,
  replaceRequestDocument
);

router.delete("/:uuid/documents/:documentUuid",
  authenticateJwt,
  authorize("update", "requests"),
  deleteRequestDocument
);

// Update/shorten requests
router.patch("/:uuid",
  authenticateJwt,
  authorize("update", "requests"),
  updateRequest
);

router.patch("/:uuid/shorten",
  authenticateJwt,
  authorize("update", "requests"),
  shortenApprovedRequest
);

// Department decision (approval/rejection)
router.patch("/:uuid/department-decision", 
  authenticateJwt,
  authorize("approve", "requests"),
  departmentApproveRejectRequest
);

// Cancel request
router.patch("/:uuid/cancel",
  authenticateJwt,
  authorize("delete", "requests"),
  cancelRequest
);

module.exports = router;
