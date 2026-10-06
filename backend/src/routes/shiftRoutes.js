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
// Use module-level authorization
const { requireModule, withScope } = require("../middleware/moduleAuth");

const router = express.Router();

// All shift operations require SHIFTS module
router.get("/", requireModule('SHIFTS'), withScope(), listShifts);
router.get("/gaps", requireModule('SHIFTS'), detectGaps);
router.get("/:uuid", requireModule('SHIFTS'), getShift);
router.get("/:uuid/employees", requireModule('SHIFTS'), getShiftEmployees);
router.get("/employee/:employee_uuid/history", requireModule('SHIFTS'), getEmployeeHistory);
router.post("/", requireModule('SHIFTS'), createShift);
router.patch("/:uuid", requireModule('SHIFTS'), updateShift);
router.delete("/:uuid", requireModule('SHIFTS'), deleteShift);
router.post("/:uuid/assign", requireModule('SHIFTS'), assignShift);

module.exports = router;
