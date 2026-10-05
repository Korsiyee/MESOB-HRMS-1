/**
 * Role Management Service
 * 
 * Handles CRUD operations for roles, permissions, and data scopes.
 * Provides business logic for role administration.
 */

const { executeQuery } = require("../utils/dbQuery");
const { v4: uuidv4 } = require("uuid");
const rbacService = require("./rbacService");

// ============================================================================
// ROLE CRUD OPERATIONS
// ============================================================================

/**
 * Create a new role
 * @param {Object} roleData - Role information
 * @param {string} createdBy - Creator user UUID
 * @returns {Promise<Object>} Created role
 */
async function createRole(roleData, createdBy) {
  const { code, name, description, hierarchyLevel = 10 } = roleData;
  
  // Validate code uniqueness
  const existing = await rbacService.getRoleByCode(code);
  if (existing) {
    throw new Error('Role code already exists');
  }
  
  const uuid = uuidv4();
  
  await executeQuery(
    `INSERT INTO Roles 
     (uuid, code, name, description, is_system_role, hierarchy_level, is_active, 
      can_be_deleted, created_by, updated_by)
     VALUES (?, ?, ?, ?, FALSE, ?, TRUE, TRUE, ?, ?)`,
    [uuid, code, name, description, hierarchyLevel, createdBy, createdBy]
  );
  
  // Log action
  await rbacService.logAuthorizationAction({
    actorUserUuid: createdBy,
    actionType: 'ROLE_CREATED',
    resourceType: 'ROLE',
    resourceUuid: uuid,
    newValue: JSON.stringify({ code, name, hierarchyLevel })
  });
  
  // Invalidate caches
  rbacService.clearAllCaches();
  
  return await rbacService.getRoleByUuid(uuid);
}

/**
 * Update a role
 * @param {string} roleUuid - Role UUID
 * @param {Object} updates - Fields to update
 * @param {string} updatedBy - Updater user UUID
 * @returns {Promise<Object>} Updated role
 */
async function updateRole(roleUuid, updates, updatedBy) {
  const role = await rbacService.getRoleByUuid(roleUuid);
  if (!role) {
    throw new Error('Role not found');
  }
  
  // Prevent modification of system roles' core attributes
  if (role.is_system_role) {
    throw new Error('Cannot modify system role attributes');
  }
  
  const allowedFields = ['name', 'description', 'hierarchy_level'];
  const updateFields = [];
  const params = [];
  
  for (const field of allowedFields) {
    if (updates[field] !== undefined) {
      const dbField = field === 'hierarchy_level' ? 'hierarchy_level' : field;
      updateFields.push(`${dbField} = ?`);
      params.push(updates[field]);
    }
  }
  
  if (updateFields.length === 0) {
    return role;
  }
  
  updateFields.push('updated_by = ?', 'updated_at = CURRENT_TIMESTAMP');
  params.push(updatedBy, roleUuid);
  
  await executeQuery(
    `UPDATE Roles SET ${updateFields.join(', ')} WHERE uuid = ?`,
    params
  );
  
  // Log action
  await rbacService.logAuthorizationAction({
    actorUserUuid: updatedBy,
    actionType: 'ROLE_UPDATED',
    resourceType: 'ROLE',
    resourceUuid: roleUuid,
    previousValue: JSON.stringify(role),
    newValue: JSON.stringify(updates)
  });
  
  // Invalidate caches
  rbacService.invalidateRoleCache(roleUuid);
  
  return await rbacService.getRoleByUuid(roleUuid);
}

/**
 * Delete a role
 * @param {string} roleUuid - Role UUID
 * @param {string} deletedBy - Deleter user UUID
 * @returns {Promise<boolean>}
 */
async function deleteRole(roleUuid, deletedBy) {
  const role = await rbacService.getRoleByUuid(roleUuid);
  if (!role) {
    throw new Error('Role not found');
  }
  
  if (!role.can_be_deleted) {
    throw new Error('This role cannot be deleted');
  }
  
  if (role.is_system_role) {
    throw new Error('Cannot delete system roles');
  }
  
  // Check if role is assigned to any users
  const [users] = await executeQuery(
    `SELECT COUNT(*) as count FROM Users WHERE role_uuid = ?`,
    [roleUuid]
  );
  
  if (users[0].count > 0) {
    throw new Error(
      `Cannot delete role: ${users[0].count} user(s) currently assigned to this role. ` +
      'Please reassign users before deletion.'
    );
  }
  
  await executeQuery(
    `DELETE FROM Roles WHERE uuid = ?`,
    [roleUuid]
  );
  
  // Log action
  await rbacService.logAuthorizationAction({
    actorUserUuid: deletedBy,
    actionType: 'ROLE_DELETED',
    resourceType: 'ROLE',
    resourceUuid: roleUuid,
    previousValue: JSON.stringify(role)
  });
  
  // Invalidate caches
  rbacService.invalidateRoleCache(roleUuid);
  
  return true;
}

/**
 * Activate/deactivate a role
 * @param {string} roleUuid - Role UUID
 * @param {boolean} isActive - Active status
 * @param {string} updatedBy - Updater user UUID
 * @returns {Promise<Object>} Updated role
 */
async function setRoleActiveStatus(roleUuid, isActive, updatedBy) {
  const role = await rbacService.getRoleByUuid(roleUuid);
  if (!role) {
    throw new Error('Role not found');
  }
  
  await executeQuery(
    `UPDATE Roles SET is_active = ?, updated_by = ?, updated_at = CURRENT_TIMESTAMP 
     WHERE uuid = ?`,
    [isActive, updatedBy, roleUuid]
  );
  
  // Log action
  await rbacService.logAuthorizationAction({
    actorUserUuid: updatedBy,
    actionType: isActive ? 'ROLE_ACTIVATED' : 'ROLE_DEACTIVATED',
    resourceType: 'ROLE',
    resourceUuid: roleUuid
  });
  
  // Invalidate caches
  rbacService.invalidateRoleCache(roleUuid);
  
  return await rbacService.getRoleByUuid(roleUuid);
}

// ============================================================================
// PERMISSION ASSIGNMENT
// ============================================================================

/**
 * Assign permission to role
 * @param {string} roleUuid - Role UUID
 * @param {string} permissionUuid - Permission UUID
 * @param {string} grantedBy - Granter user UUID
 * @returns {Promise<boolean>}
 */
async function assignPermissionToRole(roleUuid, permissionUuid, grantedBy) {
  // Check if already assigned
  const [existing] = await executeQuery(
    `SELECT uuid FROM RolePermissions WHERE role_uuid = ? AND permission_uuid = ?`,
    [roleUuid, permissionUuid]
  );
  
  if (existing.length > 0) {
    return true; // Already assigned
  }
  
  const uuid = uuidv4();
  
  await executeQuery(
    `INSERT INTO RolePermissions (uuid, role_uuid, permission_uuid, granted_by)
     VALUES (?, ?, ?, ?)`,
    [uuid, roleUuid, permissionUuid, grantedBy]
  );
  
  // Log action
  await rbacService.logAuthorizationAction({
    actorUserUuid: grantedBy,
    actionType: 'PERMISSION_GRANTED',
    resourceType: 'ROLE_PERMISSION',
    resourceUuid: roleUuid,
    newValue: permissionUuid
  });
  
  // Invalidate caches
  rbacService.invalidateRoleCache(roleUuid);
  
  return true;
}

/**
 * Remove permission from role
 * @param {string} roleUuid - Role UUID
 * @param {string} permissionUuid - Permission UUID
 * @param {string} revokedBy - Revoker user UUID
 * @returns {Promise<boolean>}
 */
async function removePermissionFromRole(roleUuid, permissionUuid, revokedBy) {
  await executeQuery(
    `DELETE FROM RolePermissions WHERE role_uuid = ? AND permission_uuid = ?`,
    [roleUuid, permissionUuid]
  );
  
  // Log action
  await rbacService.logAuthorizationAction({
    actorUserUuid: revokedBy,
    actionType: 'PERMISSION_REVOKED',
    resourceType: 'ROLE_PERMISSION',
    resourceUuid: roleUuid,
    previousValue: permissionUuid
  });
  
  // Invalidate caches
  rbacService.invalidateRoleCache(roleUuid);
  
  return true;
}

/**
 * Bulk assign permissions to role
 * @param {string} roleUuid - Role UUID
 * @param {string[]} permissionUuids - Array of permission UUIDs
 * @param {string} grantedBy - Granter user UUID
 * @returns {Promise<Object>} Result summary
 */
async function assignPermissionsToRole(roleUuid, permissionUuids, grantedBy) {
  let added = 0;
  let skipped = 0;
  
  for (const permissionUuid of permissionUuids) {
    const [existing] = await executeQuery(
      `SELECT uuid FROM RolePermissions WHERE role_uuid = ? AND permission_uuid = ?`,
      [roleUuid, permissionUuid]
    );
    
    if (existing.length > 0) {
      skipped++;
      continue;
    }
    
    const uuid = uuidv4();
    await executeQuery(
      `INSERT INTO RolePermissions (uuid, role_uuid, permission_uuid, granted_by)
       VALUES (?, ?, ?, ?)`,
      [uuid, roleUuid, permissionUuid, grantedBy]
    );
    added++;
  }
  
  // Log action
  await rbacService.logAuthorizationAction({
    actorUserUuid: grantedBy,
    actionType: 'PERMISSION_GRANTED',
    resourceType: 'ROLE_PERMISSION',
    resourceUuid: roleUuid,
    newValue: `Bulk: ${added} permissions added`
  });
  
  // Invalidate caches
  rbacService.invalidateRoleCache(roleUuid);
  
  return { added, skipped, total: permissionUuids.length };
}

/**
 * Replace all role permissions
 * @param {string} roleUuid - Role UUID
 * @param {string[]} permissionUuids - Array of permission UUIDs
 * @param {string} updatedBy - Updater user UUID
 * @returns {Promise<Object>} Result summary
 */
async function replaceRolePermissions(roleUuid, permissionUuids, updatedBy) {
  // Get current permissions
  const [currentPerms] = await executeQuery(
    `SELECT permission_uuid FROM RolePermissions WHERE role_uuid = ?`,
    [roleUuid]
  );
  
  const currentSet = new Set(currentPerms.map(p => p.permission_uuid));
  const newSet = new Set(permissionUuids);
  
  // Determine changes
  const toAdd = permissionUuids.filter(p => !currentSet.has(p));
  const toRemove = currentPerms
    .map(p => p.permission_uuid)
    .filter(p => !newSet.has(p));
  
  // Remove old permissions
  if (toRemove.length > 0) {
    const placeholders = toRemove.map(() => '?').join(',');
    await executeQuery(
      `DELETE FROM RolePermissions 
       WHERE role_uuid = ? AND permission_uuid IN (${placeholders})`,
      [roleUuid, ...toRemove]
    );
  }
  
  // Add new permissions
  for (const permissionUuid of toAdd) {
    const uuid = uuidv4();
    await executeQuery(
      `INSERT INTO RolePermissions (uuid, role_uuid, permission_uuid, granted_by)
       VALUES (?, ?, ?, ?)`,
      [uuid, roleUuid, permissionUuid, updatedBy]
    );
  }
  
  // Log action
  await rbacService.logAuthorizationAction({
    actorUserUuid: updatedBy,
    actionType: 'PERMISSION_GRANTED',
    resourceType: 'ROLE_PERMISSION',
    resourceUuid: roleUuid,
    newValue: `Updated: +${toAdd.length}, -${toRemove.length}`
  });
  
  // Invalidate caches
  rbacService.invalidateRoleCache(roleUuid);
  
  return { 
    added: toAdd.length, 
    removed: toRemove.length, 
    total: permissionUuids.length 
  };
}

// ============================================================================
// DATA SCOPE ASSIGNMENT
// ============================================================================

/**
 * Assign data scope to role-permission
 * @param {string} roleUuid - Role UUID
 * @param {string} permissionUuid - Permission UUID
 * @param {string} dataScopeUuid - Data scope UUID
 * @param {Object} configuration - Scope configuration (optional)
 * @param {string} assignedBy - Assigner user UUID
 * @returns {Promise<boolean>}
 */
async function assignScopeToRolePermission(
  roleUuid, 
  permissionUuid, 
  dataScopeUuid, 
  configuration = null,
  assignedBy
) {
  // Check if permission is assigned to role
  const [rolePerms] = await executeQuery(
    `SELECT uuid FROM RolePermissions WHERE role_uuid = ? AND permission_uuid = ?`,
    [roleUuid, permissionUuid]
  );
  
  if (rolePerms.length === 0) {
    throw new Error('Permission not assigned to role');
  }
  
  // Check if scope already exists
  const [existing] = await executeQuery(
    `SELECT uuid FROM RolePermissionScopes 
     WHERE role_uuid = ? AND permission_uuid = ?`,
    [roleUuid, permissionUuid]
  );
  
  const configJson = configuration ? JSON.stringify(configuration) : null;
  
  if (existing.length > 0) {
    // Update existing
    await executeQuery(
      `UPDATE RolePermissionScopes 
       SET data_scope_uuid = ?, scope_configuration = ?, created_by = ?
       WHERE uuid = ?`,
      [dataScopeUuid, configJson, assignedBy, existing[0].uuid]
    );
  } else {
    // Create new
    const uuid = uuidv4();
    await executeQuery(
      `INSERT INTO RolePermissionScopes 
       (uuid, role_uuid, permission_uuid, data_scope_uuid, scope_configuration, created_by)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [uuid, roleUuid, permissionUuid, dataScopeUuid, configJson, assignedBy]
    );
  }
  
  // Log action
  await rbacService.logAuthorizationAction({
    actorUserUuid: assignedBy,
    actionType: 'SCOPE_ASSIGNED',
    resourceType: 'ROLE_PERMISSION_SCOPE',
    resourceUuid: roleUuid,
    newValue: dataScopeUuid
  });
  
  // Invalidate caches
  rbacService.invalidateRoleCache(roleUuid);
  
  return true;
}

/**
 * Remove scope from role-permission
 * @param {string} roleUuid - Role UUID
 * @param {string} permissionUuid - Permission UUID
 * @param {string} removedBy - Remover user UUID
 * @returns {Promise<boolean>}
 */
async function removeScopeFromRolePermission(roleUuid, permissionUuid, removedBy) {
  await executeQuery(
    `DELETE FROM RolePermissionScopes 
     WHERE role_uuid = ? AND permission_uuid = ?`,
    [roleUuid, permissionUuid]
  );
  
  // Log action
  await rbacService.logAuthorizationAction({
    actorUserUuid: removedBy,
    actionType: 'SCOPE_REMOVED',
    resourceType: 'ROLE_PERMISSION_SCOPE',
    resourceUuid: roleUuid
  });
  
  // Invalidate caches
  rbacService.invalidateRoleCache(roleUuid);
  
  return true;
}

/**
 * Get role with full details (permissions and scopes)
 * @param {string} roleUuid - Role UUID
 * @returns {Promise<Object>} Role with permissions and scopes
 */
async function getRoleWithDetails(roleUuid) {
  const role = await rbacService.getRoleByUuid(roleUuid);
  if (!role) {
    return null;
  }
  
  // Get assigned permissions
  const [permissions] = await executeQuery(
    `SELECT p.uuid, p.code, p.name, p.action, p.description, p.is_sensitive,
            p.requires_scope, r.name as resource_name, r.code as resource_code
     FROM RolePermissions rp
     INNER JOIN Permissions p ON rp.permission_uuid = p.uuid
     INNER JOIN Resources r ON p.resource_uuid = r.uuid
     WHERE rp.role_uuid = ?
     ORDER BY r.display_order, p.display_order`,
    [roleUuid]
  );
  
  // Get scopes for each permission
  const [scopes] = await executeQuery(
    `SELECT rps.permission_uuid, ds.uuid as scope_uuid, ds.code, ds.name, 
            ds.scope_type, rps.scope_configuration
     FROM RolePermissionScopes rps
     INNER JOIN DataScopes ds ON rps.data_scope_uuid = ds.uuid
     WHERE rps.role_uuid = ?`,
    [roleUuid]
  );
  
  // Map scopes to permissions
  const scopeMap = {};
  scopes.forEach(scope => {
    scopeMap[scope.permission_uuid] = {
      uuid: scope.scope_uuid,
      code: scope.code,
      name: scope.name,
      type: scope.scope_type,
      configuration: scope.scope_configuration ? JSON.parse(scope.scope_configuration) : null
    };
  });
  
  // Add scope to each permission
  const permissionsWithScopes = permissions.map(perm => ({
    ...perm,
    scope: scopeMap[perm.uuid] || null
  }));
  
  // Get user count
  const [userCount] = await executeQuery(
    `SELECT COUNT(*) as count FROM Users WHERE role_uuid = ?`,
    [roleUuid]
  );
  
  return {
    ...role,
    permissions: permissionsWithScopes,
    userCount: userCount[0].count
  };
}

// ============================================================================
// USER ROLE ASSIGNMENT
// ============================================================================

/**
 * Assign role to user
 * @param {string} userUuid - User UUID
 * @param {string} roleUuid - Role UUID
 * @param {string} assignedBy - Assigner user UUID
 * @returns {Promise<boolean>}
 */
async function assignRoleToUser(userUuid, roleUuid, assignedBy) {
  // Get current role
  const [current] = await executeQuery(
    `SELECT role_uuid, role FROM Users WHERE uuid = ?`,
    [userUuid]
  );
  
  if (current.length === 0) {
    throw new Error('User not found');
  }
  
  const previousRoleUuid = current[0].role_uuid;
  
  // Update user role
  await executeQuery(
    `UPDATE Users SET role_uuid = ? WHERE uuid = ?`,
    [roleUuid, userUuid]
  );
  
  // Increment permissions_version to invalidate JWT
  await executeQuery(
    `UPDATE Users SET permissions_version = permissions_version + 1 WHERE uuid = ?`,
    [userUuid]
  );
  
  // Log action
  await rbacService.logAuthorizationAction({
    actorUserUuid: assignedBy,
    actionType: 'USER_ROLE_CHANGED',
    resourceType: 'USER',
    resourceUuid: userUuid,
    targetUserUuid: userUuid,
    previousValue: previousRoleUuid,
    newValue: roleUuid
  });
  
  // Invalidate user cache
  rbacService.invalidateUserCache(userUuid);
  
  return true;
}

/**
 * Get users assigned to a role
 * @param {string} roleUuid - Role UUID
 * @returns {Promise<Array>} Array of users
 */
async function getUsersByRole(roleUuid) {
  const [rows] = await executeQuery(
    `SELECT u.uuid, u.username, u.employee_uuid, u.is_active,
            e.first_name, e.middle_name, e.last_name, e.mesob_id,
            d.name as department_name
     FROM Users u
     LEFT JOIN Employees e ON u.employee_uuid = e.uuid
     LEFT JOIN Departments d ON e.department_uuid = d.uuid
     WHERE u.role_uuid = ?
     ORDER BY e.first_name, e.middle_name, e.last_name`,
    [roleUuid]
  );
  
  return rows.map(row => ({
    uuid: row.uuid,
    username: row.username,
    employeeUuid: row.employee_uuid,
    isActive: row.is_active,
    fullName: [row.first_name, row.middle_name, row.last_name]
      .filter(Boolean)
      .join(' '),
    mesobId: row.mesob_id,
    departmentName: row.department_name
  }));
}

// ============================================================================
// EXPORTS
// ============================================================================

module.exports = {
  // Role CRUD
  createRole,
  updateRole,
  deleteRole,
  setRoleActiveStatus,
  getRoleWithDetails,
  
  // Permission assignment
  assignPermissionToRole,
  removePermissionFromRole,
  assignPermissionsToRole,
  replaceRolePermissions,
  
  // Scope assignment
  assignScopeToRolePermission,
  removeScopeFromRolePermission,
  
  // User role assignment
  assignRoleToUser,
  getUsersByRole,
};
