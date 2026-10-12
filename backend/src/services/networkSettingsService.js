const { randomUUID } = require("crypto");
const { executeQuery } = require("../utils/dbQuery");
const { ApiError } = require("../utils/errors");

/**
 * Validates IPv4 address or CIDR notation
 * Octets must be 0-255, and CIDR prefix (if provided) must be 0-32.
 */
function isValidIpOrCidr(ipRange) {
  if (!ipRange || typeof ipRange !== "string") return false;
  const trimmed = ipRange.trim();
  const parts = trimmed.split("/");
  if (parts.length > 2) return false;

  const ip = parts[0];
  const octets = ip.split(".");
  if (octets.length !== 4) return false;

  for (const oct of octets) {
    if (!/^\d{1,3}$/.test(oct)) return false;
    const num = Number(oct);
    if (num < 0 || num > 255) return false;
  }

  if (parts.length === 2) {
    if (!/^\d{1,2}$/.test(parts[1])) return false;
    const mask = Number(parts[1]);
    if (mask < 0 || mask > 32) return false;
  }

  return true;
}

let tableSchemaChecked = false;
async function ensureNetworkSettingsTable() {
  if (tableSchemaChecked) return;
  try {
    const [cols] = await executeQuery("SHOW COLUMNS FROM NetworkSettings");
    const colNames = cols.map((c) => c.Field.toLowerCase());

    if (!colNames.includes("label")) {
      await executeQuery(
        "ALTER TABLE NetworkSettings ADD COLUMN label VARCHAR(200) DEFAULT 'Main Network'"
      );
      if (colNames.includes("location_name")) {
        await executeQuery(
          "UPDATE NetworkSettings SET label = location_name WHERE location_name IS NOT NULL AND location_name != ''"
        );
      }
    }

    if (!colNames.includes("ip_range")) {
      await executeQuery(
        "ALTER TABLE NetworkSettings ADD COLUMN ip_range VARCHAR(100) DEFAULT '127.0.0.1'"
      );
      if (colNames.includes("ip_address")) {
        await executeQuery(
          "UPDATE NetworkSettings SET ip_range = ip_address WHERE ip_address IS NOT NULL AND ip_address != ''"
        );
      }
    }

    tableSchemaChecked = true;
  } catch (err) {
    console.warn("[NetworkSettings] Schema check note:", err.message);
  }
}

/**
 * Get all network settings (active and inactive)
 */
async function getAllNetworkSettings() {
  await ensureNetworkSettingsTable();
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
  await ensureNetworkSettingsTable();
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
  await ensureNetworkSettingsTable();
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
  await ensureNetworkSettingsTable();
  const trimmedLabel = String(label || "").trim();
  const trimmedIpRange = String(ip_range || "").trim();

  if (!trimmedLabel) {
    throw new ApiError("Label is required.", 400, "VALIDATION_ERROR");
  }
  if (!trimmedIpRange) {
    throw new ApiError("IP range is required.", 400, "VALIDATION_ERROR");
  }

  if (!isValidIpOrCidr(trimmedIpRange)) {
    throw new ApiError(
      "Invalid IP range format. Please provide a valid IPv4 address (e.g., 192.168.1.1) or CIDR block (e.g., 10.0.0.0/24 with mask 0-32).",
      400,
      "INVALID_IP_RANGE"
    );
  }

  // Check for duplicate IP range
  const [existing] = await executeQuery(
    `SELECT uuid FROM NetworkSettings WHERE ip_range = ? LIMIT 1`,
    [trimmedIpRange]
  );

  if (existing.length > 0) {
    throw new ApiError(
      `Network range ${trimmedIpRange} already exists.`,
      409,
      "DUPLICATE_IP_RANGE"
    );
  }

  const uuid = randomUUID();
  await executeQuery(
    `INSERT INTO NetworkSettings (uuid, label, ip_range, location_name, ip_address, is_active, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`,
    [uuid, trimmedLabel, trimmedIpRange, trimmedLabel, trimmedIpRange, is_active ? 1 : 0]
  );

  return getNetworkSettingByUuid(uuid);
}

/**
 * Update network setting
 */
async function updateNetworkSetting(uuid, { label, ip_range, is_active }) {
  await ensureNetworkSettingsTable();
  await getNetworkSettingByUuid(uuid);

  const updates = [];
  const params = [];

  if (label !== undefined) {
    const trimmedLabel = String(label || "").trim();
    if (!trimmedLabel) {
      throw new ApiError("Label cannot be empty.", 400, "VALIDATION_ERROR");
    }
    updates.push("label = ?");
    params.push(trimmedLabel);
    updates.push("location_name = ?");
    params.push(trimmedLabel);
  }

  if (ip_range !== undefined) {
    const trimmedIpRange = String(ip_range || "").trim();
    if (!trimmedIpRange) {
      throw new ApiError("IP range cannot be empty.", 400, "VALIDATION_ERROR");
    }
    if (!isValidIpOrCidr(trimmedIpRange)) {
      throw new ApiError(
        "Invalid IP range format. Please provide a valid IPv4 address (e.g., 192.168.1.1) or CIDR block (e.g., 10.0.0.0/24 with mask 0-32).",
        400,
        "INVALID_IP_RANGE"
      );
    }

    // Check for duplicate IP range (excluding current record)
    const [existing] = await executeQuery(
      `SELECT uuid FROM NetworkSettings WHERE (ip_range = ? OR ip_address = ?) AND uuid != ? LIMIT 1`,
      [trimmedIpRange, trimmedIpRange, uuid]
    );

    if (existing.length > 0) {
      throw new ApiError(
        `Network range ${trimmedIpRange} already exists.`,
        409,
        "DUPLICATE_IP_RANGE"
      );
    }

    updates.push("ip_range = ?");
    params.push(trimmedIpRange);
    updates.push("ip_address = ?");
    params.push(trimmedIpRange);
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
  await ensureNetworkSettingsTable();
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
  await ensureNetworkSettingsTable();
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
  isValidIpOrCidr,
};
