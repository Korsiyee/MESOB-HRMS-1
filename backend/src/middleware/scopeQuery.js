/**
 * Scope Query Helper Middleware
 * 
 * Provides utilities for building SQL WHERE clauses based on data scopes.
 * Works in conjunction with the authorize middleware's enforceScope option.
 * 
 * Usage:
 *   1. Use authorize({ permissions: 'X', enforceScope: true }) in route
 *   2. Access req.scope in controller
 *   3. Use buildScopeWhereClause() to generate SQL
 */

const rbacService = require("../services/rbacService");

/**
 * Attach scope query builder to request
 * 
 * This middleware adds a helper function to the request object that
 * controllers can use to build WHERE clauses based on the user's scope.
 * 
 * @example
 * router.get('/employees',
 *   authorize({ permissions: 'Employees.View', enforceScope: true }),
 *   attachScopeQueryBuilder,
 *   async (req, res) => {
 *     const { clause, params } = req.buildScopeWhere('e');
 *     const query = `SELECT * FROM Employees e WHERE ${clause}`;
 *     const [employees] = await executeQuery(query, params);
 *     // ...
 *   }
 * );
 */
function attachScopeQueryBuilder(req, res, next) {
  // Attach helper function to request
  req.buildScopeWhere = (tableAlias = 'e') => {
    if (!req.scope) {
      // No scope attached - default to no filtering (shouldn't happen)
      console.warn('[scopeQuery] No scope attached to request, defaulting to 1=1');
      return { clause: '1=1', params: [] };
    }
    
    const context = {
      userUuid: req.user?.uuid,
      employeeUuid: req.user?.employee_uuid,
      departmentUuid: req.user?.department_uuid,
      branchUuid: req.user?.branch_uuid || null,
      regionUuid: req.user?.region_uuid || null,
    };
    
    return rbacService.buildScopeWhereClause(req.scope, context, tableAlias);
  };
  
  next();
}

/**
 * Apply scope filtering to a base query
 * 
 * Helper function that can be used directly in services/controllers
 * 
 * @param {Object} scope - Scope object from rbacService.getPermissionScope()
 * @param {Object} userContext - User context (userUuid, employeeUuid, departmentUuid, etc.)
 * @param {string} baseQuery - Base SQL query
 * @param {Array} baseParams - Base query parameters
 * @param {string} tableAlias - Table alias used in query
 * @returns {Object} { query, params }
 * 
 * @example
 * const scope = await rbacService.getPermissionScope(userUuid, 'Employees.View');
 * const context = { employeeUuid, departmentUuid };
 * const { query, params } = applyScopeToQuery(
 *   scope,
 *   context,
 *   'SELECT * FROM Employees e WHERE e.is_active = ?',
 *   [true],
 *   'e'
 * );
 */
function applyScopeToQuery(scope, userContext, baseQuery, baseParams, tableAlias = 'e') {
  const { clause, params: scopeParams } = rbacService.buildScopeWhereClause(
    scope,
    userContext,
    tableAlias
  );
  
  // If base query already has WHERE, add AND
  const hasWhere = /\bWHERE\b/i.test(baseQuery);
  const connector = hasWhere ? ' AND ' : ' WHERE ';
  
  const query = baseQuery + connector + clause;
  const params = [...baseParams, ...scopeParams];
  
  return { query, params };
}

/**
 * Check if user has permission with specific scope type
 * 
 * Useful for conditional logic based on scope
 * 
 * @param {string} userUuid - User UUID
 * @param {string} permissionCode - Permission code
 * @param {string[]} allowedScopeTypes - Allowed scope types (e.g., ['ALL', 'DEPARTMENT'])
 * @returns {Promise<boolean>}
 * 
 * @example
 * const canExportAll = await hasPermissionWithScope(
 *   userUuid,
 *   'Employees.Export',
 *   ['ALL']
 * );
 */
async function hasPermissionWithScope(userUuid, permissionCode, allowedScopeTypes) {
  const hasPermission = await rbacService.hasPermission(userUuid, permissionCode);
  if (!hasPermission) {
    return false;
  }
  
  const scope = await rbacService.getPermissionScope(userUuid, permissionCode);
  return allowedScopeTypes.includes(scope.type);
}

/**
 * Middleware to require specific scope types
 * 
 * Fails if user doesn't have the permission with one of the allowed scope types
 * 
 * @param {string} permissionCode - Permission code
 * @param {string[]} allowedScopeTypes - Allowed scope types
 * @returns {Function} Express middleware
 * 
 * @example
 * router.delete('/departments/:uuid',
 *   authorize({ permissions: 'Departments.Delete' }),
 *   requireScopeTypes('Departments.Delete', ['ALL']),
 *   handler
 * );
 */
function requireScopeTypes(permissionCode, allowedScopeTypes) {
  return async (req, res, next) => {
    try {
      const hasRequiredScope = await hasPermissionWithScope(
        req.user.uuid,
        permissionCode,
        allowedScopeTypes
      );
      
      if (!hasRequiredScope) {
        const scope = await rbacService.getPermissionScope(req.user.uuid, permissionCode);
        console.log(
          `[requireScopeTypes] ❌ Insufficient scope - User: ${req.user.username}, ` +
          `Permission: ${permissionCode}, Current: ${scope.type}, Required: [${allowedScopeTypes.join(', ')}]`
        );
        
        return res.status(403).json({
          success: false,
          message: 'Insufficient data access scope for this operation.',
          error: 'INSUFFICIENT_SCOPE',
          required: allowedScopeTypes,
          current: scope.type
        });
      }
      
      next();
    } catch (error) {
      console.error('[requireScopeTypes] Error:', error);
      return res.status(500).json({
        success: false,
        message: 'Scope validation failed.',
        error: 'INTERNAL_ERROR'
      });
    }
  };
}

module.exports = {
  attachScopeQueryBuilder,
  applyScopeToQuery,
  hasPermissionWithScope,
  requireScopeTypes,
};
