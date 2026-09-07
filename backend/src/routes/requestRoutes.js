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
const { requirePermission, requirePermissionOrSelfAccess } = require("../middleware/requirePermission");
const { requireScope } = require("../middleware/requireScope");
const { authenticateJwt } = require("../middleware/authMiddleware");

const router = express.Router();

// Authorization helpers using new RBAC middleware
const canManageLeaveRequests = requirePermission({ 
  occupations: 'Leave - Manage Requests' 
});

const canViewPendingRequests = requirePermission({ 
  occupations: ['Leave - Manage Requests', 'Dashboard'],
  logic: 'OR'
});

// Preview (all authenticated users)
router.get("/preview", authenticateJwt, previewLeaveDates);

// Pending requests (DEPARTMENT_HEAD or Leave - Manage Requests) - MUST BE BEFORE /:uuid
router.get("/pending", 
  canViewPendingRequests,
  requireScope('leave'),
  getPendingRequests
);

// Admin routes (requires Leave - Manage Requests with scope)
router.get("/admin/all", 
  canManageLeaveRequests, 
  requireScope('leave'),
  getAdminRequests
);

// Employee requests - MUST BE BEFORE /:uuid to avoid matching "employee" as uuid
router.get("/employee/:uuid", 
  requirePermissionOrSelfAccess({
    occupations: 'Leave - Overview',
    isSelfAccess: (req) => req.params.uuid === req.user.employee_uuid
  }),
  getEmployeeRequests
);

// Create request (all employees)
router.post("/", authenticateJwt, uploadRequestDocuments, createRequest);

// Get single request with complete details (self-access OR permission)
router.get("/:uuid", 
  requirePermissionOrSelfAccess({
    occupations: 'Leave - Overview',
    isSelfAccess: (req) => {
      // Will be validated in controller against request owner
      return true; // Defer to controller for owner check
    }
  }),
  getRequestById
);

// Document management (self-access OR permission)
router.get("/:uuid/documents", 
  requirePermissionOrSelfAccess({
    occupations: 'Leave - Overview',
    isSelfAccess: (req) => true // Defer to controller
  }),
  getRequestDocuments
);
router.post("/:uuid/documents", authenticateJwt, uploadRequestDocuments, addRequestDocuments);
router.get("/:uuid/documents/:documentUuid/content", authenticateJwt, streamRequestDocumentContent);
router.put("/:uuid/documents/:documentUuid", authenticateJwt, uploadSingleRequestDocument, replaceRequestDocument);
router.delete("/:uuid/documents/:documentUuid", authenticateJwt, deleteRequestDocument);

// Update/shorten requests
router.patch("/:uuid", authenticateJwt, updateRequest);
router.patch("/:uuid/shorten", canManageLeaveRequests, shortenApprovedRequest);

// Department decision
router.patch("/:uuid/department-decision", 
  requirePermission({ 
    occupations: ['Leave - Manage Requests', 'Dashboard'],
    logic: 'OR'
  }),
  departmentApproveRejectRequest
);

// Cancel request (employee who owns the request — auth enforced in service layer)
router.patch("/:uuid/cancel", authenticateJwt, cancelRequest);

module.exports = router;
