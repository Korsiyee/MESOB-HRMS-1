/**
 * Can Component - Permission-Based Conditional Rendering
 * 
 * Conditionally render children based on user permissions from Permit.io.
 * This component hides UI elements the user cannot access, improving UX by
 * preventing interaction with features that will be denied by the backend.
 * 
 * SECURITY NOTE: This is a UI convenience only. The backend ALWAYS enforces
 * authorization. Never rely on frontend permission checks for security.
 * 
 * @module Can
 * @see {@link usePermission} for direct hook access
 * @see PERMISSION_PATTERN_GUIDE.md for usage examples
 * 
 * @example Basic Usage - Hide button without permission
 * ```jsx
 * import { Can } from '../components/Can';
 * 
 * function EmployeesPage() {
 *   return (
 *     <Can action="create" resource="employees">
 *       <button onClick={handleCreate}>
 *         Add Employee
 *       </button>
 *     </Can>
 *   );
 * }
 * ```
 * 
 * @example Multiple Actions - Different permissions for different buttons
 * ```jsx
 * <div>
 *   <Can action="update" resource="employees">
 *     <button onClick={handleEdit}>Edit</button>
 *   </Can>
 *   
 *   <Can action="delete" resource="employees">
 *     <button onClick={handleDelete}>Delete</button>
 *   </Can>
 * </div>
 * ```
 * 
 * @example With Fallback - Show alternative content
 * ```jsx
 * <Can 
 *   action="export" 
 *   resource="reports"
 *   fallback={<p>Upgrade to export reports</p>}
 * >
 *   <button onClick={handleExport}>Export PDF</button>
 * </Can>
 * ```
 * 
 * @example Common Pitfall - Don't check permission too late
 * ```jsx
 * // WRONG - User can fill form before discovering they lack permission
 * function CreateModal() {
 *   const { allowed } = usePermission('create', 'employees');
 *   const handleSubmit = () => {
 *     if (!allowed) return alert('No permission');
 *     // submit...
 *   };
 *   return <form onSubmit={handleSubmit}>...</form>;
 * }
 * 
 * // RIGHT - Check permission before showing form
 * function CreateModal() {
 *   return (
 *     <Can action="create" resource="employees">
 *       <form onSubmit={handleSubmit}>...</form>
 *     </Can>
 *   );
 * }
 * ```
 */

import { usePermission } from '../hooks/usePermission';

/**
 * Conditional rendering component based on permissions
 * 
 * @param {Object} props
 * @param {string} props.action - Action to check (e.g., 'view', 'create', 'update', 'delete', 'export')
 * @param {string} props.resource - Resource to check (e.g., 'employees', 'departments', 'positions')
 * @param {React.ReactNode} props.children - Content to render if permission is allowed
 * @param {React.ReactNode} [props.fallback=null] - Content to render if permission is denied
 * @param {React.ReactNode} [props.loading=null] - Content to render while checking permission
 * @param {boolean} [props.showLoading=false] - Whether to show loading state (false prevents flickering)
 * 
 * @returns {React.ReactNode} Children if allowed, fallback if denied, loading if checking, or null
 * 
 * @example Real-world example from EmployeesPage
 * ```jsx
 * // Edit button - only visible with update permission
 * <Can action="update" resource="employees">
 *   <button 
 *     onClick={() => setEditEmployee(emp)}
 *     title="Edit Employee"
 *     style={{ color: '#2563eb' }}
 *   >
 *     <Pencil size={14} />
 *   </button>
 * </Can>
 * ```
 * 
 * @example Export buttons from EmployeesPage
 * ```jsx
 * <Can action="export" resource="employees">
 *   <button onClick={handleExportCSV}>
 *     <Download size={14} /> CSV
 *   </button>
 * </Can>
 * <Can action="export" resource="employees">
 *   <button onClick={handleExportPDF}>
 *     <FileText size={14} /> PDF
 *   </button>
 * </Can>
 * ```
 */
export function Can({ 
  action, 
  resource, 
  children, 
  fallback = null, 
  loading: loadingContent = null,
  showLoading = false 
}) {
  const { allowed, loading } = usePermission(action, resource);

  // Show loading state if enabled (disabled by default to prevent flickering)
  if (loading && showLoading) {
    return loadingContent;
  }

  // Hide while loading (default behavior - prevents UI flicker)
  if (loading) {
    return null;
  }

  // Show children if allowed, otherwise show fallback
  return allowed ? children : fallback;
}

/**
 * Can with ANY logic - Show if user has ANY of the specified permissions (OR)
 * 
 * Useful when an action requires one of several permissions.
 * 
 * @param {Object} props
 * @param {Array<{action: string, resource: string}>} props.permissions - Array of permission objects to check
 * @param {React.ReactNode} props.children - Content to render if any permission is allowed
 * @param {React.ReactNode} [props.fallback=null] - Content to render if no permissions allowed
 * @param {React.ReactNode} [props.loading=null] - Content to render while checking
 * @param {boolean} [props.showLoading=false] - Whether to show loading state
 * 
 * @example Dashboard widget visible to users with any department view permission
 * ```jsx
 * <CanAny permissions={[
 *   { action: 'view', resource: 'employees' },
 *   { action: 'view', resource: 'attendance' },
 *   { action: 'view', resource: 'leave' }
 * ]}>
 *   <DashboardWidget />
 * </CanAny>
 * ```
 * 
 * @example Manage button for users who can create OR update
 * ```jsx
 * <CanAny permissions={[
 *   { action: 'create', resource: 'employees' },
 *   { action: 'update', resource: 'employees' }
 * ]}>
 *   <button onClick={openManageDialog}>Manage Employees</button>
 * </CanAny>
 * ```
 */
export function CanAny({ permissions, children, fallback = null, loading: loadingContent = null, showLoading = false }) {
  const { useAnyPermission } = require('../hooks/usePermission');
  const { allowed, loading } = useAnyPermission(permissions);

  if (loading && showLoading) {
    return loadingContent;
  }

  if (loading) {
    return null;
  }

  return allowed ? children : fallback;
}

/**
 * Can with ALL logic - Show if user has ALL of the specified permissions (AND)
 * 
 * Useful when an action requires multiple permissions.
 * 
 * @param {Object} props
 * @param {Array<{action: string, resource: string}>} props.permissions - Array of permission objects to check
 * @param {React.ReactNode} props.children - Content to render if all permissions allowed
 * @param {React.ReactNode} [props.fallback=null] - Content to render if any permission denied
 * @param {React.ReactNode} [props.loading=null] - Content to render while checking
 * @param {boolean} [props.showLoading=false] - Whether to show loading state
 * 
 * @example Create employee with account (requires both permissions)
 * ```jsx
 * <CanAll permissions={[
 *   { action: 'create', resource: 'employees' },
 *   { action: 'create', resource: 'accounts' }
 * ]}>
 *   <button onClick={createEmployeeWithAccount}>
 *     Create Employee + Account
 *   </button>
 * </CanAll>
 * ```
 * 
 * @example Admin-only bulk operation
 * ```jsx
 * <CanAll permissions={[
 *   { action: 'update', resource: 'employees' },
 *   { action: 'update', resource: 'departments' },
 *   { action: 'export', resource: 'employees' }
 * ]}>
 *   <button onClick={bulkReassign}>Bulk Reassign Employees</button>
 * </CanAll>
 * ```
 */
export function CanAll({ permissions, children, fallback = null, loading: loadingContent = null, showLoading = false }) {
  const { useAllPermissions } = require('../hooks/usePermission');
  const { allowed, loading } = useAllPermissions(permissions);

  if (loading && showLoading) {
    return loadingContent;
  }

  if (loading) {
    return null;
  }

  return allowed ? children : fallback;
}

/**
 * Inverted Can - Show if user does NOT have permission
 * 
 * Useful for showing "upgrade" messages or alternative UI to users
 * who lack specific permissions.
 * 
 * @param {Object} props
 * @param {string} props.action - Action to check
 * @param {string} props.resource - Resource to check
 * @param {React.ReactNode} props.children - Content to render if permission is DENIED
 * @param {React.ReactNode} [props.fallback=null] - Content to render if permission is ALLOWED
 * 
 * @example Upgrade message for users without export permission
 * ```jsx
 * <Cannot action="export" resource="reports">
 *   <div className="upgrade-banner">
 *     <p>Upgrade to Pro to export reports</p>
 *     <button>Upgrade Now</button>
 *   </div>
 * </Cannot>
 * ```
 * 
 * @example Limited feature notice
 * ```jsx
 * <Cannot action="delete" resource="employees">
 *   <p style={{ color: '#888' }}>
 *     Contact your administrator for delete access
 *   </p>
 * </Cannot>
 * ```
 */
export function Cannot({ action, resource, children, fallback = null }) {
  const { allowed, loading } = usePermission(action, resource);

  // Hide while loading
  if (loading) {
    return null;
  }

  // Inverted logic - show if NOT allowed
  return !allowed ? children : fallback;
}

export default Can;
