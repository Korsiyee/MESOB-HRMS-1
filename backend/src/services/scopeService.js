/**
 * Scope Service
 * 
 * Manages data scope operations for RBAC system.
 * Provides methods to query available data scopes and retrieve scope assignments
 * for specific role-permission combinations.
 * 
 * Data scopes control the breadth of data access for permissions:
 * - ALL: Access to all organizational data
 * - ORGANIZATION: Organization-level access
 * - DEPARTMENT: Department-level access
 * - OWN: Only own records
 * 
 * **Validates: Requirements 3.1**
 */

const { executeQuery } = require("../utils/dbQuery");

/**
 * Get all data scopes sorted by hierarchy level (descending)
 * Higher hierarchy = broader scope (ALL > ORGANIZATION > DEPARTMENT > OWN)
 * 
 * @returns {Promise<Array>} Array of scope objects with uuid, code, name, hierarchy_level
 */
async function getAllScopes() {
  const [rows] = await executeQuery(
    `SELECT uuid, code, name, description, hierarchy_level, scope_type, is_active
     FROM DataScopes
     WHERE is_active = 1
     ORDER BY hierarchy_level DESC`,
    []
  );
  
  return rows;
}

/**
 * Get the data scope assigned to a specific role-permission combination
 * Returns null if no scope is assigned
 * 
 * @param {string} roleUuid - Role UUID
 * @param {string} permissionUuid - Permission UUID
 * @returns {Promise<Object|null>} Scope object with configuration or null
 */
async function getScopeForRolePermission(roleUuid, permissionUuid) {
  const [rows] = await executeQuery(
    `SELECT 
       rps.uuid as assignment_uuid,
       rps.scope_configuration,
       ds.uuid,
       ds.code,
       ds.name,
       ds.description,
       ds.hierarchy_level,
       ds.scope_type
     FROM Role_Permission_Scopes rps
     JOIN DataScopes ds ON rps.data_scope_uuid = ds.uuid
     WHERE rps.role_uuid = ?
       AND rps.permission_uuid = ?`,
    [roleUuid, permissionUuid]
  );
  
  if (rows.length === 0) {
    return null;
  }
  
  return rows[0];
}

/**
 * Get the default data scope (lowest hierarchy level)
 * Typically this is the "OWN" scope for most restrictive access
 * 
 * @returns {Promise<Object>} Default scope object
 */
async function getDefaultScope() {
  const [rows] = await executeQuery(
    `SELECT uuid, code, name, description, hierarchy_level, scope_type
     FROM DataScopes
     WHERE is_active = 1
     ORDER BY hierarchy_level ASC
     LIMIT 1`,
    []
  );
  
  if (rows.length === 0) {
    throw new Error('No active data scopes found in database');
  }
  
  return rows[0];
}

/**
 * Get a specific data scope by UUID
 * 
 * @param {string} scopeUuid - DataScope UUID
 * @returns {Promise<Object|null>} Scope object or null if not found
 */
async function getScopeByUuid(scopeUuid) {
  const [rows] = await executeQuery(
    `SELECT uuid, code, name, description, hierarchy_level, scope_type, is_active
     FROM DataScopes
     WHERE uuid = ?`,
    [scopeUuid]
  );
  
  return rows.length > 0 ? rows[0] : null;
}

/**
 * Get a specific data scope by code
 * 
 * @param {string} code - DataScope code (e.g., 'ALL', 'DEPARTMENT', 'OWN')
 * @returns {Promise<Object|null>} Scope object or null if not found
 */
async function getScopeByCode(code) {
  const [rows] = await executeQuery(
    `SELECT uuid, code, name, description, hierarchy_level, scope_type, is_active
     FROM DataScopes
     WHERE code = ? AND is_active = 1`,
    [code]
  );
  
  return rows.length > 0 ? rows[0] : null;
}

/**
 * Check if a data scope exists and is active
 * 
 * @param {string} scopeUuid - DataScope UUID
 * @returns {Promise<boolean>} True if scope exists and is active
 */
async function isScopeActive(scopeUuid) {
  const [rows] = await executeQuery(
    `SELECT is_active
     FROM DataScopes
     WHERE uuid = ?`,
    [scopeUuid]
  );
  
  return rows.length > 0 && rows[0].is_active === 1;
}

module.exports = {
  getAllScopes,
  getScopeForRolePermission,
  getDefaultScope,
  getScopeByUuid,
  getScopeByCode,
  isScopeActive
};
