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
const { authorize } = require("../middleware/authorize");

const router = express.Router();

// View: Anyone who can view levels or employees
router.get("/", authorize(["Levels.View", "Employees.View"]), listLevels);
router.get("/:uuid", authorize(["Levels.View", "Employees.View"]), getLevel);
router.get("/:uuid/version", authorize(["Levels.View", "Employees.View"]), getLevelVersion);

// Manage: Requires level management permissions
router.post("/", authorize("Levels.Create"), createLevel);
router.patch("/:uuid", authorize("Levels.Update"), updateLevel);
router.delete("/:uuid", authorize("Levels.Delete"), deleteLevel);
router.post("/:uuid/versions", authorize("Levels.Update"), createLevelVersion);

module.exports = router;
