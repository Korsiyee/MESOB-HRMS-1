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
const { authorize, requireScopeFilter } = require("../middleware/authorize");
const { authenticateJwt } = require("../middleware/authMiddleware");
const { requireCompanyWifi } = require("../middleware/requireCompanyWifi");

const router = express.Router();

// Helper middleware for self-access OR permission
const allowSelfOrPermission = (permission) => {
  return (req, res, next) => {
    const isSelf = req.params.uuid === req.user.employee_uuid;
    if (isSelf) return next();
    return authorize(permission)(req, res, next);
  };
};

// Self-Service Punch - All authenticated users with company Wi-Fi
// MUST be before /:uuid routes to avoid route conflicts
router.post("/self-punch", authenticateJwt, requireCompanyWifi, selfPunch);
router.get("/self-punch/today", authenticateJwt, getTodayPunchStatus);

// Analytics (before /:uuid) - with scope filtering for Dept Heads
router.get("/analytics/summary", 
  authorize("Attendance.View"),
  requireScopeFilter('attendance'),
  getOverviewSummary
);
router.get("/analytics/trend", 
  authorize("Attendance.View"),
  requireScopeFilter('attendance'),
  getAttendanceTrend
);
router.get("/analytics/departments", 
  authorize("Attendance.View"),
  requireScopeFilter('attendance'),
  getDepartmentStats
);
router.get("/analytics/top-employees", 
  authorize("Attendance.View"),
  requireScopeFilter('attendance'),
  getTopEmployees
);
router.get("/analytics/corrections", 
  authorize("Attendance.View"),
  requireScopeFilter('attendance'),
  getRecentCorrections
);

// Admin CRUD - with scope filtering
router.get("/admin/all", 
  authorize("Attendance.View"),
  requireScopeFilter('attendance'),
  getAllAttendance
);
router.post("/", authorize("Attendance.Create"), createAttendance);
router.post("/log", authorize("Attendance.Create"), logAttendance);
router.post("/delete-by-date", authorize("Attendance.Delete"), deleteAttendanceByEmployeeAndDate);
router.patch("/:uuid/correct", authorize("Attendance.Update"), correctAttendance);
router.delete("/:uuid", authorize("Attendance.Delete"), deleteAttendance);

// Per-employee view (READ ONLY) - Self-access OR permission
router.get("/:uuid/today-status", allowSelfOrPermission("Attendance.View"), getTodayStatus);
router.get("/:uuid/summary", allowSelfOrPermission("Attendance.View"), getEmployeeSummary);
router.get("/:uuid", allowSelfOrPermission("Attendance.View"), getEmployeeAttendance);

module.exports = router;
