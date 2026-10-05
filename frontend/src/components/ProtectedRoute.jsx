/**
 * ProtectedRoute Component
 * 
 * Wrapper for React Router routes that require specific permissions.
 * Redirects to unauthorized page if user lacks permission.
 * 
 * Usage:
 *   <Route path="/employees/new" element={
 *     <ProtectedRoute action="create" resource="employees">
 *       <CreateEmployee />
 *     </ProtectedRoute>
 *   } />
 * 
 *   <Route path="/reports" element={
 *     <ProtectedRoute 
 *       action="view" 
 *       resource="reports"
 *       fallback="/dashboard"
 *     >
 *       <Reports />
 *     </ProtectedRoute>
 *   } />
 * 
 * IMPORTANT: This is a UX enhancement only.
 * The backend ALWAYS enforces authorization.
 * Users can still try to navigate directly to protected URLs.
 */

import { Navigate } from 'react-router-dom';
import { usePermission } from '../hooks/usePermission';
import { useAuth } from '../context/AuthContext';

/**
 * Route wrapper that requires specific permission
 * 
 * @param {Object} props
 * @param {string} props.action - Required action (e.g., 'view', 'create')
 * @param {string} props.resource - Required resource (e.g., 'employees', 'reports')
 * @param {React.ReactNode} props.children - Page content to render if allowed
 * @param {string} [props.fallback='/unauthorized'] - Path to redirect if not allowed
 * @param {React.ReactNode} [props.loading] - Loading component
 */
export function ProtectedRoute({ 
  action, 
  resource, 
  children, 
  fallback = '/unauthorized',
  loading: LoadingComponent = null 
}) {
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const { allowed, loading: permissionLoading } = usePermission(action, resource);

  // Wait for auth to load
  if (authLoading) {
    return LoadingComponent || <div className="flex items-center justify-center min-h-screen">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-teal-700 mx-auto"></div>
        <p className="mt-4 text-gray-600">Loading...</p>
      </div>
    </div>;
  }

  // Redirect to login if not authenticated
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  // Wait for permission check
  if (permissionLoading) {
    return LoadingComponent || <div className="flex items-center justify-center min-h-screen">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-teal-700 mx-auto"></div>
        <p className="mt-4 text-gray-600">Checking permissions...</p>
      </div>
    </div>;
  }

  // Redirect if not allowed
  if (!allowed) {
    return <Navigate to={fallback} replace />;
  }

  // Render page if allowed
  return children;
}

/**
 * Protected route that requires ANY of multiple permissions
 * 
 * @example
 * <Route path="/dashboard" element={
 *   <ProtectedRouteAny permissions={[
 *     { action: 'view', resource: 'employees' },
 *     { action: 'view', resource: 'attendance' }
 *   ]}>
 *     <Dashboard />
 *   </ProtectedRouteAny>
 * } />
 */
export function ProtectedRouteAny({ 
  permissions, 
  children, 
  fallback = '/unauthorized',
  loading: LoadingComponent = null 
}) {
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const { useAnyPermission } = require('../hooks/usePermission');
  const { allowed, loading: permissionLoading } = useAnyPermission(permissions);

  if (authLoading) {
    return LoadingComponent || <div className="flex items-center justify-center min-h-screen">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-teal-700 mx-auto"></div>
    </div>;
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (permissionLoading) {
    return LoadingComponent || <div className="flex items-center justify-center min-h-screen">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-teal-700 mx-auto"></div>
    </div>;
  }

  if (!allowed) {
    return <Navigate to={fallback} replace />;
  }

  return children;
}

/**
 * Protected route that requires ALL of multiple permissions
 * 
 * @example
 * <Route path="/admin/settings" element={
 *   <ProtectedRouteAll permissions={[
 *     { action: 'view', resource: 'settings' },
 *     { action: 'update', resource: 'settings' }
 *   ]}>
 *     <AdminSettings />
 *   </ProtectedRouteAll>
 * } />
 */
export function ProtectedRouteAll({ 
  permissions, 
  children, 
  fallback = '/unauthorized',
  loading: LoadingComponent = null 
}) {
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const { useAllPermissions } = require('../hooks/usePermission');
  const { allowed, loading: permissionLoading } = useAllPermissions(permissions);

  if (authLoading) {
    return LoadingComponent || <div className="flex items-center justify-center min-h-screen">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-teal-700 mx-auto"></div>
    </div>;
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (permissionLoading) {
    return LoadingComponent || <div className="flex items-center justify-center min-h-screen">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-teal-700 mx-auto"></div>
    </div>;
  }

  if (!allowed) {
    return <Navigate to={fallback} replace />;
  }

  return children;
}

export default ProtectedRoute;
