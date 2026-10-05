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
// NEW: Use Permit middleware instead of old RBAC
const { authorize, allowSelfOr } = require("../middleware/permitMiddleware");
const { authenticateJwt } = require("../middleware/authMiddleware");
const { requireCompanyWifi } = require("../middleware/requireCompanyWifi");

const router = express.Router();

// Self-Service Punch - All authenticated users with company Wi-Fi
// MUST be before /:uuid routes to avoid route conflicts
router.post("/self-punch", authenticateJwt, requireCompanyWifi, selfPunch);
router.get("/self-punch/today", authenticateJwt, getTodayPunchStatus);

// Analytics (before /:uuid) - scope filtering handled in controllers
router.get("/analytics/summary", 
  authorize("view", "attendance"),
  getOverviewSummary
);
router.get("/analytics/trend", 
  authorize("view", "attendance"),
  getAttendanceTrend
);
router.get("/analytics/departments", 
  authorize("view", "attendance"),
  getDepartmentStats
);
router.get("/analytics/top-employees", 
  authorize("view", "attendance"),
  getTopEmployees
);
router.get("/analytics/corrections", 
  authorize("view", "attendance"),
  getRecentCorrections
);

// Admin CRUD - scope filtering handled in controllers
router.get("/admin/all", 
  authorize("view", "attendance"),
  getAllAttendance
);
router.post("/", authorize("create", "attendance"), createAttendance);
router.post("/log", authorize("create", "attendance"), logAttendance);
router.post("/delete-by-date", authorize("delete", "attendance"), deleteAttendanceByEmployeeAndDate);
router.patch("/:uuid/correct", authorize("update", "attendance"), correctAttendance);
router.delete("/:uuid", authorize("delete", "attendance"), deleteAttendance);

// Per-employee view (READ ONLY) - Self-access OR permission
router.get("/:uuid/today-status", 
  allowSelfOr("view", "attendance", req => req.params.uuid),
  getTodayStatus
);
router.get("/:uuid/summary", 
  allowSelfOr("view", "attendance", req => req.params.uuid),
  getEmployeeSummary
);
router.get("/:uuid", 
  allowSelfOr("view", "attendance", req => req.params.uuid),
  getEmployeeAttendance
);

module.exports = router;
