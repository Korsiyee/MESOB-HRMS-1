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
// Use module-level authorization
const { requireModule } = require("../middleware/moduleAuth");

const router = express.Router();

// All position operations require ORGANIZATION module
router.get("/", requireModule('POSITIONS'), listPositions);
router.get("/:uuid", requireModule('POSITIONS'), getPosition);
router.post("/", requireModule('POSITIONS'), createPosition);
router.patch("/:uuid", requireModule('POSITIONS'), updatePosition);
router.delete("/:uuid", requireModule('POSITIONS'), deletePosition);
router.post("/:uuid/assign-shift", requireModule('POSITIONS'), assignShiftToPosition);
router.delete("/:uuid/shift", requireModule('POSITIONS'), removeShiftFromPosition);

module.exports = router;
