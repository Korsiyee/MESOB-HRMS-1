/**
 * Static Role-Module Mapping Configuration
 * 
 * This file defines the IMMUTABLE mapping between roles and modules.
 * These mappings are hardcoded and cannot be changed through the UI.
 * 
 * Five Static Roles:
 * - EMPLOYEE: Personal access only
 * - DEPT_HEAD: Department management + personal access
 * - HR_OFFICER: HR operations + personal access
 * - HR_ADMIN: Full HR management + personal access
 * - SUPER_ADMIN: Complete system access
 * 
 * Three Dashboards:
 * - Employee Dashboard: For EMPLOYEE role
 * - Department Dashboard: For DEPT_HEAD role
 * - HR Dashboard: For HR_OFFICER, HR_ADMIN, and SUPER_ADMIN roles
 */

/**
 * Static role-module mapping
 * Key: Role code
 * Value: Array of module codes accessible to that role
 */
const ROLE_MODULE_MAPPING = {
  // EMPLOYEE: Only personal modules
  EMPLOYEE: [
    'MY_ATTENDANCE',
    'MY_LETTERS',
    'MY_LEAVES',
    'MY_ACCOUNTS'
  ],
  
  // DEPT_HEAD: Department management + personal modules
  DEPT_HEAD: [
    'EMPLOYEE_LIST',
    'EMPLOYEE_PROFILE',
    'DEPARTMENTS',
    'POSITIONS',
    'LEVELS',
    'ATTENDANCE_RECORDS',
    'LEAVE_REQUESTS',
    'MY_ATTENDANCE',
    'MY_LETTERS',
    'MY_LEAVES',
    'MY_ACCOUNTS'
  ],
  
  // MANAGER: Department management + personal modules (alias for DEPT_HEAD)
  MANAGER: [
    'EMPLOYEE_LIST',
    'EMPLOYEE_PROFILE',
    'DEPARTMENTS',
    'POSITIONS',
    'LEVELS',
    'ATTENDANCE_RECORDS',
    'LEAVE_REQUESTS',
    'MY_ATTENDANCE',
    'MY_LETTERS',
    'MY_LEAVES',
    'MY_ACCOUNTS'
  ],
  
  // HR_OFFICER: HR operations (most HR functions except critical admin tasks)
  HR_OFFICER: [
    'EMPLOYEE_LIST',
    'EMPLOYEE_PROFILE',
    'DEPARTMENTS',
    'POSITIONS',
    'LEVELS',
    'ATTENDANCE_RECORDS',
    'SHIFTS',
    'LETTERS',
    'LEAVE_REQUESTS',
    'MY_ATTENDANCE',
    'MY_LETTERS',
    'MY_LEAVES',
    'MY_ACCOUNTS'
  ],
  
  // HR_ADMIN: Full HR management including critical functions
  HR_ADMIN: [
    'EMPLOYEE_LIST',
    'EMPLOYEE_PROFILE',
    'REGISTER_EMPLOYEE',
    'DEPARTMENTS',
    'POSITIONS',
    'LEVELS',
    'ATTENDANCE_RECORDS',
    'NETWORK_SETTINGS',
    'SHIFTS',
    'LETTERS',
    'LEAVE_REQUESTS',
    'LEAVE_SETTINGS',
    'ACCOUNTS',
    'AUDIT_LOGS',
    'MY_ATTENDANCE',
    'MY_LETTERS',
    'MY_LEAVES',
    'MY_ACCOUNTS'
  ],
  
  // SUPER_ADMIN: Complete system access (all modules)
  SUPER_ADMIN: [
    'EMPLOYEE_LIST',
    'EMPLOYEE_PROFILE',
    'REGISTER_EMPLOYEE',
    'DEPARTMENTS',
    'POSITIONS',
    'LEVELS',
    'ATTENDANCE_RECORDS',
    'NETWORK_SETTINGS',
    'SHIFTS',
    'LETTERS',
    'LEAVE_REQUESTS',
    'LEAVE_SETTINGS',
    'ACCOUNTS',
    'AUDIT_LOGS',
    'MY_ATTENDANCE',
    'MY_LETTERS',
    'MY_LEAVES',
    'MY_ACCOUNTS'
  ]
};

/**
 * Dashboard routing based on role
 */
const ROLE_DASHBOARD_MAPPING = {
  EMPLOYEE: 'employee',
  DEPT_HEAD: 'admin',
  MANAGER: 'admin',
  HR_OFFICER: 'admin',
  HR_ADMIN: 'admin',
  SUPER_ADMIN: 'admin'
};

/**
 * Role hierarchy levels (higher number = higher privileges)
 */
const ROLE_HIERARCHY = {
  EMPLOYEE: 10,
  DEPT_HEAD: 20,
  MANAGER: 20,
  HR_OFFICER: 30,
  HR_ADMIN: 40,
  SUPER_ADMIN: 50
};

/**
 * Get modules for a specific role
 * @param {string} roleCode - Role code
 * @returns {string[]} Array of module codes
 */
function getModulesForRole(roleCode) {
  return ROLE_MODULE_MAPPING[roleCode] || [];
}

/**
 * Get dashboard type for a role
 * @param {string} roleCode - Role code
 * @returns {string} Dashboard type
 */
function getDashboardForRole(roleCode) {
  return ROLE_DASHBOARD_MAPPING[roleCode] || 'employee';
}

/**
 * Check if a role has access to a specific module
 * @param {string} roleCode - Role code
 * @param {string} moduleCode - Module code
 * @returns {boolean} True if role has access to module
 */
function hasModuleAccess(roleCode, moduleCode) {
  const modules = getModulesForRole(roleCode);
  return modules.includes(moduleCode);
}

/**
 * Get all available roles
 * @returns {string[]} Array of role codes
 */
function getAllRoles() {
  return Object.keys(ROLE_MODULE_MAPPING);
}

/**
 * Get role hierarchy level
 * @param {string} roleCode - Role code
 * @returns {number} Hierarchy level
 */
function getRoleHierarchy(roleCode) {
  return ROLE_HIERARCHY[roleCode] || 0;
}

/**
 * Check if role1 can manage role2 (based on hierarchy)
 * @param {string} role1Code - Manager role code
 * @param {string} role2Code - Target role code
 * @returns {boolean} True if role1 can manage role2
 */
function canManageRole(role1Code, role2Code) {
  // Super admin can manage all
  if (role1Code === 'SUPER_ADMIN') {
    return true;
  }
  
  // HR_ADMIN can manage all except SUPER_ADMIN
  if (role1Code === 'HR_ADMIN' && role2Code !== 'SUPER_ADMIN') {
    return true;
  }
  
  // Can only manage roles with lower hierarchy
  return getRoleHierarchy(role1Code) > getRoleHierarchy(role2Code);
}

/**
 * Module categories for UI organization
 */
const MODULE_CATEGORIES = {
  HR_MANAGEMENT: [
    'EMPLOYEE_LIST',
    'EMPLOYEE_PROFILE',
    'REGISTER_EMPLOYEE',
    'DEPARTMENTS',
    'POSITIONS',
    'LEVELS',
    'ATTENDANCE_RECORDS',
    'NETWORK_SETTINGS',
    'SHIFTS',
    'LETTERS',
    'LEAVE_REQUESTS',
    'LEAVE_SETTINGS',
    'ACCOUNTS',
    'AUDIT_LOGS'
  ],
  PERSONAL: [
    'MY_ATTENDANCE',
    'MY_LETTERS',
    'MY_LEAVES',
    'MY_ACCOUNTS'
  ]
};

module.exports = {
  ROLE_MODULE_MAPPING,
  ROLE_DASHBOARD_MAPPING,
  ROLE_HIERARCHY,
  MODULE_CATEGORIES,
  getModulesForRole,
  getDashboardForRole,
  hasModuleAccess,
  getAllRoles,
  getRoleHierarchy,
  canManageRole
};
