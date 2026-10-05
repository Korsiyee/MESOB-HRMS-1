const express = require("express");
const {
  saveDraft,
  getDraft,
  createEmployee,
  listEmployees,
  getEmployee,
  getEmployeeDashboard,
  getDeptHeadStats,
  getDeptEmployees,
  updateEmployee,
  updateEmployeeStatus,
  uploadEmployeePhoto,
  listEmployeeDocuments,
  addEmployeeDocument,
  removeEmployeeDocument,
  getEmployeeShift,
  searchEmployeesForAttendance,
} = require("../controllers/employeeController");
const {
  uploadEmployeePhoto: uploadPhoto,
  uploadEmployeeDocuments,
} = require("../middleware/employeeUploadMiddleware");
// NEW: Use Permit middleware instead of old RBAC
const { authorize, allowSelfOr, requireAny } = require("../middleware/permitMiddleware");
const { authenticateJwt } = require("../middleware/authMiddleware");

const router = express.Router();

// Draft endpoints
router.post("/draft", authorize("create", "employees"), saveDraft);
router.get("/draft/:uuid", authorize("create", "employees"), getDraft);

// Employee creation
router.post("/", authorize("create", "employees"), createEmployee);

// List all employees (allow if user can view employees, attendance, or shifts)
router.get("/", 
  requireAny([
    { action: "view", resource: "employees" },
    { action: "view", resource: "attendance" },
    { action: "view", resource: "shifts" }
  ]),
  listEmployees
);

// Search employees for attendance
router.get("/search/attendance", 
  authorize("view", "attendance"),
  searchEmployeesForAttendance
);

// Department head specific endpoints
router.get("/dept-head/stats", authorize("view", "dashboard"), getDeptHeadStats);
router.get("/dept-head/employees", 
  authorize("view", "employees"),
  getDeptEmployees
);

// Employee dashboard (self-access OR permission)
router.get("/:uuid/dashboard", 
  allowSelfOr("view", "employees", req => req.params.uuid),
  getEmployeeDashboard
);

// Get single employee (self-access OR permission)
router.get("/:uuid", 
  allowSelfOr("view", "employees", req => req.params.uuid),
  getEmployee
);

// Update employee
router.patch("/:uuid", authorize("update", "employees"), updateEmployee);
router.patch("/:uuid/status", authorize("update", "employees"), updateEmployeeStatus);

// Photo upload
router.post("/:uuid/photo", authorize("update", "employees"), uploadPhoto, uploadEmployeePhoto);

// Documents (self-access OR permission)
router.get("/:uuid/documents", 
  allowSelfOr("view", "employees", req => req.params.uuid),
  listEmployeeDocuments
);
router.post("/:uuid/documents", authorize("update", "employees"), uploadEmployeeDocuments, addEmployeeDocument);
router.delete("/:uuid/documents/:docUuid", authorize("update", "employees"), removeEmployeeDocument);

// Shift (self-access OR permission)
router.get("/:uuid/shift", 
  allowSelfOr("view", "shifts", req => req.params.uuid),
  getEmployeeShift
);

module.exports = router;
