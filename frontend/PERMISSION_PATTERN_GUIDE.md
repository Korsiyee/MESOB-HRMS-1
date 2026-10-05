# Permission Pattern Guide

## Overview

This guide explains how to implement permission-based UI controls in the HRMS frontend application. The permission system uses the `<Can>` component and `usePermission` hook to conditionally render UI elements based on user permissions managed by Permit.io.

**IMPORTANT:** Frontend permission checks are for **UX improvement only**. The backend **always** enforces authorization. Never rely on frontend checks for security.

---

## When to Use Permission Checks

Use permission checks for **any UI element that triggers an action requiring authorization:**

✅ **Use for:**
- Create/Add buttons
- Edit/Update buttons
- Delete buttons
- Export buttons
- Approve/Reject buttons
- Status change buttons
- Any form that modifies data

❌ **Don't use for:**
- View buttons (if user can see the page, they can view)
- Navigation links (handled by route protection)
- Read-only displays
- Informational content

---

## Basic Patterns

### Pattern 1: Basic Button Permission Check

Wrap a button in the `<Can>` component:

```jsx
import { Can } from '../components/Can';

// Hide button if user lacks permission
<Can action="create" resource="employees">
  <button onClick={handleCreate}>
    <Plus size={16} /> Add Employee
  </button>
</Can>
```

**Result:** Button only appears if user has 'create' permission on 'employees' resource.

---

### Pattern 2: Multiple Buttons with Different Permissions

Wrap each button individually:

```jsx
<div style={{ display: 'flex', gap: 8 }}>
  {/* View button - always visible */}
  <button onClick={handleView}>
    <Eye size={16} /> View
  </button>
  
  {/* Edit button - only with update permission */}
  <Can action="update" resource="employees">
    <button onClick={handleEdit}>
      <Pencil size={16} /> Edit
    </button>
  </Can>
  
  {/* Delete button - only with delete permission */}
  <Can action="delete" resource="employees">
    <button onClick={handleDelete}>
      <Trash2 size={16} /> Delete
    </button>
  </Can>
</div>
```

---

### Pattern 3: Using the Hook Directly

For conditional logic or complex scenarios:

```jsx
import { usePermission } from '../hooks/usePermission';

function EmployeeForm() {
  const { allowed: canCreate, loading } = usePermission('create', 'employees');
  const { allowed: canUpdate } = usePermission('update', 'employees');
  
  if (loading) return <Spinner />;
  
  return (
    <div>
      {canCreate && (
        <button onClick={handleCreate}>Create Employee</button>
      )}
      
      {canUpdate && (
        <input name="salary" type="number" />
      )}
    </div>
  );
}
```

---

### Pattern 4: ANY Permission (OR Logic)

Show UI if user has **any** of the specified permissions:

```jsx
import { CanAny } from '../components/Can';

<CanAny permissions={[
  { action: 'create', resource: 'employees' },
  { action: 'update', resource: 'employees' }
]}>
  <button>Manage Employees</button>
</CanAny>
```

---

### Pattern 5: ALL Permissions (AND Logic)

Show UI only if user has **all** of the specified permissions:

```jsx
import { CanAll } from '../components/Can';

<CanAll permissions={[
  { action: 'create', resource: 'employees' },
  { action: 'create', resource: 'accounts' }
]}>
  <button>Create Employee with Account</button>
</CanAll>
```

---

### Pattern 6: Show Alternative Content

Display different content based on permission:

```jsx
<Can 
  action="export" 
  resource="reports"
  fallback={<p>Upgrade to Pro to export reports</p>}
>
  <button onClick={handleExport}>Export PDF</button>
</Can>
```

---

### Pattern 7: Show Loading State

Display loading indicator while checking permissions:

```jsx
<Can 
  action="create" 
  resource="employees"
  showLoading={true}
  loading={<Spinner />}
>
  <ExpensiveComponent />
</Can>
```

**Note:** By default, `showLoading` is `false` to prevent UI flickering. Only enable for slow-loading components.

---

## Action/Resource Mapping

Use these standard action/resource pairs:

| Resource | Actions | Example |
|----------|---------|---------|
| employees | view, create, update, delete, export | `<Can action="create" resource="employees">` |
| departments | view, create, update, delete | `<Can action="update" resource="departments">` |
| positions | view, create, update, delete | `<Can action="delete" resource="positions">` |
| shifts | view, create, update, delete | `<Can action="create" resource="shifts">` |
| accounts | view, create, update, delete | `<Can action="update" resource="accounts">` |
| leave | view, create, update, delete, approve_hr, approve_department | `<Can action="approve_hr" resource="leave">` |
| policies | view, create, update, delete | `<Can action="create" resource="policies">` |
| attendance | view, create, export | `<Can action="export" resource="attendance">` |

---

## Common Mistakes to Avoid

### ❌ Mistake 1: Using Permission Checks for Security

```jsx
// WRONG - Frontend checks can be bypassed
<Can action="delete" resource="employees">
  <button onClick={() => {
    // Directly calling API without backend check
    deleteEmployee(id);
  }}>
    Delete
  </button>
</Can>
```

```jsx
// CORRECT - Backend enforces authorization
<Can action="delete" resource="employees">
  <button onClick={() => {
    // API call will be blocked by backend if unauthorized
    EmployeeApi.delete(id); // Backend checks permission
  }}>
    Delete
  </button>
</Can>
```

### ❌ Mistake 2: Checking Permissions Too Late

```jsx
// WRONG - User can fill entire form before discovering they lack permission
function CreateEmployeeModal() {
  const { allowed } = usePermission('create', 'employees');
  
  const handleSubmit = () => {
    if (!allowed) {
      alert('No permission');
      return;
    }
    // Submit...
  };
  
  return <form onSubmit={handleSubmit}>...</form>;
}
```

```jsx
// CORRECT - Check permission before showing form
function CreateEmployeeModal() {
  const { allowed, loading } = usePermission('create', 'employees');
  
  if (loading) return <Spinner />;
  if (!allowed) return null; // Don't show modal at all
  
  return <form onSubmit={handleSubmit}>...</form>;
}
```

### ❌ Mistake 3: Forgetting to Import Can Component

```jsx
// WRONG - Missing import
<Can action="create" resource="employees">
  <button>Add</button>
</Can>
```

```jsx
// CORRECT
import { Can } from '../components/Can';

<Can action="create" resource="employees">
  <button>Add</button>
</Can>
```

---

## Testing Your Permission Checks

### Manual Testing

1. **Create a test user with restricted permissions** in Permit.io dashboard
2. **Log in as that user**
3. **Navigate to pages with action buttons**
4. **Verify:**
   - ✓ Buttons for disallowed actions are hidden
   - ✓ No layout shifts or flickering
   - ✓ No JavaScript errors in console
   - ✓ Backend still blocks unauthorized API calls

### Permission Test Scenarios

Test with these user permission sets:

**View-Only User:**
```
Permissions: { view: true, create: false, update: false, delete: false }
Expected: See data, no action buttons visible
```

**Editor User:**
```
Permissions: { view: true, create: true, update: true, delete: false }
Expected: See create and edit buttons, no delete buttons
```

**Admin User:**
```
Permissions: { view: true, create: true, update: true, delete: true }
Expected: See all buttons
```

---

## Fail-Closed Behavior

The permission system defaults to **denying access** in error scenarios:

```jsx
// If permission check fails (network error, timeout, etc.)
// The <Can> component returns null (hides content)
// This is SAFER than showing UI that might not work

<Can action="delete" resource="employees">
  <button>Delete</button> {/* Hidden on error */}
</Can>
```

---

## Performance Considerations

### ✅ Good: Reuse Permission Checks

```jsx
function ActionButtons() {
  const { allowed: canUpdate } = usePermission('update', 'employees');
  
  return (
    <>
      {canUpdate && <button>Edit</button>}
      {canUpdate && <button>Change Status</button>}
    </>
  );
}
```

### ❌ Avoid: Duplicate Permission Checks

```jsx
// Less efficient - makes 2 API calls for same permission
function ActionButtons() {
  return (
    <>
      <Can action="update" resource="employees">
        <button>Edit</button>
      </Can>
      <Can action="update" resource="employees">
        <button>Change Status</button>
      </Can>
    </>
  );
}
```

---

## Real-World Examples

### Example 1: Employee Management Page

```jsx
import { Can } from '../components/Can';

function EmployeesPage() {
  return (
    <div>
      <div className="header">
        <h1>Employees</h1>
        
        {/* Create button */}
        <Can action="create" resource="employees">
          <button onClick={() => setShowCreateModal(true)}>
            <Plus size={16} /> Add Employee
          </button>
        </Can>
      </div>
      
      <table>
        {employees.map(emp => (
          <tr key={emp.uuid}>
            <td>{emp.name}</td>
            <td>
              {/* View button - always visible */}
              <button onClick={() => viewEmployee(emp.uuid)}>
                <Eye size={14} /> View
              </button>
              
              {/* Edit button - requires update permission */}
              <Can action="update" resource="employees">
                <button onClick={() => editEmployee(emp.uuid)}>
                  <Pencil size={14} /> Edit
                </button>
              </Can>
              
              {/* Delete button - requires delete permission */}
              <Can action="delete" resource="employees">
                <button onClick={() => deleteEmployee(emp.uuid)}>
                  <Trash2 size={14} /> Delete
                </button>
              </Can>
            </td>
          </tr>
        ))}
      </table>
      
      {/* Export buttons */}
      <Can action="export" resource="employees">
        <div>
          <button onClick={exportCSV}>
            <Download size={16} /> Export CSV
          </button>
          <button onClick={exportPDF}>
            <FileText size={16} /> Export PDF
          </button>
        </div>
      </Can>
    </div>
  );
}
```

---

## Troubleshooting

### Issue: Buttons not appearing for authorized users

**Check:**
1. User has correct role assigned in Permit.io
2. Role has correct permissions
3. Action/resource strings match exactly (case-sensitive)
4. No JavaScript errors in console

### Issue: Permission check always fails

**Check:**
1. Backend `/api/auth/check-permission` endpoint is working
2. User is authenticated (check `localStorage.getItem('authToken')`)
3. Permit.io configuration is correct
4. Network requests succeeding (check Network tab)

### Issue: UI flickers during loading

**Solution:** Don't show loading state by default:
```jsx
// Flickering
<Can action="create" resource="employees" showLoading={true} loading={<Spinner />}>
  <button>Create</button>
</Can>

// Smooth
<Can action="create" resource="employees">
  <button>Create</button>
</Can>
```

---

## API Reference

### `<Can>` Component

```typescript
interface CanProps {
  action: string;              // e.g., 'create', 'update', 'delete'
  resource: string;            // e.g., 'employees', 'departments'
  children: React.ReactNode;   // Content to show if allowed
  fallback?: React.ReactNode;  // Content to show if not allowed
  loading?: React.ReactNode;   // Content to show while checking
  showLoading?: boolean;       // Whether to show loading state (default: false)
}
```

### `usePermission` Hook

```typescript
function usePermission(
  action: string,
  resource: string,
  options?: { skip?: boolean }
): {
  allowed: boolean;
  loading: boolean;
  error: Error | null;
}
```

---

## Further Reading

- [Can.jsx Source Code](../src/components/Can.jsx)
- [usePermission Hook Source Code](../src/hooks/usePermission.js)
- [Permit.io Documentation](https://docs.permit.io)

---

**Last Updated:** 2024-01-20  
**Maintained By:** Development Team
