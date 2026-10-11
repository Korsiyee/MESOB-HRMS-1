import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';

/**
 * Permission Hook - RBAC System
 * 
 * Provides database-driven permission checking for UI components.
 * Uses the new RBAC system with Resource.Action format.
 * 
 * Features:
 * - Single permission check
 * - Multiple permission check (OR/AND logic)
 * - Role information
 * - Loading state
 * - Automatic updates when user permissions change
 * 
 * @returns {Object} Permission checking functions and user role info
 */
export function usePermissions() {
  const { user } = useAuth();
  const [permissions, setPermissions] = useState([]);
  const [role, setRole] = useState(null);
  const [loading, setLoading] = useState(true);
  
  useEffect(() => {
    if (user?.rbac) {
      // New RBAC system
      const perms = user.rbac.permissions || []; setPermissions(Array.isArray(perms) ? perms : []);
      setRole(user.rbac.role || null);
      setLoading(false);
    } else if (user?.permissions) {
      // Fallback to legacy permissions if available
      const perms = user.permissions || []; setPermissions(Array.isArray(perms) ? perms : []);
      setRole(null);
      setLoading(false);
    } else {
      setPermissions([]);
      setRole(null);
      setLoading(false);
    }
  }, [user]);
  
  /**
   * Check if user has a specific permission
   * @param {string} permissionCode - Permission code (e.g., 'Employees.View')
   * @returns {boolean}
   */
  const hasPermission = useCallback((permissionCode) => {
    if (!permissionCode) return false;
    if (!Array.isArray(permissions)) return false; return permissions.includes(permissionCode);
  }, [permissions]);
  
  /**
   * Check if user has ANY of the specified permissions (OR logic)
   * @param {string[]} permissionCodes - Array of permission codes
   * @returns {boolean}
   */
  const hasAnyPermission = useCallback((permissionCodes) => {
    if (!permissionCodes || permissionCodes.length === 0) return true;
    return permissionCodes.some(code => permissions.includes(code));
  }, [permissions]);
  
  /**
   * Check if user has ALL of the specified permissions (AND logic)
   * @param {string[]} permissionCodes - Array of permission codes
   * @returns {boolean}
   */
  const hasAllPermissions = useCallback((permissionCodes) => {
    if (!permissionCodes || permissionCodes.length === 0) return true;
    return permissionCodes.every(code => permissions.includes(code));
  }, [permissions]);
  
  /**
   * Check if user has a specific role
   * @param {string} roleCode - Role code (e.g., 'SUPER_ADMIN', 'HR_ADMIN')
   * @returns {boolean}
   */
  const hasRole = useCallback((roleCode) => {
    return role?.code === roleCode;
  }, [role]);
  
  /**
   * Check if user has ANY of the specified roles
   * @param {string[]} roleCodes - Array of role codes
   * @returns {boolean}
   */
  const hasAnyRole = useCallback((roleCodes) => {
    if (!roleCodes || roleCodes.length === 0) return true;
    return roleCodes.includes(role?.code);
  }, [role]);
  
  /**
   * Check if user is Super Admin
   * @returns {boolean}
   */
  const isSuperAdmin = useCallback(() => {
    return role?.code === 'SUPER_ADMIN';
  }, [role]);
  
  /**
   * Check if user is HR Admin
   * @returns {boolean}
   */
  const isHRAdmin = useCallback(() => {
    return role?.code === 'HR_ADMIN';
  }, [role]);
  
  /**
   * Check if user is Department Head
   * @returns {boolean}
   */
  const isDepartmentHead = useCallback(() => {
    return role?.code === 'DEPT_HEAD';
  }, [role]);
  
  /**
   * Check if user has admin-level access (Super Admin or HR Admin)
   * @returns {boolean}
   */
  const isAdmin = useCallback(() => {
    return role?.code === 'SUPER_ADMIN' || role?.code === 'HR_ADMIN';
  }, [role]);
  
  /**
   * Get user's role information
   * @returns {Object|null} Role object with code, name, hierarchy_level, etc.
   */
  const getRole = useCallback(() => {
    return role;
  }, [role]);
  
  /**
   * Get all user permissions
   * @returns {string[]} Array of permission codes
   */
  const getAllPermissions = useCallback(() => {
    return permissions;
  }, [permissions]);
  
  /**
   * Check if user can perform action on resource
   * Convenience method that constructs permission code
   * @param {string} resource - Resource name (e.g., 'Employees')
   * @param {string} action - Action name (e.g., 'View', 'Create')
   * @returns {boolean}
   */
  const can = useCallback((resource, action) => {
    const permissionCode = `${resource}.${action}`;
    return permissions.includes(permissionCode);
  }, [permissions]);
  
  return { 
    permissions, 
    role,
    hasPermission, 
    hasAnyPermission, 
    hasAllPermissions,
    hasRole,
    hasAnyRole,
    isSuperAdmin,
    isHRAdmin,
    isDepartmentHead,
    isAdmin,
    getRole,
    getAllPermissions,
    can,
    loading 
  };
}
