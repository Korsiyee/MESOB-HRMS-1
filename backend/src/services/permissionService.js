/**
 * Permission Resolution Service
 * 
 * Calculates effective occupations for users based on:
 * - Role-based occupations (RoleOccupations table)
 * - Direct employee occupations (EmployeeOccupations table, non-expired)
 * - Active delegations (OccupationDelegations table, within time window)
 * - Permission overrides (UserPermissionOverrides table, ALLOW/DENY)
 * 
 * Resolution Priority:
 * 1. SUPER_ADMIN bypass (always allowed)
 * 2. DENY overrides (explicit denial)
 * 3. ALLOW overrides + inherited permissions
 * 
 * Formula: EffectiveOccupations = 
 *   (RoleOccupations ∪ DirectOccupations ∪ ActiveDelegations ∪ ALLOWOverrides) 
 *   − (ExpiredOccupations ∪ DENYOverrides)
 */

const { executeQuery } = require("../utils/dbQuery");
const { v4: uuidv4 } = require("uuid");

/**
 * Get occupations assigned to a role
 * @param {string} role - User role (EMPLOYEE, DEPARTMENT_HEAD, etc.)
 * @returns {Promise<string[]>} Array of occupation names
 */
async function getRoleOccupations(role) {
  const [rows] = await executeQuery(
    `SELECT o.name
     FROM RoleOccupations ro
     JOIN Occupations o ON ro.occupation_uuid = o.uuid
     WHERE ro.role = ?`,
    [role]
  );
  
  return rows.map(row => row.name);
}

/**
 * Get non-expired occupations directly assigned to an employee
 * @param {string} employeeUuid - Employee UUID
 * @returns {Promise<string[]>} Array of occupation names
 */
async function getEmployeeOccupations(employeeUuid) {
  const [rows] = await executeQuery(
    `SELECT o.name
     FROM EmployeeOccupations eo
     JOIN Occupations o ON eo.occupation_uuid = o.uuid
     WHERE eo.employee_uuid = ?
       AND (eo.expires_at IS NULL OR eo.expires_at > NOW())`,
    [employeeUuid]
  );
  
  return rows.map(row => row.name);
}

/**
 * Get non-expired occupations directly assigned to an employee (with full details)
 * Used for UI breakdown where we need UUIDs for removal
 * @param {string} employeeUuid - Employee UUID
 * @returns {Promise<Array>} Array of occupation objects with uuid, name, expires_at
 */
async function getEmployeeOccupationsDetailed(employeeUuid) {
  const [rows] = await executeQuery(
    `SELECT o.uuid as occupation_uuid, o.name, eo.expires_at
     FROM EmployeeOccupations eo
     JOIN Occupations o ON eo.occupation_uuid = o.uuid
     WHERE eo.employee_uuid = ?
       AND (eo.expires_at IS NULL OR eo.expires_at > NOW())`,
    [employeeUuid]
  );
  
  return rows;
}

/**
 * Get active delegations for a user (within time window, not revoked)
 * @param {string} userUuid - User UUID (delegatee)
 * @returns {Promise<string[]>} Array of occupation names
 */
async function getActiveDelegations(userUuid) {
  const [rows] = await executeQuery(
    `SELECT o.name
     FROM OccupationDelegations od
     JOIN Occupations o ON od.occupation_uuid = o.uuid
     WHERE od.delegatee_user_uuid = ?
       AND NOW() BETWEEN od.start_date AND od.end_date
       AND od.revoked_at IS NULL`,
    [userUuid]
  );
  
  return rows.map(row => row.name);
}

/**
 * Get permission overrides for a user (ALLOW/DENY)
 * @param {string} userUuid - User UUID
 * @returns {Promise<Object>} { allows: [], denies: [] }
 */
async function getPermissionOverrides(userUuid) {
  try {
    const [rows] = await executeQuery(
      `SELECT o.name, upo.effect
       FROM UserPermissionOverrides upo
       JOIN Occupations o ON upo.occupation_uuid = o.uuid
       WHERE upo.user_uuid = ?`,
      [userUuid]
    );
    
    const allows = [];
    const denies = [];
    
    rows.forEach(row => {
      if (row.effect === 'ALLOW') {
        allows.push(row.name);
      } else if (row.effect === 'DENY') {
        denies.push(row.name);
      }
    });
    
    return { allows, denies };
  } catch (error) {
    // If table doesn't exist or query fails, return empty arrays
    console.warn('Warning: Failed to fetch permission overrides:', error.message);
    return { allows: [], denies: [] };
  }
}

/**
 * Calculate effective occupations for a user
 * Combines role-based, direct, delegated occupations and applies overrides
 * 
 * Resolution Priority:
 * 1. SUPER_ADMIN → All permissions
 * 2. DENY overrides → Block access
 * 3. ALLOW overrides + inherited → Grant access
 * 
 * @param {string} userUuid - User UUID
 * @param {string} role - User role
 * @param {string|null} employeeUuid - Employee UUID (optional, null for service accounts)
 * @returns {Promise<string[]>} Array of unique occupation names
 */
async function calculateEffectiveOccupations(userUuid, role, employeeUuid = null) {
  // SUPER_ADMIN has all permissions
  if (role === 'SUPER_ADMIN') {
    const [allOccupations] = await executeQuery(`SELECT name FROM Occupations`);
    return allOccupations.map(o => o.name);
  }
  
  // 1. Get role-based occupations
  const roleOccupations = await getRoleOccupations(role);
  
  // 2. Get directly assigned occupations (non-expired)
  const directOccupations = employeeUuid 
    ? await getEmployeeOccupations(employeeUuid)
    : [];
  
  // 3. Combine all sources (role + direct only)
  const allAllowed = [
    ...roleOccupations,
    ...directOccupations
  ];
  
  // 4. Remove duplicates
  const effectiveOccupations = [...new Set(allAllowed)];
  
  return effectiveOccupations;
}

/**
 * Get user's data access scopes
 * @param {string} userUuid - User UUID
 * @returns {Promise<Array>} Array of scope objects: [{ scope_type, scope_value }]
 */
async function getUserScopes(userUuid) {
  const [rows] = await executeQuery(
    `SELECT scope_type, scope_value 
     FROM UserScopes 
     WHERE user_uuid = ?`,
    [userUuid]
  );
  
  return rows;
}

/**
 * Increment permissions version to revoke tokens with outdated permissions
 * More granular than token_version (which revokes all tokens)
 * 
 * @param {string} userUuid - User UUID
 * @param {string} reason - Reason for increment (for audit)
 * @returns {Promise<void>}
 */
async function incrementPermissionsVersion(userUuid, reason = 'Permissions changed') {
  await executeQuery(
    `UPDATE Users SET permissions_version = permissions_version + 1 WHERE uuid = ?`,
    [userUuid]
  );
  
  // Log permission version increment
  const auditService = require("./auditService");
  await auditService.auditLog({
    actor_user_uuid: 'SYSTEM',
    target_user_uuid: userUuid,
    action_type: 'TOKEN_REVOKED',
    reason: `Permissions version incremented: ${reason}`
  });
}

/**
 * Revoke user tokens to force re-login with updated permissions
 * Increments both token_version (full revocation) and permissions_version
 * 
 * @param {string} userUuid - User UUID
 * @param {string} reason - Reason for revocation (for audit)
 * @returns {Promise<void>}
 */
async function revokeUserTokens(userUuid, reason = 'Permission changed') {
  await executeQuery(
    `UPDATE Users 
     SET token_version = token_version + 1,
         permissions_version = permissions_version + 1
     WHERE uuid = ?`,
    [userUuid]
  );
  
  // Log token revocation for audit trail
  const auditService = require("./auditService");
  await auditService.auditLog({
    actor_user_uuid: 'SYSTEM',
    target_user_uuid: userUuid,
    action_type: 'TOKEN_REVOKED',
    reason
  });
}

/**
 * Check if a user can delegate a specific occupation
 * User must possess the occupation to delegate it
 * 
 * @param {string} userUuid - Delegator user UUID
 * @param {string} role - Delegator role
 * @param {string|null} employeeUuid - Delegator employee UUID
 * @param {string} occupationName - Occupation to delegate
 * @returns {Promise<boolean>} True if user can delegate
 */
async function canDelegateOccupation(userUuid, role, employeeUuid, occupationName) {
  const effectiveOccupations = await calculateEffectiveOccupations(
    userUuid,
    role,
    employeeUuid
  );
  
  return effectiveOccupations.includes(occupationName);
}

/**
 * Check for circular delegations
 * Prevents: A → B, B → C, C → A
 * 
 * @param {string} delegatorUuid - Who is delegating
 * @param {string} delegateeUuid - Who receives delegation
 * @param {string} occupationUuid - Which occupation
 * @returns {Promise<boolean>} True if circular delegation detected
 */
async function hasCircularDelegation(delegatorUuid, delegateeUuid, occupationUuid) {
  // Check if delegatee has already delegated this occupation back to delegator
  const [rows] = await executeQuery(
    `SELECT uuid FROM OccupationDelegations
     WHERE delegator_user_uuid = ?
       AND delegatee_user_uuid = ?
       AND occupation_uuid = ?
       AND revoked_at IS NULL
       AND NOW() BETWEEN start_date AND end_date`,
    [delegateeUuid, delegatorUuid, occupationUuid]
  );
  
  return rows.length > 0;
}

/**
 * Check for delegation chains (prevents sub-delegation)
 * Only direct delegations allowed (A → B), not chains (A → B → C)
 * 
 * @param {string} delegatorUuid - Who is delegating
 * @param {string} occupationUuid - Which occupation
 * @returns {Promise<boolean>} True if delegator received this via delegation
 */
async function isDelegationChain(delegatorUuid, occupationUuid) {
  // Check if delegator received this occupation via delegation
  const [rows] = await executeQuery(
    `SELECT uuid FROM OccupationDelegations
     WHERE delegatee_user_uuid = ?
       AND occupation_uuid = ?
       AND revoked_at IS NULL
       AND NOW() BETWEEN start_date AND end_date`,
    [delegatorUuid, occupationUuid]
  );
  
  return rows.length > 0;
}

/**
 * Validate delegation request
 * Checks for circular delegations, chains, and privilege escalation
 * 
 * @param {string} delegatorUuid - Who is delegating
 * @param {string} delegateeUuid - Who receives delegation
 * @param {string} occupationUuid - Which occupation
 * @param {string} occupationName - Occupation name (for permission check)
 * @param {string} role - Delegator's role
 * @param {string} employeeUuid - Delegator's employee UUID
 * @returns {Promise<Object>} { valid: boolean, error: string }
 */
async function validateDelegation(delegatorUuid, delegateeUuid, occupationUuid, occupationName, role, employeeUuid) {
  // 1. Check if delegator can delegate (has the occupation)
  const canDelegate = await canDelegateOccupation(delegatorUuid, role, employeeUuid, occupationName);
  if (!canDelegate) {
    return { valid: false, error: 'You cannot delegate an occupation you do not possess' };
  }
  
  // 2. Check for circular delegation
  const isCircular = await hasCircularDelegation(delegatorUuid, delegateeUuid, occupationUuid);
  if (isCircular) {
    return { valid: false, error: 'Circular delegation detected: delegatee has already delegated this occupation to you' };
  }
  
  // 3. Check for delegation chain (sub-delegation)
  const isChain = await isDelegationChain(delegatorUuid, occupationUuid);
  if (isChain) {
    return { valid: false, error: 'Cannot sub-delegate: you received this occupation via delegation' };
  }
  
  // 4. Check if delegatee and delegator are the same
  if (delegatorUuid === delegateeUuid) {
    return { valid: false, error: 'Cannot delegate to yourself' };
  }
  
  return { valid: true };
}

/**
 * Get detailed occupation assignment info for a user
 * Shows which occupations come from which source + overrides
 * 
 * @param {string} userUuid - User UUID
 * @param {string} role - User role
 * @param {string|null} employeeUuid - Employee UUID
 * @returns {Promise<Object>} Detailed occupation breakdown
 */
async function getOccupationBreakdown(userUuid, role, employeeUuid = null) {
  const roleOccupations = await getRoleOccupations(role);
  const directOccupations = employeeUuid ? await getEmployeeOccupationsDetailed(employeeUuid) : [];
  const effective = await calculateEffectiveOccupations(userUuid, role, employeeUuid);
  
  return {
    role: roleOccupations,
    direct: directOccupations,
    effective
  };
}

module.exports = {
  calculateEffectiveOccupations,
  getRoleOccupations,
  getEmployeeOccupations,
  getEmployeeOccupationsDetailed,
  getActiveDelegations,
  getUserScopes,
  revokeUserTokens,
  incrementPermissionsVersion,
  canDelegateOccupation,
  getOccupationBreakdown,
  getPermissionOverrides,
  validateDelegation,
  hasCircularDelegation,
  isDelegationChain
};
