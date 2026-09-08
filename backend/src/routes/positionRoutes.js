const express = require("express");
const {
  listPositions,
  createPosition,
  getPosition,
  updatePosition,
  deletePosition,
  assignShiftToPosition,
  removeShiftFromPosition,
} = require("../controllers/positionController");
const { authorize } = require("../middleware/authorize");

const router = express.Router();

// View: Anyone who can view positions, employees, attendance, or shifts
router.get("/", 
  authorize([
    "Positions.View",
    "Employees.View",
    "Attendance.View",
    "Shifts.View"
  ]), 
  listPositions
);
router.get("/:uuid", 
  authorize([
    "Positions.View",
    "Employees.View",
    "Attendance.View",
    "Shifts.View"
  ]), 
  getPosition
);

// Manage: Requires position management permissions
router.post("/", authorize("Positions.Create"), createPosition);
router.patch("/:uuid", authorize("Positions.Update"), updatePosition);
router.delete("/:uuid", authorize("Positions.Delete"), deletePosition);
router.post("/:uuid/assign-shift", authorize("Positions.Update"), assignShiftToPosition);
router.delete("/:uuid/shift", authorize("Positions.Update"), removeShiftFromPosition);

module.exports = router;
