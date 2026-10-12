/**
 * Role Management Service
 * 
 * Simplified service for static role management:
 * - View 5 static roles and their details
 * - Manage module assignments for roles
 * - Query users by role
 * 
 * Note: Roles cannot be created, deleted, or have their core attributes modified.
 * Only module assignments can be changed.
 */

const rbacService = require("./rbacService");
const { executeQuery } = require("../utils/dbQuery");

// ============================================================================
// ROLE VIEWING
// ============================================================================

/**
 * Get all roles (5 static roles)
 * @param {Object} options - Query options
 * @returns {Promise<Array>} Array of roles
 */
async function getAllRoles(options = {}) {
  return await rbacService.getAllRoles(options);
}

/**
 * Get role by UUID with full details including modules
 * @param {string} roleUuid - Role UUID
 * @returns {Promise<Object|null>} Role with modules
 */
async function getRoleWithDetails(roleUuid) {
  return await rbacService.getRoleDetails(roleUuid);
}

/**
 * Get users assigned to a role
 * @param {string} roleUuid - Role UUID
 * @returns {Promise<Array>} Array of users
 */
async function getUsersByRole(roleUuid) {
  return await rbacService.getUsersByRole(roleUuid);
}

// ============================================================================
// MODULE MANAGEMENT
// ============================================================================

/**
 * Get all available modules
 * @returns {Promise<Array>} Array of all modules
 */
async function getAllModules() {
  return await rbacService.getAllModules();
}

/**
 * Get modules grouped by category
 * @returns {Promise<Object>} Modules grouped by category
 */
async function getModulesGrouped() {
  return await rbacService.getModulesGrouped();
}

/**
 * Get modules assigned to a role
 * @param {string} roleUuid - Role UUID
 * @returns {Promise<Array>} Array of modules
 */
async function getRoleModules(roleUuid) {
  const roleDetails = await rbacService.getRoleDetails(roleUuid);
  return roleDetails ? roleDetails.modules : [];
}

/**
 * Assign a single module to a role
 * @param {string} roleUuid - Role UUID
 * @param {string} moduleUuid - Module UUID
 * @param {string} performedBy - User UUID performing the action
 * @returns {Promise<Object>} Assignment result
 */
async function assignModuleToRole(roleUuid, moduleUuid, performedBy) {
  // Verify role exists
  const role = await rbacService.getRoleByUuid(roleUuid);
  if (!role) {
    throw new Error('Role not found');
  }
  
  // Verify user has permission to modify this role
  const canModify = await rbacService.canModifyRole(performedBy, roleUuid);
  if (!canModify) {
    throw new Error('Insufficient permissions to modify this role');
  }
  
  return await rbacService.assignModuleToRole(roleUuid, moduleUuid);
}

/**
 * Remove a module from a role
 * @param {string} roleUuid - Role UUID
 * @param {string} moduleUuid - Module UUID
 * @param {string} performedBy - User UUID performing the action
 * @returns {Promise<void>}
 */
async function removeModuleFromRole(roleUuid, moduleUuid, performedBy) {
  // Verify role exists
  const role = await rbacService.getRoleByUuid(roleUuid);
  if (!role) {
    throw new Error('Role not found');
  }
  
  // Verify user has permission to modify this role
  const canModify = await rbacService.canModifyRole(performedBy, roleUuid);
  if (!canModify) {
    throw new Error('Insufficient permissions to modify this role');
  }
  
  return await rbacService.removeModuleFromRole(roleUuid, moduleUuid);
}

/**
 * Replace all modules for a role
 * @param {string} roleUuid - Role UUID
 * @param {string[]} moduleUuids - Array of module UUIDs
 * @param {string} performedBy - User UUID performing the action
 * @returns {Promise<void>}
 */
async function replaceRoleModules(roleUuid, moduleUuids, performedBy) {
  // Verify role exists
  const role = await rbacService.getRoleByUuid(roleUuid);
  if (!role) {
    throw new Error('Role not found');
  }
  
  // Verify user has permission to modify this role
  const canModify = await rbacService.canModifyRole(performedBy, roleUuid);
  if (!canModify) {
    throw new Error('Insufficient permissions to modify this role');
  }
  
  return await rbacService.replaceRoleModules(roleUuid, moduleUuids);
}

// ============================================================================
// USER ROLE ASSIGNMENT
// ============================================================================

/**
 * Assign a role to a user
 * @param {string} userUuid - User UUID
 * @param {string} roleUuid - Role UUID
 * @param {string} performedBy - User UUID performing the action
 * @returns {Promise<void>}
 */
async function assignRoleToUser(userUuid, roleUuid, performedBy) {
  // Verify role exists
  const role = await rbacService.getRoleByUuid(roleUuid);
  if (!role) {
    throw new Error('Role not found');
  }
  
  // Verify user has permission to assign this role
  const canAssign = await rbacService.canAssignRole(performedBy, roleUuid);
  if (!canAssign) {
    throw new Error('Insufficient permissions to assign this role');
  }
  
  // Verify target user exists
  const [users] = await executeQuery(
    `SELECT uuid, employee_uuid FROM Users WHERE uuid = ?`,
    [userUuid]
  );
  
  if (users.length === 0) {
    throw new Error('User not found');
  }

  // Constraint check for Department Head
  if (role.code === 'DEPT_HEAD' || role.code === 'DEPARTMENT_HEAD') {
    const { isEmployeeDesignatedDeptHead } = require('./departmentService');
    const isHead = users[0].employee_uuid && (await isEmployeeDesignatedDeptHead(users[0].employee_uuid));
    if (!isHead) {
      throw new Error('An employee can only be assigned the Department Head role if they are currently designated as the head of their department.');
    }
  }
  
  return await rbacService.assignRoleToUser(userUuid, roleUuid);
}

/**
 * Get user's current role
 * @param {string} userUuid - User UUID
 * @returns {Promise<Object|null>} User's role
 */
async function getUserRole(userUuid) {
  return await rbacService.getUserRole(userUuid);
}

// ============================================================================
// ROLE INFORMATION
// ============================================================================

/**
 * Get role hierarchy information
 * @returns {Promise<Array>} Roles ordered by hierarchy
 */
async function getRoleHierarchy() {
  const roles = await rbacService.getAllRoles();
  return roles.sort((a, b) => a.hierarchy_level - b.hierarchy_level);
}

/**
 * Get statistics for a role
 * @param {string} roleUuid - Role UUID
 * @returns {Promise<Object>} Role statistics
 */
async function getRoleStatistics(roleUuid) {
  const role = await rbacService.getRoleByUuid(roleUuid);
  if (!role) {
    throw new Error('Role not found');
  }
  
  const userCount = await rbacService.getUserCountForRole(roleUuid);
  const modules = await getRoleModules(roleUuid);
  
  return {
    role,
    userCount,
    moduleCount: modules.length,
    modules
  };
}

/**
 * Check if a user can manage roles
 * @param {string} userUuid - User UUID
 * @returns {Promise<boolean>} True if user can manage roles
 */
async function canManageRoles(userUuid) {
  const role = await rbacService.getUserRole(userUuid);
  
  if (!role) {
    return false;
  }
  
  // Only HR_ADMIN and SUPER_ADMIN can manage roles
  return ['HR_ADMIN', 'SUPER_ADMIN'].includes(role.code);
}

// ============================================================================
// VALIDATION
// ============================================================================

/**
 * Validate module UUIDs
 * @param {string[]} moduleUuids - Array of module UUIDs
 * @returns {Promise<boolean>} True if all modules exist
 */
async function validateModuleUuids(moduleUuids) {
  if (!Array.isArray(moduleUuids) || moduleUuids.length === 0) {
    return false;
  }
  
  const placeholders = moduleUuids.map(() => '?').join(',');
  const [rows] = await executeQuery(
    `SELECT COUNT(*) as count FROM Modules WHERE uuid IN (${placeholders}) AND is_active = TRUE`,
    moduleUuids
  );
  
  return rows[0].count === moduleUuids.length;
}

// ============================================================================
// EXPORTS
// ============================================================================

module.exports = {
  // Role viewing
  getAllRoles,
  getRoleWithDetails,
  getUsersByRole,
  getUserRole,
  getRoleHierarchy,
  getRoleStatistics,
  
  // Module management
  getAllModules,
  getModulesGrouped,
  getRoleModules,
  assignModuleToRole,
  removeModuleFromRole,
  replaceRoleModules,
  
  // User role assignment
  assignRoleToUser,
  
  // Permissions
  canManageRoles,
  
  // Validation
  validateModuleUuids
};
