/**
 * RBAC Management Controller
 * 
 * Handles role-occupation mappings, user-occupation assignments,
 * scope management, delegations, and audit log queries.
 */

const { v4: uuidv4 } = require("uuid");
const { executeQuery } = require("../utils/dbQuery");
const { sendSuccess, sendError } = require("../utils/response");
const permissionService = require("../services/permissionService");
const auditService = require("../services/auditService");

// ═══════════════════════════════════════════════════════════════════════
// ROLE-OCCUPATION MANAGEMENT
// ═══════════════════════════════════════════════════════════════════════

/**
 * Assign an occupation to a role (default permission for all users with that role)
 * POST /api/rbac/roles/:role/occupations
 */
async function assignOccupationToRole(req, res) {
  try {
    const { role } = req.params;
    const { occupation_uuid, assigned_reason } = req.body;
    
    // Validate role
    const validRoles = ['EMPLOYEE', 'DEPARTMENT_HEAD', 'HR_OFFICER', 'HR_ADMIN', 'SUPER_ADMIN'];
    if (!validRoles.includes(role)) {
      return sendError(res, {
        status: 400,
        message: `Invalid role. Must be one of: ${validRoles.join(', ')}`,
        error: "INVALID_ROLE"
      });
    }
    
    // Validate occupation exists
    const [occupations] = await executeQuery(
      `SELECT uuid, name FROM Occupations WHERE uuid = ?`,
      [occupation_uuid]
    );
    
    if (occupations.length === 0) {
      return sendError(res, {
        status: 404,
        message: "Occupation not found.",
        error: "OCCUPATION_NOT_FOUND"
      });
    }
    
    const occupation = occupations[0];
    
    // Check if mapping already exists
    const [existing] = await executeQuery(
      `SELECT uuid FROM RoleOccupations WHERE role = ? AND occupation_uuid = ?`,
      [role, occupation_uuid]
    );
    
    if (existing.length > 0) {
      return sendError(res, {
        status: 409,
        message: "This occupation is already assigned to the role.",
        error: "DUPLICATE_ASSIGNMENT"
      });
    }
    
    // Create assignment
    const uuid = uuidv4();
    await executeQuery(
      `INSERT INTO RoleOccupations (uuid, role, occupation_uuid, assigned_by_uuid, assigned_reason)
       VALUES (?, ?, ?, ?, ?)`,
      [uuid, role, occupation_uuid, req.user.uuid, assigned_reason || null]
    );
    
    // Audit log
    await auditService.logRoleOccupationAssigned(
      req.user.uuid,
      role,
      occupation.name,
      assigned_reason || 'Role-occupation mapping created',
      req.ip
    );
    
    // Get created record
    const [created] = await executeQuery(
      `SELECT ro.*, o.name as occupation_name
       FROM RoleOccupations ro
       JOIN Occupations o ON ro.occupation_uuid = o.uuid
       WHERE ro.uuid = ?`,
      [uuid]
    );
    
    return sendSuccess(res, {
      message: "Occupation assigned to role successfully.",
      data: created[0]
    });
  } catch (error) {
    console.error("Error assigning occupation to role:", error);
    return sendError(res, {
      status: 500,
      message: "Failed to assign occupation to role.",
      error: "INTERNAL_ERROR"
    });
  }
}

/**
 * Remove an occupation from a role
 * DELETE /api/rbac/roles/:role/occupations/:occupation_uuid
 */
async function removeOccupationFromRole(req, res) {
  try {
    const { role, occupation_uuid } = req.params;
    
    // Get occupation name for audit log
    const [occupations] = await executeQuery(
      `SELECT name FROM Occupations WHERE uuid = ?`,
      [occupation_uuid]
    );
    
    if (occupations.length === 0) {
      return sendError(res, {
        status: 404,
        message: "Occupation not found.",
        error: "OCCUPATION_NOT_FOUND"
      });
    }
    
    const occupationName = occupations[0].name;
    
    // Delete assignment
    const [result] = await executeQuery(
      `DELETE FROM RoleOccupations WHERE role = ? AND occupation_uuid = ?`,
      [role, occupation_uuid]
    );
    
    if (result.affectedRows === 0) {
      return sendError(res, {
        status: 404,
        message: "Role-occupation mapping not found.",
        error: "MAPPING_NOT_FOUND"
      });
    }
    
    // Audit log
    await auditService.logRoleOccupationRemoved(
      req.user.uuid,
      role,
      occupationName,
      'Role-occupation mapping removed',
      req.ip
    );
    
    // Note: Users with this role will lose the occupation on next login (token refresh)
    
    return sendSuccess(res, {
      message: "Occupation removed from role successfully. Users will lose this permission on next login.",
      data: { role, occupation_uuid, occupationName }
    });
  } catch (error) {
    console.error("Error removing occupation from role:", error);
    return sendError(res, {
      status: 500,
      message: "Failed to remove occupation from role.",
      error: "INTERNAL_ERROR"
    });
  }
}

/**
 * Get all occupations assigned to a role
 * GET /api/rbac/roles/:role/occupations
 */
async function getRoleOccupations(req, res) {
  try {
    const { role } = req.params;
    
    const [occupations] = await executeQuery(
      `SELECT ro.uuid as assignment_uuid, ro.assigned_at, ro.assigned_reason,
              o.uuid as occupation_uuid, o.name as occupation_name, o.description as occupation_description
       FROM RoleOccupations ro
       JOIN Occupations o ON ro.occupation_uuid = o.uuid
       WHERE ro.role = ?
       ORDER BY o.name`,
      [role]
    );
    
    return sendSuccess(res, {
      data: { role, occupations, count: occupations.length }
    });
  } catch (error) {
    console.error("Error getting role occupations:", error);
    return sendError(res, {
      status: 500,
      message: "Failed to get role occupations.",
      error: "INTERNAL_ERROR"
    });
  }
}

// ═══════════════════════════════════════════════════════════════════════
// USER-OCCUPATION MANAGEMENT
// ═══════════════════════════════════════════════════════════════════════

/**
 * Assign occupation directly to a user
 * POST /api/rbac/users/:user_uuid/occupations
 */
async function assignOccupationToUser(req, res) {
  try {
    const { user_uuid } = req.params;
    const { occupation_uuid, expires_at, assigned_reason } = req.body;
    
    // Validate user exists and get employee_uuid
    const [users] = await executeQuery(
      `SELECT u.uuid, u.employee_uuid, u.username, e.first_name, e.last_name
       FROM Users u
       LEFT JOIN Employees e ON u.employee_uuid = e.uuid
       WHERE u.uuid = ?`,
      [user_uuid]
    );
    
    if (users.length === 0) {
      return sendError(res, {
        status: 404,
        message: "User not found.",
        error: "USER_NOT_FOUND"
      });
    }
    
    const user = users[0];
    
    if (!user.employee_uuid) {
      return sendError(res, {
        status: 400,
        message: "User has no linked employee record. Cannot assign occupations.",
        error: "NO_EMPLOYEE_RECORD"
      });
    }
    
    // Validate occupation exists
    const [occupations] = await executeQuery(
      `SELECT uuid, name FROM Occupations WHERE uuid = ?`,
      [occupation_uuid]
    );
    
    if (occupations.length === 0) {
      return sendError(res, {
        status: 404,
        message: "Occupation not found.",
        error: "OCCUPATION_NOT_FOUND"
      });
    }
    
    const occupation = occupations[0];
    
    // Check if already assigned
    const [existing] = await executeQuery(
      `SELECT uuid FROM EmployeeOccupations 
       WHERE employee_uuid = ? AND occupation_uuid = ?`,
      [user.employee_uuid, occupation_uuid]
    );
    
    if (existing.length > 0) {
      return sendError(res, {
        status: 409,
        message: "This occupation is already assigned to the user.",
        error: "DUPLICATE_ASSIGNMENT"
      });
    }
    
    // Create assignment
    const assignmentUuid = uuidv4();
    await executeQuery(
      `INSERT INTO EmployeeOccupations (uuid, employee_uuid, occupation_uuid, expires_at, assigned_reason)
       VALUES (?, ?, ?, ?, ?)`,
      [assignmentUuid, user.employee_uuid, occupation_uuid, expires_at || null, assigned_reason || null]
    );
    
    // Audit log
    await auditService.logOccupationAssigned(
      req.user.uuid,
      user_uuid,
      occupation.name,
      expires_at,
      assigned_reason || 'Direct occupation assignment',
      req.ip
    );
    
    // Revoke user tokens to force re-login with new permissions
    await permissionService.revokeUserTokens(
      user_uuid,
      `Occupation "${occupation.name}" assigned`
    );
    
    return sendSuccess(res, {
      message: "Occupation assigned to user successfully. User must re-login to receive new permissions.",
      data: {
        assignment_uuid: assignmentUuid,
        user_uuid,
        username: user.username,
        occupation_uuid,
        occupation_name: occupation.name,
        expires_at: expires_at || null
      }
    });
  } catch (error) {
    console.error("Error assigning occupation to user:", error);
    return sendError(res, {
      status: 500,
      message: "Failed to assign occupation to user.",
      error: "INTERNAL_ERROR"
    });
  }
}

/**
 * Remove occupation from a user
 * DELETE /api/rbac/users/:user_uuid/occupations/:occupation_uuid
 */
async function removeOccupationFromUser(req, res) {
  try {
    const { user_uuid, occupation_uuid } = req.params;
    const { reason } = req.body;
    
    // Get user and occupation info
    const [users] = await executeQuery(
      `SELECT u.uuid, u.employee_uuid, u.username FROM Users u WHERE u.uuid = ?`,
      [user_uuid]
    );
    
    if (users.length === 0) {
      return sendError(res, {
        status: 404,
        message: "User not found.",
        error: "USER_NOT_FOUND"
      });
    }
    
    const user = users[0];
    
    const [occupations] = await executeQuery(
      `SELECT name FROM Occupations WHERE uuid = ?`,
      [occupation_uuid]
    );
    
    if (occupations.length === 0) {
      return sendError(res, {
        status: 404,
        message: "Occupation not found.",
        error: "OCCUPATION_NOT_FOUND"
      });
    }
    
    const occupationName = occupations[0].name;
    
    // Delete assignment
    const [result] = await executeQuery(
      `DELETE FROM EmployeeOccupations 
       WHERE employee_uuid = ? AND occupation_uuid = ?`,
      [user.employee_uuid, occupation_uuid]
    );
    
    if (result.affectedRows === 0) {
      return sendError(res, {
        status: 404,
        message: "User does not have this occupation assigned.",
        error: "ASSIGNMENT_NOT_FOUND"
      });
    }
    
    // Audit log
    await auditService.logOccupationRemoved(
      req.user.uuid,
      user_uuid,
      occupationName,
      reason || 'Direct occupation removal',
      req.ip
    );
    
    // Revoke user tokens
    await permissionService.revokeUserTokens(
      user_uuid,
      `Occupation "${occupationName}" removed`
    );
    
    return sendSuccess(res, {
      message: "Occupation removed from user successfully. User must re-login.",
      data: { user_uuid, username: user.username, occupation_uuid, occupationName }
    });
  } catch (error) {
    console.error("Error removing occupation from user:", error);
    return sendError(res, {
      status: 500,
      message: "Failed to remove occupation from user.",
      error: "INTERNAL_ERROR"
    });
  }
}

/**
 * Get effective occupations for a user (role + direct + delegations)
 * GET /api/rbac/users/:user_uuid/occupations
 */
async function getUserOccupations(req, res) {
  try {
    const { user_uuid } = req.params;
    
    // Get user info
    const [users] = await executeQuery(
      `SELECT u.uuid, u.username, u.role, u.employee_uuid 
       FROM Users u WHERE u.uuid = ?`,
      [user_uuid]
    );
    
    if (users.length === 0) {
      return sendError(res, {
        status: 404,
        message: "User not found.",
        error: "USER_NOT_FOUND"
      });
    }
    
    const user = users[0];
    
    // Get occupation breakdown
    const breakdown = await permissionService.getOccupationBreakdown(
      user.uuid,
      user.role,
      user.employee_uuid
    );
    
    return sendSuccess(res, {
      data: {
        user_uuid: user.uuid,
        username: user.username,
        role: user.role,
        occupations: {
          fromRole: breakdown.role,
          directAssignments: breakdown.direct,
          effective: breakdown.effective
        },
        effectiveCount: breakdown.effective.length
      }
    });
  } catch (error) {
    console.error("Error getting user occupations:", error);
    return sendError(res, {
      status: 500,
      message: "Failed to get user occupations.",
      error: "INTERNAL_ERROR"
    });
  }
}

/**
 * Get all users with their employee information (for RBAC UI)
 * GET /api/rbac/users
 */
async function listUsersForRBAC(req, res) {
  try {
    const { search, role, has_account } = req.query;
    
    let whereClause = "WHERE 1=1";
    const params = [];
    
    // Filter by role
    if (role) {
      whereClause += " AND u.role = ?";
      params.push(role);
    }
    
    // Search filter (employee name, mesob_id, or username)
    if (search) {
      whereClause += ` AND (
        e.first_name LIKE ? OR 
        e.middle_name LIKE ? OR 
        e.last_name LIKE ? OR 
        e.mesob_id LIKE ? OR 
        u.username LIKE ?
      )`;
      const searchTerm = `%${search}%`;
      params.push(searchTerm, searchTerm, searchTerm, searchTerm, searchTerm);
    }
    
    // Query users with employee info
    const [users] = await executeQuery(
      `SELECT 
        u.uuid as user_uuid,
        u.username,
        u.role as user_role,
        u.employee_uuid,
        u.token_version,
        u.permissions_version,
        e.uuid as employee_uuid,
        e.mesob_id,
        e.first_name,
        e.middle_name,
        e.last_name,
        e.status as employee_status,
        e.department_uuid,
        d.name as department_name,
        e.position_uuid,
        p.title as position_title
       FROM Users u
       LEFT JOIN Employees e ON u.employee_uuid = e.uuid
       LEFT JOIN Departments d ON e.department_uuid = d.uuid
       LEFT JOIN Positions p ON e.position_uuid = p.uuid
       ${whereClause}
       ORDER BY e.first_name, e.last_name`,
      params
    );
    
    // If has_account filter is specified, also get employees without accounts
    let employeesWithoutAccounts = [];
    if (has_account === 'false' || has_account === 'all') {
      let empWhereClause = "WHERE e.status = 'ACTIVE' AND NOT EXISTS (SELECT 1 FROM Users u WHERE u.employee_uuid = e.uuid)";
      const empParams = [];
      
      if (search) {
        empWhereClause += ` AND (
          e.first_name LIKE ? OR 
          e.middle_name LIKE ? OR 
          e.last_name LIKE ? OR 
          e.mesob_id LIKE ?
        )`;
        const searchTerm = `%${search}%`;
        empParams.push(searchTerm, searchTerm, searchTerm, searchTerm);
      }
      
      const [empWithoutAccount] = await executeQuery(
        `SELECT 
          NULL as user_uuid,
          NULL as username,
          NULL as user_role,
          e.uuid as employee_uuid,
          NULL as token_version,
          NULL as permissions_version,
          e.mesob_id,
          e.first_name,
          e.middle_name,
          e.last_name,
          e.status as employee_status,
          e.department_uuid,
          d.name as department_name,
          e.position_uuid,
          p.title as position_title,
          1 as no_account
         FROM Employees e
         LEFT JOIN Departments d ON e.department_uuid = d.uuid
         LEFT JOIN Positions p ON e.position_uuid = p.uuid
         ${empWhereClause}
         ORDER BY e.first_name, e.last_name`,
        empParams
      );
      
      if (has_account === 'false') {
        employeesWithoutAccounts = empWithoutAccount;
      } else if (has_account === 'all') {
        employeesWithoutAccounts = empWithoutAccount;
      }
    }
    
    // Combine results
    let allResults = users;
    if (has_account === 'false') {
      allResults = employeesWithoutAccounts;
    } else if (has_account === 'all') {
      allResults = [...users, ...employeesWithoutAccounts];
    }
    
    return sendSuccess(res, {
      data: {
        users: allResults,
        count: allResults.length,
        with_accounts: users.length,
        without_accounts: employeesWithoutAccounts.length
      }
    });
  } catch (error) {
    console.error("Error listing users for RBAC:", error);
    return sendError(res, {
      status: 500,
      message: "Failed to list users.",
      error: "INTERNAL_ERROR"
    });
  }
}

// ═══════════════════════════════════════════════════════════════════════
// SCOPE MANAGEMENT
// ═══════════════════════════════════════════════════════════════════════

/**
 * Assign a scope to a user
 * POST /api/rbac/users/:user_uuid/scopes
 */
async function assignScopeToUser(req, res) {
  try {
    const { user_uuid } = req.params;
    const { scope_type, scope_value, assigned_reason } = req.body;
    
    // Validate scope_type
    const validScopes = ['SELF', 'DEPARTMENT', 'BRANCH', 'COMPANY', 'ALL'];
    if (!validScopes.includes(scope_type)) {
      return sendError(res, {
        status: 400,
        message: `Invalid scope_type. Must be one of: ${validScopes.join(', ')}`,
        error: "INVALID_SCOPE_TYPE"
      });
    }
    
    // Validate user exists
    const [users] = await executeQuery(
      `SELECT uuid, username FROM Users WHERE uuid = ?`,
      [user_uuid]
    );
    
    if (users.length === 0) {
      return sendError(res, {
        status: 404,
        message: "User not found.",
        error: "USER_NOT_FOUND"
      });
    }
    
    const user = users[0];
    
    // Create scope assignment
    const scopeUuid = uuidv4();
    await executeQuery(
      `INSERT INTO UserScopes (uuid, user_uuid, scope_type, scope_value, assigned_by_uuid, assigned_reason)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [scopeUuid, user_uuid, scope_type, scope_value || null, req.user.uuid, assigned_reason || null]
    );
    
    // Audit log
    await auditService.logScopeAssigned(
      req.user.uuid,
      user_uuid,
      scope_type,
      scope_value,
      assigned_reason || 'Scope assignment',
      req.ip
    );
    
    // Revoke tokens to force re-login with new scope
    await permissionService.revokeUserTokens(
      user_uuid,
      `Scope "${scope_type}" assigned`
    );
    
    return sendSuccess(res, {
      message: "Scope assigned to user successfully. User must re-login.",
      data: {
        scope_uuid: scopeUuid,
        user_uuid,
        username: user.username,
        scope_type,
        scope_value: scope_value || null
      }
    });
  } catch (error) {
    console.error("Error assigning scope to user:", error);
    return sendError(res, {
      status: 500,
      message: "Failed to assign scope to user.",
      error: "INTERNAL_ERROR"
    });
  }
}

/**
 * Remove a scope from a user
 * DELETE /api/rbac/users/:user_uuid/scopes/:scope_uuid
 */
async function removeScopeFromUser(req, res) {
  try {
    const { user_uuid, scope_uuid } = req.params;
    const { reason } = req.body;
    
    // Get scope info
    const [scopes] = await executeQuery(
      `SELECT scope_type, scope_value FROM UserScopes WHERE uuid = ? AND user_uuid = ?`,
      [scope_uuid, user_uuid]
    );
    
    if (scopes.length === 0) {
      return sendError(res, {
        status: 404,
        message: "Scope assignment not found.",
        error: "SCOPE_NOT_FOUND"
      });
    }
    
    const scope = scopes[0];
    
    // Delete scope
    await executeQuery(
      `DELETE FROM UserScopes WHERE uuid = ?`,
      [scope_uuid]
    );
    
    // Audit log
    await auditService.logScopeRemoved(
      req.user.uuid,
      user_uuid,
      scope.scope_type,
      reason || 'Scope removal',
      req.ip
    );
    
    // Revoke tokens
    await permissionService.revokeUserTokens(
      user_uuid,
      `Scope "${scope.scope_type}" removed`
    );
    
    return sendSuccess(res, {
      message: "Scope removed from user successfully. User must re-login.",
      data: { scope_uuid, user_uuid, scope_type: scope.scope_type }
    });
  } catch (error) {
    console.error("Error removing scope from user:", error);
    return sendError(res, {
      status: 500,
      message: "Failed to remove scope from user.",
      error: "INTERNAL_ERROR"
    });
  }
}

/**
 * Get all scopes assigned to a user
 * GET /api/rbac/users/:user_uuid/scopes
 */
async function getUserScopes(req, res) {
  try {
    const { user_uuid } = req.params;
    
    // Validate user exists
    const [users] = await executeQuery(
      `SELECT uuid, username FROM Users WHERE uuid = ?`,
      [user_uuid]
    );
    
    if (users.length === 0) {
      return sendError(res, {
        status: 404,
        message: "User not found.",
        error: "USER_NOT_FOUND"
      });
    }
    
    // Get scopes
    const scopes = await permissionService.getUserScopes(user_uuid);
    
    return sendSuccess(res, {
      data: {
        user_uuid,
        username: users[0].username,
        scopes,
        count: scopes.length
      }
    });
  } catch (error) {
    console.error("Error getting user scopes:", error);
    return sendError(res, {
      status: 500,
      message: "Failed to get user scopes.",
      error: "INTERNAL_ERROR"
    });
  }
}

// ═══════════════════════════════════════════════════════════════════════
// DELEGATION MANAGEMENT
// ═══════════════════════════════════════════════════════════════════════

/**
 * Create a delegation (temporary permission grant)
 * POST /api/rbac/delegations
 */
async function createDelegation(req, res) {
  try {
    const { delegatee_user_uuid, occupation_uuid, start_date, end_date, delegation_reason } = req.body;
    
    // Validate dates
    const start = new Date(start_date);
    const end = new Date(end_date);
    
    if (end <= start) {
      return sendError(res, {
        status: 400,
        message: "end_date must be after start_date.",
        error: "INVALID_DATE_RANGE"
      });
    }
    
    // Validate duration (max 30 days)
    const durationDays = (end - start) / (1000 * 60 * 60 * 24);
    if (durationDays > 30) {
      return sendError(res, {
        status: 400,
        message: "Delegation duration cannot exceed 30 days.",
        error: "DURATION_TOO_LONG"
      });
    }
    
    // Get occupation info
    const [occupations] = await executeQuery(
      `SELECT uuid, name FROM Occupations WHERE uuid = ?`,
      [occupation_uuid]
    );
    
    if (occupations.length === 0) {
      return sendError(res, {
        status: 404,
        message: "Occupation not found.",
        error: "OCCUPATION_NOT_FOUND"
      });
    }
    
    const occupation = occupations[0];
    
    // Validate delegation (checks privilege escalation, circular delegation, chains)
    const validation = await permissionService.validateDelegation(
      req.user.uuid,
      delegatee_user_uuid,
      occupation_uuid,
      occupation.name,
      req.user.role,
      req.user.employee_uuid
    );
    
    if (!validation.valid) {
      return sendError(res, {
        status: 403,
        message: validation.error,
        error: "DELEGATION_VALIDATION_FAILED"
      });
    }
    
    // Validate delegatee exists
    const [delegatees] = await executeQuery(
      `SELECT uuid, username FROM Users WHERE uuid = ?`,
      [delegatee_user_uuid]
    );
    
    if (delegatees.length === 0) {
      return sendError(res, {
        status: 404,
        message: "Delegatee user not found.",
        error: "DELEGATEE_NOT_FOUND"
      });
    }
    
    const delegatee = delegatees[0];
    
    // Create delegation
    const delegationUuid = uuidv4();
    await executeQuery(
      `INSERT INTO OccupationDelegations 
       (uuid, delegator_user_uuid, delegatee_user_uuid, occupation_uuid, start_date, end_date, delegation_reason, delegation_chain_level, original_delegator_uuid)
       VALUES (?, ?, ?, ?, ?, ?, ?, 1, ?)`,
      [delegationUuid, req.user.uuid, delegatee_user_uuid, occupation_uuid, start_date, end_date, delegation_reason || null, req.user.uuid]
    );
    
    // Audit log
    await auditService.logDelegationCreated(
      req.user.uuid,
      delegatee_user_uuid,
      occupation.name,
      start_date,
      end_date,
      delegation_reason || 'Permission delegation',
      req.ip
    );
    
    // Revoke delegatee tokens (they gain new permission)
    await permissionService.incrementPermissionsVersion(
      delegatee_user_uuid,
      `Delegation received: "${occupation.name}" from ${req.user.username}`
    );
    
    return sendSuccess(res, {
      message: "Delegation created successfully. Delegatee must re-login to receive permissions.",
      data: {
        delegation_uuid: delegationUuid,
        delegator_uuid: req.user.uuid,
        delegator_username: req.user.username,
        delegatee_uuid: delegatee_user_uuid,
        delegatee_username: delegatee.username,
        occupation_name: occupation.name,
        start_date,
        end_date
      }
    });
  } catch (error) {
    console.error("Error creating delegation:", error);
    return sendError(res, {
      status: 500,
      message: "Failed to create delegation.",
      error: "INTERNAL_ERROR"
    });
  }
}

/**
 * Revoke a delegation early
 * DELETE /api/rbac/delegations/:delegation_uuid
 */
async function revokeDelegation(req, res) {
  try {
    const { delegation_uuid } = req.params;
    const { reason } = req.body;
    
    // Get delegation info
    const [delegations] = await executeQuery(
      `SELECT od.*, o.name as occupation_name, u.username as delegatee_username
       FROM OccupationDelegations od
       JOIN Occupations o ON od.occupation_uuid = o.uuid
       JOIN Users u ON od.delegatee_user_uuid = u.uuid
       WHERE od.uuid = ?`,
      [delegation_uuid]
    );
    
    if (delegations.length === 0) {
      return sendError(res, {
        status: 404,
        message: "Delegation not found.",
        error: "DELEGATION_NOT_FOUND"
      });
    }
    
    const delegation = delegations[0];
    
    // Validate requester is delegator or admin
    if (delegation.delegator_user_uuid !== req.user.uuid && req.user.role !== 'SUPER_ADMIN' && req.user.role !== 'HR_ADMIN') {
      return sendError(res, {
        status: 403,
        message: "Only the delegator or administrators can revoke a delegation.",
        error: "CANNOT_REVOKE"
      });
    }
    
    // Check if already revoked
    if (delegation.revoked_at) {
      return sendError(res, {
        status: 400,
        message: "This delegation is already revoked.",
        error: "ALREADY_REVOKED"
      });
    }
    
    // Revoke delegation
    await executeQuery(
      `UPDATE OccupationDelegations 
       SET revoked_at = CURRENT_TIMESTAMP, revoked_by_uuid = ?
       WHERE uuid = ?`,
      [req.user.uuid, delegation_uuid]
    );
    
    // Audit log
    await auditService.logDelegationRevoked(
      req.user.uuid,
      delegation.delegatee_user_uuid,
      delegation.occupation_name,
      reason || 'Delegation revoked early',
      req.ip
    );
    
    // Revoke delegatee tokens (they lose permission)
    await permissionService.revokeUserTokens(
      delegation.delegatee_user_uuid,
      `Delegation revoked: "${delegation.occupation_name}"`
    );
    
    return sendSuccess(res, {
      message: "Delegation revoked successfully. Delegatee must re-login.",
      data: {
        delegation_uuid,
        delegatee_uuid: delegation.delegatee_user_uuid,
        delegatee_username: delegation.delegatee_username,
        occupation_name: delegation.occupation_name
      }
    });
  } catch (error) {
    console.error("Error revoking delegation:", error);
    return sendError(res, {
      status: 500,
      message: "Failed to revoke delegation.",
      error: "INTERNAL_ERROR"
    });
  }
}

/**
 * Get delegations for the current user (as delegator or delegatee)
 * GET /api/rbac/delegations
 */
async function getDelegations(req, res) {
  try {
    const { as } = req.query; // 'delegator', 'delegatee', or 'both' (default)
    
    let whereClause = '';
    if (as === 'delegator') {
      whereClause = 'WHERE od.delegator_user_uuid = ?';
    } else if (as === 'delegatee') {
      whereClause = 'WHERE od.delegatee_user_uuid = ?';
    } else {
      // Both
      whereClause = 'WHERE (od.delegator_user_uuid = ? OR od.delegatee_user_uuid = ?)';
    }
    
    const params = as === 'both' || !as 
      ? [req.user.uuid, req.user.uuid]
      : [req.user.uuid];
    
    const [delegations] = await executeQuery(
      `SELECT 
        od.*,
        o.name as occupation_name,
        delegator.username as delegator_username,
        delegatee.username as delegatee_username,
        revoker.username as revoked_by_username,
        CASE 
          WHEN od.revoked_at IS NOT NULL THEN 'REVOKED'
          WHEN NOW() < od.start_date THEN 'PENDING'
          WHEN NOW() > od.end_date THEN 'EXPIRED'
          ELSE 'ACTIVE'
        END as status
       FROM OccupationDelegations od
       JOIN Occupations o ON od.occupation_uuid = o.uuid
       JOIN Users delegator ON od.delegator_user_uuid = delegator.uuid
       JOIN Users delegatee ON od.delegatee_user_uuid = delegatee.uuid
       LEFT JOIN Users revoker ON od.revoked_by_uuid = revoker.uuid
       ${whereClause}
       ORDER BY od.created_at DESC`,
      params
    );
    
    return sendSuccess(res, {
      data: { delegations, count: delegations.length }
    });
  } catch (error) {
    console.error("Error getting delegations:", error);
    return sendError(res, {
      status: 500,
      message: "Failed to get delegations.",
      error: "INTERNAL_ERROR"
    });
  }
}

// ═══════════════════════════════════════════════════════════════════════
// AUDIT LOG QUERIES
// ═══════════════════════════════════════════════════════════════════════

/**
 * Query audit logs with filters
 * GET /api/rbac/audit-logs
 */
async function getAuditLogs(req, res) {
  try {
    const {
      actor_user_uuid,
      target_user_uuid,
      action_type,
      start_date,
      end_date,
      page = 1,
      limit = 20
    } = req.query;
    
    const result = await auditService.queryAuditLogs({
      actor_user_uuid,
      target_user_uuid,
      action_type,
      start_date,
      end_date,
      page: parseInt(page),
      limit: parseInt(limit)
    });
    
    return sendSuccess(res, { data: result });
  } catch (error) {
    console.error("Error querying audit logs:", error);
    return sendError(res, {
      status: 500,
      message: "Failed to query audit logs.",
      error: "INTERNAL_ERROR"
    });
  }
}

// ═══════════════════════════════════════════════════════════════════════
// EFFECTIVE ACCESS ENDPOINT (Debugging & Administration)
// ═══════════════════════════════════════════════════════════════════════

/**
 * Get complete effective access breakdown for a user
 * GET /api/rbac/users/:user_uuid/effective-access
 * 
 * Purpose: Debugging, administration, permission troubleshooting, audit investigations
 */
async function getEffectiveAccess(req, res) {
  try {
    const { user_uuid } = req.params;
    
    // Get user info
    const [users] = await executeQuery(
      `SELECT u.uuid, u.username, u.role, u.employee_uuid, u.token_version, u.permissions_version
       FROM Users u WHERE u.uuid = ?`,
      [user_uuid]
    );
    
    if (users.length === 0) {
      return sendError(res, {
        status: 404,
        message: "User not found.",
        error: "USER_NOT_FOUND"
      });
    }
    
    const user = users[0];
    
    // Get occupation breakdown
    const breakdown = await permissionService.getOccupationBreakdown(
      user.uuid,
      user.role,
      user.employee_uuid
    );
    
    return sendSuccess(res, {
      data: {
        user_uuid: user.uuid,
        username: user.username,
        role: user.role,
        token_version: user.token_version,
        permissions_version: user.permissions_version,
        roleOccupations: breakdown.role,
        directOccupations: breakdown.direct,
        effectiveOccupations: breakdown.effective,
        summary: {
          total_effective: breakdown.effective.length,
          from_role: breakdown.role.length,
          from_direct: breakdown.direct.length
        }
      }
    });
  } catch (error) {
    console.error("Error getting effective access:", error);
    return sendError(res, {
      status: 500,
      message: "Failed to get effective access.",
      error: "INTERNAL_ERROR"
    });
  }
}

// ═══════════════════════════════════════════════════════════════════════
// PERMISSION OVERRIDES (ALLOW/DENY)
// ═══════════════════════════════════════════════════════════════════════

/**
 * Add permission override (ALLOW or DENY)
 * POST /api/rbac/users/:user_uuid/overrides
 */
async function addPermissionOverride(req, res) {
  try {
    const { user_uuid } = req.params;
    const { occupation_uuid, effect, reason } = req.body;
    
    // Validate effect
    if (!['ALLOW', 'DENY'].includes(effect)) {
      return sendError(res, {
        status: 400,
        message: "effect must be 'ALLOW' or 'DENY'.",
        error: "INVALID_EFFECT"
      });
    }
    
    // Validate user exists
    const [users] = await executeQuery(
      `SELECT uuid, username FROM Users WHERE uuid = ?`,
      [user_uuid]
    );
    
    if (users.length === 0) {
      return sendError(res, {
        status: 404,
        message: "User not found.",
        error: "USER_NOT_FOUND"
      });
    }
    
    // Validate occupation exists
    const [occupations] = await executeQuery(
      `SELECT uuid, name FROM Occupations WHERE uuid = ?`,
      [occupation_uuid]
    );
    
    if (occupations.length === 0) {
      return sendError(res, {
        status: 404,
        message: "Occupation not found.",
        error: "OCCUPATION_NOT_FOUND"
      });
    }
    
    const user = users[0];
    const occupation = occupations[0];
    
    // Check if override already exists
    const [existing] = await executeQuery(
      `SELECT uuid, effect FROM UserPermissionOverrides 
       WHERE user_uuid = ? AND occupation_uuid = ?`,
      [user_uuid, occupation_uuid]
    );
    
    if (existing.length > 0) {
      // Update existing override
      await executeQuery(
        `UPDATE UserPermissionOverrides 
         SET effect = ?, created_by_uuid = ?, reason = ?, created_at = CURRENT_TIMESTAMP
         WHERE uuid = ?`,
        [effect, req.user.uuid, reason || null, existing[0].uuid]
      );
      
      // Audit log
      await auditService.auditLog({
        actor_user_uuid: req.user.uuid,
        target_user_uuid: user_uuid,
        action_type: 'PERMISSION_OVERRIDE_ADDED',
        resource_type: 'OCCUPATION',
        old_value: `${occupation.name} (${existing[0].effect})`,
        new_value: `${occupation.name} (${effect})`,
        reason: reason || 'Permission override updated',
        ip_address: req.ip
      });
    } else {
      // Create new override
      const overrideUuid = uuidv4();
      await executeQuery(
        `INSERT INTO UserPermissionOverrides (uuid, user_uuid, occupation_uuid, effect, created_by_uuid, reason)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [overrideUuid, user_uuid, occupation_uuid, effect, req.user.uuid, reason || null]
      );
      
      // Audit log
      await auditService.auditLog({
        actor_user_uuid: req.user.uuid,
        target_user_uuid: user_uuid,
        action_type: 'PERMISSION_OVERRIDE_ADDED',
        resource_type: 'OCCUPATION',
        new_value: `${occupation.name} (${effect})`,
        reason: reason || 'Permission override added',
        ip_address: req.ip
      });
    }
    
    // Revoke user tokens
    await permissionService.incrementPermissionsVersion(
      user_uuid,
      `Permission override: ${effect} ${occupation.name}`
    );
    
    return sendSuccess(res, {
      message: `Permission override ${effect} added successfully. User must re-login.`,
      data: {
        user_uuid,
        username: user.username,
        occupation_uuid,
        occupation_name: occupation.name,
        effect
      }
    });
  } catch (error) {
    console.error("Error adding permission override:", error);
    return sendError(res, {
      status: 500,
      message: "Failed to add permission override.",
      error: "INTERNAL_ERROR"
    });
  }
}

/**
 * Remove permission override
 * DELETE /api/rbac/users/:user_uuid/overrides/:occupation_uuid
 */
async function removePermissionOverride(req, res) {
  try {
    const { user_uuid, occupation_uuid } = req.params;
    
    // Get occupation info
    const [occupations] = await executeQuery(
      `SELECT name FROM Occupations WHERE uuid = ?`,
      [occupation_uuid]
    );
    
    if (occupations.length === 0) {
      return sendError(res, {
        status: 404,
        message: "Occupation not found.",
        error: "OCCUPATION_NOT_FOUND"
      });
    }
    
    const occupationName = occupations[0].name;
    
    // Delete override
    const [result] = await executeQuery(
      `DELETE FROM UserPermissionOverrides WHERE user_uuid = ? AND occupation_uuid = ?`,
      [user_uuid, occupation_uuid]
    );
    
    if (result.affectedRows === 0) {
      return sendError(res, {
        status: 404,
        message: "Permission override not found.",
        error: "OVERRIDE_NOT_FOUND"
      });
    }
    
    // Audit log
    await auditService.auditLog({
      actor_user_uuid: req.user.uuid,
      target_user_uuid: user_uuid,
      action_type: 'PERMISSION_OVERRIDE_REMOVED',
      resource_type: 'OCCUPATION',
      old_value: occupationName,
      reason: 'Permission override removed',
      ip_address: req.ip
    });
    
    // Revoke user tokens
    await permissionService.incrementPermissionsVersion(
      user_uuid,
      `Permission override removed: ${occupationName}`
    );
    
    return sendSuccess(res, {
      message: "Permission override removed successfully. User must re-login.",
      data: { user_uuid, occupation_uuid, occupationName }
    });
  } catch (error) {
    console.error("Error removing permission override:", error);
    return sendError(res, {
      status: 500,
      message: "Failed to remove permission override.",
      error: "INTERNAL_ERROR"
    });
  }
}

/**
 * Get all permission overrides for a user
 * GET /api/rbac/users/:user_uuid/overrides
 */
async function getUserOverrides(req, res) {
  try {
    const { user_uuid } = req.params;
    
    const [overrides] = await executeQuery(
      `SELECT upo.uuid, upo.effect, upo.created_at, upo.reason,
              o.uuid as occupation_uuid, o.name as occupation_name
       FROM UserPermissionOverrides upo
       JOIN Occupations o ON upo.occupation_uuid = o.uuid
       WHERE upo.user_uuid = ?
       ORDER BY upo.created_at DESC`,
      [user_uuid]
    );
    
    return sendSuccess(res, {
      data: {
        user_uuid,
        overrides,
        count: overrides.length
      }
    });
  } catch (error) {
    console.error("Error getting user overrides:", error);
    return sendError(res, {
      status: 500,
      message: "Failed to get user overrides.",
      error: "INTERNAL_ERROR"
    });
  }
}

/**
 * List all available occupations (permissions)
 * GET /api/rbac/occupations
 */
async function listOccupations(req, res) {
  try {
    const [occupations] = await executeQuery(
      `SELECT uuid, name, description, created_at 
       FROM Occupations 
       ORDER BY name`
    );
    
    return sendSuccess(res, {
      message: "Occupations retrieved successfully",
      data: { occupations }
    });
  } catch (error) {
    console.error("Error listing occupations:", error);
    return sendError(res, {
      status: 500,
      message: "Failed to list occupations.",
      error: "INTERNAL_ERROR"
    });
  }
}

// Export all functions
module.exports = {
  // Role-Occupation
  assignOccupationToRole,
  removeOccupationFromRole,
  getRoleOccupations,
  // User-Occupation
  assignOccupationToUser,
  removeOccupationFromUser,
  getUserOccupations,
  // User List for RBAC UI
  listUsersForRBAC,
  // Effective Access
  getEffectiveAccess,
  // Occupation List
  listOccupations
};
