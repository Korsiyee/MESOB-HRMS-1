const asyncHandler = require("../middleware/asyncHandler");
const { sendSuccess } = require("../utils/response");
const { ApiError } = require("../utils/errors");
const FaceService = require("../services/faceRecognitionService");
const AttendanceService = require("../services/attendanceService");
const { getEmployeeByUuid } = require("../services/employeeService");
const { safeLogEvent } = require("../services/auditLogService");
const { AUDIT_ACTIONS, AUDIT_ENTITY_TYPES } = require("../config/constants");
const { getClientIp } = require("../utils/request");
const { assertEmployeeReadAccess } = require("../utils/rbac");

/**
 * Register face images for an employee
 * POST /api/face-recognition/register
 * Body: { employee_uuid, descriptors: [...] }
 * Files: images (7 images)
 */
exports.registerFaceImages = asyncHandler(async (req, res) => {
  const { employee_uuid, descriptors } = req.body;

  if (!employee_uuid) {
    throw new ApiError("employee_uuid is required.", 400, "VALIDATION_ERROR");
  }

  if (!descriptors) {
    throw new ApiError("Face descriptors are required.", 400, "VALIDATION_ERROR");
  }

  // Verify employee exists
  const employee = await getEmployeeByUuid(employee_uuid);
  assertEmployeeReadAccess(req.user, employee);

  // Parse descriptors
  let parsedDescriptors;
  try {
    parsedDescriptors = typeof descriptors === 'string' ? JSON.parse(descriptors) : descriptors;
  } catch (err) {
    throw new ApiError("Invalid descriptors format.", 400, "INVALID_FORMAT");
  }

  if (!Array.isArray(parsedDescriptors) || parsedDescriptors.length !== 7) {
    throw new ApiError("Exactly 7 face descriptors are required.", 400, "INVALID_DESCRIPTORS");
  }

  // Verify files
  if (!req.files || req.files.length !== 7) {
    throw new ApiError("Exactly 7 face images are required.", 400, "INVALID_IMAGES");
  }

  // Save images and descriptors
  const savedImages = await FaceService.saveFaceImages({
    employeeId: employee_uuid,
    images: req.files,
    descriptors: parsedDescriptors,
  });

  console.log(`[FACE_REGISTRATION] Successfully registered ${savedImages.length} face images for employee ${employee_uuid}`);

  await safeLogEvent({
    actorUuid: req.user?.uuid || null,
    action: AUDIT_ACTIONS.EMPLOYEE_UPDATED,
    entityType: AUDIT_ENTITY_TYPES.EMPLOYEE,
    entityUuid: employee_uuid,
    diff: { face_images_registered: true, images_count: 7 },
    ipAddress: getClientIp(req),
  });

  return sendSuccess(res, {
    status: 201,
    message: "Face images registered successfully.",
    data: { images: savedImages },
  });
});

/**
 * Verify face and get employee match
 * POST /api/face-recognition/verify
 * Body: { descriptor: [...] }
 */
exports.verifyFace = asyncHandler(async (req, res) => {
  const { descriptor } = req.body;

  if (!descriptor || !Array.isArray(descriptor)) {
    throw new ApiError("Face descriptor is required.", 400, "VALIDATION_ERROR");
  }

  // Find matching employee
  const match = await FaceService.findEmployeeByFace(descriptor);

  if (!match) {
    return sendSuccess(res, {
      status: 200,
      data: { matched: false, employee: null },
    });
  }

  return sendSuccess(res, {
    status: 200,
    data: {
      matched: true,
      employee: {
        uuid: match.uuid,
        mesobId: match.mesobId,
        firstName: match.firstName,
        middleName: match.middleName,
        lastName: match.lastName,
        departmentName: match.departmentName,
        matchConfidence: match.matchConfidence,
      },
    },
  });
});

/**
 * Log attendance via face recognition
 * POST /api/face-recognition/attendance
 * Body: { descriptor: [...], type: 'CHECK_IN' | 'CHECK_OUT', timestamp }
 */
exports.logAttendanceByFace = asyncHandler(async (req, res) => {
  const { descriptor, type, timestamp } = req.body;

  if (!descriptor || !Array.isArray(descriptor)) {
    throw new ApiError("Face descriptor is required.", 400, "VALIDATION_ERROR");
  }

  if (!type || !['CHECK_IN', 'CHECK_OUT'].includes(type)) {
    throw new ApiError("Valid type (CHECK_IN or CHECK_OUT) is required.", 400, "VALIDATION_ERROR");
  }

  console.log(`[FACE_RECOGNITION] Attempting ${type} via face recognition at ${timestamp || 'now'}`);

  // Find matching employee
  const match = await FaceService.findEmployeeByFace(descriptor);

  if (!match) {
    console.error(`[FACE_RECOGNITION] No matching employee found for face descriptor`);
    throw new ApiError("No matching employee found. Please try again or contact HR.", 404, "NO_MATCH");
  }

  console.log(`[FACE_RECOGNITION] Matched employee: ${match.uuid} (${match.firstName} ${match.lastName}), confidence: ${match.matchConfidence}`);

  // Verify employee has access
  const employee = await getEmployeeByUuid(match.uuid);
  assertEmployeeReadAccess(req.user, employee);

  try {
    // Log attendance with FACE_RECOGNITION source
    const log = await AttendanceService.logAttendance(
      { 
        employee_uuid: match.uuid, 
        type, 
        timestamp,
        source: 'FACE_RECOGNITION'
      },
      req.user?.employee_uuid || null
    );

    await safeLogEvent({
      actorUuid: req.user?.uuid || null,
      action: type === 'CHECK_IN' 
        ? AUDIT_ACTIONS.ATTENDANCE_LOG_CHECKIN 
        : AUDIT_ACTIONS.ATTENDANCE_LOG_CHECKOUT,
      entityType: AUDIT_ENTITY_TYPES.ATTENDANCE,
      entityUuid: log.uuid,
      diff: { 
        employee_uuid: match.uuid, 
        type, 
        source: 'FACE_RECOGNITION',
        match_confidence: match.matchConfidence,
      },
      ipAddress: getClientIp(req),
    });

    console.log(`[FACE_RECOGNITION] Successfully logged ${type} for employee ${match.uuid}`);

    return sendSuccess(res, {
      status: 201,
      message: `${type === 'CHECK_IN' ? 'Check-in' : 'Check-out'} recorded successfully.`,
      data: {
        log,
        employee: {
          uuid: match.uuid,
          mesobId: match.mesobId,
          firstName: match.firstName,
          middleName: match.middleName,
          lastName: match.lastName,
          departmentName: match.departmentName,
        },
      },
    });
  } catch (error) {
    // Log the specific error with more context
    console.error(`[FACE_RECOGNITION] Failed to log ${type} for employee ${match.uuid}:`, {
      error: error.message,
      code: error.code,
      details: error.details,
      employee: match.uuid,
      type,
      timestamp: timestamp || 'now'
    });
    
    // Re-throw to let error handler format the response
    throw error;
  }
});

/**
 * Check if employee has face images registered
 * GET /api/face-recognition/status/:employee_uuid
 */
exports.getFaceRegistrationStatus = asyncHandler(async (req, res) => {
  const { employee_uuid } = req.params;

  const employee = await getEmployeeByUuid(employee_uuid);
  assertEmployeeReadAccess(req.user, employee);

  const registered = await FaceService.hasFaceImagesRegistered(employee_uuid);

  return sendSuccess(res, {
    status: 200,
    data: { registered, employee_uuid },
  });
});

/**
 * Delete face images for an employee
 * DELETE /api/face-recognition/:employee_uuid
 */
exports.deleteFaceImages = asyncHandler(async (req, res) => {
  const { employee_uuid } = req.params;

  const employee = await getEmployeeByUuid(employee_uuid);
  assertEmployeeReadAccess(req.user, employee);

  await FaceService.deleteFaceImages(employee_uuid);

  await safeLogEvent({
    actorUuid: req.user?.uuid || null,
    action: AUDIT_ACTIONS.EMPLOYEE_UPDATED,
    entityType: AUDIT_ENTITY_TYPES.EMPLOYEE,
    entityUuid: employee_uuid,
    diff: { face_images_deleted: true },
    ipAddress: getClientIp(req),
  });

  return sendSuccess(res, {
    status: 200,
    message: "Face images deleted successfully.",
  });
});

module.exports = exports;
