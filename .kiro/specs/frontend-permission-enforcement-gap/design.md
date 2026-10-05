# Frontend Permission Enforcement Gap Bugfix Design

## Overview

The HRMS application uses Permit.io for backend authorization, which correctly blocks unauthorized API requests. However, the frontend fails to hide or disable UI controls based on user permissions, creating poor UX where users can interact with forms and buttons only to receive 403 errors after submission. This bug affects all action buttons, forms, and UI controls across the application.

The fix strategy involves ensuring consistent use of the existing `usePermission` hook and `<Can>` component wrapper throughout the codebase, implementing permission checks on page load rather than only on API submission, and establishing clear patterns for developers to follow. The solution will be fail-closed (deny access by default on error) and maintain backward compatibility with existing permission checking implementations.

## Glossary

- **Bug_Condition (C)**: UI controls (buttons, forms, menu items) are displayed when the user lacks the required permission
- **Property (P)**: UI controls should be hidden or disabled when the user lacks permission, preventing wasted interaction
- **Preservation**: Existing `usePermission` hook, `<Can>` component, and backend authorization enforcement must continue to function exactly as currently implemented
- **usePermission hook**: The React hook in `frontend/src/hooks/usePermission.js` that calls `/api/auth/check-permission` to verify user permissions
- **Can component**: The React component in `frontend/src/components/Can.jsx` that conditionally renders children based on permission checks
- **Permission check**: A call to the backend API endpoint `/api/auth/check-permission?action={action}&resource={resource}` which uses Permit.io to determine access
- **Fail-closed approach**: On permission check error or timeout, default to denying access by hiding/disabling the UI control
- **Action**: The operation being performed (e.g., 'create', 'update', 'delete', 'view', 'export')
- **Resource**: The entity being acted upon (e.g., 'employees', 'attendance', 'leave', 'departments')

## Bug Details

### Bug Condition

The bug manifests when a UI component renders action buttons or forms without checking if the user has permission to perform those actions. This occurs on pages like EmployeesPage, DepartmentsPage, PositionsPage, ShiftsPage, and others where create/edit/delete buttons are rendered unconditionally.

**Formal Specification:**
```
FUNCTION isBugCondition(uiControl)
  INPUT: uiControl of type UIElement (button, form, input, menu item)
  OUTPUT: boolean
  
  RETURN uiControl.requiresPermission(action, resource)
         AND uiControl.isRendered()
         AND NOT user.hasPermission(action, resource)
         AND NOT uiControl.isWrappedInPermissionCheck()
END FUNCTION
```

### Examples

1. **Create Employee Button**: On EmployeesPage, the "Add Employee" button is always visible and clickable. A user without 'create' permission on 'employees' can click it, fill out the entire registration form, and only receive a 403 error after submission.

2. **Edit Department Form**: On DepartmentsPage, the edit icon is displayed for all users. A user without 'update' permission on 'departments' can open the edit modal, modify fields, and only discover they lack permission when clicking "Save Changes".

3. **Delete Position Button**: On PositionsPage, the delete button appears in the actions menu for all users. A user without 'delete' permission on 'positions' can click it, see the confirmation dialog, and only get a 403 error after confirming.

4. **Export Attendance Data**: On AttendancePage, the "Export CSV" and "Export PDF" buttons are visible to all users. A user without 'export' permission on 'attendance' can click the button and only receive an error after the export attempt.

## Expected Behavior

### Preservation Requirements

**Unchanged Behaviors:**
- The `usePermission(action, resource)` hook must continue to return `{ allowed, loading, error }` with the exact same API interface
- The `<Can action="..." resource="...">` component must continue to conditionally render children based on permission checks
- The backend `/api/auth/check-permission` endpoint must continue to enforce authorization using Permit.io
- Pages that already implement permission checks (DashboardPage, AttendancePage routing, ProtectedRoute) must continue to function identically
- The fail-closed behavior (deny on error) must remain the default
- Loading states must continue to prevent flickering and layout shifts

**Scope:**
All inputs that involve authorized users (users with valid permissions for the requested action) should be completely unaffected by this fix. This includes:
- Button clicks for authorized actions
- Form submissions for authorized operations  
- Navigation for authorized routes
- API requests that pass backend authorization

## Hypothesized Root Cause

Based on the code analysis, the most likely issues are:

1. **Inconsistent Hook Usage**: The `usePermission` hook exists but is only used on ~6 pages (AttendancePage, DashboardPage, RoleManagementPage, ManageLeavePage, and routing components). Most pages like EmployeesPage, DepartmentsPage, PositionsPage, ShiftsPage, and others render action buttons without any permission checks.

2. **Missing Component Wrappers**: The `<Can>` component exists but is underutilized. Action buttons are rendered directly in JSX without wrapping them in `<Can action="create" resource="employees">`, causing them to appear for all users.

3. **No Permission Checking Pattern**: Developers lack clear guidance on when and how to use permission checks, leading to inconsistent implementation across the codebase. There's no enforced pattern or code review checklist for permission-gated UI elements.

4. **Lack of Real-time Updates**: Even when permission checks are implemented, they only run on component mount. If permissions change in Permit.io (e.g., admin removes a user's role), the frontend doesn't detect this until the user manually refreshes or navigates to a new page.

## Correctness Properties

Property 1: Bug Condition - UI Controls Reflect Permissions

_For any_ UI control (button, form, menu item) that requires a specific permission (action, resource), the frontend SHALL check the user's permission on page load and hide or disable the control if the user lacks permission, preventing interaction before API submission.

**Validates: Requirements 2.1, 2.2, 2.3, 2.5**

Property 2: Preservation - Authorized User Experience

_For any_ user with valid permissions for an action, the frontend SHALL display and enable all relevant UI controls exactly as currently implemented, maintaining full functionality for authorized users without any behavioral changes.

**Validates: Requirements 3.1, 3.2, 3.3, 3.4, 3.5, 3.6**

## Fix Implementation

### Changes Required

Assuming our root cause analysis is correct:

**Primary Changes**: Update UI components to wrap permission-gated controls

1. **EmployeesPage** (`frontend/src/pages/EmployeesPage.jsx`):
   - Wrap "Add Employee" button in `<Can action="create" resource="employees">`
   - Wrap edit actions in `<Can action="update" resource="employees">`
   - Wrap status change actions in `<Can action="update" resource="employees">`
   - Wrap export buttons in `<Can action="export" resource="employees">`

2. **DepartmentsPage** (`frontend/src/pages/DepartmentsPage.jsx`):
   - Wrap "Create Department" button in `<Can action="create" resource="departments">`
   - Wrap edit icon in `<Can action="update" resource="departments">`
   - Wrap delete button in `<Can action="delete" resource="departments">`

3. **PositionsPage** (`frontend/src/pages/PositionsPage.jsx`):
   - Wrap "Create Position" button in `<Can action="create" resource="positions">`
   - Wrap edit actions in `<Can action="update" resource="positions">`
   - Wrap delete actions in `<Can action="delete" resource="positions">`

4. **ShiftsPage** (`frontend/src/pages/ShiftsPage.jsx`):
   - Wrap "Create Shift" button in `<Can action="create" resource="shifts">`
   - Wrap edit actions in `<Can action="update" resource="shifts">`
   - Wrap delete actions in `<Can action="delete" resource="shifts">`

5. **AccountsPage** (`frontend/src/pages/AccountsPage.jsx`):
   - Wrap "Create Account" button in `<Can action="create" resource="accounts">`
   - Wrap password reset in `<Can action="update" resource="accounts">`
   - Wrap delete actions in `<Can action="delete" resource="accounts">`

6. **Other Pages**: Apply similar pattern to all pages with action buttons (LeavePage, PoliciesPage, etc.)

**Secondary Changes**: Improve permission checking infrastructure

7. **Enhanced Permission Context** (Optional): Consider adding a global permission cache in AuthContext to reduce redundant API calls and improve performance

8. **Developer Documentation**: Create a code pattern guide explaining when and how to use `<Can>` components and `usePermission` hooks

9. **Permission Refresh Strategy**: Implement automatic permission re-checking on navigation or add a polling mechanism (optional, may not be needed for MVP)

### Implementation Pattern

For every action button or form, follow this pattern:

```jsx
// BEFORE (buggy - button always visible)
<button onClick={handleCreate}>
  <Plus size={16} /> Create Employee
</button>

// AFTER (fixed - button only visible with permission)
<Can action="create" resource="employees">
  <button onClick={handleCreate}>
    <Plus size={16} /> Create Employee
  </button>
</Can>
```

For complex scenarios with multiple permission levels:

```jsx
// Show button only if user has create OR update permission
<CanAny permissions={[
  { action: 'create', resource: 'employees' },
  { action: 'update', resource: 'employees' }
]}>
  <button>Manage Employees</button>
</CanAny>

// Show button only if user has BOTH permissions
<CanAll permissions={[
  { action: 'create', resource: 'employees' },
  { action: 'create', resource: 'accounts' }
]}>
  <button>Create Employee with Account</button>
</CanAll>
```

## Testing Strategy

### Validation Approach

The testing strategy follows a two-phase approach: first, surface counterexamples that demonstrate the bug on unfixed code by verifying buttons appear for unauthorized users, then verify the fix correctly hides/disables those buttons and preserves functionality for authorized users.

### Exploratory Bug Condition Checking

**Goal**: Surface counterexamples that demonstrate the bug BEFORE implementing the fix. Confirm that UI controls are displayed to users without permission. If we cannot reproduce the bug, we will need to re-hypothesize.

**Test Plan**: Create test accounts with restricted permissions (e.g., "Employee" role with only view permissions), log in, navigate to various pages, and observe that action buttons are visible and clickable despite lacking permission. Run these tests on the UNFIXED code to observe failures and confirm the root cause.

**Test Cases**:
1. **Create Button Visibility Test**: Log in as user without 'create' permission on 'employees', navigate to EmployeesPage, verify "Add Employee" button is visible (will fail on unfixed code - button should be hidden but is visible)
2. **Edit Button Visibility Test**: Log in as user without 'update' permission on 'departments', navigate to DepartmentsPage, verify edit icons are visible and clickable (will fail on unfixed code)
3. **Delete Button Visibility Test**: Log in as user without 'delete' permission on 'positions', navigate to PositionsPage, verify delete buttons appear in action menus (will fail on unfixed code)
4. **Export Button Visibility Test**: Log in as user without 'export' permission on 'attendance', navigate to AttendancePage, verify export buttons are visible (will fail on unfixed code)
5. **Form Interaction Test**: Click a create button as unauthorized user, fill form completely, attempt submission, verify 403 error is received (will demonstrate poor UX on unfixed code)

**Expected Counterexamples**:
- UI controls (buttons, forms, menu items) are displayed to users without required permissions
- Users can interact with controls, fill forms, and only receive errors after submission
- Possible causes: missing `<Can>` wrappers, missing `usePermission` hook calls, no permission checks in component render logic

### Fix Checking

**Goal**: Verify that for all inputs where the bug condition holds (user lacks permission), the fixed code hides or disables the UI control.

**Pseudocode:**
```
FOR ALL uiControl WHERE isBugCondition(uiControl) DO
  user := createUserWithoutPermission(uiControl.action, uiControl.resource)
  render(pageContaining(uiControl))
  ASSERT uiControl.isHidden() OR uiControl.isDisabled()
  ASSERT NOT user.canInteract(uiControl)
END FOR
```

**Test Plan**: For each fixed page, create users with various permission restrictions, log in, and verify that:
- Action buttons are hidden when permission is lacking
- No error messages appear on page load (fail-closed is silent)
- No layout shifts occur from loading states (use proper loading handling)

**Test Cases**:
1. **Create Permission Test**: User without 'create' on 'employees' sees no "Add Employee" button
2. **Update Permission Test**: User without 'update' on 'departments' sees no edit icons
3. **Delete Permission Test**: User without 'delete' on 'positions' sees no delete options
4. **Multiple Actions Test**: User with 'view' only sees read-only interface with no action buttons
5. **Loading State Test**: Verify no flickering or layout shifts during permission check loading

### Preservation Checking

**Goal**: Verify that for all inputs where the bug condition does NOT hold (user has permission), the fixed code produces the same result as the original code.

**Pseudocode:**
```
FOR ALL uiControl WHERE NOT isBugCondition(uiControl) DO
  user := createUserWithPermission(uiControl.action, uiControl.resource)
  render(pageContaining(uiControl))
  ASSERT uiControl.isVisible()
  ASSERT uiControl.isEnabled()
  ASSERT user.canInteract(uiControl)
  ASSERT originalBehavior(uiControl) = fixedBehavior(uiControl)
END FOR
```

**Testing Approach**: Property-based testing is recommended for preservation checking because:
- It generates many test cases automatically across the input domain (different users, roles, permissions)
- It catches edge cases that manual unit tests might miss (combinations of permissions)
- It provides strong guarantees that behavior is unchanged for all authorized users

**Test Plan**: Observe behavior on UNFIXED code first for authorized users (admin, HR, department heads), document exact button visibility and interaction patterns, then write property-based tests capturing that behavior.

**Test Cases**:
1. **Admin Full Access Preservation**: Admin user sees all buttons and forms on all pages exactly as before
2. **HR Manager Access Preservation**: HR manager sees employee management buttons exactly as before
3. **Department Head Access Preservation**: Department head sees department-specific controls exactly as before
4. **Button Click Preservation**: Clicking enabled buttons triggers the same modals, forms, and actions as before
5. **Form Submission Preservation**: Submitting forms with permission works exactly as before
6. **Backend Enforcement Preservation**: Backend continues to enforce authorization and returns 403 for unauthorized requests regardless of frontend state

### Unit Tests

- Test `usePermission` hook with various action/resource combinations
- Test `<Can>` component renders children when allowed, hides when not allowed
- Test loading states do not cause flickering
- Test fail-closed behavior on API error
- Test each page's permission-gated controls with mock permission responses

### Property-Based Tests

- Generate random user/role combinations and verify UI controls match expected permission state
- Generate random navigation sequences and verify permission checks occur on each page load
- Test many permission change scenarios and verify UI updates appropriately

### Integration Tests

- Test full user journey: login as restricted user, navigate pages, verify appropriate controls visible
- Test admin journey: login as admin, verify all controls visible and functional
- Test permission boundary: user with only 'view' permission sees read-only interface
- Test backend enforcement: attempt direct API calls when frontend blocks UI, verify 403 responses
