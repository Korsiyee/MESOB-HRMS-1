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
const { authorize, requireScopeFilter } = require("../middleware/authorize");
const { authenticateJwt } = require("../middleware/authMiddleware");

// Helper middleware for self-access OR permission
const allowSelfOrPermission = (permission) => {
  return (req, res, next) => {
    const isSelf = req.params.uuid === req.user.employee_uuid;
    if (isSelf) return next();
    return authorize(permission)(req, res, next);
  };
};

const router = express.Router();

// Draft endpoints
router.post("/draft", authorize("Employees.Create"), saveDraft);
router.get("/draft/:uuid", authorize("Employees.Create"), getDraft);

// Employee creation
router.post("/", authorize("Employees.Create"), createEmployee);

// List all employees (with scope filtering for Dept Heads)
router.get("/", 
  authorize(["Employees.View", "Attendance.View", "Shifts.View"]),
  requireScopeFilter('employee'),
  listEmployees
);

// Search employees for attendance (with scope filtering)
router.get("/search/attendance", 
  authorize("Attendance.View"),
  requireScopeFilter('employee'),
  searchEmployeesForAttendance
);

// Department head specific endpoints
router.get("/dept-head/stats", authorize("Dashboard.View"), getDeptHeadStats);
router.get("/dept-head/employees", 
  authorize("Employees.View"),
  requireScopeFilter('employee'),
  getDeptEmployees
);

// Employee dashboard (self-access OR permission)
router.get("/:uuid/dashboard", allowSelfOrPermission("Employees.View"), getEmployeeDashboard);

// Get single employee (self-access OR permission)
router.get("/:uuid", allowSelfOrPermission("Employees.View"), getEmployee);

// Update employee
router.patch("/:uuid", authorize("Employees.Update"), updateEmployee);
router.patch("/:uuid/status", authorize("Employees.Update"), updateEmployeeStatus);

// Photo upload
router.post("/:uuid/photo", authorize("Employees.Update"), uploadPhoto, uploadEmployeePhoto);

// Documents (self-access OR permission)
router.get("/:uuid/documents", allowSelfOrPermission("Employees.View"), listEmployeeDocuments);
router.post("/:uuid/documents", authorize("Employees.Update"), uploadEmployeeDocuments, addEmployeeDocument);
router.delete("/:uuid/documents/:docUuid", authorize("Employees.Update"), removeEmployeeDocument);

// Shift (self-access OR permission)
router.get("/:uuid/shift", allowSelfOrPermission("Shifts.View"), getEmployeeShift);

module.exports = router;
