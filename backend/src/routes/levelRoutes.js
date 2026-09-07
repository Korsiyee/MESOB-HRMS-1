const express = require("express");
const {
  listLevels,
  createLevel,
  getLevel,
  updateLevel,
  deleteLevel,
  createLevelVersion,
  getLevelVersion,
} = require("../controllers/levelController");
const { requirePermission } = require("../middleware/requirePermission");

const router = express.Router();

// Authorization helpers using RBAC middleware
const canManageLevels = requirePermission({
  occupations: "Levels - Manage",
});

const canViewLevels = requirePermission({
  occupations: [
    "Levels - Overview",
    "Levels - Manage",
    "Employees - Registration",
    "Employees - Overview",
  ],
  logic: "OR",
});

// List all levels
router.get("/", canViewLevels, listLevels);

// Create a new level
router.post("/", canManageLevels, createLevel);

// Get a single level by UUID
router.get("/:uuid", canViewLevels, getLevel);

// Update a level (basic info only)
router.patch("/:uuid", canManageLevels, updateLevel);

// Delete a level
router.delete("/:uuid", canManageLevels, deleteLevel);

// Create a new version for a level (salary revision)
router.post("/:uuid/versions", canManageLevels, createLevelVersion);

// Get current level version for a specific date
router.get("/:uuid/version", canViewLevels, getLevelVersion);

module.exports = router;
