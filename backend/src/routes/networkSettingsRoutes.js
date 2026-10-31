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
const { authenticateJwt } = require("../middleware/authMiddleware");
const { requireModule } = require("../middleware/moduleAuth");

const router = express.Router();

// All network settings routes require authentication and NETWORK_SETTINGS module access
router.use(authenticateJwt);
router.use(requireModule('NETWORK_SETTINGS'));

// GET /api/network-settings - Get all network settings
router.get("/", getAllNetworkSettings);

// GET /api/network-settings/active - Get only active network settings
router.get("/active", getActiveNetworkSettings);

// GET /api/network-settings/:uuid - Get specific network setting
router.get("/:uuid", getNetworkSettingByUuid);

// POST /api/network-settings - Create new network setting
router.post("/", createNetworkSetting);

// PATCH /api/network-settings/:uuid - Update network setting
router.patch("/:uuid", updateNetworkSetting);

// PATCH /api/network-settings/:uuid/toggle - Toggle active status
router.patch("/:uuid/toggle", toggleNetworkSetting);

// DELETE /api/network-settings/:uuid - Delete network setting
router.delete("/:uuid", deleteNetworkSetting);

module.exports = router;
