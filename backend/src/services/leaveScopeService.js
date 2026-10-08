/**
 * Leave Scope Service
 * 
 * Provides safe, validated query builders for leave/request data access based on user scopes.
 * Prevents data leakage by enforcing scope boundaries at the service layer.
 * 
 * Supported Scopes:
 * - SELF: User's own leave requests
 * - DEPARTMENT: Leave requests for employees in user's department
 * - BRANCH: Leave requests for employees in user's branch
 * - COMPANY: Leave requests for employees in user's company
 * - ALL: All leave requests (no filtering)
 */

const { sendError } = require("../utils/response");

/**
 * Build WHERE clause for leave/request queries based on scope
 * Joins with Employees table to apply department/branch/company filtering
 * 
 * @param {Object} scopeFilter - From req.scopeFilter
 * @param {string} scopeFilter.type - Scope type (SELF, DEPARTMENT, BRANCH, COMPANY, ALL)
 * @param {string} [scopeFilter.value] - Scope value (UUID)
 * @param {string} [requestAlias='r'] - SQL table alias for Requests table
 * @param {string} [employeeAlias='e'] - SQL table alias for Employees table
 * @returns {Object} { whereClause: string, params: [], needsEmployeeJoin: boolean }
 */
function buildLeaveWhereClause(scopeFilter, requestAlias = 'r', employeeAlias = 'e') {
  if (!scopeFilter || !scopeFilter.type) {
    throw new Error('Scope filter is required');
  }
  
  const rPrefix = requestAlias ? `${requestAlias}.` : '';
  const ePrefix = employeeAlias ? `${employeeAlias}.` : '';
  
  switch (scopeFilter.type) {
    case 'ALL':
      return { 
        whereClause: '1=1', 
        params: [], 
        needsEmployeeJoin: false 
      };
      
    case 'SELF':
      if (!scopeFilter.value) {
        throw new Error('Scope value (employee_uuid) required for SELF scope');
      }
      // Filter by employee_uuid directly in Requests table
      return { 
        whereClause: `${rPrefix}employee_uuid = ?`, 
        params: [scopeFilter.value],
        needsEmployeeJoin: false
      };
      
    case 'DEPARTMENT':
      if (!scopeFilter.value) {
        throw new Error('Scope value (department_uuid) required for DEPARTMENT scope');
      }
      return { 
        whereClause: `${ePrefix}department_uuid = ?`, 
        params: [scopeFilter.value],
        needsEmployeeJoin: true
      };
      
    case 'BRANCH':
      if (!scopeFilter.value) {
        throw new Error('Scope value (branch_uuid) required for BRANCH scope');
      }
      return { 
        whereClause: `${ePrefix}branch_uuid = ?`, 
        params: [scopeFilter.value],
        needsEmployeeJoin: true
      };
      
    case 'COMPANY':
      if (!scopeFilter.value) {
        throw new Error('Scope value (company_uuid) required for COMPANY scope');
      }
      return { 
        whereClause: `${ePrefix}company_uuid = ?`, 
        params: [scopeFilter.value],
        needsEmployeeJoin: true
      };
      
    default:
      console.error(`[leaveScopeService] Unknown scope type: ${scopeFilter.type}`);
      return { whereClause: '1=0', params: [], needsEmployeeJoin: false };
  }
}

/**
 * Check if user can access a specific leave request
 * 
 * @param {Object} scopeFilter - From req.scopeFilter
 * @param {Object} request - Request record with employee info
 * @param {string} request.employee_uuid - Employee UUID
 * @param {string} [request.department_uuid] - Department UUID (from join)
 * @param {string} [request.branch_uuid] - Branch UUID (from join)
 * @param {string} [request.company_uuid] - Company UUID (from join)
 * @returns {boolean} True if access allowed
 */
function canAccessLeaveRequest(scopeFilter, request) {
  if (!scopeFilter || !request) {
    return false;
  }
  
  switch (scopeFilter.type) {
    case 'ALL':
      return true;
      
    case 'SELF':
      return request.employee_uuid === scopeFilter.value;
      
    case 'DEPARTMENT':
      return request.department_uuid === scopeFilter.value;
      
    case 'BRANCH':
      return request.branch_uuid === scopeFilter.value;
      
    case 'COMPANY':
      return request.company_uuid === scopeFilter.value;
      
    default:
      return false;
  }
}

/**
 * Build complete SELECT query for leave requests with scope filtering
 * 
 * @param {Object} scopeFilter - From req.scopeFilter
 * @param {Object} options - Query options
 * @param {string[]} [options.fields] - Fields to select
 * @param {string} [options.orderBy='r.created_at DESC'] - ORDER BY clause
 * @param {number} [options.limit] - LIMIT value
 * @param {number} [options.offset] - OFFSET value
 * @param {Object} [options.additionalWhere] - Additional WHERE conditions { clause: string, params: [] }
 * @param {boolean} [options.includeEmployeeInfo=false] - Include employee details
 * @returns {Object} { query: string, params: [] }
 */
function buildLeaveRequestQuery(scopeFilter, options = {}) {
  const {
    fields,
    orderBy = 'r.created_at DESC',
    limit,
    offset,
    additionalWhere,
    includeEmployeeInfo = false
  } = options;
  
  const { 
    whereClause: scopeClause, 
    params: scopeParams, 
    needsEmployeeJoin 
  } = buildLeaveWhereClause(scopeFilter, 'r', 'e');
  
  // Determine fields to select
  let fieldList;
  if (fields) {
    fieldList = Array.isArray(fields) ? fields.join(', ') : fields;
  } else if (includeEmployeeInfo) {
    fieldList = `
      r.*,
      e.first_name,
      e.middle_name,
      e.last_name,
      p.department_uuid,
      e.branch_uuid,
      e.company_uuid
    `;
  } else {
    fieldList = 'r.*';
  }
  
  // Build FROM clause with optional JOIN
  let fromClause = 'FROM Requests r';
  if (needsEmployeeJoin || includeEmployeeInfo) {
    fromClause += ' INNER JOIN Employees e ON r.employee_uuid = e.uuid';
  }
  
  // Combine WHERE clauses
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
    ${fromClause}
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
 * Build COUNT query for leave requests with scope filtering
 * 
 * @param {Object} scopeFilter - From req.scopeFilter
 * @param {Object} [additionalWhere] - Additional WHERE conditions { clause: string, params: [] }
 * @returns {Object} { query: string, params: [] }
 */
function buildLeaveRequestCountQuery(scopeFilter, additionalWhere = null) {
  const { 
    whereClause: scopeClause, 
    params: scopeParams, 
    needsEmployeeJoin 
  } = buildLeaveWhereClause(scopeFilter, 'r', 'e');
  
  let fromClause = 'FROM Requests r';
  if (needsEmployeeJoin) {
    fromClause += ' INNER JOIN Employees e ON r.employee_uuid = e.uuid';
  }
  
  let whereClauses = [scopeClause];
  let allParams = [...scopeParams];
  
  if (additionalWhere && additionalWhere.clause) {
    whereClauses.push(additionalWhere.clause);
    allParams = allParams.concat(additionalWhere.params || []);
  }
  
  const whereClause = whereClauses.join(' AND ');
  
  const query = `
    SELECT COUNT(*) as total
    ${fromClause}
    WHERE ${whereClause}
  `;
  
  return { query, params: allParams };
}

/**
 * Build analytics query for leave requests with scope filtering
 * 
 * @param {Object} scopeFilter - From req.scopeFilter
 * @param {Object} options - Query options
 * @param {string} options.groupBy - GROUP BY clause
 * @param {string[]} options.selectFields - Fields to select (must include aggregations)
 * @param {Object} [options.additionalWhere] - Additional WHERE conditions
 * @param {string} [options.orderBy] - ORDER BY clause
 * @param {number} [options.limit] - LIMIT value
 * @returns {Object} { query: string, params: [] }
 */
function buildLeaveAnalyticsQuery(scopeFilter, options) {
  const {
    groupBy,
    selectFields,
    additionalWhere,
    orderBy,
    limit
  } = options;
  
  if (!groupBy || !selectFields) {
    throw new Error('groupBy and selectFields are required for analytics queries');
  }
  
  const { 
    whereClause: scopeClause, 
    params: scopeParams, 
    needsEmployeeJoin 
  } = buildLeaveWhereClause(scopeFilter, 'r', 'e');
  
  const fieldList = Array.isArray(selectFields) ? selectFields.join(', ') : selectFields;
  
  let fromClause = 'FROM Requests r';
  if (needsEmployeeJoin) {
    fromClause += ' INNER JOIN Employees e ON r.employee_uuid = e.uuid';
  }
  
  let whereClauses = [scopeClause];
  let allParams = [...scopeParams];
  
  if (additionalWhere && additionalWhere.clause) {
    whereClauses.push(additionalWhere.clause);
    allParams = allParams.concat(additionalWhere.params || []);
  }
  
  const whereClause = whereClauses.join(' AND ');
  
  let query = `
    SELECT ${fieldList}
    ${fromClause}
    WHERE ${whereClause}
    GROUP BY ${groupBy}
  `;
  
  if (orderBy) {
    query += ` ORDER BY ${orderBy}`;
  }
  
  if (limit) {
    query += ` LIMIT ?`;
    allParams.push(limit);
  }
  
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
  
  if (scopeFilter.type !== 'ALL' && !scopeFilter.value) {
    return { valid: false, error: `Scope value required for ${scopeFilter.type} scope` };
  }
  
  return { valid: true };
}

/**
 * Express middleware to validate and enforce leave scope
 * Use after requireScope('leave')
 * 
 * @returns {Function} Express middleware
 */
function enforceLeaveScope() {
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
      console.error('[leaveScopeService] Scope validation failed:', validation.error);
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
  buildLeaveWhereClause,
  buildLeaveRequestQuery,
  buildLeaveRequestCountQuery,
  buildLeaveAnalyticsQuery,
  canAccessLeaveRequest,
  validateScopeFilter,
  enforceLeaveScope
};
