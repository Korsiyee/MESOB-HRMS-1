/**
 * Employee Scope Service
 * 
 * Provides safe, validated query builders for employee data access based on user scopes.
 * Prevents data leakage by enforcing scope boundaries at the service layer.
 * 
 * Supported Scopes:
 * - SELF: User's own employee record
 * - DEPARTMENT: Employees in user's department
 * - BRANCH: Employees in user's branch
 * - COMPANY: Employees in user's company
 * - ALL: All employees (no filtering)
 */

const { sendError } = require("../utils/response");

/**
 * Build WHERE clause for employee queries based on scope
 * 
 * @param {Object} scopeFilter - From req.scopeFilter
 * @param {string} scopeFilter.type - Scope type (SELF, DEPARTMENT, BRANCH, COMPANY, ALL)
 * @param {string} [scopeFilter.value] - Scope value (UUID)
 * @param {string} [tableAlias='e'] - SQL table alias for Employees table
 * @returns {Object} { whereClause: string, params: [] }
 */
function buildEmployeeWhereClause(scopeFilter, tableAlias = 'e') {
  if (!scopeFilter || !scopeFilter.type) {
    throw new Error('Scope filter is required');
  }
  
  const prefix = tableAlias ? `${tableAlias}.` : '';
  
  switch (scopeFilter.type) {
    case 'ALL':
      // No filtering - return condition that always passes
      return { whereClause: '1=1', params: [] };
      
    case 'SELF':
      if (!scopeFilter.value) {
        throw new Error('Scope value (employee_uuid) required for SELF scope');
      }
      return { 
        whereClause: `${prefix}uuid = ?`, 
        params: [scopeFilter.value] 
      };
      
    case 'DEPARTMENT':
      if (!scopeFilter.value) {
        throw new Error('Scope value (department_uuid) required for DEPARTMENT scope');
      }
      return { 
        whereClause: `${prefix}department_uuid = ?`, 
        params: [scopeFilter.value] 
      };
      
    case 'BRANCH':
      if (!scopeFilter.value) {
        throw new Error('Scope value (branch_uuid) required for BRANCH scope');
      }
      return { 
        whereClause: `${prefix}branch_uuid = ?`, 
        params: [scopeFilter.value] 
      };
      
    case 'COMPANY':
      if (!scopeFilter.value) {
        throw new Error('Scope value (company_uuid) required for COMPANY scope');
      }
      return { 
        whereClause: `${prefix}company_uuid = ?`, 
        params: [scopeFilter.value] 
      };
      
    default:
      console.error(`[employeeScopeService] Unknown scope type: ${scopeFilter.type}`);
      // Deny access for unknown scope types
      return { whereClause: '1=0', params: [] };
  }
}

/**
 * Check if user can access a specific employee record
 * 
 * @param {Object} scopeFilter - From req.scopeFilter
 * @param {Object} employee - Employee record from database
 * @param {string} employee.uuid - Employee UUID
 * @param {string} employee.department_uuid - Department UUID
 * @param {string} [employee.branch_uuid] - Branch UUID
 * @param {string} [employee.company_uuid] - Company UUID
 * @returns {boolean} True if access allowed
 */
function canAccessEmployee(scopeFilter, employee) {
  if (!scopeFilter || !employee) {
    return false;
  }
  
  switch (scopeFilter.type) {
    case 'ALL':
      return true;
      
    case 'SELF':
      return employee.uuid === scopeFilter.value;
      
    case 'DEPARTMENT':
      return employee.department_uuid === scopeFilter.value;
      
    case 'BRANCH':
      return employee.branch_uuid === scopeFilter.value;
      
    case 'COMPANY':
      return employee.company_uuid === scopeFilter.value;
      
    default:
      console.error(`[employeeScopeService] Unknown scope type: ${scopeFilter.type}`);
      return false;
  }
}

/**
 * Build complete SELECT query for employees with scope filtering
 * 
 * @param {Object} scopeFilter - From req.scopeFilter
 * @param {Object} options - Query options
 * @param {string[]} [options.fields=['*']] - Fields to select
 * @param {string} [options.orderBy='created_at DESC'] - ORDER BY clause
 * @param {number} [options.limit] - LIMIT value
 * @param {number} [options.offset] - OFFSET value
 * @param {Object} [options.additionalWhere] - Additional WHERE conditions { clause: string, params: [] }
 * @returns {Object} { query: string, params: [] }
 */
function buildEmployeeQuery(scopeFilter, options = {}) {
  const {
    fields = ['*'],
    orderBy = 'e.created_at DESC',
    limit,
    offset,
    additionalWhere
  } = options;
  
  const fieldList = Array.isArray(fields) ? fields.join(', ') : fields;
  
  // Build scope WHERE clause
  const { whereClause: scopeClause, params: scopeParams } = buildEmployeeWhereClause(scopeFilter, 'e');
  
  // Combine scope clause with additional where conditions
  let whereClauses = [scopeClause];
  let allParams = [...scopeParams];
  
  if (additionalWhere && additionalWhere.clause) {
    whereClauses.push(additionalWhere.clause);
    allParams = allParams.concat(additionalWhere.params || []);
  }
  
  const whereClause = whereClauses.join(' AND ');
  
  // Build complete query
  let query = `
    SELECT ${fieldList}
    FROM Employees e
    WHERE ${whereClause}
  `;
  
  if (orderBy) {
    query += ` ORDER BY ${orderBy}`;
  }
  
  if (limit) {
    query += ` LIMIT ?`;
    allParams.push(limit);
  }
  
  if (offset) {
    query += ` OFFSET ?`;
    allParams.push(offset);
  }
  
  return { query, params: allParams };
}

/**
 * Build COUNT query for employees with scope filtering
 * 
 * @param {Object} scopeFilter - From req.scopeFilter
 * @param {Object} [additionalWhere] - Additional WHERE conditions { clause: string, params: [] }
 * @returns {Object} { query: string, params: [] }
 */
function buildEmployeeCountQuery(scopeFilter, additionalWhere = null) {
  const { whereClause: scopeClause, params: scopeParams } = buildEmployeeWhereClause(scopeFilter, 'e');
  
  let whereClauses = [scopeClause];
  let allParams = [...scopeParams];
  
  if (additionalWhere && additionalWhere.clause) {
    whereClauses.push(additionalWhere.clause);
    allParams = allParams.concat(additionalWhere.params || []);
  }
  
  const whereClause = whereClauses.join(' AND ');
  
  const query = `
    SELECT COUNT(*) as total
    FROM Employees e
    WHERE ${whereClause}
  `;
  
  return { query, params: allParams };
}

/**
 * Validate scope filter structure
 * 
 * @param {Object} scopeFilter - Scope filter to validate
 * @returns {Object} { valid: boolean, error: string }
 */
function validateScopeFilter(scopeFilter) {
  if (!scopeFilter) {
    return { valid: false, error: 'Scope filter is required' };
  }
  
  if (!scopeFilter.type) {
    return { valid: false, error: 'Scope type is required' };
  }
  
  const validTypes = ['ALL', 'SELF', 'DEPARTMENT', 'BRANCH', 'COMPANY'];
  if (!validTypes.includes(scopeFilter.type)) {
    return { valid: false, error: `Invalid scope type: ${scopeFilter.type}` };
  }
  
  // Validate that value is present for scopes that require it
  if (scopeFilter.type !== 'ALL' && !scopeFilter.value) {
    return { valid: false, error: `Scope value required for ${scopeFilter.type} scope` };
  }
  
  return { valid: true };
}

/**
 * Express middleware to validate and enforce employee scope
 * Use after requireScope('employee')
 * 
 * @returns {Function} Express middleware
 */
function enforceEmployeeScope() {
  return (req, res, next) => {
    if (!req.scopeFilter) {
      return sendError(res, {
        status: 500,
        message: 'Scope filter not set - ensure requireScope middleware runs first',
        error: 'SCOPE_NOT_SET'
      });
    }
    
    const validation = validateScopeFilter(req.scopeFilter);
    if (!validation.valid) {
      console.error('[employeeScopeService] Scope validation failed:', validation.error);
      return sendError(res, {
        status: 400,
        message: 'Invalid scope configuration',
        error: 'INVALID_SCOPE'
      });
    }
    
    return next();
  };
}

module.exports = {
  buildEmployeeWhereClause,
  buildEmployeeQuery,
  buildEmployeeCountQuery,
  canAccessEmployee,
  validateScopeFilter,
  enforceEmployeeScope
};
