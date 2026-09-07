const { randomUUID } = require("crypto");
const { executeQuery } = require("../utils/dbQuery");
const { ApiError } = require("../utils/errors");
const { ensureDepartmentExists } = require("./departmentService");

async function listPositions({ departmentUuid } = {}) {
  const params = [];
  let query = `
    SELECT
      p.uuid, p.title, p.grade, p.department_uuid, p.created_at, p.updated_at,
      d.name AS department_name,
      COUNT(e.uuid) AS total_employees,
      SUM(e.gender = 'MALE')   AS male_count,
      SUM(e.gender = 'FEMALE') AS female_count
    FROM Positions p
    LEFT JOIN Departments d ON d.uuid = p.department_uuid
    LEFT JOIN Employees   e ON e.position_uuid = p.uuid AND e.status = 'ACTIVE'
    WHERE 1 = 1
  `;

  if (departmentUuid) {
    query += " AND p.department_uuid = ?";
    params.push(String(departmentUuid).trim());
  }

  query += " GROUP BY p.uuid, p.title, p.grade, p.department_uuid, p.created_at, p.updated_at, d.name";
  query += " ORDER BY p.title ASC";
  const [rows] = await executeQuery(query, params);
  return rows.map(r => ({
    ...r,
    total_employees: Number(r.total_employees || 0),
    male_count:      Number(r.male_count  || 0),
    female_count:    Number(r.female_count || 0),
  }));
}

async function getPositionByUuid(uuid) {
  const [rows] = await executeQuery(
    `
      SELECT
        p.uuid, p.title, p.grade, p.department_uuid, p.created_at, p.updated_at,
        d.name AS department_name,
        COUNT(e.uuid)                AS total_employees,
        SUM(e.gender = 'MALE')       AS male_count,
        SUM(e.gender = 'FEMALE')     AS female_count
      FROM Positions p
      LEFT JOIN Departments d ON d.uuid = p.department_uuid
      LEFT JOIN Employees   e ON e.position_uuid = p.uuid AND e.status = 'ACTIVE'
      WHERE p.uuid = ?
      GROUP BY p.uuid, p.title, p.grade, p.department_uuid, p.created_at, p.updated_at, d.name
      LIMIT 1
    `,
    [String(uuid || "").trim()],
  );

  if (!rows[0]) return null;

  const pos = rows[0];
  pos.total_employees = Number(pos.total_employees || 0);
  pos.male_count      = Number(pos.male_count  || 0);
  pos.female_count    = Number(pos.female_count || 0);

  // Fetch employees assigned to this position
  const [employees] = await executeQuery(
    `SELECT e.uuid, e.mesob_id, e.title, e.first_name, e.middle_name, e.last_name,
            e.gender, e.status, e.hire_date,
            d.name AS department_name,
            es.shift_uuid as current_shift_uuid,
            s.name as current_shift_name,
            es.assignment_type
     FROM Employees e
     LEFT JOIN Departments d ON d.uuid = e.department_uuid
     LEFT JOIN EmployeeShifts es ON es.employee_uuid = e.uuid 
       AND es.effective_from <= CURRENT_DATE()
       AND (es.effective_to IS NULL OR es.effective_to >= CURRENT_DATE())
     LEFT JOIN ShiftDefinitions s ON s.uuid = es.shift_uuid
     WHERE e.position_uuid = ? AND e.status = 'ACTIVE'
     ORDER BY e.last_name ASC`,
    [String(uuid || "").trim()]
  );
  pos.employees = employees;

  return pos;
}

async function createPosition(payload) {
  const title = String(payload.title || "").trim();
  const departmentUuid = String(payload.department_uuid || "").trim();
  if (!title || !departmentUuid) {
    throw new ApiError(
      "title and department_uuid are required.",
      400,
      "VALIDATION_ERROR",
    );
  }

  const department = await ensureDepartmentExists(departmentUuid);
  if (!department) {
    throw new ApiError("Department not found.", 422, "INVALID_DEPARTMENT");
  }

  const uuid = randomUUID();
  await executeQuery(
    "INSERT INTO Positions (uuid, title, grade, department_uuid) VALUES (?, ?, ?, ?)",
    [uuid, title, payload.grade || null, departmentUuid],
  );

  return getPositionByUuid(uuid);
}

async function updatePosition(uuid, payload) {
  const position = await getPositionByUuid(uuid);
  if (!position) {
    throw new ApiError("Position not found.", 404, "NOT_FOUND");
  }

  const updates = [];
  const params = [];

  if (payload.title !== undefined) {
    const title = String(payload.title || "").trim();
    if (!title) {
      throw new ApiError(
        "Position title is required.",
        400,
        "VALIDATION_ERROR",
      );
    }
    updates.push("title = ?");
    params.push(title);
  }

  if (payload.grade !== undefined) {
    updates.push("grade = ?");
    params.push(payload.grade || null);
  }

  if (payload.department_uuid !== undefined) {
    const departmentUuid = String(payload.department_uuid || "").trim();
    if (!departmentUuid) {
      throw new ApiError(
        "department_uuid is required.",
        400,
        "VALIDATION_ERROR",
      );
    }
    const department = await ensureDepartmentExists(departmentUuid);
    if (!department) {
      throw new ApiError("Department not found.", 422, "INVALID_DEPARTMENT");
    }
    updates.push("department_uuid = ?");
    params.push(departmentUuid);
  }

  if (payload.default_shift_uuid !== undefined) {
    const shiftUuid = payload.default_shift_uuid ? String(payload.default_shift_uuid).trim() : null;
    if (shiftUuid) {
      // Verify shift exists
      const [shift] = await executeQuery(
        "SELECT uuid FROM ShiftDefinitions WHERE uuid = ? LIMIT 1",
        [shiftUuid]
      );
      if (!shift.length) {
        throw new ApiError("Shift not found.", 422, "INVALID_SHIFT");
      }
    }
    updates.push("default_shift_uuid = ?");
    params.push(shiftUuid);
  }

  if (!updates.length) {
    throw new ApiError(
      "No position fields to update.",
      400,
      "VALIDATION_ERROR",
    );
  }

  params.push(uuid);
  await executeQuery(
    `UPDATE Positions SET ${updates.join(", ")}, updated_at = CURRENT_TIMESTAMP WHERE uuid = ?`,
    params,
  );

  return getPositionByUuid(uuid);
}

async function deletePosition(uuid) {
  const position = await getPositionByUuid(uuid);
  if (!position) {
    throw new ApiError("Position not found.", 404, "NOT_FOUND");
  }

  const [employees] = await executeQuery(
    "SELECT COUNT(*) AS count FROM Employees WHERE position_uuid = ?",
    [String(uuid).trim()],
  );
  if (Number(employees[0]?.count || 0) > 0) {
    throw new ApiError(
      "Cannot delete position with assigned employees.",
      409,
      "HAS_EMPLOYEES",
    );
  }

  await executeQuery("DELETE FROM Positions WHERE uuid = ?", [
    String(uuid).trim(),
  ]);
  return true;
}

/**
 * Assign shift to position and cascade to all employees
 */
async function assignShiftToPosition(positionUuid, shiftUuid, effectiveFrom) {
  const position = await getPositionByUuid(positionUuid);
  if (!position) {
    throw new ApiError("Position not found.", 404, "NOT_FOUND");
  }

  // Verify shift exists
  const [shift] = await executeQuery(
    "SELECT uuid, name FROM ShiftDefinitions WHERE uuid = ? LIMIT 1",
    [String(shiftUuid).trim()]
  );
  if (!shift.length) {
    throw new ApiError("Shift not found.", 404, "NOT_FOUND");
  }

  // Update position default shift
  await executeQuery(
    "UPDATE Positions SET default_shift_uuid = ?, updated_at = CURRENT_TIMESTAMP WHERE uuid = ?",
    [String(shiftUuid).trim(), String(positionUuid).trim()]
  );

  // Get all active employees in this position
  const [employees] = await executeQuery(
    "SELECT uuid FROM Employees WHERE position_uuid = ? AND status = 'ACTIVE'",
    [String(positionUuid).trim()]
  );

  const results = [];
  const errors = [];

  // Cascade to all employees (only those without direct assignments)
  for (const employee of employees) {
    try {
      // Check if employee has a direct assignment
      const [directAssignments] = await executeQuery(
        `SELECT uuid FROM EmployeeShifts 
         WHERE employee_uuid = ? 
         AND assignment_type = 'DIRECT' 
         AND (effective_to IS NULL OR effective_to >= CURRENT_DATE())`,
        [employee.uuid]
      );

      if (directAssignments.length > 0) {
        // Skip employees with direct assignments
        results.push({
          employee_uuid: employee.uuid,
          status: 'skipped',
          reason: 'Has direct shift assignment'
        });
        continue;
      }

      // Close any existing inherited assignments
      await executeQuery(
        `UPDATE EmployeeShifts 
         SET effective_to = DATE_SUB(?, INTERVAL 1 DAY)
         WHERE employee_uuid = ? 
         AND assignment_type = 'INHERITED'
         AND effective_to IS NULL`,
        [effectiveFrom, employee.uuid]
      );

      // Create new inherited assignment
      const assignmentUuid = randomUUID();
      await executeQuery(
        `INSERT INTO EmployeeShifts (
           uuid, employee_uuid, shift_uuid, assignment_type, source_position_uuid, 
           effective_from, effective_to
         ) VALUES (?, ?, ?, 'INHERITED', ?, ?, NULL)`,
        [assignmentUuid, employee.uuid, String(shiftUuid).trim(), String(positionUuid).trim(), effectiveFrom]
      );

      results.push({
        employee_uuid: employee.uuid,
        assignment_uuid: assignmentUuid,
        status: 'assigned'
      });
    } catch (error) {
      errors.push({
        employee_uuid: employee.uuid,
        error: error.message
      });
    }
  }

  return {
    position_uuid: String(positionUuid).trim(),
    shift_uuid: String(shiftUuid).trim(),
    shift_name: shift[0].name,
    effective_from: effectiveFrom,
    total_employees: employees.length,
    assigned: results.filter(r => r.status === 'assigned').length,
    skipped: results.filter(r => r.status === 'skipped').length,
    errors: errors.length,
    details: { results, errors }
  };
}

/**
 * Remove position's default shift and clean up inherited assignments
 */
async function removeShiftFromPosition(positionUuid) {
  const position = await getPositionByUuid(positionUuid);
  if (!position) {
    throw new ApiError("Position not found.", 404, "NOT_FOUND");
  }

  // Remove default shift from position
  await executeQuery(
    "UPDATE Positions SET default_shift_uuid = NULL, updated_at = CURRENT_TIMESTAMP WHERE uuid = ?",
    [String(positionUuid).trim()]
  );

  // Close all inherited assignments for this position
  const [result] = await executeQuery(
    `UPDATE EmployeeShifts 
     SET effective_to = CURRENT_DATE()
     WHERE source_position_uuid = ? 
     AND assignment_type = 'INHERITED'
     AND effective_to IS NULL`,
    [String(positionUuid).trim()]
  );

  return {
    position_uuid: String(positionUuid).trim(),
    inherited_assignments_closed: result.affectedRows
  };
}

module.exports = {
  listPositions,
  getPositionByUuid,
  createPosition,
  updatePosition,
  deletePosition,
  assignShiftToPosition,
  removeShiftFromPosition,
};
