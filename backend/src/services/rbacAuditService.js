/**
 * RBAC Audit Service
 * 
 * Centralized audit logging service for all RBAC operations.
 * Logs all role management activities to AuthorizationAuditLogs table.
 * 
 * This service captures:
 * - Role CRUD operations (create, update, delete, status changes)
 * - Permission assignments and removals
 * - Scope assignments and removals
 * - User role assignments
 * - IP addresses and user agents for compliance
 * 
 * All audit logs are insert-only (immutable audit trail).
 */

const { executeQuery } = require("../utils/dbQuery");
const { v4: uuidv4 } = require("uuid");

/**
 * Core audit logging function
 * Inserts a record into AuthorizationAuditLogs table
 * 
 * @param {Object} entry - Audit log entry
 * @param {string} entry.actor_user_uuid - UUID of user performing the action
 * @param {string} entry.action_type - Type of action performed
 * @param {string|null} entry.resource_type - Type of resource affected
 * @param {string|null} entry.resource_uuid - UUID of resource affected
 * @param {string|null} entry.target_user_uuid - UUID of user affected (for user role assignments)
 * @param {string|null} entry.target_role_uuid - UUID of role affected
 * @param {string|null} entry.target_permission_uuid - UUID of permission affected
 * @param {string|null} entry.previous_value - Previous value before change (JSON or text)
 * @param {string|null} entry.new_value - New value after change (JSON or text)
 * @param {string|null} entry.reason - Reason for change
 * @param {string|null} entry.ip_address - IP address of actor
 * @param {string|null} entry.user_agent - User agent string
 * @returns {Promise<string>} UUID of created audit log entry
 * @private
 */
async function _logAuditEntry({
  actor_user_uuid,
  action_type,
  resource_type = null,
  resource_uuid = null,
  target_user_uuid = null,
  target_role_uuid = null,
  target_permission_uuid = null,
  previous_value = null,
  new_value = null,
  reason = null,
  ip_address = null,
  user_agent = null
}) {
  const uuid = uuidv4();
  
  try {
    await executeQuery(
      `INSERT INTO AuthorizationAuditLogs (
        uuid, actor_user_uuid, action_type, resource_type, resource_uuid,
        target_user_uuid, previous_value, new_value, reason,
        ip_address, user_agent
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        uuid,
        actor_user_uuid,
        action_type,
        resource_type,
        resource_uuid,
        previous_value,
        new_value,
        reason,
        ip_address,
        user_agent
      ]
    );
    
    return uuid;
  } catch (error) {
    console.error('[rbacAuditService] Failed to create audit log entry:', error);
    // Don't throw - audit logging failure shouldn't block operations
    return null;
  }
}

// ============================================================================
// ROLE CRUD OPERATION LOGGING
// ============================================================================

/**
 * Log role creation event
 * 
 * @param {string} roleUuid - UUID of created role
 * @param {Object} roleData - Role data (code, name, description, hierarchy_level)
 * @param {string} actorUuid - UUID of user who created the role
 * @param {string|null} ipAddress - IP address of actor
 * @param {string|null} userAgent - User agent string
 * @returns {Promise<string|null>} UUID of audit log entry
 */
async function logRoleCreated(roleUuid, roleData, actorUuid, ipAddress = null, userAgent = null) {
  return await _logAuditEntry({
    actor_user_uuid: actorUuid,
    action_type: 'ROLE_CREATED',
    resource_type: 'ROLE',
    resource_uuid: roleUuid,
    previous_value: null,
    new_value: JSON.stringify({
      code: roleData.code,
      name: roleData.name,
      description: roleData.description,
      hierarchy_level: roleData.hierarchy_level
    }),
    reason: 'Role created',
    ip_address: ipAddress,
    user_agent: userAgent
  });
}

/**
 * Log role update event
 * 
 * @param {string} roleUuid - UUID of updated role
 * @param {Object} previousData - Previous role data
 * @param {Object} newData - New role data
 * @param {string} actorUuid - UUID of user who updated the role
 * @param {string|null} ipAddress - IP address of actor
 * @param {string|null} userAgent - User agent string
 * @returns {Promise<string|null>} UUID of audit log entry
 */
async function logRoleUpdated(roleUuid, previousData, newData, actorUuid, ipAddress = null, userAgent = null) {
  // Create a details object showing what changed
  const changes = {};
  
  if (previousData.name !== newData.name) {
    changes.name = { from: previousData.name, to: newData.name };
  }
  if (previousData.description !== newData.description) {
    changes.description = { from: previousData.description, to: newData.description };
  }
  if (previousData.hierarchy_level !== newData.hierarchy_level) {
    changes.hierarchy_level = { from: previousData.hierarchy_level, to: newData.hierarchy_level };
  }
  
  return await _logAuditEntry({
    actor_user_uuid: actorUuid,
    action_type: 'ROLE_UPDATED',
    resource_type: 'ROLE',
    resource_uuid: roleUuid,
    previous_value: JSON.stringify(previousData),
    new_value: JSON.stringify(newData),
    reason: `Role updated: ${Object.keys(changes).join(', ')}`,
    ip_address: ipAddress,
    user_agent: userAgent
  });
}

/**
 * Log role deletion event (soft delete)
 * 
 * @param {string} roleUuid - UUID of deleted role
 * @param {Object} roleData - Role data at time of deletion
 * @param {string} actorUuid - UUID of user who deleted the role
 * @param {string|null} ipAddress - IP address of actor
 * @param {string|null} userAgent - User agent string
 * @returns {Promise<string|null>} UUID of audit log entry
 */
async function logRoleDeleted(roleUuid, roleData, actorUuid, ipAddress = null, userAgent = null) {
  return await _logAuditEntry({
    actor_user_uuid: actorUuid,
    action_type: 'ROLE_DELETED',
    resource_type: 'ROLE',
    resource_uuid: roleUuid,
    previous_value: JSON.stringify({
      code: roleData.code,
      name: roleData.name,
      is_active: true
    }),
    new_value: JSON.stringify({
      code: roleData.code,
      name: roleData.name,
      is_active: false
    }),
    reason: 'Role soft deleted (is_active set to false)',
    ip_address: ipAddress,
    user_agent: userAgent
  });
}

/**
 * Log role status change event
 * 
 * @param {string} roleUuid - UUID of role
 * @param {boolean} previousStatus - Previous is_active status
 * @param {boolean} newStatus - New is_active status
 * @param {string} actorUuid - UUID of user who changed the status
 * @param {string|null} ipAddress - IP address of actor
 * @param {string|null} userAgent - User agent string
 * @returns {Promise<string|null>} UUID of audit log entry
 */
async function logRoleStatusChanged(roleUuid, previousStatus, newStatus, actorUuid, ipAddress = null, userAgent = null) {
  return await _logAuditEntry({
    actor_user_uuid: actorUuid,
    action_type: 'ROLE_STATUS_CHANGED',
    resource_type: 'ROLE',
    resource_uuid: roleUuid,
    previous_value: previousStatus ? 'active' : 'inactive',
    new_value: newStatus ? 'active' : 'inactive',
    reason: `Role ${newStatus ? 'activated' : 'deactivated'}`,
    ip_address: ipAddress,
    user_agent: userAgent
  });
}

// ============================================================================
// PERMISSION ASSIGNMENT LOGGING
// ============================================================================

/**
 * Log permission assignment to role
 * 
 * @param {string} roleUuid - UUID of role
 * @param {string} permissionUuid - UUID of permission assigned
 * @param {string} permissionCode - Permission code (e.g., 'Employees.View')
 * @param {string|null} dataScopeUuid - UUID of data scope (if applicable)
 * @param {string|null} dataScopeCode - Data scope code (e.g., 'DEPARTMENT')
 * @param {string} actorUuid - UUID of user who assigned the permission
 * @param {string|null} ipAddress - IP address of actor
 * @param {string|null} userAgent - User agent string
 * @returns {Promise<string|null>} UUID of audit log entry
 */
async function logPermissionAssigned(
  roleUuid,
  permissionUuid,
  permissionCode,
  dataScopeUuid = null,
  dataScopeCode = null,
  actorUuid,
  ipAddress = null,
  userAgent = null
) {
  const details = {
    permission_uuid: permissionUuid,
    permission_code: permissionCode
  };
  
  if (dataScopeUuid && dataScopeCode) {
    details.data_scope_uuid = dataScopeUuid;
    details.data_scope_code = dataScopeCode;
  }
  
  return await _logAuditEntry({
    actor_user_uuid: actorUuid,
    action_type: 'PERMISSION_ASSIGNED',
    resource_type: 'ROLE',
    resource_uuid: roleUuid,
    previous_value: null,
    new_value: JSON.stringify(details),
    reason: `Permission ${permissionCode} assigned to role${dataScopeCode ? ` with scope ${dataScopeCode}` : ''}`,
    ip_address: ipAddress,
    user_agent: userAgent
  });
}

/**
 * Log permission removal from role
 * 
 * @param {string} roleUuid - UUID of role
 * @param {string} permissionUuid - UUID of permission removed
 * @param {string} permissionCode - Permission code (e.g., 'Employees.View')
 * @param {string} actorUuid - UUID of user who removed the permission
 * @param {string|null} ipAddress - IP address of actor
 * @param {string|null} userAgent - User agent string
 * @returns {Promise<string|null>} UUID of audit log entry
 */
async function logPermissionRemoved(
  roleUuid,
  permissionUuid,
  permissionCode,
  actorUuid,
  ipAddress = null,
  userAgent = null
) {
  return await _logAuditEntry({
    actor_user_uuid: actorUuid,
    action_type: 'PERMISSION_REMOVED',
    resource_type: 'ROLE',
    resource_uuid: roleUuid,
    previous_value: JSON.stringify({
      permission_uuid: permissionUuid,
      permission_code: permissionCode
    }),
    new_value: null,
    reason: `Permission ${permissionCode} removed from role`,
    ip_address: ipAddress,
    user_agent: userAgent
  });
}

/**
 * Log bulk permission assignment to role
 * 
 * @param {string} roleUuid - UUID of role
 * @param {number} assignedCount - Number of permissions assigned
 * @param {number} skippedCount - Number of permissions skipped (already assigned)
 * @param {string} actorUuid - UUID of user who performed bulk assignment
 * @param {string|null} ipAddress - IP address of actor
 * @param {string|null} userAgent - User agent string
 * @returns {Promise<string|null>} UUID of audit log entry
 */
async function logBulkPermissionAssignment(
  roleUuid,
  assignedCount,
  skippedCount,
  actorUuid,
  ipAddress = null,
  userAgent = null
) {
  return await _logAuditEntry({
    actor_user_uuid: actorUuid,
    action_type: 'BULK_PERMISSION_ASSIGNED',
    resource_type: 'ROLE',
    resource_uuid: roleUuid,
    previous_value: null,
    new_value: JSON.stringify({
      assigned: assignedCount,
      skipped: skippedCount,
      total: assignedCount + skippedCount
    }),
    reason: `Bulk permission assignment: ${assignedCount} assigned, ${skippedCount} skipped`,
    ip_address: ipAddress,
    user_agent: userAgent
  });
}

/**
 * Log permission replacement (atomic replace all)
 * 
 * @param {string} roleUuid - UUID of role
 * @param {number} removedCount - Number of permissions removed
 * @param {number} addedCount - Number of permissions added
 * @param {string} actorUuid - UUID of user who replaced permissions
 * @param {string|null} ipAddress - IP address of actor
 * @param {string|null} userAgent - User agent string
 * @returns {Promise<string|null>} UUID of audit log entry
 */
async function logPermissionReplacement(
  roleUuid,
  removedCount,
  addedCount,
  actorUuid,
  ipAddress = null,
  userAgent = null
) {
  return await _logAuditEntry({
    actor_user_uuid: actorUuid,
    action_type: 'PERMISSIONS_REPLACED',
    resource_type: 'ROLE',
    resource_uuid: roleUuid,
    previous_value: JSON.stringify({ count: removedCount }),
    new_value: JSON.stringify({ count: addedCount }),
    reason: `Permissions replaced: ${removedCount} removed, ${addedCount} added`,
    ip_address: ipAddress,
    user_agent: userAgent
  });
}

// ============================================================================
// SCOPE ASSIGNMENT LOGGING
// ============================================================================

/**
 * Log data scope assignment to role-permission
 * 
 * @param {string} roleUuid - UUID of role
 * @param {string} permissionUuid - UUID of permission
 * @param {string} permissionCode - Permission code
 * @param {string} dataScopeUuid - UUID of data scope
 * @param {string} dataScopeCode - Data scope code (e.g., 'DEPARTMENT')
 * @param {Object|null} scopeConfiguration - Additional scope configuration JSON
 * @param {string} actorUuid - UUID of user who assigned the scope
 * @param {string|null} ipAddress - IP address of actor
 * @param {string|null} userAgent - User agent string
 * @returns {Promise<string|null>} UUID of audit log entry
 */
async function logScopeAssigned(
  roleUuid,
  permissionUuid,
  permissionCode,
  dataScopeUuid,
  dataScopeCode,
  scopeConfiguration = null,
  actorUuid,
  ipAddress = null,
  userAgent = null
) {
  const details = {
    permission_uuid: permissionUuid,
    permission_code: permissionCode,
    data_scope_uuid: dataScopeUuid,
    data_scope_code: dataScopeCode
  };
  
  if (scopeConfiguration) {
    details.scope_configuration = scopeConfiguration;
  }
  
  return await _logAuditEntry({
    actor_user_uuid: actorUuid,
    action_type: 'SCOPE_ASSIGNED',
    resource_type: 'ROLE',
    resource_uuid: roleUuid,
    previous_value: null,
    new_value: JSON.stringify(details),
    reason: `Scope ${dataScopeCode} assigned to permission ${permissionCode}`,
    ip_address: ipAddress,
    user_agent: userAgent
  });
}

/**
 * Log data scope removal from role-permission
 * 
 * @param {string} roleUuid - UUID of role
 * @param {string} permissionUuid - UUID of permission
 * @param {string} permissionCode - Permission code
 * @param {string} previousScopeCode - Previous data scope code
 * @param {string} actorUuid - UUID of user who removed the scope
 * @param {string|null} ipAddress - IP address of actor
 * @param {string|null} userAgent - User agent string
 * @returns {Promise<string|null>} UUID of audit log entry
 */
async function logScopeRemoved(
  roleUuid,
  permissionUuid,
  permissionCode,
  previousScopeCode,
  actorUuid,
  ipAddress = null,
  userAgent = null
) {
  return await _logAuditEntry({
    actor_user_uuid: actorUuid,
    action_type: 'SCOPE_REMOVED',
    resource_type: 'ROLE',
    resource_uuid: roleUuid,
    previous_value: JSON.stringify({
      permission_uuid: permissionUuid,
      permission_code: permissionCode,
      data_scope_code: previousScopeCode
    }),
    new_value: null,
    reason: `Scope ${previousScopeCode} removed from permission ${permissionCode}`,
    ip_address: ipAddress,
    user_agent: userAgent
  });
}

/**
 * Log data scope update (scope change) for role-permission
 * 
 * @param {string} roleUuid - UUID of role
 * @param {string} permissionUuid - UUID of permission
 * @param {string} permissionCode - Permission code
 * @param {string} previousScopeCode - Previous data scope code
 * @param {string} newScopeCode - New data scope code
 * @param {string} actorUuid - UUID of user who updated the scope
 * @param {string|null} ipAddress - IP address of actor
 * @param {string|null} userAgent - User agent string
 * @returns {Promise<string|null>} UUID of audit log entry
 */
async function logScopeUpdated(
  roleUuid,
  permissionUuid,
  permissionCode,
  previousScopeCode,
  newScopeCode,
  actorUuid,
  ipAddress = null,
  userAgent = null
) {
  return await _logAuditEntry({
    actor_user_uuid: actorUuid,
    action_type: 'SCOPE_UPDATED',
    resource_type: 'ROLE',
    resource_uuid: roleUuid,
    previous_value: JSON.stringify({
      permission_code: permissionCode,
      data_scope_code: previousScopeCode
    }),
    new_value: JSON.stringify({
      permission_code: permissionCode,
      data_scope_code: newScopeCode
    }),
    reason: `Scope changed from ${previousScopeCode} to ${newScopeCode} for permission ${permissionCode}`,
    ip_address: ipAddress,
    user_agent: userAgent
  });
}

// ============================================================================
// USER ROLE ASSIGNMENT LOGGING
// ============================================================================

/**
 * Log role assignment to user
 * 
 * @param {string} userUuid - UUID of user receiving the role
 * @param {string} roleUuid - UUID of role assigned
 * @param {string} roleCode - Role code
 * @param {string} roleName - Role name
 * @param {string|null} previousRoleCode - Previous role code (if role was changed)
 * @param {string} actorUuid - UUID of user who assigned the role
 * @param {string|null} ipAddress - IP address of actor
 * @param {string|null} userAgent - User agent string
 * @returns {Promise<string|null>} UUID of audit log entry
 */
async function logRoleAssignedToUser(
  userUuid,
  roleUuid,
  roleCode,
  roleName,
  previousRoleCode = null,
  actorUuid,
  ipAddress = null,
  userAgent = null
) {
  const details = {
    role_uuid: roleUuid,
    role_code: roleCode,
    role_name: roleName
  };
  
  const reason = previousRoleCode
    ? `Role changed from ${previousRoleCode} to ${roleCode}`
    : `Role ${roleCode} assigned to user`;
  
  return await _logAuditEntry({
    actor_user_uuid: actorUuid,
    action_type: 'ROLE_ASSIGNED',
    resource_type: 'USER',
    resource_uuid: userUuid,
    target_user_uuid: userUuid,
    previous_value: previousRoleCode ? JSON.stringify({ role_code: previousRoleCode }) : null,
    new_value: JSON.stringify(details),
    reason: reason,
    ip_address: ipAddress,
    user_agent: userAgent
  });
}

/**
 * Log role removal from user
 * 
 * @param {string} userUuid - UUID of user losing the role
 * @param {string} previousRoleCode - Previous role code
 * @param {string} actorUuid - UUID of user who removed the role
 * @param {string|null} ipAddress - IP address of actor
 * @param {string|null} userAgent - User agent string
 * @returns {Promise<string|null>} UUID of audit log entry
 */
async function logRoleRemovedFromUser(
  userUuid,
  previousRoleCode,
  actorUuid,
  ipAddress = null,
  userAgent = null
) {
  return await _logAuditEntry({
    actor_user_uuid: actorUuid,
    action_type: 'ROLE_REMOVED',
    resource_type: 'USER',
    resource_uuid: userUuid,
    target_user_uuid: userUuid,
    previous_value: JSON.stringify({ role_code: previousRoleCode }),
    new_value: null,
    reason: `Role ${previousRoleCode} removed from user`,
    ip_address: ipAddress,
    user_agent: userAgent
  });
}

// ============================================================================
// QUERY AUDIT LOGS
// ============================================================================

/**
 * Query audit logs with filters and pagination
 * 
 * @param {Object} filters - Query filters
 * @param {string|null} filters.actor_user_uuid - Filter by actor UUID
 * @param {string|null} filters.target_user_uuid - Filter by target user UUID
 * @param {string|null} filters.resource_uuid - Filter by resource UUID
 * @param {string|null} filters.action_type - Filter by action type
 * @param {string|null} filters.resource_type - Filter by resource type
 * @param {string|null} filters.start_date - Filter from date (ISO format)
 * @param {string|null} filters.end_date - Filter to date (ISO format)
 * @param {number} filters.page - Page number (default 1)
 * @param {number} filters.limit - Results per page (default 20, max 100)
 * @returns {Promise<Object>} { logs: [], total, page, limit, totalPages }
 */
async function getAuditLogs({
  actor_user_uuid = null,
  target_user_uuid = null,
  resource_uuid = null,
  action_type = null,
  resource_type = null,
  start_date = null,
  end_date = null,
  page = 1,
  limit = 20
}) {
  // Enforce max limit and ensure positive values
  limit = Math.min(Math.max(limit, 1), 100);
  page = Math.max(page, 1);
  const offset = (page - 1) * limit;
  
  // Build WHERE clause dynamically
  const whereClauses = [];
  const params = [];
  
  if (actor_user_uuid) {
    whereClauses.push('aal.actor_user_uuid = ?');
    params.push(actor_user_uuid);
  }
  
  if (target_user_uuid) {
    whereClauses.push('aal.target_user_uuid = ?');
    params.push(target_user_uuid);
  }
  
  if (resource_uuid) {
    whereClauses.push('aal.resource_uuid = ?');
    params.push(resource_uuid);
  }
  
  if (action_type) {
    whereClauses.push('aal.action_type = ?');
    params.push(action_type);
  }
  
  if (resource_type) {
    whereClauses.push('aal.resource_type = ?');
    params.push(resource_type);
  }
  
  if (start_date) {
    whereClauses.push('aal.created_at >= ?');
    params.push(start_date);
  }
  
  if (end_date) {
    whereClauses.push('aal.created_at <= ?');
    params.push(end_date);
  }
  
  const whereClause = whereClauses.length > 0 
    ? 'WHERE ' + whereClauses.join(' AND ')
    : '';
  
  try {
    // Get total count
    const countQuery = `
      SELECT COUNT(*) as total 
      FROM AuthorizationAuditLogs aal 
      ${whereClause}
    `;
    const [countResult] = await executeQuery(countQuery, params);
    const total = countResult[0]?.total || 0;
    
    // Get paginated results with user and role information
    const logsQuery = `
      SELECT 
        aal.*,
        actor.username as actor_username,
        CONCAT(actor.first_name, ' ', actor.last_name) as actor_name,
        target.username as target_username,
        CONCAT(target.first_name, ' ', target.last_name) as target_name,
        r.code as role_code,
        r.name as role_name
      FROM AuthorizationAuditLogs aal
      LEFT JOIN Users actor ON aal.actor_user_uuid = actor.uuid
      LEFT JOIN Users target ON aal.target_user_uuid = target.uuid
      LEFT JOIN Roles r ON aal.resource_uuid = r.uuid AND aal.resource_type = 'ROLE'
      ${whereClause}
      ORDER BY aal.created_at DESC
      LIMIT ? OFFSET ?
    `;
    
    const [logs] = await executeQuery(logsQuery, [...params, limit, offset]);
    
    return {
      logs: logs || [],
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit)
    };
  } catch (error) {
    console.error('[rbacAuditService] Failed to query audit logs:', error);
    throw error;
  }
}

// ============================================================================
// EXPORTS
// ============================================================================

module.exports = {
  // Role CRUD
  logRoleCreated,
  logRoleUpdated,
  logRoleDeleted,
  logRoleStatusChanged,
  
  // Permission Assignment
  logPermissionAssigned,
  logPermissionRemoved,
  logBulkPermissionAssignment,
  logPermissionReplacement,
  
  // Scope Assignment
  logScopeAssigned,
  logScopeRemoved,
  logScopeUpdated,
  
  // User Role Assignment
  logRoleAssignedToUser,
  logRoleRemovedFromUser,
  
  // Query
  getAuditLogs
};
