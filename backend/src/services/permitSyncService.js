/**
 * Permit User Synchronization Service
 * 
 * This service handles synchronization between HRMS users and Permit.io users.
 * 
 * Key responsibilities:
 * - Sync user creation to Permit
 * - Update user attributes (department, role)
 * - Assign/unassign roles
 * - Handle user deactivation
 * - Bulk user synchronization
 * 
 * Sync Strategy:
 * - Sync on user create/update (proactive)
 * - Fallback to just-in-time sync if user missing
 * - Fail gracefully - don't block operations if Permit is down
 */

const { permit, PERMIT_ENV } = require('../config/permit');
const { executeQuery } = require('../utils/dbQuery');

/**
 * Validate that a role exists in Permit
 * 
 * @param {string} roleKey - Role key to validate
 * @returns {Promise<boolean>} True if role exists
 */
async function validateRoleExists(roleKey) {
  try {
    const roles = await permit.api.roles.list();
    return roles.some(r => r.key === roleKey);
  } catch (error) {
    console.error('[PermitSync] Failed to validate role:', error.message);
    return false;
  }
}

/**
 * Sync user to Permit
 * Creates or updates user in Permit with current attributes
 * Uses role directly from database - NO HARDCODED MAPPING
 * 
 * @param {Object} user - User object from database
 * @param {string} user.uuid - User UUID
 * @param {string} user.username - Username
 * @param {string} user.role - Role key (stored directly as Permit role)
 * @param {string} user.employee_uuid - Linked employee UUID
 * @param {string} user.department_uuid - Department UUID
 * @param {boolean} user.is_active - Active status
 * @param {string} [fullName] - Full name (optional)
 * @param {string} [email] - Email (optional)
 * @returns {Promise<boolean>} True if sync successful
 */
async function syncUserToPermit(user, fullName = null, email = null) {
  try {
    if (!user || !user.uuid) {
      console.error('[PermitSync] Invalid user object:', user);
      return false;
    }

    // Use role directly from database (no mapping needed)
    const permitRole = user.role;
    
    // Validate role exists in Permit
    const roleExists = await validateRoleExists(permitRole);
    if (!roleExists) {
      console.error(`[PermitSync] Role "${permitRole}" does not exist in Permit. Please create it first.`);
      return false;
    }

    // Build user attributes for ABAC
    const attributes = {
      employee_uuid: user.employee_uuid || null,
      department_uuid: user.department_uuid || null,
      is_active: user.is_active,
    };

    // Prepare user data for Permit
    const permitUser = {
      key: user.uuid,
      email: email || `${user.username}@hrms.local`, // Permit requires email
      first_name: fullName || user.username,
      attributes,
    };

    console.log(`[PermitSync] Syncing user ${user.username} (${user.uuid}) with role ${permitRole}`);

    // Sync user to Permit (creates if not exists, updates if exists)
    await permit.api.users.sync(permitUser);

    // Assign role in default tenant
    try {
      await permit.api.roleAssignments.assign({
        user: user.uuid,
        role: permitRole,
        tenant: 'default',
      });
      console.log(`[PermitSync] ✓ Assigned role ${permitRole} to user ${user.username}`);
    } catch (roleError) {
      // Role might already be assigned, check if that's the case
      if (roleError.message && roleError.message.includes('already assigned')) {
        console.log(`[PermitSync] ✓ Role ${permitRole} already assigned to user ${user.username}`);
      } else {
        console.error(`[PermitSync] ✗ Failed to assign role to ${user.username}:`, roleError.message);
        // Don't fail the entire sync if role assignment fails
      }
    }

    return true;
  } catch (error) {
    console.error(`[PermitSync] ✗ Failed to sync user ${user.username}:`, error.message);
    // Don't throw - allow system to continue even if Permit sync fails
    return false;
  }
}

/**
 * Update user attributes in Permit
 * Use when user's department or other attributes change
 * 
 * @param {string} userUuid - User UUID
 * @param {Object} attributes - Updated attributes
 * @returns {Promise<boolean>} True if update successful
 */
async function updateUserAttributes(userUuid, attributes) {
  try {
    await permit.api.users.update(userUuid, {
      attributes,
    });
    console.log(`[PermitSync] ✓ Updated attributes for user ${userUuid}`);
    return true;
  } catch (error) {
    console.error(`[PermitSync] ✗ Failed to update user attributes:`, error.message);
    return false;
  }
}

/**
 * Change user role in Permit
 * Unassigns old role and assigns new role
 * NO HARDCODED MAPPING - uses roles directly
 * 
 * @param {string} userUuid - User UUID
 * @param {string} oldRole - Old role key
 * @param {string} newRole - New role key
 * @returns {Promise<boolean>} True if role change successful
 */
async function changeUserRole(userUuid, oldRole, newRole) {
  try {
    if (oldRole === newRole) {
      console.log(`[PermitSync] No role change needed for user ${userUuid}`);
      return true;
    }
    
    // Validate new role exists
    const roleExists = await validateRoleExists(newRole);
    if (!roleExists) {
      console.error(`[PermitSync] Role "${newRole}" does not exist in Permit`);
      return false;
    }

    console.log(`[PermitSync] Changing role for ${userUuid}: ${oldRole} → ${newRole}`);

    // Unassign old role
    try {
      await permit.api.roleAssignments.unassign({
        user: userUuid,
        role: oldRole,
        tenant: 'default',
      });
      console.log(`[PermitSync] ✓ Unassigned old role ${oldRole}`);
    } catch (unassignError) {
      // Old role might not exist, that's okay
      console.log(`[PermitSync] Old role ${oldRole} was not assigned (okay)`);
    }

    // Assign new role
    await permit.api.roleAssignments.assign({
      user: userUuid,
      role: newRole,
      tenant: 'default',
    });
    console.log(`[PermitSync] ✓ Assigned new role ${newRole}`);

    return true;
  } catch (error) {
    console.error(`[PermitSync] ✗ Failed to change user role:`, error.message);
    return false;
  }
}

/**
 * Deactivate user in Permit
 * Removes all role assignments (user still exists but has no permissions)
 * 
 * @param {string} userUuid - User UUID
 * @param {string} currentRole - Current role key
 * @returns {Promise<boolean>} True if deactivation successful
 */
async function deactivateUser(userUuid, currentRole) {
  try {
    // Update attributes to mark as inactive
    await updateUserAttributes(userUuid, { is_active: false });

    // Unassign role
    try {
      await permit.api.roleAssignments.unassign({
        user: userUuid,
        role: currentRole,
        tenant: 'default',
      });
      console.log(`[PermitSync] ✓ Deactivated user ${userUuid}`);
    } catch (unassignError) {
      // Role might already be unassigned
      console.log(`[PermitSync] Role was not assigned (okay)`);
    }

    return true;
  } catch (error) {
    console.error(`[PermitSync] ✗ Failed to deactivate user:`, error.message);
    return false;
  }
}

/**
 * Reactivate user in Permit
 * Assigns role back to user
 * 
 * @param {string} userUuid - User UUID
 * @param {string} role - Role key to assign
 * @returns {Promise<boolean>} True if reactivation successful
 */
async function reactivateUser(userUuid, role) {
  try {
    // Validate role exists
    const roleExists = await validateRoleExists(role);
    if (!roleExists) {
      console.error(`[PermitSync] Role "${role}" does not exist in Permit`);
      return false;
    }

    // Update attributes to mark as active
    await updateUserAttributes(userUuid, { is_active: true });

    // Assign role
    await permit.api.roleAssignments.assign({
      user: userUuid,
      role: role,
      tenant: 'default',
    });

    console.log(`[PermitSync] ✓ Reactivated user ${userUuid} with role ${role}`);
    return true;
  } catch (error) {
    console.error(`[PermitSync] ✗ Failed to reactivate user:`, error.message);
    return false;
  }
}

/**
 * Delete user from Permit
 * Permanently removes user (use deactivate instead for soft delete)
 * 
 * @param {string} userUuid - User UUID
 * @returns {Promise<boolean>} True if deletion successful
 */
async function deleteUser(userUuid) {
  try {
    await permit.api.users.delete(userUuid);
    console.log(`[PermitSync] ✓ Deleted user ${userUuid} from Permit`);
    return true;
  } catch (error) {
    console.error(`[PermitSync] ✗ Failed to delete user:`, error.message);
    return false;
  }
}

/**
 * Check if user exists in Permit
 * 
 * @param {string} userUuid - User UUID
 * @returns {Promise<boolean>} True if user exists
 */
async function userExistsInPermit(userUuid) {
  try {
    await permit.api.users.get(userUuid);
    return true;
  } catch (error) {
    if (error.message && error.message.includes('not found')) {
      return false;
    }
    // Other errors - assume user doesn't exist
    return false;
  }
}

/**
 * Just-in-time user sync
 * If user doesn't exist in Permit, fetch from database and sync
 * 
 * @param {string} userUuid - User UUID
 * @returns {Promise<boolean>} True if user exists or was synced
 */
async function ensureUserInPermit(userUuid) {
  try {
    // Check if user exists
    const exists = await userExistsInPermit(userUuid);
    if (exists) {
      return true;
    }

    console.log(`[PermitSync] User ${userUuid} not found in Permit, syncing from database...`);

    // Fetch user from database
    const [users] = await executeQuery(
      `SELECT u.uuid, u.username, u.role, u.employee_uuid, u.is_active,
              e.department_uuid,
              CONCAT_WS(' ', e.first_name, e.middle_name, e.last_name) as full_name,
              a.email
       FROM Users u
       LEFT JOIN Employees e ON u.employee_uuid = e.uuid
       LEFT JOIN EmployeeAddresses a ON e.uuid = a.employee_uuid AND a.address_type = 'CURRENT'
       WHERE u.uuid = ?
       LIMIT 1`,
      [userUuid]
    );

    if (users.length === 0) {
      console.error(`[PermitSync] User ${userUuid} not found in database`);
      return false;
    }

    const user = users[0];
    const success = await syncUserToPermit(user, user.full_name, user.email);
    
    return success;
  } catch (error) {
    console.error(`[PermitSync] Failed to ensure user in Permit:`, error.message);
    return false;
  }
}

/**
 * Bulk sync all users from database to Permit
 * Use for initial migration or after Permit environment reset
 * 
 * @returns {Promise<Object>} Sync statistics
 */
async function bulkSyncAllUsers() {
  try {
    console.log('[PermitSync] Starting bulk user sync...');

    // Fetch all active users with their employee data
    const [users] = await executeQuery(
      `SELECT u.uuid, u.username, u.role, u.employee_uuid, u.is_active,
              e.department_uuid,
              CONCAT_WS(' ', e.first_name, e.middle_name, e.last_name) as full_name,
              a.email
       FROM Users u
       LEFT JOIN Employees e ON u.employee_uuid = e.uuid
       LEFT JOIN EmployeeAddresses a ON e.uuid = a.employee_uuid AND a.address_type = 'CURRENT'
       ORDER BY u.created_at ASC`
    );

    console.log(`[PermitSync] Found ${users.length} users to sync`);

    let successCount = 0;
    let failCount = 0;

    for (const user of users) {
      const success = await syncUserToPermit(user, user.full_name, user.email);
      if (success) {
        successCount++;
      } else {
        failCount++;
      }
      
      // Small delay to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    const stats = {
      total: users.length,
      success: successCount,
      failed: failCount,
      timestamp: new Date().toISOString(),
    };

    console.log('[PermitSync] Bulk sync completed:', stats);
    return stats;
  } catch (error) {
    console.error('[PermitSync] Bulk sync failed:', error.message);
    throw error;
  }
}

/**
 * Get sync statistics
 * Compare HRMS users with Permit users
 * 
 * @returns {Promise<Object>} Sync status
 */
async function getSyncStatus() {
  try {
    // Count HRMS users
    const [hrmsCount] = await executeQuery(
      'SELECT COUNT(*) as count FROM Users WHERE is_active = TRUE'
    );

    // Count Permit users
    let permitCount = 0;
    try {
      const permitUsers = await permit.api.users.list({ perPage: 1000 });
      permitCount = permitUsers.data.length;
    } catch (error) {
      console.error('[PermitSync] Failed to fetch Permit users:', error.message);
    }

    return {
      hrms_users: hrmsCount[0].count,
      permit_users: permitCount,
      in_sync: hrmsCount[0].count === permitCount,
    };
  } catch (error) {
    console.error('[PermitSync] Failed to get sync status:', error.message);
    return {
      hrms_users: 0,
      permit_users: 0,
      in_sync: false,
      error: error.message,
    };
  }
}

module.exports = {
  syncUserToPermit,
  updateUserAttributes,
  changeUserRole,
  deactivateUser,
  reactivateUser,
  deleteUser,
  userExistsInPermit,
  ensureUserInPermit,
  bulkSyncAllUsers,
  getSyncStatus,
  validateRoleExists,
};
