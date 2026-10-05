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
// NEW: Use Permit middleware instead of old RBAC
const { authorize, requireAny } = require("../middleware/permitMiddleware");

const router = express.Router();

// View: Anyone who can view positions, employees, attendance, or shifts
router.get("/", 
  requireAny([
    { action: "view", resource: "positions" },
    { action: "view", resource: "employees" },
    { action: "view", resource: "attendance" },
    { action: "view", resource: "shifts" }
  ]), 
  listPositions
);
router.get("/:uuid", 
  requireAny([
    { action: "view", resource: "positions" },
    { action: "view", resource: "employees" },
    { action: "view", resource: "attendance" },
    { action: "view", resource: "shifts" }
  ]), 
  getPosition
);

// Manage: Requires position management permissions
router.post("/", authorize("create", "positions"), createPosition);
router.patch("/:uuid", authorize("update", "positions"), updatePosition);
router.delete("/:uuid", authorize("delete", "positions"), deletePosition);
router.post("/:uuid/assign-shift", authorize("update", "positions"), assignShiftToPosition);
router.delete("/:uuid/shift", authorize("update", "positions"), removeShiftFromPosition);

module.exports = router;
