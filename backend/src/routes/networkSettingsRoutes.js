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
const { requirePermission } = require("../middleware/requirePermission");

const router = express.Router();

// Only SUPER_ADMIN can manage network settings
const superAdminOnly = requirePermission({ roles: ['SUPER_ADMIN'] });

// Get all network settings (includes inactive)
router.get("/", superAdminOnly, getAllNetworkSettings);

// Get only active network settings
router.get("/active", superAdminOnly, getActiveNetworkSettings);

// Get single network setting by UUID
router.get("/:uuid", superAdminOnly, getNetworkSettingByUuid);

// Create new network setting
router.post("/", superAdminOnly, createNetworkSetting);

// Update network setting
router.patch("/:uuid", superAdminOnly, updateNetworkSetting);

// Toggle network setting active status
router.patch("/:uuid/toggle", superAdminOnly, toggleNetworkSetting);

// Delete network setting
router.delete("/:uuid", superAdminOnly, deleteNetworkSetting);

module.exports = router;
