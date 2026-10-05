/**
 * Role Hierarchy Middleware
 * 
 * Enforces role hierarchy rules for administrative operations.
 * Prevents users from modifying roles or users with higher hierarchy levels.
 */

const rbacService = require("../services/rbacService");
const { sendError } = require("../utils/response");

/**
 * Check if actor can modify target role
 * 
 * Used when creating/updating/deleting roles or assigning roles to users.
 * Ensures that administrators cannot modify roles above their level.
 * 
 * @param {string} targetRoleParam - Request parameter containing target role UUID
 * @returns {Function} Express middleware
 * 
 * @example
 * router.put('/roles/:roleUuid',
 *   authorize({ permissions: 'Roles.Update' }),
 *   canModifyRole('roleUuid'),
 *   handler
 * );
 */
function canModifyRole(targetRoleParam = 'roleUuid') {
  return async (req, res, next) => {
    try {
      const actorUserUuid = req.user.uuid;
      const targetRoleUuid = req.params[targetRoleParam] || req.body.roleUuid;
      
      if (!targetRoleUuid) {
        return sendError(res, {
          status: 400,
          message: "Target role UUID is required.",
          error: "INVALID_INPUT",
        });
      }
      
      // Get actor's role
      const actorRole = await rbacService.getUserRole(actorUserUuid);
      if (!actorRole) {
        return sendError(res, {
          status: 403,
          message: "User has no role assigned.",
          error: "NO_ROLE",
        });
      }
      
      // Super Admin can modify any role
      if (actorRole.code === 'SUPER_ADMIN') {
        console.log(`[canModifyRole] ✅ Super Admin bypass - ${req.user.username}`);
        return next();
      }
      
      // Check if actor can modify target role
      const canModify = await rbacService.canModifyRole(actorRole.uuid, targetRoleUuid);
      
      if (!canModify) {
        const targetRole = await rbacService.getRoleByUuid(targetRoleUuid);
        console.log(
          `[canModifyRole] ❌ Hierarchy violation - Actor: ${req.user.username} ` +
          `(Level ${actorRole.hierarchy_level}), Target: ${targetRole?.name} ` +
          `(Level ${targetRole?.hierarchy_level})`
        );
        
        return sendError(res, {
          status: 403,
          message: "Cannot modify roles at or above your hierarchy level.",
          error: "HIERARCHY_VIOLATION",
        });
      }
      
      console.log(`[canModifyRole] ✅ Hierarchy check passed - ${req.user.username}`);
      next();
    } catch (error) {
      console.error('[canModifyRole] Error:', error);
      return sendError(res, {
        status: 500,
        message: "Role hierarchy check failed.",
        error: "INTERNAL_ERROR",
      });
    }
  };
}

/**
 * Check if actor can assign a specific role to a user
 * 
 * Used when changing user roles. Ensures administrators cannot
 * assign roles above their own hierarchy level.
 * 
 * @param {string} roleParam - Request parameter/body field containing role UUID to assign
 * @returns {Function} Express middleware
 * 
 * @example
 * router.put('/users/:uuid/role',
 *   authorize({ permissions: 'Accounts.AssignRole' }),
 *   canAssignRole('roleUuid'),
 *   handler
 * );
 */
function canAssignRole(roleParam = 'roleUuid') {
  return async (req, res, next) => {
    try {
      const actorUserUuid = req.user.uuid;
      const targetRoleUuid = req.body[roleParam] || req.params[roleParam];
      
      if (!targetRoleUuid) {
        return sendError(res, {
          status: 400,
          message: "Role UUID is required.",
          error: "INVALID_INPUT",
        });
      }
      
      // Check if actor can assign this role
      const canAssign = await rbacService.canAssignRole(actorUserUuid, targetRoleUuid);
      
      if (!canAssign) {
        const targetRole = await rbacService.getRoleByUuid(targetRoleUuid);
        const actorRole = await rbacService.getUserRole(actorUserUuid);
        
        console.log(
          `[canAssignRole] ❌ Cannot assign role - Actor: ${req.user.username} ` +
          `(Level ${actorRole?.hierarchy_level}), Target Role: ${targetRole?.name} ` +
          `(Level ${targetRole?.hierarchy_level})`
        );
        
        return sendError(res, {
          status: 403,
          message: "Cannot assign roles at or above your hierarchy level.",
          error: "HIERARCHY_VIOLATION",
        });
      }
      
      console.log(`[canAssignRole] ✅ Can assign role - ${req.user.username}`);
      next();
    } catch (error) {
      console.error('[canAssignRole] Error:', error);
      return sendError(res, {
        status: 500,
        message: "Role assignment check failed.",
        error: "INTERNAL_ERROR",
      });
    }
  };
}

/**
 * Check if actor can modify a specific user
 * 
 * Prevents modifying users with roles at or above actor's level.
 * 
 * @param {string} userUuidParam - Request parameter containing target user UUID
 * @returns {Function} Express middleware
 * 
 * @example
 * router.delete('/users/:uuid',
 *   authorize({ permissions: 'Accounts.Delete' }),
 *   canModifyUser('uuid'),
 *   handler
 * );
 */
function canModifyUser(userUuidParam = 'uuid') {
  return async (req, res, next) => {
    try {
      const actorUserUuid = req.user.uuid;
      const targetUserUuid = req.params[userUuidParam];
      
      if (!targetUserUuid) {
        return sendError(res, {
          status: 400,
          message: "Target user UUID is required.",
          error: "INVALID_INPUT",
        });
      }
      
      // Cannot modify self through this check (use separate logic for that)
      if (actorUserUuid === targetUserUuid) {
        return next();
      }
      
      // Get both users' roles
      const actorRole = await rbacService.getUserRole(actorUserUuid);
      const targetRole = await rbacService.getUserRole(targetUserUuid);
      
      if (!actorRole) {
        return sendError(res, {
          status: 403,
          message: "User has no role assigned.",
          error: "NO_ROLE",
        });
      }
      
      // Super Admin can modify anyone
      if (actorRole.code === 'SUPER_ADMIN') {
        console.log(`[canModifyUser] ✅ Super Admin bypass - ${req.user.username}`);
        return next();
      }
      
      if (!targetRole) {
        // Target has no role - allow
        return next();
      }
      
      // Check hierarchy
      if (targetRole.hierarchy_level >= actorRole.hierarchy_level) {
        console.log(
          `[canModifyUser] ❌ Hierarchy violation - Actor: ${req.user.username} ` +
          `(Level ${actorRole.hierarchy_level}), Target Level: ${targetRole.hierarchy_level}`
        );
        
        return sendError(res, {
          status: 403,
          message: "Cannot modify users with roles at or above your level.",
          error: "HIERARCHY_VIOLATION",
        });
      }
      
      console.log(`[canModifyUser] ✅ Hierarchy check passed - ${req.user.username}`);
      next();
    } catch (error) {
      console.error('[canModifyUser] Error:', error);
      return sendError(res, {
        status: 500,
        message: "User modification check failed.",
        error: "INTERNAL_ERROR",
      });
    }
  };
}

/**
 * Prevent modification of system roles
 * 
 * System roles cannot be deleted or have their core attributes changed.
 * 
 * @param {string} roleParam - Request parameter containing role UUID
 * @returns {Function} Express middleware
 * 
 * @example
 * router.delete('/roles/:roleUuid',
 *   authorize({ permissions: 'Roles.Delete' }),
 *   preventSystemRoleModification('roleUuid'),
 *   handler
 * );
 */
function preventSystemRoleModification(roleParam = 'roleUuid') {
  return async (req, res, next) => {
    try {
      const roleUuid = req.params[roleParam];
      
      if (!roleUuid) {
        return sendError(res, {
          status: 400,
          message: "Role UUID is required.",
          error: "INVALID_INPUT",
        });
      }
      
      const role = await rbacService.getRoleByUuid(roleUuid);
      
      if (!role) {
        return sendError(res, {
          status: 404,
          message: "Role not found.",
          error: "NOT_FOUND",
        });
      }
      
      if (role.is_system_role) {
        console.log(
          `[preventSystemRoleModification] ❌ System role modification blocked - ` +
          `User: ${req.user.username}, Role: ${role.name}`
        );
        
        return sendError(res, {
          status: 403,
          message: "System roles cannot be modified or deleted.",
          error: "SYSTEM_ROLE_PROTECTED",
        });
      }
      
      next();
    } catch (error) {
      console.error('[preventSystemRoleModification] Error:', error);
      return sendError(res, {
        status: 500,
        message: "System role check failed.",
        error: "INTERNAL_ERROR",
      });
    }
  };
}

module.exports = {
  canModifyRole,
  canAssignRole,
  canModifyUser,
  preventSystemRoleModification,
};
