/**
 * Audit Logging Service
 * 
 * Provides immutable audit trail for all permission-related changes:
 * - Role-occupation assignments
 * - User-occupation assignments
 * - Scope changes
 * - Delegations
 * - Authorization failures
 * 
 * All audit logs are insert-only (no updates or deletes)
 */

const { executeQuery } = require("../utils/dbQuery");
const { v4: uuidv4 } = require("uuid");

/**
 * Log a permission-related event to AccessAuditLogs
 * 
 * @param {Object} event - Event details
 * @param {string|null} event.actor_user_uuid - Who performed the action (null for system)
 * @param {string|null} event.target_user_uuid - Who was affected
 * @param {string} event.action_type - Type of action (enum value)
 * @param {string|null} event.resource_type - Type of resource affected
 * @param {string|null} event.resource_uuid - UUID of resource affected
 * @param {string|null} event.old_value - Previous value (JSON or text)
 * @param {string|null} event.new_value - New value (JSON or text)
 * @param {string|null} event.reason - Reason for change
 * @param {string|null} event.ip_address - IP address of actor
 * @param {string|null} event.user_agent - User agent string
 * @returns {Promise<string>} UUID of created audit log entry
 */
async function auditLog({
  actor_user_uuid,
  target_user_uuid = null,
  action_type,
  resource_type = null,
  resource_uuid = null,
  old_value = null,
  new_value = null,
  reason = null,
  ip_address = null,
  user_agent = null
}) {
  const uuid = uuidv4();
  
  await executeQuery(
    `INSERT INTO AccessAuditLogs (
      uuid, actor_user_uuid, target_user_uuid, action_type,
      resource_type, resource_uuid, old_value, new_value, reason,
      ip_address, user_agent
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      uuid,
      actor_user_uuid,
      target_user_uuid,
      action_type,
      resource_type,
      resource_uuid,
      old_value,
      new_value,
      reason,
      ip_address,
      user_agent
    ]
  );
  
  return uuid;
}

/**
 * Log an authorization failure (user tried to access resource without permission)
 * 
 * @param {Object} req - Express request object
 * @param {string} requiredOccupation - Occupation(s) that were required
 * @returns {Promise<string>} UUID of audit log entry
 */
async function logAuthorizationDenied(req, requiredOccupation) {
  return await auditLog({
    actor_user_uuid: req.user?.uuid || null,
    target_user_uuid: req.user?.uuid || null,
    action_type: 'AUTHORIZATION_DENIED',
    resource_type: 'ENDPOINT',
    resource_uuid: req.originalUrl,
    reason: `Missing occupation: ${requiredOccupation}`,
    ip_address: req.ip,
    user_agent: req.get('User-Agent')
  });
}

/**
 * Log occupation assignment to a user
 * 
 * @param {string} actorUuid - Who assigned the occupation
 * @param {string} targetUserUuid - User receiving the occupation
 * @param {string} occupationName - Occupation being assigned
 * @param {string|null} expiresAt - Expiration date (null for permanent)
 * @param {string} reason - Reason for assignment
 * @param {string|null} ipAddress - IP address
 * @returns {Promise<string>} UUID of audit log entry
 */
async function logOccupationAssigned(
  actorUuid,
  targetUserUuid,
  occupationName,
  expiresAt,
  reason,
  ipAddress = null
) {
  const details = expiresAt 
    ? `${occupationName} (expires: ${expiresAt})`
    : occupationName;
    
  return await auditLog({
    actor_user_uuid: actorUuid,
    target_user_uuid: targetUserUuid,
    action_type: 'USER_OCCUPATION_ASSIGNED',
    resource_type: 'OCCUPATION',
    old_value: null,
    new_value: details,
    reason,
    ip_address: ipAddress
  });
}

/**
 * Log occupation removal from a user
 * 
 * @param {string} actorUuid - Who removed the occupation
 * @param {string} targetUserUuid - User losing the occupation
 * @param {string} occupationName - Occupation being removed
 * @param {string} reason - Reason for removal
 * @param {string|null} ipAddress - IP address
 * @returns {Promise<string>} UUID of audit log entry
 */
async function logOccupationRemoved(
  actorUuid,
  targetUserUuid,
  occupationName,
  reason,
  ipAddress = null
) {
  return await auditLog({
    actor_user_uuid: actorUuid,
    target_user_uuid: targetUserUuid,
    action_type: 'USER_OCCUPATION_REMOVED',
    resource_type: 'OCCUPATION',
    old_value: occupationName,
    new_value: null,
    reason,
    ip_address: ipAddress
  });
}

/**
 * Log scope assignment to a user
 * 
 * @param {string} actorUuid - Who assigned the scope
 * @param {string} targetUserUuid - User receiving the scope
 * @param {string} scopeType - Scope type (SELF, DEPARTMENT, etc.)
 * @param {string|null} scopeValue - Scope value (e.g., department UUID)
 * @param {string} reason - Reason for assignment
 * @param {string|null} ipAddress - IP address
 * @returns {Promise<string>} UUID of audit log entry
 */
async function logScopeAssigned(
  actorUuid,
  targetUserUuid,
  scopeType,
  scopeValue,
  reason,
  ipAddress = null
) {
  const scopeDetails = scopeValue 
    ? `${scopeType}: ${scopeValue}`
    : scopeType;
    
  return await auditLog({
    actor_user_uuid: actorUuid,
    target_user_uuid: targetUserUuid,
    action_type: 'SCOPE_ASSIGNED',
    resource_type: 'SCOPE',
    old_value: null,
    new_value: scopeDetails,
    reason,
    ip_address: ipAddress
  });
}

/**
 * Log scope removal from a user
 * 
 * @param {string} actorUuid - Who removed the scope
 * @param {string} targetUserUuid - User losing the scope
 * @param {string} scopeType - Scope type being removed
 * @param {string} reason - Reason for removal
 * @param {string|null} ipAddress - IP address
 * @returns {Promise<string>} UUID of audit log entry
 */
async function logScopeRemoved(
  actorUuid,
  targetUserUuid,
  scopeType,
  reason,
  ipAddress = null
) {
  return await auditLog({
    actor_user_uuid: actorUuid,
    target_user_uuid: targetUserUuid,
    action_type: 'SCOPE_REMOVED',
    resource_type: 'SCOPE',
    old_value: scopeType,
    new_value: null,
    reason,
    ip_address: ipAddress
  });
}

/**
 * Log delegation creation
 * 
 * @param {string} delegatorUuid - Who is delegating
 * @param {string} delegateeUuid - Who is receiving the delegation
 * @param {string} occupationName - Occupation being delegated
 * @param {string} startDate - Delegation start date
 * @param {string} endDate - Delegation end date
 * @param {string} reason - Reason for delegation
 * @param {string|null} ipAddress - IP address
 * @returns {Promise<string>} UUID of audit log entry
 */
async function logDelegationCreated(
  delegatorUuid,
  delegateeUuid,
  occupationName,
  startDate,
  endDate,
  reason,
  ipAddress = null
) {
  const details = `${occupationName} (${startDate} to ${endDate})`;
  
  return await auditLog({
    actor_user_uuid: delegatorUuid,
    target_user_uuid: delegateeUuid,
    action_type: 'DELEGATION_CREATED',
    resource_type: 'DELEGATION',
    old_value: null,
    new_value: details,
    reason,
    ip_address: ipAddress
  });
}

/**
 * Log delegation revocation
 * 
 * @param {string} revokerUuid - Who revoked the delegation
 * @param {string} delegateeUuid - Who was receiving the delegation
 * @param {string} occupationName - Occupation that was delegated
 * @param {string} reason - Reason for revocation
 * @param {string|null} ipAddress - IP address
 * @returns {Promise<string>} UUID of audit log entry
 */
async function logDelegationRevoked(
  revokerUuid,
  delegateeUuid,
  occupationName,
  reason,
  ipAddress = null
) {
  return await auditLog({
    actor_user_uuid: revokerUuid,
    target_user_uuid: delegateeUuid,
    action_type: 'DELEGATION_REVOKED',
    resource_type: 'DELEGATION',
    old_value: occupationName,
    new_value: null,
    reason,
    ip_address: ipAddress
  });
}

/**
 * Log role-occupation assignment
 * 
 * @param {string} actorUuid - Who assigned the occupation to the role
 * @param {string} role - Role receiving the occupation
 * @param {string} occupationName - Occupation being assigned
 * @param {string} reason - Reason for assignment
 * @param {string|null} ipAddress - IP address
 * @returns {Promise<string>} UUID of audit log entry
 */
async function logRoleOccupationAssigned(
  actorUuid,
  role,
  occupationName,
  reason,
  ipAddress = null
) {
  return await auditLog({
    actor_user_uuid: actorUuid,
    target_user_uuid: null, // Role-level, not user-specific
    action_type: 'ROLE_OCCUPATION_ASSIGNED',
    resource_type: 'ROLE',
    resource_uuid: role,
    old_value: null,
    new_value: occupationName,
    reason,
    ip_address: ipAddress
  });
}

/**
 * Log role-occupation removal
 * 
 * @param {string} actorUuid - Who removed the occupation from the role
 * @param {string} role - Role losing the occupation
 * @param {string} occupationName - Occupation being removed
 * @param {string} reason - Reason for removal
 * @param {string|null} ipAddress - IP address
 * @returns {Promise<string>} UUID of audit log entry
 */
async function logRoleOccupationRemoved(
  actorUuid,
  role,
  occupationName,
  reason,
  ipAddress = null
) {
  return await auditLog({
    actor_user_uuid: actorUuid,
    target_user_uuid: null,
    action_type: 'ROLE_OCCUPATION_REMOVED',
    resource_type: 'ROLE',
    resource_uuid: role,
    old_value: occupationName,
    new_value: null,
    reason,
    ip_address: ipAddress
  });
}

/**
 * Query audit logs with filters
 * 
 * @param {Object} filters - Query filters
 * @param {string|null} filters.actor_user_uuid - Filter by actor
 * @param {string|null} filters.target_user_uuid - Filter by target
 * @param {string|null} filters.action_type - Filter by action type
 * @param {string|null} filters.start_date - Filter from date
 * @param {string|null} filters.end_date - Filter to date
 * @param {number} filters.page - Page number (default 1)
 * @param {number} filters.limit - Results per page (default 20, max 100)
 * @returns {Promise<Object>} { logs: [], total, page, limit }
 */
async function queryAuditLogs({
  actor_user_uuid = null,
  target_user_uuid = null,
  action_type = null,
  start_date = null,
  end_date = null,
  page = 1,
  limit = 20
}) {
  // Enforce max limit
  limit = Math.min(limit, 100);
  const offset = (page - 1) * limit;
  
  // Build WHERE clause dynamically
  const whereClauses = [];
  const params = [];
  
  if (actor_user_uuid) {
    whereClauses.push('actor_user_uuid = ?');
    params.push(actor_user_uuid);
  }
  
  if (target_user_uuid) {
    whereClauses.push('target_user_uuid = ?');
    params.push(target_user_uuid);
  }
  
  if (action_type) {
    whereClauses.push('action_type = ?');
    params.push(action_type);
  }
  
  if (start_date) {
    whereClauses.push('created_at >= ?');
    params.push(start_date);
  }
  
  if (end_date) {
    whereClauses.push('created_at <= ?');
    params.push(end_date);
  }
  
  const whereClause = whereClauses.length > 0 
    ? 'WHERE ' + whereClauses.join(' AND ')
    : '';
  
  // Get total count
  const [countRows] = await executeQuery(
    `SELECT COUNT(*) as total FROM AccessAuditLogs ${whereClause}`,
    params
  );
  const total = countRows[0].total;
  
  // Get paginated results
  const [logs] = await executeQuery(
    `SELECT * FROM AccessAuditLogs 
     ${whereClause}
     ORDER BY created_at DESC
     LIMIT ? OFFSET ?`,
    [...params, limit, offset]
  );
  
  return {
    logs,
    total,
    page,
    limit,
    totalPages: Math.ceil(total / limit)
  };
}

module.exports = {
  auditLog,
  logAuthorizationDenied,
  logOccupationAssigned,
  logOccupationRemoved,
  logScopeAssigned,
  logScopeRemoved,
  logDelegationCreated,
  logDelegationRevoked,
  logRoleOccupationAssigned,
  logRoleOccupationRemoved,
  queryAuditLogs
};
