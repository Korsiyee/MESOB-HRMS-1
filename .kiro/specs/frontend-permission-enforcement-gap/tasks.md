# Implementation Plan

## Overview
This task list implements the frontend permission enforcement fix using the bug condition methodology. The workflow follows: 1) Explore (write tests to confirm the bug exists), 2) Preserve (write tests for non-buggy behavior), 3) Implement (apply the fix), 4) Validate (verify fix works without regressions).

---

- [ ] 1. Write bug condition exploration test
  - **Property 1: Bug Condition** - UI Controls Visible Without Permission
  - **CRITICAL**: This test MUST FAIL on unfixed code - failure confirms the bug exists
  - **DO NOT attempt to fix the test or the code when it fails**
  - **NOTE**: This test encodes the expected behavior - it will validate the fix when it passes after implementation
  - **GOAL**: Surface counterexamples that demonstrate unauthorized users see action buttons
  - **Scoped PBT Approach**: Test concrete failing cases - users without specific permissions viewing pages with action buttons
  - Test implementation details:
    - Create test user with restricted permissions (Employee role with only 'view' permissions)
    - Log in as restricted user
    - Navigate to EmployeesPage, DepartmentsPage, PositionsPage, ShiftsPage, AccountsPage
    - Assert that action buttons (Create, Edit, Delete, Export) are visible in the DOM
    - Verify buttons are clickable (not disabled)
    - Optional: Click a create button, fill form, submit, verify 403 error received
  - The test assertions should match the Expected Behavior Properties from design
  - Run test on UNFIXED code
  - **EXPECTED OUTCOME**: Test FAILS (this is correct - it proves the bug exists)
  - Document counterexamples found:
    - "Add Employee" button visible to user without 'create' permission on 'employees'
    - Edit icons visible to user without 'update' permission on 'departments'
    - Delete buttons visible to user without 'delete' permission on 'positions'
    - Export buttons visible to user without 'export' permission on 'attendance'
  - Mark task complete when test is written, run, and failure is documented
  - _Requirements: 1.1, 1.2, 1.3, 1.5_

- [ ] 2. Write preservation property tests (BEFORE implementing fix)
  - **Property 2: Preservation** - Authorized User Experience Unchanged
  - **IMPORTANT**: Follow observation-first methodology
  - Observe behavior on UNFIXED code for authorized users (users with valid permissions)
  - Write property-based tests capturing observed behavior patterns from Preservation Requirements
  - Property-based testing generates many test cases for stronger guarantees
  - Test implementation details:
    - Create test users with various permission levels (Admin, HR Manager, Department Head)
    - Log in as each authorized user
    - Navigate to all pages (EmployeesPage, DepartmentsPage, PositionsPage, etc.)
    - Observe and document which buttons/controls are visible
    - Write properties asserting:
      - Admin sees all action buttons (create, edit, delete, export)
      - HR Manager sees employee management buttons
      - Department Head sees department-specific controls
      - All buttons are enabled and clickable
      - Clicking buttons opens correct modals/forms
      - Form submissions work correctly and return expected responses
    - Verify `usePermission` hook returns expected values
    - Verify `<Can>` component in existing implementations (DashboardPage, AttendancePage) works correctly
    - Verify backend authorization continues to enforce on API calls
  - Run tests on UNFIXED code
  - **EXPECTED OUTCOME**: Tests PASS (this confirms baseline behavior to preserve)
  - Mark task complete when tests are written, run, and passing on unfixed code
  - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 3.6_

- [ ] 3. Fix frontend permission enforcement across all pages

  - [ ] 3.1 Add permission checks to EmployeesPage
    - Import Can component: `import { Can } from '../components/Can';`
    - Wrap "Add Employee" button in `<Can action="create" resource="employees">`
    - Wrap edit buttons/icons in ActionButtons component with `<Can action="update" resource="employees">`
    - Wrap status change actions in `<Can action="update" resource="employees">`
    - Wrap "Export CSV" button in `<Can action="export" resource="employees">`
    - Wrap "Export PDF" button in `<Can action="export" resource="employees">`
    - Ensure loading states don't cause layout shifts (use `showLoading={false}` by default)
    - Test page renders correctly for users with and without permissions
    - _Bug_Condition: isBugCondition(uiControl) where user lacks permission for action_
    - _Expected_Behavior: UI controls hidden/disabled when user lacks permission (Requirements 2.1, 2.2, 2.3, 2.5)_
    - _Preservation: Authorized users see all controls and full functionality (Requirements 3.1, 3.3, 3.4, 3.6)_
    - _Requirements: 1.1, 1.2, 1.3, 1.5, 2.1, 2.2, 2.3, 2.5, 3.1, 3.3, 3.4, 3.6_

  - [ ] 3.2 Add permission checks to DepartmentsPage
    - Import Can component: `import { Can } from '../components/Can';`
    - Wrap "Create Department" button in `<Can action="create" resource="departments">`
    - Wrap edit icon/button in `<Can action="update" resource="departments">`
    - Wrap delete button in `<Can action="delete" resource="departments">`
    - Ensure proper loading state handling
    - Test page with restricted user permissions
    - _Bug_Condition: isBugCondition(uiControl) where user lacks permission for action_
    - _Expected_Behavior: UI controls hidden/disabled when user lacks permission (Requirements 2.1, 2.2, 2.3, 2.5)_
    - _Preservation: Authorized users see all controls and full functionality (Requirements 3.1, 3.3, 3.4, 3.6)_
    - _Requirements: 1.1, 1.2, 1.3, 1.5, 2.1, 2.2, 2.3, 2.5, 3.1, 3.3, 3.4, 3.6_

  - [ ] 3.3 Add permission checks to PositionsPage
    - Import Can component: `import { Can } from '../components/Can';`
    - Wrap "Create Position" button in `<Can action="create" resource="positions">`
    - Wrap edit actions in `<Can action="update" resource="positions">`
    - Wrap delete actions in `<Can action="delete" resource="positions">`
    - Ensure consistent permission check pattern
    - Test with users having partial permissions
    - _Bug_Condition: isBugCondition(uiControl) where user lacks permission for action_
    - _Expected_Behavior: UI controls hidden/disabled when user lacks permission (Requirements 2.1, 2.2, 2.3, 2.5)_
    - _Preservation: Authorized users see all controls and full functionality (Requirements 3.1, 3.3, 3.4, 3.6)_
    - _Requirements: 1.1, 1.2, 1.3, 1.5, 2.1, 2.2, 2.3, 2.5, 3.1, 3.3, 3.4, 3.6_

  - [ ] 3.4 Add permission checks to ShiftsPage
    - Import Can component: `import { Can } from '../components/Can';`
    - Wrap "Create Shift" button in `<Can action="create" resource="shifts">`
    - Wrap edit actions in `<Can action="update" resource="shifts">`
    - Wrap delete actions in `<Can action="delete" resource="shifts">`
    - Apply consistent pattern from other pages
    - Verify no layout shifts during loading
    - _Bug_Condition: isBugCondition(uiControl) where user lacks permission for action_
    - _Expected_Behavior: UI controls hidden/disabled when user lacks permission (Requirements 2.1, 2.2, 2.3, 2.5)_
    - _Preservation: Authorized users see all controls and full functionality (Requirements 3.1, 3.3, 3.4, 3.6)_
    - _Requirements: 1.1, 1.2, 1.3, 1.5, 2.1, 2.2, 2.3, 2.5, 3.1, 3.3, 3.4, 3.6_

  - [ ] 3.5 Add permission checks to AccountsPage
    - Import Can component: `import { Can } from '../components/Can';`
    - Wrap "Create Account" button in `<Can action="create" resource="accounts">`
    - Wrap password reset actions in `<Can action="update" resource="accounts">`
    - Wrap delete actions in `<Can action="delete" resource="accounts">`
    - Test fail-closed behavior on permission check errors
    - Verify backend enforcement continues to work
    - _Bug_Condition: isBugCondition(uiControl) where user lacks permission for action_
    - _Expected_Behavior: UI controls hidden/disabled when user lacks permission (Requirements 2.1, 2.2, 2.3, 2.5)_
    - _Preservation: Authorized users see all controls and full functionality (Requirements 3.1, 3.3, 3.4, 3.6)_
    - _Requirements: 1.1, 1.2, 1.3, 1.5, 2.1, 2.2, 2.3, 2.5, 3.1, 3.3, 3.4, 3.6_

  - [ ] 3.6 Add permission checks to LeavePage
    - Import Can component: `import { Can } from '../components/Can';`
    - Wrap "Request Leave" button in `<Can action="create" resource="leave">`
    - Wrap approve/reject actions in `<Can action="update" resource="leave">`
    - Wrap cancel leave actions in `<Can action="delete" resource="leave">`
    - Ensure manager-specific actions are properly gated
    - Test with employee and manager roles
    - _Bug_Condition: isBugCondition(uiControl) where user lacks permission for action_
    - _Expected_Behavior: UI controls hidden/disabled when user lacks permission (Requirements 2.1, 2.2, 2.3, 2.5)_
    - _Preservation: Authorized users see all controls and full functionality (Requirements 3.1, 3.3, 3.4, 3.6)_
    - _Requirements: 1.1, 1.2, 1.3, 1.5, 2.1, 2.2, 2.3, 2.5, 3.1, 3.3, 3.4, 3.6_

  - [ ] 3.7 Add permission checks to PoliciesPage
    - Import Can component: `import { Can } from '../components/Can';`
    - Wrap "Create Policy" button in `<Can action="create" resource="policies">`
    - Wrap edit policy actions in `<Can action="update" resource="policies">`
    - Wrap delete policy actions in `<Can action="delete" resource="policies">`
    - Apply consistent pattern across all policy-related controls
    - Verify admin-only actions are properly restricted
    - _Bug_Condition: isBugCondition(uiControl) where user lacks permission for action_
    - _Expected_Behavior: UI controls hidden/disabled when user lacks permission (Requirements 2.1, 2.2, 2.3, 2.5)_
    - _Preservation: Authorized users see all controls and full functionality (Requirements 3.1, 3.3, 3.4, 3.6)_
    - _Requirements: 1.1, 1.2, 1.3, 1.5, 2.1, 2.2, 2.3, 2.5, 3.1, 3.3, 3.4, 3.6_

  - [ ] 3.8 Add permission checks to AttendancePage (if not already implemented)
    - Review existing permission implementation (page may already have checks)
    - If missing, wrap "Mark Attendance" button in `<Can action="create" resource="attendance">`
    - If missing, wrap "Export CSV" in `<Can action="export" resource="attendance">`
    - If missing, wrap "Export PDF" in `<Can action="export" resource="attendance">`
    - Ensure consistency with other pages
    - Verify existing protection continues to work
    - _Bug_Condition: isBugCondition(uiControl) where user lacks permission for action_
    - _Expected_Behavior: UI controls hidden/disabled when user lacks permission (Requirements 2.1, 2.2, 2.3, 2.5)_
    - _Preservation: Authorized users see all controls and full functionality, existing checks preserved (Requirements 3.1, 3.3, 3.4, 3.6)_
    - _Requirements: 1.1, 1.2, 1.3, 1.5, 2.1, 2.2, 2.3, 2.5, 3.1, 3.3, 3.4, 3.6_

  - [ ] 3.9 Verify bug condition exploration test now passes
    - **Property 1: Expected Behavior** - UI Controls Reflect Permissions
    - **IMPORTANT**: Re-run the SAME test from task 1 - do NOT write a new test
    - The test from task 1 encodes the expected behavior
    - When this test passes, it confirms the expected behavior is satisfied
    - Run bug condition exploration test from step 1
    - Verify that:
      - Users without 'create' permission do NOT see create buttons
      - Users without 'update' permission do NOT see edit icons
      - Users without 'delete' permission do NOT see delete buttons
      - Users without 'export' permission do NOT see export buttons
      - No 403 errors occur during normal navigation (buttons are hidden before interaction)
    - **EXPECTED OUTCOME**: Test PASSES (confirms bug is fixed)
    - Document test results and any edge cases discovered
    - _Requirements: 2.1, 2.2, 2.3, 2.5_

  - [ ] 3.10 Verify preservation tests still pass
    - **Property 2: Preservation** - Authorized User Experience Unchanged
    - **IMPORTANT**: Re-run the SAME tests from task 2 - do NOT write new tests
    - Run preservation property tests from step 2
    - Verify that:
      - Admin users see all buttons and controls exactly as before
      - HR Manager users see employee management buttons exactly as before
      - Department Head users see department controls exactly as before
      - All buttons for authorized users are enabled and functional
      - Form submissions work identically to unfixed code
      - `usePermission` hook API interface unchanged
      - `<Can>` component behavior preserved for existing uses
      - Backend authorization enforcement continues to work
      - No loading state flickering or layout shifts introduced
    - **EXPECTED OUTCOME**: Tests PASS (confirms no regressions)
    - Confirm all tests still pass after fix (no regressions)
    - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 3.6_

- [ ] 4. Create developer documentation

  - [ ] 4.1 Create PERMISSION_PATTERN_GUIDE.md
    - Document when to use permission checks (any action button, form, or menu item)
    - Provide code examples for each pattern:
      - Basic usage: `<Can action="create" resource="employees">`
      - Multiple permissions (ANY): `<CanAny permissions={[...]}/>`
      - Multiple permissions (ALL): `<CanAll permissions={[...]}/>`
      - Direct hook usage: `const { allowed, loading } = usePermission('create', 'employees')`
    - Explain fail-closed behavior and why it's important
    - Show how to handle loading states
    - Provide examples from each implemented page
    - Add to frontend documentation structure
    - _Requirements: All requirements (provides guidance for future development)_

  - [ ] 4.2 Create code review checklist
    - Create checklist for reviewing permission-gated features:
      - [ ] All action buttons wrapped in `<Can>` components
      - [ ] Correct action/resource pairs used
      - [ ] Loading states handled appropriately (no flickering)
      - [ ] Backend authorization endpoints still enforce permissions
      - [ ] Test cases include permission scenarios
    - Add checklist to project documentation
    - Share with development team
    - _Requirements: All requirements (ensures consistent implementation)_

  - [ ] 4.3 Add JSDoc examples to Can.jsx and usePermission.js
    - Enhance existing documentation with real-world examples from implemented pages
    - Add common pitfalls section (e.g., forgetting to wrap nested buttons)
    - Document testing strategies for permission-gated components
    - Add links to PERMISSION_PATTERN_GUIDE.md
    - _Requirements: All requirements (improves developer experience)_

- [ ] 5. Checkpoint - Ensure all tests pass
  - Run bug condition exploration test (task 1) - should now PASS
  - Run preservation tests (task 2) - should still PASS
  - Run any existing unit tests for `usePermission` and `<Can>`
  - Run integration tests for each updated page
  - Perform manual testing with different user roles:
    - Log in as Employee (restricted permissions) - verify buttons hidden
    - Log in as Department Head (partial permissions) - verify appropriate buttons visible
    - Log in as HR Manager (broad permissions) - verify full employee management access
    - Log in as Admin (all permissions) - verify all buttons visible
  - Test fail-closed behavior by simulating permission API errors
  - Verify no console errors or warnings
  - Verify no layout shifts or flickering during permission checks
  - Verify backend authorization continues to block unauthorized API requests
  - If any issues arise, document them and ask user for guidance
  - _Requirements: All requirements_

---

## Notes

### Permission Action/Resource Mapping

Based on the design document and existing code:

| Page | Resource | Actions |
|------|----------|---------|
| EmployeesPage | employees | create, update, view, export |
| DepartmentsPage | departments | create, update, delete, view |
| PositionsPage | positions | create, update, delete, view |
| ShiftsPage | shifts | create, update, delete, view |
| AccountsPage | accounts | create, update, delete, view |
| LeavePage | leave | create, update, delete, view |
| PoliciesPage | policies | create, update, delete, view |
| AttendancePage | attendance | create, view, export |

### Implementation Pattern Reference

```jsx
// BEFORE (buggy - button always visible)
<button onClick={handleCreate}>
  <Plus size={16} /> Create Employee
</button>

// AFTER (fixed - button only visible with permission)
import { Can } from '../components/Can';

<Can action="create" resource="employees">
  <button onClick={handleCreate}>
    <Plus size={16} /> Create Employee
  </button>
</Can>
```

### Testing Strategy Notes

- **Exploration Test (Task 1)**: Write FIRST, run on UNFIXED code, EXPECT FAILURE
- **Preservation Test (Task 2)**: Write SECOND, run on UNFIXED code, EXPECT PASS
- **Fix Validation (Task 3.9)**: Re-run exploration test after fix, EXPECT PASS
- **Regression Check (Task 3.10)**: Re-run preservation test after fix, EXPECT PASS

### Key Principles

1. **Fail-Closed**: Always deny access on permission check errors
2. **Backend Enforcement**: Frontend checks are UI convenience only, backend always enforces
3. **No Flickering**: Use `showLoading={false}` by default to prevent layout shifts
4. **Consistent Pattern**: Use `<Can>` wrapper for all permission-gated UI elements
5. **Test-Driven**: Write tests before implementing fix to validate bug exists
