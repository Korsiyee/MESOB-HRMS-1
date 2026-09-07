const NetworkSettingsService = require("../services/networkSettingsService");
const asyncHandler = require("../middleware/asyncHandler");
const { sendSuccess } = require("../utils/response");
const { ApiError } = require("../utils/errors");
const { safeLogEvent } = require("../services/auditLogService");
const { AUDIT_ACTIONS, AUDIT_ENTITY_TYPES } = require("../config/constants");
const { getClientIp } = require("../utils/request");

/* ─── Get all network settings ─── */
exports.getAllNetworkSettings = asyncHandler(async (req, res) => {
  const settings = await NetworkSettingsService.getAllNetworkSettings();
  return sendSuccess(res, { status: 200, data: settings });
});

/* ─── Get only active network settings ─── */
exports.getActiveNetworkSettings = asyncHandler(async (req, res) => {
  const settings = await NetworkSettingsService.getActiveNetworkSettings();
  return sendSuccess(res, { status: 200, data: settings });
});

/* ─── Get network setting by UUID ─── */
exports.getNetworkSettingByUuid = asyncHandler(async (req, res) => {
  const { uuid } = req.params;
  const setting = await NetworkSettingsService.getNetworkSettingByUuid(uuid);
  return sendSuccess(res, { status: 200, data: setting });
});

/* ─── Create network setting ─── */
exports.createNetworkSetting = asyncHandler(async (req, res) => {
  const { label, ip_range, is_active } = req.body || {};

  const setting = await NetworkSettingsService.createNetworkSetting({
    label,
    ip_range,
    is_active,
  });

  await safeLogEvent({
    actorUuid: req.user?.uuid || null,
    action: AUDIT_ACTIONS.NETWORK_SETTINGS_CREATE,
    entityType: AUDIT_ENTITY_TYPES.NETWORK_SETTINGS,
    entityUuid: setting.uuid,
    diff: { label, ip_range, is_active },
    ipAddress: getClientIp(req),
  });

  return sendSuccess(res, { 
    status: 201, 
    message: "Network setting created successfully.",
    data: setting 
  });
});

/* ─── Update network setting ─── */
exports.updateNetworkSetting = asyncHandler(async (req, res) => {
  const { uuid } = req.params;
  const { label, ip_range, is_active } = req.body || {};

  const setting = await NetworkSettingsService.updateNetworkSetting(uuid, {
    label,
    ip_range,
    is_active,
  });

  await safeLogEvent({
    actorUuid: req.user?.uuid || null,
    action: AUDIT_ACTIONS.NETWORK_SETTINGS_UPDATE,
    entityType: AUDIT_ENTITY_TYPES.NETWORK_SETTINGS,
    entityUuid: uuid,
    diff: { label, ip_range, is_active },
    ipAddress: getClientIp(req),
  });

  return sendSuccess(res, { 
    status: 200, 
    message: "Network setting updated successfully.",
    data: setting 
  });
});

/* ─── Toggle network setting active status ─── */
exports.toggleNetworkSetting = asyncHandler(async (req, res) => {
  const { uuid } = req.params;

  const setting = await NetworkSettingsService.toggleNetworkSetting(uuid);

  await safeLogEvent({
    actorUuid: req.user?.uuid || null,
    action: AUDIT_ACTIONS.NETWORK_SETTINGS_TOGGLE,
    entityType: AUDIT_ENTITY_TYPES.NETWORK_SETTINGS,
    entityUuid: uuid,
    diff: { is_active: setting.is_active },
    ipAddress: getClientIp(req),
  });

  return sendSuccess(res, { 
    status: 200, 
    message: `Network setting ${setting.is_active ? 'activated' : 'deactivated'} successfully.`,
    data: setting 
  });
});

/* ─── Delete network setting ─── */
exports.deleteNetworkSetting = asyncHandler(async (req, res) => {
  const { uuid } = req.params;

  // Get setting details before deletion for audit log
  const setting = await NetworkSettingsService.getNetworkSettingByUuid(uuid);

  await NetworkSettingsService.deleteNetworkSetting(uuid);

  await safeLogEvent({
    actorUuid: req.user?.uuid || null,
    action: AUDIT_ACTIONS.NETWORK_SETTINGS_DELETE,
    entityType: AUDIT_ENTITY_TYPES.NETWORK_SETTINGS,
    entityUuid: uuid,
    diff: { deleted: true, label: setting.label, ip_range: setting.ip_range },
    ipAddress: getClientIp(req),
  });

  return sendSuccess(res, { 
    status: 200, 
    message: "Network setting deleted successfully." 
  });
});

module.exports = exports;
