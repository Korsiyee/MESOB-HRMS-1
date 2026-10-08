const { randomUUID } = require("crypto");
const { executeQuery, withTransaction } = require("../utils/dbQuery");
const { ApiError } = require("../utils/errors");
const { ATTENDANCE_STATUS } = require("../config/constants");
const {
  formatDate,
  isWeekend,
  getDateRange,
} = require("./calendarService");

// Default thresholds (will be overridden by shift-specific settings)
const DEFAULT_GRACE_PERIOD_MINUTES = 15;
const HALF_DAY_THRESHOLD = 0.5;

// Attendance lifecycle states
const ATTENDANCE_STATES = {
  PENDING: 'PENDING',
  CHECKED_IN: 'CHECKED_IN',
  CHECKED_OUT: 'CHECKED_OUT',
  CALCULATED: 'CALCULATED'
};

/**
 * Log attendance check-in or check-out
 * @param {object} payload - { employee_uuid, type: 'CHECK_IN'|'CHECK_OUT', timestamp, source }
 * @param {string} actorUuid - Who logged this
 * @returns {object} Created log
 */
async function logAttendance(payload, actorUuid) {
  const { employee_uuid, type, timestamp, source = 'MANUAL' } = payload;

  // Validate employee
  const [employees] = await executeQuery(
    "SELECT uuid, status, attendance_exempt FROM Employees WHERE uuid = ? LIMIT 1",
    [String(employee_uuid || "").trim()],
  );

  if (!employees.length) {
    throw new ApiError("Employee not found.", 404, "NOT_FOUND");
  }

  const employee = employees[0];

  if (employee.status !== "ACTIVE") {
    throw new ApiError(
      "Cannot log attendance for inactive employee.",
      422,
      "EMPLOYEE_INACTIVE",
    );
  }

  if (employee.attendance_exempt) {
    throw new ApiError(
      "Employee is exempt from attendance tracking.",
      422,
      "ATTENDANCE_EXEMPT",
    );
  }

  // Validate type
  if (!["CHECK_IN", "CHECK_OUT"].includes(type)) {
    throw new ApiError(
      "Type must be CHECK_IN or CHECK_OUT.",
      400,
      "VALIDATION_ERROR",
    );
  }

  // Parse timestamp
  const logTime = timestamp ? new Date(timestamp) : new Date();
  if (isNaN(logTime.getTime())) {
    throw new ApiError("Invalid timestamp.", 400, "VALIDATION_ERROR");
  }

  const logDate = formatDate(logTime);

  // Additional validation: ensure formatDate returned a valid date
  if (!logDate) {
    console.error(`[ATTENDANCE] Failed to format timestamp: ${timestamp || 'now'} (parsed as ${logTime.toISOString()})`);
    throw new ApiError("Failed to parse attendance date.", 400, "VALIDATION_ERROR");
  }

  // Validate source
  const validSources = ['MANUAL', 'DEVICE', 'SYSTEM', 'FACE_RECOGNITION'];
  const logSource = validSources.includes(source) ? source : 'MANUAL';

  // Log the validation check for debugging
  console.log(`[ATTENDANCE] Validating ${type} for employee ${employee_uuid} on date ${logDate} (timestamp: ${logTime.toISOString()}, source: ${logSource})`);

  // Use transaction with row-level locking to prevent race conditions
  return withTransaction(async (connection) => {
    // Lock the row for this employee and date to prevent concurrent modifications
    const [existingLogs] = await connection.execute(
      "SELECT uuid, check_in, check_out, date FROM AttendanceLogs WHERE employee_uuid = ? AND date = ? LIMIT 1 FOR UPDATE",
      [employee_uuid, logDate],
    );

    const existingLog = existingLogs[0];

    // Log the database query result
    if (existingLog) {
      console.log(`[ATTENDANCE] Found existing log: uuid=${existingLog.uuid}, date=${existingLog.date}, check_in=${existingLog.check_in}, check_out=${existingLog.check_out}`);
    } else {
      console.log(`[ATTENDANCE] No existing log found for employee ${employee_uuid} on date ${logDate}`);
    }

    // Rule enforcement with detailed logging
    if (type === "CHECK_IN") {
      if (existingLog && existingLog.check_in) {
        console.error(`[ATTENDANCE] CHECK_IN blocked: Record ${existingLog.uuid} already has check_in=${existingLog.check_in} for date ${existingLog.date}`);
        throw new ApiError(
          "Already checked in for today. Check-in can only be performed once per day.",
          422,
          "ALREADY_CHECKED_IN",
          { 
            existingRecordUuid: existingLog.uuid,
            existingCheckIn: existingLog.check_in,
            attemptedDate: logDate
          }
        );
      }
      console.log(`[ATTENDANCE] CHECK_IN validation passed - no existing check-in found`);
    } else if (type === "CHECK_OUT") {
      if (!existingLog || !existingLog.check_in) {
        console.error(`[ATTENDANCE] CHECK_OUT blocked: No check-in record exists for date ${logDate}`);
        throw new ApiError(
          "Cannot check out without checking in first.",
          422,
          "NO_CHECK_IN",
          {
            attemptedDate: logDate
          }
        );
      }
      if (existingLog.check_out) {
        console.error(`[ATTENDANCE] CHECK_OUT blocked: Record ${existingLog.uuid} already has check_out=${existingLog.check_out} for date ${existingLog.date}`);
        throw new ApiError(
          "Already checked out for today. Check-out can only be performed once per day.",
          422,
          "ALREADY_CHECKED_OUT",
          {
            existingRecordUuid: existingLog.uuid,
            existingCheckOut: existingLog.check_out,
            attemptedDate: logDate
          }
        );
      }
      console.log(`[ATTENDANCE] CHECK_OUT validation passed - check-in exists, no check-out yet`);
    }

    let uuid;
    let logCreated = false;

    try {
      // Insert or update log with lifecycle state
      if (existingLog) {
        // Update existing record
        uuid = existingLog.uuid;
        const newState = type === "CHECK_IN" ? ATTENDANCE_STATES.CHECKED_IN : ATTENDANCE_STATES.CHECKED_OUT;
        console.log(`[ATTENDANCE] Updating existing log ${uuid} with ${type}, new state: ${newState}`);
        await connection.execute(
          `UPDATE AttendanceLogs 
           SET ${type === "CHECK_IN" ? "check_in" : "check_out"} = ?, 
               state = ?,
               source = ?, 
               updated_at = CURRENT_TIMESTAMP
           WHERE uuid = ?`,
          [logTime, newState, logSource, uuid],
        );
      } else {
        // Create new record (only for CHECK_IN)
        uuid = randomUUID();
        console.log(`[ATTENDANCE] Creating new log ${uuid} for CHECK_IN on date ${logDate} with state CHECKED_IN`);
        await connection.execute(
          `INSERT INTO AttendanceLogs (uuid, employee_uuid, date, check_in, state, source, created_at)
           VALUES (?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)`,
          [uuid, employee_uuid, logDate, logTime, ATTENDANCE_STATES.CHECKED_IN, logSource],
        );
        logCreated = true;
      }

      // For CHECK_OUT, trigger attendance calculations
      if (type === "CHECK_OUT") {
        console.log(`[ATTENDANCE] Triggering attendance calculations for checkout`);
        await calculateAndUpsertAttendance(employee_uuid, logDate, connection);
      } else {
        // For CHECK_IN, just compute status without full calculations
        console.log(`[ATTENDANCE] Computing daily summary for check-in`);
        await computeAndUpsertDailySummary(employee_uuid, logDate, connection);
      }

      console.log(`[ATTENDANCE] Successfully logged ${type} for employee ${employee_uuid} on ${logDate}`);
      
      return {
        uuid,
        employee_uuid,
        date: logDate,
        type,
        timestamp: logTime.toISOString(),
      };
    } catch (error) {
      // Log the error details
      console.error(`[ATTENDANCE] Error during ${type} for employee ${employee_uuid}:`, error.message);
      
      // CRITICAL: If ANY error occurs and we created a new log, ALWAYS rollback
      // This prevents orphaned AttendanceLogs records without summaries
      if (logCreated && uuid) {
        console.log(`[ATTENDANCE] Rolling back created log ${uuid} due to error: ${error.message}`);
        try {
          await connection.execute(
            "DELETE FROM AttendanceLogs WHERE uuid = ?",
            [uuid],
          );
          console.log(`[ATTENDANCE] Successfully rolled back log ${uuid}`);
        } catch (rollbackError) {
          console.error('[ATTENDANCE] CRITICAL: Failed to rollback attendance log:', rollbackError);
          // If rollback fails, manually clean up orphaned record
          console.error(`[ATTENDANCE] ORPHANED RECORD ALERT: Manual cleanup needed for log ${uuid}, employee ${employee_uuid}, date ${logDate}`);
        }
      }
      
      // Re-throw the original error with better context
      if (error.code === 'NO_ACTIVE_SHIFT') {
        // Provide more helpful message for missing shift
        throw new ApiError(
          `Cannot record attendance: No shift assigned for ${logDate}. Please assign a shift first.`,
          422,
          "NO_ACTIVE_SHIFT",
          { employee_uuid, date: logDate }
        );
      }
      
      throw error;
    }
  });
}

/**
 * Compute and upsert daily attendance summary for an employee on a specific date
 * @param {string} employeeUuid
 * @param {string} date - YYYY-MM-DD
 * @param {object} connection - Optional database connection to use (for transactions)
 * @throws {ApiError} if no active shift found
 */
async function computeAndUpsertDailySummary(employeeUuid, date, connection = null) {
  console.log(`[ATTENDANCE] Computing summary for employee ${employeeUuid} on date ${date}`);
  
  // Use provided connection or create a new query
  const query = async (sql, params) => {
    if (connection) {
      return connection.execute(sql, params);
    } else {
      return executeQuery(sql, params);
    }
  };
  
  // Get employee's active shift for this date with grace period
  const [shifts] = await query(
    `
      SELECT s.uuid, s.name, s.start_time, s.end_time, s.working_days_json,
             s.grace_period_minutes, s.break_duration_minutes,
             es.effective_from, es.effective_to
      FROM EmployeeShifts es
      INNER JOIN ShiftDefinitions s ON s.uuid = es.shift_uuid
      WHERE es.employee_uuid = ?
        AND es.effective_from <= ?
        AND (es.effective_to IS NULL OR es.effective_to >= ?)
      ORDER BY es.effective_from DESC
      LIMIT 1
    `,
    [employeeUuid, date, date],
  );

  if (!shifts.length) {
    console.error(`[ATTENDANCE] No active shift found for employee ${employeeUuid} on date ${date}`);
    throw new ApiError(
      `No active shift assigned for this date (${date}). Please assign a shift before recording attendance.`,
      422,
      "NO_ACTIVE_SHIFT",
      { 
        employee_uuid: employeeUuid, 
        date: date 
      }
    );
  }

  const shift = shifts[0];
  const gracePeriodMinutes = shift.grace_period_minutes || DEFAULT_GRACE_PERIOD_MINUTES;
  console.log(`[ATTENDANCE] Found shift ${shift.uuid} (start: ${shift.start_time}, end: ${shift.end_time})`);
  console.log(`[ATTENDANCE] Raw working_days_json: ${JSON.stringify(shift.working_days_json)}`);
  
  let workingDays = [];
  try {
    let parsed = shift.working_days_json;
    
    // If it's a string, parse it
    if (typeof parsed === "string") {
      parsed = JSON.parse(parsed);
    }
    
    // Ensure it's an array
    if (Array.isArray(parsed)) {
      // Convert day names or numbers to numeric day-of-week (0-6)
      const dayNameMap = {
        'sunday': 0, 'sun': 0,
        'monday': 1, 'mon': 1,
        'tuesday': 2, 'tue': 2, 'tues': 2,
        'wednesday': 3, 'wed': 3,
        'thursday': 4, 'thu': 4, 'thur': 4, 'thurs': 4,
        'friday': 5, 'fri': 5,
        'saturday': 6, 'sat': 6
      };
      
      workingDays = parsed.map(day => {
        // If it's already a number, use it
        if (typeof day === 'number') {
          return day;
        }
        
        // If it's a string that looks like a number, convert it
        if (typeof day === 'string' && /^\d+$/.test(day)) {
          return Number(day);
        }
        
        // If it's a day name string, map it to a number
        if (typeof day === 'string') {
          const normalized = day.toLowerCase().trim();
          if (dayNameMap[normalized] !== undefined) {
            return dayNameMap[normalized];
          }
        }
        
        console.warn(`[ATTENDANCE] Could not parse working day: ${day}`);
        return null;
      }).filter(day => day !== null); // Remove any unparseable values
    }
    
    // If working_days_json is empty or null, default to Monday-Friday (1,2,3,4,5)
    if (workingDays.length === 0) {
      console.log(`[ATTENDANCE] No working days defined in shift, defaulting to Monday-Friday (1,2,3,4,5)`);
      workingDays = [1, 2, 3, 4, 5]; // Monday to Friday
    }
    
    console.log(`[ATTENDANCE] Parsed working days: ${JSON.stringify(workingDays)}`);
  } catch (parseError) {
    console.error(`[ATTENDANCE] Failed to parse working_days_json for shift ${shift.uuid}:`, parseError);
    // Default to Monday-Friday if parsing fails
    workingDays = [1, 2, 3, 4, 5];
  }

  // Parse the date to get day of week (0=Sunday, 1=Monday, ..., 6=Saturday)
  const dateObj = new Date(date + 'T00:00:00Z');
  const dayOfWeek = dateObj.getUTCDay();
  const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  console.log(`[ATTENDANCE] Date ${date} is ${dayNames[dayOfWeek]} (day ${dayOfWeek}), working days: ${JSON.stringify(workingDays)}`);

  // Check if this is a working day for this employee's shift
  const isWorkingDay = workingDays.includes(dayOfWeek);
  console.log(`[ATTENDANCE] Is working day: ${isWorkingDay}`);
  
  if (!isWorkingDay) {
    console.error(`[ATTENDANCE] ${date} is not a working day for this shift`);
    throw new ApiError(
      `${date} (${dayNames[dayOfWeek]}) is not a working day for this employee's shift. Attendance cannot be recorded on non-working days.`,
      422,
      "NOT_WORKING_DAY",
      { 
        employee_uuid: employeeUuid, 
        date: date,
        day_of_week: dayNames[dayOfWeek],
        day_of_week_number: dayOfWeek,
        working_days: workingDays,
        working_day_names: workingDays.map(d => dayNames[d])
      }
    );
  }

  // Check if there's an approved leave request covering this date
  const [leaveRequests] = await query(
    `
      SELECT uuid
      FROM leaveRequests
      WHERE employee_uuid = ?
        AND status = 'APPROVED'
        AND startDate <= ?
        AND endDate >= ?
      LIMIT 1
    `,
    [employeeUuid, date, date],
  );

  if (leaveRequests.length) {
    console.log(`[ATTENDANCE] Employee is on approved leave`);
    await upsertAttendanceSummary({
      employeeUuid,
      date,
      status: ATTENDANCE_STATUS.ON_LEAVE,
      shiftUuid: shift.uuid,
      leaveRequestUuid: leaveRequests[0].uuid,
      correctedBy: null,
    }, connection);
    return;
  }

  // Fetch attendance logs for this date
  const [logs] = await query(
    "SELECT check_in, check_out FROM AttendanceLogs WHERE employee_uuid = ? AND date = ? LIMIT 1",
    [employeeUuid, date],
  );

  if (!logs.length || !logs[0].check_in) {
    // No check-in = ABSENT (only on working days)
    console.log(`[ATTENDANCE] No check-in found - status: ABSENT`);
    await upsertAttendanceSummary({
      employeeUuid,
      date,
      status: ATTENDANCE_STATUS.ABSENT,
      shiftUuid: shift.uuid,
      leaveRequestUuid: null,
      correctedBy: null,
    }, connection);
    return;
  }

  const log = logs[0];
  const checkIn = new Date(log.check_in);
  const shiftStart = parseTimeToDate(date, shift.start_time);

  console.log(`[ATTENDANCE] Check-in: ${checkIn.toISOString()}, Shift start: ${shiftStart.toISOString()}`);

  // Calculate if employee is late based on shift start time with grace period
  const gracePeriodMs = gracePeriodMinutes * 60 * 1000;
  const timeDiffMs = checkIn - shiftStart;
  const isLate = timeDiffMs > gracePeriodMs;

  console.log(`[ATTENDANCE] Time difference: ${Math.round(timeDiffMs / 60000)} minutes, grace period: ${gracePeriodMinutes} minutes, isLate: ${isLate}`);

  // Determine status: LATE if checked in after grace period, otherwise PRESENT
  const status = isLate ? ATTENDANCE_STATUS.LATE : ATTENDANCE_STATUS.PRESENT;

  console.log(`[ATTENDANCE] Final status: ${status}`);

  await upsertAttendanceSummary({
    employeeUuid,
    date,
    status,
    shiftUuid: shift.uuid,
    shiftName: shift.name,
    shiftStartTime: shift.start_time,
    shiftEndTime: shift.end_time,
    leaveRequestUuid: null,
    correctedBy: null,
  }, connection);
}

/**
 * Upsert attendance summary record with shift snapshot (without calculations)
 * Used for check-in and status changes that don't require full calculation
 * @param {object} connection - Optional database connection to use (for transactions)
 */
async function upsertAttendanceSummary({
  employeeUuid,
  date,
  status,
  shiftUuid,
  shiftName,
  shiftStartTime,
  shiftEndTime,
  leaveRequestUuid,
  correctedBy,
}, connection = null) {
  const uuid = randomUUID();
  
  // Use provided connection or create a new query
  const query = async (sql, params) => {
    if (connection) {
      return connection.execute(sql, params);
    } else {
      return executeQuery(sql, params);
    }
  };
  
  await query(
    `
      INSERT INTO AttendanceSummary (
        uuid, employee_uuid, date, status, shift_uuid, 
        shift_name_snapshot, shift_start_time_snapshot, shift_end_time_snapshot,
        leave_request_uuid, corrected_by
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON DUPLICATE KEY UPDATE
        status = VALUES(status),
        shift_uuid = VALUES(shift_uuid),
        shift_name_snapshot = VALUES(shift_name_snapshot),
        shift_start_time_snapshot = VALUES(shift_start_time_snapshot),
        shift_end_time_snapshot = VALUES(shift_end_time_snapshot),
        leave_request_uuid = VALUES(leave_request_uuid),
        corrected_by = VALUES(corrected_by),
        updated_at = CURRENT_TIMESTAMP
    `,
    [uuid, employeeUuid, date, status, shiftUuid, shiftName, shiftStartTime, shiftEndTime, leaveRequestUuid, correctedBy],
  );
}

/**
 * Parse time string (HH:MM or HH:MM:SS) to Date object for a given date
 */
function parseTimeToDate(dateStr, timeStr) {
  const [hours, minutes] = timeStr.split(":").map(Number);
  const [year, month, day] = dateStr.split("-").map(Number);
  return new Date(year, month - 1, day, hours, minutes, 0);
}

/**
 * Calculate shift duration in hours
 * Handles overnight shifts (e.g., 23:00 to 07:00)
 */
function calculateShiftDuration(startTime, endTime) {
  const [startHours, startMinutes] = startTime.split(":").map(Number);
  const [endHours, endMinutes] = endTime.split(":").map(Number);
  
  let durationMinutes = (endHours * 60 + endMinutes) - (startHours * 60 + startMinutes);
  
  // Handle overnight shifts
  if (durationMinutes < 0) {
    durationMinutes += 24 * 60; // Add 24 hours
  }
  
  return durationMinutes / 60; // Convert to hours
}

/**
 * Calculate worked hours from check-in and check-out times
 * Deducts break duration
 */
function calculateWorkedHours(checkIn, checkOut, breakDurationMinutes = 0) {
  if (!checkIn || !checkOut) {
    return null;
  }
  
  const checkInTime = new Date(checkIn);
  const checkOutTime = new Date(checkOut);
  
  // Calculate total time in milliseconds
  const totalMs = checkOutTime - checkInTime;
  
  if (totalMs < 0) {
    return 0; // Invalid: checkout before checkin
  }
  
  // Convert to hours and subtract break
  const totalHours = totalMs / (1000 * 60 * 60);
  const breakHours = (breakDurationMinutes || 0) / 60;
  const workedHours = Math.max(0, totalHours - breakHours);
  
  // Round to 2 decimal places
  return Math.round(workedHours * 100) / 100;
}

/**
 * Calculate overtime hours
 * Overtime = worked hours exceeding shift duration
 */
function calculateOvertimeHours(workedHours, shiftDurationHours) {
  if (workedHours === null || workedHours === undefined || shiftDurationHours === null || shiftDurationHours === undefined) {
    return null;
  }
  
  const overtime = Math.max(0, workedHours - shiftDurationHours);
  return Math.round(overtime * 100) / 100;
}

/**
 * Calculate missing hours (undertime)
 * Missing = shift duration not completed by employee
 */
function calculateMissingHours(workedHours, shiftDurationHours) {
  if (workedHours === null || workedHours === undefined || shiftDurationHours === null || shiftDurationHours === undefined) {
    return null;
  }
  
  const missing = Math.max(0, shiftDurationHours - workedHours);
  return Math.round(missing * 100) / 100;
}

/**
 * Calculate late minutes compared to shift start time
 * Uses grace period from shift definition
 */
function calculateLateMinutes(checkInTime, shiftStartTime, gracePeriodMinutes = DEFAULT_GRACE_PERIOD_MINUTES) {
  if (!checkInTime || !shiftStartTime) {
    return null;
  }
  
  const checkIn = new Date(checkInTime);
  const shiftStart = new Date(shiftStartTime);
  
  const diffMs = checkIn - shiftStart;
  const diffMinutes = Math.floor(diffMs / (1000 * 60));
  
  // Only count as late if beyond grace period
  const lateMinutes = Math.max(0, diffMinutes - gracePeriodMinutes);
  
  return lateMinutes;
}

/**
 * Determine attendance status based on all factors
 * Enhanced version that considers grace period from shift
 */
function determineAttendanceStatus(checkIn, shiftStart, gracePeriodMinutes, workedHours, shiftDurationHours) {
  if (!checkIn) {
    return ATTENDANCE_STATUS.ABSENT;
  }
  
  // Calculate if late using grace period
  const lateMinutes = calculateLateMinutes(checkIn, shiftStart, gracePeriodMinutes);
  
  // If late beyond grace period, mark as LATE
  if (lateMinutes > 0) {
    return ATTENDANCE_STATUS.LATE;
  }
  
  // Check if worked less than half day
  if (workedHours !== null && shiftDurationHours !== null) {
    if (workedHours < (shiftDurationHours * HALF_DAY_THRESHOLD)) {
      // Could add HALF_DAY status in the future
      // For now, still mark as PRESENT
      return ATTENDANCE_STATUS.PRESENT;
    }
  }
  
  return ATTENDANCE_STATUS.PRESENT;
}

/**
 * Calculate and upsert attendance with all calculations
 * This is called after checkout to perform full attendance calculation
 */
async function calculateAndUpsertAttendance(employeeUuid, date, connection = null) {
  console.log(`[ATTENDANCE] Performing full attendance calculation for employee ${employeeUuid} on date ${date}`);
  
  const query = async (sql, params) => {
    if (connection) {
      return connection.execute(sql, params);
    } else {
      return executeQuery(sql, params);
    }
  };
  
  // Get employee's active shift for this date with grace period and break duration
  const [shifts] = await query(
    `
      SELECT s.uuid, s.name, s.start_time, s.end_time, s.working_days_json,
             s.grace_period_minutes, s.break_duration_minutes,
             es.effective_from, es.effective_to
      FROM EmployeeShifts es
      INNER JOIN ShiftDefinitions s ON s.uuid = es.shift_uuid
      WHERE es.employee_uuid = ?
        AND es.effective_from <= ?
        AND (es.effective_to IS NULL OR es.effective_to >= ?)
      ORDER BY es.effective_from DESC
      LIMIT 1
    `,
    [employeeUuid, date, date],
  );

  if (!shifts.length) {
    console.error(`[ATTENDANCE] No active shift found for employee ${employeeUuid} on date ${date}`);
    throw new ApiError(
      `No active shift assigned for this date (${date}).`,
      422,
      "NO_ACTIVE_SHIFT"
    );
  }

  const shift = shifts[0];
  const gracePeriodMinutes = shift.grace_period_minutes || DEFAULT_GRACE_PERIOD_MINUTES;
  const breakDurationMinutes = shift.break_duration_minutes || 0;
  
  console.log(`[ATTENDANCE] Shift: ${shift.name}, grace: ${gracePeriodMinutes}min, break: ${breakDurationMinutes}min`);
  
  // Check for approved leave
  const [leaveRequests] = await query(
    `
      SELECT uuid
      FROM leaveRequests
      WHERE employee_uuid = ?
        AND status = 'APPROVED'
        AND startDate <= ?
        AND endDate >= ?
      LIMIT 1
    `,
    [employeeUuid, date, date],
  );

  if (leaveRequests.length) {
    console.log(`[ATTENDANCE] Employee is on approved leave`);
    await upsertAttendanceSummaryWithCalculations({
      employeeUuid,
      date,
      status: ATTENDANCE_STATUS.ON_LEAVE,
      shiftUuid: shift.uuid,
      shiftName: shift.name,
      shiftStartTime: shift.start_time,
      shiftEndTime: shift.end_time,
      leaveRequestUuid: leaveRequests[0].uuid,
      workedHours: null,
      overtimeHours: null,
      missingHours: null,
      lateMinutes: null,
      breakDurationMinutes: null,
      correctedBy: null,
    }, connection);
    return;
  }

  // Fetch attendance logs
  const [logs] = await query(
    "SELECT check_in, check_out FROM AttendanceLogs WHERE employee_uuid = ? AND date = ? LIMIT 1",
    [employeeUuid, date],
  );

  if (!logs.length || !logs[0].check_in) {
    // No check-in = ABSENT
    console.log(`[ATTENDANCE] No check-in found - status: ABSENT`);
    await upsertAttendanceSummaryWithCalculations({
      employeeUuid,
      date,
      status: ATTENDANCE_STATUS.ABSENT,
      shiftUuid: shift.uuid,
      shiftName: shift.name,
      shiftStartTime: shift.start_time,
      shiftEndTime: shift.end_time,
      leaveRequestUuid: null,
      workedHours: null,
      overtimeHours: null,
      missingHours: null,
      lateMinutes: null,
      breakDurationMinutes: null,
      correctedBy: null,
    }, connection);
    return;
  }

  const log = logs[0];
  const checkIn = log.check_in;
  const checkOut = log.check_out;
  
  // Calculate shift duration
  const shiftDurationHours = calculateShiftDuration(shift.start_time, shift.end_time);
  const shiftStart = parseTimeToDate(date, shift.start_time);
  
  // Calculate worked hours (only if checked out)
  const workedHours = checkOut ? calculateWorkedHours(checkIn, checkOut, breakDurationMinutes) : null;
  
  // Calculate overtime and missing hours
  const overtimeHours = workedHours !== null ? calculateOvertimeHours(workedHours, shiftDurationHours) : null;
  const missingHours = workedHours !== null ? calculateMissingHours(workedHours, shiftDurationHours) : null;
  
  // Calculate late minutes
  const lateMinutes = calculateLateMinutes(checkIn, shiftStart, gracePeriodMinutes);
  
  // Determine final status
  const status = determineAttendanceStatus(checkIn, shiftStart, gracePeriodMinutes, workedHours, shiftDurationHours);
  
  console.log(`[ATTENDANCE] Calculations: worked=${workedHours}h, overtime=${overtimeHours}h, missing=${missingHours}h, late=${lateMinutes}min, status=${status}`);
  
  await upsertAttendanceSummaryWithCalculations({
    employeeUuid,
    date,
    status,
    shiftUuid: shift.uuid,
    shiftName: shift.name,
    shiftStartTime: shift.start_time,
    shiftEndTime: shift.end_time,
    leaveRequestUuid: null,
    workedHours,
    overtimeHours,
    missingHours,
    lateMinutes,
    breakDurationMinutes,
    correctedBy: null,
  }, connection);
  
  // Update log state to CALCULATED
  await query(
    "UPDATE AttendanceLogs SET state = ? WHERE employee_uuid = ? AND date = ?",
    [ATTENDANCE_STATES.CALCULATED, employeeUuid, date]
  );
}

/**
 * Upsert attendance summary with all calculated fields
 */
async function upsertAttendanceSummaryWithCalculations({
  employeeUuid,
  date,
  status,
  shiftUuid,
  shiftName,
  shiftStartTime,
  shiftEndTime,
  leaveRequestUuid,
  workedHours,
  overtimeHours,
  missingHours,
  lateMinutes,
  breakDurationMinutes,
  correctedBy,
}, connection = null) {
  const uuid = randomUUID();
  
  const query = async (sql, params) => {
    if (connection) {
      return connection.execute(sql, params);
    } else {
      return executeQuery(sql, params);
    }
  };
  
  await query(
    `
      INSERT INTO AttendanceSummary (
        uuid, employee_uuid, date, status, shift_uuid, 
        shift_name_snapshot, shift_start_time_snapshot, shift_end_time_snapshot,
        leave_request_uuid, worked_hours, overtime_hours, missing_hours,
        late_minutes, break_duration_minutes, corrected_by
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON DUPLICATE KEY UPDATE
        status = VALUES(status),
        shift_uuid = VALUES(shift_uuid),
        shift_name_snapshot = VALUES(shift_name_snapshot),
        shift_start_time_snapshot = VALUES(shift_start_time_snapshot),
        shift_end_time_snapshot = VALUES(shift_end_time_snapshot),
        leave_request_uuid = VALUES(leave_request_uuid),
        worked_hours = VALUES(worked_hours),
        overtime_hours = VALUES(overtime_hours),
        missing_hours = VALUES(missing_hours),
        late_minutes = VALUES(late_minutes),
        break_duration_minutes = VALUES(break_duration_minutes),
        corrected_by = VALUES(corrected_by),
        updated_at = CURRENT_TIMESTAMP
    `,
    [
      uuid, employeeUuid, date, status, shiftUuid, 
      shiftName, shiftStartTime, shiftEndTime,
      leaveRequestUuid, workedHours, overtimeHours, missingHours,
      lateMinutes, breakDurationMinutes, correctedBy
    ],
  );
}

/**
 * Get attendance logs for an employee with date range filter
 * Returns attendance summary records with check-in/out times
 */
async function getEmployeeAttendanceLogs(employeeUuid, filters = {}) {
  const params = [employeeUuid];
  let query = `
    SELECT 
      a.uuid, a.employee_uuid, a.date, a.status, a.shift_uuid,
      s.name AS shift_name,
      l.check_in, l.check_out,
      a.created_at, a.updated_at
    FROM AttendanceSummary a
    LEFT JOIN ShiftDefinitions s ON s.uuid = a.shift_uuid
    LEFT JOIN AttendanceLogs l ON l.employee_uuid = a.employee_uuid AND l.date = a.date
    WHERE a.employee_uuid = ?
  `;

  if (filters.startDate) {
    query += " AND a.date >= ?";
    params.push(filters.startDate);
  }

  if (filters.endDate) {
    query += " AND a.date <= ?";
    params.push(filters.endDate);
  }

  query += " ORDER BY a.date DESC";

  if (filters.limit) {
    const safeLimit = Math.max(1, Math.min(500, parseInt(filters.limit, 10) || 20));
    query += ` LIMIT ${safeLimit}`;
  }

  if (filters.offset) {
    const safeOffset = Math.max(0, parseInt(filters.offset, 10) || 0);
    query += ` OFFSET ${safeOffset}`;
  }

  const [rows] = await executeQuery(query, params);
  return rows;
}

/**
 * Get attendance summary for an employee
 */
async function getEmployeeAttendanceSummary(employeeUuid, filters = {}) {
  try {
    // Defensive guard: validate employeeUuid
    if (!employeeUuid) {
      console.warn('[AttendanceService] getEmployeeAttendanceSummary called with null/undefined employeeUuid');
      return {
        records: [],
        summary: {
          [ATTENDANCE_STATUS.PRESENT]: 0,
          [ATTENDANCE_STATUS.ABSENT]: 0,
          [ATTENDANCE_STATUS.LATE]: 0,
          [ATTENDANCE_STATUS.ON_LEAVE]: 0,
        },
        total_days: 0,
        present_count: 0,
        absent_count: 0,
        late_count: 0,
        leave_count: 0,
        attendance_rate: 0,
      };
    }

    const params = [employeeUuid];
    let query = `
      SELECT 
        a.uuid, a.employee_uuid, a.date, a.status, a.shift_uuid, 
        a.leave_request_uuid, a.corrected_by, a.created_at, a.updated_at,
        a.worked_hours, a.overtime_hours, a.missing_hours, a.late_minutes,
        s.name AS shift_name,
        l.check_in, l.check_out
      FROM AttendanceSummary a
      LEFT JOIN ShiftDefinitions s ON s.uuid = a.shift_uuid
      LEFT JOIN AttendanceLogs l ON l.employee_uuid = a.employee_uuid AND l.date = a.date
      WHERE a.employee_uuid = ?
    `;

    if (filters.startDate) {
      query += " AND a.date >= ?";
      params.push(filters.startDate);
    }

    if (filters.endDate) {
      query += " AND a.date <= ?";
      params.push(filters.endDate);
    }

    query += " ORDER BY a.date DESC";

    const [rows] = await executeQuery(query, params);

    // Defensive guard: ensure rows is an array
    const safeRows = Array.isArray(rows) ? rows : [];

    // Calculate counts and stats with defensive checks
    const counts = {
      [ATTENDANCE_STATUS.PRESENT]: 0,
      [ATTENDANCE_STATUS.ABSENT]: 0,
      [ATTENDANCE_STATUS.LATE]: 0,
      [ATTENDANCE_STATUS.ON_LEAVE]: 0,
    };

    // Defensive guard: wrap forEach in try/catch
    safeRows.forEach((row) => {
      try {
        if (row && row.status && counts[row.status] !== undefined) {
          counts[row.status]++;
        }
      } catch (err) {
        console.error('[AttendanceService] Error processing attendance row:', err);
        // Continue processing other rows
      }
    });

    const total_days = safeRows.length;
    const present_count = counts[ATTENDANCE_STATUS.PRESENT] || 0;
    const absent_count = counts[ATTENDANCE_STATUS.ABSENT] || 0;
    const late_count = counts[ATTENDANCE_STATUS.LATE] || 0;
    const leave_count = counts[ATTENDANCE_STATUS.ON_LEAVE] || 0;
    const worked_days = present_count + late_count;
    const attendance_rate = total_days > 0 ? ((worked_days / total_days) * 100).toFixed(1) : 0;

    return {
      records: safeRows,
      summary: counts,
      total_days,
      present_count,
      absent_count,
      late_count,
      leave_count,
      attendance_rate: parseFloat(attendance_rate),
    };
  } catch (error) {
    console.error('[AttendanceService] Error in getEmployeeAttendanceSummary:', error);
    // Return empty structure instead of throwing to prevent 500 errors
    return {
      records: [],
      summary: {
        [ATTENDANCE_STATUS.PRESENT]: 0,
        [ATTENDANCE_STATUS.ABSENT]: 0,
        [ATTENDANCE_STATUS.LATE]: 0,
        [ATTENDANCE_STATUS.ON_LEAVE]: 0,
      },
      total_days: 0,
      present_count: 0,
      absent_count: 0,
      late_count: 0,
      leave_count: 0,
      attendance_rate: 0,
    };
  }
}

/**
 * Get all attendance records (admin view)
 */
async function getAllAttendance(filters = {}) {
  const params = [];
  let query = `
    SELECT a.uuid, a.employee_uuid, a.date, a.status, a.shift_uuid, a.leave_request_uuid, a.corrected_by,
      e.mesob_id, e.first_name, e.middle_name, e.last_name, p.department_uuid,
      d.name AS department_name
    FROM AttendanceSummary a
    INNER JOIN Employees e ON e.uuid = a.employee_uuid
    LEFT JOIN Positions p ON p.uuid = e.position_uuid
    LEFT JOIN Departments d ON d.uuid = p.department_uuid
    WHERE 1 = 1
  `;

  if (filters.departmentUuid) {
    query += " AND p.department_uuid = ?";
    params.push(filters.departmentUuid);
  }

  if (filters.startDate) {
    query += " AND a.date >= ?";
    params.push(filters.startDate);
  }

  if (filters.endDate) {
    query += " AND a.date <= ?";
    params.push(filters.endDate);
  }

  if (filters.status) {
    query += " AND a.status = ?";
    params.push(filters.status);
  }

  query += " ORDER BY a.date DESC, e.last_name ASC";

  if (filters.limit) {
    const safeLimit = Math.max(1, Math.min(500, parseInt(filters.limit, 10) || 20));
    query += ` LIMIT ${safeLimit}`;
  }

  if (filters.offset) {
    const safeOffset = Math.max(0, parseInt(filters.offset, 10) || 0);
    query += ` OFFSET ${safeOffset}`;
  }

  const [rows] = await executeQuery(query, params);
  return rows;
}

/**
 * Manually correct an attendance summary record
 */
async function correctAttendance(summaryUuid, status, correctedByEmployeeUuid) {
  const validStatuses = Object.values(ATTENDANCE_STATUS);

  if (!validStatuses.includes(status)) {
    throw new ApiError(`Invalid status. Valid values: ${validStatuses.join(', ')}`, 400, "VALIDATION_ERROR");
  }

  const [existing] = await executeQuery(
    "SELECT uuid, employee_uuid, date FROM AttendanceSummary WHERE uuid = ? LIMIT 1",
    [summaryUuid],
  );

  if (!existing.length) {
    throw new ApiError(
      "Attendance summary record not found.",
      404,
      "NOT_FOUND",
    );
  }

  await executeQuery(
    "UPDATE AttendanceSummary SET status = ?, corrected_by = ?, updated_at = CURRENT_TIMESTAMP WHERE uuid = ?",
    [status, correctedByEmployeeUuid, summaryUuid],
  );

  const [updated] = await executeQuery(
    "SELECT * FROM AttendanceSummary WHERE uuid = ? LIMIT 1",
    [summaryUuid],
  );

  return updated[0];
}

/**
 * Fetch attendance summary and employee department for access checks
 */
async function getAttendanceSummaryAccess(summaryUuid) {
  const [rows] = await executeQuery(
    `
      SELECT a.uuid, a.employee_uuid, p.department_uuid
      FROM AttendanceSummary a
      INNER JOIN Employees e ON e.uuid = a.employee_uuid
      WHERE a.uuid = ?
      LIMIT 1
    `,
    [String(summaryUuid || "").trim()],
  );

  return rows[0] || null;
}

/**
 * Mark attendance as leave for a date range (called by leave module)
 */
async function markAttendanceAsLeave(
  employeeUuid,
  startDate,
  endDate,
  leaveRequestUuid,
) {
  const dates = getDateRange(startDate, endDate);

  for (const date of dates) {
    // Get shift for this date with details for snapshot
    const [shifts] = await executeQuery(
      `
        SELECT s.uuid, s.name, s.start_time, s.end_time
        FROM EmployeeShifts es
        INNER JOIN ShiftDefinitions s ON s.uuid = es.shift_uuid
        WHERE es.employee_uuid = ?
          AND es.effective_from <= ?
          AND (es.effective_to IS NULL OR es.effective_to >= ?)
        ORDER BY es.effective_from DESC
        LIMIT 1
      `,
      [employeeUuid, date, date],
    );

    const shift = shifts.length ? shifts[0] : null;

    await upsertAttendanceSummary({
      employeeUuid,
      date,
      status: ATTENDANCE_STATUS.ON_LEAVE,
      shiftUuid: shift?.uuid || null,
      shiftName: shift?.name || null,
      shiftStartTime: shift?.start_time || null,
      shiftEndTime: shift?.end_time || null,
      leaveRequestUuid,
      correctedBy: null,
    });
  }
}

/**
 * Revert attendance leave status (called when leave is shortened or rejected)
 */
async function revertAttendanceLeave(employeeUuid, startDate, endDate) {
  const dates = getDateRange(startDate, endDate);
  for (const date of dates) {
    await computeAndUpsertDailySummary(employeeUuid, date);
  }
}

/**
 * Directly create an attendance summary record (admin)
 */
async function createAttendanceSummary({ employee_uuid, date, status, shift_uuid }) {
  const validStatuses = Object.values(ATTENDANCE_STATUS);
  if (!validStatuses.includes(status)) {
    throw new ApiError(`Invalid status. Valid values: ${validStatuses.join(', ')}`, 400, "VALIDATION_ERROR");
  }
  if (!employee_uuid || !date) {
    throw new ApiError("employee_uuid and date are required.", 400, "VALIDATION_ERROR");
  }

  // Validate employee exists
  const [emp] = await executeQuery(
    "SELECT uuid FROM Employees WHERE uuid = ? LIMIT 1",
    [String(employee_uuid).trim()]
  );
  if (!emp.length) throw new ApiError("Employee not found.", 404, "NOT_FOUND");

  // Get shift details for snapshot if shift_uuid is provided
  let shiftName = null;
  let shiftStartTime = null;
  let shiftEndTime = null;
  
  if (shift_uuid) {
    const [shiftRows] = await executeQuery(
      "SELECT name, start_time, end_time FROM ShiftDefinitions WHERE uuid = ? LIMIT 1",
      [shift_uuid]
    );
    if (shiftRows.length > 0) {
      shiftName = shiftRows[0].name;
      shiftStartTime = shiftRows[0].start_time;
      shiftEndTime = shiftRows[0].end_time;
    }
  }

  const uuid = randomUUID();
  await executeQuery(
    `INSERT INTO AttendanceSummary (
       uuid, employee_uuid, date, status, shift_uuid,
       shift_name_snapshot, shift_start_time_snapshot, shift_end_time_snapshot,
       created_at, updated_at
     )
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
     ON DUPLICATE KEY UPDATE 
       status=VALUES(status), 
       shift_uuid=VALUES(shift_uuid),
       shift_name_snapshot=VALUES(shift_name_snapshot),
       shift_start_time_snapshot=VALUES(shift_start_time_snapshot),
       shift_end_time_snapshot=VALUES(shift_end_time_snapshot),
       updated_at=CURRENT_TIMESTAMP`,
    [uuid, String(employee_uuid).trim(), date, status, shift_uuid || null, shiftName, shiftStartTime, shiftEndTime]
  );

  const [rows] = await executeQuery(
    `SELECT a.uuid, a.employee_uuid, a.date, a.status, a.shift_uuid, 
            a.shift_name_snapshot, a.shift_start_time_snapshot, a.shift_end_time_snapshot,
            a.corrected_by, a.created_at, a.updated_at,
            e.mesob_id, CONCAT(e.first_name,' ',e.last_name) AS full_name,
            d.name AS department, s.name AS shift_name
     FROM AttendanceSummary a
     INNER JOIN Employees e ON e.uuid = a.employee_uuid
     LEFT JOIN Positions p ON p.uuid = e.position_uuid
     LEFT JOIN Departments d ON d.uuid = p.department_uuid
     LEFT JOIN ShiftDefinitions s ON s.uuid = a.shift_uuid
     WHERE a.employee_uuid = ? AND a.date = ? LIMIT 1`,
    [String(employee_uuid).trim(), date]
  );
  return rows[0] || null;
}

/**
 * Delete an attendance summary record (admin)
 * Also deletes corresponding AttendanceLogs to allow re-registration
 */
async function deleteAttendanceSummary(summaryUuid) {
  // Get the attendance summary record
  const [existing] = await executeQuery(
    "SELECT uuid, employee_uuid, date FROM AttendanceSummary WHERE uuid = ? LIMIT 1",
    [String(summaryUuid).trim()]
  );
  if (!existing.length) {
    console.error(`[ATTENDANCE] Delete failed: Attendance summary ${summaryUuid} not found`);
    throw new ApiError("Record not found.", 404, "NOT_FOUND");
  }

  const { employee_uuid, date } = existing[0];

  console.log(`[ATTENDANCE] Deleting attendance for employee ${employee_uuid} on date ${date} (summary uuid: ${summaryUuid})`);

  // Delete from AttendanceSummary
  const [summaryResult] = await executeQuery(
    "DELETE FROM AttendanceSummary WHERE uuid = ?", 
    [String(summaryUuid).trim()]
  );
  
  // Also delete corresponding AttendanceLogs to allow re-registration
  const [logsResult] = await executeQuery(
    "DELETE FROM AttendanceLogs WHERE employee_uuid = ? AND date = ?",
    [employee_uuid, date]
  );

  console.log(`[ATTENDANCE] Deletion complete: ${summaryResult.affectedRows || 0} summary records and ${logsResult.affectedRows || 0} log records deleted`);
  
  // Verify deletion by checking if records still exist
  const [verifyLogs] = await executeQuery(
    "SELECT uuid FROM AttendanceLogs WHERE employee_uuid = ? AND date = ? LIMIT 1",
    [employee_uuid, date]
  );
  
  const [verifySummary] = await executeQuery(
    "SELECT uuid FROM AttendanceSummary WHERE employee_uuid = ? AND date = ? LIMIT 1",
    [employee_uuid, date]
  );

  if (verifyLogs.length > 0 || verifySummary.length > 0) {
    console.error(`[ATTENDANCE] WARNING: Records still exist after deletion! Logs: ${verifyLogs.length}, Summary: ${verifySummary.length}`);
  } else {
    console.log(`[ATTENDANCE] Verified: All records successfully deleted for employee ${employee_uuid} on date ${date}`);
  }

  return true;
}

/**
 * Delete attendance by employee UUID and date
 * Handles cases where summary may not exist but logs do (orphaned records)
 */
async function deleteAttendanceByEmployeeAndDate(employeeUuid, date) {
  console.log(`[ATTENDANCE] Deleting all attendance records for employee ${employeeUuid} on date ${date}`);

  // Delete from both tables (even if one doesn't exist)
  const [logsResult] = await executeQuery(
    "DELETE FROM AttendanceLogs WHERE employee_uuid = ? AND date = ?",
    [employeeUuid, date]
  );
  
  const [summaryResult] = await executeQuery(
    "DELETE FROM AttendanceSummary WHERE employee_uuid = ? AND date = ?",
    [employeeUuid, date]
  );

  console.log(`[ATTENDANCE] Deletion complete: ${logsResult.affectedRows || 0} log records and ${summaryResult.affectedRows || 0} summary records deleted`);
  
  // Verify deletion
  const [verifyLogs] = await executeQuery(
    "SELECT uuid FROM AttendanceLogs WHERE employee_uuid = ? AND date = ? LIMIT 1",
    [employeeUuid, date]
  );
  
  const [verifySummary] = await executeQuery(
    "SELECT uuid FROM AttendanceSummary WHERE employee_uuid = ? AND date = ? LIMIT 1",
    [employeeUuid, date]
  );

  if (verifyLogs.length > 0 || verifySummary.length > 0) {
    console.error(`[ATTENDANCE] WARNING: Records still exist after deletion! Logs: ${verifyLogs.length}, Summary: ${verifySummary.length}`);
    throw new ApiError("Failed to delete attendance records completely.", 500, "DELETION_FAILED");
  } else {
    console.log(`[ATTENDANCE] Verified: All records successfully deleted for employee ${employeeUuid} on date ${date}`);
  }

  return true;
}

/**
 * Get today's attendance status for an employee
 * @param {string} employeeUuid
 * @returns {object} { can_check_in, can_check_out, check_in_time, check_out_time, message }
 */
async function getTodayAttendanceStatus(employeeUuid) {
  const today = formatDate(new Date());
  
  console.log(`[ATTENDANCE] Checking today's status for employee ${employeeUuid} on date ${today}`);
  
  const [logs] = await executeQuery(
    "SELECT uuid, check_in, check_out, date FROM AttendanceLogs WHERE employee_uuid = ? AND date = ? LIMIT 1",
    [employeeUuid, today],
  );

  const log = logs[0];

  if (!log || !log.check_in) {
    console.log(`[ATTENDANCE] Status: Can check in (no existing record)`);
    return {
      can_check_in: true,
      can_check_out: false,
      check_in_time: null,
      check_out_time: null,
      message: "Ready to check in",
    };
  }

  if (log.check_in && !log.check_out) {
    console.log(`[ATTENDANCE] Status: Can check out (check_in=${log.check_in})`);
    return {
      can_check_in: false,
      can_check_out: true,
      check_in_time: log.check_in,
      check_out_time: null,
      message: "Already checked in. Ready to check out.",
    };
  }

  if (log.check_in && log.check_out) {
    console.log(`[ATTENDANCE] Status: Complete (check_in=${log.check_in}, check_out=${log.check_out})`);
    return {
      can_check_in: false,
      can_check_out: false,
      check_in_time: log.check_in,
      check_out_time: log.check_out,
      message: "Already checked out for today. Attendance complete.",
    };
  }

  console.log(`[ATTENDANCE] Status: Unknown state for log ${log.uuid}`);
  return {
    can_check_in: false,
    can_check_out: false,
    check_in_time: null,
    check_out_time: null,
    message: "Unknown status",
  };
}

module.exports = {
  logAttendance,
  getTodayAttendanceStatus,
  computeAndUpsertDailySummary,
  calculateAndUpsertAttendance,
  getEmployeeAttendanceLogs,
  getEmployeeAttendanceSummary,
  getAllAttendance,
  correctAttendance,
  getAttendanceSummaryAccess,
  createAttendanceSummary,
  deleteAttendanceSummary,
  deleteAttendanceByEmployeeAndDate,
  markAttendanceAsLeave,
  revertAttendanceLeave,
  ATTENDANCE_STATES,
};
