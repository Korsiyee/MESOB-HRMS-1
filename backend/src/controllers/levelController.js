const LevelService = require("../services/levelService");
const asyncHandler = require("../middleware/asyncHandler");
const { sendSuccess } = require("../utils/response");
const { ApiError } = require("../utils/errors");
const { AUDIT_ACTIONS, AUDIT_ENTITY_TYPES } = require("../config/constants");
const { safeLogEvent } = require("../services/auditLogService");
const { getClientIp } = require("../utils/request");

function assertValidation({ missing = [], invalid = [] }) {
  if (missing.length) {
    throw new ApiError("Validation failed.", 400, "VALIDATION_ERROR", {
      missing,
    });
  }
  if (invalid.length) {
    throw new ApiError("Validation failed.", 422, "VALIDATION_ERROR", {
      invalid,
    });
  }
}

function validateLevelCreate(payload) {
  const missing = [];
  const invalid = [];

  if (!payload.name || !String(payload.name).trim()) {
    missing.push("name");
  }

  if (payload.base_salary !== undefined) {
    const baseSalary = Number(payload.base_salary);
    if (!Number.isFinite(baseSalary) || baseSalary < 0) {
      invalid.push({ field: "base_salary", reason: "must be a non-negative number" });
    }
  }

  if (payload.sort_order !== undefined) {
    const sortOrder = Number(payload.sort_order);
    if (!Number.isFinite(sortOrder) || sortOrder < 0) {
      invalid.push({ field: "sort_order", reason: "must be a non-negative number" });
    }
  }

  if (payload.allowances && !Array.isArray(payload.allowances)) {
    invalid.push({ field: "allowances", reason: "must be an array" });
  }

  if (Array.isArray(payload.allowances)) {
    payload.allowances.forEach((allowance, index) => {
      if (!allowance.allowance_name || !String(allowance.allowance_name).trim()) {
        missing.push(`allowances[${index}].allowance_name`);
      }
      const amount = Number(allowance.amount);
      if (!Number.isFinite(amount) || amount < 0) {
        invalid.push({
          field: `allowances[${index}].amount`,
          reason: "must be a non-negative number",
        });
      }
    });
  }

  return { missing, invalid };
}

function validateLevelUpdate(payload) {
  const invalid = [];

  if (payload.name !== undefined && !String(payload.name).trim()) {
    invalid.push({ field: "name", reason: "cannot be empty" });
  }

  if (payload.sort_order !== undefined) {
    const sortOrder = Number(payload.sort_order);
    if (!Number.isFinite(sortOrder) || sortOrder < 0) {
      invalid.push({ field: "sort_order", reason: "must be a non-negative number" });
    }
  }

  return { missing: [], invalid };
}

function validateLevelVersion(payload) {
  const missing = [];
  const invalid = [];

  if (!payload.base_salary && payload.base_salary !== 0) {
    missing.push("base_salary");
  } else {
    const baseSalary = Number(payload.base_salary);
    if (!Number.isFinite(baseSalary) || baseSalary < 0) {
      invalid.push({ field: "base_salary", reason: "must be a non-negative number" });
    }
  }

  if (!payload.effective_from) {
    missing.push("effective_from");
  } else if (!/^\d{4}-\d{2}-\d{2}$/.test(payload.effective_from)) {
    invalid.push({
      field: "effective_from",
      reason: "must be a valid date in YYYY-MM-DD format",
    });
  }

  if (payload.allowances && !Array.isArray(payload.allowances)) {
    invalid.push({ field: "allowances", reason: "must be an array" });
  }

  if (Array.isArray(payload.allowances)) {
    payload.allowances.forEach((allowance, index) => {
      if (!allowance.allowance_name || !String(allowance.allowance_name).trim()) {
        missing.push(`allowances[${index}].allowance_name`);
      }
      const amount = Number(allowance.amount);
      if (!Number.isFinite(amount) || amount < 0) {
        invalid.push({
          field: `allowances[${index}].amount`,
          reason: "must be a non-negative number",
        });
      }
    });
  }

  return { missing, invalid };
}

/**
 * List all levels
 * GET /api/levels
 */
exports.listLevels = asyncHandler(async (req, res) => {
  const includeInactive = String(req.query?.include_inactive || "").toLowerCase() === "true";
  const includeCurrentVersion =
    String(req.query?.include_current_version || "").toLowerCase() === "true";

  const levels = await LevelService.listLevels({
    includeInactive,
    includeCurrentVersion,
  });

  return sendSuccess(res, { status: 200, data: levels });
});

/**
 * Create a new level
 * POST /api/levels
 */
exports.createLevel = asyncHandler(async (req, res) => {
  assertValidation(validateLevelCreate(req.body || {}));

  const level = await LevelService.createLevel(req.body || {}, req.user?.uuid);

  await safeLogEvent({
    actorUuid: req.user?.uuid || null,
    action: AUDIT_ACTIONS.LEVEL_CREATE,
    entityType: AUDIT_ENTITY_TYPES.LEVEL,
    entityUuid: level.uuid,
    diff: { name: level.name },
    ipAddress: getClientIp(req),
  });

  return sendSuccess(res, { status: 201, data: level });
});

/**
 * Get a single level by UUID
 * GET /api/levels/:uuid
 */
exports.getLevel = asyncHandler(async (req, res) => {
  const includeVersions = String(req.query?.include_versions || "true").toLowerCase() === "true";
  const includeEmployees =
    String(req.query?.include_employees || "").toLowerCase() === "true";

  const level = await LevelService.getLevelByUuid(req.params.uuid, {
    includeVersions,
    includeEmployees,
  });

  if (!level) {
    throw new ApiError("Level not found.", 404, "NOT_FOUND");
  }

  return sendSuccess(res, { status: 200, data: level });
});

/**
 * Update a level (basic info only)
 * PATCH /api/levels/:uuid
 */
exports.updateLevel = asyncHandler(async (req, res) => {
  assertValidation(validateLevelUpdate(req.body || {}));

  const level = await LevelService.updateLevel(req.params.uuid, req.body || {});

  await safeLogEvent({
    actorUuid: req.user?.uuid || null,
    action: AUDIT_ACTIONS.LEVEL_UPDATE,
    entityType: AUDIT_ENTITY_TYPES.LEVEL,
    entityUuid: level.uuid,
    diff: { fields: Object.keys(req.body || {}) },
    ipAddress: getClientIp(req),
  });

  return sendSuccess(res, { status: 200, data: level });
});

/**
 * Delete a level
 * DELETE /api/levels/:uuid
 */
exports.deleteLevel = asyncHandler(async (req, res) => {
  await LevelService.deleteLevel(req.params.uuid);

  await safeLogEvent({
    actorUuid: req.user?.uuid || null,
    action: AUDIT_ACTIONS.LEVEL_DELETE,
    entityType: AUDIT_ENTITY_TYPES.LEVEL,
    entityUuid: req.params.uuid,
    diff: null,
    ipAddress: getClientIp(req),
  });

  return sendSuccess(res, { status: 200, message: "Level deleted successfully." });
});

/**
 * Create a new version for a level (salary revision)
 * POST /api/levels/:uuid/versions
 */
exports.createLevelVersion = asyncHandler(async (req, res) => {
  assertValidation(validateLevelVersion(req.body || {}));

  const level = await LevelService.createLevelVersion(
    req.params.uuid,
    req.body || {},
    req.user?.uuid
  );

  await safeLogEvent({
    actorUuid: req.user?.uuid || null,
    action: "LEVEL_VERSION_CREATE",
    entityType: AUDIT_ENTITY_TYPES.LEVEL,
    entityUuid: req.params.uuid,
    diff: {
      base_salary: req.body.base_salary,
      effective_from: req.body.effective_from,
    },
    ipAddress: getClientIp(req),
  });

  return sendSuccess(res, {
    status: 201,
    data: level,
    message: "Level version created successfully.",
  });
});

/**
 * Get current level version for a specific date
 * GET /api/levels/:uuid/version
 */
exports.getLevelVersion = asyncHandler(async (req, res) => {
  const date = req.query.date || null;

  const version = await LevelService.getLevelVersionAtDate(req.params.uuid, date);

  if (!version) {
    throw new ApiError(
      "No level version found for the specified date.",
      404,
      "VERSION_NOT_FOUND"
    );
  }

  return sendSuccess(res, { status: 200, data: version });
});
