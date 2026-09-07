/**
 * Account Scope Service
 * 
 * Provides safe, validated query builders for user account data access based on user scopes.
 * Prevents data leakage by enforcing scope boundaries at the service layer.
 * 
 * Supported Scopes:
 * - SELF: User's own account
 * - DEPARTMENT: Accounts for employees in user's department
 * - BRANCH: Accounts for employees in user's branch
 * - COMPANY: Accounts for employees in user's company
 * - ALL: All accounts (no filtering)
 */

const { sendError } = require("../utils/response");

/**
 * Build WHERE clause for account queries based on scope
 * Joins with Employees table to apply department/branch/company filtering
 * 
 * @param {Object} scopeFilter - From req.scopeFilter
 * @param {string} scopeFilter.type - Scope type (SELF, DEPARTMENT, BRANCH, COMPANY, ALL)
 * @param {string} [scopeFilter.value] - Scope value (UUID)
 * @param {string} [userAlias='u'] - SQL table alias for Users table
 * @param {string} [employeeAlias='e'] - SQL table alias for Employees table
 * @returns {Object} { whereClause: string, params: [], needsEmployeeJoin: boolean }
 */
function buildAccountWhereClause(scopeFilter, userAlias = 'u', employeeAlias = 'e') {
  if (!scopeFilter || !scopeFilter.type) {
    throw new Error('Scope filter is required');
  }
  
  const uPrefix = userAlias ? `${userAlias}.` : '';
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
        throw new Error('Scope value (user_uuid) required for SELF scope');
      }
      // Filter by user uuid directly in Users table
      return { 
        whereClause: `${uPrefix}uuid = ?`, 
        params: [scopeFilter.value],
        needsEmployeeJoin: false
      };
      
    case 'DEPARTMENT':
      if (!scopeFilter.value) {
        throw new Error('Scope value (department_uuid) required for DEPARTMENT scope');
      }
      // Need to join Employees via employee_uuid to get department
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
      console.error(`[accountScopeService] Unknown scope type: ${scopeFilter.type}`);
      return { whereClause: '1=0', params: [], needsEmployeeJoin: false };
  }
}

/**
 * Check if user can access a specific account
 * 
 * @param {Object} scopeFilter - From req.scopeFilter
 * @param {Object} account - User account with employee info
 * @param {string} account.uuid - User UUID
 * @param {string} [account.employee_uuid] - Employee UUID
 * @param {string} [account.department_uuid] - Department UUID (from join)
 * @param {string} [account.branch_uuid] - Branch UUID (from join)
 * @param {string} [account.company_uuid] - Company UUID (from join)
 * @returns {boolean} True if access allowed
 */
function canAccessAccount(scopeFilter, account) {
  if (!scopeFilter || !account) {
    return false;
  }
  
  switch (scopeFilter.type) {
    case 'ALL':
      return true;
      
    case 'SELF':
      return account.uuid === scopeFilter.value;
      
    case 'DEPARTMENT':
      return account.department_uuid === scopeFilter.value;
      
    case 'BRANCH':
      return account.branch_uuid === scopeFilter.value;
      
    case 'COMPANY':
      return account.company_uuid === scopeFilter.value;
      
    default:
      return false;
  }
}

/**
 * Build complete SELECT query for accounts with scope filtering
 * 
 * @param {Object} scopeFilter - From req.scopeFilter
 * @param {Object} options - Query options
 * @param {string[]} [options.fields] - Fields to select
 * @param {string} [options.orderBy='u.created_at DESC'] - ORDER BY clause
 * @param {number} [options.limit] - LIMIT value
 * @param {number} [options.offset] - OFFSET value
 * @param {Object} [options.additionalWhere] - Additional WHERE conditions { clause: string, params: [] }
 * @param {boolean} [options.includeEmployeeInfo=false] - Include employee details
 * @returns {Object} { query: string, params: [] }
 */
function buildAccountQuery(scopeFilter, options = {}) {
  const {
    fields,
    orderBy = 'u.created_at DESC',
    limit,
    offset,
    additionalWhere,
    includeEmployeeInfo = false
  } = options;
  
  const { 
    whereClause: scopeClause, 
    params: scopeParams, 
    needsEmployeeJoin 
  } = buildAccountWhereClause(scopeFilter, 'u', 'e');
  
  // Determine fields to select
  let fieldList;
  if (fields) {
    fieldList = Array.isArray(fields) ? fields.join(', ') : fields;
  } else if (includeEmployeeInfo) {
    fieldList = `
      u.*,
      e.first_name,
      e.middle_name,
      e.last_name,
      e.department_uuid,
      e.branch_uuid,
      e.company_uuid
    `;
  } else {
    fieldList = 'u.*';
  }
  
  // Build FROM clause with optional JOIN
  let fromClause = 'FROM Users u';
  if (needsEmployeeJoin || includeEmployeeInfo) {
    fromClause += ' LEFT JOIN Employees e ON u.employee_uuid = e.uuid';
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
 * Build COUNT query for accounts with scope filtering
 * 
 * @param {Object} scopeFilter - From req.scopeFilter
 * @param {Object} [additionalWhere] - Additional WHERE conditions { clause: string, params: [] }
 * @returns {Object} { query: string, params: [] }
 */
function buildAccountCountQuery(scopeFilter, additionalWhere = null) {
  const { 
    whereClause: scopeClause, 
    params: scopeParams, 
    needsEmployeeJoin 
  } = buildAccountWhereClause(scopeFilter, 'u', 'e');
  
  let fromClause = 'FROM Users u';
  if (needsEmployeeJoin) {
    fromClause += ' LEFT JOIN Employees e ON u.employee_uuid = e.uuid';
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
 * Build query for accounts by role with scope filtering
 * Useful for role-based reports and analytics
 * 
 * @param {Object} scopeFilter - From req.scopeFilter
 * @param {Object} options - Query options
 * @param {string} [options.role] - Filter by specific role
 * @param {string[]} [options.roles] - Filter by multiple roles
 * @param {Object} [options.additionalWhere] - Additional WHERE conditions
 * @returns {Object} { query: string, params: [] }
 */
function buildAccountByRoleQuery(scopeFilter, options = {}) {
  const {
    role,
    roles,
    additionalWhere
  } = options;
  
  const { 
    whereClause: scopeClause, 
    params: scopeParams, 
    needsEmployeeJoin 
  } = buildAccountWhereClause(scopeFilter, 'u', 'e');
  
  let fromClause = 'FROM Users u';
  if (needsEmployeeJoin) {
    fromClause += ' LEFT JOIN Employees e ON u.employee_uuid = e.uuid';
  }
  
  let whereClauses = [scopeClause];
  let allParams = [...scopeParams];
  
  // Add role filtering
  if (role) {
    whereClauses.push('u.role = ?');
    allParams.push(role);
  } else if (roles && Array.isArray(roles) && roles.length > 0) {
    const placeholders = roles.map(() => '?').join(', ');
    whereClauses.push(`u.role IN (${placeholders})`);
    allParams = allParams.concat(roles);
  }
  
  if (additionalWhere && additionalWhere.clause) {
    whereClauses.push(additionalWhere.clause);
    allParams = allParams.concat(additionalWhere.params || []);
  }
  
  const whereClause = whereClauses.join(' AND ');
  
  const query = `
    SELECT u.role, COUNT(*) as count
    ${fromClause}
    WHERE ${whereClause}
    GROUP BY u.role
    ORDER BY count DESC
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
  
  if (scopeFilter.type !== 'ALL' && !scopeFilter.value) {
    return { valid: false, error: `Scope value required for ${scopeFilter.type} scope` };
  }
  
  return { valid: true };
}

/**
 * Express middleware to validate and enforce account scope
 * Use after requireScope('account')
 * 
 * @returns {Function} Express middleware
 */
function enforceAccountScope() {
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
      console.error('[accountScopeService] Scope validation failed:', validation.error);
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
  buildAccountWhereClause,
  buildAccountQuery,
  buildAccountCountQuery,
  buildAccountByRoleQuery,
  canAccessAccount,
  validateScopeFilter,
  enforceAccountScope
};
