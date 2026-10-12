const { randomUUID } = require("crypto");
const { executeQuery, withTransaction } = require("../utils/dbQuery");
const { ApiError } = require("../utils/errors");

function parseWorkingDays(value) {
  if (Array.isArray(value)) {
    return value;
  }
  if (typeof value === "string") {
    try {
      const parsed = JSON.parse(value);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }
  return [];
}

function toDateOnly(value) {
  if (!value) {
    return null;
  }
  const raw = String(value).trim();
  return raw.match(/^\d{4}-\d{2}-\d{2}$/) ? raw : null;
}

function addDays(dateString, days) {
  const date = new Date(`${dateString}T00:00:00.000Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

async function listShifts() {
  const [rows] = await executeQuery(
    `
      SELECT s.uuid, s.shift_code, s.name, s.start_time, s.end_time, s.working_days_json,
        s.grace_period_minutes, s.break_duration_minutes,
        s.created_at, s.updated_at
      FROM ShiftDefinitions s
      ORDER BY s.name ASC
    `,
  );

  return rows.map((row) => ({
    ...row,
    working_days_json: parseWorkingDays(row.working_days_json),
  }));
}

async function getShiftByUuid(uuid) {
  const [rows] = await executeQuery(
    `
      SELECT s.uuid, s.shift_code, s.name, s.start_time, s.end_time, s.working_days_json,
        s.grace_period_minutes, s.break_duration_minutes,
        s.created_at, s.updated_at
      FROM ShiftDefinitions s
      WHERE s.uuid = ?
      LIMIT 1
    `,
    [String(uuid || "").trim()],
  );

  if (!rows.length) {
    return null;
  }

  return {
    ...rows[0],
    working_days_json: parseWorkingDays(rows[0].working_days_json),
  };
}

async function createShift(payload) {
  const name = String(payload.name || "").trim();
  if (!name) {
    throw new ApiError("Shift name is required.", 400, "VALIDATION_ERROR");
  }

  const uuid = randomUUID();
  const shiftCode = String(
    payload.shift_code ||
      payload.code ||
      `SHIFT-${name.replace(/[^A-Za-z0-9]/g, "").slice(0, 8).toUpperCase()}-${Math.floor(100 + Math.random() * 900)}`
  ).trim();
  const workingDays = parseWorkingDays(payload.working_days_json);
  const gracePeriodMinutes = Number.isFinite(payload.grace_period_minutes)
    ? Number(payload.grace_period_minutes)
    : 15;
  const breakDurationMinutes = Number.isFinite(payload.break_duration_minutes)
    ? Number(payload.break_duration_minutes)
    : 0;

  await executeQuery(
    `
      INSERT INTO ShiftDefinitions (uuid, shift_code, name, start_time, end_time, working_days_json, grace_period_minutes, break_duration_minutes)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `,
    [
      uuid,
      shiftCode,
      name,
      payload.start_time,
      payload.end_time,
      JSON.stringify(workingDays),
      gracePeriodMinutes,
      breakDurationMinutes,
    ],
  );

  return getShiftByUuid(uuid);
}

async function updateShift(uuid, payload) {
  const shift = await getShiftByUuid(uuid);
  if (!shift) {
    throw new ApiError("Shift not found.", 404, "NOT_FOUND");
  }

  const updates = [];
  const params = [];

  if (payload.name !== undefined) {
    const name = String(payload.name || "").trim();
    if (!name) {
      throw new ApiError("Shift name is required.", 400, "VALIDATION_ERROR");
    }
    updates.push("name = ?");
    params.push(name);
  }

  if (payload.shift_code !== undefined || payload.code !== undefined) {
    const code = String(payload.shift_code || payload.code).trim();
    if (code) {
      updates.push("shift_code = ?");
      params.push(code);
    }
  }

  if (payload.start_time !== undefined) {
    updates.push("start_time = ?");
    params.push(payload.start_time);
  }

  if (payload.end_time !== undefined) {
    updates.push("end_time = ?");
    params.push(payload.end_time);
  }

  if (payload.grace_period_minutes !== undefined) {
    updates.push("grace_period_minutes = ?");
    params.push(Number(payload.grace_period_minutes) || 15);
  }

  if (payload.break_duration_minutes !== undefined) {
    updates.push("break_duration_minutes = ?");
    params.push(Number(payload.break_duration_minutes) || 0);
  }

  if (payload.working_days_json !== undefined) {
    const workingDays = parseWorkingDays(payload.working_days_json);
    updates.push("working_days_json = ?");
    params.push(JSON.stringify(workingDays));
  }

  if (!updates.length) {
    throw new ApiError("No shift fields to update.", 400, "VALIDATION_ERROR");
  }

  params.push(uuid);
  await executeQuery(
    `UPDATE ShiftDefinitions SET ${updates.join(", ")}, updated_at = CURRENT_TIMESTAMP WHERE uuid = ?`,
    params,
  );

  return getShiftByUuid(uuid);
}

async function deleteShift(uuid) {
  const shift = await getShiftByUuid(uuid);
  if (!shift) {
    throw new ApiError("Shift not found.", 404, "NOT_FOUND");
  }

  const [assignments] = await executeQuery(
    "SELECT COUNT(*) AS count FROM EmployeeShifts WHERE shift_uuid = ?",
    [String(uuid).trim()],
  );
  if (Number(assignments[0]?.count || 0) > 0) {
    throw new ApiError(
      "Cannot delete shift with assignments.",
      409,
      "HAS_ASSIGNMENTS",
    );
  }

  await executeQuery("DELETE FROM ShiftDefinitions WHERE uuid = ?", [
    String(uuid).trim(),
  ]);
  return true;
}

async function assignShift(shiftUuid, payload) {
  const effectiveFrom = toDateOnly(payload.effective_from);
  const effectiveTo = payload.effective_to
    ? toDateOnly(payload.effective_to)
    : null;

  if (!effectiveFrom) {
    throw new ApiError("effective_from is required.", 400, "VALIDATION_ERROR");
  }

  if (effectiveTo && effectiveTo < effectiveFrom) {
    throw new ApiError(
      "effective_to must be on or after effective_from.",
      422,
      "VALIDATION_ERROR",
    );
  }

  return withTransaction(async (connection) => {
    const [shiftRows] = await connection.execute(
      "SELECT uuid FROM ShiftDefinitions WHERE uuid = ? LIMIT 1",
      [String(shiftUuid).trim()],
    );
    if (!shiftRows.length) {
      throw new ApiError("Shift not found.", 404, "NOT_FOUND");
    }

    const [employeeRows] = await connection.execute(
      "SELECT uuid FROM Employees WHERE uuid = ? LIMIT 1",
      [String(payload.employee_uuid || "").trim()],
    );
    if (!employeeRows.length) {
      throw new ApiError("Employee not found.", 404, "NOT_FOUND");
    }

    const employeeUuid = String(payload.employee_uuid || "").trim();

    // Check for existing assignments
    const [existingAssignments] = await connection.execute(
      `SELECT uuid, shift_uuid, effective_from, effective_to 
       FROM EmployeeShifts 
       WHERE employee_uuid = ? 
       ORDER BY effective_from ASC`,
      [employeeUuid]
    );

    // Look for active open-ended assignment to gracefully close or adjust
    const [activeOpen] = await connection.execute(
      `SELECT uuid, shift_uuid, effective_from 
       FROM EmployeeShifts 
       WHERE employee_uuid = ? AND effective_to IS NULL
       ORDER BY effective_from DESC LIMIT 1`,
      [employeeUuid]
    );

    if (activeOpen.length > 0) {
      const openAssignment = activeOpen[0];
      if (openAssignment.effective_from < effectiveFrom) {
        // Auto-close prior assignment to day before effectiveFrom
        const closeDate = addDays(effectiveFrom, -1);
        await connection.execute(
          "UPDATE EmployeeShifts SET effective_to = ? WHERE uuid = ?",
          [closeDate, openAssignment.uuid],
        );
      } else if (openAssignment.effective_from === effectiveFrom) {
        // Re-assigning starting on the exact same date: replace previous open assignment
        await connection.execute(
          "DELETE FROM EmployeeShifts WHERE uuid = ?",
          [openAssignment.uuid],
        );
      }
    }

    // Check if any overlapping assignments remain
    let overlapQuery = `
      SELECT uuid, effective_from, effective_to
      FROM EmployeeShifts
      WHERE employee_uuid = ?
        AND (effective_to IS NULL OR effective_to >= ?)
    `;
    const params = [employeeUuid, effectiveFrom];
    if (effectiveTo) {
      overlapQuery += " AND effective_from <= ?";
      params.push(effectiveTo);
    }

    const [overlaps] = await connection.execute(overlapQuery, params);

    if (overlaps.length) {
      const openAssignment = overlaps.find((row) => !row.effective_to);
      if (overlaps.length === 1 && openAssignment && openAssignment.effective_from < effectiveFrom) {
        const closeDate = addDays(effectiveFrom, -1);
        await connection.execute(
          "UPDATE EmployeeShifts SET effective_to = ? WHERE uuid = ?",
          [closeDate, openAssignment.uuid],
        );
      } else if (effectiveTo) {
        // If assigning a fixed duration, check if we need to close or fail
        const fixedOverlap = overlaps.filter(o => o.effective_to);
        if (fixedOverlap.length > 0) {
          throw new ApiError(
            "Shift assignment overlaps an existing scheduled shift period.",
            409,
            "SHIFT_OVERLAP",
          );
        }
      }
    }

    // Warning: Check for gaps in coverage
    let gapWarning = null;
    if (existingAssignments.length > 0) {
      const lastAssignment = existingAssignments[existingAssignments.length - 1];
      if (lastAssignment.effective_to && effectiveFrom > lastAssignment.effective_to) {
        const gapDays =
          Math.floor(
            (new Date(effectiveFrom) - new Date(lastAssignment.effective_to)) /
              (1000 * 60 * 60 * 24),
          ) - 1;

        if (gapDays > 0) {
          gapWarning = {
            message: `Warning: ${gapDays} day gap detected between ${lastAssignment.effective_to} and ${effectiveFrom}`,
            gap_start: lastAssignment.effective_to,
            gap_end: effectiveFrom,
            gap_days: gapDays,
          };
        }
      }
    }

    const assignmentUuid = randomUUID();
    await connection.execute(
      `
        INSERT INTO EmployeeShifts (
          uuid,
          employee_uuid,
          shift_uuid,
          assignment_type,
          source_position_uuid,
          effective_from,
          effective_to
        ) VALUES (?, ?, ?, 'DIRECT', NULL, ?, ?)
      `,
      [
        assignmentUuid,
        employeeUuid,
        String(shiftUuid || "").trim(),
        effectiveFrom,
        effectiveTo,
      ],
    );

    const result = {
      uuid: assignmentUuid,
      employee_uuid: employeeUuid,
      shift_uuid: String(shiftUuid || "").trim(),
      assignment_type: "DIRECT",
      effective_from: effectiveFrom,
      effective_to: effectiveTo,
    };

    if (gapWarning) {
      result.warning = gapWarning;
    }

    return result;
  });
}

async function getShiftEmployees(shiftUuid) {
  const [rows] = await executeQuery(
    `
      SELECT
        e.uuid,
        e.mesob_id,
        e.first_name,
        e.middle_name,
        e.last_name,
        COALESCE(e.department_uuid, p.department_uuid) AS department_uuid,
        d.name AS department_name,
        p.title AS position_title,
        es.effective_from,
        es.effective_to
      FROM EmployeeShifts es
      INNER JOIN Employees e ON e.uuid = es.employee_uuid
      LEFT JOIN Positions p ON p.uuid = e.position_uuid
      LEFT JOIN Departments d ON d.uuid = COALESCE(e.department_uuid, p.department_uuid)
      WHERE es.shift_uuid = ?
        AND es.effective_from <= CURRENT_DATE()
        AND (es.effective_to IS NULL OR es.effective_to >= CURRENT_DATE())
      ORDER BY e.last_name ASC, e.first_name ASC
    `,
    [String(shiftUuid || "").trim()],
  );

  return rows;
}

/**
 * Detect shift assignment gaps for all employees or a specific employee
 */
async function detectShiftGaps(employeeUuid = null) {
  let query = `
    SELECT 
      e.uuid as employee_uuid,
      e.mesob_id,
      CONCAT(e.first_name, ' ', e.last_name) as employee_name,
      p.department_uuid,
      d.name as department_name,
      es1.shift_uuid as previous_shift_uuid,
      s1.name as previous_shift_name,
      es1.effective_to as gap_start,
      es2.shift_uuid as next_shift_uuid,
      s2.name as next_shift_name,
      es2.effective_from as gap_end,
      DATEDIFF(es2.effective_from, es1.effective_to) - 1 as gap_days
    FROM Employees e
    INNER JOIN EmployeeShifts es1 ON e.uuid = es1.employee_uuid
    INNER JOIN EmployeeShifts es2 ON e.uuid = es2.employee_uuid
    LEFT JOIN Positions p ON p.uuid = e.position_uuid
    LEFT JOIN Departments d ON p.department_uuid = d.uuid
    LEFT JOIN ShiftDefinitions s1 ON es1.shift_uuid = s1.uuid
    LEFT JOIN ShiftDefinitions s2 ON es2.shift_uuid = s2.uuid
    WHERE es1.effective_to IS NOT NULL
    AND es2.effective_from > es1.effective_to
    AND NOT EXISTS (
      SELECT 1 FROM EmployeeShifts es3
      WHERE es3.employee_uuid = e.uuid
      AND es3.effective_from > es1.effective_to
      AND es3.effective_from < es2.effective_from
    )
    AND DATEDIFF(es2.effective_from, es1.effective_to) > 1
  `;

  const params = [];
  if (employeeUuid) {
    query += " AND e.uuid = ?";
    params.push(String(employeeUuid).trim());
  }

  query += " ORDER BY e.last_name, e.first_name, gap_start";

  const [rows] = await executeQuery(query, params);
  return rows;
}

/**
 * Get shift assignment history for an employee
 */
async function getEmployeeShiftHistory(employeeUuid) {
  const [rows] = await executeQuery(
    `
      SELECT 
        es.uuid,
        es.shift_uuid,
        s.name as shift_name,
        s.start_time,
        s.end_time,
        s.working_days_json,
        es.effective_from,
        es.effective_to,
        es.created_at,
        CASE 
          WHEN es.effective_to IS NULL THEN 'ACTIVE'
          WHEN es.effective_to >= CURRENT_DATE() THEN 'SCHEDULED'
          ELSE 'HISTORICAL'
        END as status
      FROM EmployeeShifts es
      INNER JOIN ShiftDefinitions s ON s.uuid = es.shift_uuid
      WHERE es.employee_uuid = ?
      ORDER BY es.effective_from DESC
    `,
    [String(employeeUuid).trim()]
  );

  return rows.map((row) => ({
    ...row,
    working_days_json: parseWorkingDays(row.working_days_json),
  }));
}

module.exports = {
  listShifts,
  getShiftByUuid,
  createShift,
  updateShift,
  deleteShift,
  assignShift,
  getShiftEmployees,
  detectShiftGaps,
  getEmployeeShiftHistory,
};
