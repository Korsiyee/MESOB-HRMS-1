/**
 * Centralized Authorization Middleware - RBAC System
 * 
 * Complete permission-based authorization system that replaces:
 * - requireRole.js ❌ (hardcoded role checks)
 * - requirePermission.js ❌ (occupation-based)
 * - All hardcoded role comparisons ❌
 * 
 * Features:
 * - Database-driven permission checking
 * - Super Admin bypass (configurable)
 * - Self-access rules for own data
 * - AND/OR logic for multiple permissions
 * - Data scope enforcement
 * - Audit logging for denials
 * 
 * Usage Examples:
 *   authorize({ permissions: 'Employees.View' })
 *   authorize({ permissions: ['Leave.Approve', 'Leave.Reject'], logic: 'OR' })
 *   authorize({ permissions: 'Employees.Update', allowSelfAccess: true })
 *   authorize({ permissions: 'Employees.View', enforceScope: true })
 */

const rbacService = require("../services/rbacService");
const { sendError } = require("../utils/response");

/**
 * Main Authorization Middleware
 * 
 * @param {Object} options - Authorization options
 * @param {string|string[]} [options.permissions] - Required permission code(s) (e.g., 'Employees.View')
 * @param {string} [options.logic='OR'] - 'AND' or 'OR' for multiple permissions
 * @param {boolean} [options.allowSelfAccess=false] - Allow if user is accessing their own resource
 * @param {Function} [options.getResourceOwnerId] - Function to extract resource owner ID from request
 * @param {boolean} [options.skipSuperAdminBypass=false] - Don't auto-grant access to Super Admin
 * @param {boolean} [options.enforceScope=false] - Enforce data scope and attach to req.scope
 * @param {string} [options.scopePermission] - Permission to use for scope (defaults to first permission)
 * 
 * @returns {Function} Express middleware
 * 
 * @example
 * // Simple permission check
 * router.get('/employees', authorize({ permissions: 'Employees.View' }), handler);
 * 
 * @example
 * // Multiple permissions with OR logic
 * router.post('/approve', authorize({ 
 *   permissions: ['Leave.Approve', 'Leave.Reject'],
 *   logic: 'OR'
 * }), handler);
 * 
 * @example
 * // With self-access (own profile)
 * router.get('/profile/:uuid', authorize({
 *   permissions: 'Employees.View',
 *   allowSelfAccess: true,
 *   getResourceOwnerId: (req) => req.params.uuid
 * }), handler);
 * 
 * @example
 * // With scope enforcement
 * router.get('/employees', authorize({
 *   permissions: 'Employees.View',
 *   enforceScope: true
 * }), handler);
 */
function authorize(options = {}) {
  const {
    permissions = [],
    logic = 'OR',
    allowSelfAccess = false,
    getResourceOwnerId = null,
    skipSuperAdminBypass = false,
    enforceScope = false,
    scopePermission = null,
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
        const isSuperAdmin = await rbacService.isSuperAdmin(userId);
        if (isSuperAdmin) {
          console.log(`[authorize] ✅ Super Admin bypass - ${req.user.username} → ${req.originalUrl}`);
          
          // Attach ALL scope even for super admin if enforceScope is true
          if (enforceScope) {
            req.scope = {
              type: 'ALL',
              code: 'ALL',
              configuration: null,
              source: 'SUPER_ADMIN'
            };
          }
          
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
            
            // Attach OWN scope if enforceScope is true
            if (enforceScope) {
              req.scope = {
                type: 'OWN',
                code: 'OWN',
                configuration: null,
                source: 'SELF_ACCESS'
              };
            }
            
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
        hasAccess = await rbacService.hasAllPermissions(userId, requiredPermissions);
      } else {
        hasAccess = await rbacService.hasAnyPermission(userId, requiredPermissions);
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
      
      // Attach data scope if enforceScope is true
      if (enforceScope) {
        const permissionForScope = scopePermission || requiredPermissions[0];
        const scope = await rbacService.getPermissionScope(userId, permissionForScope);
        req.scope = scope;
        
        console.log(
          `[authorize] 📊 Scope attached - Type: ${scope.type}, Source: ${scope.source}`
        );
      }
      
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
 * 
 * This middleware attaches scope information to req.scope for use in controllers.
 * Controllers should use this scope to filter database queries appropriately.
 * 
 * @param {string} permissionCode - Permission code to get scope for
 * @returns {Function} Express middleware
 * 
 * @example
 * router.get('/employees', 
 *   authorize({ permissions: 'Employees.View' }),
 *   requireScopeFilter('Employees.View'),
 *   handler
 * );
 */
function requireScopeFilter(permissionCode) {
  return async (req, res, next) => {
    try {
      if (!req.user || !req.user.uuid) {
        return sendError(res, {
          status: 401,
          message: "Authentication required.",
          error: "UNAUTHORIZED",
        });
      }
      
      const scope = await rbacService.getPermissionScope(req.user.uuid, permissionCode);
      req.scope = scope;
      
      // Attach user context for scope resolution
      req.scopeContext = {
        userUuid: req.user.uuid,
        employeeUuid: req.user.employee_uuid,
        departmentUuid: req.user.department_uuid,
        branchUuid: req.user.branch_uuid || null,
        regionUuid: req.user.region_uuid || null,
      };
      
      console.log(
        `[requireScopeFilter] Scope applied - User: ${req.user.username}, ` +
        `Permission: ${permissionCode}, Type: ${scope.type}, Source: ${scope.source}`
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
