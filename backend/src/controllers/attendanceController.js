const AttendanceService = require("../services/attendanceService");
const Analytics = require("../services/attendanceAnalyticsService");
const asyncHandler = require("../middleware/asyncHandler");
const { sendSuccess } = require("../utils/response");
const { ApiError } = require("../utils/errors");
const { safeLogEvent } = require("../services/auditLogService");
const { AUDIT_ACTIONS, AUDIT_ENTITY_TYPES } = require("../config/constants");
const { getClientIp } = require("../utils/request");
const { assertEmployeeReadAccess, assertEmployeeListAccess } = require("../utils/rbac");
const { getEmployeeByUuid } = require("../services/employeeService");

/* ─── Log attendance (check-in / check-out) ─── */
exports.logAttendance = asyncHandler(async (req, res) => {
  const { employee_uuid, type, timestamp } = req.body || {};
  
  console.log(`[ATTENDANCE_API] Received ${type} request for employee ${employee_uuid} at ${timestamp || 'now'}`);
  
  if (!employee_uuid || !type) {
    throw new ApiError("employee_uuid and type are required.", 400, "VALIDATION_ERROR");
  }
  
  const employee = await getEmployeeByUuid(employee_uuid);
  assertEmployeeReadAccess(req.user, employee);
  
  try {
    const log = await AttendanceService.logAttendance(
      { employee_uuid, type, timestamp },
      req.user?.employee_uuid || null,
    );
    
    await safeLogEvent({
      actorUuid: req.user?.uuid || null,
      action: type === "CHECK_IN" ? AUDIT_ACTIONS.ATTENDANCE_LOG_CHECKIN : AUDIT_ACTIONS.ATTENDANCE_LOG_CHECKOUT,
      entityType: AUDIT_ENTITY_TYPES.ATTENDANCE,
      entityUuid: log.uuid,
      diff: { employee_uuid, type, date: log.date },
      ipAddress: getClientIp(req),
    });
    
    console.log(`[ATTENDANCE_API] Successfully logged ${type} for employee ${employee_uuid}, log uuid: ${log.uuid}`);
    
    return sendSuccess(res, { status: 201, data: log });
  } catch (error) {
    console.error(`[ATTENDANCE_API] Failed to log ${type} for employee ${employee_uuid}:`, {
      error: error.message,
      code: error.code,
      details: error.details
    });
    throw error;
  }
});

/* ─── Get today's attendance status ─── */
exports.getTodayStatus = asyncHandler(async (req, res) => {
  const { uuid } = req.params;
  const employee = await getEmployeeByUuid(uuid);
  assertEmployeeReadAccess(req.user, employee);
  const status = await AttendanceService.getTodayAttendanceStatus(uuid);
  return sendSuccess(res, { status: 200, data: status });
});

/* ─── Create attendance summary record directly (admin) ─── */
exports.createAttendance = asyncHandler(async (req, res) => {
  const { employee_uuid, date, status, shift_uuid } = req.body || {};
  if (!employee_uuid || !date || !status) {
    throw new ApiError("employee_uuid, date and status are required.", 400, "VALIDATION_ERROR");
  }
  const employee = await getEmployeeByUuid(employee_uuid);
  assertEmployeeReadAccess(req.user, employee);
  const record = await AttendanceService.createAttendanceSummary({ employee_uuid, date, status, shift_uuid });
  await safeLogEvent({
    actorUuid: req.user?.uuid || null,
    action: AUDIT_ACTIONS.ATTENDANCE_CORRECTED,
    entityType: AUDIT_ENTITY_TYPES.ATTENDANCE,
    entityUuid: record?.uuid,
    diff: { employee_uuid, date, status },
    ipAddress: getClientIp(req),
  });
  return sendSuccess(res, { status: 201, data: record });
});

/* ─── Employee attendance logs ─── */
exports.getEmployeeAttendance = asyncHandler(async (req, res) => {
  const { uuid } = req.params;
  const { startDate, endDate, limit, offset } = req.query || {};
  const employee = await getEmployeeByUuid(uuid);
  assertEmployeeReadAccess(req.user, employee);
  const logs = await AttendanceService.getEmployeeAttendanceLogs(uuid, { startDate, endDate, limit, offset });
  return sendSuccess(res, { status: 200, data: logs });
});

/* ─── Employee attendance summary ─── */
exports.getEmployeeSummary = asyncHandler(async (req, res) => {
  try {
    const { uuid } = req.params;
    const { startDate, endDate } = req.query || {};
    
    console.log('[AttendanceController] getEmployeeSummary called:', {
      uuid,
      startDate,
      endDate,
      user: req.user?.username,
    });
    
    const employee = await getEmployeeByUuid(uuid);
    assertEmployeeReadAccess(req.user, employee);
    const summary = await AttendanceService.getEmployeeAttendanceSummary(uuid, { startDate, endDate });
    
    console.log('[AttendanceController] Summary retrieved successfully');
    
    return sendSuccess(res, { status: 200, data: summary });
  } catch (error) {
    console.error('[AttendanceController] Error in getEmployeeSummary:', {
      message: error.message,
      stack: error.stack,
      uuid: req.params?.uuid,
      startDate: req.query?.startDate,
      endDate: req.query?.endDate,
    });
    throw error; // Re-throw to be handled by asyncHandler
  }
});

/* ─── Admin: all attendance records (paginated) ─── */
exports.getAllAttendance = asyncHandler(async (req, res) => {
  const { departmentUuid, positionUuid, startDate, endDate, status, search, page, pageSize } = req.query || {};
  const scope = assertEmployeeListAccess(req.user);
  const resolvedDepartmentUuid =
    scope.scope === "department" ? scope.departmentUuid : departmentUuid;
  const result = await Analytics.getAttendanceRecords({
    departmentUuid: resolvedDepartmentUuid,
    positionUuid,
    status, startDate, endDate, search,
    page: page || 1,
    pageSize: pageSize || 10,
  });
  return sendSuccess(res, {
    status: 200,
    data: result.records,
    meta: { total: result.total, page: result.page, pageSize: result.pageSize, totalPages: result.totalPages },
  });
});

/* ─── Correct attendance ─── */
exports.correctAttendance = asyncHandler(async (req, res) => {
  const { uuid } = req.params;
  const { status } = req.body || {};
  if (!status) throw new ApiError("status is required.", 400, "VALIDATION_ERROR");
  const summaryAccess = await AttendanceService.getAttendanceSummaryAccess(uuid);
  if (!summaryAccess) {
    throw new ApiError("Attendance summary record not found.", 404, "NOT_FOUND");
  }
  assertEmployeeReadAccess(req.user, {
    uuid: summaryAccess.employee_uuid,
    department_uuid: summaryAccess.department_uuid,
  });
  const correctedByEmployeeUuid = req.user?.employee_uuid || null;
  const updated = await AttendanceService.correctAttendance(uuid, status, correctedByEmployeeUuid);
  await safeLogEvent({
    actorUuid: req.user?.uuid || null,
    action: AUDIT_ACTIONS.ATTENDANCE_CORRECTED,
    entityType: AUDIT_ENTITY_TYPES.ATTENDANCE,
    entityUuid: uuid,
    diff: { status, corrected_by: correctedByEmployeeUuid },
    ipAddress: getClientIp(req),
  });
  return sendSuccess(res, { status: 200, data: updated });
});

/* ─── Delete attendance record (admin) ─── */
exports.deleteAttendance = asyncHandler(async (req, res) => {
  const { uuid } = req.params;
  
  console.log(`[ATTENDANCE_API] Received delete request for attendance summary ${uuid}`);
  
  const summaryAccess = await AttendanceService.getAttendanceSummaryAccess(uuid);
  if (!summaryAccess) {
    throw new ApiError("Attendance summary record not found.", 404, "NOT_FOUND");
  }
  
  assertEmployeeReadAccess(req.user, {
    uuid: summaryAccess.employee_uuid,
    department_uuid: summaryAccess.department_uuid,
  });
  
  console.log(`[ATTENDANCE_API] Deleting attendance for employee ${summaryAccess.employee_uuid}`);
  
  await AttendanceService.deleteAttendanceSummary(uuid);
  
  await safeLogEvent({
    actorUuid: req.user?.uuid || null,
    action: AUDIT_ACTIONS.ATTENDANCE_CORRECTED,
    entityType: AUDIT_ENTITY_TYPES.ATTENDANCE,
    entityUuid: uuid,
    diff: { deleted: true, employee_uuid: summaryAccess.employee_uuid },
    ipAddress: getClientIp(req),
  });
  
  console.log(`[ATTENDANCE_API] Successfully deleted attendance summary ${uuid}`);
  
  return sendSuccess(res, { status: 200, message: "Attendance record deleted." });
});

/* ─── Delete attendance by employee and date (admin) ─── */
exports.deleteAttendanceByEmployeeAndDate = asyncHandler(async (req, res) => {
  const { employee_uuid, date } = req.body || {};
  
  if (!employee_uuid || !date) {
    throw new ApiError("employee_uuid and date are required.", 400, "VALIDATION_ERROR");
  }
  
  console.log(`[ATTENDANCE_API] Received delete request for employee ${employee_uuid} on date ${date}`);
  
  const employee = await getEmployeeByUuid(employee_uuid);
  assertEmployeeReadAccess(req.user, employee);
  
  await AttendanceService.deleteAttendanceByEmployeeAndDate(employee_uuid, date);
  
  await safeLogEvent({
    actorUuid: req.user?.uuid || null,
    action: AUDIT_ACTIONS.ATTENDANCE_CORRECTED,
    entityType: AUDIT_ENTITY_TYPES.ATTENDANCE,
    entityUuid: null,
    diff: { deleted: true, employee_uuid, date },
    ipAddress: getClientIp(req),
  });
  
  console.log(`[ATTENDANCE_API] Successfully deleted attendance for employee ${employee_uuid} on date ${date}`);
  
  return sendSuccess(res, { status: 200, message: "Attendance record deleted." });
});

/* ─── Analytics: overview summary ─── */
exports.getOverviewSummary = asyncHandler(async (req, res) => {
  const { startDate, endDate } = req.query || {};
  const data = await Analytics.getOverviewSummary({ startDate, endDate });
  return sendSuccess(res, { status: 200, data });
});

/* ─── Analytics: trend ─── */
exports.getAttendanceTrend = asyncHandler(async (req, res) => {
  const { startDate, endDate, groupBy } = req.query || {};
  const data = await Analytics.getAttendanceTrend({ startDate, endDate, groupBy });
  return sendSuccess(res, { status: 200, data });
});

/* ─── Analytics: department stats ─── */
exports.getDepartmentStats = asyncHandler(async (req, res) => {
  const { startDate, endDate } = req.query || {};
  const data = await Analytics.getDepartmentStats({ startDate, endDate });
  return sendSuccess(res, { status: 200, data });
});

/* ─── Analytics: top employees ─── */
exports.getTopEmployees = asyncHandler(async (req, res) => {
  const { startDate, endDate, limit } = req.query || {};
  const data = await Analytics.getTopEmployees({ startDate, endDate, limit });
  return sendSuccess(res, { status: 200, data });
});

/* ─── Analytics: recent corrections ─── */
exports.getRecentCorrections = asyncHandler(async (req, res) => {
  const { limit } = req.query || {};
  const data = await Analytics.getRecentCorrections({ limit });
  return sendSuccess(res, { status: 200, data });
});

/* ─── Self-Service Attendance Punch ─── */
exports.selfPunch = asyncHandler(async (req, res) => {
  const { type, source = "MANUAL", descriptor } = req.body || {};
  
  // SECURITY: Always use the authenticated user's employee_uuid
  // NEVER trust employee_uuid from the request body
  const employee_uuid = req.user?.employee_uuid;
  
  if (!employee_uuid) {
    throw new ApiError(
      "User account is not linked to an employee record. Please contact HR.",
      422,
      "NO_EMPLOYEE_LINK"
    );
  }
  
  console.log(`[SELF_PUNCH] ${type} request from employee ${employee_uuid} (source: ${source})`);
  
  if (!type) {
    throw new ApiError("type is required (CHECK_IN or CHECK_OUT).", 400, "VALIDATION_ERROR");
  }
  
  // Validate source
  const validSources = ["MANUAL", "FACE_RECOGNITION"];
  if (!validSources.includes(source)) {
    throw new ApiError(`Invalid source. Must be one of: ${validSources.join(", ")}`, 400, "VALIDATION_ERROR");
  }
  
  // CRITICAL: If source is FACE_RECOGNITION, verify the face descriptor matches the authenticated user
  if (source === "FACE_RECOGNITION") {
    if (!descriptor || !Array.isArray(descriptor)) {
      throw new ApiError(
        "Face descriptor is required for face recognition attendance.",
        400,
        "VALIDATION_ERROR"
      );
    }

    // Validate descriptor format
    if (descriptor.length !== 128) {
      console.error(`[SELF_PUNCH] Invalid descriptor length: ${descriptor.length}, expected 128`);
      throw new ApiError(
        "Invalid face descriptor format. Please try scanning again.",
        400,
        "INVALID_DESCRIPTOR"
      );
    }

    // Validate all values are numbers
    if (!descriptor.every(v => typeof v === 'number' && !isNaN(v))) {
      console.error(`[SELF_PUNCH] Face descriptor contains invalid values`);
      throw new ApiError(
        "Invalid face descriptor data. Please try scanning again.",
        400,
        "INVALID_DESCRIPTOR"
      );
    }
    
    console.log(`[SELF_PUNCH] Validating face descriptor for employee ${employee_uuid}`);
    
    const FaceService = require("../services/faceRecognitionService");
    // Use stricter threshold (0.4) for self-punch security
    const match = await FaceService.findEmployeeByFace(descriptor, 0.4);
    
    if (!match) {
      console.error(`[SELF_PUNCH] Face verification failed - no match found for employee ${employee_uuid}`);
      throw new ApiError(
        "Face not recognized. Please ensure good lighting and try again, or contact HR to register your face.",
        403,
        "FACE_NOT_RECOGNIZED"
      );
    }
    
    // CRITICAL SECURITY CHECK: The matched face MUST belong to the authenticated user
    if (match.uuid !== employee_uuid) {
      console.error(`[SELF_PUNCH] SECURITY VIOLATION - Face verification failed - matched ${match.uuid} (${match.firstName} ${match.lastName}) but authenticated as ${employee_uuid}`);
      console.error(`[SELF_PUNCH] Match confidence: ${match.matchConfidence}, distance: ${match.matchDistance}`);
      
      // Log security event
      await safeLogEvent({
        actorUuid: req.user?.uuid || null,
        action: AUDIT_ACTIONS.ATTENDANCE_LOG_CHECKIN,
        entityType: AUDIT_ENTITY_TYPES.ATTENDANCE,
        entityUuid: null,
        diff: { 
          security_violation: true,
          reason: 'FACE_IDENTITY_MISMATCH',
          authenticated_employee: employee_uuid,
          matched_employee: match.uuid,
          match_confidence: match.matchConfidence,
          match_distance: match.matchDistance,
          client_ip: getClientIp(req)
        },
        ipAddress: getClientIp(req),
      });
      
      throw new ApiError(
        "Face does not match your account. Attendance can only be recorded with your own face.",
        403,
        "FACE_MISMATCH"
      );
    }
    
    console.log(`[SELF_PUNCH] Face verified successfully for employee ${employee_uuid} (confidence: ${match.matchConfidence?.toFixed(3)}, distance: ${match.matchDistance?.toFixed(3)})`);
  }
  
  try {
    const log = await AttendanceService.logAttendance(
      { 
        employee_uuid, 
        type, 
        timestamp: null, // Use current time
        source 
      },
      employee_uuid, // Actor is the employee themselves
    );
    
    await safeLogEvent({
      actorUuid: req.user?.uuid || null,
      action: type === "CHECK_IN" ? AUDIT_ACTIONS.ATTENDANCE_LOG_CHECKIN : AUDIT_ACTIONS.ATTENDANCE_LOG_CHECKOUT,
      entityType: AUDIT_ENTITY_TYPES.ATTENDANCE,
      entityUuid: log.uuid,
      diff: { 
        employee_uuid, 
        type, 
        date: log.date, 
        source,
        self_service: true,
        network: req.companyNetwork ? {
          label: req.companyNetwork.network?.label,
          client_ip: req.companyNetwork.clientIp
        } : null
      },
      ipAddress: getClientIp(req),
    });
    
    console.log(`[SELF_PUNCH] Successfully logged ${type} for employee ${employee_uuid}`);
    
    return sendSuccess(res, { 
      status: 201, 
      message: `${type === "CHECK_IN" ? "Check-in" : "Check-out"} recorded successfully.`,
      data: log 
    });
  } catch (error) {
    console.error(`[SELF_PUNCH] Failed to log ${type} for employee ${employee_uuid}:`, {
      error: error.message,
      code: error.code,
      details: error.details
    });
    throw error;
  }
});

/* ─── Get Today's Punch Status for Self-Service ─── */
exports.getTodayPunchStatus = asyncHandler(async (req, res) => {
  const employee_uuid = req.user?.employee_uuid;
  
  if (!employee_uuid) {
    throw new ApiError(
      "User account is not linked to an employee record.",
      422,
      "NO_EMPLOYEE_LINK"
    );
  }
  
  const status = await AttendanceService.getTodayAttendanceStatus(employee_uuid);
  return sendSuccess(res, { status: 200, data: status });
});
