const PositionService = require("../services/positionService");
const asyncHandler = require("../middleware/asyncHandler");
const { sendSuccess } = require("../utils/response");
const { ApiError } = require("../utils/errors");
const { AUDIT_ACTIONS, AUDIT_ENTITY_TYPES } = require("../config/constants");
const { safeLogEvent } = require("../services/auditLogService");
const { getClientIp } = require("../utils/request");
const {
  validatePositionCreate,
  validatePositionUpdate,
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

exports.listPositions = asyncHandler(async (req, res) => {
  const positions = await PositionService.listPositions({
    departmentUuid: req.query.department_uuid,
  });
  return sendSuccess(res, { status: 200, data: positions });
});

exports.createPosition = asyncHandler(async (req, res) => {
  try {
    console.log('[PositionController] Creating position with body:', JSON.stringify(req.body));
    
    // Defensive guard: ensure body exists
    const body = req.body || {};
    
    // Validate before processing
    assertValidation(validatePositionCreate(body));

    const position = await PositionService.createPosition(body);
    
    await safeLogEvent({
      actorUuid: req.user?.uuid || null,
      action: AUDIT_ACTIONS.POSITION_CREATE,
      entityType: AUDIT_ENTITY_TYPES.POSITION,
      entityUuid: position.uuid,
      diff: { title: position.title },
      ipAddress: getClientIp(req),
    });

    return sendSuccess(res, { status: 201, data: position });
  } catch (error) {
    console.error('[PositionController] Error creating position:', {
      message: error.message,
      stack: error.stack,
      body: req.body,
      statusCode: error.status || error.statusCode,
    });
    
    // If it's a validation or known error, rethrow it
    if (error.status || error.statusCode) {
      throw error;
    }
    
    // Otherwise, wrap as 400 Bad Request with details
    throw new ApiError(
      `Failed to create position: ${error.message}`,
      400,
      "CREATE_POSITION_ERROR"
    );
  }
});

exports.getPosition = asyncHandler(async (req, res) => {
  const position = await PositionService.getPositionByUuid(req.params.uuid);
  if (!position) {
    throw new ApiError("Position not found.", 404, "NOT_FOUND");
  }
  return sendSuccess(res, { status: 200, data: position });
});

exports.updatePosition = asyncHandler(async (req, res) => {
  assertValidation(validatePositionUpdate(req.body || {}));

  const position = await PositionService.updatePosition(
    req.params.uuid,
    req.body || {},
  );

  await safeLogEvent({
    actorUuid: req.user?.uuid || null,
    action: AUDIT_ACTIONS.POSITION_UPDATE,
    entityType: AUDIT_ENTITY_TYPES.POSITION,
    entityUuid: position.uuid,
    diff: { fields: Object.keys(req.body || {}) },
    ipAddress: getClientIp(req),
  });

  return sendSuccess(res, { status: 200, data: position });
});

exports.deletePosition = asyncHandler(async (req, res) => {
  await PositionService.deletePosition(req.params.uuid);

  await safeLogEvent({
    actorUuid: req.user?.uuid || null,
    action: AUDIT_ACTIONS.POSITION_DELETE,
    entityType: AUDIT_ENTITY_TYPES.POSITION,
    entityUuid: req.params.uuid,
    diff: null,
    ipAddress: getClientIp(req),
  });

  return sendSuccess(res, { status: 200, message: "Position deleted." });
});

exports.assignShiftToPosition = asyncHandler(async (req, res) => {
  const { shift_uuid, effective_from } = req.body || {};
  
  if (!shift_uuid) {
    throw new ApiError("shift_uuid is required.", 400, "VALIDATION_ERROR");
  }
  
  if (!effective_from) {
    throw new ApiError("effective_from is required.", 400, "VALIDATION_ERROR");
  }

  const result = await PositionService.assignShiftToPosition(
    req.params.uuid,
    shift_uuid,
    effective_from
  );

  await safeLogEvent({
    actorUuid: req.user?.uuid || null,
    action: "POSITION_SHIFT_ASSIGN",
    entityType: AUDIT_ENTITY_TYPES.POSITION,
    entityUuid: req.params.uuid,
    diff: { shift_uuid, effective_from, ...result },
    ipAddress: getClientIp(req),
  });

  return sendSuccess(res, { 
    status: 200, 
    data: result,
    message: `Shift assigned to position and cascaded to ${result.assigned} employees.`
  });
});

exports.removeShiftFromPosition = asyncHandler(async (req, res) => {
  const result = await PositionService.removeShiftFromPosition(req.params.uuid);

  await safeLogEvent({
    actorUuid: req.user?.uuid || null,
    action: "POSITION_SHIFT_REMOVE",
    entityType: AUDIT_ENTITY_TYPES.POSITION,
    entityUuid: req.params.uuid,
    diff: result,
    ipAddress: getClientIp(req),
  });

  return sendSuccess(res, { 
    status: 200, 
    data: result,
    message: "Shift removed from position."
  });
});
