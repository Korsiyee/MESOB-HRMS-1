import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';

/**
 * Permission Hook - RBAC & Module System
 * 
 * Provides unified role and permission checking for UI components.
 * Supports static modules, RBAC resource.action format, and local storage fallback.
 */
export function usePermissions() {
  const { user } = useAuth();
  const [permissions, setPermissions] = useState([]);
  const [role, setRole] = useState(null);
  const [loading, setLoading] = useState(true);
  
  useEffect(() => {
    // Resolve role from user, rbac, or localStorage
    let userRole = null;
    if (user?.role) {
      userRole = typeof user.role === 'string' ? { code: user.role, name: user.role } : user.role;
    } else if (user?.rbac?.role) {
      userRole = user.rbac.role;
    } else {
      try {
        const storedRole = localStorage.getItem('userRole');
        if (storedRole) userRole = JSON.parse(storedRole);
      } catch {}
    }
    setRole(userRole);

    // Resolve permissions/modules
    let perms = [];
    if (user?.rbac?.permissions) {
      perms = user.rbac.permissions;
    } else if (user?.modules) {
      perms = user.modules.map(m => typeof m === 'string' ? m : m.code);
    } else if (user?.permissions?.modules) {
      perms = user.permissions.modules.map(m => typeof m === 'string' ? m : m.code);
    } else if (Array.isArray(user?.permissions)) {
      perms = user.permissions;
    } else {
      try {
        const storedModules = localStorage.getItem('userModules');
        if (storedModules) {
          const parsed = JSON.parse(storedModules);
          perms = parsed.map(m => typeof m === 'string' ? m : m.code);
        }
      } catch {}
    }

    setPermissions(Array.isArray(perms) ? perms : []);
    setLoading(false);
  }, [user]);
  
  /**
   * Check if user has a specific permission or module code
   * Supports both 'NETWORK_SETTINGS' and 'NetworkSettings.View'
   */
  const hasPermission = useCallback((permissionCode) => {
    if (!permissionCode) return false;
    if (role?.code === 'SUPER_ADMIN' || role === 'SUPER_ADMIN') return true;
    if (!Array.isArray(permissions)) return false;
    const normalized = permissionCode.toUpperCase();
    if (permissions.includes(permissionCode) || permissions.includes(normalized)) {
      return true;
    }
    if (permissionCode.includes('.')) {
      const resource = permissionCode.split('.')[0].toUpperCase();
      return permissions.includes(resource);
    }
    return false;
  }, [permissions, role]);
  
  /**
   * Check if user has ANY of the specified permissions (OR logic)
   */
  const hasAnyPermission = useCallback((permissionCodes) => {
    if (!permissionCodes || permissionCodes.length === 0) return true;
    return permissionCodes.some(code => hasPermission(code));
  }, [hasPermission]);
  
  /**
   * Check if user has ALL of the specified permissions (AND logic)
   */
  const hasAllPermissions = useCallback((permissionCodes) => {
    if (!permissionCodes || permissionCodes.length === 0) return true;
    return permissionCodes.every(code => hasPermission(code));
  }, [hasPermission]);
  
  /**
   * Check if user has a specific role
   */
  const hasRole = useCallback((roleCode) => {
    const currentCode = role?.code || (typeof role === 'string' ? role : null);
    if (!currentCode) return false;
    if (roleCode === 'DEPT_HEAD' || roleCode === 'DEPARTMENT_HEAD') {
      return currentCode === 'DEPT_HEAD' || currentCode === 'DEPARTMENT_HEAD';
    }
    return currentCode === roleCode;
  }, [role]);
  
  /**
   * Check if user has ANY of the specified roles
   */
  const hasAnyRole = useCallback((roleCodes) => {
    if (!roleCodes || roleCodes.length === 0) return true;
    return roleCodes.some(code => hasRole(code));
  }, [hasRole]);
  
  /**
   * Check if user is Super Admin
   */
  const isSuperAdmin = useCallback(() => {
    return role?.code === 'SUPER_ADMIN' || role === 'SUPER_ADMIN';
  }, [role]);
  
  /**
   * Check if user is HR Admin
   */
  const isHRAdmin = useCallback(() => {
    return role?.code === 'HR_ADMIN' || role === 'HR_ADMIN';
  }, [role]);
  
  /**
   * Check if user is Department Head
   */
  const isDepartmentHead = useCallback(() => {
    const currentCode = role?.code || (typeof role === 'string' ? role : null);
    return currentCode === 'DEPT_HEAD' || currentCode === 'DEPARTMENT_HEAD';
  }, [role]);
  
  /**
   * Check if user has admin-level access (Super Admin or HR Admin)
   */
  const isAdmin = useCallback(() => {
    const currentCode = role?.code || (typeof role === 'string' ? role : null);
    return currentCode === 'SUPER_ADMIN' || currentCode === 'HR_ADMIN';
  }, [role]);
  
  /**
   * Get user's role information
   */
  const getRole = useCallback(() => {
    return role;
  }, [role]);
  
  /**
   * Get all user permissions
   */
  const getAllPermissions = useCallback(() => {
    return permissions;
  }, [permissions]);
  
  /**
   * Check if user can perform action on resource
   */
  const can = useCallback((resource, action) => {
    const permissionCode = `${resource}.${action}`;
    return hasPermission(permissionCode);
  }, [hasPermission]);
  
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

export default usePermissions;
