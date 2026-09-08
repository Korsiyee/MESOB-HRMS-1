import React from 'react';
import { usePermissions } from '../hooks/usePermissions';

/**
 * Permission Guard Component
 * 
 * Conditionally renders children based on user permissions.
 * Replaces hardcoded role checks in JSX.
 * 
 * @param {Object} props
 * @param {string|string[]} props.permissions - Required permission(s)
 * @param {boolean} [props.requireAll=false] - If true, user needs ALL permissions (AND logic)
 * @param {React.ReactNode} [props.fallback=null] - Fallback content if no permission
 * @param {React.ReactNode} props.children - Content to render if permission granted
 * 
 * @example
 * <PermissionGuard permissions="employees.view">
 *   <EmployeeList />
 * </PermissionGuard>
 * 
 * @example
 * <PermissionGuard 
 *   permissions={['leave.approve', 'leave.reject']} 
 *   requireAll={false}
 * >
 *   <ApprovalButtons />
 * </PermissionGuard>
 */
export function PermissionGuard({ 
  permissions, 
  requireAll = false, 
  fallback = null, 
  children 
}) {
  const { hasPermission, hasAnyPermission, hasAllPermissions, loading } = usePermissions();
  
  // Don't render anything while loading permissions
  if (loading) return null;
  
  // Normalize permissions to array
  const permissionArray = Array.isArray(permissions) ? permissions : [permissions];
  
  // Check access based on logic
  let hasAccess = false;
  
  if (permissionArray.length === 0) {
    hasAccess = true; // No permission required
  } else if (permissionArray.length === 1) {
    hasAccess = hasPermission(permissionArray[0]);
  } else if (requireAll) {
    hasAccess = hasAllPermissions(permissionArray);
  } else {
    hasAccess = hasAnyPermission(permissionArray);
  }
  
  return hasAccess ? children : fallback;
}

/**
 * Higher-order component version of PermissionGuard
 * 
 * @param {React.Component} Component - Component to wrap
 * @param {string|string[]} permissions - Required permission(s)
 * @param {boolean} [requireAll=false] - AND logic if true
 * @returns {React.Component} Wrapped component
 * 
 * @example
 * const ProtectedEmployeeList = withPermission(EmployeeList, 'employees.view');
 */
export function withPermission(Component, permissions, requireAll = false) {
  return function PermissionWrappedComponent(props) {
    return (
      <PermissionGuard permissions={permissions} requireAll={requireAll}>
        <Component {...props} />
      </PermissionGuard>
    );
  };
}
