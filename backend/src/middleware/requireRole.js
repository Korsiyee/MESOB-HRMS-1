/**
 * Role-Based Authorization Middleware
 * 
 * Checks if user has required role(s) based on JWT payload.
 * No database queries - all authorization data is in the JWT token.
 * 
 * Key features:
 * - SUPER_ADMIN bypass for all checks
 * - Single or multiple role checks
 * - OR logic (user needs ANY of the required roles)
 */

const { sendError } = require("../utils/response");
const auditService = require("../services/auditService");

/**
 * Middleware to check if user has required role(s)
 * 
 * @param {string|string[]} roles - Required role(s)
 * @returns {Function} Express middleware
 * 
 * @example
 * // Single role check
 * requireRole('HR_ADMIN')
 * 
 * @example
 * // Multiple roles (user needs ANY)
 * requireRole(['HR_ADMIN', 'SUPER_ADMIN'])
 */
function requireRole(roles) {
  // Normalize input to array
  const allowedRoles = Array.isArray(roles) ? new Set(roles) : new Set([roles].filter(Boolean));
  
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
      console.log(`[requireRole] ✅ SUPER_ADMIN bypass for ${req.user.username}`);
      return next();
    }
    
    // Role check
    if (!allowedRoles.has(req.user.role)) {
      console.log(
        `[requireRole] ❌ Role check failed - User: ${req.user.username}, ` +
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
    
    console.log(
      `[requireRole] ✅ Access granted - User: ${req.user.username}, ` +
      `Role: ${req.user.role}, Endpoint: ${req.originalUrl}`
    );
    
    return next();
  };
}

module.exports = {
  requireRole
};

// ============================================================================
// DEPRECATION NOTICE
// ============================================================================
/**
 * @deprecated This middleware uses hardcoded role checks and is being phased out.
 * 
 * Please use the new authorize() middleware from './authorize.js' instead.
 * 
 * Migration guide: See /backend/RBAC_MIGRATION_GUIDE.md and MIGRATION_EXAMPLES.md
 * 
 * Migration examples:
 *   OLD: requireRole(['HR_ADMIN', 'SUPER_ADMIN'])
 *   NEW: authorize({ permissions: 'Resource.Action' })
 * 
 *   OLD: requireRole('DEPARTMENT_HEAD')
 *   NEW: authorize({ permissions: 'Resource.View', enforceScope: true })
 * 
 * This file will be removed in a future version after all controllers are migrated.
 */
