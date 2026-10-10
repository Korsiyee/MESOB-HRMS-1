/**
 * useModulePermissions Hook
 * 
 * React hook for accessing module-level permissions
 * Provides an easy way to check permissions in components
 */

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import modulePermissionService from '../services/modulePermissionService';

/**
 * Hook to access user's module permissions
 * 
 * @returns {Object} Permission utilities
 * 
 * @example
 * const { hasModule, hasAnyModule, getScope, loading } = useModulePermissions();
 * 
 * if (hasModule('EMPLOYEES')) {
 *   // User has access to Employees module
 * }
 */
export function useModulePermissions() {
  const { user, isAuthenticated } = useAuth();
  const [permissions, setPermissions] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Fetch permissions on mount or when user changes
  useEffect(() => {
    let cancelled = false;

    async function fetchPermissions() {
      if (!isAuthenticated || !user) {
        setPermissions(null);
        setLoading(false);
        return;
      }

      // Check if permissions are in auth context (from login or /auth/me)
      if (user.permissions && user.permissions.modules) {
        setPermissions(user.permissions);
        setLoading(false);
        return;
      }

      if (user.modules) {
        setPermissions({
          modules: user.modules,
          role: user.role,
          dashboard: user.dashboard,
        });
        setLoading(false);
        return;
      }

      // Otherwise fetch from API
      try {
        setLoading(true);
        const perms = await modulePermissionService.getUserPermissions();
        
        if (!cancelled) {
          setPermissions(perms);
          setError(null);
        }
      } catch (err) {
        if (!cancelled) {
          console.error('[useModulePermissions] Failed to fetch permissions:', err);
          setError(err);
          setPermissions(null);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    fetchPermissions();

    return () => {
      cancelled = true;
    };
  }, [isAuthenticated, user]);

  /**
   * Check if user has access to a specific module
   * @param {string} moduleCode - Module code
   * @returns {boolean}
   */
  const hasModule = useCallback((moduleCode) => {
    return !!modulePermissionService.hasModuleAccess(moduleCode, permissions);
  }, [permissions]);

  /**
   * Check if user has access to any of the specified modules
   * @param {string[]} moduleCodes - Array of module codes
   * @returns {boolean}
   */
  const hasAnyModule = useCallback((moduleCodes) => {
    return modulePermissionService.hasAnyModuleAccess(moduleCodes, permissions);
  }, [permissions]);

  /**
   * Get user's scope for a specific module
   * @param {string} moduleCode - Module code
   * @returns {string|null} Scope code or null
   */
  const getScope = useCallback((moduleCode) => {
    return modulePermissionService.getModuleScope(moduleCode, permissions);
  }, [permissions]);

  /**
   * Check if user has organization-wide access
   * @returns {boolean}
   */
  const hasOrgScope = useCallback(() => {
    return modulePermissionService.hasOrganizationScope(permissions);
  }, [permissions]);

  /**
   * Check if user has department-level access
   * @returns {boolean}
   */
  const hasDeptScope = useCallback(() => {
    return modulePermissionService.hasDepartmentScope(permissions);
  }, [permissions]);

  /**
   * Get all accessible modules
   * @returns {string[]} Array of module codes
   */
  const getModules = useCallback(() => {
    return modulePermissionService.getAccessibleModules(permissions);
  }, [permissions]);

  /**
   * Get role information
   * @returns {Object|null} Role object
   */
  const getRole = useCallback(() => {
    return permissions?.role || null;
  }, [permissions]);

  /**
   * Get default scope
   * @returns {Object|null} Default scope object
   */
  const getDefaultScope = useCallback(() => {
    return permissions?.defaultScope || null;
  }, [permissions]);

  return {
    permissions,
    loading,
    error,
    hasModule,
    hasAnyModule,
    getScope,
    hasOrgScope,
    hasDeptScope,
    getModules,
    getRole,
    getDefaultScope
  };
}

export default useModulePermissions;
