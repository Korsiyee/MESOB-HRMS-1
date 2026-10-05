# Bugfix Requirements Document

## Introduction

The HRMS application has integrated Permit.io for role-based access control (RBAC). While backend authorization enforcement works correctly by blocking unauthorized API requests, the frontend UI does not reflect permission changes in real-time. This creates a poor user experience where users can interact with forms and buttons for actions they don't have permission to perform, only to receive authorization errors after attempting submission.

**Impact:** Users waste time filling out forms that will be rejected, experience confusion about their actual capabilities, and the system appears unresponsive to permission changes made by administrators.

**Scope:** This bug affects all frontend pages and components that display action buttons, forms, or UI controls that require specific permissions (create, update, delete operations across employees, attendance, leave, policies, departments, etc.).

## Bug Analysis

### Current Behavior (Defect)

1.1 WHEN a user's role has a permission removed in Permit.io (e.g., "create" permission on "employees" resource) THEN the frontend continues to display all create buttons, forms, and input controls for that resource without any visual indication of restricted access

1.2 WHEN a permission-restricted user clicks an action button or submits a form THEN the user can complete the entire form interaction before receiving a 403 Forbidden error from the backend API

1.3 WHEN a user lacks permission for a specific action THEN UI controls (buttons, menu items, form sections) remain fully visible and interactive until form submission

1.4 WHEN permission changes are made in Permit.io by an administrator THEN the frontend does not reactively update to reflect the new permission state until the user manually refreshes the page or logs out and back in

1.5 WHEN a page with multiple action types loads (e.g., view, create, edit, delete) THEN no permission checks occur on page load to conditionally render UI elements based on the user's actual permissions

### Expected Behavior (Correct)

2.1 WHEN a user's role has a permission removed in Permit.io THEN the frontend SHALL immediately hide or disable all UI controls (buttons, forms, menu items) associated with that permission without requiring a page refresh

2.2 WHEN a user lacks permission for a specific action THEN the system SHALL prevent form interaction entirely by hiding the create/edit buttons or disabling form inputs before the user can attempt submission

2.3 WHEN a page with permission-gated actions loads THEN the system SHALL check the user's permissions for each action type (view, create, update, delete) and conditionally render only the UI controls the user is authorized to use

2.4 WHEN permission state changes in Permit.io THEN the frontend SHALL detect and reflect these changes within a reasonable timeframe (immediately on navigation, or through periodic refresh)

2.5 WHEN a permission check fails or is unavailable THEN the system SHALL default to a secure state by hiding/disabling the UI control (fail-closed approach)

### Unchanged Behavior (Regression Prevention)

3.1 WHEN a user has valid permissions for an action THEN the system SHALL CONTINUE TO display all relevant UI controls and allow full interaction as currently implemented

3.2 WHEN the backend API receives a request THEN the system SHALL CONTINUE TO enforce authorization at the API level regardless of frontend permission checks (backend remains the source of truth)

3.3 WHEN the usePermission hook already exists in the codebase THEN the system SHALL CONTINUE TO use this hook's API interface without breaking existing consumers

3.4 WHEN pages already implement permission-based routing (e.g., DashboardPage, AttendancePage, ProtectedRoute) THEN these implementations SHALL CONTINUE TO function correctly with the same behavior

3.5 WHEN a user navigates between pages THEN the system SHALL CONTINUE TO maintain authentication state and perform role-based route protection as currently implemented

3.6 WHEN permission checks are loading THEN the system SHALL CONTINUE TO show appropriate loading states to prevent flickering or layout shifts

