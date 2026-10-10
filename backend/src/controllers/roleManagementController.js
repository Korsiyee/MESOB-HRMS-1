/**
 * Role Management Controller
 * 
 * Handles all role management operations:
 * - Role CRUD
 * - Permission assignment
 * - Data scope configuration
 * - User role assignment
 * - Permission overrides and delegations
 */

const rbacService = require("../services/rbacService");
const roleManagementService = require("../services/roleManagementService");
const permissionOverrideService = require("../services/permissionOverrideService");
const { sendSuccess, sendError } = require("../utils/response");
const asyncHandler = require("../middleware/asyncHandler");

// ============================================================================
// ROLE CRUD OPERATIONS
// ============================================================================

/**
 * Get all roles
 * GET /api/role-management/roles
 */
exports.getAllRoles = asyncHandler(async (req, res) => {
  const { includeInactive, systemOnly, customOnly } = req.query;
  
  const roles = await rbacService.getAllRoles({
    includeInactive: includeInactive === 'true',
    systemOnly: systemOnly === 'true',
    customOnly: customOnly === 'true'
  });
  
  sendSuccess(res, {
    message: "Roles retrieved successfully",
    data: { roles }
  });
});

/**
 * Get role by UUID with full details
 * GET /api/role-management/roles/:roleUuid
 */
exports.getRoleDetails = asyncHandler(async (req, res) => {
  const { roleUuid } = req.params;
  
  const role = await roleManagementService.getRoleWithDetails(roleUuid);
  
  if (!role) {
    return sendError(res, {
      status: 404,
      message: "Role not found",
      error: "NOT_FOUND"
    });
  }
  
  sendSuccess(res, {
    message: "Role details retrieved successfully",
    data: { role }
  });
});

/**
 * Create new custom role
 * POST /api/role-management/roles
 */
exports.createRole = asyncHandler(async (req, res) => {
  const { code, name, description, hierarchyLevel } = req.body;
  
  // Validate required fields
  if (!code || !name) {
    return sendError(res, {
      status: 400,
      message: "Role code and name are required",
      error: "INVALID_INPUT"
    });
  }
  
  // Validate code format (uppercase, underscore separated)
  if (!/^[A-Z_]+$/.test(code)) {
    return sendError(res, {
      status: 400,
      message: "Role code must contain only uppercase letters and underscores",
      error: "INVALID_CODE_FORMAT"
    });
  }
  
  const role = await roleManagementService.createRole(
    { code, name, description, hierarchyLevel },
    req.user.uuid
  );
  
  sendSuccess(res, {
    status: 201,
    message: "Role created successfully",
    data: { role }
  });
});

/**
 * Update role
 * PUT /api/role-management/roles/:roleUuid
 */
exports.updateRole = asyncHandler(async (req, res) => {
  const { roleUuid } = req.params;
  const { name, description, hierarchyLevel } = req.body;
  
  const role = await roleManagementService.updateRole(
    roleUuid,
    { name, description, hierarchyLevel },
    req.user.uuid
  );
  
  sendSuccess(res, {
    message: "Role updated successfully",
    data: { role }
  });
});

/**
 * Delete role
 * DELETE /api/role-management/roles/:roleUuid
 */
exports.deleteRole = asyncHandler(async (req, res) => {
  const { roleUuid } = req.params;
  
  await roleManagementService.deleteRole(roleUuid, req.user.uuid);
  
  sendSuccess(res, {
    message: "Role deleted successfully"
  });
});

/**
 * Activate/deactivate role
 * PATCH /api/role-management/roles/:roleUuid/status
 */
exports.setRoleStatus = asyncHandler(async (req, res) => {
  const { roleUuid } = req.params;
  const { is_active } = req.body;
  
  if (typeof is_active !== 'boolean') {
    return sendError(res, {
      status: 400,
      message: "is_active must be a boolean",
      error: "INVALID_INPUT"
    });
  }
  
  const role = await roleManagementService.setRoleActiveStatus(
    roleUuid,
    is_active,
    req.user.uuid
  );
  
  sendSuccess(res, {
    message: `Role ${is_active ? 'activated' : 'deactivated'} successfully`,
    data: { role }
  });
});

/**
 * Get users assigned to role
 * GET /api/role-management/roles/:roleUuid/users
 */
exports.getRoleUsers = asyncHandler(async (req, res) => {
  const { roleUuid } = req.params;
  
  const users = await roleManagementService.getUsersByRole(roleUuid);
  
  sendSuccess(res, {
    message: "Role users retrieved successfully",
    data: { users, count: users.length }
  });
});

// ============================================================================
// PERMISSIONS AND RESOURCES
// ============================================================================

/**
 * Get all permissions grouped by resource
 * GET /api/role-management/permissions
 */
exports.getAllPermissions = asyncHandler(async (req, res) => {
  const permissions = await rbacService.getAllPermissionsGrouped();
  
  sendSuccess(res, {
    message: "Permissions retrieved successfully",
    data: { resources: permissions }
  });
});

/**
 * Get all data scopes
 * GET /api/role-management/scopes
 */
exports.getAllScopes = asyncHandler(async (req, res) => {
  const scopes = await rbacService.getAllDataScopes();
  
  sendSuccess(res, {
    message: "Data scopes retrieved successfully",
    data: { scopes }
  });
});

// ============================================================================
// PERMISSION ASSIGNMENT
// ============================================================================

/**
 * Assign single permission to role
 * POST /api/role-management/roles/:roleUuid/permissions
 */
exports.assignPermission = asyncHandler(async (req, res) => {
  const { roleUuid } = req.params;
  const { permissionUuid } = req.body;
  
  if (!permissionUuid) {
    return sendError(res, {
      status: 400,
      message: "Permission UUID is required",
      error: "INVALID_INPUT"
    });
  }
  
  await roleManagementService.assignPermissionToRole(
    roleUuid,
    permissionUuid,
    req.user.uuid
  );
  
  sendSuccess(res, {
    message: "Permission assigned successfully"
  });
});

/**
 * Remove permission from role
 * DELETE /api/role-management/roles/:roleUuid/permissions/:permissionUuid
 */
exports.removePermission = asyncHandler(async (req, res) => {
  const { roleUuid, permissionUuid } = req.params;
  
  await roleManagementService.removePermissionFromRole(
    roleUuid,
    permissionUuid,
    req.user.uuid
  );
  
  sendSuccess(res, {
    message: "Permission removed successfully"
  });
});

/**
 * Bulk assign permissions to role
 * POST /api/role-management/roles/:roleUuid/permissions/bulk
 */
exports.bulkAssignPermissions = asyncHandler(async (req, res) => {
  const { roleUuid } = req.params;
  const { permissionUuids } = req.body;
  
  if (!Array.isArray(permissionUuids)) {
    return sendError(res, {
      status: 400,
      message: "permissionUuids must be an array",
      error: "INVALID_INPUT"
    });
  }
  
  const result = await roleManagementService.assignPermissionsToRole(
    roleUuid,
    permissionUuids,
    req.user.uuid
  );
  
  sendSuccess(res, {
    message: "Permissions assigned successfully",
    data: result
  });
});

/**
 * Replace all role permissions
 * PUT /api/role-management/roles/:roleUuid/permissions
 */
exports.replacePermissions = asyncHandler(async (req, res) => {
  const { roleUuid } = req.params;
  const { permissionUuids } = req.body;
  
  if (!Array.isArray(permissionUuids)) {
    return sendError(res, {
      status: 400,
      message: "permissionUuids must be an array",
      error: "INVALID_INPUT"
    });
  }
  
  const result = await roleManagementService.replaceRolePermissions(
    roleUuid,
    permissionUuids,
    req.user.uuid
  );
  
  sendSuccess(res, {
    message: "Role permissions updated successfully",
    data: result
  });
});

// ============================================================================
// SCOPE ASSIGNMENT
// ============================================================================

/**
 * Assign scope to role-permission
 * POST /api/role-management/roles/:roleUuid/permissions/:permissionUuid/scope
 */
exports.assignScope = asyncHandler(async (req, res) => {
  const { roleUuid, permissionUuid } = req.params;
  const { dataScopeUuid, configuration } = req.body;
  
  if (!dataScopeUuid) {
    return sendError(res, {
      status: 400,
      message: "Data scope UUID is required",
      error: "INVALID_INPUT"
    });
  }
  
  await roleManagementService.assignScopeToRolePermission(
    roleUuid,
    permissionUuid,
    dataScopeUuid,
    configuration,
    req.user.uuid
  );
  
  sendSuccess(res, {
    message: "Data scope assigned successfully"
  });
});

/**
 * Remove scope from role-permission
 * DELETE /api/role-management/roles/:roleUuid/permissions/:permissionUuid/scope
 */
exports.removeScope = asyncHandler(async (req, res) => {
  const { roleUuid, permissionUuid } = req.params;
  
  await roleManagementService.removeScopeFromRolePermission(
    roleUuid,
    permissionUuid,
    req.user.uuid
  );
  
  sendSuccess(res, {
    message: "Data scope removed successfully"
  });
});

// ============================================================================
// USER ROLE ASSIGNMENT
// ============================================================================

/**
 * Assign role to user
 * PUT /api/role-management/users/:userUuid/role
 */
exports.assignRoleToUser = asyncHandler(async (req, res) => {
  const { userUuid } = req.params;
  const { roleUuid } = req.body;
  
  if (!roleUuid) {
    return sendError(res, {
      status: 400,
      message: "Role UUID is required",
      error: "INVALID_INPUT"
    });
  }
  
  await roleManagementService.assignRoleToUser(
    userUuid,
    roleUuid,
    req.user.uuid
  );
  
  sendSuccess(res, {
    message: "Role assigned to user successfully. User must re-login for changes to take effect."
  });
});

// ============================================================================
// USER PERMISSION OVERRIDES
// ============================================================================

/**
 * Get user's permission overrides
 * GET /api/role-management/users/:userUuid/overrides/permissions
 */
exports.getUserPermissionOverrides = asyncHandler(async (req, res) => {
  const { userUuid } = req.params;
  
  const overrides = await permissionOverrideService.getUserOverrides(userUuid);
  
  sendSuccess(res, {
    message: "User permission overrides retrieved successfully",
    data: { overrides }
  });
});

/**
 * Add permission override for user
 * POST /api/role-management/users/:userUuid/overrides/permissions
 */
exports.addPermissionOverride = asyncHandler(async (req, res) => {
  const { userUuid } = req.params;
  const { permissionUuid, overrideType, reason, expiresAt } = req.body;
  
  if (!permissionUuid || !overrideType) {
    return sendError(res, {
      status: 400,
      message: "Permission UUID and override type are required",
      error: "INVALID_INPUT"
    });
  }
  
  const override = await permissionOverrideService.addPermissionOverride(
    { userUuid, permissionUuid, overrideType, reason, expiresAt },
    req.user.uuid
  );
  
  sendSuccess(res, {
    status: 201,
    message: "Permission override added successfully",
    data: { override }
  });
});

/**
 * Remove permission override
 * DELETE /api/role-management/overrides/permissions/:overrideUuid
 */
exports.removePermissionOverride = asyncHandler(async (req, res) => {
  const { overrideUuid } = req.params;
  
  await permissionOverrideService.removePermissionOverride(
    overrideUuid,
    req.user.uuid
  );
  
  sendSuccess(res, {
    message: "Permission override removed successfully"
  });
});

// ============================================================================
// USER SCOPE OVERRIDES
// ============================================================================

/**
 * Get user's scope overrides
 * GET /api/role-management/users/:userUuid/overrides/scopes
 */
exports.getUserScopeOverrides = asyncHandler(async (req, res) => {
  const { userUuid } = req.params;
  
  const overrides = await permissionOverrideService.getUserScopeOverrides(userUuid);
  
  sendSuccess(res, {
    message: "User scope overrides retrieved successfully",
    data: { overrides }
  });
});

/**
 * Add scope override for user
 * POST /api/role-management/users/:userUuid/overrides/scopes
 */
exports.addScopeOverride = asyncHandler(async (req, res) => {
  const { userUuid } = req.params;
  const { permissionUuid, dataScopeUuid, scopeConfiguration, reason, expiresAt } = req.body;
  
  if (!permissionUuid || !dataScopeUuid) {
    return sendError(res, {
      status: 400,
      message: "Permission UUID and data scope UUID are required",
      error: "INVALID_INPUT"
    });
  }
  
  const override = await permissionOverrideService.addScopeOverride(
    { userUuid, permissionUuid, dataScopeUuid, scopeConfiguration, reason, expiresAt },
    req.user.uuid
  );
  
  sendSuccess(res, {
    status: 201,
    message: "Scope override added successfully",
    data: { override }
  });
});

/**
 * Remove scope override
 * DELETE /api/role-management/overrides/scopes/:overrideUuid
 */
exports.removeScopeOverride = asyncHandler(async (req, res) => {
  const { overrideUuid } = req.params;
  
  await permissionOverrideService.removeScopeOverride(
    overrideUuid,
    req.user.uuid
  );
  
  sendSuccess(res, {
    message: "Scope override removed successfully"
  });
});

// ============================================================================
// PERMISSION DELEGATIONS
// ============================================================================

/**
 * Get user's delegations
 * GET /api/role-management/users/:userUuid/delegations
 */
exports.getUserDelegations = asyncHandler(async (req, res) => {
  const { userUuid } = req.params;
  const { direction } = req.query; // 'sent', 'received', or 'all'
  
  const delegations = await permissionOverrideService.getUserDelegations(
    userUuid,
    direction || 'all'
  );
  
  sendSuccess(res, {
    message: "User delegations retrieved successfully",
    data: { delegations }
  });
});

/**
 * Create delegation
 * POST /api/role-management/delegations
 */
exports.createDelegation = asyncHandler(async (req, res) => {
  const {
    fromUserUuid,
    toUserUuid,
    permissionUuid,
    dataScopeUuid,
    scopeConfiguration,
    reason,
    startsAt,
    expiresAt
  } = req.body;
  
  if (!fromUserUuid || !toUserUuid || !permissionUuid || !startsAt || !expiresAt) {
    return sendError(res, {
      status: 400,
      message: "From user, to user, permission, start date, and expiry date are required",
      error: "INVALID_INPUT"
    });
  }
  
  const delegation = await permissionOverrideService.createDelegation(
    {
      fromUserUuid,
      toUserUuid,
      permissionUuid,
      dataScopeUuid,
      scopeConfiguration,
      reason,
      startsAt,
      expiresAt
    },
    req.user.uuid
  );
  
  sendSuccess(res, {
    status: 201,
    message: "Delegation created successfully",
    data: { delegation }
  });
});

/**
 * Revoke delegation
 * DELETE /api/role-management/delegations/:delegationUuid
 */
exports.revokeDelegation = asyncHandler(async (req, res) => {
  const { delegationUuid } = req.params;
  
  await permissionOverrideService.revokeDelegation(
    delegationUuid,
    req.user.uuid
  );
  
  sendSuccess(res, {
    message: "Delegation revoked successfully"
  });
});

// ============================================================================
// USER PERMISSION INFO
// ============================================================================

/**
 * Get user's effective permissions (detailed)
 * GET /api/role-management/users/:userUuid/effective-permissions
 */
exports.getUserEffectivePermissions = asyncHandler(async (req, res) => {
  const { userUuid } = req.params;
  
  const permissionDetails = await rbacService.getUserPermissionsDetailed(userUuid);
  
  sendSuccess(res, {
    message: "User effective permissions retrieved successfully",
    data: permissionDetails
  });
});

/**
 * Get current user's permissions
 * GET /api/role-management/my-permissions
 */
exports.getMyPermissions = asyncHandler(async (req, res) => {
  const permissions = await rbacService.getUserPermissions(req.user.uuid);
  const role = await rbacService.getUserRole(req.user.uuid);
  
  sendSuccess(res, {
    message: "Your permissions retrieved successfully",
    data: {
      role,
      permissions
    }
  });
});

// ============================================================================
// AUDIT LOGS
// ============================================================================

/**
 * Get authorization audit logs
 * GET /api/role-management/audit-logs
 */
exports.getAuditLogs = asyncHandler(async (req, res) => {
  const { executeQuery } = require("../utils/dbQuery");
  const { limit = 100, offset = 0, actionType, actorUserUuid, targetUserUuid } = req.query;
  
  let whereClause = [];
  let params = [];
  
  if (actionType) {
    whereClause.push('action_type = ?');
    params.push(actionType);
  }
  
  if (actorUserUuid) {
    whereClause.push('actor_user_uuid = ?');
    params.push(actorUserUuid);
  }
  
  if (targetUserUuid) {
    whereClause.push('target_user_uuid = ?');
    params.push(targetUserUuid);
  }
  
  const where = whereClause.length > 0 ? 'WHERE ' + whereClause.join(' AND ') : '';
  
  const [logs] = await executeQuery(
    `SELECT aal.*, 
            actor.username as actor_username,
            target.username as target_username
     FROM AuthorizationAuditLogs aal
     LEFT JOIN Users actor ON aal.actor_user_uuid = actor.uuid
     LEFT JOIN Users target ON aal.target_user_uuid = target.uuid
     ${where}
     ORDER BY aal.created_at DESC
     LIMIT ? OFFSET ?`,
    [...params, parseInt(limit), parseInt(offset)]
  );
  
  const [countResult] = await executeQuery(
    `SELECT COUNT(*) as total FROM AuthorizationAuditLogs aal ${where}`,
    params
  );
  
  sendSuccess(res, {
    message: "Audit logs retrieved successfully",
    data: {
      logs,
      pagination: {
        total: countResult[0].total,
        limit: parseInt(limit),
        offset: parseInt(offset)
      }
    }
  });
});

/**
 * Get permissions for a specific role
 * GET /api/role-management/roles/:roleUuid/permissions
 */
exports.getRolePermissions = asyncHandler(async (req, res) => {
  const { roleUuid } = req.params;
  
  // Get role with permissions from service
  const roleDetails = await roleManagementService.getRoleWithDetails(roleUuid);
  
  if (!roleDetails) {
    return sendError(res, {
      status: 404,
      message: "Role not found",
      error: "NOT_FOUND"
    });
  }
  
  sendSuccess(res, {
    message: "Role permissions retrieved successfully",
    data: { permissions: roleDetails.permissions || [] }
  });
});

/**
 * Get role-specific audit logs
 * GET /api/role-management/roles/:roleUuid/audit-logs
 */
exports.getRoleAuditLogs = asyncHandler(async (req, res) => {
  const { executeQuery } = require("../utils/dbQuery");
  const { roleUuid } = req.params;
  const { limit = 50, offset = 0 } = req.query;
  
  const [logs] = await executeQuery(
    `SELECT aal.*, 
            actor.username as actor_username,
            target.username as target_username,
            r.name as role_name
     FROM AuthorizationAuditLogs aal
     LEFT JOIN Users actor ON aal.actor_user_uuid = actor.uuid
     LEFT JOIN Users target ON aal.target_user_uuid = target.uuid
     LEFT JOIN Roles r ON aal.metadata->>'$.roleUuid' = r.uuid
     WHERE aal.metadata->>'$.roleUuid' = ? OR aal.target_role_uuid = ?
     ORDER BY aal.created_at DESC
     LIMIT ? OFFSET ?`,
    [roleUuid, roleUuid, parseInt(limit), parseInt(offset)]
  );
  
  const [countResult] = await executeQuery(
    `SELECT COUNT(*) as total FROM AuthorizationAuditLogs aal 
     WHERE aal.metadata->>'$.roleUuid' = ? OR aal.target_role_uuid = ?`,
    [roleUuid, roleUuid]
  );
  
  sendSuccess(res, {
    message: "Role audit logs retrieved successfully",
    data: {
      logs,
      pagination: {
        total: countResult[0].total,
        limit: parseInt(limit),
        offset: parseInt(offset)
      }
    }
  });
});
