/**
 * Role Management API
 * 
 * API functions for RBAC system administration
 */

import { apiRequest } from '../utils/apiClient';

// ============================================================================
// ROLES
// ============================================================================

/**
 * Get all roles
 * @param {Object} params - Query parameters (includeInactive, systemOnly, customOnly)
 * @returns {Promise} Roles data
 */
export const getAllRoles = async (params = {}) => {
  const queryString = new URLSearchParams(params).toString();
  const url = `/role-management/roles${queryString ? `?${queryString}` : ''}`;
  return await apiRequest(url, { method: 'GET' });
};

/**
 * Get single role by UUID
 * @param {string} roleUuid - Role UUID
 * @returns {Promise} Role details
 */
export const getRoleById = async (roleUuid) => {
  return await apiRequest(`/role-management/roles/${roleUuid}`, { method: 'GET' });
};

/**
 * Create a new role
 * @param {Object} roleData - Role data (name, code, description, hierarchy_level, is_active)
 * @returns {Promise} Created role
 */
export const createRole = async (roleData) => {
  return await apiRequest('/role-management/roles', {
    method: 'POST',
    body: JSON.stringify(roleData)
  });
};

/**
 * Update an existing role
 * @param {string} roleUuid - Role UUID
 * @param {Object} updates - Updated fields
 * @returns {Promise} Updated role
 */
export const updateRole = async (roleUuid, updates) => {
  return await apiRequest(`/role-management/roles/${roleUuid}`, {
    method: 'PUT',
    body: JSON.stringify(updates)
  });
};

/**
 * Delete a role
 * @param {string} roleUuid - Role UUID
 * @returns {Promise} Deletion confirmation
 */
export const deleteRole = async (roleUuid) => {
  return await apiRequest(`/role-management/roles/${roleUuid}`, { method: 'DELETE' });
};

/**
 * Set role status (activate/deactivate)
 * @param {string} roleUuid - Role UUID
 * @param {boolean} isActive - New active status
 * @returns {Promise} Updated role
 */
export const setRoleStatus = async (roleUuid, isActive) => {
  return await apiRequest(`/role-management/roles/${roleUuid}/status`, {
    method: 'PATCH',
    body: JSON.stringify({ is_active: isActive })
  });
};

/**
 * Get users assigned to a role
 * @param {string} roleUuid - Role UUID
 * @returns {Promise} List of users
 */
export const getRoleUsers = async (roleUuid) => {
  return await apiRequest(`/role-management/roles/${roleUuid}/users`, { method: 'GET' });
};

// ============================================================================
// PERMISSIONS
// ============================================================================

/**
 * Get all available permissions
 * @returns {Promise} All permissions
 */
export const getAllPermissions = async () => {
  return await apiRequest('/role-management/permissions', { method: 'GET' });
};

/**
 * Get all data scopes
 * @returns {Promise} All data scopes
 */
export const getAllDataScopes = async () => {
  return await apiRequest('/role-management/data-scopes', { method: 'GET' });
};

/**
 * Get permissions for a specific role
 * @param {string} roleUuid - Role UUID
 * @returns {Promise} Role permissions
 */
export const getRolePermissions = async (roleUuid) => {
  return await apiRequest(`/role-management/roles/${roleUuid}/permissions`, { method: 'GET' });
};

/**
 * Assign a single permission to a role
 * @param {string} roleUuid - Role UUID
 * @param {Object} data - { permission_uuid, data_scope }
 * @returns {Promise} Assignment confirmation
 */
export const assignPermission = async (roleUuid, data) => {
  return await apiRequest(`/role-management/roles/${roleUuid}/permissions`, {
    method: 'POST',
    body: JSON.stringify(data)
  });
};

/**
 * Remove a permission from a role
 * @param {string} roleUuid - Role UUID
 * @param {string} permissionUuid - Permission UUID
 * @returns {Promise} Removal confirmation
 */
export const removePermission = async (roleUuid, permissionUuid) => {
  return await apiRequest(`/role-management/roles/${roleUuid}/permissions/${permissionUuid}`, {
    method: 'DELETE'
  });
};

/**
 * Assign multiple permissions to a role
 * @param {string} roleUuid - Role UUID
 * @param {Object} data - { permissions: [{ permission_uuid, data_scope }] }
 * @returns {Promise} Assignment confirmation
 */
export const assignBulkPermissions = async (roleUuid, data) => {
  return await apiRequest(`/role-management/roles/${roleUuid}/permissions/bulk`, {
    method: 'POST',
    body: JSON.stringify(data)
  });
};

/**
 * Replace all role permissions
 * @param {string} roleUuid - Role UUID
 * @param {Object} data - { permissionUuids: [...] }
 * @returns {Promise} Replacement confirmation
 */
export const replaceRolePermissions = async (roleUuid, data) => {
  return await apiRequest(`/role-management/roles/${roleUuid}/permissions`, {
    method: 'PUT',
    body: JSON.stringify(data)
  });
};

/**
 * Update permission's data scope
 * @param {string} roleUuid - Role UUID
 * @param {string} permissionUuid - Permission UUID
 * @param {Object} data - { data_scope }
 * @returns {Promise} Update confirmation
 */
export const updatePermissionScope = async (roleUuid, permissionUuid, data) => {
  return await apiRequest(`/role-management/roles/${roleUuid}/permissions/${permissionUuid}/scope`, {
    method: 'PATCH',
    body: JSON.stringify(data)
  });
};

// ============================================================================
// USER ROLE ASSIGNMENT
// ============================================================================

/**
 * Assign role to user
 * @param {string} userUuid - User UUID
 * @param {string} roleUuid - Role UUID
 * @returns {Promise} Assignment confirmation
 */
export const assignUserToRole = async (userUuid, roleUuid) => {
  return await apiRequest(`/role-management/users/${userUuid}/role`, {
    method: 'POST',
    body: JSON.stringify({ role_uuid: roleUuid })
  });
};

/**
 * Remove role from user
 * @param {string} roleUuid - Role UUID
 * @param {string} userUuid - User UUID
 * @returns {Promise} Removal confirmation
 */
export const removeUserFromRole = async (roleUuid, userUuid) => {
  return await apiRequest(`/role-management/roles/${roleUuid}/users/${userUuid}`, {
    method: 'DELETE'
  });
};

// ============================================================================
// USER EFFECTIVE PERMISSIONS
// ============================================================================

/**
 * Get effective permissions for a user
 * @param {string} userUuid - User UUID
 * @returns {Promise} Effective permissions
 */
export const getUserEffectivePermissions = async (userUuid) => {
  return await apiRequest(`/role-management/users/${userUuid}/effective-permissions`, {
    method: 'GET'
  });
};

/**
 * Get current user's permissions
 * @returns {Promise} Current user permissions
 */
export const getMyPermissions = async () => {
  return await apiRequest('/role-management/my-permissions', { method: 'GET' });
};

// ============================================================================
// AUDIT LOGS
// ============================================================================

/**
 * Get role audit logs
 * @param {string} roleUuid - Role UUID
 * @param {Object} params - Query parameters
 * @returns {Promise} Audit logs
 */
export const getRoleAuditLogs = async (roleUuid, params = {}) => {
  const queryString = new URLSearchParams(params).toString();
  const url = `/role-management/roles/${roleUuid}/audit-logs${queryString ? `?${queryString}` : ''}`;
  return await apiRequest(url, { method: 'GET' });
};

/**
 * Get user audit logs
 * @param {string} userUuid - User UUID
 * @param {Object} params - Query parameters
 * @returns {Promise} Audit logs
 */
export const getUserAuditLogs = async (userUuid, params = {}) => {
  const queryString = new URLSearchParams(params).toString();
  const url = `/role-management/users/${userUuid}/audit-logs${queryString ? `?${queryString}` : ''}`;
  return await apiRequest(url, { method: 'GET' });
};

// ============================================================================
// RESOURCES
// ============================================================================

/**
 * Get all resources
 * @returns {Promise} All resources
 */
export const getAllResources = async () => {
  return await apiRequest('/role-management/resources', { method: 'GET' });
};

// Export as default object for convenience
export default {
  // Roles
  getAllRoles,
  getRoleById,
  createRole,
  updateRole,
  deleteRole,
  setRoleStatus,
  getRoleUsers,
  
  // Permissions
  getAllPermissions,
  getAllDataScopes,
  getRolePermissions,
  assignPermission,
  removePermission,
  assignBulkPermissions,
  replaceRolePermissions,
  updatePermissionScope,
  
  // User Assignment
  assignUserToRole,
  removeUserFromRole,
  
  // Effective Permissions
  getUserEffectivePermissions,
  getMyPermissions,
  
  // Audit
  getRoleAuditLogs,
  getUserAuditLogs,
  
  // Resources
  getAllResources
};
