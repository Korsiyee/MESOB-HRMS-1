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
// Use module-level authorization (requests are part of LEAVE module)
const { requireModule, checkSelfAccess } = require("../middleware/moduleAuth");
const { authenticateJwt } = require("../middleware/authMiddleware");

const router = express.Router();

// Preview (all authenticated users)
router.get("/preview", authenticateJwt, previewLeaveDates);

// Pending requests - MUST BE BEFORE /:uuid
router.get("/pending", requireModule('LEAVE_REQUESTS'), getPendingRequests);

// Admin routes with scope filtering
router.get("/admin/all", requireModule('LEAVE_REQUESTS'), getAdminRequests);

// Employee requests - self-access or LEAVE module
router.get("/employee/:uuid", checkSelfAccess('LEAVE_REQUESTS'), getEmployeeRequests);

// Create request (all employees allowed)
router.post("/", authenticateJwt, uploadRequestDocuments, createRequest);

// Get single request - requires LEAVE module or ownership check in controller
router.get("/:uuid", requireModule('LEAVE_REQUESTS'), getRequestById);

// Document management
router.get("/:uuid/documents", requireModule('LEAVE_REQUESTS'), getRequestDocuments);
router.post("/:uuid/documents", requireModule('LEAVE_REQUESTS'), uploadRequestDocuments, addRequestDocuments);
router.get("/:uuid/documents/:documentUuid/content", requireModule('LEAVE_REQUESTS'), streamRequestDocumentContent);
router.put("/:uuid/documents/:documentUuid", requireModule('LEAVE_REQUESTS'), uploadSingleRequestDocument, replaceRequestDocument);
router.delete("/:uuid/documents/:documentUuid", requireModule('LEAVE_REQUESTS'), deleteRequestDocument);

// Update/shorten requests
router.patch("/:uuid", requireModule('LEAVE_REQUESTS'), updateRequest);
router.patch("/:uuid/shorten", requireModule('LEAVE_REQUESTS'), shortenApprovedRequest);

// Department decision (approval/rejection)
router.patch("/:uuid/department-decision", requireModule('LEAVE_REQUESTS'), departmentApproveRejectRequest);

// Cancel request
router.patch("/:uuid/cancel", requireModule('LEAVE_REQUESTS'), cancelRequest);

module.exports = router;
