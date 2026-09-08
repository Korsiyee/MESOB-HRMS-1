/**
 * Centralized Authorization Middleware
 * 
 * Database-driven permission checking that replaces:
 * - requireRole.js ❌
 * - requirePermission.js ❌
 * - Hardcoded role checks ❌
 * 
 * Usage:
 *   authorize({ permissions: 'employees.view' })
 *   authorize({ permissions: ['leave.approve', 'leave.reject'], logic: 'OR' })
 *   authorize({ permissions: 'employees.update', allowSelfAccess: true, getResourceOwnerId: (req) => req.params.uuid })
 */

const authorizationService = require("../services/authorizationService");
const { sendError } = require("../utils/response");

/**
 * Authorization middleware
 * 
 * @param {Object} options
 * @param {string|string[]} [options.permissions] - Required permission code(s)
 * @param {string} [options.logic='OR'] - 'AND' or 'OR' for multiple permissions
 * @param {boolean} [options.allowSelfAccess=false] - Allow if user is accessing their own resource
 * @param {Function} [options.getResourceOwnerId] - Function to extract resource owner ID from request
 * @param {boolean} [options.skipSuperAdminBypass=false] - Don't auto-grant access to Super Admin
 * 
 * @returns {Function} Express middleware
 */
function authorize(options = {}) {
  const {
    permissions = [],
    logic = 'OR',
    allowSelfAccess = false,
    getResourceOwnerId = null,
    skipSuperAdminBypass = false,
  } = options;
  
  // Normalize permissions to array
  const requiredPermissions = Array.isArray(permissions) 
    ? permissions 
    : (permissions ? [permissions] : []);
  
  return async (req, res, next) => {
    try {
      // Check authentication
      if (!req.user || !req.user.uuid) {
        return sendError(res, {
          status: 401,
          message: "Authentication required.",
          error: "UNAUTHORIZED",
        });
      }
      
      const userId = req.user.uuid;
      
      // Super Admin bypass (unless explicitly disabled)
      if (!skipSuperAdminBypass) {
        const isSuperAdmin = await authorizationService.isSuperAdmin(userId);
        if (isSuperAdmin) {
          console.log(`[authorize] ✅ Super Admin bypass - ${req.user.username} → ${req.originalUrl}`);
          return next();
        }
      }
      
      // Self-access check (if enabled)
      if (allowSelfAccess && getResourceOwnerId) {
        try {
          const resourceOwnerId = getResourceOwnerId(req);
          
          // If resource belongs to the user, grant access
          if (resourceOwnerId === userId || resourceOwnerId === req.user.employee_uuid) {
            console.log(`[authorize] ✅ Self-access granted - ${req.user.username} → ${req.originalUrl}`);
            return next();
          }
        } catch (err) {
          console.error('[authorize] Error in getResourceOwnerId:', err);
          // Continue to permission check if self-access check fails
        }
      }
      
      // No permissions required - allow (just authentication check)
      if (requiredPermissions.length === 0) {
        console.log(`[authorize] ✅ No permissions required - ${req.user.username} → ${req.originalUrl}`);
        return next();
      }
      
      // Permission check
      let hasAccess = false;
      
      if (logic === 'AND') {
        hasAccess = await authorizationService.hasAllPermissions(userId, requiredPermissions);
      } else {
        hasAccess = await authorizationService.hasAnyPermission(userId, requiredPermissions);
      }
      
      if (!hasAccess) {
        const permList = requiredPermissions.join(', ');
        console.log(
          `[authorize] ❌ Permission denied - User: ${req.user.username}, ` +
          `Required (${logic}): [${permList}], Endpoint: ${req.originalUrl}`
        );
        
        // Log authorization denial to audit log
        await logAuthorizationDenial(req, requiredPermissions, logic);
        
        return sendError(res, {
          status: 403,
          message: "Insufficient permissions.",
          error: "FORBIDDEN",
        });
      }
      
      console.log(
        `[authorize] ✅ Access granted - User: ${req.user.username}, ` +
        `Permissions: [${requiredPermissions.join(', ')}], Endpoint: ${req.originalUrl}`
      );
      
      return next();
    } catch (error) {
      console.error('[authorize] Authorization error:', error);
      return sendError(res, {
        status: 500,
        message: "Authorization check failed.",
        error: "INTERNAL_ERROR",
      });
    }
  };
}

/**
 * Log authorization denial to audit log
 * @param {Object} req - Express request
 * @param {string[]} requiredPermissions - Required permissions
 * @param {string} logic - Logic type (AND/OR)
 */
async function logAuthorizationDenial(req, requiredPermissions, logic) {
  try {
    const { executeQuery } = require("../utils/dbQuery");
    const { v4: uuidv4 } = require("uuid");
    
    await executeQuery(
      `INSERT INTO AuthorizationAuditLogs 
       (uuid, actor_user_uuid, action_type, resource_type, reason, ip_address, user_agent, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)`,
      [
        uuidv4(),
        req.user.uuid,
        'AUTHORIZATION_DENIED',
        'API_ENDPOINT',
        `Missing permission (${logic}): ${requiredPermissions.join(', ')} - Endpoint: ${req.originalUrl}`,
        req.ip,
        req.headers['user-agent'] || null,
      ]
    );
  } catch (err) {
    console.error('[authorize] Failed to log authorization denial:', err);
    // Don't throw - logging failure shouldn't block the response
  }
}

/**
 * Helper: Require specific scope for data filtering
 * Can be used in combination with authorize()
 * 
 * @param {string} resourceType - Resource type for scope filtering
 * @returns {Function} Express middleware
 */
function requireScopeFilter(resourceType) {
  return async (req, res, next) => {
    try {
      if (!req.user || !req.user.uuid) {
        return sendError(res, {
          status: 401,
          message: "Authentication required.",
          error: "UNAUTHORIZED",
        });
      }
      
      // Super Admin and HR Admin always get ALL scope
      const role = await authorizationService.getUserRole(req.user.uuid);
      
      if (role && (role.code === 'SUPER_ADMIN' || role.code === 'HR_ADMIN')) {
        req.scopeFilter = { type: 'ALL', value: null };
        console.log(`[requireScopeFilter] Admin bypass - scope set to ALL for ${req.user.username}`);
        return next();
      }
      
      // Get user's assigned scope
      const scope = await authorizationService.getUserScope(req.user.uuid);
      req.scopeFilter = scope;
      
      console.log(
        `[requireScopeFilter] Scope applied - User: ${req.user.username}, ` +
        `Type: ${scope.type}, Value: ${scope.value || 'N/A'}`
      );
      
      return next();
    } catch (error) {
      console.error('[requireScopeFilter] Scope filter error:', error);
      return sendError(res, {
        status: 500,
        message: "Scope filter failed.",
        error: "INTERNAL_ERROR",
      });
    }
  };
}

module.exports = {
  authorize,
  requireScopeFilter,
};
