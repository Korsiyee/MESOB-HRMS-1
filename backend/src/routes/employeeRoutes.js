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
const { requirePermission, requirePermissionOrSelfAccess } = require("../middleware/requirePermission");
const { requireScope } = require("../middleware/requireScope");
const { authenticateJwt } = require("../middleware/authMiddleware");

const router = express.Router();

// Authorization helpers using new RBAC middleware
const canRegisterEmployee = requirePermission({ 
  occupations: 'Employees - Registration' 
});

const canViewEmployees = requirePermission({ 
  occupations: [
    'Employees - Overview',
    'Employees - Registration',
    'Attendance - Overview',
    'Attendance - Manage',
    'Shifts - Overview',
    'Shifts - Add'
  ],
  logic: 'OR'
});

const canViewEmployeeAttendance = requirePermission({ 
  occupations: 'Attendance - Overview' 
});

const canViewDashboard = requirePermission({ 
  occupations: 'Dashboard' 
});

// Draft endpoints (no scope needed - drafts are pre-creation)
router.post("/draft", canRegisterEmployee, saveDraft);
router.get("/draft/:uuid", canRegisterEmployee, getDraft);

// Employee creation (no scope needed - creates new employee)
router.post("/", canRegisterEmployee, createEmployee);

// List all employees (with scope filtering)
router.get("/", 
  canViewEmployees, 
  requireScope('employee'),
  listEmployees
);

// Search employees for attendance (with scope filtering)
router.get("/search/attendance", 
  canViewEmployeeAttendance, 
  requireScope('employee'),
  searchEmployeesForAttendance
);

// Department head specific endpoints (with scope filtering)
router.get("/dept-head/stats", canViewDashboard, getDeptHeadStats);
router.get("/dept-head/employees", 
  requirePermission({ occupations: 'Employees - Overview' }),
  requireScope('employee'),
  getDeptEmployees
);

// Employee dashboard (self-access OR permission)
router.get("/:uuid/dashboard", 
  requirePermissionOrSelfAccess({
    occupations: 'Employees - Overview',
    isSelfAccess: (req) => req.params.uuid === req.user.employee_uuid
  }),
  getEmployeeDashboard
);

// Get single employee (self-access OR permission with scope)
router.get("/:uuid", 
  requirePermissionOrSelfAccess({
    occupations: 'Employees - Overview',
    isSelfAccess: (req) => req.params.uuid === req.user.employee_uuid
  }),
  getEmployee
);

// Update employee (no scope - specific UUID)
router.patch("/:uuid", canRegisterEmployee, updateEmployee);
router.patch("/:uuid/status", canRegisterEmployee, updateEmployeeStatus);

// Photo upload (no scope - specific UUID)
router.post("/:uuid/photo", canRegisterEmployee, uploadPhoto, uploadEmployeePhoto);

// Documents (self-access OR permission)
router.get("/:uuid/documents", 
  requirePermissionOrSelfAccess({
    occupations: 'Employees - Overview',
    isSelfAccess: (req) => req.params.uuid === req.user.employee_uuid
  }),
  listEmployeeDocuments
);
router.post("/:uuid/documents", canRegisterEmployee, uploadEmployeeDocuments, addEmployeeDocument);
router.delete("/:uuid/documents/:docUuid", canRegisterEmployee, removeEmployeeDocument);

// Shift (self-access OR permission)
router.get("/:uuid/shift", 
  requirePermissionOrSelfAccess({
    occupations: 'Shifts - Overview',
    isSelfAccess: (req) => req.params.uuid === req.user.employee_uuid
  }),
  getEmployeeShift
);

module.exports = router;
