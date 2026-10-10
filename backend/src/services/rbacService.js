/**
 * RBAC Service - Simple Static Role-Based Access Control
 * 
 * Handles the 5 static roles and their module assignments:
 * - EMPLOYEE, DEPT_HEAD, HR_OFFICER, HR_ADMIN, SUPER_ADMIN
 * 
 * Key Features:
 * - Get roles and their modules (from static config)
 * - Check role hierarchy
 * - User role queries
 */

const { executeQuery } = require("../utils/dbQuery");
const { v4: uuidv4 } = require("uuid");
const { getModulesForRole } = require("../config/roleModuleMapping");

// ============================================================================
// ROLE RETRIEVAL
// ============================================================================

/**
 * Get user's role information
 * @param {string} userUuid - User UUID
 * @returns {Promise<Object|null>} Role object or null
 */
async function getUserRole(userUuid) {
  const [rows] = await executeQuery(
    `SELECT r.uuid, r.code, r.name, r.description, r.hierarchy_level, r.is_system_role
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
 * Get all roles (5 static roles)
 * @param {Object} options - Filter options
 * @returns {Promise<Array>} Array of roles
 */
async function getAllRoles(options = {}) {
  const { includeInactive = false } = options;
  
  let whereClause = '';
  if (!includeInactive) {
    whereClause = 'WHERE is_active = TRUE';
  }
  
  const [rows] = await executeQuery(
    `SELECT uuid, code, name, description, hierarchy_level, is_system_role, is_active
     FROM Roles
     ${whereClause}
     ORDER BY hierarchy_level ASC`,
    []
  );
  
  return rows;
}

/**
 * Get role with its assigned modules (from static config)
 * @param {string} roleUuid - Role UUID
 * @returns {Promise<Object|null>} Role with modules array
 */
async function getRoleDetails(roleUuid) {
  const role = await getRoleByUuid(roleUuid);
  
  if (!role) {
    return null;
  }
  
  // Get assigned modules from static config
  const moduleCodes = getModulesForRole(role.code);
  let modules = [];
  if (moduleCodes.length > 0) {
    const placeholders = moduleCodes.map(() => '?').join(',');
    const [rows] = await executeQuery(
      `SELECT uuid, code, name, description, category, icon, display_order
       FROM Modules
       WHERE code IN (${placeholders}) AND is_active = TRUE
       ORDER BY display_order`,
      moduleCodes
    );
    modules = rows;
  }
  
  role.modules = modules;
  return role;
}

/**
 * Check if user is Super Admin
 * @param {string} userUuid - User UUID
 * @returns {Promise<boolean>} True if user is Super Admin
 */
async function isSuperAdmin(userUuid) {
  const role = await getUserRole(userUuid);
  return role && role.code === 'SUPER_ADMIN';
}

/**
 * Check if user has specific role
 * @param {string} userUuid - User UUID
 * @param {string|string[]} roleCodes - Role code(s) to check
 * @returns {Promise<boolean>} True if user has any of the specified roles
 */
async function hasRole(userUuid, roleCodes) {
  const role = await getUserRole(userUuid);
  if (!role) return false;
  
  const codes = Array.isArray(roleCodes) ? roleCodes : [roleCodes];
  return codes.includes(role.code);
}

// ============================================================================
// MODULE RETRIEVAL
// ============================================================================

/**
 * Get all modules (18 modules)
 * @returns {Promise<Array>} Array of modules
 */
async function getAllModules() {
  const [rows] = await executeQuery(
    `SELECT uuid, code, name, description, category, icon, display_order, is_active
     FROM Modules
     WHERE is_active = TRUE
     ORDER BY display_order`,
    []
  );
  
  return rows;
}

/**
 * Get modules grouped by category
 * @returns {Promise<Object>} Modules grouped by category
 */
async function getModulesGrouped() {
  const modules = await getAllModules();
  
  const grouped = {};
  for (const module of modules) {
    const category = module.category || 'GENERAL';
    if (!grouped[category]) {
      grouped[category] = [];
    }
    grouped[category].push(module);
  }
  
  return grouped;
}

/**
 * Get user's accessible modules (from static config)
 * @param {string} userUuid - User UUID
 * @returns {Promise<Array>} Array of modules user can access
 */
async function getUserModules(userUuid) {
  const role = await getUserRole(userUuid);
  if (!role) return [];
  
  const moduleCodes = getModulesForRole(role.code);
  if (moduleCodes.length === 0) return [];
  
  const placeholders = moduleCodes.map(() => '?').join(',');
  const [rows] = await executeQuery(
    `SELECT uuid, code, name, description, category, icon, display_order
     FROM Modules
     WHERE code IN (${placeholders}) AND is_active = TRUE
     ORDER BY display_order`,
    moduleCodes
  );
  
  return rows;
}

/**
 * Check if user has access to a module (from static config)
 * @param {string} userUuid - User UUID
 * @param {string} moduleCode - Module code
 * @returns {Promise<boolean>} True if user has access
 */
async function hasModuleAccess(userUuid, moduleCode) {
  const role = await getUserRole(userUuid);
  if (!role) return false;
  
  const moduleCodes = getModulesForRole(role.code);
  return moduleCodes.includes(moduleCode);
}

// ============================================================================
// ROLE-MODULE MANAGEMENT (Static - no-ops since modules are hardcoded)
// ============================================================================

/**
 * @deprecated Module assignments are static and cannot be changed
 */
async function assignModuleToRole(roleUuid, moduleUuid) {
  console.warn('[RBAC] assignModuleToRole is a no-op: module assignments are static');
  return { role_uuid: roleUuid, module_uuid: moduleUuid };
}

/**
 * @deprecated Module assignments are static and cannot be changed
 */
async function removeModuleFromRole(roleUuid, moduleUuid) {
  console.warn('[RBAC] removeModuleFromRole is a no-op: module assignments are static');
}

/**
 * @deprecated Module assignments are static and cannot be changed
 */
async function replaceRoleModules(roleUuid, moduleUuids) {
  console.warn('[RBAC] replaceRoleModules is a no-op: module assignments are static');
}

// ============================================================================
// ROLE HIERARCHY
// ============================================================================

/**
 * Check if user can modify a role (based on hierarchy)
 * @param {string} userUuid - User UUID
 * @param {string} targetRoleUuid - Target role UUID
 * @returns {Promise<boolean>} True if user can modify role
 */
async function canModifyRole(userUuid, targetRoleUuid) {
  const userRole = await getUserRole(userUuid);
  const targetRole = await getRoleByUuid(targetRoleUuid);
  
  if (!userRole || !targetRole) {
    return false;
  }
  
  // Super admin can modify anything
  if (userRole.code === 'SUPER_ADMIN') {
    return true;
  }
  
  // Can only modify roles with lower hierarchy level
  return userRole.hierarchy_level > targetRole.hierarchy_level;
}

/**
 * Check if user can assign a role to another user
 * @param {string} userUuid - User UUID
 * @param {string} roleToAssignUuid - Role UUID to assign
 * @returns {Promise<boolean>} True if user can assign role
 */
async function canAssignRole(userUuid, roleToAssignUuid) {
  const userRole = await getUserRole(userUuid);
  const roleToAssign = await getRoleByUuid(roleToAssignUuid);
  
  if (!userRole || !roleToAssign) {
    return false;
  }
  
  // Super admin can assign any role
  if (userRole.code === 'SUPER_ADMIN') {
    return true;
  }
  
  // Can only assign roles with lower hierarchy level
  return userRole.hierarchy_level > roleToAssign.hierarchy_level;
}

// ============================================================================
// USER MANAGEMENT
// ============================================================================

/**
 * Get count of users with specific role
 * @param {string} roleUuid - Role UUID
 * @returns {Promise<number>} User count
 */
async function getUserCountForRole(roleUuid) {
  const [rows] = await executeQuery(
    `SELECT COUNT(*) as count FROM Users WHERE role_uuid = ?`,
    [roleUuid]
  );
  
  return rows[0].count;
}

/**
 * Get users with specific role
 * @param {string} roleUuid - Role UUID
 * @returns {Promise<Array>} Array of users
 */
async function getUsersByRole(roleUuid) {
  const [rows] = await executeQuery(
    `SELECT u.uuid, u.username, u.employee_uuid, u.is_active,
            e.first_name, e.middle_name, e.last_name, e.mesob_id
     FROM Users u
     LEFT JOIN Employees e ON u.employee_uuid = e.uuid
     WHERE u.role_uuid = ?
     ORDER BY e.last_name, e.first_name`,
    [roleUuid]
  );
  
  return rows;
}

/**
 * Assign role to user
 * @param {string} userUuid - User UUID
 * @param {string} roleUuid - Role UUID
 * @returns {Promise<void>}
 */
async function assignRoleToUser(userUuid, roleUuid) {
  await executeQuery(
    `UPDATE Users SET role_uuid = ? WHERE uuid = ?`,
    [roleUuid, userUuid]
  );
}

// ============================================================================
// VALIDATION
// ============================================================================

/**
 * Check if role code exists
 * @param {string} code - Role code
 * @param {string} excludeUuid - UUID to exclude from check (for updates)
 * @returns {Promise<boolean>} True if code exists
 */
async function roleCodeExists(code, excludeUuid = null) {
  let query = `SELECT COUNT(*) as count FROM Roles WHERE code = ?`;
  const params = [code];
  
  if (excludeUuid) {
    query += ` AND uuid != ?`;
    params.push(excludeUuid);
  }
  
  const [rows] = await executeQuery(query, params);
  return rows[0].count > 0;
}

/**
 * Validate role code format
 * @param {string} code - Role code
 * @returns {boolean} True if valid
 */
function validateRoleCode(code) {
  // Must be uppercase with underscores only
  return /^[A-Z_]+$/.test(code);
}

// ============================================================================
// EXPORTS
// ============================================================================

module.exports = {
  // Role retrieval
  getUserRole,
  getRoleByUuid,
  getRoleByCode,
  getAllRoles,
  getRoleDetails,
  isSuperAdmin,
  hasRole,
  
  // Module retrieval
  getAllModules,
  getModulesGrouped,
  getUserModules,
  hasModuleAccess,
  
  // Role-module management
  assignModuleToRole,
  removeModuleFromRole,
  replaceRoleModules,
  
  // Role hierarchy
  canModifyRole,
  canAssignRole,
  
  // User management
  getUserCountForRole,
  getUsersByRole,
  assignRoleToUser,
  
  // Validation
  roleCodeExists,
  validateRoleCode
};
