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
const { requirePermission } = require("../middleware/requirePermission");

const router = express.Router();

// Authorization helpers using new RBAC middleware
const canManagePositions = requirePermission({ 
  occupations: 'Positions - Manage' 
});

const canViewPositions = requirePermission({ 
  occupations: [
    'Positions - Overview',
    'Positions - Manage',
    'Employees - Registration',
    'Employees - Overview',
    'Attendance - Overview',
    'Attendance - Manage',
    'Shifts - Overview',
    'Shifts - Add'
  ],
  logic: 'OR'
});

router.get("/", canViewPositions, listPositions);
router.post("/", canManagePositions, createPosition);
router.get("/:uuid", canViewPositions, getPosition);
router.patch("/:uuid", canManagePositions, updatePosition);
router.delete("/:uuid", canManagePositions, deletePosition);
router.post("/:uuid/assign-shift", canManagePositions, assignShiftToPosition);
router.delete("/:uuid/shift", canManagePositions, removeShiftFromPosition);

module.exports = router;
