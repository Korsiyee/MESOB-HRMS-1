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
// Use module-level authorization
const { requireModule, checkSelfAccess } = require("../middleware/moduleAuth");
const { authenticateJwt } = require("../middleware/authMiddleware");
const { requireCompanyWifi } = require("../middleware/requireCompanyWifi");

const router = express.Router();

// Self-Service Punch - All authenticated users with company Wi-Fi
// MUST be before /:uuid routes to avoid route conflicts
router.post("/self-punch", authenticateJwt, requireCompanyWifi, selfPunch);
router.get("/self-punch/today", authenticateJwt, getTodayPunchStatus);

// Analytics - require ATTENDANCE module with scope filtering
router.get("/analytics/summary", requireModule('ATTENDANCE_RECORDS'), getOverviewSummary);
router.get("/analytics/trend", requireModule('ATTENDANCE_RECORDS'), getAttendanceTrend);
router.get("/analytics/departments", requireModule('ATTENDANCE_RECORDS'), getDepartmentStats);
router.get("/analytics/top-employees", requireModule('ATTENDANCE_RECORDS'), getTopEmployees);
router.get("/analytics/corrections", requireModule('ATTENDANCE_RECORDS'), getRecentCorrections);

// Admin CRUD - require ATTENDANCE module
router.get("/admin/all", requireModule('ATTENDANCE_RECORDS'), getAllAttendance);
router.post("/", requireModule('ATTENDANCE_RECORDS'), createAttendance);
router.post("/log", requireModule('ATTENDANCE_RECORDS'), logAttendance);
router.post("/delete-by-date", requireModule('ATTENDANCE_RECORDS'), deleteAttendanceByEmployeeAndDate);
router.patch("/:uuid/correct", requireModule('ATTENDANCE_RECORDS'), correctAttendance);
router.delete("/:uuid", requireModule('ATTENDANCE_RECORDS'), deleteAttendance);

// Per-employee view - self-access always allowed
router.get("/:uuid/today-status", checkSelfAccess(), getTodayStatus);
router.get("/:uuid/summary", checkSelfAccess(), getEmployeeSummary);
router.get("/:uuid", checkSelfAccess(), getEmployeeAttendance);

module.exports = router;
