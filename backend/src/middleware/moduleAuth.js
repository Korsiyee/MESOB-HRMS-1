/**
 * Module-Level Authorization Middleware
 * 
 * Simple module-level access control for static RBAC system
 * 
 * Usage:
 *   router.get('/employees', requireModule('EMPLOYEE_LIST'), employeeController.list);
 *   router.get('/attendance', requireModule('MY_ATTENDANCE'), attendanceController.list);
 */

const { sendError } = require('../utils/response');
const moduleAuthService = require('../services/moduleAuthService');

/**
 * Middleware to require access to a specific module
 * 
 * @param {string} moduleCode - Module code (EMPLOYEE_LIST, MY_ATTENDANCE, etc.)
 * @param {Object} options - Additional options
 * @param {boolean} options.optional - If true, don't block request if module not accessible (just set req.moduleAccess)
 * @returns {Function} Express middleware
 * 
 * @example
 * // Require EMPLOYEE_LIST module access
 * router.get('/employees', requireModule('EMPLOYEE_LIST'), controller.list);
 * 
 * @example
 * // Optional check (sets req.moduleAccess but doesn't block)
 * router.get('/dashboard', requireModule('MY_ATTENDANCE', { optional: true }), controller.dashboard);
 */
function requireModule(moduleCode, options = {}) {
  const { optional = false } = options;

  return async (req, res, next) => {
    try {
      // Check authentication
      if (!req.user || !req.user.uuid) {
        return sendError(res, {
          status: 401,
          message: 'Not authenticated',
          error: 'UNAUTHORIZED'
        });
      }

      // Get user's module access
      const moduleAccess = await moduleAuthService.checkModuleAccess(
        req.user.uuid,
        moduleCode
      );

      // Store module access info in request
      req.moduleAccess = moduleAccess;

      // If module not accessible and not optional, deny access
      if (!moduleAccess && !optional) {
        console.log(
          `[ModuleAuth] ❌ Access denied - User: ${req.user.username}, Module: ${moduleCode}`
        );

        return sendError(res, {
          status: 403,
          message: 'You do not have access to this module',
          error: 'FORBIDDEN',
          details: { module: moduleCode }
        });
      }

      if (moduleAccess) {
        console.log(
          `[ModuleAuth] ✅ Access granted - User: ${req.user.username}, Module: ${moduleCode}`
        );
      }

      next();
    } catch (error) {
      console.error('[ModuleAuth] Error checking module access:', error);
      return sendError(res, {
        status: 500,
        message: 'Authorization check failed',
        error: 'INTERNAL_SERVER_ERROR'
      });
    }
  };
}

/**
 * Middleware to require access to any of multiple modules (OR logic)
 * User needs access to at least one of the specified modules
 * 
 * @param {string[]} moduleCodes - Array of module codes
 * @returns {Function} Express middleware
 * 
 * @example
 * // User needs EMPLOYEE_LIST or DEPARTMENTS access
 * router.get('/staff', requireAnyModule(['EMPLOYEE_LIST', 'DEPARTMENTS']), controller.list);
 */
function requireAnyModule(moduleCodes) {
  return async (req, res, next) => {
    try {
      if (!req.user || !req.user.uuid) {
        return sendError(res, {
          status: 401,
          message: 'Not authenticated',
          error: 'UNAUTHORIZED'
        });
      }

      // Check each module
      for (const moduleCode of moduleCodes) {
        const moduleAccess = await moduleAuthService.checkModuleAccess(
          req.user.uuid,
          moduleCode
        );

        if (moduleAccess) {
          req.moduleAccess = moduleAccess;
          console.log(
            `[ModuleAuth] ✅ Access granted via ${moduleCode} - User: ${req.user.username}`
          );
          return next();
        }
      }

      // No module access found
      console.log(
        `[ModuleAuth] ❌ Access denied - User: ${req.user.username}, ` +
        `Required modules: ${moduleCodes.join(' OR ')}`
      );

      return sendError(res, {
        status: 403,
        message: 'You do not have access to any of the required modules',
        error: 'FORBIDDEN',
        details: { modules: moduleCodes }
      });
    } catch (error) {
      console.error('[ModuleAuth] Error checking module access:', error);
      return sendError(res, {
        status: 500,
        message: 'Authorization check failed',
        error: 'INTERNAL_SERVER_ERROR'
      });
    }
  };
}

/**
 * Middleware to allow self-access OR module access
 * Useful for endpoints where users can access their own data OR have module permissions
 * 
 * @param {string} moduleCode - Module code that grants full access (optional)
 * @returns {Function} Express middleware
 * 
 * @example
 * // Allow user to access their own data, OR anyone with EMPLOYEE_PROFILE module
 * router.get('/employees/:uuid', checkSelfAccess('EMPLOYEE_PROFILE'), controller.getById);
 */
function checkSelfAccess(moduleCode = null) {
  return async (req, res, next) => {
    try {
      if (!req.user || !req.user.uuid) {
        return sendError(res, {
          status: 401,
          message: 'Not authenticated',
          error: 'UNAUTHORIZED'
        });
      }

      // Get the target UUID from params
      const targetUuid = req.params.uuid;

      // Check if user is accessing their own data
      const isSelf = targetUuid === req.user.employee_uuid;

      if (isSelf) {
        console.log(`[ModuleAuth] ✅ Self-access granted - User: ${req.user.username}`);
        req.isSelfAccess = true;
        return next();
      }

      // If not self-access and moduleCode provided, check module access
      if (moduleCode) {
        const moduleAccess = await moduleAuthService.checkModuleAccess(
          req.user.uuid,
          moduleCode
        );

        if (moduleAccess) {
          console.log(
            `[ModuleAuth] ✅ Module access granted - User: ${req.user.username}, Module: ${moduleCode}`
          );
          req.moduleAccess = moduleAccess;
          req.isSelfAccess = false;
          return next();
        }
      }

      // Neither self-access nor module access
      console.log(
        `[ModuleAuth] ❌ Access denied - User: ${req.user.username}, Target: ${targetUuid}`
      );

      return sendError(res, {
        status: 403,
        message: 'You do not have access to this resource',
        error: 'FORBIDDEN'
      });
    } catch (error) {
      console.error('[ModuleAuth] Error in checkSelfAccess:', error);
      return sendError(res, {
        status: 500,
        message: 'Authorization check failed',
        error: 'INTERNAL_SERVER_ERROR'
      });
    }
  };
}

/**
 * Middleware to check if user's role matches required roles
 * Useful for role-specific operations
 * 
 * @param {string|string[]} roleCodes - Role code(s) required (e.g., 'HR_ADMIN' or ['HR_ADMIN', 'SUPER_ADMIN'])
 * @returns {Function} Express middleware
 * 
 * @example
 * // Only HR_ADMIN and SUPER_ADMIN can access
 * router.post('/settings', requireRole(['HR_ADMIN', 'SUPER_ADMIN']), controller.updateSettings);
 */
function requireRole(roleCodes) {
  const allowedRoles = Array.isArray(roleCodes) ? roleCodes : [roleCodes];

  return async (req, res, next) => {
    try {
      if (!req.user || !req.user.uuid) {
        return sendError(res, {
          status: 401,
          message: 'Not authenticated',
          error: 'UNAUTHORIZED'
        });
      }

      // Get user permissions to access role info
      const permissions = await moduleAuthService.getUserPermissions(req.user.uuid);

      if (!permissions || !permissions.role) {
        return sendError(res, {
          status: 403,
          message: 'Unable to verify user role',
          error: 'FORBIDDEN'
        });
      }

      // Check if user's role is in allowed roles
      if (allowedRoles.includes(permissions.role.code)) {
        console.log(
          `[ModuleAuth] ✅ Role check passed - User: ${req.user.username}, Role: ${permissions.role.code}`
        );
        req.userRole = permissions.role;
        return next();
      }

      console.log(
        `[ModuleAuth] ❌ Role check failed - User: ${req.user.username}, ` +
        `Role: ${permissions.role.code}, Required: ${allowedRoles.join(' OR ')}`
      );

      return sendError(res, {
        status: 403,
        message: 'You do not have the required role to access this resource',
        error: 'FORBIDDEN',
        details: { requiredRoles: allowedRoles }
      });
    } catch (error) {
      console.error('[ModuleAuth] Error in requireRole:', error);
      return sendError(res, {
        status: 500,
        message: 'Authorization check failed',
        error: 'INTERNAL_SERVER_ERROR'
      });
    }
  };
}

module.exports = {
  requireModule,
  requireAnyModule,
  checkSelfAccess,
  requireRole
};
