/**
 * Module-Level Authorization Service
 * 
 * Simple module-level access control using STATIC role-module mapping
 * 
 * Key Concepts:
 * - 5 static roles: EMPLOYEE, DEPT_HEAD, HR_OFFICER, HR_ADMIN, SUPER_ADMIN
 * - Access is determined by STATIC configuration (roleModuleMapping.js)
 * - Module assignments are hardcoded and cannot be changed via UI
 * 
 * Modules:
 * - Employee List, Employee Profile, Register Employee, Departments, Positions, Levels
 * - Attendance Records, Network Settings, Shifts, Letters, Leave Requests, Leave Settings
 * - Accounts, Audit Logs, My Attendance, My Letters, My Leaves, My Accounts
 */

const { db } = require('../config/db');
const { getModulesForRole, getDashboardForRole } = require('../config/roleModuleMapping');

/**
 * Get user's role and accessible modules using STATIC mapping
 * 
 * @param {string} userUuid - User UUID
 * @returns {Promise<Object>} { modules: [], role: {}, dashboard: string }
 */
async function getUserPermissions(userUuid) {
  try {
    // Get user's role from database
    const [rows] = await db.promise().query(`
      SELECT 
        u.uuid as user_uuid,
        u.username,
        u.employee_uuid,
        e.department_uuid,
        r.uuid as role_uuid,
        r.code as role_code,
        r.name as role_name,
        r.hierarchy_level
      FROM Users u
      INNER JOIN Roles r ON u.role_uuid = r.uuid
      LEFT JOIN Employees e ON e.uuid = u.employee_uuid
      WHERE u.uuid = ? AND r.is_active = TRUE
    `, [userUuid]);

    if (rows.length === 0) {
      return null;
    }

    const userData = rows[0];
    
    // Get modules from STATIC configuration based on role
    console.log(`[ModuleAuth] getUserPermissions for user ${userUuid}:`, {
      username: userData.username,
      role_code: userData.role_code,
      role_name: userData.role_name
    });
    const moduleCodesForRole = getModulesForRole(userData.role_code);
    console.log(`[ModuleAuth] Module codes from static mapping for role ${userData.role_code}:`, moduleCodesForRole);
    
    // Get full module details from database
    const modules = [];
    if (moduleCodesForRole.length > 0) {
      const placeholders = moduleCodesForRole.map(() => '?').join(',');
      const [moduleRows] = await db.promise().query(`
        SELECT uuid, code, name, category, icon, display_order
        FROM Modules
        WHERE code IN (${placeholders}) AND is_active = TRUE
        ORDER BY display_order
      `, moduleCodesForRole);
      
      modules.push(...moduleRows);
    }

    console.log(`[ModuleAuth] Final permissions for ${userData.username}:`, {
      role: userData.role_code,
      dashboard: getDashboardForRole(userData.role_code),
      module_count: modules.length,
      modules: modules.map(m => m.code)
    });

    return {
      user: {
        uuid: userData.user_uuid,
        username: userData.username,
        employee_uuid: userData.employee_uuid,
        department_uuid: userData.department_uuid
      },
      role: {
        uuid: userData.role_uuid,
        code: userData.role_code,
        name: userData.role_name,
        hierarchy_level: userData.hierarchy_level
      },
      dashboard: getDashboardForRole(userData.role_code),
      modules
    };
  } catch (error) {
    console.error('[ModuleAuth] Error fetching user permissions:', error);
    throw error;
  }
}

/**
 * Check if user has access to a module
 * 
 * @param {string} userUuid - User UUID
 * @param {string} moduleCode - Module code (EMPLOYEE_LIST, MY_ATTENDANCE, etc.)
 * @returns {Promise<Object|null>} Module object or null if no access
 */
async function checkModuleAccess(userUuid, moduleCode) {
  try {
    const permissions = await getUserPermissions(userUuid);
    
    if (!permissions) {
      return null;
    }

    // Find the module
    const module = permissions.modules.find(m => m.code === moduleCode);
    
    return module || null;
  } catch (error) {
    console.error('[ModuleAuth] Error checking module access:', error);
    return null;
  }
}

/**
 * Get all modules
 * @returns {Promise<Array>} List of all modules
 */
async function getAllModules() {
  try {
    const [modules] = await db.promise().query(`
      SELECT uuid, code, name, description, category, icon, display_order
      FROM Modules
      WHERE is_active = TRUE
      ORDER BY display_order
    `);
    return modules;
  } catch (error) {
    console.error('[ModuleAuth] Error fetching modules:', error);
    throw error;
  }
}

/**
 * Get role with its assigned modules using STATIC mapping
 * @param {string} roleUuid - Role UUID
 * @returns {Promise<Object|null>} Role with modules
 */
async function getRolePermissions(roleUuid) {
  try {
    // Get role details from database
    const [roleRows] = await db.promise().query(`
      SELECT 
        uuid as role_uuid,
        code as role_code,
        name as role_name,
        description,
        hierarchy_level,
        is_system_role
      FROM Roles
      WHERE uuid = ? AND is_active = TRUE
    `, [roleUuid]);

    if (roleRows.length === 0) {
      return null;
    }

    const role = roleRows[0];
    
    // Get modules from STATIC configuration
    const moduleCodesForRole = getModulesForRole(role.role_code);
    
    // Get full module details from database
    const modules = [];
    if (moduleCodesForRole.length > 0) {
      const placeholders = moduleCodesForRole.map(() => '?').join(',');
      const [moduleRows] = await db.promise().query(`
        SELECT uuid, code, name, category, icon, display_order
        FROM Modules
        WHERE code IN (${placeholders}) AND is_active = TRUE
        ORDER BY display_order
      `, moduleCodesForRole);
      
      modules.push(...moduleRows);
    }

    return {
      uuid: role.role_uuid,
      code: role.role_code,
      name: role.role_name,
      description: role.description,
      hierarchy_level: role.hierarchy_level,
      is_system_role: role.is_system_role,
      modules
    };
  } catch (error) {
    console.error('[ModuleAuth] Error fetching role permissions:', error);
    throw error;
  }
}

/**
 * Update role's module assignments - NO-OP since mappings are static
 * This function is kept for backward compatibility but does nothing
 * @param {string} roleUuid - Role UUID
 * @param {Array<string>} moduleUuids - Array of module UUIDs
 * @returns {Promise<void>}
 * @deprecated Module assignments are now static and cannot be changed
 */
async function updateRolePermissions(roleUuid, moduleUuids) {
  console.warn('[ModuleAuth] updateRolePermissions called but module assignments are static and cannot be changed');
  // This is a no-op - module assignments are now hardcoded in roleModuleMapping.js
  return;
}

module.exports = {
  getUserPermissions,
  checkModuleAccess,
  getAllModules,
  getRolePermissions,
  updateRolePermissions // Kept for backward compatibility but does nothing
};
