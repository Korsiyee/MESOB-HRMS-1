/**
 * usePermission Hook
 * 
 * Check if the current user has permission to perform an action on a resource.
 * This hook integrates with the backend Permit.io authorization system.
 * 
 * Usage:
 *   const { allowed, loading } = usePermission('view', 'employees');
 *   const { allowed: canCreate } = usePermission('create', 'employees');
 * 
 * Note: This is a frontend check for UI purposes only.
 * The backend ALWAYS enforces authorization - never trust frontend permissions.
 */

import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import apiClient from '../api/apiClient';

/**
 * Check if user has permission to perform an action on a resource
 * 
 * @param {string} action - Action to perform (e.g., 'view', 'create', 'update', 'delete')
 * @param {string} resource - Resource to act on (e.g., 'employees', 'attendance', 'leave')
 * @param {Object} options - Additional options
 * @param {boolean} options.skip - Skip the permission check (useful for conditional checks)
 * @returns {Object} { allowed: boolean, loading: boolean, error: Error|null }
 */
export function usePermission(action, resource, options = {}) {
  const { skip = false } = options;
  const { user, isAuthenticated } = useAuth();
  const [allowed, setAllowed] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    // Skip check if not authenticated or skip flag is true
    if (!isAuthenticated || skip) {
      setAllowed(false);
      setLoading(false);
      return;
    }

    // Skip check if action or resource is missing
    if (!action || !resource) {
      setAllowed(false);
      setLoading(false);
      return;
    }

    let cancelled = false;

    async function checkPermission() {
      try {
        setLoading(true);
        setError(null);

        // Call backend to check permission
        // The backend will use Permit.io to determine access
        const response = await apiClient.get('/auth/check-permission', {
          params: { action, resource }
        });

        if (!cancelled) {
          setAllowed(response.data?.allowed || false);
        }
      } catch (err) {
        if (!cancelled) {
          console.error('[usePermission] Permission check failed:', err);
          setError(err);
          // Fail closed - deny access on error
          setAllowed(false);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    checkPermission();

    return () => {
      cancelled = true;
    };
  }, [action, resource, isAuthenticated, skip, user?.uuid]);

  return { allowed, loading, error };
}

/**
 * Check if user has ANY of multiple permissions (OR logic)
 * 
 * @param {Array<{action: string, resource: string}>} permissions - Array of permission objects
 * @returns {Object} { allowed: boolean, loading: boolean, error: Error|null }
 * 
 * @example
 * const { allowed } = useAnyPermission([
 *   { action: 'view', resource: 'employees' },
 *   { action: 'view', resource: 'attendance' }
 * ]);
 */
export function useAnyPermission(permissions) {
  const { isAuthenticated } = useAuth();
  const [allowed, setAllowed] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!isAuthenticated || !permissions || permissions.length === 0) {
      setAllowed(false);
      setLoading(false);
      return;
    }

    let cancelled = false;

    async function checkPermissions() {
      try {
        setLoading(true);
        setError(null);

        // Check each permission
        const checks = await Promise.all(
          permissions.map(({ action, resource }) =>
            apiClient.get('/auth/check-permission', {
              params: { action, resource }
            })
          )
        );

        if (!cancelled) {
          // User has permission if ANY check succeeded
          const hasAny = checks.some(response => response.data?.allowed);
          setAllowed(hasAny);
        }
      } catch (err) {
        if (!cancelled) {
          console.error('[useAnyPermission] Permission check failed:', err);
          setError(err);
          setAllowed(false);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    checkPermissions();

    return () => {
      cancelled = true;
    };
  }, [JSON.stringify(permissions), isAuthenticated]);

  return { allowed, loading, error };
}

/**
 * Check if user has ALL of multiple permissions (AND logic)
 * 
 * @param {Array<{action: string, resource: string}>} permissions - Array of permission objects
 * @returns {Object} { allowed: boolean, loading: boolean, error: Error|null }
 * 
 * @example
 * const { allowed } = useAllPermissions([
 *   { action: 'create', resource: 'employees' },
 *   { action: 'create', resource: 'accounts' }
 * ]);
 */
export function useAllPermissions(permissions) {
  const { isAuthenticated } = useAuth();
  const [allowed, setAllowed] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!isAuthenticated || !permissions || permissions.length === 0) {
      setAllowed(false);
      setLoading(false);
      return;
    }

    let cancelled = false;

    async function checkPermissions() {
      try {
        setLoading(true);
        setError(null);

        // Check each permission
        const checks = await Promise.all(
          permissions.map(({ action, resource }) =>
            apiClient.get('/auth/check-permission', {
              params: { action, resource }
            })
          )
        );

        if (!cancelled) {
          // User has permission if ALL checks succeeded
          const hasAll = checks.every(response => response.data?.allowed);
          setAllowed(hasAll);
        }
      } catch (err) {
        if (!cancelled) {
          console.error('[useAllPermissions] Permission check failed:', err);
          setError(err);
          setAllowed(false);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    checkPermissions();

    return () => {
      cancelled = true;
    };
  }, [JSON.stringify(permissions), isAuthenticated]);

  return { allowed, loading, error };
}

export default usePermission;
