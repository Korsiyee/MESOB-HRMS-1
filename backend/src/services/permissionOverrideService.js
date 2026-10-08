/**
 * Permission Override Service
 * 
 * Handles user-specific permission overrides and temporary delegations.
 * Supports ALLOW/DENY overrides and time-bounded delegations.
 */

const { executeQuery } = require("../utils/dbQuery");
const { v4: uuidv4 } = require("uuid");
const rbacService = require("./rbacService");

// ============================================================================
// PERMISSION OVERRIDES
// ============================================================================

/**
 * Add permission override for user
 * @param {Object} overrideData - Override information
 * @param {string} createdBy - Creator user UUID
 * @returns {Promise<Object>} Created override
 */
async function addPermissionOverride(overrideData, createdBy) {
  const {
    userUuid,
    permissionUuid,
    overrideType, // 'ALLOW' or 'DENY'
    reason,
    expiresAt = null
  } = overrideData;
  
  // Validate override type
  if (!['ALLOW', 'DENY'].includes(overrideType)) {
    throw new Error('Invalid override type. Must be ALLOW or DENY');
  }
  
  // Check if override already exists
  const [existing] = await executeQuery(
    `SELECT uuid FROM UserPermissionOverrides 
     WHERE user_uuid = ? AND permission_uuid = ?`,
    [userUuid, permissionUuid]
  );
  
  const uuid = existing.length > 0 ? existing[0].uuid : uuidv4();
  
  if (existing.length > 0) {
    // Update existing override
    await executeQuery(
      `UPDATE UserPermissionOverrides
       SET override_type = ?, reason = ?, expires_at = ?, created_by = ?,
           created_at = CURRENT_TIMESTAMP
       WHERE uuid = ?`,
      [overrideType, reason, expiresAt, createdBy, uuid]
    );
  } else {
    // Create new override
    await executeQuery(
      `INSERT INTO UserPermissionOverrides
       (uuid, user_uuid, permission_uuid, override_type, reason, expires_at, created_by)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [uuid, userUuid, permissionUuid, overrideType, reason, expiresAt, createdBy]
    );
  }
  
  // Increment permissions_version to invalidate JWT
  await executeQuery(
    `UPDATE Users SET permissions_version = permissions_version + 1 WHERE uuid = ?`,
    [userUuid]
  );
  
  // Log action
  await rbacService.logAuthorizationAction({
    actorUserUuid: createdBy,
    actionType: 'OVERRIDE_ADDED',
    resourceType: 'USER_PERMISSION_OVERRIDE',
    targetUserUuid: userUuid,
    newValue: JSON.stringify({ permissionUuid, overrideType, reason })
  });
  
  // Invalidate user cache
  rbacService.invalidateUserCache(userUuid);
  
  return {
    uuid,
    userUuid,
    permissionUuid,
    overrideType,
    reason,
    expiresAt
  };
}

/**
 * Remove permission override
 * @param {string} overrideUuid - Override UUID
 * @param {string} removedBy - Remover user UUID
 * @returns {Promise<boolean>}
 */
async function removePermissionOverride(overrideUuid, removedBy) {
  // Get override details for logging
  const [overrides] = await executeQuery(
    `SELECT user_uuid, permission_uuid, override_type 
     FROM UserPermissionOverrides WHERE uuid = ?`,
    [overrideUuid]
  );
  
  if (overrides.length === 0) {
    throw new Error('Override not found');
  }
  
  const userUuid = overrides[0].user_uuid;
  
  await executeQuery(
    `DELETE FROM UserPermissionOverrides WHERE uuid = ?`,
    [overrideUuid]
  );
  
  // Increment permissions_version to invalidate JWT
  await executeQuery(
    `UPDATE Users SET permissions_version = permissions_version + 1 WHERE uuid = ?`,
    [userUuid]
  );
  
  // Log action
  await rbacService.logAuthorizationAction({
    actorUserUuid: removedBy,
    actionType: 'OVERRIDE_REMOVED',
    resourceType: 'USER_PERMISSION_OVERRIDE',
    targetUserUuid: userUuid,
    previousValue: JSON.stringify(overrides[0])
  });
  
  // Invalidate user cache
  rbacService.invalidateUserCache(userUuid);
  
  return true;
}

/**
 * Get all overrides for a user
 * @param {string} userUuid - User UUID
 * @returns {Promise<Array>} Array of overrides
 */
async function getUserOverrides(userUuid) {
  const [rows] = await executeQuery(
    `SELECT upo.uuid, upo.override_type, upo.reason, upo.expires_at, upo.created_at,
            p.code as permission_code, p.name as permission_name,
            r.name as resource_name,
            creator.username as created_by_username
     FROM UserPermissionOverrides upo
     INNER JOIN Permissions p ON upo.permission_uuid = p.uuid
     INNER JOIN Resources r ON p.resource_uuid = r.uuid
     LEFT JOIN Users creator ON upo.created_by = creator.uuid
     WHERE upo.user_uuid = ?
     ORDER BY upo.created_at DESC`,
    [userUuid]
  );
  
  return rows.map(row => ({
    uuid: row.uuid,
    overrideType: row.override_type,
    permissionCode: row.permission_code,
    permissionName: row.permission_name,
    resourceName: row.resource_name,
    reason: row.reason,
    expiresAt: row.expires_at,
    isExpired: row.expires_at && new Date(row.expires_at) < new Date(),
    createdAt: row.created_at,
    createdBy: row.created_by_username
  }));
}

// ============================================================================
// SCOPE OVERRIDES
// ============================================================================

/**
 * Add scope override for user
 * @param {Object} overrideData - Override information
 * @param {string} createdBy - Creator user UUID
 * @returns {Promise<Object>} Created override
 */
async function addScopeOverride(overrideData, createdBy) {
  const {
    userUuid,
    permissionUuid,
    dataScopeUuid,
    scopeConfiguration = null,
    reason,
    expiresAt = null
  } = overrideData;
  
  // Check if override already exists
  const [existing] = await executeQuery(
    `SELECT uuid FROM UserScopeOverrides 
     WHERE user_uuid = ? AND permission_uuid = ?`,
    [userUuid, permissionUuid]
  );
  
  const uuid = existing.length > 0 ? existing[0].uuid : uuidv4();
  const configJson = scopeConfiguration ? JSON.stringify(scopeConfiguration) : null;
  
  if (existing.length > 0) {
    // Update existing override
    await executeQuery(
      `UPDATE UserScopeOverrides
       SET data_scope_uuid = ?, scope_configuration = ?, reason = ?, 
           expires_at = ?, created_by = ?, created_at = CURRENT_TIMESTAMP
       WHERE uuid = ?`,
      [dataScopeUuid, configJson, reason, expiresAt, createdBy, uuid]
    );
  } else {
    // Create new override
    await executeQuery(
      `INSERT INTO UserScopeOverrides
       (uuid, user_uuid, permission_uuid, data_scope_uuid, scope_configuration, 
        reason, expires_at, created_by)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [uuid, userUuid, permissionUuid, dataScopeUuid, configJson, reason, expiresAt, createdBy]
    );
  }
  
  // Log action
  await rbacService.logAuthorizationAction({
    actorUserUuid: createdBy,
    actionType: 'SCOPE_CHANGED',
    resourceType: 'USER_SCOPE_OVERRIDE',
    targetUserUuid: userUuid,
    newValue: JSON.stringify({ permissionUuid, dataScopeUuid, reason })
  });
  
  // Invalidate user cache
  rbacService.invalidateUserCache(userUuid);
  
  return {
    uuid,
    userUuid,
    permissionUuid,
    dataScopeUuid,
    scopeConfiguration,
    reason,
    expiresAt
  };
}

/**
 * Remove scope override
 * @param {string} overrideUuid - Override UUID
 * @param {string} removedBy - Remover user UUID
 * @returns {Promise<boolean>}
 */
async function removeScopeOverride(overrideUuid, removedBy) {
  // Get override details for logging
  const [overrides] = await executeQuery(
    `SELECT user_uuid FROM UserScopeOverrides WHERE uuid = ?`,
    [overrideUuid]
  );
  
  if (overrides.length === 0) {
    throw new Error('Scope override not found');
  }
  
  const userUuid = overrides[0].user_uuid;
  
  await executeQuery(
    `DELETE FROM UserScopeOverrides WHERE uuid = ?`,
    [overrideUuid]
  );
  
  // Log action
  await rbacService.logAuthorizationAction({
    actorUserUuid: removedBy,
    actionType: 'SCOPE_REMOVED',
    resourceType: 'USER_SCOPE_OVERRIDE',
    targetUserUuid: userUuid
  });
  
  // Invalidate user cache
  rbacService.invalidateUserCache(userUuid);
  
  return true;
}

/**
 * Get all scope overrides for a user
 * @param {string} userUuid - User UUID
 * @returns {Promise<Array>} Array of scope overrides
 */
async function getUserScopeOverrides(userUuid) {
  const [rows] = await executeQuery(
    `SELECT uso.uuid, uso.reason, uso.expires_at, uso.created_at,
            uso.scope_configuration,
            p.code as permission_code, p.name as permission_name,
            ds.code as scope_code, ds.name as scope_name, ds.scope_type,
            creator.username as created_by_username
     FROM UserScopeOverrides uso
     INNER JOIN Permissions p ON uso.permission_uuid = p.uuid
     INNER JOIN DataScopes ds ON uso.data_scope_uuid = ds.uuid
     LEFT JOIN Users creator ON uso.created_by = creator.uuid
     WHERE uso.user_uuid = ?
     ORDER BY uso.created_at DESC`,
    [userUuid]
  );
  
  return rows.map(row => ({
    uuid: row.uuid,
    permissionCode: row.permission_code,
    permissionName: row.permission_name,
    scopeCode: row.scope_code,
    scopeName: row.scope_name,
    scopeType: row.scope_type,
    scopeConfiguration: row.scope_configuration ? JSON.parse(row.scope_configuration) : null,
    reason: row.reason,
    expiresAt: row.expires_at,
    isExpired: row.expires_at && new Date(row.expires_at) < new Date(),
    createdAt: row.created_at,
    createdBy: row.created_by_username
  }));
}

// ============================================================================
// PERMISSION DELEGATIONS
// ============================================================================

/**
 * Create permission delegation
 * @param {Object} delegationData - Delegation information
 * @param {string} createdBy - Creator user UUID
 * @returns {Promise<Object>} Created delegation
 */
async function createDelegation(delegationData, createdBy) {
  const {
    fromUserUuid,
    toUserUuid,
    permissionUuid,
    dataScopeUuid = null,
    scopeConfiguration = null,
    reason,
    startsAt,
    expiresAt
  } = delegationData;
  
  // Validate dates
  if (new Date(startsAt) >= new Date(expiresAt)) {
    throw new Error('Expiry date must be after start date');
  }
  
  // Check if from_user has the permission
  const fromUserPerms = await rbacService.getUserPermissions(fromUserUuid);
  const [permDetails] = await executeQuery(
    `SELECT code FROM Permissions WHERE uuid = ?`,
    [permissionUuid]
  );
  
  if (permDetails.length === 0) {
    throw new Error('Permission not found');
  }
  
  if (!fromUserPerms.includes(permDetails[0].code)) {
    throw new Error('Cannot delegate permission you do not have');
  }
  
  const uuid = uuidv4();
  const configJson = scopeConfiguration ? JSON.stringify(scopeConfiguration) : null;
  
  await executeQuery(
    `INSERT INTO PermissionDelegations
     (uuid, from_user_uuid, to_user_uuid, permission_uuid, data_scope_uuid,
      scope_configuration, reason, starts_at, expires_at, is_active, created_by)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, TRUE, ?)`,
    [
      uuid,
      fromUserUuid,
      toUserUuid,
      permissionUuid,
      dataScopeUuid,
      configJson,
      reason,
      startsAt,
      expiresAt,
      createdBy
    ]
  );
  
  // Increment permissions_version to invalidate JWT for receiver
  await executeQuery(
    `UPDATE Users SET permissions_version = permissions_version + 1 WHERE uuid = ?`,
    [toUserUuid]
  );
  
  // Log action
  await rbacService.logAuthorizationAction({
    actorUserUuid: createdBy,
    actionType: 'DELEGATION_CREATED',
    resourceType: 'PERMISSION_DELEGATION',
    resourceUuid: uuid,
    targetUserUuid: toUserUuid,
    newValue: JSON.stringify({ fromUserUuid, toUserUuid, permissionUuid, reason })
  });
  
  // Invalidate user cache
  rbacService.invalidateUserCache(toUserUuid);
  
  return {
    uuid,
    fromUserUuid,
    toUserUuid,
    permissionUuid,
    dataScopeUuid,
    scopeConfiguration,
    reason,
    startsAt,
    expiresAt
  };
}

/**
 * Revoke delegation
 * @param {string} delegationUuid - Delegation UUID
 * @param {string} revokedBy - Revoker user UUID
 * @returns {Promise<boolean>}
 */
async function revokeDelegation(delegationUuid, revokedBy) {
  // Get delegation details for logging
  const [delegations] = await executeQuery(
    `SELECT to_user_uuid FROM PermissionDelegations WHERE uuid = ?`,
    [delegationUuid]
  );
  
  if (delegations.length === 0) {
    throw new Error('Delegation not found');
  }
  
  const toUserUuid = delegations[0].to_user_uuid;
  
  await executeQuery(
    `UPDATE PermissionDelegations 
     SET is_active = FALSE, revoked_at = CURRENT_TIMESTAMP, revoked_by = ?
     WHERE uuid = ?`,
    [revokedBy, delegationUuid]
  );
  
  // Increment permissions_version to invalidate JWT
  await executeQuery(
    `UPDATE Users SET permissions_version = permissions_version + 1 WHERE uuid = ?`,
    [toUserUuid]
  );
  
  // Log action
  await rbacService.logAuthorizationAction({
    actorUserUuid: revokedBy,
    actionType: 'DELEGATION_REVOKED',
    resourceType: 'PERMISSION_DELEGATION',
    resourceUuid: delegationUuid,
    targetUserUuid: toUserUuid
  });
  
  // Invalidate user cache
  rbacService.invalidateUserCache(toUserUuid);
  
  return true;
}

/**
 * Get delegations for a user (as sender or receiver)
 * @param {string} userUuid - User UUID
 * @param {string} direction - 'sent' or 'received' or 'all'
 * @returns {Promise<Array>} Array of delegations
 */
async function getUserDelegations(userUuid, direction = 'all') {
  let whereClause = '';
  let params = [];
  
  if (direction === 'sent') {
    whereClause = 'WHERE pd.from_user_uuid = ?';
    params = [userUuid];
  } else if (direction === 'received') {
    whereClause = 'WHERE pd.to_user_uuid = ?';
    params = [userUuid];
  } else {
    whereClause = 'WHERE (pd.from_user_uuid = ? OR pd.to_user_uuid = ?)';
    params = [userUuid, userUuid];
  }
  
  const [rows] = await executeQuery(
    `SELECT pd.uuid, pd.from_user_uuid, pd.to_user_uuid, pd.reason,
            pd.starts_at, pd.expires_at, pd.is_active, pd.created_at,
            pd.revoked_at, pd.scope_configuration,
            p.code as permission_code, p.name as permission_name,
            ds.code as scope_code, ds.name as scope_name,
            from_user.username as from_username,
            to_user.username as to_username,
            revoker.username as revoked_by_username
     FROM PermissionDelegations pd
     INNER JOIN Permissions p ON pd.permission_uuid = p.uuid
     LEFT JOIN DataScopes ds ON pd.data_scope_uuid = ds.uuid
     LEFT JOIN Users from_user ON pd.from_user_uuid = from_user.uuid
     LEFT JOIN Users to_user ON pd.to_user_uuid = to_user.uuid
     LEFT JOIN Users revoker ON pd.revoked_by = revoker.uuid
     ${whereClause}
     ORDER BY pd.created_at DESC`,
    params
  );
  
  return rows.map(row => ({
    uuid: row.uuid,
    fromUserUuid: row.from_user_uuid,
    fromUsername: row.from_username,
    toUserUuid: row.to_user_uuid,
    toUsername: row.to_username,
    permissionCode: row.permission_code,
    permissionName: row.permission_name,
    scopeCode: row.scope_code,
    scopeName: row.scope_name,
    scopeConfiguration: row.scope_configuration ? JSON.parse(row.scope_configuration) : null,
    reason: row.reason,
    startsAt: row.starts_at,
    expiresAt: row.expires_at,
    is_active: row.is_active,
    isExpired: new Date(row.expires_at) < new Date(),
    createdAt: row.created_at,
    revokedAt: row.revoked_at,
    revokedBy: row.revoked_by_username
  }));
}

// ============================================================================
// EXPORTS
// ============================================================================

module.exports = {
  // Permission overrides
  addPermissionOverride,
  removePermissionOverride,
  getUserOverrides,
  
  // Scope overrides
  addScopeOverride,
  removeScopeOverride,
  getUserScopeOverrides,
  
  // Delegations
  createDelegation,
  revokeDelegation,
  getUserDelegations,
};
