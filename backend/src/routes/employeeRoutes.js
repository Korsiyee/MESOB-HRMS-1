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
// Use module-level authorization
const { requireModule, withScope, checkSelfAccess } = require("../middleware/moduleAuth");
const { authenticateJwt } = require("../middleware/authMiddleware");

const router = express.Router();

// Draft endpoints
router.post("/draft", requireModule('EMPLOYEES'), saveDraft);
router.get("/draft/:uuid", requireModule('EMPLOYEES'), getDraft);

// Employee creation
router.post("/", requireModule('EMPLOYEES'), createEmployee);

// List all employees with scope filtering
router.get("/", requireModule('EMPLOYEES'), withScope(), listEmployees);

// Search employees for attendance
router.get("/search/attendance", requireModule('ATTENDANCE'), searchEmployeesForAttendance);

// Department head specific endpoints
router.get("/dept-head/stats", requireModule('HOME'), getDeptHeadStats);
router.get("/dept-head/employees", requireModule('EMPLOYEES'), withScope(), getDeptEmployees);

// Employee dashboard (self-access always allowed)
router.get("/:uuid/dashboard", checkSelfAccess(), getEmployeeDashboard);

// Get single employee (self-access OR has EMPLOYEES module)
router.get("/:uuid", checkSelfAccess('EMPLOYEES'), getEmployee);

// Update employee
router.patch("/:uuid", requireModule('EMPLOYEES'), updateEmployee);
router.patch("/:uuid/status", requireModule('EMPLOYEES'), updateEmployeeStatus);

// Photo upload
router.post("/:uuid/photo", requireModule('EMPLOYEES'), uploadPhoto, uploadEmployeePhoto);

// Documents (self-access OR has EMPLOYEES module)
router.get("/:uuid/documents", checkSelfAccess('EMPLOYEES'), listEmployeeDocuments);
router.post("/:uuid/documents", requireModule('EMPLOYEES'), uploadEmployeeDocuments, addEmployeeDocument);
router.delete("/:uuid/documents/:docUuid", requireModule('EMPLOYEES'), removeEmployeeDocument);

// Shift (always allow self-access)
router.get("/:uuid/shift", checkSelfAccess(), getEmployeeShift);

module.exports = router;
