/**
 * Module-Level Authorization Service
 * 
 * Simple module-level permission system that replaces Permit.io
 * 
 * Key Concepts:
 * - Permissions are granted at MODULE level (not individual actions)
 * - Each role has a SCOPE that determines what data they can see:
 *   - ORGANIZATION: All data across the organization
 *   - DEPARTMENT: Data within user's department only
 *   - PERSONAL: User's own data only
 * 
 * Modules:
 * - HOME, EMPLOYEES, ORGANIZATION, ATTENDANCE, SHIFTS, LETTERS, LEAVE
 * - Personal Space is always accessible to all authenticated users
 */

const { db } = require('../config/db');

/**
 * Get user's permissions from database
 * Returns modules the user can access and their scopes
 * 
 * @param {string} userUuid - User UUID
 * @returns {Promise<Object>} { modules: [], role: {}, defaultScope: {} }
 */
async function getUserPermissions(userUuid) {
  try {
    const [rows] = await db.promise().query(`
      SELECT 
        u.uuid as user_uuid,
        u.username,
        u.employee_uuid,
        p.department_uuid,
        r.uuid as role_uuid,
        r.code as role_code,
        r.name as role_name,
        r.hierarchy_level,
        ds.uuid as default_scope_uuid,
        ds.code as default_scope_code,
        ds.name as default_scope_name,
        ds.level as default_scope_level,
        m.uuid as module_uuid,
        m.code as module_code,
        m.name as module_name,
        s.uuid as scope_uuid,
        s.code as scope_code,
        s.name as scope_name,
        s.level as scope_level
      FROM Users u
      INNER JOIN Roles r ON u.role_uuid = r.uuid
      LEFT JOIN Employees e ON e.uuid = u.employee_uuid
      LEFT JOIN Scopes ds ON r.default_scope_uuid = ds.uuid
      LEFT JOIN RoleModules rm ON r.uuid = rm.role_uuid
      LEFT JOIN Modules m ON rm.module_uuid = m.uuid
      LEFT JOIN Scopes s ON rm.scope_uuid = s.uuid
      WHERE u.uuid = ? AND r.is_active = TRUE AND (m.is_active = TRUE OR m.is_active IS NULL)
    `, [userUuid]);

    if (rows.length === 0) {
      return null;
    }

    // Build permission object
    const firstRow = rows[0];
    const modules = [];
    const moduleMap = new Map();

    for (const row of rows) {
      if (row.module_uuid && !moduleMap.has(row.module_uuid)) {
        moduleMap.set(row.module_uuid, {
          uuid: row.module_uuid,
          code: row.module_code,
          name: row.module_name,
          scope: {
            uuid: row.scope_uuid,
            code: row.scope_code,
            name: row.scope_name,
            level: row.scope_level
          }
        });
        modules.push(moduleMap.get(row.module_uuid));
      }
    }

    return {
      user: {
        uuid: firstRow.user_uuid,
        username: firstRow.username,
        employee_uuid: firstRow.employee_uuid,
        department_uuid: firstRow.department_uuid
      },
      role: {
        uuid: firstRow.role_uuid,
        code: firstRow.role_code,
        name: firstRow.role_name,
        hierarchy_level: firstRow.hierarchy_level
      },
      defaultScope: {
        uuid: firstRow.default_scope_uuid,
        code: firstRow.default_scope_code,
        name: firstRow.default_scope_name,
        level: firstRow.default_scope_level
      },
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
 * @param {string} moduleCode - Module code (HOME, EMPLOYEES, etc.)
 * @returns {Promise<Object|null>} Module permission with scope, or null if no access
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
 * Get scope filter for SQL queries
 * Returns SQL WHERE clause based on user's scope
 * 
 * @param {Object} scope - Scope object { code, level }
 * @param {string} userDepartmentUuid - User's department UUID
 * @param {string} userEmployeeUuid - User's employee UUID
 * @param {Object} options - Query options
 * @param {string} options.departmentColumn - Column name for department (default: 'department_uuid')
 * @param {string} options.employeeColumn - Column name for employee (default: 'employee_uuid')
 * @returns {Object} { where: string, params: [] }
 */
function getScopeFilter(scope, userDepartmentUuid, userEmployeeUuid, options = {}) {
  const {
    departmentColumn = 'department_uuid',
    employeeColumn = 'employee_uuid'
  } = options;

  switch (scope.code) {
    case 'ORGANIZATION':
      // Access to all records
      return { where: '1=1', params: [] };
    
    case 'DEPARTMENT':
      // Access to department records only
      if (!userDepartmentUuid) {
        return { where: '1=0', params: [] }; // No department = no access
      }
      return {
        where: `${departmentColumn} = ?`,
        params: [userDepartmentUuid]
      };
    
    case 'PERSONAL':
      // Access to own records only
      if (!userEmployeeUuid) {
        return { where: '1=0', params: [] }; // No employee = no access
      }
      return {
        where: `${employeeColumn} = ?`,
        params: [userEmployeeUuid]
      };
    
    default:
      // Unknown scope = deny access
      return { where: '1=0', params: [] };
  }
}

/**
 * Apply scope filter to a query
 * Helper to add scope-based WHERE clause to SQL queries
 * 
 * @param {Object} baseQuery - { sql: string, params: [] }
 * @param {Object} scope - Scope object
 * @param {string} userDepartmentUuid - User's department UUID
 * @param {string} userEmployeeUuid - User's employee UUID
 * @param {Object} options - Filter options
 * @returns {Object} { sql: string, params: [] }
 */
function applyScopeToQuery(baseQuery, scope, userDepartmentUuid, userEmployeeUuid, options = {}) {
  const scopeFilter = getScopeFilter(scope, userDepartmentUuid, userEmployeeUuid, options);
  
  // Add scope filter to WHERE clause
  const hasWhere = baseQuery.sql.toUpperCase().includes('WHERE');
  const connector = hasWhere ? ' AND ' : ' WHERE ';
  
  return {
    sql: baseQuery.sql + connector + scopeFilter.where,
    params: [...baseQuery.params, ...scopeFilter.params]
  };
}

/**
 * Check if user can access specific resource based on scope
 * Used for detail pages and updates
 * 
 * @param {Object} scope - Scope object
 * @param {string} userDepartmentUuid - User's department UUID
 * @param {string} userEmployeeUuid - User's employee UUID
 * @param {Object} resource - Resource being accessed
 * @param {string} resource.department_uuid - Resource's department
 * @param {string} resource.employee_uuid - Resource's employee
 * @returns {boolean} True if user can access resource
 */
function canAccessResource(scope, userDepartmentUuid, userEmployeeUuid, resource) {
  switch (scope.code) {
    case 'ORGANIZATION':
      return true; // Can access all resources
    
    case 'DEPARTMENT':
      return resource.department_uuid === userDepartmentUuid;
    
    case 'PERSONAL':
      return resource.employee_uuid === userEmployeeUuid;
    
    default:
      return false;
  }
}

/**
 * Get all modules
 * @returns {Promise<Array>} List of all modules
 */
async function getAllModules() {
  try {
    const [modules] = await db.promise().query(`
      SELECT uuid, code, name, description, icon, display_order
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
 * Get all scopes
 * @returns {Promise<Array>} List of all scopes
 */
async function getAllScopes() {
  try {
    const [scopes] = await db.promise().query(`
      SELECT uuid, code, name, description, level
      FROM Scopes
      ORDER BY level DESC
    `);
    return scopes;
  } catch (error) {
    console.error('[ModuleAuth] Error fetching scopes:', error);
    throw error;
  }
}

/**
 * Get role with its module permissions
 * @param {string} roleUuid - Role UUID
 * @returns {Promise<Object|null>} Role with modules
 */
async function getRolePermissions(roleUuid) {
  try {
    const [rows] = await db.promise().query(`
      SELECT 
        r.uuid as role_uuid,
        r.code as role_code,
        r.name as role_name,
        r.description,
        r.hierarchy_level,
        r.is_system_role,
        ds.uuid as default_scope_uuid,
        ds.code as default_scope_code,
        ds.name as default_scope_name,
        m.uuid as module_uuid,
        m.code as module_code,
        m.name as module_name,
        s.uuid as scope_uuid,
        s.code as scope_code,
        s.name as scope_name
      FROM Roles r
      LEFT JOIN Scopes ds ON r.default_scope_uuid = ds.uuid
      LEFT JOIN RoleModules rm ON r.uuid = rm.role_uuid
      LEFT JOIN Modules m ON rm.module_uuid = m.uuid
      LEFT JOIN Scopes s ON rm.scope_uuid = s.uuid
      WHERE r.uuid = ? AND r.is_active = TRUE
    `, [roleUuid]);

    if (rows.length === 0) {
      return null;
    }

    const firstRow = rows[0];
    const modules = [];

    for (const row of rows) {
      if (row.module_uuid) {
        modules.push({
          uuid: row.module_uuid,
          code: row.module_code,
          name: row.module_name,
          scope: {
            uuid: row.scope_uuid,
            code: row.scope_code,
            name: row.scope_name
          }
        });
      }
    }

    return {
      uuid: firstRow.role_uuid,
      code: firstRow.role_code,
      name: firstRow.role_name,
      description: firstRow.description,
      hierarchy_level: firstRow.hierarchy_level,
      is_system_role: firstRow.is_system_role,
      defaultScope: firstRow.default_scope_uuid ? {
        uuid: firstRow.default_scope_uuid,
        code: firstRow.default_scope_code,
        name: firstRow.default_scope_name
      } : null,
      modules
    };
  } catch (error) {
    console.error('[ModuleAuth] Error fetching role permissions:', error);
    throw error;
  }
}

/**
 * Update role's module permissions
 * @param {string} roleUuid - Role UUID
 * @param {Array} modulePermissions - Array of { module_uuid, scope_uuid }
 * @returns {Promise<void>}
 */
async function updateRolePermissions(roleUuid, modulePermissions) {
  const connection = await db.promise().getConnection();
  
  try {
    await connection.beginTransaction();

    // Remove existing permissions
    await connection.query('DELETE FROM RoleModules WHERE role_uuid = ?', [roleUuid]);

    // Add new permissions
    for (const perm of modulePermissions) {
      const { v4: uuidv4 } = require('uuid');
      await connection.query(
        'INSERT INTO RoleModules (uuid, role_uuid, module_uuid, scope_uuid) VALUES (?, ?, ?, ?)',
        [uuidv4(), roleUuid, perm.module_uuid, perm.scope_uuid]
      );
    }

    await connection.commit();
  } catch (error) {
    await connection.rollback();
    console.error('[ModuleAuth] Error updating role permissions:', error);
    throw error;
  } finally {
    connection.release();
  }
}

module.exports = {
  getUserPermissions,
  checkModuleAccess,
  getScopeFilter,
  applyScopeToQuery,
  canAccessResource,
  getAllModules,
  getAllScopes,
  getRolePermissions,
  updateRolePermissions
};
