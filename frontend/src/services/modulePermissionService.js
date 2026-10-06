/**
 * Module Permission Service
 * 
 * Frontend service for checking module-level permissions
 * Replaces the Permit.io integration with database-driven permissions
 */

import apiClient from '../api/apiClient';

/**
 * Get current user's module permissions
 * @returns {Promise<Object>} User permissions with modules and scopes
 */
export async function getUserPermissions() {
  try {
    const response = await apiClient.get('/module-roles/permissions/me');
    return response.data.data;
  } catch (error) {
    console.error('[ModulePermission] Failed to fetch user permissions:', error);
    throw error;
  }
}

/**
 * Check if user has access to a specific module
 * @param {string} moduleCode - Module code (HOME, EMPLOYEES, ORGANIZATION, etc.)
 * @returns {Promise<Object|null>} Module access info with scope, or null if no access
 */
export async function checkModuleAccess(moduleCode) {
  try {
    const response = await apiClient.get('/module-roles/permissions/check', {
      params: { moduleCode }
    });
    return response.data.data.access;
  } catch (error) {
    console.error('[ModulePermission] Failed to check module access:', error);
    return null;
  }
}

/**
 * Check if user has access to any of the specified modules (OR logic)
 * @param {string[]} moduleCodes - Array of module codes
 * @param {Object} permissions - User permissions object (from getUserPermissions)
 * @returns {boolean} True if user has access to at least one module
 */
export function hasAnyModuleAccess(moduleCodes, permissions) {
  if (!permissions || !permissions.modules) {
    return false;
  }
  
  const userModuleCodes = new Set(permissions.modules.map(m => m.code));
  return moduleCodes.some(code => userModuleCodes.has(code));
}

/**
 * Check if user has access to a specific module (from cached permissions)
 * @param {string} moduleCode - Module code
 * @param {Object} permissions - User permissions object (from getUserPermissions)
 * @returns {Object|null} Module info with scope, or null if no access
 */
export function hasModuleAccess(moduleCode, permissions) {
  if (!permissions || !permissions.modules) {
    return null;
  }
  
  return permissions.modules.find(m => m.code === moduleCode) || null;
}

/**
 * Get user's scope for a specific module
 * @param {string} moduleCode - Module code
 * @param {Object} permissions - User permissions object
 * @returns {string|null} Scope code (ORGANIZATION, DEPARTMENT, PERSONAL) or null
 */
export function getModuleScope(moduleCode, permissions) {
  const moduleAccess = hasModuleAccess(moduleCode, permissions);
  return moduleAccess ? moduleAccess.scope.code : null;
}

/**
 * Check if user has organization-wide scope for any module
 * @param {Object} permissions - User permissions object
 * @returns {boolean} True if user has ORGANIZATION scope for any module
 */
export function hasOrganizationScope(permissions) {
  if (!permissions || !permissions.modules) {
    return false;
  }
  
  return permissions.modules.some(m => m.scope.code === 'ORGANIZATION');
}

/**
 * Check if user has department scope for any module
 * @param {Object} permissions - User permissions object
 * @returns {boolean} True if user has DEPARTMENT scope for any module
 */
export function hasDepartmentScope(permissions) {
  if (!permissions || !permissions.modules) {
    return false;
  }
  
  return permissions.modules.some(m => m.scope.code === 'DEPARTMENT');
}

/**
 * Get all modules user has access to
 * @param {Object} permissions - User permissions object
 * @returns {Array} Array of module codes
 */
export function getAccessibleModules(permissions) {
  if (!permissions || !permissions.modules) {
    return [];
  }
  
  return permissions.modules.map(m => m.code);
}

export default {
  getUserPermissions,
  checkModuleAccess,
  hasAnyModuleAccess,
  hasModuleAccess,
  getModuleScope,
  hasOrganizationScope,
  hasDepartmentScope,
  getAccessibleModules
};
