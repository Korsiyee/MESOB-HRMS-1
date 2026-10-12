const { randomUUID } = require("crypto");
const { executeQuery } = require("../utils/dbQuery");
const { ApiError } = require("../utils/errors");

async function listDepartments({ tree = false } = {}) {
  const [rows] = await executeQuery(
    `
      SELECT
        d.uuid,
        d.name,
        d.parent_uuid,
        d.head_employee_uuid,
        d.created_at,
        d.updated_at,
        COUNT(DISTINCT CASE WHEN e.status = 'ACTIVE' THEN e.uuid END) AS member_count,
        COUNT(DISTINCT CASE WHEN e.gender = 'MALE' AND e.status = 'ACTIVE' THEN e.uuid END) AS male_count,
        COUNT(DISTINCT CASE WHEN e.gender = 'FEMALE' AND e.status = 'ACTIVE' THEN e.uuid END) AS female_count,
        COUNT(DISTINCT pos.uuid) AS position_count,
        COUNT(DISTINCT CASE WHEN e2.uuid IS NOT NULL AND e2.status = 'ACTIVE' THEN pos.uuid END) AS filled_positions,
        CONCAT_WS(' ', h.first_name, h.middle_name, h.last_name) AS head_employee_name,
        p.name                                                    AS parent_name
      FROM Departments d
      LEFT JOIN Employees   e   ON e.department_uuid   = d.uuid
      LEFT JOIN Employees   h   ON h.uuid              = d.head_employee_uuid
      LEFT JOIN Departments p   ON p.uuid              = d.parent_uuid
      LEFT JOIN Positions   pos ON pos.department_uuid = d.uuid
      LEFT JOIN Employees   e2  ON e2.position_uuid    = pos.uuid
      GROUP BY d.uuid, d.name, d.parent_uuid, d.head_employee_uuid,
               d.created_at, d.updated_at, h.first_name, h.middle_name, h.last_name, p.name
      ORDER BY d.name ASC
    `,
  );

  // Normalise numeric fields
  const normalised = rows.map(r => ({
    ...r,
    member_count: Number(r.member_count || 0),
    male_count: Number(r.male_count || 0),
    female_count: Number(r.female_count || 0),
    position_count: Number(r.position_count || 0),
    filled_positions: Number(r.filled_positions || 0),
  }));

  if (!tree) {
    return normalised;
  }

  const byId = new Map();
  const roots = [];

  normalised.forEach((row) => {
    byId.set(row.uuid, { ...row, children: [] });
  });

  normalised.forEach((row) => {
    const node = byId.get(row.uuid);
    if (row.parent_uuid && byId.has(row.parent_uuid)) {
      byId.get(row.parent_uuid).children.push(node);
    } else {
      roots.push(node);
    }
  });

  return roots;
}

async function getDepartmentByUuid(uuid) {
  const [rows] = await executeQuery(
    `
      SELECT
        d.uuid,
        d.name,
        d.parent_uuid,
        d.head_employee_uuid,
        d.created_at,
        d.updated_at,
        COUNT(DISTINCT CASE WHEN e.status = 'ACTIVE' THEN e.uuid END) AS member_count,
        COUNT(DISTINCT CASE WHEN e.gender = 'MALE' AND e.status = 'ACTIVE' THEN e.uuid END) AS male_count,
        COUNT(DISTINCT CASE WHEN e.gender = 'FEMALE' AND e.status = 'ACTIVE' THEN e.uuid END) AS female_count,
        COUNT(DISTINCT pos.uuid) AS position_count,
        COUNT(DISTINCT CASE WHEN e2.uuid IS NOT NULL AND e2.status = 'ACTIVE' THEN pos.uuid END) AS filled_positions,
        CONCAT_WS(' ', h.first_name, h.middle_name, h.last_name) AS head_employee_name,
        p.name AS parent_name
      FROM Departments d
      LEFT JOIN Employees   e   ON e.department_uuid = d.uuid
      LEFT JOIN Employees   h   ON h.uuid = d.head_employee_uuid
      LEFT JOIN Departments p   ON p.uuid = d.parent_uuid
      LEFT JOIN Positions   pos ON pos.department_uuid = d.uuid
      LEFT JOIN Employees   e2  ON e2.position_uuid = pos.uuid
      WHERE d.uuid = ?
      GROUP BY d.uuid, d.name, d.parent_uuid, d.head_employee_uuid,
               d.created_at, d.updated_at, h.first_name, h.middle_name, h.last_name, p.name
      LIMIT 1
    `,
    [String(uuid || "").trim()],
  );

  if (rows[0]) {
    return {
      ...rows[0],
      member_count: Number(rows[0].member_count || 0),
      male_count: Number(rows[0].male_count || 0),
      female_count: Number(rows[0].female_count || 0),
      position_count: Number(rows[0].position_count || 0),
      filled_positions: Number(rows[0].filled_positions || 0),
    };
  }

  return null;
}

async function ensureDepartmentExists(uuid) {
  if (!uuid) {
    return null;
  }

  const [rows] = await executeQuery(
    "SELECT uuid FROM Departments WHERE uuid = ? LIMIT 1",
    [String(uuid).trim()],
  );
  return rows[0] || null;
}

async function assertNoCircularParent(departmentUuid, parentUuid) {
  if (!parentUuid) {
    return;
  }

  if (departmentUuid === parentUuid) {
    throw new ApiError(
      "Department cannot reference itself as parent.",
      422,
      "INVALID_PARENT",
    );
  }

  let current = parentUuid;
  const visited = new Set();

  while (current) {
    if (current === departmentUuid) {
      throw new ApiError(
        "Circular department hierarchy detected.",
        422,
        "INVALID_PARENT",
      );
    }
    if (visited.has(current)) {
      break;
    }
    visited.add(current);

    const [rows] = await executeQuery(
      "SELECT parent_uuid FROM Departments WHERE uuid = ? LIMIT 1",
      [String(current).trim()],
    );

    if (!rows.length) {
      break;
    }

    current = rows[0].parent_uuid || null;
  }
}

async function createDepartment(payload) {
  const name = String(payload.name || "").trim();
  if (!name) {
    throw new ApiError("Department name is required.", 400, "VALIDATION_ERROR");
  }

  const [existing] = await executeQuery(
    "SELECT uuid FROM Departments WHERE name = ? LIMIT 1",
    [name],
  );
  if (existing.length) {
    throw new ApiError(
      "Department name already exists.",
      409,
      "DUPLICATE_DEPARTMENT",
    );
  }

  const parentUuid = payload.parent_uuid
    ? String(payload.parent_uuid).trim()
    : null;
  if (parentUuid) {
    const parent = await ensureDepartmentExists(parentUuid);
    if (!parent) {
      throw new ApiError("Parent department not found.", 422, "INVALID_PARENT");
    }
  }

  // Validate head employee — must be active, belong to this dept, and not already a head elsewhere
  const headUuid = payload.head_employee_uuid
    ? String(payload.head_employee_uuid).trim()
    : null;
  if (headUuid) {
    const [emp] = await executeQuery(
      "SELECT uuid, department_uuid FROM Employees WHERE uuid = ? AND status = 'ACTIVE' LIMIT 1",
      [headUuid],
    );
    if (!emp.length) {
      throw new ApiError(
        "Head employee not found or is not active.",
        422,
        "INVALID_EMPLOYEE",
      );
    }
    // Note: on creation the department doesn't exist yet, so we skip dept-match check.
    // We only block if they're already a head of another existing dept.
    const [alreadyHead] = await executeQuery(
      "SELECT uuid FROM Departments WHERE head_employee_uuid = ? LIMIT 1",
      [headUuid],
    );
    if (alreadyHead.length) {
      throw new ApiError(
        "This employee is already assigned as the head of another department.",
        422,
        "EMPLOYEE_ALREADY_HEAD",
      );
    }
  }

  const uuid = randomUUID();
  // Generate dept_code from name (required NOT NULL column)
  const deptCode = name
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, '_')
    .replace(/^_|_$/g, '')
    .substring(0, 50);
  await executeQuery(
    "INSERT INTO Departments (uuid, dept_code, name, parent_uuid, head_employee_uuid) VALUES (?, ?, ?, ?, ?)",
    [uuid, deptCode, name, parentUuid, headUuid],
  );

  await assertNoCircularParent(uuid, parentUuid);

  return getDepartmentByUuid(uuid);
}

async function updateDepartment(uuid, payload) {
  const department = await getDepartmentByUuid(uuid);
  if (!department) {
    throw new ApiError("Department not found.", 404, "NOT_FOUND");
  }

  const updates = [];
  const params = [];

  if (payload.name !== undefined) {
    const name = String(payload.name || "").trim();
    if (!name) {
      throw new ApiError(
        "Department name is required.",
        400,
        "VALIDATION_ERROR",
      );
    }

    const [existing] = await executeQuery(
      "SELECT uuid FROM Departments WHERE name = ? LIMIT 1",
      [name],
    );
    if (existing.length && existing[0].uuid !== uuid) {
      throw new ApiError(
        "Department name already exists.",
        409,
        "DUPLICATE_DEPARTMENT",
      );
    }

    updates.push("name = ?");
    params.push(name);
  }

  if (payload.parent_uuid !== undefined) {
    const parentUuid = payload.parent_uuid
      ? String(payload.parent_uuid).trim()
      : null;

    if (parentUuid) {
      const parent = await ensureDepartmentExists(parentUuid);
      if (!parent) {
        throw new ApiError(
          "Parent department not found.",
          422,
          "INVALID_PARENT",
        );
      }
    }

    await assertNoCircularParent(uuid, parentUuid);
    updates.push("parent_uuid = ?");
    params.push(parentUuid);
  }

  if (payload.head_employee_uuid !== undefined) {
    const headUuid = payload.head_employee_uuid
      ? String(payload.head_employee_uuid).trim()
      : null;

    if (headUuid) {
      // Validate the employee exists and is active
      const [emp] = await executeQuery(
        "SELECT uuid, department_uuid FROM Employees WHERE uuid = ? AND status = 'ACTIVE' LIMIT 1",
        [headUuid],
      );
      if (!emp.length) {
        throw new ApiError(
          "Head employee not found or is not active.",
          422,
          "INVALID_EMPLOYEE",
        );
      }
      // Rule 1: employee must belong to THIS department
      if (emp[0].department_uuid !== uuid) {
        throw new ApiError(
          "This employee cannot be assigned as head because they belong to another department.",
          422,
          "EMPLOYEE_WRONG_DEPARTMENT",
        );
      }
      // Rule 2: employee must not already be head of a DIFFERENT department
      const [alreadyHead] = await executeQuery(
        "SELECT uuid FROM Departments WHERE head_employee_uuid = ? AND uuid <> ? LIMIT 1",
        [headUuid, uuid],
      );
      if (alreadyHead.length) {
        throw new ApiError(
          "This employee is already assigned as the head of another department.",
          422,
          "EMPLOYEE_ALREADY_HEAD",
        );
      }
    }

    updates.push("head_employee_uuid = ?");
    params.push(headUuid);
  }

  if (!updates.length) {
    throw new ApiError(
      "No department fields to update.",
      400,
      "VALIDATION_ERROR",
    );
  }

  params.push(uuid);
  await executeQuery(
    `UPDATE Departments SET ${updates.join(", ")}, updated_at = CURRENT_TIMESTAMP WHERE uuid = ?`,
    params,
  );

  return getDepartmentByUuid(uuid);
}

async function deleteDepartment(uuid) {
  const department = await getDepartmentByUuid(uuid);
  if (!department) {
    throw new ApiError("Department not found.", 404, "NOT_FOUND");
  }

  const [children] = await executeQuery(
    "SELECT COUNT(*) AS count FROM Departments WHERE parent_uuid = ?",
    [String(uuid).trim()],
  );
  if (Number(children[0]?.count || 0) > 0) {
    throw new ApiError(
      "Cannot delete department with child departments.",
      409,
      "HAS_CHILDREN",
    );
  }

  const [employees] = await executeQuery(
    "SELECT COUNT(*) AS count FROM Employees WHERE department_uuid = ?",
    [String(uuid).trim()],
  );
  if (Number(employees[0]?.count || 0) > 0) {
    throw new ApiError(
      "Cannot delete department with assigned employees.",
      409,
      "HAS_EMPLOYEES",
    );
  }

  const [positions] = await executeQuery(
    "SELECT COUNT(*) AS count FROM Positions WHERE department_uuid = ?",
    [String(uuid).trim()],
  );
  if (Number(positions[0]?.count || 0) > 0) {
    throw new ApiError(
      "Cannot delete department with assigned positions. Please reassign or delete positions first.",
      409,
      "HAS_POSITIONS",
    );
  }

  await executeQuery("DELETE FROM Departments WHERE uuid = ?", [
    String(uuid).trim(),
  ]);
  return true;
}


/**
 * Check if an employee is designated as the head of their department
 * @param {string} employeeUuid - UUID of the employee
 * @param {string} [departmentUuid] - Optional department UUID to check against specifically
 * @returns {Promise<boolean>} True if employee is designated as head of their department
 */
async function isEmployeeDesignatedDeptHead(employeeUuid, departmentUuid = null) {
  if (!employeeUuid) return false;

  let deptUuid = departmentUuid ? String(departmentUuid).trim() : null;
  if (!deptUuid) {
    const [empRows] = await executeQuery(
      "SELECT department_uuid FROM Employees WHERE uuid = ? LIMIT 1",
      [String(employeeUuid).trim()]
    );
    if (empRows.length > 0 && empRows[0].department_uuid) {
      deptUuid = empRows[0].department_uuid;
    }
  }

  if (!deptUuid) {
    return false;
  }

  const [deptRows] = await executeQuery(
    "SELECT uuid FROM Departments WHERE head_employee_uuid = ? AND uuid = ? LIMIT 1",
    [String(employeeUuid).trim(), deptUuid]
  );
  return deptRows.length > 0;
}

module.exports = {
  listDepartments,
  getDepartmentByUuid,
  ensureDepartmentExists,
  createDepartment,
  updateDepartment,
  deleteDepartment,
  isEmployeeDesignatedDeptHead,
};
