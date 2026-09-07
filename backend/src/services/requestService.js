const { db } = require("../config/db");
const { v4: uuidv4 } = require("uuid");
const DateCalculationService = require("./dateCalculationService");
const {
  getCurrentEthiopianBudgetYear,
  getBudgetYearForDate,
} = require("./calendarService");
const RequestDocumentStorageService = require("./requestDocumentStorageService");

const SUPPORTED_DECISION_APPROVE = "APPROVE";
const SUPPORTED_DECISION_REJECT = "REJECT";
const REQUEST_STATUS_PENDING_DEPARTMENT = "PENDING_DEPARTMENT";
const REQUEST_STATUS_PENDING_HR = "PENDING_HR";
const REQUEST_STATUS_APPROVED = "APPROVED";
const REQUEST_STATUS_REJECTED_DEPARTMENT = "REJECTED_DEPARTMENT";
const REQUEST_STATUS_REJECTED_HR = "REJECTED_HR";
const REQUEST_DAY_PATTERN_FULL = "FULL_DAY";
const REQUEST_DAY_PATTERN_HALF = "HALF_DAY";
const REQUEST_DAY_PATTERN_MIXED = "MIXED";
const PENDING_REQUEST_STATUSES = [
  REQUEST_STATUS_PENDING_DEPARTMENT,
  REQUEST_STATUS_PENDING_HR,
];
const PENDING_STATUS_SQL = PENDING_REQUEST_STATUSES.map(
  (status) => `'${status}'`,
).join(", ");

let optionalColumnsEnsurePromise = null;
const DECIMAL_DAY_DATA_TYPES = new Set([
  "decimal",
  "numeric",
  "float",
  "double",
  "real",
]);

const sanitizeFileName = (name) => {
  const baseName = String(name || "document")
    .trim()
    .replace(/\\/g, "/")
    .split("/")
    .pop();

  return (baseName || "document").replace(/[^a-zA-Z0-9._-]/g, "_");
};

const buildDocumentObjectKey = ({
  employee_uuid,
  leaveRequestUuid,
  documentUuid,
  originalName,
}) =>
  `${employee_uuid}/${leaveRequestUuid}/${documentUuid}-${sanitizeFileName(originalName)}`;

const ensureLeaveRequestOptionalColumns = async () => {
  if (optionalColumnsEnsurePromise) {
    return optionalColumnsEnsurePromise;
  }

  optionalColumnsEnsurePromise = (async () => {
    const [rows] = await db.promise().execute(
      `
      SELECT COLUMN_NAME AS columnName
      FROM information_schema.columns
      WHERE table_schema = DATABASE()
        AND table_name = 'leaveRequests'
        AND COLUMN_NAME IN ('rejectionReason', 'supportingDocument', 'dayPattern', 'dailyPlanJson')
      `,
    );

    const existing = new Set(rows.map((row) => row.columnName));

    if (!existing.has("rejectionReason")) {
      await db
        .promise()
        .execute(
          "ALTER TABLE leaveRequests ADD COLUMN rejectionReason TEXT NULL",
        );
    }

    if (!existing.has("supportingDocument")) {
      await db
        .promise()
        .execute(
          "ALTER TABLE leaveRequests ADD COLUMN supportingDocument VARCHAR(255) NULL",
        );
    }

    if (!existing.has("dayPattern")) {
      await db
        .promise()
        .execute(
          "ALTER TABLE leaveRequests ADD COLUMN dayPattern VARCHAR(20) NULL",
        );
    }

    if (!existing.has("dailyPlanJson")) {
      await db
        .promise()
        .execute(
          "ALTER TABLE leaveRequests ADD COLUMN dailyPlanJson TEXT NULL",
        );
    }

    await db.promise().execute(`
      CREATE TABLE IF NOT EXISTS leaveRequestDocuments (
        uuid VARCHAR(50) PRIMARY KEY,
        leaveRequestUuid VARCHAR(50) NOT NULL,
        employee_uuid VARCHAR(50) NOT NULL,
        originalName VARCHAR(255) NOT NULL,
        objectKey VARCHAR(512) NOT NULL,
        mimeType VARCHAR(120) NOT NULL,
        sizeBytes BIGINT NOT NULL,
        createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_leave_docs_request (leaveRequestUuid),
        INDEX idx_leave_docs_employee (employee_uuid),
        CONSTRAINT fk_leave_docs_request
          FOREIGN KEY (leaveRequestUuid) REFERENCES leaveRequests (uuid),
        CONSTRAINT fk_leave_docs_employee
          FOREIGN KEY (employee_uuid) REFERENCES Employees (uuid)
      )
    `);

    const [dayColumnRows] = await db.promise().execute(
      `
      SELECT table_name AS tableName, column_name AS columnName, data_type AS dataType
      FROM information_schema.columns
      WHERE table_schema = DATABASE()
        AND (
          (table_name = 'leaveRequests' AND column_name IN ('total_days'))
          OR
          (table_name = 'employeeLeaveBalances' AND column_name IN ('entitledDays', 'carriedForwardDays', 'usedDays', 'remainingDays'))
          OR
          (table_name = 'leavePostponements' AND column_name IN ('postponedDays'))
        )
      `,
    );

    const dayColumnDefinitions = [
      {
        tableName: "leaverequests",
        columnName: "total_days",
        definition: "DECIMAL(8,1)",
      },
      {
        tableName: "employeeleavebalances",
        columnName: "entitleddays",
        definition: "DECIMAL(8,1)",
      },
      {
        tableName: "employeeleavebalances",
        columnName: "carriedforwarddays",
        definition: "DECIMAL(8,1)",
      },
      {
        tableName: "employeeleavebalances",
        columnName: "useddays",
        definition: "DECIMAL(8,1)",
      },
      {
        tableName: "employeeleavebalances",
        columnName: "remainingdays",
        definition: "DECIMAL(8,1)",
      },
      {
        tableName: "leavepostponements",
        columnName: "postponeddays",
        definition: "DECIMAL(8,1)",
      },
    ];

    for (const column of dayColumnDefinitions) {
      const existing = dayColumnRows.find(
        (row) =>
          String(row.tableName || "").toLowerCase() === column.tableName &&
          String(row.columnName || "").toLowerCase() === column.columnName,
      );

      if (!existing) {
        continue;
      }

      if (
        DECIMAL_DAY_DATA_TYPES.has(
          String(existing.dataType || "").toLowerCase(),
        )
      ) {
        continue;
      }

      await db
        .promise()
        .execute(
          `ALTER TABLE ${existing.tableName} MODIFY COLUMN ${existing.columnName} ${column.definition}`,
        );
    }
  })();

  return optionalColumnsEnsurePromise;
};

class RequestServiceError extends Error {
  constructor(message, statusCode) {
    super(message);
    this.name = "RequestServiceError";
    this.statusCode = statusCode;
  }
}

class RequestService {
  static async createLeaveRequest(requestData) {
    try {
      await ensureLeaveRequestOptionalColumns();

      const {
        employee_uuid,
        leaveType,
        startDate,
        endDate,
        total_days,
        reason,
        supportingDocument,
        dayPattern,
        dailyPlan,
        attachments,
        initialStatus,
        departmentHeadId,
        isDeptHeadRequest,
      } = requestData;
      const serializedDailyPlan = Array.isArray(dailyPlan)
        ? JSON.stringify(dailyPlan)
        : null;

      const requestUuid = uuidv4();
      const normalizedAttachments = Array.isArray(attachments)
        ? attachments.filter(
            (item) => item && item.originalName && Buffer.isBuffer(item.buffer),
          )
        : [];
      const uploadedObjectKeys = [];

      const connection = await db.promise().getConnection();

      try {
        await connection.beginTransaction();

        // Determine the status and approver IDs based on special flows
        let status = initialStatus || 'PENDING_DEPARTMENT';
        let deptHeadId = departmentHeadId || null;
        const hrSupervisorId = null; // Will be set during approval process
        
        // If status is PENDING_DEPARTMENT and no dept head assigned, find the employee's dept head
        if (status === 'PENDING_DEPARTMENT' && !deptHeadId) {
          const [empDeptRows] = await connection.execute(
            `SELECT e.department_uuid 
             FROM Employees e 
             WHERE e.uuid = ?`,
            [employee_uuid]
          );
          
          if (empDeptRows.length > 0 && empDeptRows[0].department_uuid) {
            const deptUuid = empDeptRows[0].department_uuid;
            
            // Find the department head for this department
            const [deptHeadRows] = await connection.execute(
              `SELECT u.uuid 
               FROM Users u
               JOIN Employees e ON e.uuid = u.employee_uuid
               WHERE e.department_uuid = ? AND u.role = 'DEPARTMENT_HEAD'
               LIMIT 1`,
              [deptUuid]
            );
            
            if (deptHeadRows.length > 0) {
              deptHeadId = deptHeadRows[0].uuid;
            }
          }
        }
        
        const requestInsertQuery = `
          INSERT INTO leaveRequests (
            uuid, employee_uuid, leaveType, startDate, endDate,
            total_days, reason, status, department_head_id, hr_supervisor_id,
            supportingDocument, dayPattern, dailyPlanJson
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `;

        const [requestResult] = await connection.execute(requestInsertQuery, [
          requestUuid,
          employee_uuid,
          leaveType,
          startDate,
          endDate,
          total_days,
          reason,
          status,
          deptHeadId,
          hrSupervisorId,
          supportingDocument || null,
          dayPattern || null,
          serializedDailyPlan,
        ]);

        if (requestResult.affectedRows === 0) {
          throw new Error("Failed to create leave request");
        }

        for (const attachment of normalizedAttachments) {
          const documentUuid = uuidv4();
          const objectKey = buildDocumentObjectKey({
            employee_uuid,
            leaveRequestUuid: requestUuid,
            documentUuid,
            originalName: attachment.originalName,
          });

          await RequestDocumentStorageService.uploadDocument({
            objectKey,
            buffer: attachment.buffer,
            mimeType: attachment.mimeType,
          });

          uploadedObjectKeys.push(objectKey);

          await connection.execute(
            `
              INSERT INTO leaveRequestDocuments (
                uuid, leaveRequestUuid, employee_uuid, originalName,
                objectKey, mimeType, sizeBytes
              ) VALUES (?, ?, ?, ?, ?, ?, ?)
            `,
            [
              documentUuid,
              requestUuid,
              employee_uuid,
              attachment.originalName,
              objectKey,
              attachment.mimeType || "application/octet-stream",
              Number(attachment.sizeBytes) || 0,
            ],
          );
        }

        await connection.commit();
      } catch (transactionError) {
        await connection.rollback();

        if (uploadedObjectKeys.length > 0) {
          await Promise.allSettled(
            uploadedObjectKeys.map((key) =>
              RequestDocumentStorageService.deleteDocument(key),
            ),
          );
        }

        throw transactionError;
      } finally {
        connection.release();
      }

      return await this.getRequestByUuid(requestUuid);
    } catch (error) {
      console.error("Error creating leave request:", error);
      throw new Error(`Failed to create leave request: ${error.message}`);
    }
  }

  static async getRequestByUuid(requestUuid) {
    try {
      await ensureLeaveRequestOptionalColumns();

      const query = `
        SELECT uuid, employee_uuid, leaveType,
               DATE_FORMAT(startDate, '%Y-%m-%d') AS startDate,
               DATE_FORMAT(endDate, '%Y-%m-%d') AS endDate,
               total_days, reason, status, department_head_id, hr_supervisor_id,
           rejectionReason, supportingDocument, dayPattern, dailyPlanJson
        FROM leaveRequests
        WHERE uuid = ?
      `;

      const [rows] = await db.promise().execute(query, [requestUuid]);
      if (rows.length === 0) {
        return null;
      }

      const request = rows[0];
      hydrateRequestDayMetadata(request);
      request.documents = await this.getRequestDocuments(request.uuid);
      return request;
    } catch (error) {
      console.error("Error getting request by UUID:", error);
      throw new Error(`Failed to get request: ${error.message}`);
    }
  }

  static async checkOverlappingRequests(employeeUuid, startDate, endDate) {
    try {
      const query = `
        SELECT uuid, startDate, endDate, status
        FROM leaveRequests
        WHERE employee_uuid = ?
          AND status IN (${PENDING_STATUS_SQL}, '${REQUEST_STATUS_APPROVED}')
          AND (
            (startDate <= ? AND endDate >= ?) OR
            (startDate <= ? AND endDate >= ?) OR
            (startDate >= ? AND endDate <= ?)
          )
      `;

      const [rows] = await db
        .promise()
        .execute(query, [
          employeeUuid,
          startDate,
          startDate,
          endDate,
          endDate,
          startDate,
          endDate,
        ]);

      if (rows.length > 0) {
        return {
          hasOverlap: true,
          overlappingRequests: rows,
          message: "Leave request overlaps with existing request(s)",
        };
      }

      return {
        hasOverlap: false,
        overlappingRequests: [],
        message: "No overlapping requests found",
      };
    } catch (error) {
      console.error("Error checking overlapping requests:", error);
      throw new Error(`Failed to check overlapping requests: ${error.message}`);
    }
  }

  static async getEmployeeRequests(employeeUuid, status = null) {
    try {
      // Defensive guard: validate employeeUuid
      if (!employeeUuid) {
        console.warn('[RequestService] getEmployeeRequests called with null/undefined employeeUuid');
        return []; // Return empty array instead of crashing
      }

      await ensureLeaveRequestOptionalColumns();

      let query = `
        SELECT uuid, leaveType,
               DATE_FORMAT(startDate, '%Y-%m-%d') AS startDate,
               DATE_FORMAT(endDate, '%Y-%m-%d') AS endDate,
               DATE_FORMAT(original_end_date, '%Y-%m-%d') AS original_end_date,
               DATE_FORMAT(actual_return_date, '%Y-%m-%d') AS actual_return_date,
               is_shortened, shortened_at,
               total_days,
               reason, status, department_head_id, hr_supervisor_id,
           rejectionReason, supportingDocument, dayPattern, dailyPlanJson
        FROM leaveRequests
        WHERE employee_uuid = ?
      `;

      const params = [employeeUuid];

      if (status) {
        query += " AND status = ?";
        params.push(status);
      }

      query += " ORDER BY startDate DESC";
      const [rows] = await db.promise().execute(query, params);

      // Defensive guard: ensure rows is an array
      const safeRows = Array.isArray(rows) ? rows : [];

      // Defensive guard: filter out invalid UUIDs
      const requestUuids = safeRows
        .map((row) => row?.uuid)
        .filter((uuid) => uuid && typeof uuid === 'string');

      const documentsByRequest = await getDocumentsByRequestUuids(requestUuids);

      // Defensive guard: wrap row processing in try/catch
      for (const row of safeRows) {
        try {
          if (row) {
            hydrateRequestDayMetadata(row);
            row.documents = documentsByRequest.get(row.uuid) || [];
          }
        } catch (err) {
          console.error('[RequestService] Error processing row:', err);
          // Continue processing other rows
          row.documents = [];
        }
      }

      return safeRows;
    } catch (error) {
      console.error("Error getting employee requests:", error);
      // Return empty array instead of throwing to prevent 500 errors
      return [];
    }
  }

  static async getPendingRequests({ departmentUuid, role } = {}) {
    try {
      await ensureLeaveRequestOptionalColumns();

      // If scoped to a department, join on employee department
      const deptJoin = "JOIN Employees e ON lr.employee_uuid = e.uuid";
      let statusFilter = "";
      const params = [];
      
      // Role-based filtering for status
      if (departmentUuid) {
        // Department Head: Only see PENDING_DEPARTMENT for their department
        statusFilter = "AND lr.status = 'PENDING_DEPARTMENT' AND e.department_uuid = ?";
        params.push(departmentUuid);
      } else {
        // HR roles: Only see PENDING_HR (not PENDING_DEPARTMENT)
        statusFilter = "AND lr.status = 'PENDING_HR'";
      }

      const query = `
        SELECT lr.uuid, lr.employee_uuid, lr.leaveType,
               DATE_FORMAT(lr.startDate, '%Y-%m-%d') AS startDate,
               DATE_FORMAT(lr.endDate, '%Y-%m-%d') AS endDate,
           lr.total_days, lr.reason, lr.status, lr.rejectionReason,
           lr.dayPattern, lr.dailyPlanJson,
               e.first_name, e.middle_name, e.last_name, e.hire_date,
               e.department_uuid
        FROM leaveRequests lr
        ${deptJoin}
        WHERE 1=1
        ${statusFilter}
        ORDER BY lr.startDate ASC
      `;

      const [rows] = await db.promise().execute(query, params);

      // Use getBudgetYearForDate as single source of truth for fiscal year
      for (const row of rows) {
        hydrateRequestDayMetadata(row);
        const budgetYearInfo = await getBudgetYearForDate(row.startDate);
        row.budgetYear = String(budgetYearInfo.year || "");
        row.full_name = [row.first_name, row.middle_name, row.last_name]
          .filter(Boolean)
          .join(" ");
      }

      const requestUuids = rows.map((row) => row.uuid).filter(Boolean);
      const documentsByRequest = await getDocumentsByRequestUuids(requestUuids);

      for (const row of rows) {
        row.documents = documentsByRequest.get(row.uuid) || [];
      }

      return rows;
    } catch (error) {
      console.error("Error getting pending requests:", error);
      throw new Error(`Failed to get pending requests: ${error.message}`);
    }
  }

  static async getAdminRequests({ budgetYear = null } = {}) {
    try {
      await ensureLeaveRequestOptionalColumns();

      const parsedBudgetYear = Number.parseInt(String(budgetYear || ""), 10);
      const hasBudgetYearFilter = Number.isInteger(parsedBudgetYear);

      const query = `
        SELECT lr.uuid, lr.employee_uuid, lr.leaveType,
               DATE_FORMAT(lr.startDate, '%Y-%m-%d') AS startDate,
               DATE_FORMAT(lr.endDate, '%Y-%m-%d') AS endDate,
           lr.total_days, lr.reason, lr.status, lr.rejectionReason,
           lr.dayPattern, lr.dailyPlanJson,
               e.first_name, e.middle_name, e.last_name, e.hire_date
        FROM leaveRequests lr
        LEFT JOIN Employees e ON lr.employee_uuid = e.uuid
        ORDER BY lr.startDate DESC, lr.uuid DESC
      `;

      const [rows] = await db.promise().execute(query);

      // Use getBudgetYearForDate as single source of truth
      const enrichedRows = [];
      for (const row of rows) {
        hydrateRequestDayMetadata(row);
        const budgetYearInfo = await getBudgetYearForDate(row.startDate);
        const normalizedBudgetYear = String(budgetYearInfo.year || "");
        row.full_name = [row.first_name, row.middle_name, row.last_name]
          .filter(Boolean)
          .join(" ");

        const enrichedRow = {
          ...row,
          budgetYear: normalizedBudgetYear,
        };

        // Apply budget year filter if specified
        if (!hasBudgetYearFilter || normalizedBudgetYear === String(parsedBudgetYear)) {
          enrichedRows.push(enrichedRow);
        }
      }

      const requestUuids = enrichedRows.map((row) => row.uuid).filter(Boolean);
      const documentsByRequest = await getDocumentsByRequestUuids(requestUuids);

      for (const row of enrichedRows) {
        row.documents = documentsByRequest.get(row.uuid) || [];
      }

      return enrichedRows;
    } catch (error) {
      console.error("Error getting admin requests:", error);
      throw new Error(`Failed to get admin requests: ${error.message}`);
    }
  }

  static async getPendingRequestCount(employeeUuid) {
    try {
      const query = `
        SELECT COUNT(*) AS count
        FROM leaveRequests
        WHERE employee_uuid = ? AND status IN (${PENDING_STATUS_SQL})
      `;

      const [rows] = await db.promise().execute(query, [employeeUuid]);
      return rows[0].count;
    } catch (error) {
      console.error("Error getting pending request count:", error);
      throw new Error(`Failed to get pending request count: ${error.message}`);
    }
  }

  static async getRequestDocuments(requestUuid) {
    await ensureLeaveRequestOptionalColumns();

    const [rows] = await db.promise().execute(
      `
        SELECT uuid, leaveRequestUuid, employee_uuid, originalName,
               objectKey, mimeType, sizeBytes,
               DATE_FORMAT(createdAt, '%Y-%m-%d %H:%i:%s') AS createdAt
        FROM leaveRequestDocuments
        WHERE leaveRequestUuid = ?
        ORDER BY createdAt DESC
      `,
      [requestUuid],
    );

    return rows;
  }

  static async getRequestDocumentForRequest({ requestUuid, documentUuid }) {
    await ensureLeaveRequestOptionalColumns();

    const normalizedRequestUuid = parseString(requestUuid);
    const normalizedDocumentUuid = parseString(documentUuid);

    if (!normalizedRequestUuid || !normalizedDocumentUuid) {
      throw new RequestServiceError(
        "Both request uuid and document uuid are required.",
        400,
      );
    }

    const [rows] = await db.promise().execute(
      `
        SELECT uuid, leaveRequestUuid, employee_uuid, originalName,
               objectKey, mimeType, sizeBytes,
               DATE_FORMAT(createdAt, '%Y-%m-%d %H:%i:%s') AS createdAt
        FROM leaveRequestDocuments
        WHERE leaveRequestUuid = ? AND uuid = ?
        LIMIT 1
      `,
      [normalizedRequestUuid, normalizedDocumentUuid],
    );

    return rows[0] || null;
  }

  static async addRequestDocuments({ requestUuid, documents }) {
    await ensureLeaveRequestOptionalColumns();

    const normalizedRequestUuid = parseString(requestUuid);
    if (!normalizedRequestUuid) {
      throw new RequestServiceError("Request uuid is required.", 400);
    }

    const normalizedDocuments = Array.isArray(documents)
      ? documents.filter(
          (item) => item && item.originalName && Buffer.isBuffer(item.buffer),
        )
      : [];

    if (normalizedDocuments.length === 0) {
      throw new RequestServiceError("At least one document is required.", 400);
    }

    const connection = await db.promise().getConnection();
    const uploadedObjectKeys = [];

    try {
      await connection.beginTransaction();

      const request = await getRequestForUpdate(
        connection,
        normalizedRequestUuid,
      );
      if (!request) {
        throw new RequestServiceError("Leave request not found.", 404);
      }

      if (!isPendingRequestStatus(request.status)) {
        throw new RequestServiceError(
          `Documents can only be modified while request is pending. Current status: ${request.status}`,
          409,
        );
      }

      for (const document of normalizedDocuments) {
        const documentUuid = uuidv4();
        const objectKey = buildDocumentObjectKey({
          employee_uuid: request.employee_uuid,
          leaveRequestUuid: normalizedRequestUuid,
          documentUuid,
          originalName: document.originalName,
        });

        await RequestDocumentStorageService.uploadDocument({
          objectKey,
          buffer: document.buffer,
          mimeType: document.mimeType,
        });

        uploadedObjectKeys.push(objectKey);

        await connection.execute(
          `
            INSERT INTO leaveRequestDocuments (
              uuid, leaveRequestUuid, employee_uuid, originalName,
              objectKey, mimeType, sizeBytes
            ) VALUES (?, ?, ?, ?, ?, ?, ?)
          `,
          [
            documentUuid,
            normalizedRequestUuid,
            request.employee_uuid,
            document.originalName,
            objectKey,
            document.mimeType || "application/octet-stream",
            Number(document.sizeBytes) || 0,
          ],
        );
      }

      await connection.commit();
      return this.getRequestDocuments(normalizedRequestUuid);
    } catch (error) {
      await connection.rollback();

      if (uploadedObjectKeys.length > 0) {
        await Promise.allSettled(
          uploadedObjectKeys.map((key) =>
            RequestDocumentStorageService.deleteDocument(key),
          ),
        );
      }

      if (error instanceof RequestServiceError) {
        throw error;
      }

      throw new RequestServiceError(
        `Failed to add request documents: ${error.message}`,
        500,
      );
    } finally {
      connection.release();
    }
  }

  static async replaceRequestDocument({ requestUuid, documentUuid, document }) {
    await ensureLeaveRequestOptionalColumns();

    const normalizedRequestUuid = parseString(requestUuid);
    const normalizedDocumentUuid = parseString(documentUuid);

    if (!normalizedRequestUuid || !normalizedDocumentUuid) {
      throw new RequestServiceError(
        "Both request uuid and document uuid are required.",
        400,
      );
    }

    if (
      !document ||
      !document.originalName ||
      !Buffer.isBuffer(document.buffer)
    ) {
      throw new RequestServiceError(
        "A valid replacement document is required.",
        400,
      );
    }

    const connection = await db.promise().getConnection();
    let uploadedObjectKey = "";
    let oldObjectKey = "";

    try {
      await connection.beginTransaction();

      const request = await getRequestForUpdate(
        connection,
        normalizedRequestUuid,
      );
      if (!request) {
        throw new RequestServiceError("Leave request not found.", 404);
      }

      if (!isPendingRequestStatus(request.status)) {
        throw new RequestServiceError(
          `Documents can only be modified while request is pending. Current status: ${request.status}`,
          409,
        );
      }

      const [existingRows] = await connection.execute(
        `
          SELECT uuid, objectKey
          FROM leaveRequestDocuments
          WHERE uuid = ? AND leaveRequestUuid = ?
          FOR UPDATE
        `,
        [normalizedDocumentUuid, normalizedRequestUuid],
      );

      const existing = existingRows[0] || null;
      if (!existing) {
        throw new RequestServiceError(
          "Document not found for this request.",
          404,
        );
      }

      oldObjectKey = parseString(existing.objectKey);
      uploadedObjectKey = buildDocumentObjectKey({
        employee_uuid: request.employee_uuid,
        leaveRequestUuid: normalizedRequestUuid,
        documentUuid: normalizedDocumentUuid,
        originalName: document.originalName,
      });

      await RequestDocumentStorageService.uploadDocument({
        objectKey: uploadedObjectKey,
        buffer: document.buffer,
        mimeType: document.mimeType,
      });

      await connection.execute(
        `
          UPDATE leaveRequestDocuments
          SET originalName = ?, objectKey = ?, mimeType = ?, sizeBytes = ?
          WHERE uuid = ? AND leaveRequestUuid = ?
        `,
        [
          document.originalName,
          uploadedObjectKey,
          document.mimeType || "application/octet-stream",
          Number(document.sizeBytes) || 0,
          normalizedDocumentUuid,
          normalizedRequestUuid,
        ],
      );

      await connection.commit();

      if (oldObjectKey && oldObjectKey !== uploadedObjectKey) {
        await RequestDocumentStorageService.deleteDocument(oldObjectKey);
      }

      return this.getRequestDocuments(normalizedRequestUuid);
    } catch (error) {
      await connection.rollback();

      if (uploadedObjectKey) {
        await RequestDocumentStorageService.deleteDocument(uploadedObjectKey);
      }

      if (error instanceof RequestServiceError) {
        throw error;
      }

      throw new RequestServiceError(
        `Failed to replace request document: ${error.message}`,
        500,
      );
    } finally {
      connection.release();
    }
  }

  static async deleteRequestDocument({ requestUuid, documentUuid }) {
    await ensureLeaveRequestOptionalColumns();

    const normalizedRequestUuid = parseString(requestUuid);
    const normalizedDocumentUuid = parseString(documentUuid);

    if (!normalizedRequestUuid || !normalizedDocumentUuid) {
      throw new RequestServiceError(
        "Both request uuid and document uuid are required.",
        400,
      );
    }

    const connection = await db.promise().getConnection();
    let objectKeyToDelete = "";

    try {
      await connection.beginTransaction();

      const request = await getRequestForUpdate(
        connection,
        normalizedRequestUuid,
      );
      if (!request) {
        throw new RequestServiceError("Leave request not found.", 404);
      }

      if (!isPendingRequestStatus(request.status)) {
        throw new RequestServiceError(
          `Documents can only be modified while request is pending. Current status: ${request.status}`,
          409,
        );
      }

      const [existingRows] = await connection.execute(
        `
          SELECT uuid, objectKey
          FROM leaveRequestDocuments
          WHERE uuid = ? AND leaveRequestUuid = ?
          FOR UPDATE
        `,
        [normalizedDocumentUuid, normalizedRequestUuid],
      );

      const existing = existingRows[0] || null;
      if (!existing) {
        throw new RequestServiceError(
          "Document not found for this request.",
          404,
        );
      }

      objectKeyToDelete = parseString(existing.objectKey);

      await connection.execute(
        `
          DELETE FROM leaveRequestDocuments
          WHERE uuid = ? AND leaveRequestUuid = ?
        `,
        [normalizedDocumentUuid, normalizedRequestUuid],
      );

      await connection.commit();

      if (objectKeyToDelete) {
        await RequestDocumentStorageService.deleteDocument(objectKeyToDelete);
      }

      return this.getRequestDocuments(normalizedRequestUuid);
    } catch (error) {
      await connection.rollback();

      if (error instanceof RequestServiceError) {
        throw error;
      }

      throw new RequestServiceError(
        `Failed to delete request document: ${error.message}`,
        500,
      );
    } finally {
      connection.release();
    }
  }

  static async updatePendingRequest(requestUuid, fields) {
    await ensureLeaveRequestOptionalColumns();

    const normalizedUuid = parseString(requestUuid);
    if (!normalizedUuid) {
      throw new RequestServiceError("Request uuid is required.", 400);
    }

    const leaveType = parseString(fields?.leaveType);
    const nextStartDate = parseString(fields?.startDate);
    const nextDays =
      fields?.numberOfDays === undefined || fields?.numberOfDays === null
        ? null
        : parsePositiveHalfStep(fields?.numberOfDays);
    const incomingDailyPlanRaw = Array.isArray(fields?.dailyPlan)
      ? fields.dailyPlan
      : null;
    const incomingDailyPlan = Array.isArray(incomingDailyPlanRaw)
      ? incomingDailyPlanRaw
          .map((item) => ({
            date: parseString(item?.date),
            portion: parseString(item?.portion).toUpperCase(),
          }))
          .filter(
            (item) =>
              item.date && (item.portion === "FULL" || item.portion === "HALF"),
          )
      : [];
    const hasDailyPlanUpdate = Array.isArray(incomingDailyPlanRaw);

    if (
      !leaveType &&
      !nextStartDate &&
      nextDays === null &&
      !hasDailyPlanUpdate
    ) {
      throw new RequestServiceError(
        "At least one editable field (leaveType, startDate, numberOfDays, or dailyPlan) is required.",
        400,
      );
    }

    if (hasDailyPlanUpdate && incomingDailyPlan.length === 0) {
      throw new RequestServiceError(
        "dailyPlan must include at least one valid day item.",
        400,
      );
    }

    if (
      hasDailyPlanUpdate &&
      incomingDailyPlan.length !== incomingDailyPlanRaw.length
    ) {
      throw new RequestServiceError(
        "dailyPlan has invalid entries. Use date + portion(FULL/HALF).",
        400,
      );
    }

    if (
      fields?.numberOfDays !== undefined &&
      fields?.numberOfDays !== null &&
      !nextDays
    ) {
      throw new RequestServiceError(
        "numberOfDays must be a positive number in 0.5 increments.",
        400,
      );
    }

    if (nextStartDate && !/^\d{4}-\d{2}-\d{2}$/.test(nextStartDate)) {
      throw new RequestServiceError(
        "startDate must use YYYY-MM-DD format.",
        400,
      );
    }

    const connection = await db.promise().getConnection();

    try {
      await connection.beginTransaction();

      const [requestRows] = await connection.execute(
        `
          SELECT uuid, employee_uuid,
                 DATE_FORMAT(startDate, '%Y-%m-%d') AS startDate,
                 DATE_FORMAT(endDate, '%Y-%m-%d') AS endDate,
                 total_days, status, leaveType, dailyPlanJson
          FROM leaveRequests
          WHERE uuid = ?
          FOR UPDATE
        `,
        [normalizedUuid],
      );

      const request = requestRows[0] || null;
      if (!request) {
        throw new RequestServiceError("Leave request not found.", 404);
      }

      if (!isPendingRequestStatus(request.status)) {
        throw new RequestServiceError(
          `Only pending requests can be edited. Current status: ${request.status}`,
          409,
        );
      }

      const resolvedStartDate = nextStartDate || parseString(request.startDate);
      const currentDays = parsePositiveHalfStep(request.total_days);
      const resolvedDays = nextDays ?? currentDays;

      if (!resolvedStartDate) {
        throw new RequestServiceError(
          "Current request start date is invalid.",
          409,
        );
      }

      if (!resolvedDays) {
        throw new RequestServiceError(
          "Current request number of days is invalid.",
          409,
        );
      }

      let resolvedEndDate = "";
      let resolvedWorkingDays = null;
      let updatedDailyPlan = [];

      if (hasDailyPlanUpdate) {
        const expectedWorkingDates =
          await DateCalculationService.listWorkingDates(
            resolvedStartDate,
            incomingDailyPlan.length,
          );

        const hasExactSequence =
          expectedWorkingDates.length === incomingDailyPlan.length &&
          expectedWorkingDates.every(
            (date, index) => date === incomingDailyPlan[index].date,
          );

        if (!hasExactSequence) {
          throw new RequestServiceError(
            "dailyPlan contains invalid dates. Use holiday-adjusted working dates in sequence.",
            400,
          );
        }

        resolvedEndDate =
          parseString(incomingDailyPlan[incomingDailyPlan.length - 1]?.date) ||
          "";
        resolvedWorkingDays = incomingDailyPlan.reduce(
          (sum, item) => sum + (item.portion === "HALF" ? 0.5 : 1),
          0,
        );
        updatedDailyPlan = incomingDailyPlan;
      } else {
        const recalculated = await DateCalculationService.calculateEndDate(
          resolvedStartDate,
          resolvedDays,
        );
        resolvedEndDate = parseString(recalculated.endDate);
        resolvedWorkingDays = parsePositiveHalfStep(
          recalculated.actualWorkingDays,
        );

        if (!resolvedEndDate || !resolvedWorkingDays) {
          throw new RequestServiceError(
            "Failed to recalculate request date range.",
            500,
          );
        }

        updatedDailyPlan = await buildApprovedDailyPlan({
          startDate: resolvedStartDate,
          approvedDays: resolvedWorkingDays,
          existingDailyPlan: parseDailyPlanJson(request.dailyPlanJson),
        });
      }

      if (!resolvedEndDate || !resolvedWorkingDays) {
        throw new RequestServiceError(
          "Failed to recalculate request date range.",
          500,
        );
      }

      const overlapStatuses = [
        ...PENDING_REQUEST_STATUSES,
        REQUEST_STATUS_APPROVED,
      ];
      const placeholders = overlapStatuses.map(() => "?").join(", ");
      const [overlapRows] = await connection.execute(
        `
          SELECT uuid
          FROM leaveRequests
          WHERE employee_uuid = ?
            AND uuid <> ?
            AND status IN (${placeholders})
            AND (
              (startDate <= ? AND endDate >= ?) OR
              (startDate <= ? AND endDate >= ?) OR
              (startDate >= ? AND endDate <= ?)
            )
          LIMIT 1
        `,
        [
          request.employee_uuid,
          normalizedUuid,
          ...overlapStatuses,
          resolvedStartDate,
          resolvedStartDate,
          resolvedEndDate,
          resolvedEndDate,
          resolvedStartDate,
          resolvedEndDate,
        ],
      );

      if (overlapRows.length > 0) {
        throw new RequestServiceError(
          "Updated request overlaps with another pending or approved request.",
          409,
        );
      }

      const updatedDayPattern =
        deriveDayPatternFromDailyPlan(updatedDailyPlan) ||
        deriveDayPatternFromTotalDays(resolvedWorkingDays);

      const [updateResult] = await connection.execute(
        `
          UPDATE leaveRequests
          SET leaveType = ?, startDate = ?, endDate = ?, total_days = ?,
              dayPattern = ?, dailyPlanJson = ?
          WHERE uuid = ?
        `,
        [
          leaveType || request.leaveType,
          resolvedStartDate,
          resolvedEndDate,
          resolvedWorkingDays,
          updatedDayPattern,
          JSON.stringify(updatedDailyPlan),
          normalizedUuid,
        ],
      );

      if (updateResult.affectedRows !== 1) {
        throw new RequestServiceError("Failed to update pending request.", 500);
      }

      await connection.commit();
    } catch (error) {
      await connection.rollback();

      if (error instanceof RequestServiceError) {
        throw error;
      }

      throw new RequestServiceError(
        `Failed to update pending request: ${error.message}`,
        500,
      );
    } finally {
      connection.release();
    }

    return this.getRequestByUuid(normalizedUuid);
  }

  /**
   * Shorten an approved leave request.
   *
   * Works in two scenarios:
   *  A) Before leave starts  – employee reduces approved duration before startDate
   *  B) After leave starts   – employee returns to work early (up to today's date)
   *
   * In both cases the caller supplies a `newEndDate` (the last day of leave they
   * actually want to take, inclusive).  The remaining days are refunded to the
   * employee's balance.  Status stays APPROVED.
   *
   * NOT allowed after leave has already ended.
   */
  static async shortenApprovedRequest({
    requestUuid,
    employee_uuid,
    newEndDate,
  }) {
    await ensureLeaveRequestOptionalColumns();

    const normalizedUuid        = parseString(requestUuid);
    const normalizedEmployeeUuid = parseString(employee_uuid);
    const normalizedNewEndDate  = parseString(newEndDate);

    if (!normalizedUuid) {
      throw new RequestServiceError("Request uuid is required.", 400);
    }
    if (!normalizedEmployeeUuid) {
      throw new RequestServiceError("employee_uuid is required.", 400);
    }
    if (!normalizedNewEndDate || !/^\d{4}-\d{2}-\d{2}$/.test(normalizedNewEndDate)) {
      throw new RequestServiceError(
        "newEndDate is required and must be in YYYY-MM-DD format.",
        400,
      );
    }

    const connection = await db.promise().getConnection();

    try {
      await connection.beginTransaction();

      const [requestRows] = await connection.execute(
        `SELECT uuid, employee_uuid,
                DATE_FORMAT(startDate, '%Y-%m-%d') AS startDate,
                DATE_FORMAT(endDate,   '%Y-%m-%d') AS endDate,
                total_days, status, is_shortened
         FROM leaveRequests
         WHERE uuid = ?
         FOR UPDATE`,
        [normalizedUuid],
      );

      const request = requestRows[0] || null;
      if (!request) {
        throw new RequestServiceError("Leave request not found.", 404);
      }

      if (request.employee_uuid !== normalizedEmployeeUuid) {
        throw new RequestServiceError(
          "You are not allowed to modify this leave request.",
          403,
        );
      }

      if (request.status !== REQUEST_STATUS_APPROVED) {
        throw new RequestServiceError(
          `Only approved requests can be shortened. Current status: ${request.status}`,
          409,
        );
      }

      const todayUtc = new Date().toISOString().slice(0, 10);

      // Not allowed after leave has already ended
      if (todayUtc > request.endDate) {
        throw new RequestServiceError(
          "This leave has already ended and can no longer be shortened.",
          409,
        );
      }

      // newEndDate must be on or after startDate
      if (normalizedNewEndDate < request.startDate) {
        throw new RequestServiceError(
          "New end date cannot be before the leave start date.",
          400,
        );
      }

      // newEndDate must be strictly before the current endDate to actually shorten
      if (normalizedNewEndDate >= request.endDate) {
        throw new RequestServiceError(
          "New end date must be earlier than the current approved end date.",
          400,
        );
      }

      // Scenario B (leave already started): newEndDate cannot be in the future
      const leaveHasStarted = todayUtc >= request.startDate;
      if (leaveHasStarted && normalizedNewEndDate > todayUtc) {
        throw new RequestServiceError(
          "When leave has already started, the new end date cannot be in the future.",
          400,
        );
      }

      const currentDays = parsePositiveHalfStep(request.total_days);
      if (!currentDays) {
        throw new RequestServiceError("Current approved days are invalid.", 409);
      }

      // Count working days from startDate → newEndDate (inclusive)
      const newTotalDaysRaw = await DateCalculationService.countWorkingDaysInRangeInclusive(
        request.startDate,
        normalizedNewEndDate,
      );

      // Clamp to positive half-step number
      const adjustedDays = parsePositiveHalfStep(newTotalDaysRaw) ?? newTotalDaysRaw;

      if (!adjustedDays || adjustedDays <= 0) {
        throw new RequestServiceError(
          "The new end date results in zero working days. Choose a later date.",
          400,
        );
      }

      if (adjustedDays >= currentDays) {
        throw new RequestServiceError(
          "The new end date does not result in fewer approved days than currently recorded.",
          400,
        );
      }

      const refundedDays = currentDays - adjustedDays;

      const balance = await getLatestActiveBalanceForUpdate(
        connection,
        request.employee_uuid,
      );

      if (!balance) {
        throw new RequestServiceError(
          "Leave balance not found for this employee.",
          404,
        );
      }

      const currentRemainingDays = parseFiniteNumber(balance.remainingDays) ?? 0;
      const currentUsedDays      = parseFiniteNumber(balance.usedDays) ?? 0;
      const updatedRemainingDays = currentRemainingDays + refundedDays;
      const updatedUsedDays      = Math.max(0, currentUsedDays - refundedDays);

      const shortenedAt = new Date().toISOString().slice(0, 19).replace("T", " ");

      // actual_return_date = day after newEndDate (the first day back at work)
      const returnToWorkDate = (() => {
        const d = new Date(`${normalizedNewEndDate}T00:00:00Z`);
        d.setUTCDate(d.getUTCDate() + 1);
        return d.toISOString().slice(0, 10);
      })();

      await connection.execute(
        `UPDATE leaveRequests
         SET endDate            = ?,
             total_days         = ?,
             is_shortened       = 1,
             shortened_at       = ?,
             shortened_by       = ?,
             actual_return_date = ?,
             original_end_date  = COALESCE(original_end_date, ?)
         WHERE uuid = ?`,
        [
          normalizedNewEndDate,
          adjustedDays,
          shortenedAt,
          normalizedEmployeeUuid,
          returnToWorkDate,
          request.endDate,   // only stored on first shorten
          normalizedUuid,
        ],
      );

      await connection.execute(
        `UPDATE employeeLeaveBalances
         SET remainingDays = ?, usedDays = ?
         WHERE uuid = ?`,
        [updatedRemainingDays, updatedUsedDays, balance.uuid],
      );

      await connection.commit();

      // If leave has already started, reverse attendance records for the
      // days that are being removed (from day after newEndDate to original endDate).
      if (leaveHasStarted) {
        try {
          const { unmarkAttendanceLeave } = require("./attendanceService");
          if (typeof unmarkAttendanceLeave === "function") {
            await unmarkAttendanceLeave({
              employee_uuid: request.employee_uuid,
              leaveRequestUuid: normalizedUuid,
              fromDate: returnToWorkDate,
              toDate: request.endDate,
            });
          }
        } catch (attendanceError) {
          console.error("Failed to reverse attendance leave records after shorten:", attendanceError);
        }
      }

      return {
        requestUuid:          normalizedUuid,
        employee_uuid:        request.employee_uuid,
        startDate:            request.startDate,
        originalEndDate:      request.endDate,
        newEndDate:           normalizedNewEndDate,
        returnToWorkDate,
        previousApprovedDays: currentDays,
        updatedApprovedDays:  adjustedDays,
        refundedDays,
        shortenedAt,
        leaveHasStarted,
        balance: {
          remainingDays: updatedRemainingDays,
          usedDays:      updatedUsedDays,
        },
      };
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  }

  /**
   * Cancel a leave request.
   * Rules:
   *  - Only the employee who owns the request may cancel it.
   *  - The request must be in a cancellable status: PENDING_DEPARTMENT, PENDING_HR, or APPROVED.
   *  - Cancellation is only allowed if today's date is strictly BEFORE the leave start date.
   *  - If the request was APPROVED its balance deduction is reversed.
   */
  static async cancelLeaveRequest({ requestUuid, cancelledByUuid }) {
    await ensureLeaveRequestOptionalColumns();

    const normalizedUuid = parseString(requestUuid);
    const normalizedCancelledBy = parseString(cancelledByUuid);

    if (!normalizedUuid) {
      throw new RequestServiceError("Request uuid is required.", 400);
    }
    if (!normalizedCancelledBy) {
      throw new RequestServiceError("cancelledByUuid is required.", 400);
    }

    const connection = await db.promise().getConnection();

    try {
      await connection.beginTransaction();

      const [requestRows] = await connection.execute(
        `SELECT lr.uuid, lr.employee_uuid,
                DATE_FORMAT(lr.startDate, '%Y-%m-%d') AS startDate,
                lr.status, lr.total_days
         FROM leaveRequests lr
         WHERE lr.uuid = ?
         FOR UPDATE`,
        [normalizedUuid],
      );

      const request = requestRows[0] || null;
      if (!request) {
        throw new RequestServiceError("Leave request not found.", 404);
      }

      // Only the employee who owns the request can cancel it
      if (request.employee_uuid !== normalizedCancelledBy) {
        throw new RequestServiceError(
          "You can only cancel your own leave requests.",
          403,
        );
      }

      const CANCELLABLE_STATUSES = [
        "PENDING_DEPARTMENT",
        "PENDING_HR",
        "APPROVED",
        "PENDING", // legacy
      ];

      if (!CANCELLABLE_STATUSES.includes(request.status)) {
        throw new RequestServiceError(
          `Leave requests with status "${request.status}" cannot be cancelled.`,
          409,
        );
      }

      // Cancellation is only allowed before the leave start date
      const todayUtc = new Date().toISOString().slice(0, 10);
      if (todayUtc >= request.startDate) {
        throw new RequestServiceError(
          "This leave request can no longer be cancelled because the leave period has already started.",
          409,
        );
      }

      const wasApproved = request.status === "APPROVED";
      const previousStatus = request.status;
      const cancelledAt = new Date().toISOString().slice(0, 19).replace("T", " ");

      // Update the request to CANCELLED
      await connection.execute(
        `UPDATE leaveRequests
         SET status = 'CANCELLED', cancelled_at = ?, cancelled_by = ?
         WHERE uuid = ?`,
        [cancelledAt, normalizedCancelledBy, normalizedUuid],
      );

      let refundedDays = 0;

      // If the request was APPROVED, refund the leave balance
      if (wasApproved) {
        const approvedDays = parsePositiveHalfStep(request.total_days);
        if (approvedDays) {
          const balance = await getLatestActiveBalanceForUpdate(
            connection,
            request.employee_uuid,
          );

          if (balance) {
            const currentRemaining = parseFiniteNumber(balance.remainingDays) ?? 0;
            const currentUsed = parseFiniteNumber(balance.usedDays) ?? 0;
            const updatedRemaining = currentRemaining + approvedDays;
            const updatedUsed = Math.max(0, currentUsed - approvedDays);

            await connection.execute(
              `UPDATE employeeLeaveBalances
               SET remainingDays = ?, usedDays = ?
               WHERE uuid = ?`,
              [updatedRemaining, updatedUsed, balance.uuid],
            );

            refundedDays = approvedDays;
          }
        }

        // Reverse attendance records that were marked as leave
        try {
          const { unmarkAttendanceLeave } = require("./attendanceService");
          if (typeof unmarkAttendanceLeave === "function") {
            await unmarkAttendanceLeave({
              employee_uuid: request.employee_uuid,
              leaveRequestUuid: normalizedUuid,
            });
          }
        } catch (attendanceError) {
          // Non-fatal — log but don't block cancellation
          console.error("Failed to reverse attendance leave records:", attendanceError);
        }
      }

      await connection.commit();

      return {
        requestUuid: normalizedUuid,
        status: "CANCELLED",
        previousStatus,
        cancelledAt,
        cancelledBy: normalizedCancelledBy,
        refundedDays,
      };
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  }
}

const parsePositiveInteger = (value) => {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
};

const parsePositiveHalfStep = (value) => {
  const parsed = Number(value);
  if (
    !Number.isFinite(parsed) ||
    parsed <= 0 ||
    !Number.isInteger(parsed * 2)
  ) {
    return null;
  }

  return parsed;
};

const toIsoDate = (dateValue) => {
  const parsed = new Date(`${dateValue}T00:00:00Z`);
  if (Number.isNaN(parsed.getTime())) {
    return null;
  }
  return parsed.toISOString().slice(0, 10);
};

const calculateUsedLeaveDaysForShorten = async (request) => {
  const startDate = parseString(request.startDate);
  const endDate = parseString(request.endDate);
  const totalDays = parsePositiveHalfStep(request.total_days);

  if (!startDate || !endDate || !totalDays) {
    return 0;
  }

  const todayIso = new Date().toISOString().slice(0, 10);
  if (todayIso < startDate) {
    return 0;
  }

  const effectiveEnd = todayIso > endDate ? endDate : todayIso;
  if (effectiveEnd < startDate) {
    return 0;
  }

  const normalizedEffectiveEnd = toIsoDate(effectiveEnd);
  if (!normalizedEffectiveEnd) {
    return 0;
  }

  const consumed =
    await DateCalculationService.countWorkingDaysInRangeInclusive(
      startDate,
      normalizedEffectiveEnd,
    );

  return Math.min(totalDays, consumed);
};

const normalizeDecision = (value) =>
  typeof value === "string" ? value.trim().toUpperCase() : "";

const parseString = (value) => (typeof value === "string" ? value.trim() : "");

const parseFiniteNumber = (value) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
};

const deriveDayPatternFromDailyPlan = (dailyPlan) => {
  if (!Array.isArray(dailyPlan) || dailyPlan.length === 0) {
    return "";
  }

  const portions = new Set(
    dailyPlan
      .map((item) => parseString(item?.portion).toUpperCase())
      .filter(Boolean),
  );

  if (portions.size === 1 && portions.has("FULL")) {
    return REQUEST_DAY_PATTERN_FULL;
  }

  if (portions.size === 1 && portions.has("HALF")) {
    return REQUEST_DAY_PATTERN_HALF;
  }

  return REQUEST_DAY_PATTERN_MIXED;
};

const deriveDayPatternFromTotalDays = (totalDays) => {
  const parsed = parseFiniteNumber(totalDays);
  if (!parsed || parsed <= 0) {
    return REQUEST_DAY_PATTERN_FULL;
  }

  return Number.isInteger(parsed)
    ? REQUEST_DAY_PATTERN_FULL
    : REQUEST_DAY_PATTERN_HALF;
};

const parseDailyPlanJson = (value) => {
  if (!value) {
    return [];
  }

  try {
    const parsed = typeof value === "string" ? JSON.parse(value) : value;
    if (!Array.isArray(parsed)) {
      return [];
    }

    return parsed
      .map((item) => ({
        date: parseString(item?.date),
        portion: parseString(item?.portion).toUpperCase(),
      }))
      .filter(
        (item) =>
          item.date && (item.portion === "FULL" || item.portion === "HALF"),
      );
  } catch {
    return [];
  }
};

const hydrateRequestDayMetadata = (row) => {
  if (!row || typeof row !== "object") {
    return;
  }

  const dailyPlan = parseDailyPlanJson(row.dailyPlanJson);
  row.dailyPlan = dailyPlan;

  const normalizedPattern = parseString(row.dayPattern).toUpperCase();
  if (
    normalizedPattern === REQUEST_DAY_PATTERN_FULL ||
    normalizedPattern === REQUEST_DAY_PATTERN_HALF ||
    normalizedPattern === REQUEST_DAY_PATTERN_MIXED
  ) {
    row.dayPattern = normalizedPattern;
    return;
  }

  const fromPlan = deriveDayPatternFromDailyPlan(dailyPlan);
  row.dayPattern = fromPlan || deriveDayPatternFromTotalDays(row.total_days);
};

const getDocumentsByRequestUuids = async (requestUuids) => {
  const map = new Map();

  if (!Array.isArray(requestUuids) || requestUuids.length === 0) {
    return map;
  }

  const placeholders = requestUuids.map(() => "?").join(", ");
  const [rows] = await db.promise().execute(
    `
      SELECT uuid, leaveRequestUuid, employee_uuid, originalName,
             objectKey, mimeType, sizeBytes,
             DATE_FORMAT(createdAt, '%Y-%m-%d %H:%i:%s') AS createdAt
      FROM leaveRequestDocuments
      WHERE leaveRequestUuid IN (${placeholders})
      ORDER BY createdAt DESC
    `,
    requestUuids,
  );

  for (const row of rows) {
    const list = map.get(row.leaveRequestUuid) || [];
    list.push(row);
    map.set(row.leaveRequestUuid, list);
  }

  return map;
};

const isPendingRequestStatus = (status) =>
  PENDING_REQUEST_STATUSES.includes(
    String(status || "")
      .trim()
      .toUpperCase(),
  );

const updateRequestStatusForDepartment = async (
  connection,
  requestUuid,
  status,
  departmentHeadId,
  rejectionReason,
) => {
  await connection.execute(
    `
      UPDATE leaveRequests
      SET status = ?, department_head_id = ?, rejectionReason = ?
      WHERE uuid = ?
    `,
    [status, departmentHeadId, rejectionReason || null, requestUuid],
  );
};

const getRequestForUpdate = async (connection, requestUuid) => {
  const [rows] = await connection.execute(
    `
      SELECT uuid, employee_uuid,
             DATE_FORMAT(startDate, '%Y-%m-%d') AS startDate,
             DATE_FORMAT(endDate, '%Y-%m-%d') AS endDate,
             total_days, status, dayPattern, dailyPlanJson
      FROM leaveRequests
      WHERE uuid = ?
      FOR UPDATE
    `,
    [requestUuid],
  );
  return rows[0] || null;
};

const getLatestActiveBalanceForUpdate = async (
  connection,
  employee_uuid,
  budgetYear = null,
) => {
  const hasBudgetYear = parseString(String(budgetYear || "")).length > 0;

  const [rows] = await connection.execute(
    `
      SELECT uuid, remainingDays, usedDays
      FROM employeeLeaveBalances
      WHERE employee_uuid = ?
        AND status = 'ACTIVE'
        ${hasBudgetYear ? "AND budgetYear = ?" : ""}
      ORDER BY CAST(budgetYear AS UNSIGNED) DESC, uuid DESC
      LIMIT 1
      FOR UPDATE
    `,
    hasBudgetYear ? [employee_uuid, budgetYear] : [employee_uuid],
  );
  return rows[0] || null;
};

const validateDepartmentDecisionPayload = ({
  departmentHeadId,
  decision,
  rejectionReason,
  approvedDays,
}) => {
  // departmentHeadId can be a UUID string or a numeric id — just require it to be a non-empty string
  if (!parseString(departmentHeadId)) {
    throw new RequestServiceError(
      "department_head_id is required.",
      400,
    );
  }

  const normalizedDecision = normalizeDecision(decision);
  const normalizedRejectionReason = parseString(rejectionReason);

  if (
    normalizedDecision !== SUPPORTED_DECISION_APPROVE &&
    normalizedDecision !== SUPPORTED_DECISION_REJECT
  ) {
    throw new RequestServiceError(
      "decision must be either APPROVE or REJECT.",
      400,
    );
  }

  if (
    normalizedDecision === SUPPORTED_DECISION_REJECT &&
    normalizedRejectionReason.length === 0
  ) {
    throw new RequestServiceError(
      "rejectionReason is required when decision is REJECT.",
      400,
    );
  }

  if (
    normalizedDecision === SUPPORTED_DECISION_APPROVE &&
    normalizedRejectionReason.length > 0
  ) {
    throw new RequestServiceError(
      "rejectionReason must be empty when decision is APPROVE.",
      400,
    );
  }

  const normalizedApprovedDays =
    approvedDays === undefined || approvedDays === null || approvedDays === ""
      ? null
      : parsePositiveHalfStep(approvedDays);

  if (
    normalizedDecision === SUPPORTED_DECISION_APPROVE &&
    approvedDays !== undefined &&
    approvedDays !== null &&
    approvedDays !== "" &&
    !normalizedApprovedDays
  ) {
    throw new RequestServiceError(
      "approvedDays must be a positive number in 0.5 increments when provided.",
      400,
    );
  }

  if (
    normalizedDecision === SUPPORTED_DECISION_REJECT &&
    normalizedApprovedDays !== null
  ) {
    throw new RequestServiceError(
      "approvedDays is only allowed when decision is APPROVE.",
      400,
    );
  }

  return {
    normalizedDecision,
    normalizedRejectionReason,
    normalizedApprovedDays,
  };
};

const buildApprovedDailyPlan = async ({
  startDate,
  approvedDays,
  existingDailyPlan,
}) => {
  const approvedWorkingDates = await DateCalculationService.listWorkingDates(
    startDate,
    Math.ceil(approvedDays),
  );

  const lastIndex = approvedWorkingDates.length - 1;
  const hasHalfDay = approvedDays % 1 !== 0;
  const existingPortionByDate = new Map(
    (Array.isArray(existingDailyPlan) ? existingDailyPlan : []).map((item) => [
      parseString(item?.date),
      parseString(item?.portion).toUpperCase(),
    ]),
  );

  return approvedWorkingDates.map((date, index) => {
    const existingPortion = existingPortionByDate.get(date);
    const defaultPortion = hasHalfDay && index === lastIndex ? "HALF" : "FULL";

    if (existingPortion === "FULL" || existingPortion === "HALF") {
      if (hasHalfDay && index === lastIndex) {
        return { date, portion: "HALF" };
      }

      if (!hasHalfDay && existingPortion === "HALF" && index === lastIndex) {
        return { date, portion: "FULL" };
      }

      return { date, portion: existingPortion };
    }

    return { date, portion: defaultPortion };
  });
};

const handleDepartmentDecision = async ({
  requestUuid,
  departmentHeadId,
  decision,
  rejectionReason,
  approvedDays,
}) => {
  await ensureLeaveRequestOptionalColumns();

  if (!parseString(requestUuid)) {
    throw new RequestServiceError("Request uuid is required.", 400);
  }

  const {
    normalizedDecision,
    normalizedRejectionReason,
    normalizedApprovedDays,
  } = validateDepartmentDecisionPayload({
    departmentHeadId,
    decision,
    rejectionReason,
    approvedDays,
  });

  const connection = await db.promise().getConnection();

  try {
    await connection.beginTransaction();

    const request = await getRequestForUpdate(connection, requestUuid);
    if (!request) {
      throw new RequestServiceError("Leave request not found.", 404);
    }

    if (!isPendingRequestStatus(request.status)) {
      throw new RequestServiceError(
        `Leave request cannot be processed from status ${request.status}.`,
        409,
      );
    }
    
    // Determine if this is Department or HR approval based on current status
    const isDepartmentApproval = request.status === REQUEST_STATUS_PENDING_DEPARTMENT;
    const isHRApproval = request.status === REQUEST_STATUS_PENDING_HR;

    if (normalizedDecision === SUPPORTED_DECISION_REJECT) {
      const rejectedStatus = isDepartmentApproval 
        ? REQUEST_STATUS_REJECTED_DEPARTMENT 
        : REQUEST_STATUS_REJECTED_HR;
        
      await updateRequestStatusForDepartment(
        connection,
        requestUuid,
        rejectedStatus,
        departmentHeadId,
        normalizedRejectionReason,
      );

      await connection.commit();

      return {
        requestUuid,
        status: rejectedStatus,
        decision: normalizedDecision,
        rejectionReason: normalizedRejectionReason,
        deductedDays: 0,
        balance: null,
      };
    }

    const totalDays = parsePositiveHalfStep(request.total_days);
    if (!totalDays) {
      throw new RequestServiceError(
        "Requested leave days must be greater than zero.",
        409,
      );
    }

    const effectiveApprovedDays = normalizedApprovedDays ?? totalDays;
    if (effectiveApprovedDays > totalDays) {
      throw new RequestServiceError(
        "approvedDays cannot exceed the originally requested days.",
        400,
      );
    }

    const startDateIso = parseString(request.startDate);
    if (!startDateIso) {
      throw new RequestServiceError("Request start date is invalid.", 409);
    }

    const dateCalculation = await DateCalculationService.calculateEndDate(
      startDateIso,
      effectiveApprovedDays,
    );
    const resolvedApprovedDays = parsePositiveHalfStep(
      dateCalculation.actualWorkingDays,
    );
    if (!resolvedApprovedDays) {
      throw new RequestServiceError(
        "Failed to resolve approved leave days.",
        500,
      );
    }

    const approvedDailyPlan = await buildApprovedDailyPlan({
      startDate: startDateIso,
      approvedDays: resolvedApprovedDays,
      existingDailyPlan: parseDailyPlanJson(request.dailyPlanJson),
    });
    const resolvedDayPattern =
      deriveDayPatternFromDailyPlan(approvedDailyPlan) ||
      deriveDayPatternFromTotalDays(resolvedApprovedDays);

    const currentBudgetYear = Number(
      (await getCurrentEthiopianBudgetYear()).year,
    );

    const balance = await getLatestActiveBalanceForUpdate(
      connection,
      request.employee_uuid,
      currentBudgetYear,
    );
    if (!balance) {
      throw new RequestServiceError(
        "Active leave balance for the current budget year was not found for this employee.",
        404,
      );
    }

    const currentRemainingDays = parseFiniteNumber(balance.remainingDays) ?? 0;
    const currentUsedDays = parseFiniteNumber(balance.usedDays) ?? 0;

    if (resolvedApprovedDays > currentRemainingDays) {
      throw new RequestServiceError(
        "Insufficient remaining leave days for approval.",
        409,
      );
    }

    const updatedRemainingDays = currentRemainingDays - resolvedApprovedDays;
    const updatedUsedDays = currentUsedDays + resolvedApprovedDays;

    // Determine next status based on current status
    let nextStatus;
    if (isDepartmentApproval) {
      // Department Head approves → Move to PENDING_HR (HR approval stage)
      nextStatus = REQUEST_STATUS_PENDING_HR;
    } else if (isHRApproval) {
      // HR approves → Final APPROVED status
      nextStatus = REQUEST_STATUS_APPROVED;
    } else {
      throw new RequestServiceError("Invalid approval stage.", 400);
    }
    
    await updateRequestStatusForDepartment(
      connection,
      requestUuid,
      nextStatus,
      departmentHeadId,
      null,
    );

    const [requestUpdateResult] = await connection.execute(
      `
        UPDATE leaveRequests
        SET total_days = ?, endDate = ?, dayPattern = ?, dailyPlanJson = ?
        WHERE uuid = ?
      `,
      [
        resolvedApprovedDays,
        dateCalculation.endDate,
        resolvedDayPattern,
        JSON.stringify(approvedDailyPlan),
        requestUuid,
      ],
    );

    if (requestUpdateResult.affectedRows !== 1) {
      throw new RequestServiceError(
        "Failed to update leave request details during approval.",
        500,
      );
    }

    // Only deduct balance and mark attendance if HR approves (final approval)
    if (isHRApproval) {
      const [balanceUpdateResult] = await connection.execute(
        `
          UPDATE employeeLeaveBalances
          SET remainingDays = ?, usedDays = ?
          WHERE uuid = ?
        `,
        [updatedRemainingDays, updatedUsedDays, balance.uuid],
      );

      if (balanceUpdateResult.affectedRows !== 1) {
        throw new RequestServiceError(
          "Failed to update leave balance during approval.",
          500,
        );
      }
      
      await connection.commit();

      // Attendance Integration: Mark attendance as leave after final HR approval
      try {
        const { markAttendanceAsLeave } = require("./attendanceService");
        await markAttendanceAsLeave({
          employee_uuid: request.employee_uuid,
          startDate: startDateIso,
          endDate: dateCalculation.endDate,
          leaveRequestUuid: requestUuid,
        });
      } catch (attendanceError) {
        console.error("Failed to mark attendance as leave:", attendanceError);
      }
    } else {
      // Department approval - just commit without deducting balance
      await connection.commit();
    }

    return {
      requestUuid,
      status: nextStatus,
      decision: normalizedDecision,
      deductedDays: isHRApproval ? resolvedApprovedDays : 0,
      approvedDays: resolvedApprovedDays,
      approvedEndDate: dateCalculation.endDate,
      balance: {
        remainingDays: isHRApproval ? updatedRemainingDays : currentRemainingDays,
        usedDays: isHRApproval ? updatedUsedDays : currentUsedDays,
      },
    };
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
};

module.exports = {
  RequestService,
  handleDepartmentDecision,
  RequestServiceError,
};
