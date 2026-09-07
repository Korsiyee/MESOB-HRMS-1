const ShiftService = require("../services/shiftService");
const asyncHandler = require("../middleware/asyncHandler");
const { sendSuccess } = require("../utils/response");
const { ApiError } = require("../utils/errors");
const { AUDIT_ACTIONS, AUDIT_ENTITY_TYPES } = require("../config/constants");
const { safeLogEvent } = require("../services/auditLogService");
const { getClientIp } = require("../utils/request");
const {
  validateShiftCreate,
  validateShiftUpdate,
  validateShiftAssign,
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

exports.listShifts = asyncHandler(async (req, res) => {
  const shifts = await ShiftService.listShifts();
  return sendSuccess(res, { status: 200, data: shifts });
});

exports.createShift = asyncHandler(async (req, res) => {
  assertValidation(validateShiftCreate(req.body || {}));

  const shift = await ShiftService.createShift(req.body || {});
  await safeLogEvent({
    actorUuid: req.user?.uuid || null,
    action: AUDIT_ACTIONS.SHIFT_CREATE,
    entityType: AUDIT_ENTITY_TYPES.SHIFT,
    entityUuid: shift.uuid,
    diff: { name: shift.name },
    ipAddress: getClientIp(req),
  });

  return sendSuccess(res, { status: 201, data: shift });
});

exports.getShift = asyncHandler(async (req, res) => {
  const shift = await ShiftService.getShiftByUuid(req.params.uuid);
  if (!shift) {
    throw new ApiError("Shift not found.", 404, "NOT_FOUND");
  }
  return sendSuccess(res, { status: 200, data: shift });
});

exports.updateShift = asyncHandler(async (req, res) => {
  assertValidation(validateShiftUpdate(req.body || {}));

  const shift = await ShiftService.updateShift(req.params.uuid, req.body || {});
  await safeLogEvent({
    actorUuid: req.user?.uuid || null,
    action: AUDIT_ACTIONS.SHIFT_UPDATE,
    entityType: AUDIT_ENTITY_TYPES.SHIFT,
    entityUuid: shift.uuid,
    diff: { fields: Object.keys(req.body || {}) },
    ipAddress: getClientIp(req),
  });

  return sendSuccess(res, { status: 200, data: shift });
});

exports.deleteShift = asyncHandler(async (req, res) => {
  await ShiftService.deleteShift(req.params.uuid);

  await safeLogEvent({
    actorUuid: req.user?.uuid || null,
    action: AUDIT_ACTIONS.SHIFT_DELETE,
    entityType: AUDIT_ENTITY_TYPES.SHIFT,
    entityUuid: req.params.uuid,
    diff: null,
    ipAddress: getClientIp(req),
  });

  return sendSuccess(res, { status: 200, message: "Shift deleted." });
});

exports.assignShift = asyncHandler(async (req, res) => {
  assertValidation(validateShiftAssign(req.body || {}));

  const assignment = await ShiftService.assignShift(
    req.params.uuid,
    req.body || {},
  );
  await safeLogEvent({
    actorUuid: req.user?.uuid || null,
    action: AUDIT_ACTIONS.SHIFT_ASSIGN,
    entityType: AUDIT_ENTITY_TYPES.SHIFT,
    entityUuid: assignment.shift_uuid,
    diff: {
      employee_uuid: assignment.employee_uuid,
      effective_from: assignment.effective_from,
      effective_to: assignment.effective_to,
    },
    ipAddress: getClientIp(req),
  });

  return sendSuccess(res, { status: 201, data: assignment });
});

exports.getShiftEmployees = asyncHandler(async (req, res) => {
  const shift = await ShiftService.getShiftByUuid(req.params.uuid);
  if (!shift) {
    throw new ApiError("Shift not found.", 404, "NOT_FOUND");
  }

  const employees = await ShiftService.getShiftEmployees(req.params.uuid);
  return sendSuccess(res, { status: 200, data: employees });
});

exports.detectGaps = asyncHandler(async (req, res) => {
  const { employee_uuid } = req.query;
  const gaps = await ShiftService.detectShiftGaps(employee_uuid);
  
  return sendSuccess(res, { 
    status: 200, 
    data: gaps,
    meta: {
      total_gaps: gaps.length,
      total_gap_days: gaps.reduce((sum, gap) => sum + gap.gap_days, 0)
    }
  });
});

exports.getEmployeeHistory = asyncHandler(async (req, res) => {
  const { employee_uuid } = req.params;
  
  const history = await ShiftService.getEmployeeShiftHistory(employee_uuid);
  const gaps = await ShiftService.detectShiftGaps(employee_uuid);
  
  return sendSuccess(res, { 
    status: 200, 
    data: {
      assignments: history,
      gaps: gaps
    }
  });
});
