const { randomUUID } = require("crypto");
const { db } = require("../config/db");
const { executeQuery, withTransaction } = require("../utils/dbQuery");
const { ApiError } = require("../utils/errors");
const { isValidIsoDate } = require("../utils/validation");
const EmployeeSyncService = require("./employeeSyncService");
const {
  uploadEmployeeFile,
  deleteObject,
  getSignedUrl,
} = require("./employeeStorageService");
const { ensureDepartmentExists } = require("./departmentService");
const { getPositionByUuid } = require("./positionService");

const EMPLOYEE_STATUSES = new Set(["ACTIVE", "INACTIVE", "TERMINATED"]);

function normalizeDate(value) {
  if (!value) {
    return null;
  }
  const raw = String(value).trim();
  return isValidIsoDate(raw) ? raw : null;
}

function buildEmployeeFullName(payload) {
  const names = [
    payload.title,
    payload.first_name,
    payload.middle_name,
    payload.last_name,
  ]
    .filter(Boolean)
    .map(String);
  return names.join(" ").trim();
}

async function ensureEmployeeDocumentSchema() {
  // Schema changes have been moved to database migrations
  // All required columns should exist in the schema.sql file
  return Promise.resolve();
}

async function generateMesobId(connection) {
  const [result] = await connection.execute(
    "INSERT INTO MesobIdSequence () VALUES ()",
  );
  const sequenceId = Number(result.insertId || 0);
  if (!sequenceId) {
    throw new ApiError("Failed to generate MESOB ID.", 500, "MESOB_ID_ERROR");
  }
  return `MESOB-${String(sequenceId).padStart(4, "0")}`;
}

async function ensureEmployeeExists(employeeUuid) {
  const [rows] = await executeQuery(
    "SELECT uuid, status FROM Employees WHERE uuid = ? LIMIT 1",
    [String(employeeUuid || "").trim()],
  );
  return rows[0] || null;
}

async function ensureTinUnique(tinNumber, employeeUuid = null) {
  if (!tinNumber) {
    return;
  }
  const params = [String(tinNumber).trim()];
  let query = "SELECT uuid FROM Employees WHERE tin_number = ?";
  if (employeeUuid) {
    query += " AND uuid <> ?";
    params.push(String(employeeUuid).trim());
  }
  query += " LIMIT 1";

  const [rows] = await executeQuery(query, params);
  if (rows.length) {
    throw new ApiError("TIN number already exists.", 409, "DUPLICATE_TIN");
  }
}

async function validateReferences(payload) {
  if (payload.department_uuid) {
    const department = await ensureDepartmentExists(payload.department_uuid);
    if (!department) {
      throw new ApiError("Department not found.", 422, "INVALID_DEPARTMENT");
    }
  }
  if (payload.position_uuid) {
    const position = await getPositionByUuid(payload.position_uuid);
    if (!position) {
      throw new ApiError("Position not found.", 422, "INVALID_POSITION");
    }
  }
}

async function listEmployees(filters = {}) {
  const params = [];
  let whereClause = "WHERE 1 = 1";

  if (filters.status) {
    // Handle multiple statuses separated by comma
    const statuses = filters.status.split(',').map(s => s.trim()).filter(Boolean);
    if (statuses.length > 0) {
      const placeholders = statuses.map(() => '?').join(',');
      whereClause += ` AND e.status IN (${placeholders})`;
      params.push(...statuses);
    }
  }
  if (filters.departmentUuid) {
    whereClause += " AND p.department_uuid = ?";
    params.push(filters.departmentUuid);
  }
  if (filters.positionUuid) {
    whereClause += " AND e.position_uuid = ?";
    params.push(filters.positionUuid);
  }
  if (filters.search) {
    whereClause +=
      " AND (e.first_name LIKE ? OR e.middle_name LIKE ? OR e.last_name LIKE ? OR e.mesob_id LIKE ?)";
    const searchTerm = `%${filters.search}%`;
    params.push(searchTerm, searchTerm, searchTerm, searchTerm);
  }

  const [countRows] = await executeQuery(
    `SELECT COUNT(*) AS total FROM Employees e
     LEFT JOIN Positions   p ON p.uuid = e.position_uuid
     LEFT JOIN Departments d ON d.uuid = p.department_uuid
     ${whereClause}`,
    params,
  );

  let query = `
    SELECT e.uuid, e.mesob_id, e.title, e.first_name, e.middle_name, e.last_name,
      e.mother_name, e.gender, e.date_of_birth, e.nationality, e.hire_date,
      e.prior_gov_service_years, e.status, e.attendance_exempt, p.department_uuid,
      e.position_uuid, e.profile_photo_key, e.created_at,
      e.updated_at,
      d.name  AS department_name,
      p.title AS position_title
    FROM Employees e
    LEFT JOIN Positions   p ON p.uuid = e.position_uuid
    LEFT JOIN Departments d ON d.uuid = p.department_uuid
    ${whereClause}
    ORDER BY e.created_at DESC
  `;

  const queryParams = [...params];

  const limit = Number.isFinite(filters.limit)
    ? Math.floor(Math.max(0, filters.limit))
    : null;
  const offset = Number.isFinite(filters.offset)
    ? Math.floor(Math.max(0, filters.offset))
    : null;

  if (Number.isFinite(limit)) {
    query += ` LIMIT ${limit}`;
  }
  if (Number.isFinite(offset)) {
    query += ` OFFSET ${offset}`;
  }

  const [rows] = await executeQuery(query, queryParams);
  return {
    items: rows,
    total: Number(countRows[0]?.total || 0),
  };
}

async function createEmployee(payload) {
  const hireDate = normalizeDate(payload.hire_date);
  const birthDate = normalizeDate(payload.date_of_birth);
  const today = new Date().toISOString().slice(0, 10);

  if (!hireDate) {
    throw new ApiError(
      "hire_date is required and must be YYYY-MM-DD.",
      400,
      "VALIDATION_ERROR",
    );
  }

  if (!birthDate) {
    throw new ApiError(
      "date_of_birth is required and must be YYYY-MM-DD.",
      400,
      "VALIDATION_ERROR",
    );
  }

  if (birthDate > today) {
    throw new ApiError(
      "date_of_birth cannot be in the future.",
      422,
      "VALIDATION_ERROR",
    );
  }

  if (birthDate > hireDate) {
    throw new ApiError(
      "hire_date must be on or after date_of_birth.",
      422,
      "VALIDATION_ERROR",
    );
  }

  if (hireDate > today) {
    throw new ApiError(
      "hire_date cannot be in the future.",
      422,
      "VALIDATION_ERROR",
    );
  }

  const status = payload.status
    ? String(payload.status).trim().toUpperCase()
    : "ACTIVE";

  if (!EMPLOYEE_STATUSES.has(status)) {
    throw new ApiError(
      "Status must be ACTIVE, INACTIVE, or TERMINATED.",
      422,
      "VALIDATION_ERROR",
    );
  }

  if (status === "TERMINATED") {
    throw new ApiError(
      "New employees cannot be created as TERMINATED.",
      422,
      "VALIDATION_ERROR",
    );
  }

  await validateReferences(payload);
  await ensureTinUnique(payload.tin_number);

  const result = await withTransaction(async (connection) => {
    const employeeUuid = randomUUID();
    const mesobId = await generateMesobId(connection);

    await connection.execute(
      `
        INSERT INTO Employees (
          uuid, mesob_id, title, first_name, middle_name, last_name,
          mother_name, gender, date_of_birth, nationality, profile_photo_key,
          tin_number, pension_code, bank_name, bank_account_number,
          hire_date, prior_gov_service_years, status, attendance_exempt,
          department_uuid, position_uuid
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `,
      [
        employeeUuid,
        mesobId,
        payload.title || null,
        payload.first_name,
        payload.middle_name,
        payload.last_name,
        payload.mother_name,
        payload.gender ? String(payload.gender).toUpperCase() : null,
        birthDate,
        payload.nationality || "Ethiopian",
        null,
        payload.tin_number || null,
        payload.pension_code || null,
        payload.bank_name || null,
        payload.bank_account_number || null,
        hireDate,
        Number(payload.prior_gov_service || 0),
        status,
        payload.attendance_exempt ? 1 : 0,
        payload.department_uuid || null,
        payload.position_uuid || null,
      ],
    );

    if (Array.isArray(payload.addresses) && payload.addresses.length) {
      for (const address of payload.addresses) {
        await connection.execute(
          `
            INSERT INTO EmployeeAddresses (
              uuid, employee_uuid, address_type, region, zone, woreda,
              kebele, house_number, phone_primary, phone_secondary, email
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
          `,
          [
            randomUUID(),
            employeeUuid,
            address.address_type || "CURRENT",
            address.region || null,
            address.zone || null,
            address.woreda || null,
            address.kebele || null,
            address.house_number || null,
            address.phone_primary || null,
            address.phone_secondary || null,
            address.email || null,
          ],
        );
      }
    }

    if (payload.draft_uuid) {
      await connection.execute(
        "DELETE FROM EmployeeRegistrationDrafts WHERE uuid = ?",
        [String(payload.draft_uuid).trim()],
      );
    }

    return employeeUuid;
  });

  const createdEmployee = await getEmployeeByUuid(result, {
    includeDocuments: true,
  });

  // Balance rebuild is non-critical — wrap to prevent 500 if calendar/policy service fails
  try {
    await EmployeeSyncService.upsertEmployeeAndRebuildBalance({
      uuid: createdEmployee.uuid,
      full_name: buildEmployeeFullName(createdEmployee),
      hire_date: createdEmployee.hire_date,
      prior_gov_service: Number(createdEmployee.prior_gov_service_years || 0),
      status: createdEmployee.status,
    });
  } catch (syncErr) {
    console.warn("Balance rebuild after employee create failed (non-critical):", syncErr.message);
  }

  return createdEmployee;
}

async function getEmployee(connOrUuid, maybeUuid) {
  const hasConnection =
    connOrUuid &&
    typeof connOrUuid.execute === "function" &&
    typeof maybeUuid === "string";
  const executor = hasConnection ? connOrUuid : db.promise();
  const employeeUuid = hasConnection ? maybeUuid : connOrUuid;

  const [rows] = await executor.execute(
    "SELECT uuid, hire_date, prior_gov_service_years, status FROM Employees WHERE uuid = ? LIMIT 1",
    [String(employeeUuid || "").trim()],
  );

  return rows[0] || null;
}

async function getEmployeeByUuid(employeeUuid, options = {}) {
  const pool = db.promise();
  const [employees] = await pool.execute(
    `
      SELECT e.uuid, e.mesob_id, e.title, e.first_name, e.middle_name, e.last_name, e.mother_name,
        e.gender, e.date_of_birth, e.nationality, e.profile_photo_key, e.tin_number,
        e.pension_code, e.bank_name, e.bank_account_number, e.hire_date,
        e.prior_gov_service_years, e.status, e.attendance_exempt, p.department_uuid,
        e.position_uuid, e.created_at, e.updated_at,
        d.name AS department_name,
        p.title AS position_title
      FROM Employees e
      LEFT JOIN Positions p ON p.uuid = e.position_uuid
      LEFT JOIN Departments d ON d.uuid = p.department_uuid
      WHERE e.uuid = ?
      LIMIT 1
    `,
    [String(employeeUuid || "").trim()],
  );

  if (!employees.length) {
    return null;
  }

  const employee = employees[0];
  const [addresses] = await pool.execute(
    `
      SELECT uuid, address_type, region, zone, woreda, kebele,
        house_number, phone_primary, phone_secondary, email
      FROM EmployeeAddresses
      WHERE employee_uuid = ?
    `,
    [employeeUuid],
  );

  let documents = [];
  if (options.includeDocuments) {
    documents = await listEmployeeDocuments(employeeUuid, {
      includeSignedUrls: Boolean(options.includeSignedUrls),
    });
  }

  let photoUrl = null;
  if (options.includeSignedUrls && employee.profile_photo_key) {
    photoUrl = await getSignedUrl(employee.profile_photo_key);
  }

  return { ...employee, profile_photo_url: photoUrl, addresses, documents };
}

async function updateEmployee(employeeUuid, payload) {
  const employee = await ensureEmployeeExists(employeeUuid);
  if (!employee) {
    throw new ApiError("Employee not found.", 404, "NOT_FOUND");
  }

  if (employee.status === "TERMINATED") {
    throw new ApiError(
      "Terminated employees cannot be updated.",
      409,
      "EMPLOYEE_TERMINATED",
    );
  }

  await validateReferences(payload);
  await ensureTinUnique(payload.tin_number, employeeUuid);

  await withTransaction(async (connection) => {
    const fields = [];
    const values = [];
    const allowedFields = [
      "title",
      "first_name",
      "middle_name",
      "last_name",
      "mother_name",
      "gender",
      "date_of_birth",
      "nationality",
      "tin_number",
      "pension_code",
      "bank_name",
      "bank_account_number",
      "hire_date",
      "prior_gov_service_years",
      "attendance_exempt",
      "department_uuid",
      "position_uuid",
    ];

    for (const field of allowedFields) {
      if (Object.prototype.hasOwnProperty.call(payload, field)) {
        fields.push(`${field} = ?`);
        if (field === "date_of_birth" || field === "hire_date") {
          values.push(normalizeDate(payload[field]));
        } else if (field === "attendance_exempt") {
          values.push(payload[field] ? 1 : 0);
        } else if (
          field === "department_uuid" ||
          field === "position_uuid"
          
          
        ) {
          values.push(payload[field] || null);
        } else if (field === "gender" && payload[field]) {
          values.push(String(payload[field]).toUpperCase());
        } else {
          values.push(payload[field] === "" ? null : payload[field]);
        }
      }
    }

    if (!fields.length && !Array.isArray(payload.addresses)) {
      throw new ApiError(
        "No updatable employee fields provided.",
        400,
        "VALIDATION_ERROR",
      );
    }

    if (fields.length) {
      values.push(employeeUuid);
      await connection.execute(
        `UPDATE Employees SET ${fields.join(", ")}, updated_at = CURRENT_TIMESTAMP WHERE uuid = ?`,
        values,
      );
    }

    // Rule 4: if department changed, auto-remove this employee as head of their previous department
    if (Object.prototype.hasOwnProperty.call(payload, 'department_uuid') && payload.department_uuid !== undefined) {
      // Clear any dept where this employee is head but it's no longer their department
      await connection.execute(
        `UPDATE Departments SET head_employee_uuid = NULL, updated_at = CURRENT_TIMESTAMP
         WHERE head_employee_uuid = ?
           AND uuid NOT IN (
             SELECT department_uuid FROM Employees WHERE uuid = ? AND department_uuid IS NOT NULL
           )`,
        [employeeUuid, employeeUuid],
      );
    }

    if (Array.isArray(payload.addresses)) {
      await connection.execute(
        "DELETE FROM EmployeeAddresses WHERE employee_uuid = ?",
        [employeeUuid],
      );

      for (const address of payload.addresses) {
        await connection.execute(
          `
            INSERT INTO EmployeeAddresses (
              uuid, employee_uuid, address_type, region, zone, woreda,
              kebele, house_number, phone_primary, phone_secondary, email
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
          `,
          [
            randomUUID(),
            employeeUuid,
            address.address_type || "CURRENT",
            address.region || null,
            address.zone || null,
            address.woreda || null,
            address.kebele || null,
            address.house_number || null,
            address.phone_primary || null,
            address.phone_secondary || null,
            address.email || null,
          ],
        );
      }
    }
  });

  const updatedEmployee = await getEmployeeByUuid(employeeUuid, {
    includeDocuments: true,
  });
  try {
    await EmployeeSyncService.upsertEmployeeAndRebuildBalance({
      uuid: updatedEmployee.uuid,
      full_name: buildEmployeeFullName(updatedEmployee),
      hire_date: updatedEmployee.hire_date,
      prior_gov_service: Number(updatedEmployee.prior_gov_service_years || 0),
      status: updatedEmployee.status,
    });
  } catch (syncErr) {
    console.warn("Balance rebuild after employee update failed (non-critical):", syncErr.message);
  }

  return updatedEmployee;
}

async function updateEmployeeStatus(employeeUuid, status) {
  const employee = await ensureEmployeeExists(employeeUuid);
  if (!employee) {
    throw new ApiError("Employee not found.", 404, "NOT_FOUND");
  }

  if (employee.status === "TERMINATED") {
    throw new ApiError(
      "Terminated employees cannot be updated.",
      409,
      "EMPLOYEE_TERMINATED",
    );
  }

  const normalizedStatus = String(status || "")
    .trim()
    .toUpperCase();
  if (!EMPLOYEE_STATUSES.has(normalizedStatus)) {
    throw new ApiError(
      "Status must be ACTIVE, INACTIVE, or TERMINATED.",
      422,
      "VALIDATION_ERROR",
    );
  }

  await executeQuery(
    "UPDATE Employees SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE uuid = ?",
    [normalizedStatus, String(employeeUuid).trim()],
  );

  const updatedEmployee = await getEmployeeByUuid(employeeUuid, {
    includeDocuments: true,
  });
  try {
    await EmployeeSyncService.upsertEmployeeAndRebuildBalance({
      uuid: updatedEmployee.uuid,
      full_name: buildEmployeeFullName(updatedEmployee),
      hire_date: updatedEmployee.hire_date,
      prior_gov_service: Number(updatedEmployee.prior_gov_service_years || 0),
      status: updatedEmployee.status,
    });
  } catch (syncErr) {
    console.warn("Balance rebuild after status change failed (non-critical):", syncErr.message);
  }

  return updatedEmployee;
}

async function saveDraft(draftUuid, stepCompleted, draftJson) {
  const stepValue = Number(stepCompleted || 0);
  if (!Number.isInteger(stepValue) || stepValue < 0 || stepValue > 5) {
    throw new ApiError(
      "stepCompleted must be between 0 and 5.",
      422,
      "VALIDATION_ERROR",
    );
  }

  const uuid = draftUuid || randomUUID();
  const jsonString = JSON.stringify(draftJson || {});
  
  await executeQuery(
    `INSERT INTO EmployeeRegistrationDrafts (uuid, step_completed, draft_json, created_at, updated_at) 
     VALUES (?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
     ON DUPLICATE KEY UPDATE 
       step_completed = ?, 
       draft_json = ?, 
       updated_at = CURRENT_TIMESTAMP`,
    [uuid, stepValue, jsonString, stepValue, jsonString],
  );
  
  return { uuid, step_completed: stepValue, draft_json: draftJson || {} };
}

async function getDraft(draftUuid) {
  try {
    const [rows] = await executeQuery(
      "SELECT uuid, step_completed, draft_json, created_at, updated_at FROM EmployeeRegistrationDrafts WHERE uuid = ? LIMIT 1",
      [String(draftUuid || "").trim()],
    );
    
    if (!rows.length) {
      return null;
    }
    
    const draft = rows[0];
    
    // MySQL JSON columns are automatically parsed into objects
    let parsedJson = draft.draft_json;
    
    // If for some reason it's a string, parse it
    if (typeof parsedJson === 'string') {
      try {
        parsedJson = JSON.parse(parsedJson);
      } catch (parseError) {
        console.error('Error parsing draft_json string:', parseError);
        parsedJson = {};
      }
    }
    
    // If it's not an object, use empty object
    if (typeof parsedJson !== 'object' || parsedJson === null) {
      parsedJson = {};
    }
    
    return { 
      uuid: draft.uuid,
      step_completed: draft.step_completed,
      draft_json: parsedJson,
      created_at: draft.created_at,
      updated_at: draft.updated_at
    };
  } catch (error) {
    console.error('Error in getDraft:', error);
    throw error;
  }
}

async function listEmployeeDocuments(employeeUuid, options = {}) {
  await ensureEmployeeDocumentSchema();

  const [rows] = await executeQuery(
    `
      SELECT uuid, doc_type, id_number, issue_date, valid_until,
        file_key, original_name, mime_type, file_size,
        created_at, updated_at
      FROM EmployeeIDDocuments
      WHERE employee_uuid = ?
      ORDER BY created_at DESC
    `,
    [String(employeeUuid || "").trim()],
  );

  if (!options.includeSignedUrls) {
    return rows;
  }

  const withUrls = [];
  for (const row of rows) {
    const signedUrl = await getSignedUrl(row.file_key);
    withUrls.push({ ...row, signed_url: signedUrl });
  }

  return withUrls;
}

async function addEmployeeDocuments(employeeUuid, files, metadata = {}) {
  await ensureEmployeeDocumentSchema();

  const employee = await ensureEmployeeExists(employeeUuid);
  if (!employee) {
    throw new ApiError("Employee not found.", 404, "NOT_FOUND");
  }

  // Get employee's MESOB ID for folder naming
  const [empRows] = await executeQuery(
    "SELECT mesob_id FROM Employees WHERE uuid = ? LIMIT 1",
    [String(employeeUuid).trim()]
  );
  const employeeId = empRows[0]?.mesob_id || employeeUuid;

  const createdDocs = [];
  const uploadedKeys = [];

  try {
    for (const file of files) {
      const upload = await uploadEmployeeFile({
        prefix: "employee-documents",
        employeeId,
        file,
      });
      uploadedKeys.push(upload.objectKey);

      const docType = metadata.doc_type || file.originalname || "Document";
      const idNumber = metadata.id_number || null;
      const issueDate = normalizeDate(metadata.issue_date);
      const validUntil = normalizeDate(metadata.valid_until);
      const uuid = randomUUID();

      await executeQuery(
        `
          INSERT INTO EmployeeIDDocuments (
            uuid, employee_uuid, doc_type, id_number, issue_date, valid_until,
            file_key, original_name, mime_type, file_size
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `,
        [
          uuid,
          employeeUuid,
          docType,
          idNumber,
          issueDate,
          validUntil,
          upload.objectKey,
          file.originalname || null,
          file.mimetype || null,
          file.size || null,
        ],
      );

      createdDocs.push({
        uuid,
        employee_uuid: employeeUuid,
        doc_type: docType,
        id_number: idNumber,
        issue_date: issueDate,
        valid_until: validUntil,
        file_key: upload.objectKey,
        original_name: file.originalname || null,
        mime_type: file.mimetype || null,
        file_size: file.size || null,
      });
    }
  } catch (error) {
    for (const key of uploadedKeys) {
      try {
        await deleteObject(key);
      } catch (cleanupError) {
        console.error("Failed to cleanup document upload:", cleanupError);
      }
    }
    throw error;
  }

  return createdDocs;
}

async function removeEmployeeDocument(employeeUuid, documentUuid) {
  await ensureEmployeeDocumentSchema();

  const [existing] = await executeQuery(
    "SELECT uuid, file_key FROM EmployeeIDDocuments WHERE uuid = ? AND employee_uuid = ? LIMIT 1",
    [String(documentUuid || "").trim(), String(employeeUuid || "").trim()],
  );
  if (!existing.length) {
    throw new ApiError(
      "Document not found for the requested employee.",
      404,
      "NOT_FOUND",
    );
  }

  await executeQuery("DELETE FROM EmployeeIDDocuments WHERE uuid = ?", [
    documentUuid,
  ]);

  try {
    await deleteObject(existing[0].file_key);
  } catch (error) {
    console.error("Failed to delete document object:", error);
  }

  return true;
}

async function uploadEmployeePhoto(employeeUuid, file) {
  const [existing] = await executeQuery(
    "SELECT profile_photo_key, mesob_id FROM Employees WHERE uuid = ? LIMIT 1",
    [String(employeeUuid || "").trim()],
  );
  if (!existing.length) {
    throw new ApiError("Employee not found.", 404, "NOT_FOUND");
  }

  const employeeId = existing[0].mesob_id || employeeUuid;

  const upload = await uploadEmployeeFile({
    prefix: "employee-photos",
    employeeId,
    file,
  });

  await executeQuery(
    "UPDATE Employees SET profile_photo_key = ?, updated_at = CURRENT_TIMESTAMP WHERE uuid = ?",
    [upload.objectKey, String(employeeUuid).trim()],
  );

  if (
    existing[0].profile_photo_key &&
    existing[0].profile_photo_key !== upload.objectKey
  ) {
    try {
      await deleteObject(existing[0].profile_photo_key);
    } catch (error) {
      console.error("Failed to delete previous photo:", error);
    }
  }

  const signedUrl = await getSignedUrl(upload.objectKey);
  return {
    employee_uuid: employeeUuid,
    profile_photo_key: upload.objectKey,
    profile_photo_url: signedUrl,
  };
}

async function getEmployeeShift(employeeUuid) {
  const [rows] = await executeQuery(
    `
      SELECT s.uuid, s.name, s.start_time, s.end_time, s.working_days_json,
        es.effective_from, es.effective_to
      FROM EmployeeShifts es
      INNER JOIN ShiftDefinitions s ON s.uuid = es.shift_uuid
      WHERE es.employee_uuid = ?
        AND es.effective_from <= CURRENT_DATE()
        AND (es.effective_to IS NULL OR es.effective_to >= CURRENT_DATE())
      ORDER BY es.effective_from DESC
      LIMIT 1
    `,
    [String(employeeUuid || "").trim()],
  );
  if (!rows.length) {
    return null;
  }

  const record = rows[0];
  if (
    record.working_days_json &&
    typeof record.working_days_json === "string"
  ) {
    try {
      record.working_days_json = JSON.parse(record.working_days_json);
    } catch {
      record.working_days_json = [];
    }
  }

  return record;
}

module.exports = {
  listEmployees,
  createEmployee,
  getEmployee,
  getEmployeeByUuid,
  updateEmployee,
  updateEmployeeStatus,
  saveDraft,
  getDraft,
  listEmployeeDocuments,
  addEmployeeDocuments,
  removeEmployeeDocument,
  uploadEmployeePhoto,
  getEmployeeShift,
};
