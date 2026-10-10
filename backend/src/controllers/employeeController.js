const EmployeeService = require("../services/employeeService");
const asyncHandler = require("../middleware/asyncHandler");
const { sendSuccess } = require("../utils/response");
const { ApiError } = require("../utils/errors");
const { parsePagination } = require("../utils/pagination");
// OLD RBAC imports removed - now using Permit middleware
const { safeLogEvent } = require("../services/auditLogService");
const { AUDIT_ACTIONS, AUDIT_ENTITY_TYPES } = require("../config/constants");
const { getClientIp } = require("../utils/request");
const {
  validateEmployeeDraft,
  validateEmployeeCreate,
  validateEmployeeUpdate,
  validateEmployeeStatus,
  validateEmployeeDocumentMetadata,
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

function parsePaginationFromQuery(query) {
  if (query.limit !== undefined || query.offset !== undefined) {
    const limit = Number(query.limit || 20);
    const offset = Number(query.offset || 0);
    const pageSize = Number.isFinite(limit) && limit > 0 ? limit : 20;
    const page = Math.floor(Math.max(offset, 0) / pageSize) + 1;
    return { limit: pageSize, offset: Math.max(offset, 0), page, pageSize };
  }

  const page = Number(query.page || 1);
  const pageSize = Number(query.pageSize || query.page_size || 20);
  const parsed = parsePagination({ page, pageSize });
  return {
    limit: parsed.limit,
    offset: parsed.offset,
    page: parsed.page,
    pageSize: parsed.pageSize,
  };
}

exports.saveDraft = asyncHandler(async (req, res) => {
  assertValidation(validateEmployeeDraft(req.body || {}));

  const { uuid, stepCompleted, draftJson } = req.body;
  const draft = await EmployeeService.saveDraft(uuid, stepCompleted, draftJson);
  return sendSuccess(res, { status: 200, data: draft });
});

exports.getDraft = asyncHandler(async (req, res) => {
  const { uuid } = req.params;
  const draft = await EmployeeService.getDraft(uuid);
  if (!draft) {
    throw new ApiError("Draft not found.", 404, "NOT_FOUND");
  }
  return sendSuccess(res, { status: 200, data: draft });
});

exports.createEmployee = asyncHandler(async (req, res) => {
  assertValidation(validateEmployeeCreate(req.body || {}));

  const payload = req.body || {};
  
  // Extract role_uuid if provided (optional during registration)
  const roleUuid = payload.role_uuid;
  delete payload.role_uuid; // Remove from employee data
  
  const employee = await EmployeeService.createEmployee(payload);
  
  // If role_uuid provided, assign role to the new user
  if (roleUuid && employee.user_uuid) {
    const rbacService = require("../services/rbacService");
    try {
      await rbacService.assignRoleToUser(employee.user_uuid, roleUuid);
      await safeLogEvent({
        actorUuid: req.user?.uuid || null,
        action: AUDIT_ACTIONS.USER_ROLE_ASSIGN,
        entityType: AUDIT_ENTITY_TYPES.USER,
        entityUuid: employee.user_uuid,
        diff: { role_uuid: roleUuid, employee_uuid: employee.uuid },
        ipAddress: getClientIp(req),
      });
    } catch (roleError) {
      console.error("Failed to assign role during employee creation:", roleError);
      // Don't fail the employee creation if role assignment fails
    }
  }
  
  await safeLogEvent({
    actorUuid: req.user?.uuid || null,
    action: AUDIT_ACTIONS.EMPLOYEE_CREATE,
    entityType: AUDIT_ENTITY_TYPES.EMPLOYEE,
    entityUuid: employee.uuid,
    diff: { mesob_id: employee.mesob_id, role_uuid: roleUuid },
    ipAddress: getClientIp(req),
  });

  return sendSuccess(res, { status: 201, data: employee });
});

exports.listEmployees = asyncHandler(async (req, res) => {
  // Scope filtering is now handled by withScope() middleware
  // Just build the query filters from request
  
  const pagination = parsePaginationFromQuery(req.query || {});

  const filters = {
    status: req.query.status,
    departmentUuid: req.query.department_uuid,
    positionUuid: req.query.position_uuid,
    search: req.query.search,
    limit: pagination.limit,
    offset: pagination.offset,
  };

  // Apply scope-based filtering
  if (req.moduleAccess?.scope === "DEPARTMENT") {
    // Department scope: only employees in user's department
    filters.departmentUuid = req.user.department_uuid;
  } else if (req.moduleAccess?.scope === "OWN") {
    // OWN scope: only user's own employee record
    filters.employeeUuid = req.user.employee_uuid;
  }
  // ALL scope: no additional filters

  const result = await EmployeeService.listEmployees(filters);
  
  // Generate signed URLs for profile photos
  const { getSignedUrl } = require("../services/employeeStorageService");
  const itemsWithPhotos = await Promise.all(
    result.items.map(async (employee) => {
      if (employee.profile_photo_key) {
        try {
          employee.profile_photo_url = await getSignedUrl(employee.profile_photo_key);
        } catch (error) {
          console.warn(`Failed to generate signed URL for employee ${employee.uuid}:`, error.message);
          employee.profile_photo_url = null;
        }
      } else {
        employee.profile_photo_url = null;
      }
      return employee;
    })
  );
  
  return sendSuccess(res, {
    status: 200,
    data: itemsWithPhotos,
    meta: {
      total: result.total,
      page: pagination.page,
      pageSize: pagination.pageSize,
    },
  });
});

exports.getEmployee = asyncHandler(async (req, res) => {
  const { uuid } = req.params;
  const includeSigned =
    String(req.query?.signed || "").toLowerCase() === "true";
  const employee = await EmployeeService.getEmployeeByUuid(uuid, {
    includeDocuments: true,
    includeSignedUrls: includeSigned,
  });

  // Access control is handled by the route middleware (allowSelfOr)
  // No additional checks needed here

  return sendSuccess(res, { status: 200, data: employee });
});

exports.updateEmployee = asyncHandler(async (req, res) => {
  assertValidation(validateEmployeeUpdate(req.body || {}));

  const { uuid } = req.params;
  const payload = req.body || {};
  
  // Extract role_uuid if provided (optional during update)
  const roleUuid = payload.role_uuid;
  delete payload.role_uuid; // Remove from employee data
  
  const employee = await EmployeeService.updateEmployee(uuid, payload);
  
  // If role_uuid provided, update role assignment
  if (roleUuid && employee.user_uuid) {
    const rbacService = require("../services/rbacService");
    try {
      await rbacService.assignRoleToUser(employee.user_uuid, roleUuid);
    } catch (roleError) {
      console.error("Role assignment failed during update:", roleError);
      // Continue - employee update succeeded even if role assignment failed
    }
  }

  await safeLogEvent({
    actorUuid: req.user?.uuid || null,
    action: AUDIT_ACTIONS.EMPLOYEE_UPDATE,
    entityType: AUDIT_ENTITY_TYPES.EMPLOYEE,
    entityUuid: employee.uuid,
    diff: { fields: Object.keys(payload || {}), role_uuid: roleUuid },
    ipAddress: getClientIp(req),
  });

  return sendSuccess(res, { status: 200, data: employee });
});

exports.updateEmployeeStatus = asyncHandler(async (req, res) => {
  assertValidation(validateEmployeeStatus(req.body || {}));

  const { uuid } = req.params;
  const { status } = req.body || {};
  const employee = await EmployeeService.updateEmployeeStatus(uuid, status);

  await safeLogEvent({
    actorUuid: req.user?.uuid || null,
    action: AUDIT_ACTIONS.EMPLOYEE_STATUS_CHANGE,
    entityType: AUDIT_ENTITY_TYPES.EMPLOYEE,
    entityUuid: employee.uuid,
    diff: { status: employee.status },
    ipAddress: getClientIp(req),
  });

  return sendSuccess(res, { status: 200, data: employee });
});

exports.uploadEmployeePhoto = asyncHandler(async (req, res) => {
  const { uuid } = req.params;
  if (!req.file) {
    throw new ApiError("Photo file is required.", 400, "VALIDATION_ERROR");
  }

  const result = await EmployeeService.uploadEmployeePhoto(uuid, req.file);

  await safeLogEvent({
    actorUuid: req.user?.uuid || null,
    action: AUDIT_ACTIONS.EMPLOYEE_PHOTO_UPDATE,
    entityType: AUDIT_ENTITY_TYPES.EMPLOYEE,
    entityUuid: uuid,
    diff: { profile_photo_key: result.profile_photo_key },
    ipAddress: getClientIp(req),
  });

  return sendSuccess(res, { status: 200, data: result });
});

exports.listEmployeeDocuments = asyncHandler(async (req, res) => {
  const { uuid } = req.params;
  const includeSigned =
    String(req.query?.signed || "").toLowerCase() === "true";

  const employee = await EmployeeService.getEmployeeByUuid(uuid, {
    includeDocuments: false,
  });
  assertEmployeeReadAccess(req.user, employee);

  const documents = await EmployeeService.listEmployeeDocuments(uuid, {
    includeSignedUrls: includeSigned,
  });
  return sendSuccess(res, { status: 200, data: documents });
});

exports.addEmployeeDocument = asyncHandler(async (req, res) => {
  const { uuid } = req.params;
  const files = Array.isArray(req.files) ? req.files : [];
  if (!files.length) {
    throw new ApiError(
      "Document file(s) are required.",
      400,
      "VALIDATION_ERROR",
    );
  }

  assertValidation(validateEmployeeDocumentMetadata(req.body || {}));

  const metadata = {
    doc_type: req.body.doc_type,
    id_number: req.body.id_number,
    issue_date: req.body.issue_date,
    valid_until: req.body.valid_until,
  };

  const createdDocuments = await EmployeeService.addEmployeeDocuments(
    uuid,
    files,
    metadata,
  );

  await safeLogEvent({
    actorUuid: req.user?.uuid || null,
    action: AUDIT_ACTIONS.EMPLOYEE_DOCUMENT_ADD,
    entityType: AUDIT_ENTITY_TYPES.DOCUMENT,
    entityUuid: uuid,
    diff: { documents: createdDocuments.map((doc) => doc.uuid) },
    ipAddress: getClientIp(req),
  });

  return sendSuccess(res, { status: 201, data: createdDocuments });
});

exports.removeEmployeeDocument = asyncHandler(async (req, res) => {
  const { uuid, docUuid } = req.params;
  await EmployeeService.removeEmployeeDocument(uuid, docUuid);

  await safeLogEvent({
    actorUuid: req.user?.uuid || null,
    action: AUDIT_ACTIONS.EMPLOYEE_DOCUMENT_REMOVE,
    entityType: AUDIT_ENTITY_TYPES.DOCUMENT,
    entityUuid: docUuid,
    diff: { employee_uuid: uuid },
    ipAddress: getClientIp(req),
  });

  return sendSuccess(res, { status: 200, message: "Document removed." });
});

exports.getEmployeeShift = asyncHandler(async (req, res) => {
  const { uuid } = req.params;
  const employee = await EmployeeService.getEmployeeByUuid(uuid, {
    includeDocuments: false,
  });
  assertEmployeeReadAccess(req.user, employee);

  const shift = await EmployeeService.getEmployeeShift(uuid);
  if (!shift) {
    throw new ApiError(
      "No active shift found for the employee.",
      404,
      "NOT_FOUND",
    );
  }
  return sendSuccess(res, { status: 200, data: shift });
});

/* ─────────────────────────────────────────────────────────
   Employee Dashboard — enriched employee profile with
   department name, position title, and address info.
   Only the employee themselves (or HR) can access this.
───────────────────────────────────────────────────────── */
const { executeQuery } = require("../utils/dbQuery");
const { getSignedUrl } = require("../services/employeeStorageService");

exports.getEmployeeDashboard = asyncHandler(async (req, res) => {
  const { uuid } = req.params;

  // RBAC: employees can only see their own dashboard
  if (
    req.user?.employee_uuid !== uuid &&
    !["HR_OFFICER", "HR_ADMIN", "SUPER_ADMIN", "DEPT_HEAD"].includes(req.user?.role)
  ) {
    throw new ApiError("You can only view your own dashboard.", 403, "FORBIDDEN");
  }

  const [rows] = await executeQuery(
    `SELECT
       e.uuid, e.mesob_id, e.title,
       e.first_name, e.middle_name, e.last_name, e.mother_name,
       e.gender, e.date_of_birth, e.nationality,
       e.tin_number, e.pension_code,
       e.bank_name, e.bank_account_number,
       e.hire_date, e.prior_gov_service_years, e.status,
       e.profile_photo_key,
       e.department_uuid, e.position_uuid,
       d.name  AS department_name,
       p.title AS position_title
     FROM Employees e
     LEFT JOIN Positions   p ON p.uuid = e.position_uuid
     LEFT JOIN Departments d ON d.uuid = e.department_uuid
     WHERE e.uuid = ?
     LIMIT 1`,
    [String(uuid).trim()]
  );

  if (!rows.length) throw new ApiError("Employee not found.", 404, "NOT_FOUND");

  const emp = rows[0];

  // Fetch addresses
  const [addresses] = await executeQuery(
    `SELECT address_type, region, zone, woreda, kebele,
            house_number, phone_primary, phone_secondary, email
     FROM EmployeeAddresses WHERE employee_uuid = ?`,
    [String(uuid).trim()]
  );

  emp.addresses = addresses;
  emp._deptName      = emp.department_name || "";
  emp._positionTitle = emp.position_title  || "";

  // Generate signed URL for profile photo if it exists
  if (emp.profile_photo_key) {
    try {
      emp.profile_photo_url = await getSignedUrl(emp.profile_photo_key);
    } catch (error) {
      console.warn("Failed to generate signed URL for profile photo:", error.message);
      emp.profile_photo_url = null;
    }
  } else {
    emp.profile_photo_url = null;
  }

  return sendSuccess(res, { status: 200, data: emp });
});

/* ─────────────────────────────────────────────────────────
   Department Head Dashboard Stats
   Returns dept overview: total employees, present today,
   on leave, pending requests — scoped to their dept only.
───────────────────────────────────────────────────────── */
exports.getDeptHeadStats = asyncHandler(async (req, res) => {
  const user = req.user;

  // Only DEPT_HEAD (or HR admins for testing) may call this
  const deptUuid =
    user?.role === "DEPT_HEAD"
      ? user.department_uuid
      : req.query.department_uuid;

  if (!deptUuid) {
    throw new ApiError("Department context is missing.", 400, "VALIDATION_ERROR");
  }

  // Total employees in department
  const [totalRows] = await executeQuery(
    "SELECT COUNT(*) AS cnt FROM Employees WHERE department_uuid = ? AND status = 'ACTIVE'",
    [deptUuid]
  );

  // Get today's date range
  const today = new Date().toISOString().slice(0, 10);

  // Present today (from AttendanceSummary)
  const [presentRows] = await executeQuery(
    `SELECT COUNT(*) AS cnt FROM AttendanceSummary a
     INNER JOIN Employees e ON e.uuid = a.employee_uuid
     WHERE e.department_uuid = ? AND a.date = ? AND a.status IN ('PRESENT','LATE','HALF_DAY')`,
    [deptUuid, today]
  );

  // On leave today
  const [leaveRows] = await executeQuery(
    `SELECT COUNT(*) AS cnt FROM AttendanceSummary a
     INNER JOIN Employees e ON e.uuid = a.employee_uuid
     WHERE e.department_uuid = ? AND a.date = ? AND a.status = 'LEAVE'`,
    [deptUuid, today]
  );

  // Absent today
  const [absentRows] = await executeQuery(
    `SELECT COUNT(*) AS cnt FROM AttendanceSummary a
     INNER JOIN Employees e ON e.uuid = a.employee_uuid
     WHERE e.department_uuid = ? AND a.date = ? AND a.status = 'ABSENT'`,
    [deptUuid, today]
  );

  // Pending leave requests
  const [pendingRows] = await executeQuery(
    `SELECT COUNT(*) AS cnt FROM leaveRequests lr
     INNER JOIN Employees e ON e.uuid = lr.employee_uuid
     WHERE e.department_uuid = ? AND lr.status IN ('PENDING','PENDING_DEPARTMENT')`,
    [deptUuid]
  );

  // Department name
  const [deptRows] = await executeQuery(
    "SELECT name FROM Departments WHERE uuid = ? LIMIT 1",
    [deptUuid]
  );

  return sendSuccess(res, {
    status: 200,
    data: {
      department_uuid:  deptUuid,
      department_name:  deptRows[0]?.name || "",
      total_employees:  Number(totalRows[0]?.cnt  || 0),
      present_today:    Number(presentRows[0]?.cnt || 0),
      on_leave_today:   Number(leaveRows[0]?.cnt   || 0),
      absent_today:     Number(absentRows[0]?.cnt  || 0),
      pending_requests: Number(pendingRows[0]?.cnt || 0),
      date: today,
    },
  });
});

/* ─────────────────────────────────────────────────────────
   Department Employees — read-only list scoped to dept head's dept
───────────────────────────────────────────────────────── */
exports.getDeptEmployees = asyncHandler(async (req, res) => {
  const user = req.user;
  const deptUuid = user?.role === "DEPT_HEAD"
    ? user.department_uuid
    : req.query.department_uuid;

  if (!deptUuid) {
    throw new ApiError("Department context is missing.", 400, "VALIDATION_ERROR");
  }

  const [rows] = await executeQuery(
    `SELECT e.uuid, e.mesob_id, e.title, e.first_name, e.middle_name, e.last_name,
            e.gender, e.status, e.hire_date,
            p.title AS position_title,
            ea.phone_primary, ea.email
     FROM Employees e
     LEFT JOIN Positions p ON p.uuid = e.position_uuid
     LEFT JOIN EmployeeAddresses ea ON ea.employee_uuid = e.uuid AND ea.address_type = 'CURRENT'
     WHERE e.department_uuid = ? AND e.status = 'ACTIVE'
     ORDER BY e.last_name ASC`,
    [deptUuid]
  );

  return sendSuccess(res, { status: 200, data: rows });
});

/* ─────────────────────────────────────────────────────────
   Search Employees for Attendance - searchable selector
   Returns employees with photo, name, Mesob ID, department
───────────────────────────────────────────────────────────*/
exports.searchEmployeesForAttendance = asyncHandler(async (req, res) => {
  const { q } = req.query;
  
  if (!q || q.trim().length < 2) {
    return sendSuccess(res, { data: [] });
  }

  const searchTerm = `%${q.trim()}%`;
  
  const [employees] = await executeQuery(
    `SELECT 
      e.uuid,
      e.mesob_id,
      e.first_name,
      e.middle_name,
      e.last_name,
      e.profile_photo_key,
      e.status,
      e.attendance_exempt,
      d.name as department_name
     FROM Employees e
     LEFT JOIN Positions p ON p.uuid = e.position_uuid
     LEFT JOIN Departments d ON d.uuid = p.department_uuid
     WHERE e.status = 'ACTIVE'
       AND e.attendance_exempt = FALSE
       AND (
         e.mesob_id LIKE ?
         OR e.first_name LIKE ?
         OR e.middle_name LIKE ?
         OR e.last_name LIKE ?
         OR CONCAT(e.first_name, ' ', e.middle_name, ' ', e.last_name) LIKE ?
         OR CONCAT(e.first_name, ' ', e.last_name) LIKE ?
       )
     ORDER BY e.first_name, e.last_name
     LIMIT 20`,
    [searchTerm, searchTerm, searchTerm, searchTerm, searchTerm, searchTerm]
  );

  // Generate presigned URLs for photos
  const { getSignedUrl } = require("../services/employeeStorageService");
  const employeesWithPhotos = await Promise.all(
    employees.map(async (emp) => {
      let photoUrl = null;
      if (emp.profile_photo_key) {
        try {
          photoUrl = await getSignedUrl(emp.profile_photo_key, 300); // 5 min expiry
        } catch (err) {
          console.error(`Failed to generate photo URL for employee ${emp.uuid}:`, err);
        }
      }

      return {
        uuid: emp.uuid,
        mesobId: emp.mesob_id,
        firstName: emp.first_name,
        middleName: emp.middle_name,
        lastName: emp.last_name,
        fullName: `${emp.first_name} ${emp.middle_name || ''} ${emp.last_name}`.replace(/\s+/g, ' ').trim(),
        departmentName: emp.department_name,
        photoUrl,
      };
    })
  );

  return sendSuccess(res, { data: employeesWithPhotos });
});

/* ─────────────────────────────────────────────────────────
   Update Employee Role
   Allows HR Admin/Super Admin to change an employee's role
───────────────────────────────────────────────────────── */
exports.updateEmployeeRole = asyncHandler(async (req, res) => {
  const { uuid } = req.params;
  const { role_uuid } = req.body;

  if (!role_uuid) {
    throw new ApiError("Role UUID is required.", 400, "VALIDATION_ERROR");
  }

  // First, get the employee to find their user_uuid
  const employee = await EmployeeService.getEmployeeByUuid(uuid, {
    includeDocuments: false,
  });

  if (!employee.user_uuid) {
    throw new ApiError(
      "This employee has no associated user account.",
      400,
      "VALIDATION_ERROR"
    );
  }

  // Assign the new role to the user
  const rbacService = require("../services/rbacService");
  await rbacService.assignRoleToUser(employee.user_uuid, role_uuid);

  // Log the role change
  await safeLogEvent({
    actorUuid: req.user?.uuid || null,
    action: AUDIT_ACTIONS.USER_ROLE_ASSIGN,
    entityType: AUDIT_ENTITY_TYPES.USER,
    entityUuid: employee.user_uuid,
    diff: { 
      employee_uuid: uuid,
      new_role_uuid: role_uuid,
    },
    ipAddress: getClientIp(req),
  });

  return sendSuccess(res, { 
    status: 200, 
    message: "Employee role updated successfully. User must re-login for changes to take effect.",
    data: { employee_uuid: uuid, user_uuid: employee.user_uuid }
  });
});

exports.getEmployeePhoto = asyncHandler(async (req, res) => {
  const { uuid } = req.params;
  const employee = await EmployeeService.getEmployeeByUuid(uuid);
  if (!employee || !employee.profile_photo_key) {
    return res.status(404).json({ error: "Photo not found" });
  }
  const { getSignedUrl } = require("../services/employeeStorageService");
  const signedUrl = await getSignedUrl(employee.profile_photo_key);
  if (!signedUrl) {
    return res.status(404).json({ error: "Photo not found" });
  }
  return res.redirect(signedUrl);
});

