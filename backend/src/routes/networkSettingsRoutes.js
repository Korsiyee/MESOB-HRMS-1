const express = require("express");
const {
  getAllNetworkSettings,
  getActiveNetworkSettings,
  getNetworkSettingByUuid,
  createNetworkSetting,
  updateNetworkSetting,
  toggleNetworkSetting,
  deleteNetworkSetting,
} = require("../controllers/networkSettingsController");
const { authorize } = require("../middleware/authorize");

const router = express.Router();

// All network settings routes require NetworkSettings permission
router.get("/", authorize("NetworkSettings.View"), getAllNetworkSettings);
router.get("/active", authorize("NetworkSettings.View"), getActiveNetworkSettings);
router.get("/:uuid", authorize("NetworkSettings.View"), getNetworkSettingByUuid);
router.post("/", authorize("NetworkSettings.Create"), createNetworkSetting);
router.patch("/:uuid", authorize("NetworkSettings.Update"), updateNetworkSetting);
router.patch("/:uuid/toggle", authorize("NetworkSettings.Update"), toggleNetworkSetting);
router.delete("/:uuid", authorize("NetworkSettings.Delete"), deleteNetworkSetting);

module.exports = router;
