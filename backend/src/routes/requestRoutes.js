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
const { authorize, requireScopeFilter } = require("../middleware/authorize"); // NEW: Use authorize
const { authenticateJwt } = require("../middleware/authMiddleware");

const router = express.Router();

// Preview (all authenticated users)
router.get("/preview", authenticateJwt, previewLeaveDates);

// Pending requests - MUST BE BEFORE /:uuid
router.get("/pending", 
  authenticateJwt,
  authorize({ permissions: 'leave.view_pending' }), // FIXED: Removed Dashboard from OR list
  requireScopeFilter('leave'),
  getPendingRequests
);

// Admin routes (requires leave management permission with scope)
router.get("/admin/all", 
  authenticateJwt,
  authorize({ permissions: 'leave.view_all' }),
  requireScopeFilter('leave'),
  getAdminRequests
);

// Employee requests - MUST BE BEFORE /:uuid to avoid matching "employee" as uuid
router.get("/employee/:uuid", 
  authenticateJwt,
  authorize({
    permissions: 'leave.view_all',
    allowSelfAccess: true,
    getResourceOwnerId: (req) => req.params.uuid
  }),
  getEmployeeRequests
);

// Create request (all employees)
router.post("/", 
  authenticateJwt,
  authorize({ permissions: 'leave.create_own' }), // FIXED: Explicit permission
  uploadRequestDocuments,
  createRequest
);

// Get single request with complete details (self-access OR permission)
router.get("/:uuid", 
  authenticateJwt,
  authorize({
    permissions: 'leave.view_all',
    allowSelfAccess: true,
    getResourceOwnerId: (req) => {
      // Ownership validated in controller
      return null; // Defer to controller for actual check
    }
  }),
  getRequestById
);

// Document management
router.get("/:uuid/documents", 
  authenticateJwt,
  authorize({
    permissions: 'leave.view_all',
    allowSelfAccess: true,
    getResourceOwnerId: (req) => null // Defer to controller
  }),
  getRequestDocuments
);

router.post("/:uuid/documents",
  authenticateJwt,
  authorize({ permissions: 'leave.update_own' }), // FIXED: Explicit permission
  uploadRequestDocuments,
  addRequestDocuments
);

router.get("/:uuid/documents/:documentUuid/content",
  authenticateJwt,
  authorize({ permissions: 'leave.view_all', allowSelfAccess: true }),
  streamRequestDocumentContent
);

router.put("/:uuid/documents/:documentUuid",
  authenticateJwt,
  authorize({ permissions: 'leave.update_own' }), // FIXED
  uploadSingleRequestDocument,
  replaceRequestDocument
);

router.delete("/:uuid/documents/:documentUuid",
  authenticateJwt,
  authorize({ permissions: 'leave.update_own' }), // FIXED
  deleteRequestDocument
);

// Update/shorten requests
router.patch("/:uuid",
  authenticateJwt,
  authorize({ permissions: 'leave.update_own' }), // FIXED
  updateRequest
);

router.patch("/:uuid/shorten",
  authenticateJwt,
  authorize({ permissions: 'leave.shorten' }),
  shortenApprovedRequest
);

// Department decision
router.patch("/:uuid/department-decision", 
  authenticateJwt,
  authorize({ permissions: 'leave.approve' }), // FIXED: Removed Dashboard from OR list
  departmentApproveRejectRequest
);

// Cancel request
router.patch("/:uuid/cancel",
  authenticateJwt,
  authorize({ permissions: 'leave.cancel_own' }), // FIXED
  cancelRequest
);

module.exports = router;
