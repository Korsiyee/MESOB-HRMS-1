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
const { requirePermission } = require("../middleware/requirePermission");

const router = express.Router();

// Authorization helpers using new RBAC middleware
const canViewShifts = requirePermission({ 
  occupations: ['Shifts - Overview', 'Shifts - Add'],
  logic: 'OR'
});

const canManageShifts = requirePermission({ 
  occupations: 'Shifts - Add' 
});

router.get("/", canViewShifts, listShifts);
router.post("/", canManageShifts, createShift);
router.get("/gaps", canViewShifts, detectGaps);
router.get("/:uuid", canViewShifts, getShift);
router.patch("/:uuid", canManageShifts, updateShift);
router.delete("/:uuid", canManageShifts, deleteShift);
router.post("/:uuid/assign", canManageShifts, assignShift);
router.get("/:uuid/employees", canViewShifts, getShiftEmployees);
router.get("/employee/:employee_uuid/history", canViewShifts, getEmployeeHistory);

module.exports = router;
