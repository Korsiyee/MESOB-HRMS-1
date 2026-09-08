/**
 * RBAC Utility Functions
 * 
 * Database-driven authorization helpers that replace hardcoded role checks.
 * Uses authorizationService for all permission checks.
 */

const { ApiError } = require("./errors");
const authorizationService = require("../services/authorizationService");

/**
 * Assert user has permission to read employee data
 * Checks: employees.view permission OR self-access
 * 
 * @param {Object} user - req.user object
 * @param {Object} employee - Employee record
 * @throws {ApiError} If access denied
 */
async function assertEmployeeReadAccess(user, employee) {
  if (!user) {
    throw new ApiError("Not authenticated.", 401, "UNAUTHORIZED");
  }

  if (!employee) {
    throw new ApiError("Employee not found.", 404, "NOT_FOUND");
  }

  // Check if accessing own employee record
  if (user.employee_uuid === employee.uuid) {
    return; // Self-access allowed
  }

  // Check if user has employees.view permission
  const canView = await authorizationService.hasPermission(user.uuid, 'employees.view');
  
  if (!canView) {
    throw new ApiError("Insufficient permissions to view this employee.", 403, "FORBIDDEN");
  }
  
  // If permission requires scope, check scope boundaries
  const scope = await authorizationService.getUserScope(user.uuid);
  
  if (scope.type === 'DEPARTMENT' && employee.department_uuid !== scope.value) {
    throw new ApiError("Employee is outside your department scope.", 403, "FORBIDDEN");
  }
  
  if (scope.type === 'SELF') {
    // Should have been caught by self-access check above, but double-check
    throw new ApiError("Your scope is limited to self-access only.", 403, "FORBIDDEN");
  }
}

/**
 * Assert user has permission to list employees
 * Returns scope filter for query construction
 * 
 * @param {Object} user - req.user object
 * @returns {Object} Scope filter: { scope, departmentUuid?, branchUuid? }
 * @throws {ApiError} If access denied
 */
async function assertEmployeeListAccess(user) {
  if (!user) {
    throw new ApiError("Not authenticated.", 401, "UNAUTHORIZED");
  }

  // Check if user has employees.view permission
  const canView = await authorizationService.hasPermission(user.uuid, 'employees.view');
  
  if (!canView) {
    throw new ApiError("Insufficient permissions to list employees.", 403, "FORBIDDEN");
  }

  // Get user's data scope
  const scope = await authorizationService.getUserScope(user.uuid);
  
  switch (scope.type) {
    case 'ALL':
    case 'COMPANY':
      return { scope: "all" };
      
    case 'DEPARTMENT':
      if (!scope.value) {
        throw new ApiError("Department scope is missing.", 403, "FORBIDDEN");
      }
      return { scope: "department", departmentUuid: scope.value };
      
    case 'BRANCH':
      if (!scope.value) {
        throw new ApiError("Branch scope is missing.", 403, "FORBIDDEN");
      }
      return { scope: "branch", branchUuid: scope.value };
      
    case 'SELF':
      // SELF scope means user can only see themselves
      if (!user.employee_uuid) {
        throw new ApiError("No employee record linked to user.", 403, "FORBIDDEN");
      }
      return { scope: "self", employeeUuid: user.employee_uuid };
      
    default:
      throw new ApiError("Invalid scope type.", 500, "INTERNAL_ERROR");
  }
}

/**
 * Check if user has a specific permission (async)
 * Convenience wrapper around authorizationService
 * 
 * @param {Object} user - req.user object
 * @param {string} permissionCode - Permission code to check
 * @returns {Promise<boolean>}
 */
async function hasPermission(user, permissionCode) {
  if (!user) return false;
  return authorizationService.hasPermission(user.uuid, permissionCode);
}

/**
 * Check if user has any of the specified permissions
 * 
 * @param {Object} user - req.user object
 * @param {string[]} permissionCodes - Array of permission codes
 * @returns {Promise<boolean>}
 */
async function hasAnyPermission(user, permissionCodes) {
  if (!user) return false;
  return authorizationService.hasAnyPermission(user.uuid, permissionCodes);
}

module.exports = {
  assertEmployeeReadAccess,
  assertEmployeeListAccess,
  hasPermission,
  hasAnyPermission,
};
