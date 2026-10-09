/**
 * Scope-Based Data Filtering Middleware
 * 
 * Applies data access boundaries based on user's assigned scopes:
 * - SELF: User can only access their own data
 * - DEPARTMENT: User can access data from their department
 * - BRANCH: User can access data from their branch
 * - COMPANY: User can access data from their company
 * - ALL: User can access all data (no filtering)
 * 
 * Middleware populates req.scopeFilter which should be used in query WHERE clauses
 */

const { sendError } = require("../utils/response");

/**
 * Middleware to determine and apply user's data access scope
 * Populates req.scopeFilter for use in database queries
 * 
 * @param {string} resourceType - Type of resource (e.g., 'employee', 'attendance', 'leave')
 * @returns {Function} Express middleware
 * 
 * @example
 * router.get('/employees', 
 *   authenticateJwt, 
 *   requirePermission({ occupations: 'Employees - Overview' }),
 *   requireScope('employee'),
 *   employeeController.getEmployees
 * );
 */
function requireScope(resourceType) {
  return async (req, res, next) => {
    if (!req.user) {
      return sendError(res, {
        status: 401,
        message: "Not authenticated.",
        error: "UNAUTHORIZED",
      });
    }
    
    // SUPER_ADMIN and HR_ADMIN bypass scope filtering (see all data)
    if (req.user.role === "SUPER_ADMIN" || req.user.role === "HR_ADMIN") {
      req.scopeFilter = { type: 'ALL' };
      console.log(`[requireScope] ✅ Admin bypass - scope set to ALL for ${req.user.username}`);
      return next();
    }
    
    const scopes = req.user.scopes || [];
    
    // Find the most permissive scope
    // Hierarchy: ALL > COMPANY > BRANCH > DEPARTMENT > SELF
    if (scopes.some(s => s.scope_type === 'ALL')) {
      req.scopeFilter = { type: 'ALL' };
      console.log(`[requireScope] ✅ Scope: ALL for ${req.user.username}`);
    } else if (scopes.some(s => s.scope_type === 'COMPANY')) {
      const scope = scopes.find(s => s.scope_type === 'COMPANY');
      req.scopeFilter = { type: 'COMPANY', value: scope.scope_value };
      console.log(`[requireScope] ✅ Scope: COMPANY (${scope.scope_value}) for ${req.user.username}`);
    } else if (scopes.some(s => s.scope_type === 'BRANCH')) {
      const scope = scopes.find(s => s.scope_type === 'BRANCH');
      req.scopeFilter = { type: 'BRANCH', value: scope.scope_value };
      console.log(`[requireScope] ✅ Scope: BRANCH (${scope.scope_value}) for ${req.user.username}`);
    } else if (scopes.some(s => s.scope_type === 'DEPARTMENT')) {
      // Use department from scope if specified, otherwise fall back to user's department
      const scope = scopes.find(s => s.scope_type === 'DEPARTMENT');
      const deptUuid = scope.scope_value || req.user.department_uuid;
      req.scopeFilter = { type: 'DEPARTMENT', value: deptUuid };
      console.log(`[requireScope] ✅ Scope: DEPARTMENT (${deptUuid}) for ${req.user.username}`);
    } else {
      // No scope assigned, default to SELF
      req.scopeFilter = { type: 'SELF', value: req.user.employee_uuid };
      console.log(`[requireScope] ✅ Scope: SELF (${req.user.employee_uuid}) for ${req.user.username}`);
    }
    
    return next();
  };
}

/**
 * Helper to apply scope filter to SQL WHERE clause
 * Generates SQL condition and parameters for scope filtering
 * 
 * @param {Object} scopeFilter - From req.scopeFilter
 * @param {string} scopeFilter.type - Scope type (SELF, DEPARTMENT, BRANCH, COMPANY, ALL)
 * @param {string} [scopeFilter.value] - Scope value (UUID)
 * @param {string} [tableAlias=''] - SQL table alias (e.g., 'e' for employees)
 * @param {Object} [columnMap={}] - Custom column mapping for scope fields
 * @returns {Object} { whereClause: string, params: [] }
 * 
 * @example
 * // In controller:
 * const { whereClause, params } = applyScopeFilter(
 *   req.scopeFilter, 
 *   'e',
 *   { employee: 'uuid', department: 'department_uuid' }
 * );
 * const query = `SELECT * FROM Employees e WHERE ${whereClause} AND status = 'ACTIVE'`;
 * const [rows] = await executeQuery(query, [...params, 'ACTIVE']);
 */
function applyScopeFilter(scopeFilter, tableAlias = '', columnMap = {}) {
  const prefix = tableAlias ? `${tableAlias}.` : '';
  
  // Default column names
  const columns = {
    employee: columnMap.employee || 'uuid',
    department: columnMap.department || 'department_uuid',
    branch: columnMap.branch || 'branch_uuid',
    company: columnMap.company || 'company_uuid'
  };
  
  if (scopeFilter.type === 'ALL') {
    // No filtering - return condition that always passes
    return { whereClause: '1=1', params: [] };
  } else if (scopeFilter.type === 'DEPARTMENT') {
    return { 
      whereClause: `${prefix}${columns.department} = ?`, 
      params: [scopeFilter.value] 
    };
  } else if (scopeFilter.type === 'BRANCH') {
    return { 
      whereClause: `${prefix}${columns.branch} = ?`, 
      params: [scopeFilter.value] 
    };
  } else if (scopeFilter.type === 'COMPANY') {
    return { 
      whereClause: `${prefix}${columns.company} = ?`, 
      params: [scopeFilter.value] 
    };
  } else if (scopeFilter.type === 'SELF') {
    return { 
      whereClause: `${prefix}${columns.employee} = ?`, 
      params: [scopeFilter.value] 
    };
  }
  
  // Default: deny access (should never reach here)
  console.error(`[applyScopeFilter] Unknown scope type: ${scopeFilter.type}`);
  return { whereClause: '1=0', params: [] };
}

/**
 * Helper to check if scope allows access to specific resource
 * Useful for single-resource endpoints (GET /employees/:uuid)
 * 
 * @param {Object} scopeFilter - From req.scopeFilter
 * @param {Object} resource - Resource object from database
 * @param {string} resource.uuid - Resource UUID
 * @param {string} resourcp.department_uuid - Resource department UUID
 * @param {string} [resource.branch_uuid] - Resource branch UUID (optional)
 * @param {string} [resource.company_uuid] - Resource company UUID (optional)
 * @returns {boolean} True if scope allows access
 * 
 * @example
 * // In controller:
 * const employee = await getEmployeeByUuid(req.params.uuid);
 * if (!canAccessResource(req.scopeFilter, employee)) {
 *   return sendError(res, { status: 403, message: "Access denied" });
 * }
 */
function canAccessResource(scopeFilter, resource) {
  if (scopeFilter.type === 'ALL') {
    return true;
  } else if (scopeFilter.type === 'SELF') {
    return resource.uuid === scopeFilter.value;
  } else if (scopeFilter.type === 'DEPARTMENT') {
    return resourcp.department_uuid === scopeFilter.value;
  } else if (scopeFilter.type === 'BRANCH') {
    return resource.branch_uuid === scopeFilter.value;
  } else if (scopeFilter.type === 'COMPANY') {
    return resource.company_uuid === scopeFilter.value;
  }
  
  return false;
}

module.exports = {
  requireScope,
  applyScopeFilter,
  canAccessResource
};
