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
// Use module-level authorization
const { requireModule } = require("../middleware/moduleAuth");

const router = express.Router();

// All level operations require ORGANIZATION module
router.get("/", requireModule('LEVELS'), listLevels);
router.get("/:uuid", requireModule('LEVELS'), getLevel);
router.get("/:uuid/version", requireModule('LEVELS'), getLevelVersion);
router.post("/", requireModule('LEVELS'), createLevel);
router.patch("/:uuid", requireModule('LEVELS'), updateLevel);
router.delete("/:uuid", requireModule('LEVELS'), deleteLevel);
router.post("/:uuid/versions", requireModule('LEVELS'), createLevelVersion);

module.exports = router;
