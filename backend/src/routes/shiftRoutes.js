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
const { authorize } = require("../middleware/authorize");

const router = express.Router();

// View endpoints
router.get("/", authorize("Shifts.View"), listShifts);
router.get("/gaps", authorize("Shifts.View"), detectGaps);
router.get("/:uuid", authorize("Shifts.View"), getShift);
router.get("/:uuid/employees", authorize("Shifts.View"), getShiftEmployees);
router.get("/employee/:employee_uuid/history", authorize("Shifts.View"), getEmployeeHistory);

// Manage endpoints
router.post("/", authorize("Shifts.Create"), createShift);
router.patch("/:uuid", authorize("Shifts.Update"), updateShift);
router.delete("/:uuid", authorize("Shifts.Delete"), deleteShift);
router.post("/:uuid/assign", authorize("Shifts.Assign"), assignShift);

module.exports = router;
