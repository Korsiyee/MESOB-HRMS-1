const DepartmentService = require("../services/departmentService");
const asyncHandler = require("../middleware/asyncHandler");
const { sendSuccess } = require("../utils/response");
const { ApiError } = require("../utils/errors");
const { AUDIT_ACTIONS, AUDIT_ENTITY_TYPES } = require("../config/constants");
const { safeLogEvent } = require("../services/auditLogService");
const { getClientIp } = require("../utils/request");
const {
  validateDepartmentCreate,
  validateDepartmentUpdate,
} = require("../validation/schemas");

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

exports.listDepartments = asyncHandler(async (req, res) => {
  const tree = String(req.query?.tree || "").toLowerCase() === "true";
  const departments = await DepartmentService.listDepartments({ tree });
  return sendSuccess(res, { status: 200, data: departments });
});

exports.createDepartment = asyncHandler(async (req, res) => {
  assertValidation(validateDepartmentCreate(req.body || {}));

  const department = await DepartmentService.createDepartment(req.body || {});
  await safeLogEvent({
    actorUuid: req.user?.uuid || null,
    action: AUDIT_ACTIONS.DEPARTMENT_CREATE,
    entityType: AUDIT_ENTITY_TYPES.DEPARTMENT,
    entityUuid: department.uuid,
    diff: { name: department.name },
    ipAddress: getClientIp(req),
  });

  return sendSuccess(res, { status: 201, data: department });
});

exports.getDepartment = asyncHandler(async (req, res) => {
  const department = await DepartmentService.getDepartmentByUuid(
    req.params.uuid,
  );
  if (!department) {
    throw new ApiError("Department not found.", 404, "NOT_FOUND");
  }
  return sendSuccess(res, { status: 200, data: department });
});

exports.updateDepartment = asyncHandler(async (req, res) => {
  assertValidation(validateDepartmentUpdate(req.body || {}));

  const department = await DepartmentService.updateDepartment(
    req.params.uuid,
    req.body || {},
  );

  await safeLogEvent({
    actorUuid: req.user?.uuid || null,
    action: AUDIT_ACTIONS.DEPARTMENT_UPDATE,
    entityType: AUDIT_ENTITY_TYPES.DEPARTMENT,
    entityUuid: department.uuid,
    diff: { fields: Object.keys(req.body || {}) },
    ipAddress: getClientIp(req),
  });

  return sendSuccess(res, { status: 200, data: department });
});

exports.deleteDepartment = asyncHandler(async (req, res) => {
  await DepartmentService.deleteDepartment(req.params.uuid);

  await safeLogEvent({
    actorUuid: req.user?.uuid || null,
    action: AUDIT_ACTIONS.DEPARTMENT_DELETE,
    entityType: AUDIT_ENTITY_TYPES.DEPARTMENT,
    entityUuid: req.params.uuid,
    diff: null,
    ipAddress: getClientIp(req),
  });

  return sendSuccess(res, { status: 200, message: "Department deleted." });
});
