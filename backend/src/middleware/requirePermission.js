/**
 * Permission-Based Authorization Middleware
 * 
 * Checks if user has required occupation(s) based on JWT payload.
 * No database queries - all authorization data is in the JWT token.
 * 
 * Key features:
 * - SUPER_ADMIN bypass for all checks
 * - Role filtering (optional)
 * - Single or multiple occupation checks
 * - OR logic (user needs ANY of the required occupations)
 * - AND logic (user needs ALL of the required occupations)
 * - Audit logging for authorization failures
 */

const { sendError } = require("../utils/response");
const auditService = require("../services/auditService");

/**
 * Middleware to check if user has required occupation(s)
 * 
 * @param {Object} options - Configuration
 * @param {string[]} [options.roles=[]] - Allowed roles (optional, empty = all roles allowed)
 * @param {string|string[]} [options.occupations=[]] - Required occupation(s)
 * @param {string} [options.logic='OR'] - 'OR' (any occupation) or 'AND' (all occupations)
 * @returns {Function} Express middleware
 * 
 * @example
 * // Single occupation check
 * requirePermission({ occupations: 'Employees - Overview' })
 * 
 * @example
 * // Multiple occupations with OR logic (user needs ANY)
 * requirePermission({ 
 *   occupations: ['Employees - Overview', 'Employees - Registration'],
 *   logic: 'OR'
 * })
 * 
 * @example
 * // Multiple occupations with AND logic (user needs ALL)
 * requirePermission({ 
 *   occupations: ['Employees - Overview', 'Departments - Overview'],
 *   logic: 'AND'
 * })
 * 
 * @example
 * // Role + occupation check
 * requirePermission({ 
 *   roles: ['HR_ADMIN', 'HR_OFFICER'],
 *   occupations: 'Employees - Registration'
 * })
 */
function requirePermission({ roles = [], occupations = [], logic = 'OR' } = {}) {
  // Normalize inputs
  const allowedRoles = Array.isArray(roles) ? new Set(roles) : new Set([roles].filter(Boolean));
  const requiredOccupations = Array.isArray(occupations) 
    ? occupations.filter(Boolean)
    : [occupations].filter(Boolean);
  
  return async (req, res, next) => {
    // Authentication check
    if (!req.user) {
      return sendError(res, {
        status: 401,
        message: "Not authenticated.",
        error: "UNAUTHORIZED",
      });
    }
    
    // SUPER_ADMIN always has full access (bypass all checks)
    if (req.user.role === "SUPER_ADMIN") {
      console.log(`[requirePermission] ✅ SUPER_ADMIN bypass for ${req.user.username}`);
      return next();
    }
    
    // Role check (if specified)
    if (allowedRoles.size > 0 && !allowedRoles.has(req.user.role)) {
      console.log(
        `[requirePermission] ❌ Role check failed - User: ${req.user.username}, ` +
        `Role: ${req.user.role}, Required: [${Array.from(allowedRoles).join(', ')}]`
      );
      
      await auditService.logAuthorizationDenied(
        req,
        `Role required: ${Array.from(allowedRoles).join(' or ')}`
      );
      
      return sendError(res, {
        status: 403,
        message: "Insufficient permissions.",
        error: "FORBIDDEN",
      });
    }
    
    // If no occupation requirement specified, allow access (role check passed)
    if (requiredOccupations.length === 0) {
      console.log(`[requirePermission] ✅ No occupation required - ${req.user.username}`);
      return next();
    }
    
    // Occupation check (from JWT payload)
    const userOccupations = new Set(req.user.occupations || []);
    
    let hasPermission = false;
    if (logic === 'OR') {
      // User needs ANY of the required occupations
      hasPermission = requiredOccupations.some(occ => userOccupations.has(occ));
    } else {
      // User needs ALL of the required occupations
      hasPermission = requiredOccupations.every(occ => userOccupations.has(occ));
    }
    
    if (!hasPermission) {
      console.log(
        `[requirePermission] ❌ Occupation check failed - User: ${req.user.username}, ` +
        `Has: [${Array.from(userOccupations).join(', ')}], ` +
        `Required (${logic}): [${requiredOccupations.join(', ')}]`
      );
      
      await auditService.logAuthorizationDenied(
        req,
        `Missing occupation (${logic}): ${requiredOccupations.join(', ')}`
      );
      
      return sendError(res, {
        status: 403,
        message: "Insufficient permissions.",
        error: "FORBIDDEN",
      });
    }
    
    console.log(
      `[requirePermission] ✅ Access granted - User: ${req.user.username}, ` +
      `Endpoint: ${req.originalUrl}`
    );
    
    return next();
  };
}

/**
 * Helper function to create middleware for self-access OR occupation check
 * Allows users to access their own data OR if they have the required occupation
 * 
 * @param {Object} options - Configuration
 * @param {string|string[]} options.occupations - Required occupation(s) for non-self access
 * @param {Function} options.isSelfAccess - Function to determine if accessing own data
 * @returns {Function} Express middleware
 * 
 * @example
 * requirePermissionOrSelfAccess({
 *   occupations: 'Employees - Overview',
 *   isSelfAccess: (req) => req.params.uuid === req.user.employee_uuid
 * })
 */
function requirePermissionOrSelfAccess({ occupations, isSelfAccess }) {
  return async (req, res, next) => {
    if (!req.user) {
      return sendError(res, {
        status: 401,
        message: "Not authenticated.",
        error: "UNAUTHORIZED",
      });
    }
    
    // SUPER_ADMIN bypass
    if (req.user.role === "SUPER_ADMIN") {
      return next();
    }
    
    // Check if user is accessing their own data
    if (isSelfAccess && isSelfAccess(req)) {
      console.log(`[requirePermissionOrSelfAccess] ✅ Self-access granted - ${req.user.username}`);
      return next();
    }
    
    // Fall back to occupation check
    return requirePermission({ occupations })(req, res, next);
  };
}

module.exports = {
  requirePermission,
  requirePermissionOrSelfAccess
};

// ============================================================================
// DEPRECATION NOTICE
// ============================================================================
/**
 * @deprecated This middleware uses occupation-based permissions and is being replaced.
 * 
 * Please use the new authorize() middleware from './authorize.js' instead.
 * 
 * The new system uses:
 * - Resource.Action format (e.g., 'Employees.View' instead of 'employees.view')
 * - Database-driven roles and permissions
 * - Flexible data scopes
 * - Support for custom roles
 * 
 * Migration guide: See /backend/RBAC_MIGRATION_GUIDE.md
 * 
 * This file will be removed in a future version after migration is complete.
 */
