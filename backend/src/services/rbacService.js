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
            is_active, created_at, updated_at
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
            is_active, created_at, updated_at
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
     FROM Role_Permissions rp
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
     FROM Role_Permission_Scopes rps
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
 * Get all roles with optional filtering
 * @param {Object} filters - Filter options
 * @returns {Promise<Array>} Array of roles with user counts
 */
async function getAllRoles(filters = {}) {
  const { includeInactive = false, systemOnly = false, customOnly = false } = filters;
  
  let whereClause = [];
  let params = [];
  
  if (!includeInactive) {
    whereClause.push('r.is_active = TRUE');
  }
  
  if (systemOnly) {
    whereClause.push('r.is_system_role = TRUE');
  } else if (customOnly) {
    whereClause.push('r.is_system_role = FALSE');
  }
  
  const where = whereClause.length > 0 ? 'WHERE ' + whereClause.join(' AND ') : '';
  
  const [rows] = await executeQuery(
    `SELECT r.uuid, r.code, r.name, r.description, r.is_system_role, r.is_active, 
            r.hierarchy_level, r.created_at, r.updated_at,
            COUNT(u.uuid) as user_count
     FROM Roles r
     LEFT JOIN Users u ON r.uuid = u.role_uuid
     ${where}
     GROUP BY r.uuid, r.code, r.name, r.description, r.is_system_role, r.is_active, 
              r.hierarchy_level, r.created_at, r.updated_at
     ORDER BY r.hierarchy_level DESC, r.name ASC`,
    params
  );
  
  return rows;
}

/**
 * Get role by UUID with full details including permissions
 * @param {string} roleUuid - Role UUID
 * @returns {Promise<Object|null>} Role with permissions or null
 */
async function getRoleDetails(roleUuid) {
  const role = await getRoleByUuid(roleUuid);
  if (!role) {
    return null;
  }
  
  // Get user count
  const [userCountRows] = await executeQuery(
    `SELECT COUNT(*) as count FROM Users WHERE role_uuid = ?`,
    [roleUuid]
  );
  role.user_count = userCountRows[0].count;
  
  // Get permissions with scopes
  const [permissions] = await executeQuery(
    `SELECT p.uuid, p.code, p.name, p.description, p.requires_scope,
            r.uuid as resource_uuid, r.code as resource_code, r.name as resource_name,
            ds.uuid as scope_uuid, ds.code as scope_code, ds.name as scope_name,
            rps.scope_configuration
     FROM Role_Permissions rp
     INNER JOIN Permissions p ON rp.permission_uuid = p.uuid
     INNER JOIN Resources r ON p.resource_uuid = r.uuid
     LEFT JOIN Role_Permission_Scopes rps ON rp.role_uuid = rps.role_uuid AND rp.permission_uuid = rps.permission_uuid
     LEFT JOIN DataScopes ds ON rps.data_scope_uuid = ds.uuid
     WHERE rp.role_uuid = ?
     ORDER BY r.display_order, p.display_order`,
    [roleUuid]
  );
  
  role.permissions = permissions.map(perm => ({
    uuid: perm.uuid,
    code: perm.code,
    name: perm.name,
    description: perm.description,
    requires_scope: Boolean(perm.requires_scope),
    resource: {
      uuid: perm.resource_uuid,
      code: perm.resource_code,
      name: perm.resource_name
    },
    scope: perm.scope_uuid ? {
      uuid: perm.scope_uuid,
      code: perm.scope_code,
      name: perm.scope_name,
      configuration: perm.scope_configuration ? JSON.parse(perm.scope_configuration) : null
    } : null
  }));
  
  return role;
}

/**
 * Validate role code format (uppercase + underscores only)
 * @param {string} code - Role code to validate
 * @returns {boolean} True if valid
 */
function validateRoleCode(code) {
  if (!code || typeof code !== 'string') {
    return false;
  }
  
  // Must match: uppercase letters and underscores only
  const regex = /^[A-Z_]+$/;
  return regex.test(code);
}

/**
 * Check if role code already exists
 * @param {string} code - Role code to check
 * @param {string|null} excludeUuid - UUID to exclude from check (for updates)
 * @returns {Promise<boolean>} True if code exists
 */
async function roleCodeExists(code, excludeUuid = null) {
  const params = [code];
  let query = `SELECT uuid FROM Roles WHERE code = ?`;
  
  if (excludeUuid) {
    query += ` AND uuid != ?`;
    params.push(excludeUuid);
  }
  
  const [rows] = await executeQuery(query, params);
  return rows.length > 0;
}

/**
 * Check if users are assigned to a role
 * @param {string} roleUuid - Role UUID
 * @returns {Promise<number>} Number of users assigned
 */
async function getUserCountForRole(roleUuid) {
  const [rows] = await executeQuery(
    `SELECT COUNT(*) as count FROM Users WHERE role_uuid = ?`,
    [roleUuid]
  );
  return rows[0].count;
}

/**
 * Create a new role
 * Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 1.6, 1.7, 1.8
 * 
 * @param {Object} roleData - Role data
 * @param {string} roleData.code - Role code (uppercase + underscores)
 * @param {string} roleData.name - Role name
 * @param {string} roleData.description - Role description
 * @param {number} roleData.hierarchy_level - Hierarchy level (0-100)
 * @param {string} actorUuid - UUID of user creating the role
 * @returns {Promise<Object>} Created role
 * @throws {Error} If validation fails or code exists
 */
async function createRole(roleData, actorUuid) {
  const { code, name, description, hierarchy_level } = roleData;
  
  // Validate required fields
  if (!code || !name) {
    throw new Error('Role code and name are required');
  }
  
  // Validate code format
  if (!validateRoleCode(code)) {
    throw new Error('Role code must contain only uppercase letters and underscores');
  }
  
  // Check for duplicate code
  if (await roleCodeExists(code)) {
    throw new Error(`A role with code '${code}' already exists`);
  }
  
  // Validate hierarchy level
  const hierarchyLevel = hierarchy_level !== undefined ? parseInt(hierarchy_level) : 50;
  if (isNaN(hierarchyLevel) || hierarchyLevel < 0 || hierarchyLevel > 100) {
    throw new Error('Hierarchy level must be between 0 and 100');
  }
  
  // Generate UUID
  const roleUuid = uuidv4();
  
  // Insert role
  await executeQuery(
    `INSERT INTO Roles (uuid, code, name, description, hierarchy_level, is_system_role, is_active)
     VALUES (?, ?, ?, ?, ?, FALSE, TRUE)`,
    [roleUuid, code, name, description || null, hierarchyLevel]
  );
  
  // Get created role
  const role = await getRoleByUuid(roleUuid);
  
  // Log audit trail
  await logAuthorizationAction({
    actorUserUuid: actorUuid,
    actionType: 'ROLE_CREATED',
    resourceType: 'Role',
    resourceUuid: roleUuid,
    newValue: JSON.stringify({ code, name, description, hierarchy_level: hierarchyLevel })
  });
  
  // Invalidate cache
  invalidateRoleCache(roleUuid);
  
  return role;
}

/**
 * Update an existing role
 * Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 1.6
 * 
 * @param {string} roleUuid - Role UUID
 * @param {Object} updates - Fields to update
 * @param {string} updates.name - Role name
 * @param {string} updates.description - Role description
 * @param {number} updates.hierarchy_level - Hierarchy level (only for non-system roles)
 * @param {string} actorUuid - UUID of user updating the role
 * @returns {Promise<Object>} Updated role
 * @throws {Error} If role not found or system role restrictions violated
 */
async function updateRole(roleUuid, updates, actorUuid) {
  // Get existing role
  const role = await getRoleByUuid(roleUuid);
  if (!role) {
    throw new Error('Role not found');
  }
  
  // Check system role restrictions
  if (role.is_system_role) {
    // System roles can only update description
    const allowedFields = ['description'];
    const requestedFields = Object.keys(updates);
    const hasDisallowedFields = requestedFields.some(field => !allowedFields.includes(field));
    
    if (hasDisallowedFields) {
      throw new Error('System roles can only update description field');
    }
  }
  
  // Build update query
  const allowedUpdates = role.is_system_role 
    ? ['description']
    : ['name', 'description', 'hierarchy_level'];
  
  const updateFields = [];
  const params = [];
  
  for (const [key, value] of Object.entries(updates)) {
    if (allowedUpdates.includes(key)) {
      if (key === 'hierarchy_level') {
        const hierarchyLevel = parseInt(value);
        if (isNaN(hierarchyLevel) || hierarchyLevel < 0 || hierarchyLevel > 100) {
          throw new Error('Hierarchy level must be between 0 and 100');
        }
        updateFields.push(`${key} = ?`);
        params.push(hierarchyLevel);
      } else {
        updateFields.push(`${key} = ?`);
        params.push(value);
      }
    }
  }
  
  if (updateFields.length === 0) {
    throw new Error('No valid fields to update');
  }
  
  // Add UUID to params
  params.push(roleUuid);
  
  // Update role
  await executeQuery(
    `UPDATE Roles SET ${updateFields.join(', ')}, updated_at = CURRENT_TIMESTAMP WHERE uuid = ?`,
    params
  );
  
  // Get updated role
  const updatedRole = await getRoleByUuid(roleUuid);
  
  // Log audit trail
  await logAuthorizationAction({
    actorUserUuid: actorUuid,
    actionType: 'ROLE_UPDATED',
    resourceType: 'Role',
    resourceUuid: roleUuid,
    previousValue: JSON.stringify(role),
    newValue: JSON.stringify(updates)
  });
  
  // Invalidate cache
  invalidateRoleCache(roleUuid);
  
  return updatedRole;
}

/**
 * Delete a role (soft delete by setting is_active to FALSE)
 * Requirements: 1.1, 1.2, 1.3, 1.6, 1.7
 * 
 * @param {string} roleUuid - Role UUID
 * @param {string} actorUuid - UUID of user deleting the role
 * @returns {Promise<void>}
 * @throws {Error} If role not found, system role, or users assigned
 */
async function deleteRole(roleUuid, actorUuid) {
  // Get role
  const role = await getRoleByUuid(roleUuid);
  if (!role) {
    throw new Error('Role not found');
  }
  
  // Check if system role
  if (role.is_system_role) {
    throw new Error('System roles cannot be deleted');
  }
  
  // Check for assigned users
  const userCount = await getUserCountForRole(roleUuid);
  if (userCount > 0) {
    throw new Error(`Cannot delete role with ${userCount} assigned user(s)`);
  }
  
  // Soft delete (set is_active to FALSE)
  await executeQuery(
    `UPDATE Roles SET is_active = FALSE, updated_at = CURRENT_TIMESTAMP WHERE uuid = ?`,
    [roleUuid]
  );
  
  // Log audit trail
  await logAuthorizationAction({
    actorUserUuid: actorUuid,
    actionType: 'ROLE_DELETED',
    resourceType: 'Role',
    resourceUuid: roleUuid,
    previousValue: JSON.stringify(role)
  });
  
  // Invalidate cache
  invalidateRoleCache(roleUuid);
}

/**
 * Set role status (activate/deactivate)
 * Requirements: 1.1, 1.3
 * 
 * @param {string} roleUuid - Role UUID
 * @param {boolean} isActive - Active status
 * @param {string} actorUuid - UUID of user changing status
 * @returns {Promise<Object>} Updated role
 * @throws {Error} If role not found or system role
 */
async function setRoleStatus(roleUuid, isActive, actorUuid) {
  // Get role
  const role = await getRoleByUuid(roleUuid);
  if (!role) {
    throw new Error('Role not found');
  }
  
  // Check if system role
  if (role.is_system_role) {
    throw new Error('Cannot change status of system roles');
  }
  
  // Update status
  await executeQuery(
    `UPDATE Roles SET is_active = ?, updated_at = CURRENT_TIMESTAMP WHERE uuid = ?`,
    [isActive ? 1 : 0, roleUuid]
  );
  
  // Get updated role
  const updatedRole = await getRoleByUuid(roleUuid);
  
  // Log audit trail
  await logAuthorizationAction({
    actorUserUuid: actorUuid,
    actionType: 'ROLE_STATUS_CHANGED',
    resourceType: 'Role',
    resourceUuid: roleUuid,
    previousValue: role.is_active ? 'active' : 'inactive',
    newValue: isActive ? 'active' : 'inactive'
  });
  
  // Invalidate cache
  invalidateRoleCache(roleUuid);
  
  return updatedRole;
}

/**
 * Get all permissions grouped by resource
 * Requirements: 2.1
 * 
 * @returns {Promise<Object>} Permissions grouped by resource
 */
async function getAllPermissionsGrouped() {
  const [resources] = await executeQuery(
    `SELECT uuid, code, name, description, display_order
     FROM Resources
     WHERE is_active = TRUE
     ORDER BY display_order, name`
  );
  
  const [permissions] = await executeQuery(
    `SELECT p.uuid, p.code, p.action, p.name, p.description, p.is_sensitive,
            p.requires_scope, p.display_order, p.resource_uuid
     FROM Permissions p
     WHERE p.is_active = TRUE
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
    `SELECT uuid, code, name, description, hierarchy_level, is_active
     FROM DataScopes
     WHERE is_active = TRUE
     ORDER BY hierarchy_level DESC`
  );
  
  return rows;
}

// ============================================================================
// PERMISSION MANAGEMENT
// ============================================================================

/**
 * Check if permission exists by UUID
 * @param {string} permissionUuid - Permission UUID
 * @returns {Promise<Object|null>} Permission object or null
 * @private
 */
async function _getPermissionByUuid(permissionUuid) {
  const [rows] = await executeQuery(
    `SELECT uuid, code, name, requires_scope FROM Permissions WHERE uuid = ?`,
    [permissionUuid]
  );
  return rows.length > 0 ? rows[0] : null;
}

/**
 * Check if role-permission assignment already exists
 * @param {string} roleUuid - Role UUID
 * @param {string} permissionUuid - Permission UUID
 * @returns {Promise<boolean>} True if assignment exists
 * @private
 */
async function _rolePermissionExists(roleUuid, permissionUuid) {
  const [rows] = await executeQuery(
    `SELECT uuid FROM Role_Permissions WHERE role_uuid = ? AND permission_uuid = ?`,
    [roleUuid, permissionUuid]
  );
  return rows.length > 0;
}

/**
 * Get default data scope (lowest hierarchy level)
 * @returns {Promise<Object|null>} Default scope or null
 * @private
 */
async function _getDefaultScope() {
  const [rows] = await executeQuery(
    `SELECT uuid, code, name FROM DataScopes 
     WHERE is_active = TRUE 
     ORDER BY hierarchy_level ASC 
     LIMIT 1`
  );
  return rows.length > 0 ? rows[0] : null;
}

/**
 * Assign a single permission to a role
 * Requirements: 2.2, 2.6, 2.7
 * 
 * @param {string} roleUuid - Role UUID
 * @param {string} permissionUuid - Permission UUID
 * @param {string|null} dataScopeUuid - Data scope UUID (optional, required if permission requires scope)
 * @param {string} actorUuid - UUID of user assigning the permission
 * @param {Object} auditContext - Context for audit logging (ipAddress, userAgent)
 * @returns {Promise<Object>} Assignment result
 * @throws {Error} If role/permission not found, duplicate, or validation fails
 */
async function assignPermissionToRole(roleUuid, permissionUuid, dataScopeUuid = null, actorUuid, auditContext = {}) {
  // Validate role exists
  const role = await getRoleByUuid(roleUuid);
  if (!role) {
    throw new Error('Role not found');
  }
  
  // Validate permission exists
  const permission = await _getPermissionByUuid(permissionUuid);
  if (!permission) {
    throw new Error('Permission not found');
  }
  
  // Check for duplicate assignment
  if (await _rolePermissionExists(roleUuid, permissionUuid)) {
    throw new Error(`Permission ${permission.code} is already assigned to this role`);
  }
  
  // Validate scope requirement
  if (permission.requires_scope && !dataScopeUuid) {
    // Auto-assign default scope
    const defaultScope = await _getDefaultScope();
    if (!defaultScope) {
      throw new Error('Permission requires a data scope but no default scope is available');
    }
    dataScopeUuid = defaultScope.uuid;
  }
  
  // Validate scope exists if provided
  let scopeInfo = null;
  if (dataScopeUuid) {
    const [scopeRows] = await executeQuery(
      `SELECT uuid, code, name FROM DataScopes WHERE uuid = ? AND is_active = TRUE`,
      [dataScopeUuid]
    );
    if (scopeRows.length === 0) {
      throw new Error('Data scope not found or inactive');
    }
    scopeInfo = scopeRows[0];
  }
  
  // Start transaction
  const connection = await executeQuery('START TRANSACTION');
  
  try {
    // Create Role_Permission record
    const rolePermissionUuid = uuidv4();
    await executeQuery(
      `INSERT INTO Role_Permissions (uuid, role_uuid, permission_uuid, granted_by)
       VALUES (?, ?, ?, ?)`,
      [rolePermissionUuid, roleUuid, permissionUuid, actorUuid]
    );
    
    // Create Role_Permission_Scope record if scope is provided
    if (dataScopeUuid) {
      const roleScopeUuid = uuidv4();
      await executeQuery(
        `INSERT INTO Role_Permission_Scopes (uuid, role_uuid, permission_uuid, data_scope_uuid)
         VALUES (?, ?, ?, ?)`,
        [roleScopeUuid, roleUuid, permissionUuid, dataScopeUuid]
      );
    }
    
    // Commit transaction
    await executeQuery('COMMIT');
    
    // Log audit trail
    const rbacAuditService = require('./rbacAuditService');
    await rbacAuditService.logPermissionAssigned(
      roleUuid,
      permissionUuid,
      permission.code,
      scopeInfo?.uuid,
      scopeInfo?.code,
      actorUuid,
      auditContext.ipAddress,
      auditContext.userAgent
    );
    
    // Invalidate cache
    invalidateRoleCache(roleUuid);
    
    return {
      success: true,
      permission: permission.code,
      scope: scopeInfo?.code || null
    };
    
  } catch (error) {
    // Rollback transaction on error
    await executeQuery('ROLLBACK');
    throw error;
  }
}

/**
 * Remove a permission from a role
 * Requirements: 2.3
 * 
 * @param {string} roleUuid - Role UUID
 * @param {string} permissionUuid - Permission UUID
 * @param {string} actorUuid - UUID of user removing the permission
 * @param {Object} auditContext - Context for audit logging (ipAddress, userAgent)
 * @returns {Promise<Object>} Removal result
 * @throws {Error} If role/permission not found or not assigned
 */
async function removePermissionFromRole(roleUuid, permissionUuid, actorUuid, auditContext = {}) {
  // Validate role exists
  const role = await getRoleByUuid(roleUuid);
  if (!role) {
    throw new Error('Role not found');
  }
  
  // Validate permission exists
  const permission = await _getPermissionByUuid(permissionUuid);
  if (!permission) {
    throw new Error('Permission not found');
  }
  
  // Check if assignment exists
  if (!(await _rolePermissionExists(roleUuid, permissionUuid))) {
    throw new Error(`Permission ${permission.code} is not assigned to this role`);
  }
  
  // Start transaction
  await executeQuery('START TRANSACTION');
  
  try {
    // Delete from Role_Permission_Scopes first (if exists)
    await executeQuery(
      `DELETE FROM Role_Permission_Scopes 
       WHERE role_uuid = ? AND permission_uuid = ?`,
      [roleUuid, permissionUuid]
    );
    
    // Delete from Role_Permissions
    await executeQuery(
      `DELETE FROM Role_Permissions 
       WHERE role_uuid = ? AND permission_uuid = ?`,
      [roleUuid, permissionUuid]
    );
    
    // Commit transaction
    await executeQuery('COMMIT');
    
    // Log audit trail
    const rbacAuditService = require('./rbacAuditService');
    await rbacAuditService.logPermissionRemoved(
      roleUuid,
      permissionUuid,
      permission.code,
      actorUuid,
      auditContext.ipAddress,
      auditContext.userAgent
    );
    
    // Invalidate cache
    invalidateRoleCache(roleUuid);
    
    return {
      success: true,
      permission: permission.code
    };
    
  } catch (error) {
    // Rollback transaction on error
    await executeQuery('ROLLBACK');
    throw error;
  }
}

/**
 * Bulk assign permissions to a role
 * Requirements: 2.4, 2.7
 * 
 * @param {string} roleUuid - Role UUID
 * @param {Array<Object>} permissionAssignments - Array of {permission_uuid, data_scope_uuid?}
 * @param {string} actorUuid - UUID of user performing bulk assignment
 * @param {Object} auditContext - Context for audit logging (ipAddress, userAgent)
 * @returns {Promise<Object>} Assignment results {assigned, skipped, errors}
 * @throws {Error} If role not found or validation fails
 */
async function bulkAssignPermissions(roleUuid, permissionAssignments, actorUuid, auditContext = {}) {
  // Validate role exists
  const role = await getRoleByUuid(roleUuid);
  if (!role) {
    throw new Error('Role not found');
  }
  
  if (!Array.isArray(permissionAssignments) || permissionAssignments.length === 0) {
    throw new Error('Permission assignments must be a non-empty array');
  }
  
  const results = {
    assigned: 0,
    skipped: 0,
    errors: []
  };
  
  // Start transaction
  await executeQuery('START TRANSACTION');
  
  try {
    for (const assignment of permissionAssignments) {
      const { permission_uuid, data_scope_uuid } = assignment;
      
      // Validate permission exists
      const permission = await _getPermissionByUuid(permission_uuid);
      if (!permission) {
        results.errors.push({
          permission_uuid,
          error: 'Permission not found'
        });
        continue;
      }
      
      // Check for duplicate (skip if already assigned)
      if (await _rolePermissionExists(roleUuid, permission_uuid)) {
        results.skipped++;
        continue;
      }
      
      // Determine scope
      let finalScopeUuid = data_scope_uuid;
      if (permission.requires_scope && !finalScopeUuid) {
        const defaultScope = await _getDefaultScope();
        if (!defaultScope) {
          results.errors.push({
            permission_uuid,
            error: 'Permission requires scope but no default scope available'
          });
          continue;
        }
        finalScopeUuid = defaultScope.uuid;
      }
      
      // Validate scope if provided
      if (finalScopeUuid) {
        const [scopeRows] = await executeQuery(
          `SELECT uuid FROM DataScopes WHERE uuid = ? AND is_active = TRUE`,
          [finalScopeUuid]
        );
        if (scopeRows.length === 0) {
          results.errors.push({
            permission_uuid,
            error: 'Data scope not found or inactive'
          });
          continue;
        }
      }
      
      // Insert Role_Permission
      const rolePermissionUuid = uuidv4();
      await executeQuery(
        `INSERT INTO Role_Permissions (uuid, role_uuid, permission_uuid, granted_by)
         VALUES (?, ?, ?, ?)`,
        [rolePermissionUuid, roleUuid, permission_uuid, actorUuid]
      );
      
      // Insert Role_Permission_Scope if scope exists
      if (finalScopeUuid) {
        const roleScopeUuid = uuidv4();
        await executeQuery(
          `INSERT INTO Role_Permission_Scopes (uuid, role_uuid, permission_uuid, data_scope_uuid)
           VALUES (?, ?, ?, ?)`,
          [roleScopeUuid, roleUuid, permission_uuid, finalScopeUuid]
        );
      }
      
      results.assigned++;
    }
    
    // Commit transaction
    await executeQuery('COMMIT');
    
    // Log audit trail
    const rbacAuditService = require('./rbacAuditService');
    await rbacAuditService.logBulkPermissionAssignment(
      roleUuid,
      results.assigned,
      results.skipped,
      actorUuid,
      auditContext.ipAddress,
      auditContext.userAgent
    );
    
    // Invalidate cache
    invalidateRoleCache(roleUuid);
    
    return results;
    
  } catch (error) {
    // Rollback transaction on error
    await executeQuery('ROLLBACK');
    throw error;
  }
}

/**
 * Replace all permissions for a role (atomic replace operation)
 * Requirements: 2.5, 2.7
 * 
 * This function removes all existing permissions and assigns new ones in a single transaction.
 * 
 * @param {string} roleUuid - Role UUID
 * @param {Array<Object>} permissionAssignments - Array of {permission_uuid, data_scope_uuid?}
 * @param {string} actorUuid - UUID of user performing replacement
 * @param {Object} auditContext - Context for audit logging (ipAddress, userAgent)
 * @returns {Promise<Object>} Replacement results {removed, added}
 * @throws {Error} If role not found or validation fails
 */
async function replaceAllPermissions(roleUuid, permissionAssignments, actorUuid, auditContext = {}) {
  // Validate role exists
  const role = await getRoleByUuid(roleUuid);
  if (!role) {
    throw new Error('Role not found');
  }
  
  if (!Array.isArray(permissionAssignments)) {
    throw new Error('Permission assignments must be an array');
  }
  
  // Start transaction
  await executeQuery('START TRANSACTION');
  
  try {
    // Count existing permissions for audit
    const [existingCount] = await executeQuery(
      `SELECT COUNT(*) as count FROM Role_Permissions WHERE role_uuid = ?`,
      [roleUuid]
    );
    const removedCount = existingCount[0].count;
    
    // Delete all existing Role_Permission_Scopes
    await executeQuery(
      `DELETE FROM Role_Permission_Scopes WHERE role_uuid = ?`,
      [roleUuid]
    );
    
    // Delete all existing Role_Permissions
    await executeQuery(
      `DELETE FROM Role_Permissions WHERE role_uuid = ?`,
      [roleUuid]
    );
    
    let addedCount = 0;
    
    // Insert new permissions
    for (const assignment of permissionAssignments) {
      const { permission_uuid, data_scope_uuid } = assignment;
      
      // Validate permission exists
      const permission = await _getPermissionByUuid(permission_uuid);
      if (!permission) {
        throw new Error(`Permission ${permission_uuid} not found`);
      }
      
      // Determine scope
      let finalScopeUuid = data_scope_uuid;
      if (permission.requires_scope && !finalScopeUuid) {
        const defaultScope = await _getDefaultScope();
        if (!defaultScope) {
          throw new Error(`Permission ${permission.code} requires scope but no default scope available`);
        }
        finalScopeUuid = defaultScope.uuid;
      }
      
      // Validate scope if provided
      if (finalScopeUuid) {
        const [scopeRows] = await executeQuery(
          `SELECT uuid FROM DataScopes WHERE uuid = ? AND is_active = TRUE`,
          [finalScopeUuid]
        );
        if (scopeRows.length === 0) {
          throw new Error(`Data scope ${finalScopeUuid} not found or inactive`);
        }
      }
      
      // Insert Role_Permission
      const rolePermissionUuid = uuidv4();
      await executeQuery(
        `INSERT INTO Role_Permissions (uuid, role_uuid, permission_uuid, granted_by)
         VALUES (?, ?, ?, ?)`,
        [rolePermissionUuid, roleUuid, permission_uuid, actorUuid]
      );
      
      // Insert Role_Permission_Scope if scope exists
      if (finalScopeUuid) {
        const roleScopeUuid = uuidv4();
        await executeQuery(
          `INSERT INTO Role_Permission_Scopes (uuid, role_uuid, permission_uuid, data_scope_uuid)
           VALUES (?, ?, ?, ?)`,
          [roleScopeUuid, roleUuid, permission_uuid, finalScopeUuid]
        );
      }
      
      addedCount++;
    }
    
    // Commit transaction
    await executeQuery('COMMIT');
    
    // Log audit trail
    const rbacAuditService = require('./rbacAuditService');
    await rbacAuditService.logPermissionReplacement(
      roleUuid,
      removedCount,
      addedCount,
      actorUuid,
      auditContext.ipAddress,
      auditContext.userAgent
    );
    
    // Invalidate cache
    invalidateRoleCache(roleUuid);
    
    return {
      success: true,
      removed: removedCount,
      added: addedCount
    };
    
  } catch (error) {
    // Rollback transaction on error
    await executeQuery('ROLLBACK');
    throw error;
  }
}

// ============================================================================
// SCOPE MANAGEMENT
// ============================================================================

/**
 * Assign a data scope to a role-permission combination
 * Requirements: 3.1, 3.2, 3.4, 3.7
 * 
 * @param {string} roleUuid - Role UUID
 * @param {string} permissionUuid - Permission UUID
 * @param {string} dataScopeUuid - DataScope UUID
 * @param {Object|null} scopeConfig - Optional scope configuration JSON
 * @param {string} actorUuid - UUID of user assigning the scope
 * @param {string|null} ipAddress - IP address of actor
 * @param {string|null} userAgent - User agent string
 * @returns {Promise<Object>} Created or updated scope assignment
 * @throws {Error} If validation fails
 */
async function assignScopeToRolePermission(
  roleUuid, 
  permissionUuid, 
  dataScopeUuid, 
  scopeConfig = null,
  actorUuid,
  ipAddress = null,
  userAgent = null
) {
  // Validate role exists
  const role = await getRoleByUuid(roleUuid);
  if (!role) {
    throw new Error('Role not found');
  }
  
  // Validate permission exists and check if it requires scope
  const [permRows] = await executeQuery(
    `SELECT uuid, code, name, requires_scope FROM Permissions WHERE uuid = ?`,
    [permissionUuid]
  );
  
  if (permRows.length === 0) {
    throw new Error('Permission not found');
  }
  
  const permission = permRows[0];
  
  // Validate scope exists and is active
  const [scopeRows] = await executeQuery(
    `SELECT uuid, code, name, hierarchy_level FROM DataScopes WHERE uuid = ? AND is_active = 1`,
    [dataScopeUuid]
  );
  
  if (scopeRows.length === 0) {
    throw new Error('Data scope not found or inactive');
  }
  
  const scope = scopeRows[0];
  
  // Check if role has the permission assigned
  const [rolePermRows] = await executeQuery(
    `SELECT uuid FROM Role_Permissions WHERE role_uuid = ? AND permission_uuid = ?`,
    [roleUuid, permissionUuid]
  );
  
  if (rolePermRows.length === 0) {
    throw new Error('Permission must be assigned to role before assigning scope');
  }
  
  // Check if scope assignment already exists
  const [existingRows] = await executeQuery(
    `SELECT uuid, data_scope_uuid, scope_configuration FROM Role_Permission_Scopes 
     WHERE role_uuid = ? AND permission_uuid = ?`,
    [roleUuid, permissionUuid]
  );
  
  const scopeConfigJson = scopeConfig ? JSON.stringify(scopeConfig) : null;
  let assignmentUuid;
  let previousScope = null;
  
  if (existingRows.length > 0) {
    // Update existing scope assignment
    assignmentUuid = existingRows[0].uuid;
    previousScope = {
      scope_uuid: existingRows[0].data_scope_uuid,
      configuration: existingRows[0].scope_configuration
    };
    
    await executeQuery(
      `UPDATE Role_Permission_Scopes 
       SET data_scope_uuid = ?, scope_configuration = ?
       WHERE uuid = ?`,
      [dataScopeUuid, scopeConfigJson, assignmentUuid]
    );
  } else {
    // Create new scope assignment
    assignmentUuid = uuidv4();
    
    await executeQuery(
      `INSERT INTO Role_Permission_Scopes 
       (uuid, role_uuid, permission_uuid, data_scope_uuid, scope_configuration)
       VALUES (?, ?, ?, ?, ?)`,
      [assignmentUuid, roleUuid, permissionUuid, dataScopeUuid, scopeConfigJson]
    );
  }
  
  // Log audit trail
  await logAuthorizationAction({
    actorUserUuid: actorUuid,
    actionType: 'SCOPE_ASSIGNED',
    resourceType: 'Role_Permission_Scope',
    resourceUuid: assignmentUuid,
    targetRoleUuid: roleUuid,
    targetPermissionUuid: permissionUuid,
    previousValue: previousScope ? JSON.stringify(previousScope) : null,
    newValue: JSON.stringify({ 
      scope_uuid: dataScopeUuid, 
      scope_code: scope.code,
      configuration: scopeConfig 
    }),
    ipAddress,
    userAgent
  });
  
  // Invalidate cache
  invalidateRoleCache(roleUuid);
  
  // Return the assignment details
  return {
    uuid: assignmentUuid,
    role_uuid: roleUuid,
    permission_uuid: permissionUuid,
    permission_code: permission.code,
    data_scope_uuid: dataScopeUuid,
    scope_code: scope.code,
    scope_name: scope.name,
    scope_configuration: scopeConfig
  };
}

/**
 * Remove a data scope from a role-permission combination
 * If permission requires scope, assigns default scope (lowest hierarchy)
 * Requirements: 3.3, 3.5
 * 
 * @param {string} roleUuid - Role UUID
 * @param {string} permissionUuid - Permission UUID
 * @param {string} actorUuid - UUID of user removing the scope
 * @param {string|null} ipAddress - IP address of actor
 * @param {string|null} userAgent - User agent string
 * @returns {Promise<Object>} Result with default scope info if applicable
 * @throws {Error} If validation fails
 */
async function removeScopeFromRolePermission(
  roleUuid, 
  permissionUuid, 
  actorUuid,
  ipAddress = null,
  userAgent = null
) {
  // Validate role exists
  const role = await getRoleByUuid(roleUuid);
  if (!role) {
    throw new Error('Role not found');
  }
  
  // Validate permission exists and check if it requires scope
  const [permRows] = await executeQuery(
    `SELECT uuid, code, name, requires_scope FROM Permissions WHERE uuid = ?`,
    [permissionUuid]
  );
  
  if (permRows.length === 0) {
    throw new Error('Permission not found');
  }
  
  const permission = permRows[0];
  
  // Get existing scope assignment
  const [existingRows] = await executeQuery(
    `SELECT rps.uuid, ds.code as scope_code, ds.name as scope_name, rps.scope_configuration
     FROM Role_Permission_Scopes rps
     JOIN DataScopes ds ON rps.data_scope_uuid = ds.uuid
     WHERE rps.role_uuid = ? AND rps.permission_uuid = ?`,
    [roleUuid, permissionUuid]
  );
  
  if (existingRows.length === 0) {
    throw new Error('No scope assignment found for this role-permission combination');
  }
  
  const previousScope = existingRows[0];
  
  // Check if permission requires scope
  if (permission.requires_scope) {
    // Get default scope (lowest hierarchy level)
    const [defaultScopeRows] = await executeQuery(
      `SELECT uuid, code, name FROM DataScopes 
       WHERE is_active = 1 
       ORDER BY hierarchy_level ASC 
       LIMIT 1`,
      []
    );
    
    if (defaultScopeRows.length === 0) {
      throw new Error('No default scope available');
    }
    
    const defaultScope = defaultScopeRows[0];
    
    // Update to default scope instead of removing
    await executeQuery(
      `UPDATE Role_Permission_Scopes 
       SET data_scope_uuid = ?, scope_configuration = NULL
       WHERE uuid = ?`,
      [defaultScope.uuid, previousScope.uuid]
    );
    
    // Log audit trail
    await logAuthorizationAction({
      actorUserUuid: actorUuid,
      actionType: 'SCOPE_REMOVED',
      resourceType: 'Role_Permission_Scope',
      resourceUuid: previousScope.uuid,
      targetRoleUuid: roleUuid,
      targetPermissionUuid: permissionUuid,
      previousValue: JSON.stringify({
        scope_code: previousScope.scope_code,
        configuration: previousScope.scope_configuration
      }),
      newValue: JSON.stringify({
        scope_code: defaultScope.code,
        configuration: null,
        reason: 'Defaulted to lowest hierarchy scope (permission requires scope)'
      }),
      ipAddress,
      userAgent
    });
    
    // Invalidate cache
    invalidateRoleCache(roleUuid);
    
    return {
      removed: true,
      defaulted_to_scope: {
        uuid: defaultScope.uuid,
        code: defaultScope.code,
        name: defaultScope.name
      },
      message: 'Scope removed and defaulted to lowest hierarchy scope because permission requires scope'
    };
  } else {
    // Permission doesn't require scope, safe to delete
    await executeQuery(
      `DELETE FROM Role_Permission_Scopes WHERE uuid = ?`,
      [previousScope.uuid]
    );
    
    // Log audit trail
    await logAuthorizationAction({
      actorUserUuid: actorUuid,
      actionType: 'SCOPE_REMOVED',
      resourceType: 'Role_Permission_Scope',
      resourceUuid: previousScope.uuid,
      targetRoleUuid: roleUuid,
      targetPermissionUuid: permissionUuid,
      previousValue: JSON.stringify({
        scope_code: previousScope.scope_code,
        configuration: previousScope.scope_configuration
      }),
      newValue: null,
      ipAddress,
      userAgent
    });
    
    // Invalidate cache
    invalidateRoleCache(roleUuid);
    
    return {
      removed: true,
      defaulted_to_scope: null,
      message: 'Scope removed successfully'
    };
  }
}

/**
 * Get the scope assignment for a specific role-permission combination
 * Requirements: 3.1
 * 
 * @param {string} roleUuid - Role UUID
 * @param {string} permissionUuid - Permission UUID
 * @returns {Promise<Object|null>} Scope assignment details or null
 */
async function getScopeForRolePermission(roleUuid, permissionUuid) {
  const [rows] = await executeQuery(
    `SELECT 
       rps.uuid as assignment_uuid,
       rps.scope_configuration,
       ds.uuid as scope_uuid,
       ds.code as scope_code,
       ds.name as scope_name,
       ds.description as scope_description,
       ds.hierarchy_level,
       ds.scope_type,
       p.code as permission_code,
       p.name as permission_name,
       p.requires_scope
     FROM Role_Permission_Scopes rps
     JOIN DataScopes ds ON rps.data_scope_uuid = ds.uuid
     JOIN Permissions p ON rps.permission_uuid = p.uuid
     WHERE rps.role_uuid = ? AND rps.permission_uuid = ?`,
    [roleUuid, permissionUuid]
  );
  
  if (rows.length === 0) {
    return null;
  }
  
  const row = rows[0];
  
  return {
    assignment_uuid: row.assignment_uuid,
    scope: {
      uuid: row.scope_uuid,
      code: row.scope_code,
      name: row.scope_name,
      description: row.scope_description,
      hierarchy_level: row.hierarchy_level,
      scope_type: row.scope_type
    },
    scope_configuration: row.scope_configuration ? JSON.parse(row.scope_configuration) : null,
    permission: {
      code: row.permission_code,
      name: row.permission_name,
      requires_scope: Boolean(row.requires_scope)
    }
  };
}

/**
 * Validate scope configuration JSON structure
 * Requirements: 3.7
 * 
 * @param {Object} config - Scope configuration object
 * @param {string} scopeCode - Scope code to validate against
 * @returns {boolean} True if valid
 */
function validateScopeConfiguration(config, scopeCode) {
  if (!config) return true; // null/undefined is valid
  
  if (typeof config !== 'object' || Array.isArray(config)) {
    return false;
  }
  
  // Validate based on scope type
  switch (scopeCode) {
    case 'SELECTED_DEPARTMENTS':
      return Array.isArray(config.departmentUuids) && config.departmentUuids.length > 0;
    
    case 'SELECTED_BRANCHES':
      return Array.isArray(config.branchUuids) && config.branchUuids.length > 0;
    
    case 'SELECTED_REGIONS':
      return Array.isArray(config.regionUuids) && config.regionUuids.length > 0;
    
    default:
      // Other scopes don't require specific configuration
      return true;
  }
}

/**
 * Get all scope assignments for a role
 * Requirements: 3.1
 * 
 * @param {string} roleUuid - Role UUID
 * @returns {Promise<Array>} Array of scope assignments
 */
async function getAllScopesForRole(roleUuid) {
  const [rows] = await executeQuery(
    `SELECT 
       rps.uuid as assignment_uuid,
       rps.scope_configuration,
       ds.uuid as scope_uuid,
       ds.code as scope_code,
       ds.name as scope_name,
       ds.hierarchy_level,
       p.uuid as permission_uuid,
       p.code as permission_code,
       p.name as permission_name,
       p.requires_scope,
       r.uuid as resource_uuid,
       r.code as resource_code,
       r.name as resource_name
     FROM Role_Permission_Scopes rps
     JOIN DataScopes ds ON rps.data_scope_uuid = ds.uuid
     JOIN Permissions p ON rps.permission_uuid = p.uuid
     JOIN Resources r ON p.resource_uuid = r.uuid
     WHERE rps.role_uuid = ?
     ORDER BY r.display_order, p.display_order`,
    [roleUuid]
  );
  
  return rows.map(row => ({
    assignment_uuid: row.assignment_uuid,
    permission: {
      uuid: row.permission_uuid,
      code: row.permission_code,
      name: row.permission_name,
      requires_scope: Boolean(row.requires_scope),
      resource: {
        uuid: row.resource_uuid,
        code: row.resource_code,
        name: row.resource_name
      }
    },
    scope: {
      uuid: row.scope_uuid,
      code: row.scope_code,
      name: row.scope_name,
      hierarchy_level: row.hierarchy_level
    },
    scope_configuration: row.scope_configuration ? JSON.parse(row.scope_configuration) : null
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
  getRoleDetails,
  getAllPermissionsGrouped,
  getAllDataScopes,
  
  // Role CRUD operations
  createRole,
  updateRole,
  deleteRole,
  setRoleStatus,
  
  // Permission management operations
  assignPermissionToRole,
  removePermissionFromRole,
  bulkAssignPermissions,
  replaceAllPermissions,
  
  // Scope management operations
  assignScopeToRolePermission,
  removeScopeFromRolePermission,
  getScopeForRolePermission,
  validateScopeConfiguration,
  getAllScopesForRole,
  
  // Validation and helper methods
  validateRoleCode,
  roleCodeExists,
  getUserCountForRole,
};
