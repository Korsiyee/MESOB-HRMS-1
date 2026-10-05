/**
 * RBAC Service - Complete Role-Based Access Control Service
 * 
 * This service provides the core authorization logic for the HRMS system.
 * It replaces hardcoded role checks with flexible, database-driven permissions.
 * 
 * Key Features:
 * - Permission checking (single, any, all)
 * - Data scope resolution
 * - User permission caching
 * - Role hierarchy enforcement
 * - Permission overrides and delegations
 * - Super Admin bypass
 */

const { executeQuery } = require("../utils/dbQuery");
const { v4: uuidv4 } = require("uuid");

// ============================================================================
// CACHE MANAGEMENT
// ============================================================================

const userPermissionsCache = new Map();
const rolePermissionsCache = new Map();
const roleScopesCache = new Map();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

/**
 * Clear all caches
 */
function clearAllCaches() {
  userPermissionsCache.clear();
  rolePermissionsCache.clear();
  roleScopesCache.clear();
  console.log('[rbacService] All caches cleared');
}

/**
 * Invalidate user-specific cache
 */
function invalidateUserCache(userUuid) {
  userPermissionsCache.delete(userUuid);
  console.log(`[rbacService] Cache invalidated for user: ${userUuid}`);
}

/**
 * Invalidate role-specific cache
 */
function invalidateRoleCache(roleUuid) {
  rolePermissionsCache.delete(roleUuid);
  roleScopesCache.delete(roleUuid);
  // Also clear all user caches since they depend on role data
  userPermissionsCache.clear();
  console.log(`[rbacService] Cache invalidated for role: ${roleUuid}`);
}

// ============================================================================
// USER ROLE RETRIEVAL
// ============================================================================

/**
 * Get user's role information
 * @param {string} userUuid - User UUID
 * @returns {Promise<Object|null>} Role object or null
 */
async function getUserRole(userUuid) {
  const [rows] = await executeQuery(
    `SELECT r.uuid, r.code, r.name, r.description, r.hierarchy_level, r.is_system_role, r.is_active
     FROM Users u
     INNER JOIN Roles r ON u.role_uuid = r.uuid
     WHERE u.uuid = ? AND r.is_active = TRUE`,
    [userUuid]
  );
  
  return rows.length > 0 ? rows[0] : null;
}

/**
 * Get role by UUID
 * @param {string} roleUuid - Role UUID
 * @returns {Promise<Object|null>} Role object or null
 */
async function getRoleByUuid(roleUuid) {
  const [rows] = await executeQuery(
    `SELECT uuid, code, name, description, hierarchy_level, is_system_role, 
            is_active, can_be_deleted, created_at, updated_at
     FROM Roles
     WHERE uuid = ?`,
    [roleUuid]
  );
  
  return rows.length > 0 ? rows[0] : null;
}

/**
 * Get role by code
 * @param {string} code - Role code (e.g., 'SUPER_ADMIN')
 * @returns {Promise<Object|null>} Role object or null
 */
async function getRoleByCode(code) {
  const [rows] = await executeQuery(
    `SELECT uuid, code, name, description, hierarchy_level, is_system_role, 
            is_active, can_be_deleted, created_at, updated_at
     FROM Roles
     WHERE code = ?`,
    [code]
  );
  
  return rows.length > 0 ? rows[0] : null;
}

/**
 * Check if user is Super Admin
 * @param {string} userUuid - User UUID
 * @returns {Promise<boolean>}
 */
async function isSuperAdmin(userUuid) {
  const role = await getUserRole(userUuid);
  return role && role.code === 'SUPER_ADMIN';
}

// ============================================================================
// PERMISSION RETRIEVAL
// ============================================================================

/**
 * Get all permissions for a role (with caching)
 * @param {string} roleUuid - Role UUID
 * @returns {Promise<string[]>} Array of permission codes
 */
async function getRolePermissions(roleUuid) {
  // Check cache
  const cached = rolePermissionsCache.get(roleUuid);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return cached.permissions;
  }
  
  // Query database
  const [rows] = await executeQuery(
    `SELECT DISTINCT p.code
     FROM RolePermissions rp
     INNER JOIN Permissions p ON rp.permission_uuid = p.uuid
     WHERE rp.role_uuid = ?`,
    [roleUuid]
  );
  
  const permissions = rows.map(row => row.code);
  
  // Cache result
  rolePermissionsCache.set(roleUuid, {
    permissions,
    timestamp: Date.now()
  });
  
  return permissions;
}

/**
 * Get user's effective permissions (role + overrides + delegations)
 * @param {string} userUuid - User UUID
 * @returns {Promise<string[]>} Array of permission codes
 */
async function getUserPermissions(userUuid) {
  // Check cache
  const cached = userPermissionsCache.get(userUuid);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return cached.permissions;
  }
  
  // Get base role permissions
  const role = await getUserRole(userUuid);
  if (!role) {
    return [];
  }
  
  // Super Admin gets all permissions
  if (role.code === 'SUPER_ADMIN') {
    const [allPerms] = await executeQuery(
      `SELECT code FROM Permissions ORDER BY code`
    );
    const permissions = allPerms.map(p => p.code);
    
    // Cache result
    userPermissionsCache.set(userUuid, {
      permissions,
      timestamp: Date.now()
    });
    
    return permissions;
  }
  
  // Get role permissions
  let permissions = await getRolePermissions(role.uuid);
  
  // Get DENY overrides (these remove permissions)
  const [denyOverrides] = await executeQuery(
    `SELECT p.code
     FROM UserPermissionOverrides upo
     INNER JOIN Permissions p ON upo.permission_uuid = p.uuid
     WHERE upo.user_uuid = ? 
       AND upo.override_type = 'DENY'
       AND (upo.expires_at IS NULL OR upo.expires_at > NOW())`,
    [userUuid]
  );
  
  const deniedPermissions = new Set(denyOverrides.map(row => row.code));
  
  // Get ALLOW overrides (these add permissions)
  const [allowOverrides] = await executeQuery(
    `SELECT p.code
     FROM UserPermissionOverrides upo
     INNER JOIN Permissions p ON upo.permission_uuid = p.uuid
     WHERE upo.user_uuid = ? 
       AND upo.override_type = 'ALLOW'
       AND (upo.expires_at IS NULL OR upo.expires_at > NOW())`,
    [userUuid]
  );
  
  const allowedPermissions = allowOverrides.map(row => row.code);
  
  // Get active delegations (permissions delegated to this user)
  const [delegations] = await executeQuery(
    `SELECT p.code
     FROM PermissionDelegations pd
     INNER JOIN Permissions p ON pd.permission_uuid = p.uuid
     WHERE pd.to_user_uuid = ?
       AND pd.is_active = TRUE
       AND pd.starts_at <= NOW()
       AND pd.expires_at > NOW()`,
    [userUuid]
  );
  
  const delegatedPermissions = delegations.map(row => row.code);
  
  // Combine: (role + allow + delegated) - deny
  const finalPermissions = [
    ...permissions,
    ...allowedPermissions,
    ...delegatedPermissions
  ].filter(perm => !deniedPermissions.has(perm));
  
  // Remove duplicates
  const uniquePermissions = [...new Set(finalPermissions)];
  
  // Cache result
  userPermissionsCache.set(userUuid, {
    permissions: uniquePermissions,
    timestamp: Date.now()
  });
  
  return uniquePermissions;
}

/**
 * Get detailed permission information for a user
 * @param {string} userUuid - User UUID
 * @returns {Promise<Object>} Detailed permission breakdown
 */
async function getUserPermissionsDetailed(userUuid) {
  const role = await getUserRole(userUuid);
  if (!role) {
    return {
      role: null,
      rolePermissions: [],
      allowOverrides: [],
      denyOverrides: [],
      delegations: [],
      effectivePermissions: []
    };
  }
  
  const rolePermissions = await getRolePermissions(role.uuid);
  
  // Get overrides
  const [overrides] = await executeQuery(
    `SELECT p.code, p.name, upo.override_type, upo.reason, upo.expires_at
     FROM UserPermissionOverrides upo
     INNER JOIN Permissions p ON upo.permission_uuid = p.uuid
     WHERE upo.user_uuid = ?
       AND (upo.expires_at IS NULL OR upo.expires_at > NOW())
     ORDER BY upo.override_type, p.code`,
    [userUuid]
  );
  
  const allowOverrides = overrides.filter(o => o.override_type === 'ALLOW');
  const denyOverrides = overrides.filter(o => o.override_type === 'DENY');
  
  // Get delegations
  const [delegations] = await executeQuery(
    `SELECT p.code, p.name, pd.reason, pd.expires_at,
            u.username as from_user
     FROM PermissionDelegations pd
     INNER JOIN Permissions p ON pd.permission_uuid = p.uuid
     INNER JOIN Users u ON pd.from_user_uuid = u.uuid
     WHERE pd.to_user_uuid = ?
       AND pd.is_active = TRUE
       AND pd.starts_at <= NOW()
       AND pd.expires_at > NOW()
     ORDER BY p.code`,
    [userUuid]
  );
  
  const effectivePermissions = await getUserPermissions(userUuid);
  
  return {
    role,
    rolePermissions,
    allowOverrides,
    denyOverrides,
    delegations,
    effectivePermissions
  };
}

// ============================================================================
// PERMISSION CHECKING
// ============================================================================

/**
 * Check if user has a specific permission
 * @param {string} userUuid - User UUID
 * @param {string} permissionCode - Permission code (e.g., 'Employees.View')
 * @returns {Promise<boolean>}
 */
async function hasPermission(userUuid, permissionCode) {
  if (!userUuid || !permissionCode) return false;
  
  const permissions = await getUserPermissions(userUuid);
  return permissions.includes(permissionCode);
}

/**
 * Check if user has ANY of the specified permissions (OR logic)
 * @param {string} userUuid - User UUID
 * @param {string[]} permissionCodes - Array of permission codes
 * @returns {Promise<boolean>}
 */
async function hasAnyPermission(userUuid, permissionCodes) {
  if (!userUuid || !permissionCodes || permissionCodes.length === 0) return false;
  
  const permissions = await getUserPermissions(userUuid);
  return permissionCodes.some(code => permissions.includes(code));
}

/**
 * Check if user has ALL of the specified permissions (AND logic)
 * @param {string} userUuid - User UUID
 * @param {string[]} permissionCodes - Array of permission codes
 * @returns {Promise<boolean>}
 */
async function hasAllPermissions(userUuid, permissionCodes) {
  if (!userUuid || !permissionCodes || permissionCodes.length === 0) return false;
  
  const permissions = await getUserPermissions(userUuid);
  return permissionCodes.every(code => permissions.includes(code));
}

// ============================================================================
// DATA SCOPE RESOLUTION
// ============================================================================

/**
 * Get permission scope for a user
 * @param {string} userUuid - User UUID
 * @param {string} permissionCode - Permission code
 * @returns {Promise<Object>} Scope configuration
 */
async function getPermissionScope(userUuid, permissionCode) {
  // Check for user-specific scope override first
  const [userOverrides] = await executeQuery(
    `SELECT ds.code, ds.name, uso.scope_configuration
     FROM UserScopeOverrides uso
     INNER JOIN Permissions p ON uso.permission_uuid = p.uuid
     INNER JOIN DataScopes ds ON uso.data_scope_uuid = ds.uuid
     WHERE uso.user_uuid = ? AND p.code = ?
       AND uso.is_active = TRUE
       AND (uso.expires_at IS NULL OR uso.expires_at > NOW())
     LIMIT 1`,
    [userUuid, permissionCode]
  );
  
  if (userOverrides.length > 0) {
    return {
      type: userOverrides[0].code,
      code: userOverrides[0].code,
      name: userOverrides[0].name,
      configuration: userOverrides[0].scope_configuration 
        ? JSON.parse(userOverrides[0].scope_configuration) 
        : null,
      source: 'USER_OVERRIDE'
    };
  }
  
  // Get role-based scope
  const role = await getUserRole(userUuid);
  if (!role) {
    return { type: 'NONE', code: null, configuration: null, source: 'NO_ROLE' };
  }
  
  // Super Admin always gets ALL scope
  if (role.code === 'SUPER_ADMIN') {
    return { type: 'ALL', code: 'ALL', configuration: null, source: 'SUPER_ADMIN' };
  }
  
  // Get role permission scope
  const [roleScopes] = await executeQuery(
    `SELECT ds.code, ds.name, rps.scope_configuration
     FROM RolePermissionScopes rps
     INNER JOIN Permissions p ON rps.permission_uuid = p.uuid
     INNER JOIN DataScopes ds ON rps.data_scope_uuid = ds.uuid
     WHERE rps.role_uuid = ? AND p.code = ?
     LIMIT 1`,
    [role.uuid, permissionCode]
  );
  
  if (roleScopes.length > 0) {
    return {
      type: roleScopes[0].code,
      code: roleScopes[0].code,
      name: roleScopes[0].name,
      configuration: roleScopes[0].scope_configuration 
        ? JSON.parse(roleScopes[0].scope_configuration) 
        : null,
      source: 'ROLE'
    };
  }
  
  // Default to OWN if no scope defined but permission exists
  const hasPermissionResult = await hasPermission(userUuid, permissionCode);
  if (hasPermissionResult) {
    return { type: 'OWN', code: 'OWN', configuration: null, source: 'DEFAULT' };
  }
  
  return { type: 'NONE', code: null, configuration: null, source: 'NO_PERMISSION' };
}

/**
 * Build SQL WHERE clause for scope filtering
 * @param {Object} scope - Scope object from getPermissionScope
 * @param {Object} context - User context (userUuid, employeeUuid, departmentUuid)
 * @param {string} tableAlias - SQL table alias
 * @returns {Object} { clause: string, params: array }
 */
function buildScopeWhereClause(scope, context, tableAlias = 'e') {
  const { type, configuration } = scope;
  
  switch (type) {
    case 'ALL':
      return { clause: '1=1', params: [] };
    
    case 'OWN':
      if (context.employeeUuid) {
        return { 
          clause: `${tableAlias}.uuid = ?`, 
          params: [context.employeeUuid] 
        };
      }
      return { clause: '1=0', params: [] }; // No access if no employee
    
    case 'DEPARTMENT':
      if (context.departmentUuid) {
        return { 
          clause: `${tableAlias}.department_uuid = ?`, 
          params: [context.departmentUuid] 
        };
      }
      return { clause: '1=0', params: [] };
    
    case 'SELECTED_DEPARTMENTS':
      if (configuration && configuration.departmentUuids && configuration.departmentUuids.length > 0) {
        const placeholders = configuration.departmentUuids.map(() => '?').join(',');
        return { 
          clause: `${tableAlias}.department_uuid IN (${placeholders})`, 
          params: configuration.departmentUuids 
        };
      }
      return { clause: '1=0', params: [] };
    
    case 'BRANCH':
      if (context.branchUuid) {
        return { 
          clause: `${tableAlias}.branch_uuid = ?`, 
          params: [context.branchUuid] 
        };
      }
      return { clause: '1=0', params: [] };
    
    case 'SELECTED_BRANCHES':
      if (configuration && configuration.branchUuids && configuration.branchUuids.length > 0) {
        const placeholders = configuration.branchUuids.map(() => '?').join(',');
        return { 
          clause: `${tableAlias}.branch_uuid IN (${placeholders})`, 
          params: configuration.branchUuids 
        };
      }
      return { clause: '1=0', params: [] };
    
    case 'REGION':
      if (context.regionUuid) {
        return { 
          clause: `${tableAlias}.region_uuid = ?`, 
          params: [context.regionUuid] 
        };
      }
      return { clause: '1=0', params: [] };
    
    case 'SELECTED_REGIONS':
      if (configuration && configuration.regionUuids && configuration.regionUuids.length > 0) {
        const placeholders = configuration.regionUuids.map(() => '?').join(',');
        return { 
          clause: `${tableAlias}.region_uuid IN (${placeholders})`, 
          params: configuration.regionUuids 
        };
      }
      return { clause: '1=0', params: [] };
    
    default:
      return { clause: '1=0', params: [] }; // No access for unknown scope
  }
}

// ============================================================================
// ROLE HIERARCHY
// ============================================================================

/**
 * Check if actor can modify target role (based on hierarchy)
 * @param {string} actorRoleUuid - Actor's role UUID
 * @param {string} targetRoleUuid - Target role UUID
 * @returns {Promise<boolean>}
 */
async function canModifyRole(actorRoleUuid, targetRoleUuid) {
  if (actorRoleUuid === targetRoleUuid) {
    return false; // Cannot modify own role
  }
  
  const [rows] = await executeQuery(
    `SELECT 
       (SELECT hierarchy_level FROM Roles WHERE uuid = ?) as actor_level,
       (SELECT hierarchy_level FROM Roles WHERE uuid = ?) as target_level,
       (SELECT is_system_role FROM Roles WHERE uuid = ?) as target_is_system`,
    [actorRoleUuid, targetRoleUuid, targetRoleUuid]
  );
  
  if (rows.length === 0) return false;
  
  const { actor_level, target_level, target_is_system } = rows[0];
  
  // Cannot modify system roles (unless you're super admin - handled elsewhere)
  if (target_is_system && actor_level < 100) {
    return false;
  }
  
  // Can only modify roles with lower hierarchy level
  return actor_level > target_level;
}

/**
 * Check if actor can assign role to user
 * @param {string} actorUserUuid - Actor user UUID
 * @param {string} targetRoleUuid - Role to assign
 * @returns {Promise<boolean>}
 */
async function canAssignRole(actorUserUuid, targetRoleUuid) {
  // Must have Accounts.AssignRole permission
  const hasAssignPermission = await hasPermission(actorUserUuid, 'Accounts.AssignRole');
  if (!hasAssignPermission) {
    return false;
  }
  
  // Check hierarchy
  const actorRole = await getUserRole(actorUserUuid);
  if (!actorRole) return false;
  
  // Super Admin can assign any role
  if (actorRole.code === 'SUPER_ADMIN') {
    return true;
  }
  
  return canModifyRole(actorRole.uuid, targetRoleUuid);
}

// ============================================================================
// AUTHORIZATION AUDIT LOGGING
// ============================================================================

/**
 * Log authorization-related action
 * @param {Object} params - Log parameters
 */
async function logAuthorizationAction(params) {
  const {
    actorUserUuid,
    actionType,
    resourceType,
    resourceUuid,
    targetUserUuid,
    previousValue,
    newValue,
    reason,
    ipAddress,
    userAgent
  } = params;
  
  try {
    await executeQuery(
      `INSERT INTO AuthorizationAuditLogs 
       (uuid, actor_user_uuid, action_type, resource_type, resource_uuid, 
        target_user_uuid, previous_value, new_value, reason, ip_address, user_agent)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        uuidv4(),
        actorUserUuid,
        actionType,
        resourceType,
        resourceUuid,
        targetUserUuid,
        previousValue,
        newValue,
        reason,
        ipAddress,
        userAgent
      ]
    );
  } catch (error) {
    console.error('[rbacService] Failed to log authorization action:', error);
    // Don't throw - logging failure shouldn't block operations
  }
}

// ============================================================================
// ROLE MANAGEMENT QUERIES
// ============================================================================

/**
 * Get all roles
 * @param {Object} filters - Filter options
 * @returns {Promise<Array>} Array of roles
 */
async function getAllRoles(filters = {}) {
  const { includeInactive = false, systemOnly = false, customOnly = false } = filters;
  
  let whereClause = [];
  let params = [];
  
  if (!includeInactive) {
    whereClause.push('is_active = TRUE');
  }
  
  if (systemOnly) {
    whereClause.push('is_system_role = TRUE');
  } else if (customOnly) {
    whereClause.push('is_system_role = FALSE');
  }
  
  const where = whereClause.length > 0 ? 'WHERE ' + whereClause.join(' AND ') : '';
  
  const [rows] = await executeQuery(
    `SELECT uuid, code, name, description, is_system_role, is_active, 
            hierarchy_level, can_be_deleted, created_at, updated_at
     FROM Roles
     ${where}
     ORDER BY hierarchy_level DESC, name ASC`,
    params
  );
  
  return rows;
}

/**
 * Get all permissions grouped by resource
 * @returns {Promise<Object>} Permissions grouped by resource
 */
async function getAllPermissionsGrouped() {
  const [resources] = await executeQuery(
    `SELECT uuid, code, name, description, category, display_order
     FROM Resources
     WHERE is_active = TRUE
     ORDER BY display_order, name`
  );
  
  const [permissions] = await executeQuery(
    `SELECT p.uuid, p.code, p.action, p.name, p.description, p.is_sensitive,
            p.requires_scope, p.display_order, p.resource_uuid
     FROM Permissions p
     ORDER BY p.display_order, p.name`
  );
  
  // Group permissions by resource
  const grouped = resources.map(resource => ({
    ...resource,
    permissions: permissions.filter(p => p.resource_uuid === resource.uuid)
  }));
  
  return grouped;
}

/**
 * Get all data scopes
 * @returns {Promise<Array>} Array of data scopes
 */
async function getAllDataScopes() {
  const [rows] = await executeQuery(
    `SELECT uuid, code, name, description, 
            sql_template, parameters, is_active
     FROM DataScopes
     WHERE is_active = TRUE
     ORDER BY name`
  );
  
  return rows.map(row => ({
    ...row,
    parameters: row.parameters ? JSON.parse(row.parameters) : null
  }));
}

// ============================================================================
// EXPORTS
// ============================================================================

module.exports = {
  // Cache management
  clearAllCaches,
  invalidateUserCache,
  invalidateRoleCache,
  
  // User role retrieval
  getUserRole,
  getRoleByUuid,
  getRoleByCode,
  isSuperAdmin,
  
  // Permission retrieval
  getRolePermissions,
  getUserPermissions,
  getUserPermissionsDetailed,
  
  // Permission checking
  hasPermission,
  hasAnyPermission,
  hasAllPermissions,
  
  // Data scope resolution
  getPermissionScope,
  buildScopeWhereClause,
  
  // Role hierarchy
  canModifyRole,
  canAssignRole,
  
  // Audit logging
  logAuthorizationAction,
  
  // Role management queries
  getAllRoles,
  getAllPermissionsGrouped,
  getAllDataScopes,
};
