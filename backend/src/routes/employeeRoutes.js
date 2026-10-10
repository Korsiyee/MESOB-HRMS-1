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
  updateEmployeeRole,
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
// Use module-level authorization
const { requireModule, checkSelfAccess } = require("../middleware/moduleAuth");
const { authenticateJwt } = require("../middleware/authMiddleware");

const router = express.Router();

// Draft endpoints
router.post("/draft", requireModule('REGISTER_EMPLOYEE'), saveDraft);
router.get("/draft/:uuid", requireModule('REGISTER_EMPLOYEE'), getDraft);

// Employee creation
router.post("/", requireModule('REGISTER_EMPLOYEE'), createEmployee);

// List all employees (scope filtering handled in controller)
router.get("/", requireModule('EMPLOYEE_LIST'), listEmployees);

// Search employees for attendance
router.get("/search/attendance", requireModule('ATTENDANCE_RECORDS'), searchEmployeesForAttendance);

// Department head specific endpoints
router.get("/dept-head/stats", requireModule('EMPLOYEE_LIST'), getDeptHeadStats);
router.get("/dept-head/employees", requireModule('EMPLOYEE_LIST'), getDeptEmployees);

// Employee dashboard (self-access always allowed)
router.get("/:uuid/dashboard", checkSelfAccess(), getEmployeeDashboard);

// Get single employee (self-access OR has EMPLOYEES module)
router.get("/:uuid", checkSelfAccess('EMPLOYEE_PROFILE'), getEmployee);

// Update employee
router.patch("/:uuid", requireModule('EMPLOYEE_PROFILE'), updateEmployee);
router.patch("/:uuid/status", requireModule('EMPLOYEE_PROFILE'), updateEmployeeStatus);

// Update employee role (HR Admin/Super Admin only)
router.patch("/:uuid/role", requireModule('ACCOUNTS'), updateEmployeeRole);

// Photo upload
router.post("/:uuid/photo", requireModule('EMPLOYEE_PROFILE'), uploadPhoto, uploadEmployeePhoto);

// Documents (self-access OR has EMPLOYEES module)
router.get("/:uuid/documents", checkSelfAccess('EMPLOYEE_PROFILE'), listEmployeeDocuments);
router.post("/:uuid/documents", requireModule('EMPLOYEE_PROFILE'), uploadEmployeeDocuments, addEmployeeDocument);
router.delete("/:uuid/documents/:docUuid", requireModule('EMPLOYEE_PROFILE'), removeEmployeeDocument);

// Shift (always allow self-access)
router.get("/:uuid/shift", checkSelfAccess(), getEmployeeShift);

module.exports = router;
