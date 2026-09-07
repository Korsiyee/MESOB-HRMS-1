const { randomUUID } = require("crypto");
const { executeQuery } = require("../utils/dbQuery");
const { ApiError } = require("../utils/errors");

/**
 * Get all network settings (active and inactive)
 */
async function getAllNetworkSettings() {
  const [rows] = await executeQuery(
    `SELECT uuid, label, ip_range, is_active, created_at, updated_at
     FROM NetworkSettings
     ORDER BY is_active DESC, label ASC`,
    []
  );
  return rows;
}

/**
 * Get only active network settings
 */
async function getActiveNetworkSettings() {
  const [rows] = await executeQuery(
    `SELECT uuid, label, ip_range, is_active, created_at, updated_at
     FROM NetworkSettings
     WHERE is_active = 1
     ORDER BY label ASC`,
    []
  );
  return rows;
}

/**
 * Get network setting by UUID
 */
async function getNetworkSettingByUuid(uuid) {
  const [rows] = await executeQuery(
    `SELECT uuid, label, ip_range, is_active, created_at, updated_at
     FROM NetworkSettings
     WHERE uuid = ?
     LIMIT 1`,
    [uuid]
  );

  if (!rows.length) {
    throw new ApiError("Network setting not found.", 404, "NOT_FOUND");
  }

  return rows[0];
}

/**
 * Create new network setting
 */
async function createNetworkSetting({ label, ip_range, is_active = 1 }) {
  if (!label || !ip_range) {
    throw new ApiError("label and ip_range are required.", 400, "VALIDATION_ERROR");
  }

  // Basic IP/CIDR validation
  const ipRegex = /^(\d{1,3}\.){3}\d{1,3}(\/\d{1,2})?$/;
  if (!ipRegex.test(ip_range)) {
    throw new ApiError(
      "Invalid IP range format. Use IP address (e.g., 192.168.1.1) or CIDR notation (e.g., 10.0.0.0/24)",
      400,
      "INVALID_IP_RANGE"
    );
  }

  // Check for duplicate IP range
  const [existing] = await executeQuery(
    `SELECT uuid FROM NetworkSettings WHERE ip_range = ? LIMIT 1`,
    [ip_range]
  );

  if (existing.length > 0) {
    throw new ApiError(
      `Network range ${ip_range} already exists.`,
      409,
      "DUPLICATE_IP_RANGE"
    );
  }

  const uuid = randomUUID();
  await executeQuery(
    `INSERT INTO NetworkSettings (uuid, label, ip_range, is_active, created_at, updated_at)
     VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`,
    [uuid, label, ip_range, is_active ? 1 : 0]
  );

  return getNetworkSettingByUuid(uuid);
}

/**
 * Update network setting
 */
async function updateNetworkSetting(uuid, { label, ip_range, is_active }) {
  // Verify exists
  await getNetworkSettingByUuid(uuid);

  const updates = [];
  const params = [];

  if (label !== undefined) {
    updates.push("label = ?");
    params.push(label);
  }

  if (ip_range !== undefined) {
    // Validate IP/CIDR format
    const ipRegex = /^(\d{1,3}\.){3}\d{1,3}(\/\d{1,2})?$/;
    if (!ipRegex.test(ip_range)) {
      throw new ApiError(
        "Invalid IP range format. Use IP address or CIDR notation",
        400,
        "INVALID_IP_RANGE"
      );
    }

    // Check for duplicate IP range (excluding current record)
    const [existing] = await executeQuery(
      `SELECT uuid FROM NetworkSettings WHERE ip_range = ? AND uuid != ? LIMIT 1`,
      [ip_range, uuid]
    );

    if (existing.length > 0) {
      throw new ApiError(
        `Network range ${ip_range} already exists.`,
        409,
        "DUPLICATE_IP_RANGE"
      );
    }

    updates.push("ip_range = ?");
    params.push(ip_range);
  }

  if (is_active !== undefined) {
    updates.push("is_active = ?");
    params.push(is_active ? 1 : 0);
  }

  if (updates.length === 0) {
    throw new ApiError("No fields to update.", 400, "VALIDATION_ERROR");
  }

  updates.push("updated_at = CURRENT_TIMESTAMP");
  params.push(uuid);

  await executeQuery(
    `UPDATE NetworkSettings SET ${updates.join(", ")} WHERE uuid = ?`,
    params
  );

  return getNetworkSettingByUuid(uuid);
}

/**
 * Toggle network setting active status
 */
async function toggleNetworkSetting(uuid) {
  await getNetworkSettingByUuid(uuid);

  await executeQuery(
    `UPDATE NetworkSettings 
     SET is_active = NOT is_active, updated_at = CURRENT_TIMESTAMP 
     WHERE uuid = ?`,
    [uuid]
  );

  return getNetworkSettingByUuid(uuid);
}

/**
 * Delete network setting
 */
async function deleteNetworkSetting(uuid) {
  await getNetworkSettingByUuid(uuid);

  await executeQuery(
    `DELETE FROM NetworkSettings WHERE uuid = ?`,
    [uuid]
  );

  return { deleted: true, uuid };
}

module.exports = {
  getAllNetworkSettings,
  getActiveNetworkSettings,
  getNetworkSettingByUuid,
  createNetworkSetting,
  updateNetworkSetting,
  toggleNetworkSetting,
  deleteNetworkSetting,
};
