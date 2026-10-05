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
// NEW: Use Permit middleware instead of old RBAC
const { authorize, requireAny } = require("../middleware/permitMiddleware");

const router = express.Router();

// View: Anyone who can view levels or employees
router.get("/", requireAny([
  { action: "view", resource: "levels" },
  { action: "view", resource: "employees" }
]), listLevels);
router.get("/:uuid", requireAny([
  { action: "view", resource: "levels" },
  { action: "view", resource: "employees" }
]), getLevel);
router.get("/:uuid/version", requireAny([
  { action: "view", resource: "levels" },
  { action: "view", resource: "employees" }
]), getLevelVersion);

// Manage: Requires level management permissions
router.post("/", authorize("create", "levels"), createLevel);
router.patch("/:uuid", authorize("update", "levels"), updateLevel);
router.delete("/:uuid", authorize("delete", "levels"), deleteLevel);
router.post("/:uuid/versions", authorize("update", "levels"), createLevelVersion);

module.exports = router;
