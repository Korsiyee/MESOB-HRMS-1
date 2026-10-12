const { randomUUID } = require("crypto");
const { executeQuery, withTransaction } = require("../utils/dbQuery");
const { ApiError } = require("../utils/errors");

/**
 * List all levels with optional filters and statistics
 */
async function listLevels({ includeInactive = false, includeCurrentVersion = false } = {}) {
  const params = [];
  let query = `
    SELECT
      l.uuid,
      l.level_code,
      l.name,
      l.description,
      l.sort_order,
      l.is_active,
      l.created_at,
      l.updated_at,
      COUNT(DISTINCT elh.employee_uuid) AS employee_count,
      COUNT(DISTINCT CASE WHEN e.gender = 'MALE' THEN elh.employee_uuid END) AS male_count,
      COUNT(DISTINCT CASE WHEN e.gender = 'FEMALE' THEN elh.employee_uuid END) AS female_count
  `;

  if (includeCurrentVersion) {
    query += `,
      lv.uuid AS current_version_uuid,
      lv.base_salary AS current_base_salary,
      lv.effective_from AS current_effective_from,
      lv.version_number AS current_version_number
    `;
  }

  query += `
    FROM Levels l
    LEFT JOIN EmployeeLevelHistory elh ON elh.level_uuid = l.uuid AND (elh.effective_to IS NULL OR elh.effective_to >= CURDATE())
    LEFT JOIN Employees e ON e.uuid = elh.employee_uuid AND e.status = 'ACTIVE'
  `;

  if (includeCurrentVersion) {
    query += `
      LEFT JOIN LevelVersions lv ON lv.level_uuid = l.uuid
        AND lv.effective_from <= CURDATE()
        AND (lv.effective_to IS NULL OR lv.effective_to >= CURDATE())
    `;
  }

  if (!includeInactive) {
    query += " WHERE l.is_active = TRUE";
  }

  query += `
    GROUP BY l.uuid, l.level_code, l.name, l.description, l.sort_order, l.is_active, 
             l.created_at, l.updated_at
  `;

  if (includeCurrentVersion) {
    query += `, lv.uuid, lv.base_salary, lv.effective_from, lv.version_number`;
  }

  query += " ORDER BY l.sort_order ASC, l.name ASC";

  const [rows] = await executeQuery(query, params);

  return rows.map((r) => ({
    ...r,
    employee_count: Number(r.employee_count || 0),
    male_count: Number(r.male_count || 0),
    female_count: Number(r.female_count || 0),
    current_base_salary: r.current_base_salary ? Number(r.current_base_salary) : null,
  }));
}

/**
 * Get a single level by UUID with full details
 */
async function getLevelByUuid(uuid, { includeVersions = true, includeEmployees = false } = {}) {
  const [rows] = await executeQuery(
    `
      SELECT
        l.uuid,
        l.level_code,
        l.name,
        l.description,
        l.sort_order,
        l.is_active,
        l.created_at,
        l.updated_at,
        COUNT(DISTINCT elh.employee_uuid) AS employee_count,
        COUNT(DISTINCT CASE WHEN e.gender = 'MALE' THEN elh.employee_uuid END) AS male_count,
        COUNT(DISTINCT CASE WHEN e.gender = 'FEMALE' THEN elh.employee_uuid END) AS female_count
      FROM Levels l
      LEFT JOIN EmployeeLevelHistory elh ON elh.level_uuid = l.uuid AND (elh.effective_to IS NULL OR elh.effective_to >= CURDATE())
      LEFT JOIN Employees e ON e.uuid = elh.employee_uuid AND e.status = 'ACTIVE'
      WHERE l.uuid = ?
      GROUP BY l.uuid, l.level_code, l.name, l.description, l.sort_order, l.is_active, 
               l.created_at, l.updated_at
      LIMIT 1
    `,
    [String(uuid || "").trim()]
  );

  if (!rows[0]) {
    return null;
  }

  const level = {
    ...rows[0],
    employee_count: Number(rows[0].employee_count || 0),
    male_count: Number(rows[0].male_count || 0),
    female_count: Number(rows[0].female_count || 0),
  };

  // Include version history if requested
  if (includeVersions) {
    const [versions] = await executeQuery(
      `
        SELECT
          lv.uuid,
          lv.level_uuid,
          lv.base_salary,
          lv.allowances_json,
          lv.effective_from,
          lv.effective_to,
          lv.version_number,
          lv.notes,
          lv.created_by_uuid,
          lv.created_at,
          COALESCE(CONCAT_WS(' ', ue.first_name, ue.middle_name, ue.last_name), u.username, 'System') AS created_by_name
        FROM LevelVersions lv
        LEFT JOIN Users u ON u.uuid = lv.created_by_uuid
        LEFT JOIN Employees ue ON ue.uuid = u.employee_uuid
        WHERE lv.level_uuid = ?
        ORDER BY lv.effective_from DESC, lv.version_number DESC
      `,
      [level.uuid]
    );

    level.versions = versions.map((v) => {
      let allowances = [];
      try {
        const parsed = v.allowances_json
          ? typeof v.allowances_json === "string"
            ? JSON.parse(v.allowances_json)
            : v.allowances_json
          : [];
        if (Array.isArray(parsed)) {
          allowances = parsed.map((a) => ({
            uuid: a.uuid || randomUUID(),
            allowance_type: a.allowance_type || a.type || "OTHER",
            allowance_name: a.allowance_name || a.type || "Allowance",
            amount: Number(a.amount || 0),
            is_taxable: Boolean(a.is_taxable ?? true),
            description: a.description || null,
          }));
        }
      } catch (_) {
        allowances = [];
      }

      return {
        ...v,
        base_salary: Number(v.base_salary || 0),
        allowances,
      };
    });

    // Mark current version
    const currentVersion = level.versions.find(
      (v) =>
        new Date(v.effective_from) <= new Date() &&
        (!v.effective_to || new Date(v.effective_to) >= new Date())
    );
    if (currentVersion) {
      currentVersion.is_current = true;
      level.current_version = currentVersion;
    }
  }

  // Include employees if requested
  if (includeEmployees) {
    const [employees] = await executeQuery(
      `
        SELECT
          e.uuid,
          e.mesob_id,
          e.title,
          e.first_name,
          e.middle_name,
          e.last_name,
          e.gender,
          e.status,
          e.hire_date,
          d.name AS department_name,
          p.title AS position_title,
          elh.effective_from AS level_assigned_date
        FROM EmployeeLevelHistory elh
        JOIN Employees e ON e.uuid = elh.employee_uuid
        LEFT JOIN Positions p ON p.uuid = e.position_uuid
        LEFT JOIN Departments d ON d.uuid = COALESCE(e.department_uuid, p.department_uuid)
        WHERE elh.level_uuid = ? AND (elh.effective_to IS NULL OR elh.effective_to >= CURDATE()) AND e.status = 'ACTIVE'
        ORDER BY e.last_name ASC, e.first_name ASC
      `,
      [level.uuid]
    );

    level.employees = employees;
  }

  return level;
}

/**
 * Create a new level with initial version
 */
async function createLevel(payload, createdByUuid = null) {
  const name = String(payload.name || "").trim();
  if (!name) {
    throw new ApiError("Level name is required.", 400, "VALIDATION_ERROR");
  }

  // Check for duplicate name
  const [existing] = await executeQuery(
    "SELECT uuid FROM Levels WHERE name = ? LIMIT 1",
    [name]
  );

  if (existing.length > 0) {
    throw new ApiError(
      "A level with this name already exists.",
      409,
      "DUPLICATE_LEVEL_NAME"
    );
  }

  const uuid = randomUUID();
  const levelCode = String(
    payload.level_code ||
      payload.code ||
      `LVL-${name.replace(/[^A-Za-z0-9]/g, "").slice(0, 6).toUpperCase()}-${Math.floor(100 + Math.random() * 900)}`
  ).trim();
  const description = String(payload.description || "").trim() || null;
  const sortOrder = Number.isFinite(payload.sort_order)
    ? Math.max(0, Math.floor(payload.sort_order))
    : 0;
  const is_active = payload.is_active !== false;

  return withTransaction(async (connection) => {
    // Insert level
    await connection.execute(
      `INSERT INTO Levels (uuid, level_code, name, description, sort_order, is_active)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [uuid, levelCode, name, description, sortOrder, is_active ? 1 : 0]
    );

    // Create initial version if base_salary provided
    if (payload.base_salary !== undefined) {
      const baseSalary = Number(payload.base_salary || 0);
      const effectiveFrom = payload.effective_from || new Date().toISOString().split("T")[0];
      const versionUuid = randomUUID();
      const allowancesJson =
        Array.isArray(payload.allowances) && payload.allowances.length > 0
          ? JSON.stringify(
              payload.allowances.map((a) => ({
                type: a.allowance_type || a.type || a.allowance_name,
                allowance_name: a.allowance_name || a.type || "Allowance",
                allowance_type: a.allowance_type || a.type || "OTHER",
                amount: Number(a.amount || 0),
                is_taxable: a.is_taxable !== false,
                description: a.description || null,
              }))
            )
          : null;

      await connection.execute(
        `INSERT INTO LevelVersions 
         (uuid, level_uuid, base_salary, allowances_json, effective_from, version_number, notes, created_by_uuid)
         VALUES (?, ?, ?, ?, ?, 1, ?, ?)`,
        [versionUuid, uuid, baseSalary, allowancesJson, effectiveFrom, payload.notes || null, createdByUuid]
      );
    }

    return getLevelByUuid(uuid);
  });
}

/**
 * Update a level (basic info only, not versions)
 */
async function updateLevel(uuid, payload) {
  const level = await getLevelByUuid(uuid, { includeVersions: false });
  if (!level) {
    throw new ApiError("Level not found.", 404, "NOT_FOUND");
  }

  const updates = [];
  const params = [];

  if (payload.name !== undefined) {
    const name = String(payload.name).trim();
    if (!name) {
      throw new ApiError("Level name cannot be empty.", 400, "VALIDATION_ERROR");
    }

    // Check for duplicate name (excluding current level)
    const [existing] = await executeQuery(
      "SELECT uuid FROM Levels WHERE name = ? AND uuid <> ? LIMIT 1",
      [name, uuid]
    );

    if (existing.length > 0) {
      throw new ApiError(
        "A level with this name already exists.",
        409,
        "DUPLICATE_LEVEL_NAME"
      );
    }

    updates.push("name = ?");
    params.push(name);
  }

  if (payload.level_code !== undefined || payload.code !== undefined) {
    const code = String(payload.level_code || payload.code).trim();
    if (code) {
      updates.push("level_code = ?");
      params.push(code);
    }
  }

  if (payload.description !== undefined) {
    updates.push("description = ?");
    params.push(String(payload.description || "").trim() || null);
  }

  if (payload.sort_order !== undefined) {
    updates.push("sort_order = ?");
    params.push(
      Number.isFinite(payload.sort_order)
        ? Math.max(0, Math.floor(payload.sort_order))
        : 0
    );
  }

  if (payload.is_active !== undefined) {
    updates.push("is_active = ?");
    params.push(payload.is_active ? 1 : 0);
  }

  if (updates.length === 0) {
    return level;
  }

  params.push(uuid);
  await executeQuery(
    `UPDATE Levels SET ${updates.join(", ")} WHERE uuid = ?`,
    params
  );

  return getLevelByUuid(uuid);
}

/**
 * Delete a level (only if no employees assigned)
 */
async function deleteLevel(uuid) {
  const level = await getLevelByUuid(uuid, { includeVersions: false });
  if (!level) {
    throw new ApiError("Level not found.", 404, "NOT_FOUND");
  }

  // Check if any employees are assigned to this level
  const [employees] = await executeQuery(
    "SELECT COUNT(*) AS count FROM EmployeeLevelHistory WHERE level_uuid = ? AND (effective_to IS NULL OR effective_to >= CURDATE())",
    [uuid]
  );

  if (Number(employees[0]?.count || 0) > 0) {
    throw new ApiError(
      "Cannot delete level that is assigned to employees.",
      409,
      "LEVEL_IN_USE"
    );
  }

  await executeQuery("DELETE FROM LevelVersions WHERE level_uuid = ?", [uuid]);
  await executeQuery("DELETE FROM Levels WHERE uuid = ?", [uuid]);
}

/**
 * Create a new version for a level (salary revision)
 */
async function createLevelVersion(levelUuid, payload, createdByUuid = null) {
  const level = await getLevelByUuid(levelUuid, { includeVersions: false });
  if (!level) {
    throw new ApiError("Level not found.", 404, "NOT_FOUND");
  }

  const baseSalary = Number(payload.base_salary);
  if (!Number.isFinite(baseSalary) || baseSalary < 0) {
    throw new ApiError("Valid base_salary is required.", 400, "VALIDATION_ERROR");
  }

  const effectiveFrom = String(payload.effective_from || "").trim();
  if (!effectiveFrom || !/^\d{4}-\d{2}-\d{2}$/.test(effectiveFrom)) {
    throw new ApiError(
      "Valid effective_from date (YYYY-MM-DD) is required.",
      400,
      "VALIDATION_ERROR"
    );
  }

  return withTransaction(async (connection) => {
    // Get the latest version number
    const [lastVersion] = await connection.execute(
      "SELECT MAX(version_number) AS max_version FROM LevelVersions WHERE level_uuid = ?",
      [levelUuid]
    );

    const versionNumber = Number(lastVersion[0]?.max_version || 0) + 1;

    // Close any overlapping versions
    await connection.execute(
      `UPDATE LevelVersions
       SET effective_to = DATE_SUB(?, INTERVAL 1 DAY)
       WHERE level_uuid = ?
         AND effective_from < ?
         AND (effective_to IS NULL OR effective_to >= ?)`,
      [effectiveFrom, levelUuid, effectiveFrom, effectiveFrom]
    );

    // Insert new version
    const versionUuid = randomUUID();
    const allowancesJson =
      Array.isArray(payload.allowances) && payload.allowances.length > 0
        ? JSON.stringify(
            payload.allowances.map((a) => ({
              type: a.allowance_type || a.type || a.allowance_name,
              allowance_name: a.allowance_name || a.type || "Allowance",
              allowance_type: a.allowance_type || a.type || "OTHER",
              amount: Number(a.amount || 0),
              is_taxable: a.is_taxable !== false,
              description: a.description || null,
            }))
          )
        : null;

    await connection.execute(
      `INSERT INTO LevelVersions
       (uuid, level_uuid, base_salary, allowances_json, effective_from, version_number, notes, created_by_uuid)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        versionUuid,
        levelUuid,
        baseSalary,
        allowancesJson,
        effectiveFrom,
        versionNumber,
        String(payload.notes || "").trim() || null,
        createdByUuid,
      ]
    );

    return getLevelByUuid(levelUuid);
  });
}

/**
 * Get current level version for a specific date
 */
async function getLevelVersionAtDate(levelUuid, date = null) {
  const checkDate = date || new Date().toISOString().split("T")[0];

  const [rows] = await executeQuery(
    `
      SELECT
        lv.uuid,
        lv.level_uuid,
        lv.base_salary,
        lv.allowances_json,
        lv.effective_from,
        lv.effective_to,
        lv.version_number,
        lv.notes,
        lv.created_by_uuid,
        lv.created_at
      FROM LevelVersions lv
      WHERE lv.level_uuid = ?
        AND lv.effective_from <= ?
        AND (lv.effective_to IS NULL OR lv.effective_to >= ?)
      LIMIT 1
    `,
    [levelUuid, checkDate, checkDate]
  );

  if (!rows[0]) {
    return null;
  }

  let allowances = [];
  try {
    const parsed = rows[0].allowances_json
      ? typeof rows[0].allowances_json === "string"
        ? JSON.parse(rows[0].allowances_json)
        : rows[0].allowances_json
      : [];
    if (Array.isArray(parsed)) {
      allowances = parsed.map((a) => ({
        uuid: a.uuid || randomUUID(),
        allowance_type: a.allowance_type || a.type || "OTHER",
        allowance_name: a.allowance_name || a.type || "Allowance",
        amount: Number(a.amount || 0),
        is_taxable: Boolean(a.is_taxable ?? true),
        description: a.description || null,
      }));
    }
  } catch (_) {
    allowances = [];
  }

  return {
    ...rows[0],
    base_salary: Number(rows[0].base_salary || 0),
    allowances,
  };
}

/**
 * Check if level exists
 */
async function ensureLevelExists(uuid) {
  if (!uuid) {
    return null;
  }

  const [rows] = await executeQuery(
    "SELECT uuid, name, is_active FROM Levels WHERE uuid = ? LIMIT 1",
    [String(uuid).trim()]
  );

  return rows[0] || null;
}

module.exports = {
  listLevels,
  getLevelByUuid,
  createLevel,
  updateLevel,
  deleteLevel,
  createLevelVersion,
  getLevelVersionAtDate,
  ensureLevelExists,
};
