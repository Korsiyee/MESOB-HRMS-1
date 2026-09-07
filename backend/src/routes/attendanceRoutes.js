const express = require("express");
const {
  logAttendance,
  createAttendance,
  getEmployeeAttendance,
  getEmployeeSummary,
  getAllAttendance,
  correctAttendance,
  deleteAttendance,
  deleteAttendanceByEmployeeAndDate,
  getOverviewSummary,
  getAttendanceTrend,
  getDepartmentStats,
  getTopEmployees,
  getRecentCorrections,
  getTodayStatus,
  selfPunch,
  getTodayPunchStatus,
} = require("../controllers/attendanceController");
const { requirePermission, requirePermissionOrSelfAccess } = require("../middleware/requirePermission");
const { requireScope } = require("../middleware/requireScope");
const { authenticateJwt } = require("../middleware/authMiddleware");
const { requireCompanyWifi } = require("../middleware/requireCompanyWifi");

const router = express.Router();

// Authorization helpers using new RBAC middleware
const canManageAttendance = requirePermission({ 
  occupations: 'Attendance - Manage' 
});

const canViewAttendance = requirePermission({ 
  occupations: 'Attendance - Overview' 
});

// Self-Service Punch - All authenticated users with company Wi-Fi
// MUST be before /:uuid routes to avoid route conflicts
router.post("/self-punch", authenticateJwt, requireCompanyWifi, selfPunch);
router.get("/self-punch/today", authenticateJwt, getTodayPunchStatus);

// Analytics (before /:uuid) - Requires Attendance - Overview with scope filtering
router.get("/analytics/summary", 
  canViewAttendance, 
  requireScope('attendance'),
  getOverviewSummary
);
router.get("/analytics/trend", 
  canViewAttendance, 
  requireScope('attendance'),
  getAttendanceTrend
);
router.get("/analytics/departments", 
  canViewAttendance, 
  requireScope('attendance'),
  getDepartmentStats
);
router.get("/analytics/top-employees", 
  canViewAttendance, 
  requireScope('attendance'),
  getTopEmployees
);
router.get("/analytics/corrections", 
  canViewAttendance, 
  requireScope('attendance'),
  getRecentCorrections
);

// Admin CRUD - Requires Attendance - Manage with scope filtering
router.get("/admin/all", 
  canViewAttendance, 
  requireScope('attendance'),
  getAllAttendance
);
router.post("/", canManageAttendance, createAttendance);
router.post("/log", canManageAttendance, logAttendance);
router.post("/delete-by-date", canManageAttendance, deleteAttendanceByEmployeeAndDate);
router.patch("/:uuid/correct", canManageAttendance, correctAttendance);
router.delete("/:uuid", canManageAttendance, deleteAttendance);

// Per-employee view (READ ONLY) - Self-access OR permission with scope
router.get("/:uuid/today-status", 
  requirePermissionOrSelfAccess({
    occupations: 'Attendance - Overview',
    isSelfAccess: (req) => req.params.uuid === req.user.employee_uuid
  }),
  getTodayStatus
);
router.get("/:uuid/summary", 
  requirePermissionOrSelfAccess({
    occupations: 'Attendance - Overview',
    isSelfAccess: (req) => req.params.uuid === req.user.employee_uuid
  }),
  getEmployeeSummary
);
router.get("/:uuid", 
  requirePermissionOrSelfAccess({
    occupations: 'Attendance - Overview',
    isSelfAccess: (req) => req.params.uuid === req.user.employee_uuid
  }),
  getEmployeeAttendance
);

module.exports = router;
