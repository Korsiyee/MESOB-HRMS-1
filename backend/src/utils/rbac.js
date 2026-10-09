/**
 * RBAC Utility Functions
 * 
 * Simplified helpers that work with module-based permissions.
 * Uses req.moduleAccess set by moduleAuth middleware.
 */

const { ApiError } = require("./errors");

/**
 * Assert user has permission to read employee data
 * Simplified: moduleAuth middleware already checked permissions
 * 
 * @param {Object} user - req.user object
 * @param {Object} employee - Employee record
 * @param {Object} moduleAccess - req.moduleAccess from middleware
 * @throws {ApiError} If access denied
 */
async function assertEmployeeReadAccess(user, employee, moduleAccess = null) {
  if (!user) {
    throw new ApiError("Not authenticated.", 401, "UNAUTHORIZED");
  }

  if (!employee) {
    throw new ApiError("Employee not found.", 404, "NOT_FOUND");
  }

  // Check if accessing own employee record (always allowed)
  if (user.employee_uuid === employee.uuid) {
    return;
  }

  // If no moduleAccess provided, assume middleware already checked
  if (!moduleAccess) {
    return;
  }

  // Check scope boundaries based on moduleAccess.scope
  const scope = moduleAccess.scope;
  
  if (scope.code === 'DEPARTMENT' && employep.department_uuid !== user.department_uuid) {
    throw new ApiError("Employee is outside your department scope.", 403, "FORBIDDEN");
  }
  
  if (scope.code === 'SELF' && user.employee_uuid !== employee.uuid) {
    throw new ApiError("Your scope is limited to self-access only.", 403, "FORBIDDEN");
  }
}

/**
 * Assert user has permission to list employees
 * Returns scope filter for query construction
 * 
 * @param {Object} user - req.user object
 * @param {Object} moduleAccess - req.moduleAccess from middleware (optional)
 * @returns {Object} Scope filter: { scope, departmentUuid?, employeeUuid? }
 * @throws {ApiError} If access denied
 */
async function assertEmployeeListAccess(user, moduleAccess = null) {
  if (!user) {
    throw new ApiError("Not authenticated.", 401, "UNAUTHORIZED");
  }

  // If no moduleAccess, assume middleware already validated
  // Default to organization-wide access for backward compat
  if (!moduleAccess || !moduleAccess.scope) {
    return { scope: "all" };
  }

  const scope = moduleAccess.scope;
  
  switch (scope.code) {
    case 'ORGANIZATION':
      return { scope: "all" };
      
    case 'DEPARTMENT':
      if (!user.department_uuid) {
        throw new ApiError("Department scope requires department assignment.", 403, "FORBIDDEN");
      }
      return { scope: "department", departmentUuid: user.department_uuid };
      
    case 'SELF':
      if (!user.employee_uuid) {
        throw new ApiError("No employee record linked to user.", 403, "FORBIDDEN");
      }
      return { scope: "self", employeeUuid: user.employee_uuid };
      
    default:
      // Unknown scope - default to organization
      return { scope: "all" };
  }
}

/**
 * Check if user has module access (helper)
 * 
 * @param {Object} moduleAccess - req.moduleAccess from middleware
 * @returns {boolean}
 */
function hasModuleAccess(moduleAccess) {
  return moduleAccess && moduleAccess.scope;
}

/**
 * Get scope level from moduleAccess
 * 
 * @param {Object} moduleAccess - req.moduleAccess from middleware
 * @returns {string} Scope code (ORGANIZATION, DEPARTMENT, SELF)
 */
function getScopeLevel(moduleAccess) {
  return moduleAccess?.scope?.code || 'ORGANIZATION';
}

module.exports = {
  assertEmployeeReadAccess,
  assertEmployeeListAccess,
  hasModuleAccess,
  getScopeLevel,
};
