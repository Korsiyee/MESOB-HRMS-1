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
const { requireModule, withScope } = require("../middleware/moduleAuth");

const router = express.Router();

// All position operations require ORGANIZATION module
router.get("/", requireModule('ORGANIZATION'), withScope(), listPositions);
router.get("/:uuid", requireModule('ORGANIZATION'), getPosition);
router.post("/", requireModule('ORGANIZATION'), createPosition);
router.patch("/:uuid", requireModule('ORGANIZATION'), updatePosition);
router.delete("/:uuid", requireModule('ORGANIZATION'), deletePosition);
router.post("/:uuid/assign-shift", requireModule('ORGANIZATION'), assignShiftToPosition);
router.delete("/:uuid/shift", requireModule('ORGANIZATION'), removeShiftFromPosition);

module.exports = router;
