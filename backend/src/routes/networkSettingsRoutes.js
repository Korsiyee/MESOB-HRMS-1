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

const router = express.Router();

// All network settings routes require NetworkSettings permissions

module.exports = router;
