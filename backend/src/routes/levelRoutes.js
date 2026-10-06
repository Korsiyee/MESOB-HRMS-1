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
const { requireModule, withScope } = require("../middleware/moduleAuth");

const router = express.Router();

// All level operations require ORGANIZATION module
router.get("/", requireModule('ORGANIZATION'), withScope(), listLevels);
router.get("/:uuid", requireModule('ORGANIZATION'), getLevel);
router.get("/:uuid/version", requireModule('ORGANIZATION'), getLevelVersion);
router.post("/", requireModule('ORGANIZATION'), createLevel);
router.patch("/:uuid", requireModule('ORGANIZATION'), updateLevel);
router.delete("/:uuid", requireModule('ORGANIZATION'), deleteLevel);
router.post("/:uuid/versions", requireModule('ORGANIZATION'), createLevelVersion);

module.exports = router;
