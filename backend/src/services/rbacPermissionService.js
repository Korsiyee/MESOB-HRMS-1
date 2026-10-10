/**
 * RBAC Permission Service
 * 
 * This service handles permission and resource queries for the Role Management Module.
 * It provides methods to retrieve permissions grouped by resource, permissions for roles,
 * and resource information with proper sorting by display_order.
 * 
 * Requirements: 2.1, 7.1
 */

const { executeQuery } = require("../utils/dbQuery");

/**
 * Get all permissions grouped by resource
 * Returns permissions organized by their parent resource with proper sorting
 * 
 * @returns {Promise<Array>} Array of resources with nested permissions
 * @example
 * [
 *   {
 *     uuid: 'resource-uuid',
 *     code: 'Employees',
 *     name: 'Employees',
 *     description: 'Employee management',
 *     display_order: 1,
 *     permissions: [
 *       {
 *         uuid: 'perm-uuid',
 *         code: 'Employees.View',
 *         action: 'View',
 *         name: 'View Employees',
 *         description: '...',
 *         requires_scope: true,
 *         is_sensitive: false,
 *         display_order: 1
 *       }
 *     ]
 *   }
 * ]
 */
async function getAllPermissionsGroupedByResource() {
  // Get all active resources sorted by display_order
  const [resources] = await executeQuery(
    `SELECT uuid, code, name, description, category, display_order, is_active
     FROM Resources
     WHERE is_active = TRUE
     ORDER BY display_order ASC, name ASC`
  );

  // Get all permissions sorted by display_order
  const [permissions] = await executeQuery(
    `SELECT uuid, resource_uuid, code, action, name, description, 
            requires_scope, is_sensitive, display_order, is_active
     FROM Permissions
     WHERE is_active = TRUE
     ORDER BY display_order ASC, name ASC`
  );

  // Group permissions by resource
  const grouped = resources.map(resource => ({
    uuid: resource.uuid,
    code: resource.code,
    name: resource.name,
    description: resource.description,
    category: resource.category,
    display_order: resource.display_order,
    is_active: resource.is_active,
    permissions: permissions
      .filter(perm => perm.resource_uuid === resource.uuid)
      .map(perm => ({
        uuid: perm.uuid,
        code: perm.code,
        action: perm.action,
        name: perm.name,
        description: perm.description,
        requires_scope: Boolean(perm.requires_scope),
        is_sensitive: Boolean(perm.is_sensitive),
        display_order: perm.display_order,
        resource_uuid: perm.resource_uuid
      }))
  }));

  return grouped;
}

/**
 * Get all permissions for a specific role
 * Returns permissions assigned to a role with resource information and data scopes
 * 
 * @param {string} roleUuid - Role UUID
 * @returns {Promise<Array>} Array of permissions with resource and scope details
 * @example
 * [
 *   {
 *     permission_uuid: 'perm-uuid',
 *     code: 'Employees.View',
 *     action: 'View',
 *     name: 'View Employees',
 *     resource: {
 *       uuid: 'resource-uuid',
 *       code: 'Employees',
 *       name: 'Employees'
 *     },
 *     scope: {
 *       uuid: 'scope-uuid',
 *       code: 'DEPARTMENT',
 *       name: 'Department'
 *     }
 *   }
 * ]
 */
async function getPermissionsForRole(roleUuid) {
  if (!roleUuid) {
    throw new Error('Role UUID is required');
  }

  const [permissions] = await executeQuery(
    `SELECT 
       p.uuid as permission_uuid,
       p.code,
       p.action,
       p.name,
       p.description,
       p.requires_scope,
       p.is_sensitive,
       p.display_order,
       r.uuid as resource_uuid,
       r.code as resource_code,
       r.name as resource_name,
       r.display_order as resource_display_order,
       ds.uuid as scope_uuid,
       ds.code as scope_code,
       ds.name as scope_name,
       ds.hierarchy_level as scope_hierarchy,
       rps.scope_configuration,
       rp.granted_by,
       rp.created_at as granted_at
     FROM Role_Permissions rp
     INNER JOIN Permissions p ON rp.permission_uuid = p.uuid
     INNER JOIN Resources r ON p.resource_uuid = r.uuid
     LEFT JOIN Role_Permission_Scopes rps ON rps.role_uuid = rp.role_uuid 
       AND rps.permission_uuid = rp.permission_uuid
     LEFT JOIN DataScopes ds ON rps.data_scope_uuid = ds.uuid
     WHERE rp.role_uuid = ?
     ORDER BY r.display_order ASC, p.display_order ASC`,
    [roleUuid]
  );

  return permissions.map(perm => ({
    permission_uuid: perm.permission_uuid,
    code: perm.code,
    action: perm.action,
    name: perm.name,
    description: perm.description,
    requires_scope: Boolean(perm.requires_scope),
    is_sensitive: Boolean(perm.is_sensitive),
    display_order: perm.display_order,
    resource: {
      uuid: perm.resource_uuid,
      code: perm.resource_code,
      name: perm.resource_name,
      display_order: perm.resource_display_order
    },
    scope: perm.scope_uuid ? {
      uuid: perm.scope_uuid,
      code: perm.scope_code,
      name: perm.scope_name,
      hierarchy_level: perm.scope_hierarchy
    } : null,
    scope_configuration: perm.scope_configuration 
      ? JSON.parse(perm.scope_configuration) 
      : null,
    granted_by: perm.granted_by,
    granted_at: perm.granted_at
  }));
}

/**
 * Get all resources
 * Returns all active resources sorted by display_order
 * 
 * @returns {Promise<Array>} Array of resources
 * @example
 * [
 *   {
 *     uuid: 'resource-uuid',
 *     code: 'Employees',
 *     name: 'Employees',
 *     description: 'Employee management',
 *     category: 'Core',
 *     display_order: 1,
 *     is_active: true
 *   }
 * ]
 */
async function getAllResources() {
  const [resources] = await executeQuery(
    `SELECT uuid, code, name, description, category, display_order, is_active
     FROM Resources
     WHERE is_active = TRUE
     ORDER BY display_order ASC, name ASC`
  );

  return resources.map(resource => ({
    uuid: resource.uuid,
    code: resource.code,
    name: resource.name,
    description: resource.description,
    category: resource.category,
    display_order: resource.display_order,
    is_active: Boolean(resource.is_active)
  }));
}

/**
 * Get permissions for a specific resource
 * Returns all permissions belonging to a resource
 * 
 * @param {string} resourceCode - Resource code (e.g., 'Employees')
 * @returns {Promise<Array>} Array of permissions
 */
async function getPermissionsByResource(resourceCode) {
  if (!resourceCode) {
    throw new Error('Resource code is required');
  }

  const [permissions] = await executeQuery(
    `SELECT p.uuid, p.code, p.action, p.name, p.description, 
            p.requires_scope, p.is_sensitive, p.display_order,
            r.uuid as resource_uuid, r.code as resource_code, 
            r.name as resource_name
     FROM Permissions p
     INNER JOIN Resources r ON p.resource_uuid = r.uuid
     WHERE r.code = ? AND p.is_active = TRUE
     ORDER BY p.display_order ASC, p.name ASC`,
    [resourceCode]
  );

  return permissions.map(perm => ({
    uuid: perm.uuid,
    code: perm.code,
    action: perm.action,
    name: perm.name,
    description: perm.description,
    requires_scope: Boolean(perm.requires_scope),
    is_sensitive: Boolean(perm.is_sensitive),
    display_order: perm.display_order,
    resource: {
      uuid: perm.resource_uuid,
      code: perm.resource_code,
      name: perm.resource_name
    }
  }));
}

/**
 * Get a single permission by code
 * 
 * @param {string} permissionCode - Permission code (e.g., 'Employees.View')
 * @returns {Promise<Object|null>} Permission object or null if not found
 */
async function getPermissionByCode(permissionCode) {
  if (!permissionCode) {
    throw new Error('Permission code is required');
  }

  const [permissions] = await executeQuery(
    `SELECT p.uuid, p.code, p.action, p.name, p.description, 
            p.requires_scope, p.is_sensitive, p.display_order,
            r.uuid as resource_uuid, r.code as resource_code, 
            r.name as resource_name
     FROM Permissions p
     INNER JOIN Resources r ON p.resource_uuid = r.uuid
     WHERE p.code = ?`,
    [permissionCode]
  );

  if (permissions.length === 0) {
    return null;
  }

  const perm = permissions[0];
  return {
    uuid: perm.uuid,
    code: perm.code,
    action: perm.action,
    name: perm.name,
    description: perm.description,
    requires_scope: Boolean(perm.requires_scope),
    is_sensitive: Boolean(perm.is_sensitive),
    display_order: perm.display_order,
    resource: {
      uuid: perm.resource_uuid,
      code: perm.resource_code,
      name: perm.resource_name
    }
  };
}

/**
 * Get a single permission by UUID
 * 
 * @param {string} permissionUuid - Permission UUID
 * @returns {Promise<Object|null>} Permission object or null if not found
 */
async function getPermissionByUuid(permissionUuid) {
  if (!permissionUuid) {
    throw new Error('Permission UUID is required');
  }

  const [permissions] = await executeQuery(
    `SELECT p.uuid, p.code, p.action, p.name, p.description, 
            p.requires_scope, p.is_sensitive, p.display_order,
            r.uuid as resource_uuid, r.code as resource_code, 
            r.name as resource_name
     FROM Permissions p
     INNER JOIN Resources r ON p.resource_uuid = r.uuid
     WHERE p.uuid = ?`,
    [permissionUuid]
  );

  if (permissions.length === 0) {
    return null;
  }

  const perm = permissions[0];
  return {
    uuid: perm.uuid,
    code: perm.code,
    action: perm.action,
    name: perm.name,
    description: perm.description,
    requires_scope: Boolean(perm.requires_scope),
    is_sensitive: Boolean(perm.is_sensitive),
    display_order: perm.display_order,
    resource: {
      uuid: perm.resource_uuid,
      code: perm.resource_code,
      name: perm.resource_name
    }
  };
}

/**
 * Get resource by code
 * 
 * @param {string} resourceCode - Resource code
 * @returns {Promise<Object|null>} Resource object or null if not found
 */
async function getResourceByCode(resourceCode) {
  if (!resourceCode) {
    throw new Error('Resource code is required');
  }

  const [resources] = await executeQuery(
    `SELECT uuid, code, name, description, category, display_order, is_active
     FROM Resources
     WHERE code = ?`,
    [resourceCode]
  );

  if (resources.length === 0) {
    return null;
  }

  const resource = resources[0];
  return {
    uuid: resource.uuid,
    code: resource.code,
    name: resource.name,
    description: resource.description,
    category: resource.category,
    display_order: resource.display_order,
    is_active: Boolean(resource.is_active)
  };
}

/**
 * Get resource by UUID
 * 
 * @param {string} resourceUuid - Resource UUID
 * @returns {Promise<Object|null>} Resource object or null if not found
 */
async function getResourceByUuid(resourceUuid) {
  if (!resourceUuid) {
    throw new Error('Resource UUID is required');
  }

  const [resources] = await executeQuery(
    `SELECT uuid, code, name, description, category, display_order, is_active
     FROM Resources
     WHERE uuid = ?`,
    [resourceUuid]
  );

  if (resources.length === 0) {
    return null;
  }

  const resource = resources[0];
  return {
    uuid: resource.uuid,
    code: resource.code,
    name: resource.name,
    description: resource.description,
    category: resource.category,
    display_order: resource.display_order,
    is_active: Boolean(resource.is_active)
  };
}

module.exports = {
  getAllPermissionsGroupedByResource,
  getPermissionsForRole,
  getAllResources,
  getPermissionsByResource,
  getPermissionByCode,
  getPermissionByUuid,
  getResourceByCode,
  getResourceByUuid
};
