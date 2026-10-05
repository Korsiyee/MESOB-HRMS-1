const express = require("express");
const {
  listShifts,
  createShift,
  getShift,
  updateShift,
  deleteShift,
  assignShift,
  getShiftEmployees,
  detectGaps,
  getEmployeeHistory,
} = require("../controllers/shiftController");
// NEW: Use Permit middleware instead of old RBAC
const { authorize } = require("../middleware/permitMiddleware");

const router = express.Router();

// View endpoints
router.get("/", authorize("view", "shifts"), listShifts);
router.get("/gaps", authorize("view", "shifts"), detectGaps);
router.get("/:uuid", authorize("view", "shifts"), getShift);
router.get("/:uuid/employees", authorize("view", "shifts"), getShiftEmployees);
router.get("/employee/:employee_uuid/history", authorize("view", "shifts"), getEmployeeHistory);

// Manage endpoints
router.post("/", authorize("create", "shifts"), createShift);
router.patch("/:uuid", authorize("update", "shifts"), updateShift);
router.delete("/:uuid", authorize("delete", "shifts"), deleteShift);
router.post("/:uuid/assign", authorize("assign", "shifts"), assignShift);

module.exports = router;
