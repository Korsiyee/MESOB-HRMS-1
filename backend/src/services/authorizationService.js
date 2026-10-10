/**
 * Authorization Service
 * 
 * Centralized database-driven authorization system.
 * Replaces the old occupation-based permission model.
 * 
 * Core principles:
 * - All authorization data comes from database (Roles, Permissions, RolePermissions)
 * - No hardcoded role names or permission strings in business logic
 * - Permission checks are cached with automatic invalidation
 * - Role hierarchy enforced via numeric rank field
 */

const { executeQuery } = require("../utils/dbQuery");
const LRU = require("lru-cache");

// ═══════════════════════════════════════════════════════════════════════
// CACHE CONFIGURATION
// ═══════════════════════════════════════════════════════════════════════

const permissionsCache = new LRU({
  max: 1000, // Maximum 1000 cached user permission sets
  ttl: 1000 * 60 * 15, // 15 minutes TTL
  updateAgeOnGet: true,
});

const rolesCache = new LRU({
  max: 100, // Cache role definitions
  ttl: 1000 * 60 * 30, // 30 minutes TTL
});

// ═══════════════════════════════════════════════════════════════════════
// CORE AUTHORIZATION METHODS
// ═══════════════════════════════════════════════════════════════════════

/**
 * Get user's role from database
 * @param {string} userId - User UUID
 * @returns {Promise<Object|null>} Role object with id, code, rank, name
 */
async function getUserRole(userId) {
  const [rows] = await executeQuery(
    `SELECT r.id, r.uuid, r.code, r.name, r.rank, r.description
     FROM Users u
     JOIN Roles r ON u.role_id = r.id
     WHERE u.uuid = ? AND r.is_active = TRUE
     LIMIT 1`,
    [userId]
  );
  
  return rows[0] || null;
}

/**
 * Get role by ID (with caching)
 * @param {number} roleId - Role ID
 * @returns {Promise<Object|null>} Role object
 */
async function getRoleById(roleId) {
  const cacheKey = `role:${roleId}`;
  let role = rolesCache.get(cacheKey);
  
  if (role) return role;
  
  const [rows] = await executeQuery(
    `SELECT id, uuid, code, name, rank, description, is_active
     FROM Roles
     WHERE id = ?`,
    [roleId]
  );
  
  role = rows[0] || null;
  if (role) {
    rolesCache.set(cacheKey, role);
  }
  
  return role;
}

/**
 * Get role by code (e.g., "SUPER_ADMIN")
 * @param {string} code - Role code
 * @returns {Promise<Object|null>} Role object
 */
async function getRoleByCode(code) {
  const cacheKey = `role:code:${code}`;
  let role = rolesCache.get(cacheKey);
  
  if (role) return role;
  
  const [rows] = await executeQuery(
    `SELECT id, uuid, code, name, rank, description, is_active
     FROM Roles
     WHERE code = ? AND is_active = TRUE`,
    [code]
  );
  
  role = rows[0] || null;
  if (role) {
    rolesCache.set(cacheKey, role);
  }
  
  return role;
}

/**
 * Get user's permissions from database (with caching)
 * @param {string} userId - User UUID
 * @returns {Promise<string[]>} Array of permission codes (e.g., ["employees.view", "leave.approve"])
 */
async function getUserPermissions(userId) {
  // Check cache first
  const cacheKey = `perms:${userId}`;
  let permissions = permissionsCache.get(cacheKey);
  
  if (permissions) {
    return permissions;
  }
  
  // Query from database
  const [rows] = await executeQuery(
    `SELECT DISTINCT p.code
     FROM Users u
     JOIN Roles r ON u.role_uuid = r.uuid
     JOIN Role_Permissions rp ON r.uuid = rp.role_uuid
     JOIN Permissions p ON rp.permission_uuid = p.uuid
     WHERE u.uuid = ? 
       AND r.is_active = TRUE
       AND p.is_active = TRUE`,
    [userId]
  );
  
  permissions = rows.map(row => row.code);
  
  // Cache result
  permissionsCache.set(cacheKey, permissions);
  
  return permissions;
}

/**
 * Get user's detailed permissions (with permission metadata)
 * @param {string} userId - User UUID
 * @returns {Promise<Array>} Array of permission objects
 */
async function getUserPermissionsDetailed(userId) {
  const [rows] = await executeQuery(
    `SELECT DISTINCT p.id, p.uuid, p.code, p.resource, p.action, p.description, p.requires_scope
     FROM Users u
     JOIN Roles r ON u.role_uuid = r.uuid
     JOIN Role_Permissions rp ON r.uuid = rp.role_uuid
     JOIN Permissions p ON rp.permission_uuid = p.uuid
     WHERE u.uuid = ? 
       AND r.is_active = TRUE
       AND p.is_active = TRUE
     ORDER BY p.resource, p.action`,
    [userId]
  );
  
  return rows;
}

/**
 * Check if user has a specific permission
 * @param {string} userId - User UUID
 * @param {string} permissionCode - Permission code (e.g., "employees.view")
 * @returns {Promise<boolean>} True if user has permission
 */
async function hasPermission(userId, permissionCode) {
  const permissions = await getUserPermissions(userId);
  return permissions.includes(permissionCode);
}

/**
 * Check if user has ANY of the specified permissions (OR logic)
 * @param {string} userId - User UUID
 * @param {string[]} permissionCodes - Array of permission codes
 * @returns {Promise<boolean>} True if user has at least one permission
 */
async function hasAnyPermission(userId, permissionCodes) {
  if (!permissionCodes || permissionCodes.length === 0) return true;
  
  const permissions = await getUserPermissions(userId);
  return permissionCodes.some(code => permissions.includes(code));
}

/**
 * Check if user has ALL of the specified permissions (AND logic)
 * @param {string} userId - User UUID
 * @param {string[]} permissionCodes - Array of permission codes
 * @returns {Promise<boolean>} True if user has all permissions
 */
async function hasAllPermissions(userId, permissionCodes) {
  if (!permissionCodes || permissionCodes.length === 0) return true;
  
  const permissions = await getUserPermissions(userId);
  return permissionCodes.every(code => permissions.includes(code));
}

/**
 * Get user's data access scope
 * @param {string} userId - User UUID
 * @returns {Promise<Object>} Scope object: { type, value, description }
 */
async function getUserScope(userId) {
  // Query assigned scopes (most permissive wins)
  const [rows] = await executeQuery(
    `SELECT scope_type, scope_value
     FROM UserScopes
     WHERE user_uuid = ?
     ORDER BY 
       CASE scope_type
         WHEN 'ALL' THEN 1
         WHEN 'COMPANY' THEN 2
         WHEN 'BRANCH' THEN 3
         WHEN 'DEPARTMENT' THEN 4
         WHEN 'SELF' THEN 5
       END
     LIMIT 1`,
    [userId]
  );
  
  if (rows.length > 0) {
    return {
      type: rows[0].scope_type,
      value: rows[0].scope_value,
    };
  }
  
  // Default scope: SELF
  return {
    type: 'SELF',
    value: null,
  };
}

/**
 * Check if actor can modify target role (based on hierarchy)
 * Actor must have HIGHER rank than target to modify
 * 
 * @param {number} actorRoleId - Actor's role ID
 * @param {number} targetRoleId - Target role ID to assign/modify
 * @returns {Promise<boolean>} True if actor can modify target role
 */
async function canModifyRole(actorRoleId, targetRoleId) {
  const actorRole = await getRoleById(actorRoleId);
  const targetRole = await getRoleById(targetRoleId);
  
  if (!actorRole || !targetRole) return false;
  
  // Actor must have strictly higher rank than target
  return actorRole.rank > targetRole.rank;
}

/**
 * Comprehensive authorization check with scope awareness
 * 
 * @param {string} userId - User UUID
 * @param {string} permissionCode - Permission code
 * @param {string} [resourceOwnerId] - Resource owner UUID (for self-access check)
 * @returns {Promise<Object>} { authorized, reason }
 */
async function authorizeAction(userId, permissionCode, resourceOwnerId = null) {
  // Check permission
  const hasPerms = await hasPermission(userId, permissionCode);
  
  if (!hasPerms) {
    return {
      authorized: false,
      reason: `Missing permission: ${permissionCode}`,
    };
  }
  
  // If resource owner is specified, check if it matches user (self-access)
  if (resourceOwnerId && resourceOwnerId === userId) {
    return {
      authorized: true,
      reason: 'Self-access granted',
    };
  }
  
  // Check scope if permission requires it
  const [permRows] = await executeQuery(
    `SELECT requires_scope FROM Permissions WHERE code = ?`,
    [permissionCode]
  );
  
  if (permRows.length > 0 && permRows[0].requires_scope) {
    const scope = await getUserScope(userId);
    
    // Scope enforcement is handled in controllers/middleware
    // Here we just return the scope for filtering
    return {
      authorized: true,
      reason: 'Permission granted with scope',
      scope,
    };
  }
  
  return {
    authorized: true,
    reason: 'Permission granted',
  };
}

// ═══════════════════════════════════════════════════════════════════════
// CACHE MANAGEMENT
// ═══════════════════════════════════════════════════════════════════════

/**
 * Invalidate cached permissions for a user
 * Call this when user's role or permissions change
 * 
 * @param {string} userId - User UUID
 */
function invalidateUserPermissions(userId) {
  const cacheKey = `perms:${userId}`;
  permissionsCache.delete(cacheKey);
  console.log(`[AuthorizationService] Cache invalidated for user: ${userId}`);
}

/**
 * Clear all cached permissions
 * Call this when role-permission mappings change
 */
function clearAllPermissionsCache() {
  permissionsCache.clear();
  console.log('[AuthorizationService] All permissions cache cleared');
}

/**
 * Clear roles cache
 */
function clearRolesCache() {
  rolesCache.clear();
  console.log('[AuthorizationService] Roles cache cleared');
}

// ═══════════════════════════════════════════════════════════════════════
// UTILITY METHODS
// ═══════════════════════════════════════════════════════════════════════

/**
 * Get all roles (for admin UI)
 * @returns {Promise<Array>} Array of all roles
 */
async function getAllRoles() {
  const [rows] = await executeQuery(
    `SELECT id, uuid, code, name, rank, description, is_active, created_at, updated_at
     FROM Roles
     WHERE is_active = TRUE
     ORDER BY rank`
  );
  
  return rows;
}

/**
 * Get all permissions (for admin UI)
 * @param {string} [resourceFilter] - Optional resource filter
 * @returns {Promise<Array>} Array of all permissions
 */
async function getAllPermissions(resourceFilter = null) {
  let query = `
    SELECT id, uuid, resource, action, code, description, requires_scope, is_active, created_at
    FROM Permissions
    WHERE is_active = TRUE
  `;
  
  const params = [];
  
  if (resourceFilter) {
    query += ` AND resource = ?`;
    params.push(resourceFilter);
  }
  
  query += ` ORDER BY resource, action`;
  
  const [rows] = await executeQuery(query, params);
  return rows;
}

/**
 * Get permissions for a specific role
 * @param {number} roleId - Role ID
 * @returns {Promise<Array>} Array of permission objects
 */
async function getRolePermissions(roleId) {
  const [rows] = await executeQuery(
    `SELECT p.id, p.uuid, p.code, p.resource, p.action, p.description, p.requires_scope
     FROM Role_Permissions rp
     JOIN Permissions p ON rp.permission_id = p.id
     WHERE rp.role_id = ? AND p.is_active = TRUE
     ORDER BY p.resource, p.action`,
    [roleId]
  );
  
  return rows;
}

/**
 * Check if user has Super Admin role (for bypass logic)
 * @param {string} userId - User UUID
 * @returns {Promise<boolean>} True if user is Super Admin
 */
async function isSuperAdmin(userId) {
  const role = await getUserRole(userId);
  return role && role.code === 'SUPER_ADMIN';
}

// ═══════════════════════════════════════════════════════════════════════
// EXPORTS
// ═══════════════════════════════════════════════════════════════════════

module.exports = {
  // Core methods
  getUserRole,
  getRoleById,
  getRoleByCode,
  getUserPermissions,
  getUserPermissionsDetailed,
  hasPermission,
  hasAnyPermission,
  hasAllPermissions,
  getUserScope,
  canModifyRole,
  authorizeAction,
  
  // Cache management
  invalidateUserPermissions,
  clearAllPermissionsCache,
  clearRolesCache,
  
  // Utility methods
  getAllRoles,
  getAllPermissions,
  getRolePermissions,
  isSuperAdmin,
};
