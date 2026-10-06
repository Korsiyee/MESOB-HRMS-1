/**
 * Module-Level Authorization Middleware
 * 
 * Simple module-level permission checking that replaces Permit.io
 * 
 * Usage:
 *   router.get('/employees', requireModule('EMPLOYEES'), employeeController.list);
 *   router.get('/attendance', requireModule('ATTENDANCE'), attendanceController.list);
 */

const { sendError } = require('../utils/response');
const moduleAuthService = require('../services/moduleAuthService');

/**
 * Middleware to require access to a specific module
 * 
 * @param {string} moduleCode - Module code (HOME, EMPLOYEES, ORGANIZATION, etc.)
 * @param {Object} options - Additional options
 * @param {boolean} options.optional - If true, don't block request if module not accessible (just set req.moduleAccess)
 * @returns {Function} Express middleware
 * 
 * @example
 * // Require EMPLOYEES module access
 * router.get('/employees', requireModule('EMPLOYEES'), controller.list);
 * 
 * @example
 * // Optional check (sets req.moduleAccess but doesn't block)
 * router.get('/dashboard', requireModule('HOME', { optional: true }), controller.dashboard);
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
          `[ModuleAuth] ✅ Access granted - User: ${req.user.username}, ` +
          `Module: ${moduleCode}, Scope: ${moduleAccess.scope.code}`
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
 * // User needs EMPLOYEES or ORGANIZATION access
 * router.get('/staff', requireAnyModule(['EMPLOYEES', 'ORGANIZATION']), controller.list);
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
 * Middleware to apply scope filtering to requests
 * Loads user permissions and sets up scope context
 * Should be used after requireModule to get full permission context
 * 
 * @returns {Function} Express middleware
 * 
 * @example
 * router.get('/employees',
 *   requireModule('EMPLOYEES'),
 *   withScope(),
 *   controller.list
 * );
 */
function withScope() {
  return async (req, res, next) => {
    try {
      if (!req.user || !req.user.uuid) {
        return sendError(res, {
          status: 401,
          message: 'Not authenticated',
          error: 'UNAUTHORIZED'
        });
      }

      // Get full user permissions
      const permissions = await moduleAuthService.getUserPermissions(req.user.uuid);

      if (!permissions) {
        return sendError(res, {
          status: 403,
          message: 'Unable to load user permissions',
          error: 'FORBIDDEN'
        });
      }

      // Store permissions in request
      req.permissions = permissions;

      // If moduleAccess is set, use that scope; otherwise use default scope
      req.scope = req.moduleAccess 
        ? req.moduleAccess.scope 
        : permissions.defaultScope;

      next();
    } catch (error) {
      console.error('[ModuleAuth] Error loading permissions:', error);
      return sendError(res, {
        status: 500,
        message: 'Failed to load permissions',
        error: 'INTERNAL_SERVER_ERROR'
      });
    }
  };
}

/**
 * Middleware to check resource-level access based on scope
 * Used for detail views and updates
 * 
 * @param {Function} getResource - Function to get resource: (req) => Promise<resource>
 * @returns {Function} Express middleware
 * 
 * @example
 * router.get('/employees/:uuid',
 *   requireModule('EMPLOYEES'),
 *   withScope(),
 *   checkResourceAccess(async (req) => {
 *     const [rows] = await db.query('SELECT * FROM Employees WHERE uuid = ?', [req.params.uuid]);
 *     return rows[0];
 *   }),
 *   controller.getById
 * );
 */
function checkResourceAccess(getResource) {
  return async (req, res, next) => {
    try {
      if (!req.scope || !req.user) {
        return sendError(res, {
          status: 403,
          message: 'Scope information not available',
          error: 'FORBIDDEN'
        });
      }

      // Get the resource
      const resource = await getResource(req);

      if (!resource) {
        return sendError(res, {
          status: 404,
          message: 'Resource not found',
          error: 'NOT_FOUND'
        });
      }

      // Check if user can access this resource based on scope
      const canAccess = moduleAuthService.canAccessResource(
        req.scope,
        req.user.department_uuid,
        req.user.employee_uuid,
        resource
      );

      if (!canAccess) {
        console.log(
          `[ModuleAuth] ❌ Resource access denied - User: ${req.user.username}, ` +
          `Scope: ${req.scope.code}`
        );

        return sendError(res, {
          status: 403,
          message: 'You do not have access to this resource',
          error: 'FORBIDDEN'
        });
      }

      // Store resource in request for controller use
      req.resource = resource;

      console.log(
        `[ModuleAuth] ✅ Resource access granted - User: ${req.user.username}, ` +
        `Scope: ${req.scope.code}`
      );

      next();
    } catch (error) {
      console.error('[ModuleAuth] Error checking resource access:', error);
      return sendError(res, {
        status: 500,
        message: 'Access check failed',
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
 * // Allow user to access their own data, OR anyone with EMPLOYEES module
 * router.get('/employees/:uuid', checkSelfAccess('EMPLOYEES'), controller.getById);
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

module.exports = {
  requireModule,
  requireAnyModule,
  withScope,
  checkResourceAccess,
  checkSelfAccess
};
