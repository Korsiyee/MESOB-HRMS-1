import React from 'react';
import { usePermissions } from '../hooks/usePermissions';

/**
 * Permission Guard Component - RBAC System
 * 
 * Conditionally renders children based on user permissions.
 * Replaces hardcoded role checks in JSX.
 * 
 * @param {Object} props
 * @param {string|string[]} props.permissions - Required permission(s) (e.g., 'Employees.View')
 * @param {boolean} [props.requireAll=false] - If true, user needs ALL permissions (AND logic)
 * @param {React.ReactNode} [props.fallback=null] - Fallback content if no permission
 * @param {React.ReactNode} props.children - Content to render if permission granted
 * @param {boolean} [props.showFallback=false] - Whether to render fallback or nothing
 * 
 * @example
 * <PermissionGuard permissions="Employees.View">
 *   <EmployeeList />
 * </PermissionGuard>
 * 
 * @example
 * <PermissionGuard 
 *   permissions={['Leave.Approve', 'Leave.Reject']} 
 *   requireAll={false}
 * >
 *   <ApprovalButtons />
 * </PermissionGuard>
 * 
 * @example
 * <PermissionGuard
 *   permissions="Employees.Delete"
 *   fallback={<p>You don't have permission to delete employees</p>}
 *   showFallback={true}
 * >
 *   <DeleteButton />
 * </PermissionGuard>
 */
export function PermissionGuard({ 
  permissions, 
  requireAll = false, 
  fallback = null,
  showFallback = false,
  children 
}) {
  const { hasPermission, hasAnyPermission, hasAllPermissions, loading } = usePermissions();
  
  // Don't render anything while loading permissions
  if (loading) return null;
  
  // No permissions specified - render children
  if (!permissions) {
    return children;
  }
  
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
  
  if (hasAccess) {
    return children;
  }
  
  // No access - render fallback if showFallback is true
  return showFallback ? fallback : null;
}

/**
 * Role Guard Component
 * 
 * Conditionally renders children based on user role.
 * Use sparingly - prefer PermissionGuard for most cases.
 * 
 * @param {Object} props
 * @param {string|string[]} props.roles - Required role(s) (e.g., 'SUPER_ADMIN')
 * @param {boolean} [props.requireAll=false] - If true, user needs ALL roles
 * @param {React.ReactNode} [props.fallback=null] - Fallback content if no role
 * @param {React.ReactNode} props.children - Content to render if role matches
 * 
 * @example
 * <RoleGuard roles="SUPER_ADMIN">
 *   <AdminPanel />
 * </RoleGuard>
 */
export function RoleGuard({
  roles,
  requireAll = false,
  fallback = null,
  children
}) {
  const { hasRole, hasAnyRole, loading } = usePermissions();
  
  if (loading) return null;
  
  if (!roles) {
    return children;
  }
  
  const roleArray = Array.isArray(roles) ? roles : [roles];
  
  let hasAccess = false;
  
  if (roleArray.length === 0) {
    hasAccess = true;
  } else if (roleArray.length === 1) {
    hasAccess = hasRole(roleArray[0]);
  } else {
    hasAccess = hasAnyRole(roleArray);
  }
  
  return hasAccess ? children : fallback;
}

/**
 * Admin Guard Component
 * 
 * Renders children only for Super Admin or HR Admin
 * 
 * @param {Object} props
 * @param {React.ReactNode} [props.fallback=null] - Fallback content
 * @param {React.ReactNode} props.children - Content to render for admins
 * 
 * @example
 * <AdminGuard>
 *   <SystemSettings />
 * </AdminGuard>
 */
export function AdminGuard({ fallback = null, children }) {
  const { isAdmin, loading } = usePermissions();
  
  if (loading) return null;
  
  return isAdmin() ? children : fallback;
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
 * const ProtectedEmployeeList = withPermission(EmployeeList, 'Employees.View');
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

/**
 * Higher-order component version of RoleGuard
 * 
 * @param {React.Component} Component - Component to wrap
 * @param {string|string[]} roles - Required role(s)
 * @returns {React.Component} Wrapped component
 * 
 * @example
 * const AdminOnlyPage = withRole(SettingsPage, 'SUPER_ADMIN');
 */
export function withRole(Component, roles) {
  return function RoleWrappedComponent(props) {
    return (
      <RoleGuard roles={roles}>
        <Component {...props} />
      </RoleGuard>
    );
  };
}
