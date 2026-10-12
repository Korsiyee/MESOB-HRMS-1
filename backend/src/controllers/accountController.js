
const { randomUUID } = require("crypto");
const { db } = require("../config/db");
const { sendSuccess, sendError } = require("../utils/response");
const { safeLogEvent } = require("../services/auditLogService");
const {
  generatePasswordHash,
  findUserByUsername,
  revokeAllUserTokens,
} = require("../services/authService");

const VALID_ROLE_CODES = [
  "EMPLOYEE",
  "DEPT_HEAD",
  "HR_OFFICER",
  "HR_ADMIN",
  "SUPER_ADMIN",
];

/**
 * Helper function to validate password complexity
 * Password must be 8+ characters with at least one uppercase, lowercase, number, and symbol
 */
function validatePassword(password) {
  if (!password || password.length < 8) {
    return { valid: false, message: "Password must be at least 8 characters long." };
  }
  if (!/[A-Z]/.test(password)) {
    return { valid: false, message: "Password must contain at least one uppercase letter (A-Z)." };
  }
  if (!/[a-z]/.test(password)) {
    return { valid: false, message: "Password must contain at least one lowercase letter (a-z)." };
  }
  if (!/[0-9]/.test(password)) {
    return { valid: false, message: "Password must contain at least one number (0-9)." };
  }
  if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?~`]/.test(password) && !/[^A-Za-z0-9]/.test(password)) {
    return { valid: false, message: "Password must contain at least one special character (e.g., !, @, #, or $)." };
  }
  return { valid: true };
}

/**
 * Helper function to generate unique username from employee name
 * Format: firstname.lastname (lowercase, no spaces)
 * If duplicate, appends number (e.g., john.doe2, john.doe3)
 */
async function generateUniqueUsername(firstName, lastName, pool) {
  // Normalize names: lowercase, remove spaces and special characters
  const first = (firstName || '').toLowerCase().replace(/[^a-z0-9]/g, '');
  const last = (lastName || '').toLowerCase().replace(/[^a-z0-9]/g, '');
  
  if (!first || !last) {
    throw new Error("Employee must have valid first and last names.");
  }

  let baseUsername = `${first}.${last}`;
  let username = baseUsername;
  let counter = 2;

  // Check for existing username and increment until unique
  while (true) {
    const existingUser = await findUserByUsername(username);
    if (!existingUser) {
      return username;
    }
    username = `${baseUsername}${counter}`;
    counter++;
  }
}

/**
 * Create a new user account
 * POST /api/accounts
 * Username and password are auto-generated
 */
exports.createAccount = async (req, res) => {
  try {
    const {
      employee_uuid,
      role_uuid,
      role,
      is_active = true,
      must_change_password = false,
    } = req.body;

    // Validation - only employee_uuid is required now
    if (!employee_uuid) {
      return sendError(res, {
        status: 400,
        message: "employee_uuid is required.",
        error: "VALIDATION_ERROR",
      });
    }

    const pool = db.promise();

    // Check if employee exists and get name
    const [employees] = await pool.execute(
      "SELECT uuid, first_name, last_name FROM Employees WHERE uuid = ?",
      [employee_uuid]
    );

    if (!employees.length) {
      return sendError(res, {
        status: 404,
        message: "Employee not found.",
        error: "EMPLOYEE_NOT_FOUND",
      });
    }

    const employee = employees[0];

    // Check if employee already has an account
    const [existingAccounts] = await pool.execute(
      "SELECT uuid FROM Users WHERE employee_uuid = ?",
      [employee_uuid]
    );

    if (existingAccounts.length) {
      return sendError(res, {
        status: 409,
        message: "Employee already has a user account.",
        error: "ACCOUNT_EXISTS",
      });
    }

    // Auto-generate unique username from employee name
    const username = await generateUniqueUsername(employee.first_name, employee.last_name, pool);

    // Set default password: Mesob@2026
    const defaultPassword = "Mesob@2026";

    // Validate password (should always pass with our default)
    const passwordValidation = validatePassword(defaultPassword);
    if (!passwordValidation.valid) {
      return sendError(res, {
        status: 500,
        message: `Default password validation failed: ${passwordValidation.message}`,
        error: "PASSWORD_VALIDATION_ERROR",
      });
    }

    // Determine target role UUID
    let targetRoleUuid = role_uuid;
    if (!targetRoleUuid && role) {
      const normalizedRole = role.toUpperCase();
      const [roleByCode] = await pool.execute(
        "SELECT uuid FROM Roles WHERE (code = ? OR code = ?) AND is_active = 1 LIMIT 1",
        [normalizedRole, normalizedRole === 'DEPARTMENT_HEAD' ? 'DEPT_HEAD' : normalizedRole]
      );
      if (roleByCode.length) {
        targetRoleUuid = roleByCode[0].uuid;
      }
    }

    if (!targetRoleUuid) {
      // Default to EMPLOYEE role
      const [defaultRole] = await pool.execute(
        "SELECT uuid FROM Roles WHERE code = 'EMPLOYEE' AND is_active = 1 LIMIT 1"
      );
      if (!defaultRole.length) {
        return sendError(res, {
          status: 500,
          message: "Default EMPLOYEE role not found.",
          error: "ROLE_NOT_FOUND",
        });
      }
      targetRoleUuid = defaultRole[0].uuid;
    } else {
      // Verify the provided role_uuid exists
      const [roleCheck] = await pool.execute(
        "SELECT uuid FROM Roles WHERE uuid = ? AND is_active = 1 LIMIT 1",
        [targetRoleUuid]
      );
      if (!roleCheck.length) {
        return sendError(res, {
          status: 400,
          message: "Invalid role_uuid.",
          error: "VALIDATION_ERROR",
        });
      }
    }

    // Constraint check for Department Head
    const [targetRoleRows] = await pool.execute(
      "SELECT code FROM Roles WHERE uuid = ? LIMIT 1",
      [targetRoleUuid]
    );
    if (targetRoleRows.length > 0) {
      const code = targetRoleRows[0].code;
      if (code === 'DEPT_HEAD' || code === 'DEPARTMENT_HEAD') {
        const { isEmployeeDesignatedDeptHead } = require("../services/departmentService");
        const isHead = employee_uuid && (await isEmployeeDesignatedDeptHead(employee_uuid));
        if (!isHead) {
          return sendError(res, {
            status: 400,
            message: "An employee can only be assigned the Department Head role if they are currently designated as the head of their department.",
            error: "NOT_DESIGNATED_DEPT_HEAD",
          });
        }
      }
    }

    // Create password hash
    const password_hash = await generatePasswordHash(defaultPassword);
    const userUuid = randomUUID();

    // Insert new user
    await pool.execute(
      `INSERT INTO Users (uuid, employee_uuid, username, password_hash, role_uuid, is_active, must_change_password)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        userUuid,
        employee_uuid,
        username,
        password_hash,
        targetRoleUuid,
        is_active ? 1 : 0,
        must_change_password ? 1 : 0,
      ]
    );

    // Fetch created user with department info
    const [newUser] = await pool.execute(
      `SELECT u.uuid, u.employee_uuid, u.username, u.role_uuid, r.code as role, u.is_active, u.must_change_password,
              u.created_at, u.updated_at, 
              e.first_name, e.middle_name, e.last_name, e.mesob_id, e.department_uuid,
              a.email
       FROM Users u
       LEFT JOIN Roles r ON r.uuid = u.role_uuid
       LEFT JOIN Employees e ON e.uuid = u.employee_uuid
       LEFT JOIN EmployeeAddresses a ON e.uuid = a.employee_uuid AND a.address_type = 'CURRENT'
       WHERE u.uuid = ?`,
      [userUuid]
    );

    console.log(`[Account] Created new user ${newUser[0].username} with auto-generated credentials`);

    // Audit log
    await safeLogEvent({
      actorUuid: req.user?.uuid,
      action: "CREATE_USER_ACCOUNT",
      entityType: "USER",
      entityUuid: userUuid,
      diff: { username, role_uuid: targetRoleUuid, employee_uuid },
      ipAddress: req.ip,
    });

    return sendSuccess(res, {
      status: 201,
      message: "User account created successfully. Default password is Mesob@2026",
      data: {
        ...newUser[0],
        default_password: defaultPassword, // Include in response for admin to share with user
      },
    });
  } catch (error) {
    console.error("createAccount error:", error);
    return sendError(res, {
      status: 500,
      message: error.message || "Failed to create user account.",
      error: "CREATE_ACCOUNT_ERROR",
    });
  }
};

/**
 * List all user accounts with optional filtering
 * GET /api/accounts?role=EMPLOYEE&is_active=true
 */
exports.listAccounts = async (req, res) => {
  try {
    const { role, is_active, search } = req.query;
    const pool = db.promise();

    let query = `
      SELECT u.uuid, u.employee_uuid, u.username, u.role_uuid, r.code as role, u.is_active, u.must_change_password,
             u.last_login, u.created_at, u.updated_at,
             e.first_name, e.middle_name, e.last_name, e.mesob_id,
             CONCAT_WS(' ', e.first_name, e.middle_name, e.last_name) as employee_name,
             d.name as department_name, p.title as position_title
      FROM Users u
      LEFT JOIN Roles r ON r.uuid = u.role_uuid
      LEFT JOIN Employees e ON e.uuid = u.employee_uuid
      LEFT JOIN Positions p ON p.uuid = e.position_uuid
      LEFT JOIN Departments d ON d.uuid = p.department_uuid
      WHERE 1=1
    `;

    const params = [];

    // Filter by role code
    if (role && VALID_ROLE_CODES.includes(role)) {
      query += " AND r.code = ?";
      params.push(role);
    }

    // Filter by active status
    if (is_active !== undefined) {
      const active = is_active === "true" || is_active === "1" || is_active === true;
      query += " AND u.is_active = ?";
      params.push(active ? 1 : 0);
    }

    // Search by username or employee name
    if (search && search.trim()) {
      query += ` AND (
        u.username LIKE ? OR
        e.first_name LIKE ? OR
        e.last_name LIKE ? OR
        e.mesob_id LIKE ?
      )`;
      const searchTerm = `%${search.trim()}%`;
      params.push(searchTerm, searchTerm, searchTerm, searchTerm);
    }

    query += " ORDER BY u.created_at DESC";

    const [accounts] = await pool.execute(query, params);

    return sendSuccess(res, {
      status: 200,
      message: "Accounts retrieved successfully.",
      data: accounts,
    });
  } catch (error) {
    console.error("listAccounts error:", error);
    return sendError(res, {
      status: 500,
      message: "Failed to retrieve accounts.",
      error: "LIST_ACCOUNTS_ERROR",
    });
  }
};

/**
 * Get single user account by UUID
 * GET /api/accounts/:uuid
 */
exports.getAccount = async (req, res) => {
  try {
    const { uuid } = req.params;
    const pool = db.promise();

    const [accounts] = await pool.execute(
      `SELECT u.uuid, u.employee_uuid, u.username, u.role_uuid, r.code as role, u.is_active, u.must_change_password,
              u.last_login, u.created_at, u.updated_at,
              e.first_name, e.middle_name, e.last_name, e.mesob_id, e.hire_date,
              e.status as employee_status, e.profile_photo_key,
              d.uuid as department_uuid, d.name as department_name,
              p.uuid as position_uuid, p.title as position_title
       FROM Users u
       LEFT JOIN Roles r ON r.uuid = u.role_uuid
       LEFT JOIN Employees e ON e.uuid = u.employee_uuid
       LEFT JOIN Positions p ON p.uuid = e.position_uuid
       LEFT JOIN Departments d ON d.uuid = p.department_uuid
       WHERE u.uuid = ?`,
      [uuid]
    );

    if (!accounts.length) {
      return sendError(res, {
        status: 404,
        message: "Account not found.",
        error: "ACCOUNT_NOT_FOUND",
      });
    }

    return sendSuccess(res, {
      status: 200,
      message: "Account retrieved successfully.",
      data: accounts[0],
    });
  } catch (error) {
    console.error("getAccount error:", error);
    return sendError(res, {
      status: 500,
      message: "Failed to retrieve account.",
      error: "GET_ACCOUNT_ERROR",
    });
  }
};

/**
 * Change user account role
 * PATCH /api/accounts/:uuid/role
 * SECURITY: Now validates role hierarchy to prevent privilege escalation
 */
exports.changeAccountRole = async (req, res) => {
  try {
    const { uuid } = req.params;
    let { role_uuid: newRoleUuid, role } = req.body;
    
    // Prevent self-modification
    if (uuid === req.user.uuid) {
      return sendError(res, {
        status: 403,
        message: "Cannot modify your own role.",
        error: "SELF_MODIFICATION_FORBIDDEN",
      });
    }

    const pool = db.promise();

    if (!newRoleUuid && role) {
      const normalizedRole = role.toUpperCase();
      const [roleByCode] = await pool.execute(
        "SELECT uuid FROM Roles WHERE (code = ? OR code = ?) AND is_active = 1 LIMIT 1",
        [normalizedRole, normalizedRole === 'DEPARTMENT_HEAD' ? 'DEPT_HEAD' : normalizedRole]
      );
      if (roleByCode.length) {
        newRoleUuid = roleByCode[0].uuid;
      }
    }

    if (!newRoleUuid) {
      return sendError(res, {
        status: 400,
        message: "role_uuid or role is required.",
        error: "VALIDATION_ERROR",
      });
    }

    // Check if account exists and get current role
    const [existing] = await pool.execute(
      "SELECT uuid, role_uuid, username, employee_uuid FROM Users WHERE uuid = ?",
      [uuid]
    );

    if (!existing.length) {
      return sendError(res, {
        status: 404,
        message: "Account not found.",
        error: "ACCOUNT_NOT_FOUND",
      });
    }
    
    const targetUser = existing[0];
    const oldRoleUuid = targetUser.role_uuid;

    // Get role names for audit log
    const [oldRoleRows] = await pool.execute(
      "SELECT code, name FROM Roles WHERE uuid = ?",
      [oldRoleUuid]
    );
    const [newRoleRows] = await pool.execute(
      "SELECT code, name FROM Roles WHERE uuid = ?",
      [newRoleUuid]
    );
    
    const oldRoleInfo = oldRoleRows.length ? oldRoleRows[0] : null;
    const newRoleInfo = newRoleRows.length ? newRoleRows[0] : null;

    // Constraint check for Department Head
    if (newRoleInfo?.code === 'DEPT_HEAD' || newRoleInfo?.code === 'DEPARTMENT_HEAD') {
      const { isEmployeeDesignatedDeptHead } = require("../services/departmentService");
      const isHead = targetUser.employee_uuid && (await isEmployeeDesignatedDeptHead(targetUser.employee_uuid));
      if (!isHead) {
        return sendError(res, {
          status: 400,
          message: "An employee can only be assigned the Department Head role if they are currently designated as the head of their department.",
          error: "NOT_DESIGNATED_DEPT_HEAD",
        });
      }
    }

    // Update role
    await pool.execute(
      "UPDATE Users SET role_uuid = ? WHERE uuid = ?",
      [newRoleUuid, uuid]
    );

    // Note: Permit.io sync removed - using database-driven permissions now
    console.log(`[Account] Changed role for ${targetUser.username} from ${oldRoleInfo?.code} to ${newRoleInfo?.code}`);

    // Audit log
    await safeLogEvent({
      actorUuid: req.user.uuid,
      action: "ACCOUNT_ROLE_CHANGED",
      entityType: "Account",
      entityUuid: uuid,
      diff: {
        username: targetUser.username,
        old_role: oldRoleInfo?.code || null,
        new_role: newRoleInfo?.code || null,
      },
      ipAddress: req.ip,
    });

    // Revoke all tokens to force re-login with new permissions
    await revokeAllUserTokens(uuid);

    return sendSuccess(res, {
      status: 200,
      message: "Role changed successfully. User must log in again.",
      data: {
        uuid,
        username: targetUser.username,
        old_role: oldRoleInfo?.code || null,
        new_role: newRoleInfo?.code || null,
      },
    });
  } catch (error) {
    console.error("changeAccountRole error:", error);
    return sendError(res, {
      status: 500,
      message: "Failed to change account role.",
      error: "CHANGE_ROLE_ERROR",
    });
  }
};

/**
 * Toggle account active status
 * PATCH /api/accounts/:uuid/status
 */
exports.changeAccountStatus = async (req, res) => {
  try {
    const { uuid } = req.params;
    const { is_active, status } = req.body;

    // Handle both formats: is_active (boolean) or status ('ACTIVE'/'INACTIVE')
    let active;
    if (is_active !== undefined) {
      active = Boolean(is_active);
    } else if (status !== undefined) {
      active = status === 'ACTIVE' || status === 'active' || status === true || status === 1;
    } else {
      return sendError(res, {
        status: 400,
        message: "is_active or status is required.",
        error: "VALIDATION_ERROR",
      });
    }

    const pool = db.promise();

    // Check if account exists
    const [existing] = await pool.execute(
      "SELECT uuid, is_active, username FROM Users WHERE uuid = ?",
      [uuid]
    );

    if (!existing.length) {
      return sendError(res, {
        status: 404,
        message: "Account not found.",
        error: "ACCOUNT_NOT_FOUND",
      });
    }

    const oldStatus = Boolean(existing[0].is_active);
    const targetUsername = existing[0].username;

    // SECURITY FIX: When deactivating, revoke all tokens immediately
    if (!active) {
      // Revoke all tokens to immediately terminate all sessions
      await revokeAllUserTokens(uuid);
    }

    // Update status
    await pool.execute("UPDATE Users SET is_active = ? WHERE uuid = ?", [
      active ? 1 : 0,
      uuid,
    ]);

    // Note: Permit.io sync removed - using database-driven permissions now
    console.log(`[Account] ${active ? 'Activated' : 'Deactivated'} user ${targetUsername}`);

    // Fetch updated account
    const [updated] = await pool.execute(
      `SELECT u.uuid, u.employee_uuid, u.username, u.role_uuid, r.code as role, u.is_active, u.must_change_password,
              u.updated_at, e.first_name, e.last_name
       FROM Users u
       LEFT JOIN Roles r ON r.uuid = u.role_uuid
       LEFT JOIN Employees e ON e.uuid = u.employee_uuid
       WHERE u.uuid = ?`,
      [uuid]
    );

    // Audit log
    await safeLogEvent({
      actorUuid: req.user?.uuid,
      action: active ? "ACTIVATE_USER_ACCOUNT" : "DEACTIVATE_USER_ACCOUNT",
      entityType: "USER",
      entityUuid: uuid,
      diff: { old_status: oldStatus, new_status: active },
      ipAddress: req.ip,
    });

    return sendSuccess(res, {
      status: 200,
      message: `User account ${active ? "activated" : "deactivated"} successfully.${!active ? " All active sessions have been terminated." : ""}`,
      data: updated[0],
    });
  } catch (error) {
    console.error("changeAccountStatus error:", error);
    return sendError(res, {
      status: 500,
      message: "Failed to update account status.",
      error: "CHANGE_STATUS_ERROR",
    });
  }
};

/**
 * Reset user account password (admin reset)
 * PATCH /api/accounts/:uuid/reset-password
 */
exports.resetAccountPassword = async (req, res) => {
  try {
    const { uuid } = req.params;
    const { new_password, must_change_password = true } = req.body;

    if (!new_password) {
      return sendError(res, {
        status: 400,
        message: "new_password is required.",
        error: "VALIDATION_ERROR",
      });
    }

    // Validate password complexity
    const passwordValidation = validatePassword(new_password);
    if (!passwordValidation.valid) {
      return sendError(res, {
        status: 400,
        message: passwordValidation.message,
        error: "PASSWORD_VALIDATION_ERROR",
      });
    }

    const pool = db.promise();

    // Check if account exists
    const [existing] = await pool.execute(
      "SELECT uuid, username FROM Users WHERE uuid = ?",
      [uuid]
    );

    if (!existing.length) {
      return sendError(res, {
        status: 404,
        message: "Account not found.",
        error: "ACCOUNT_NOT_FOUND",
      });
    }

    // Generate new password hash
    const password_hash = await generatePasswordHash(new_password);

    // SECURITY FIX: Revoke all tokens when admin resets password
    // This immediately terminates all sessions so old credentials cannot be used
    await revokeAllUserTokens(uuid);

    // Update password and must_change_password flag
    await pool.execute(
      "UPDATE Users SET password_hash = ?, must_change_password = ? WHERE uuid = ?",
      [password_hash, must_change_password ? 1 : 0, uuid]
    );

    // Fetch updated account
    const [updated] = await pool.execute(
      `SELECT u.uuid, u.employee_uuid, u.username, u.role_uuid, r.code as role, u.is_active, u.must_change_password,
              u.updated_at, e.first_name, e.last_name
       FROM Users u
       LEFT JOIN Roles r ON r.uuid = u.role_uuid
       LEFT JOIN Employees e ON e.uuid = u.employee_uuid
       WHERE u.uuid = ?`,
      [uuid]
    );

    // Audit log (without password in diff)
    await safeLogEvent({
      actorUuid: req.user?.uuid,
      action: "RESET_USER_PASSWORD",
      entityType: "USER",
      entityUuid: uuid,
      diff: { must_change_password },
      ipAddress: req.ip,
    });

    return sendSuccess(res, {
      status: 200,
      message: "Password reset successfully. User sessions have been cleared.",
      data: updated[0],
    });
  } catch (error) {
    console.error("resetAccountPassword error:", error);
    return sendError(res, {
      status: 500,
      message: "Failed to reset password.",
      error: "RESET_PASSWORD_ERROR",
    });
  }
};

