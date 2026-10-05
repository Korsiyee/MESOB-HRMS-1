/**
 * Permit.io Authorization Middleware
 * 
 * This middleware replaces the custom RBAC system with Permit.io authorization.
 * 
 * Key Features:
 * - Simple resource-action authorization
 * - Self-access patterns for own data
 * - Graceful fallback when Permit is unavailable
 * - Just-in-time user synchronization
 * - Comprehensive error handling and logging
 * 
 * Usage Examples:
 *   authorize('view', 'employees')
 *   authorize('create', 'employees')
 *   allowSelfOr('view', 'employees', req => req.params.uuid)
 *   requireAny([
 *     { action: 'view', resource: 'employees' },
 *     { action: 'view', resource: 'attendance' }
 *   ])
 * 
 * Replaces:
 * - authorize.js (old RBAC system)
 * - requireRole.js (hardcoded roles)
 * - requirePermission.js (occupation-based)
 */

const { permit } = require('../config/permit');
const { ensureUserInPermit } = require('../services/permitSyncService');
const { sendError } = require('../utils/response');

/**
 * Main authorization middleware
 * Checks if user has permission to perform action on resource
 * 
 * @param {string} action - Action to perform (e.g., 'view', 'create', 'update', 'delete')
 * @param {string} resource - Resource to act on (e.g., 'employees', 'attendance', 'leave')
 * @param {Object} options - Additional options
 * @param {boolean} options.failOpen - If true, allow access when Permit is down (DANGEROUS)
 * @param {Function} options.getResourceInstance - Function to get resource instance for ABAC
 * @returns {Function} Express middleware
 * 
 * @example
 * router.get('/employees', authorize('view', 'employees'), listEmployees);
 * router.post('/employees', authorize('create', 'employees'), createEmployee);
 * router.patch('/employees/:uuid', authorize('update', 'employees'), updateEmployee);
 * router.delete('/employees/:uuid', authorize('delete', 'employees'), deleteEmployee);
 */
function authorize(action, resource, options = {}) {
  const { failOpen = false, getResourceInstance = null } = options;

  return async (req, res, next) => {
    try {
      // Check authentication first
      if (!req.user || !req.user.uuid) {
        return sendError(res, {
          status: 401,
          message: 'Authentication required.',
          error: 'UNAUTHORIZED',
        });
      }

      const userUuid = req.user.uuid;

      // Ensure user exists in Permit (just-in-time sync)
      const userExists = await ensureUserInPermit(userUuid);
      if (!userExists) {
        console.error(`[Permit] User ${userUuid} could not be synced to Permit`);
        // Continue anyway - the permit.check will fail gracefully
      }

      // Build resource instance for ABAC (if function provided)
      let resourceInstance = resource;
      if (getResourceInstance) {
        try {
          const instance = await getResourceInstance(req);
          if (instance) {
            resourceInstance = {
              type: resource,
              attributes: instance,
            };
          }
        } catch (err) {
          console.error(`[Permit] Failed to get resource instance:`, err.message);
          // Continue with just resource type
        }
      }

      // Check permission with Permit
      console.log(`[Permit] Checking: user=${req.user.username}, action=${action}, resource=${resource}`);

      const allowed = await permit.check(userUuid, action, resourceInstance);

      if (!allowed) {
        console.log(`[Permit] ✗ Access denied - ${req.user.username} cannot ${action} ${resource}`);
        
        return sendError(res, {
          status: 403,
          message: 'Insufficient permissions.',
          error: 'FORBIDDEN',
        });
      }

      console.log(`[Permit] ✓ Access granted - ${req.user.username} can ${action} ${resource}`);
      next();
    } catch (error) {
      console.error(`[Permit] Authorization check failed:`, error.message);

      // CRITICAL: Fail closed by default (deny access on error)
      // Only fail open if explicitly configured (use with extreme caution)
      if (failOpen) {
        console.warn(`[Permit] ⚠️  FAIL OPEN enabled - allowing access despite error`);
        return next();
      }

      return sendError(res, {
        status: 503,
        message: 'Authorization service temporarily unavailable.',
        error: 'SERVICE_UNAVAILABLE',
      });
    }
  };
}

/**
 * Self-access OR permission middleware
 * Allows users to access their own data OR requires permission for others' data
 * 
 * @param {string} action - Action to perform
 * @param {string} resource - Resource type
 * @param {Function} getResourceOwner - Function that returns resource owner UUID from request
 * @returns {Function} Express middleware
 * 
 * @example
 * // Allow viewing own employee record OR having 'view' permission on 'employees'
 * router.get('/employees/:uuid', 
 *   allowSelfOr('view', 'employees', req => req.params.uuid),
 *   getEmployee
 * );
 * 
 * @example
 * // Allow viewing own leave balance OR having 'view' permission on 'leave'
 * router.get('/leave/balance/:uuid',
 *   allowSelfOr('view', 'leave', req => req.params.uuid),
 *   getLeaveBalance
 * );
 */
function allowSelfOr(action, resource, getResourceOwner) {
  return async (req, res, next) => {
    try {
      // Check authentication
      if (!req.user || !req.user.uuid) {
        return sendError(res, {
          status: 401,
          message: 'Authentication required.',
          error: 'UNAUTHORIZED',
        });
      }

      // Check if accessing own resource
      try {
        const resourceOwnerUuid = getResourceOwner(req);
        
        // Allow self-access (compare with employee_uuid for employee resources)
        if (resourceOwnerUuid === req.user.uuid || 
            resourceOwnerUuid === req.user.employee_uuid) {
          console.log(`[Permit] ✓ Self-access granted - ${req.user.username} accessing own ${resource}`);
          return next();
        }
      } catch (err) {
        console.error(`[Permit] Error checking self-access:`, err.message);
        // Continue to permission check
      }

      // Not self-access, check permission
      return authorize(action, resource)(req, res, next);
    } catch (error) {
      console.error(`[Permit] Self-access check failed:`, error.message);
      return sendError(res, {
        status: 500,
        message: 'Authorization check failed.',
        error: 'INTERNAL_ERROR',
      });
    }
  };
}

/**
 * Require ANY of multiple permissions (OR logic)
 * User needs at least one of the specified permissions
 * 
 * @param {Array<Object>} permissions - Array of {action, resource} objects
 * @returns {Function} Express middleware
 * 
 * @example
 * // User needs either 'view' on 'employees' OR 'view' on 'attendance'
 * router.get('/search', 
 *   requireAny([
 *     { action: 'view', resource: 'employees' },
 *     { action: 'view', resource: 'attendance' }
 *   ]),
 *   searchEmployees
 * );
 */
function requireAny(permissions) {
  return async (req, res, next) => {
    try {
      if (!req.user || !req.user.uuid) {
        return sendError(res, {
          status: 401,
          message: 'Authentication required.',
          error: 'UNAUTHORIZED',
        });
      }

      const userUuid = req.user.uuid;
      await ensureUserInPermit(userUuid);

      // Check each permission until one succeeds
      for (const { action, resource } of permissions) {
        try {
          const allowed = await permit.check(userUuid, action, resource);
          if (allowed) {
            console.log(`[Permit] ✓ Access granted via ${action} ${resource}`);
            return next();
          }
        } catch (err) {
          console.error(`[Permit] Error checking ${action} ${resource}:`, err.message);
          // Continue checking other permissions
        }
      }

      // None of the permissions matched
      console.log(`[Permit] ✗ Access denied - user lacks any of the required permissions`);
      return sendError(res, {
        status: 403,
        message: 'Insufficient permissions.',
        error: 'FORBIDDEN',
      });
    } catch (error) {
      console.error(`[Permit] requireAny check failed:`, error.message);
      return sendError(res, {
        status: 503,
        message: 'Authorization service temporarily unavailable.',
        error: 'SERVICE_UNAVAILABLE',
      });
    }
  };
}

/**
 * Require ALL of multiple permissions (AND logic)
 * User needs every specified permission
 * 
 * @param {Array<Object>} permissions - Array of {action, resource} objects
 * @returns {Function} Express middleware
 * 
 * @example
 * // User needs both 'view' on 'employees' AND 'create' on 'accounts'
 * router.post('/employees/with-account',
 *   requireAll([
 *     { action: 'create', resource: 'employees' },
 *     { action: 'create', resource: 'accounts' }
 *   ]),
 *   createEmployeeWithAccount
 * );
 */
function requireAll(permissions) {
  return async (req, res, next) => {
    try {
      if (!req.user || !req.user.uuid) {
        return sendError(res, {
          status: 401,
          message: 'Authentication required.',
          error: 'UNAUTHORIZED',
        });
      }

      const userUuid = req.user.uuid;
      await ensureUserInPermit(userUuid);

      // Check all permissions
      for (const { action, resource } of permissions) {
        const allowed = await permit.check(userUuid, action, resource);
        if (!allowed) {
          console.log(`[Permit] ✗ Access denied - user lacks ${action} ${resource}`);
          return sendError(res, {
            status: 403,
            message: 'Insufficient permissions.',
            error: 'FORBIDDEN',
          });
        }
      }

      console.log(`[Permit] ✓ Access granted - user has all required permissions`);
      next();
    } catch (error) {
      console.error(`[Permit] requireAll check failed:`, error.message);
      return sendError(res, {
        status: 503,
        message: 'Authorization service temporarily unavailable.',
        error: 'SERVICE_UNAVAILABLE',
      });
    }
  };
}

/**
 * Direct permission check (not middleware)
 * Use in controllers for conditional logic
 * 
 * @param {string} userUuid - User UUID
 * @param {string} action - Action
 * @param {string} resource - Resource
 * @returns {Promise<boolean>} True if allowed
 * 
 * @example
 * async function getEmployees(req, res) {
 *   const canExport = await checkPermission(req.user.uuid, 'export', 'employees');
 *   const employees = await fetchEmployees();
 *   res.json({ 
 *     data: employees, 
 *     canExport 
 *   });
 * }
 */
async function checkPermission(userUuid, action, resource) {
  try {
    await ensureUserInPermit(userUuid);
    return await permit.check(userUuid, action, resource);
  } catch (error) {
    console.error(`[Permit] Permission check failed:`, error.message);
    return false; // Fail closed
  }
}

/**
 * Check if user can access a specific resource instance
 * Uses Permit ABAC to check permissions with resource attributes
 * 
 * @param {string} userUuid - User UUID
 * @param {string} action - Action to perform
 * @param {string} resourceType - Resource type (e.g., 'employees')
 * @param {Object} resourceAttributes - Resource attributes for ABAC
 * @returns {Promise<boolean>} True if allowed
 * 
 * @example
 * // Check if user can view specific employee
 * const canView = await checkResourceAccess(
 *   req.user.uuid,
 *   'view',
 *   'employees',
 *   { 
 *     department_uuid: employee.department_uuid,
 *     uuid: employee.uuid 
 *   }
 * );
 */
async function checkResourceAccess(userUuid, action, resourceType, resourceAttributes) {
  try {
    await ensureUserInPermit(userUuid);
    
    // Check with resource attributes for ABAC evaluation
    const allowed = await permit.check(
      userUuid,
      action,
      {
        type: resourceType,
        attributes: resourceAttributes,
        tenant: 'default'
      }
    );
    
    return allowed;
  } catch (error) {
    console.error(`[Permit] Resource access check failed:`, error.message);
    return false; // Fail closed
  }
}

/**
 * Filter array of resources based on Permit policies
 * Checks each resource individually against user's permissions
 * 
 * @param {string} userUuid - User UUID
 * @param {string} action - Action (e.g., 'view')
 * @param {string} resourceType - Resource type (e.g., 'employees')
 * @param {Array} resources - Array of resource objects
 * @param {Function} getAttributes - Function to extract attributes from resource
 * @returns {Promise<Array>} Filtered array of accessible resources
 * 
 * @example
 * // Filter employees user can view
 * const accessible = await filterResourcesByPermission(
 *   req.user.uuid,
 *   'view',
 *   'employees',
 *   allEmployees,
 *   (emp) => ({ department_uuid: emp.department_uuid, uuid: emp.uuid })
 * );
 */
async function filterResourcesByPermission(userUuid, action, resourceType, resources, getAttributes) {
  try {
    const accessible = [];
    
    for (const resource of resources) {
      const attributes = getAttributes(resource);
      const allowed = await checkResourceAccess(userUuid, action, resourceType, attributes);
      
      if (allowed) {
        accessible.push(resource);
      }
    }
    
    return accessible;
  } catch (error) {
    console.error(`[Permit] Resource filtering failed:`, error.message);
    return []; // Fail closed - return empty array
  }
}

module.exports = {
  authorize,
  allowSelfOr,
  requireAny,
  requireAll,
  checkPermission,
  checkResourceAccess,
  filterResourcesByPermission,
};
