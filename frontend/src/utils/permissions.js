/**
 * Permission Utilities
 * 
 * Helper functions for working with permissions throughout the application
 */

/**
 * Check if array of permissions includes a specific permission
 * @param {string[]} permissions - User's permissions
 * @param {string} permissionCode - Permission to check
 * @returns {boolean}
 */
export const hasPermission = (permissions, permissionCode) => {
  if (!permissions || !Array.isArray(permissions)) return false;
  return permissions.includes(permissionCode);
};

/**
 * Check if user has ANY of the specified permissions
 * @param {string[]} permissions - User's permissions
 * @param {string[]} requiredPermissions - Required permissions
 * @returns {boolean}
 */
export const hasAnyPermission = (permissions, requiredPermissions) => {
  if (!permissions || !Array.isArray(permissions)) return false;
  if (!requiredPermissions || requiredPermissions.length === 0) return true;
  return requiredPermissions.some(perm => permissions.includes(perm));
};

/**
 * Check if user has ALL of the specified permissions
 * @param {string[]} permissions - User's permissions
 * @param {string[]} requiredPermissions - Required permissions
 * @returns {boolean}
 */
export const hasAllPermissions = (permissions, requiredPermissions) => {
  if (!permissions || !Array.isArray(permissions)) return false;
  if (!requiredPermissions || requiredPermissions.length === 0) return true;
  return requiredPermissions.every(perm => permissions.includes(perm));
};

/**
 * Group permissions by resource
 * @param {string[]|Object[]} permissions - Array of permission codes or permission objects
 * @returns {Object} Permissions grouped by resource
 * 
 * @example
 * Input: ['Employees.View', 'Employees.Create', 'Leave.View']
 * Output: {
 *   Employees: [{ permission: 'Employees.View', action: 'View' }, ...],
 *   Leave: [{ permission: 'Leave.View', action: 'View' }]
 * }
 */
export const groupPermissionsByResource = (permissions) => {
  if (!permissions || !Array.isArray(permissions)) return {};
  
  const grouped = {};
  
  permissions.forEach(permission => {
    let resource, action, permObj;
    
    // Handle both string permissions and permission objects
    if (typeof permission === 'string') {
      [resource, action] = permission.split('.');
      permObj = permission;
    } else if (permission && permission.name) {
      // Permission object with 'name' field
      [resource, action] = (permission.name || '').split('.');
      permObj = permission;
    } else if (permission && permission.resource) {
      // Permission object with separate resource and action fields
      resource = permission.resource;
      action = permission.action;
      permObj = permission;
    }
    
    if (resource && action) {
      if (!grouped[resource]) {
        grouped[resource] = [];
      }
      grouped[resource].push(typeof permObj === 'string' ? { name: permObj, action } : permObj);
    }
  });
  
  return grouped;
};

/**
 * Get all actions for a specific resource
 * @param {string[]} permissions - User's permissions
 * @param {string} resource - Resource name (e.g., 'Employees')
 * @returns {string[]} Array of actions
 * 
 * @example
 * getResourceActions(['Employees.View', 'Employees.Create'], 'Employees')
 * // Returns: ['View', 'Create']
 */
export const getResourceActions = (permissions, resource) => {
  return permissions
    .filter(perm => perm.startsWith(`${resource}.`))
    .map(perm => perm.split('.')[1]);
};

/**
 * Check if user can perform action on resource
 * @param {string[]} permissions - User's permissions
 * @param {string} resource - Resource name
 * @param {string} action - Action name
 * @returns {boolean}
 * 
 * @example
 * canPerformAction(permissions, 'Employees', 'View')
 * // Same as: hasPermission(permissions, 'Employees.View')
 */
export const canPerformAction = (permissions, resource, action) => {
  return hasPermission(permissions, `${resource}.${action}`);
};

/**
 * Filter menu items based on permissions
 * @param {Array} menuItems - Menu items array
 * @param {string[]} permissions - User's permissions
 * @returns {Array} Filtered menu items
 * 
 * Each menu item should have:
 * - requiredPermission: string or array of permission codes
 * - requireAll: boolean (for multiple permissions)
 * 
 * @example
 * const menu = [
 *   { name: 'Employees', requiredPermission: 'Employees.View' },
 *   { name: 'Leave', requiredPermission: 'Leave.View' }
 * ];
 * const filtered = filterMenuItems(menu, userPermissions);
 */
export const filterMenuItems = (menuItems, permissions) => {
  return menuItems.filter(item => {
    if (!item.requiredPermission) {
      return true; // No permission required
    }
    
    const requiredPerms = Array.isArray(item.requiredPermission)
      ? item.requiredPermission
      : [item.requiredPermission];
    
    if (item.requireAll) {
      return hasAllPermissions(permissions, requiredPerms);
    } else {
      return hasAnyPermission(permissions, requiredPerms);
    }
  });
};

/**
 * Format permission code for display
 * @param {string} permissionCode - Permission code (e.g., 'Employees.View')
 * @returns {string} Formatted permission
 * 
 * @example
 * formatPermission('Employees.View') // 'Employees - View'
 */
export const formatPermission = (permissionCode) => {
  if (!permissionCode) return '';
  const [resource, action] = permissionCode.split('.');
  return `${resource} - ${action}`;
};

/**
 * Format permission name (action only) for display
 * @param {string} action - Action name (e.g., 'View', 'Create')
 * @returns {string} Formatted action name
 * 
 * @example
 * formatPermissionName('View') // 'View'
 * formatPermissionName('CreateAndApprove') // 'Create And Approve'
 */
export const formatPermissionName = (action) => {
  if (!action) return '';
  // Add spaces before capital letters
  return action.replace(/([A-Z])/g, ' $1').trim();
};

/**
 * Get permission category color
 * @param {string} action - Action name
 * @returns {string} Tailwind color class
 */
export const getPermissionColor = (action) => {
  const colors = {
    View: 'text-blue-600 bg-blue-100',
    Create: 'text-green-600 bg-green-100',
    Update: 'text-yellow-600 bg-yellow-100',
    Delete: 'text-red-600 bg-red-100',
    Approve: 'text-purple-600 bg-purple-100',
    Reject: 'text-orange-600 bg-orange-100',
    Export: 'text-indigo-600 bg-indigo-100',
  };
  
  return colors[action] || 'text-gray-600 bg-gray-100';
};

/**
 * Check if user can access module
 * @param {string[]} permissions - User's permissions
 * @param {string} module - Module name
 * @returns {boolean}
 * 
 * User can access module if they have ANY permission for that resource
 */
export const canAccessModule = (permissions, module) => {
  return permissions.some(perm => perm.startsWith(`${module}.`));
};

/**
 * Get accessible modules
 * @param {string[]} permissions - User's permissions
 * @returns {string[]} Array of accessible module names
 * 
 * @example
 * getAccessibleModules(['Employees.View', 'Leave.Create'])
 * // Returns: ['Employees', 'Leave']
 */
export const getAccessibleModules = (permissions) => {
  const modules = new Set();
  
  permissions.forEach(permission => {
    const [resource] = permission.split('.');
    if (resource) {
      modules.add(resource);
    }
  });
  
  return Array.from(modules);
};

/**
 * Validate permission code format
 * @param {string} permissionCode - Permission code
 * @returns {boolean}
 * 
 * Valid format: Resource.Action (e.g., 'Employees.View')
 */
export const isValidPermissionCode = (permissionCode) => {
  if (!permissionCode || typeof permissionCode !== 'string') return false;
  const parts = permissionCode.split('.');
  return parts.length === 2 && parts[0].length > 0 && parts[1].length > 0;
};

/**
 * Get permission statistics
 * @param {string[]} permissions - User's permissions
 * @returns {Object} Statistics
 * 
 * @example
 * {
 *   total: 25,
 *   byResource: { Employees: 5, Leave: 3, ... },
 *   byAction: { View: 10, Create: 5, ... }
 * }
 */
export const getPermissionStats = (permissions) => {
  const byResource = {};
  const byAction = {};
  
  permissions.forEach(permission => {
    const [resource, action] = permission.split('.');
    
    if (resource && action) {
      byResource[resource] = (byResource[resource] || 0) + 1;
      byAction[action] = (byAction[action] || 0) + 1;
    }
  });
  
  return {
    total: permissions.length,
    byResource,
    byAction,
    resources: Object.keys(byResource).length,
  };
};

/**
 * Compare two permission arrays
 * @param {string[]} oldPermissions - Old permissions
 * @param {string[]} newPermissions - New permissions
 * @returns {Object} Comparison result
 * 
 * @example
 * {
 *   added: ['Employees.Delete'],
 *   removed: ['Leave.Approve'],
 *   unchanged: ['Employees.View', 'Employees.Create']
 * }
 */
export const comparePermissions = (oldPermissions, newPermissions) => {
  const oldSet = new Set(oldPermissions);
  const newSet = new Set(newPermissions);
  
  const added = newPermissions.filter(p => !oldSet.has(p));
  const removed = oldPermissions.filter(p => !newSet.has(p));
  const unchanged = newPermissions.filter(p => oldSet.has(p));
  
  return { added, removed, unchanged };
};

export default {
  hasPermission,
  hasAnyPermission,
  hasAllPermissions,
  groupPermissionsByResource,
  getResourceActions,
  canPerformAction,
  filterMenuItems,
  formatPermission,
  formatPermissionName,
  getPermissionColor,
  canAccessModule,
  getAccessibleModules,
  isValidPermissionCode,
  getPermissionStats,
  comparePermissions,
};
