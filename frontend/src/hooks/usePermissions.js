import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';

/**
 * Permission Hook
 * 
 * Provides database-driven permission checking for UI components.
 * Replaces hardcoded role checks throughout the frontend.
 * 
 * @returns {Object} Permission checking functions and loading state
 */
export function usePermissions() {
  const { user } = useAuth();
  const [permissions, setPermissions] = useState([]);
  const [loading, setLoading] = useState(true);
  
  useEffect(() => {
    if (user?.permissions) {
      setPermissions(user.permissions);
      setLoading(false);
    } else {
      setPermissions([]);
      setLoading(false);
    }
  }, [user]);
  
  /**
   * Check if user has a specific permission
   * @param {string} permissionCode - Permission code (e.g., 'employees.view')
   * @returns {boolean}
   */
  const hasPermission = useCallback((permissionCode) => {
    return permissions.includes(permissionCode);
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
  
  return { 
    permissions, 
    hasPermission, 
    hasAnyPermission, 
    hasAllPermissions, 
    loading 
  };
}
