# Implementation Plan: Role and Permission Management Consolidation

## Overview
This plan consolidates three duplicate Role and Permission management implementations into a single, unified Permission-based RBAC system. The implementation follows the bugfix workflow: explore the bug, preserve existing behavior, implement the fix, and validate.

---

## Tasks

- [x] 1. Write bug condition exploration test
  - **Property 1: Bug Condition** - Duplicate RBAC APIs Causing 404 and Schema Errors
  - **CRITICAL**: This test MUST FAIL on unfixed code - failure confirms the bug exists
  - **DO NOT attempt to fix the test or the code when it fails**
  - **NOTE**: This test encodes the expected behavior - it will validate the fix when it passes after implementation
  - **GOAL**: Surface counterexamples that demonstrate the bug exists
  - **Scoped PBT Approach**: Test concrete scenarios: calling duplicate endpoints, checking route registrations, verifying frontend duplication
  - Test that duplicate API endpoints exist and conflict (from Bug Condition in design):
    - `/api/module-role/roles` endpoint exists and routes to moduleRoleController
    - `/api/rbac/occupations` endpoint exists and routes to rbacController
    - Both duplicate RoleManagementPage components exist at different paths
    - Frontend routes point to different pages
  - Test expected unified behavior (from Expected Behavior Properties in design):
    - All role management requests should route to `/api/role-management/*`
    - Only one RoleManagementPage component should exist
    - Only one frontend route `/admin/roles` should be active
  - Run test on UNFIXED code
  - **EXPECTED OUTCOME**: Test FAILS (this is correct - it proves the bug exists)
  - Document counterexamples found:
    - Which duplicate endpoints are still registered
    - Which duplicate controllers/routes files exist
    - Which duplicate frontend pages exist
    - Which routes point to wrong pages
  - Mark task complete when test is written, run, and failure is documented
  - _Requirements: 1.1, 1.2, 1.3, 1.5, 2.1, 2.2, 2.3_

- [x] 2. Write preservation property tests (BEFORE implementing fix)
  - **Property 2: Preservation** - Non-RBAC Module Functionality Unchanged
  - **IMPORTANT**: Follow observation-first methodology
  - Observe behavior on UNFIXED code for non-RBAC endpoints:
    - Test Employee module endpoints (`/api/employees/*`) - list, create, update, view
    - Test Attendance module endpoints (`/api/attendance/*`) - check-in, reports
    - Test Leave module endpoints (`/api/leave/*`) - requests, approvals
    - Test Authentication endpoints (`/api/auth/*`) - login, JWT generation
    - Test authorize middleware on protected routes - permission enforcement
  - Write property-based tests capturing observed behavior patterns from Preservation Requirements:
    - For all requests to non-RBAC endpoints, response structure and status codes remain unchanged
    - For all authentication flows, JWT tokens are generated identically
    - For all permission checks via authorize middleware, enforcement logic remains unchanged
    - For all audit logging, entries are written to AuthorizationAuditLogs identically
  - Property-based testing generates many test cases for stronger guarantees
  - Run tests on UNFIXED code
  - **EXPECTED OUTCOME**: Tests PASS (this confirms baseline behavior to preserve)
  - Mark task complete when tests are written, run, and passing on unfixed code
  - _Requirements: 3.1, 3.2, 3.3, 3.4, 4.1, 4.2, 4.3, 4.4_

- [x] 3. Consolidate Role and Permission Management System

  - [x] 3.1 Remove duplicate backend controllers and routes
    - Delete `/backend/src/controllers/moduleRoleController.js` (operates on non-existent Modules/RoleModules schema)
    - Delete `/backend/src/controllers/rbacController.js` (operates on non-existent Occupations schema)
    - Delete `/backend/src/routes/moduleRoleRoutes.js` (exposes `/api/module-role/*` endpoints)
    - Delete `/backend/src/routes/rbacRoutes.js` (exposes `/api/rbac/*` endpoints)
    - _Bug_Condition: isBugCondition(request) where request.path starts with '/api/module-role/' or '/api/rbac/'_
    - _Expected_Behavior: Only unified /api/role-management/* endpoints exist (from design)_
    - _Preservation: Non-RBAC endpoints remain unchanged (from Preservation Requirements)_
    - _Requirements: 1.1, 1.2, 2.1, 2.2_

  - [x] 3.2 Update backend route registrations in app.js
    - Open `/backend/src/app.js`
    - Remove route registration for moduleRoleRoutes: `app.use('/api/module-role', moduleRoleRoutes);`
    - Remove route registration for rbacRoutes: `app.use('/api/rbac', rbacRoutes);`
    - Verify only unified route exists: `app.use('/api/role-management', roleManagementRoutes);`
    - Remove import statements for deleted route files
    - _Bug_Condition: Multiple conflicting route registrations exist_
    - _Expected_Behavior: Single unified route registration at /api/role-management_
    - _Preservation: Other route registrations remain unchanged_
    - _Requirements: 1.5, 2.3_

  - [x] 3.3 Remove duplicate frontend page
    - Delete `/frontend/src/pages/rbac/RoleManagementPage.jsx` (duplicate implementation)
    - Delete `/frontend/src/pages/rbac/` directory if it becomes empty
    - Keep `/frontend/src/pages/RoleManagementPage.jsx` as the unified implementation
    - _Bug_Condition: Two RoleManagementPage components exist at different paths_
    - _Expected_Behavior: Single RoleManagementPage component at /pages/RoleManagementPage.jsx_
    - _Preservation: Other frontend pages remain unchanged_
    - _Requirements: 2.1, 2.2, 3.1_

  - [x] 3.4 Update frontend routing configuration
    - Open frontend router configuration (likely `/frontend/src/App.jsx` or similar)
    - Remove duplicate route: `<Route path="/rbac/roles" element={<RbacRoleManagementPage />} />`
    - Verify unified route exists: `<Route path="/admin/roles" element={<RoleManagementPage />} />`
    - Update any navigation links pointing to `/rbac/roles` to point to `/admin/roles`
    - Remove import statement for deleted RbacRoleManagementPage component
    - _Bug_Condition: Multiple routes point to different RoleManagementPage implementations_
    - _Expected_Behavior: Single route /admin/roles points to unified RoleManagementPage_
    - _Preservation: Other frontend routes remain unchanged_
    - _Requirements: 2.2, 2.3, 3.1_

  - [x] 3.5 Verify frontend API service uses correct endpoints
    - Open `/frontend/src/api/roleManagementAPI.js` (or similar API service file)
    - Verify all API calls use base URL `/api/role-management/`
    - Check for any calls to `/api/module-role/` or `/api/rbac/` and update to `/api/role-management/`
    - Ensure response data structure handling matches roleManagementController responses
    - _Bug_Condition: Frontend calls wrong API endpoints causing 404 errors_
    - _Expected_Behavior: All frontend API calls use /api/role-management/* endpoints_
    - _Preservation: API services for other modules remain unchanged_
    - _Requirements: 1.5, 2.3, 2.4, 2.5_

  - [x] 3.6 Verify database schema consistency
    - Connect to the database and list existing tables
    - Confirm Permission-based RBAC tables exist:
      - `Resources` (system resources)
      - `Permissions` (granular permissions)
      - `Role_Permissions` (role-to-permission mapping)
      - `DataScopes` (data access scopes)
      - `Role_Permission_Scopes` (permission scope assignments)
    - Verify `Roles` table exists and contains system roles
    - Document any obsolete tables (Modules, RoleModules, Occupations, RoleOccupations) but do NOT drop them
    - _Bug_Condition: Database queries target non-existent tables causing SQL errors_
    - _Expected_Behavior: All role management queries target existing Permission-based RBAC tables_
    - _Preservation: Non-RBAC tables (Employees, Departments, etc.) remain unchanged_
    - _Requirements: 1.3, 1.4, 4.1, 5.1, 5.2_

  - [x] 3.7 Create unified API documentation
    - Create `/docs/API_ROLE_MANAGEMENT.md` documenting all `/api/role-management/*` endpoints
    - Document endpoints:
      - `GET /api/role-management/roles` - List all roles
      - `GET /api/role-management/roles/:uuid` - Get role details with permissions
      - `POST /api/role-management/roles` - Create new role
      - `PUT /api/role-management/roles/:uuid` - Update role
      - `DELETE /api/role-management/roles/:uuid` - Delete role
      - `GET /api/role-management/permissions` - List all permissions
      - `GET /api/role-management/scopes` - List data scopes
      - `PUT /api/role-management/roles/:uuid/permissions` - Assign/update role permissions
    - Include request/response examples for each endpoint
    - Document the Permission-based RBAC architecture (Resources → Permissions → Role_Permissions → DataScopes)
    - _Bug_Condition: No clear documentation of which endpoints to use_
    - _Expected_Behavior: Clear, comprehensive API documentation exists_
    - _Preservation: Documentation for other modules remains unchanged_
    - _Requirements: 2.3, 2.5_

  - [x] 3.8 Verify bug condition exploration test now passes
    - **Property 1: Expected Behavior** - Unified Role Management API
    - **IMPORTANT**: Re-run the SAME test from task 1 - do NOT write a new test
    - The test from task 1 encodes the expected behavior
    - When this test passes, it confirms the expected behavior is satisfied
    - Run bug condition exploration test from step 1
    - Verify:
      - Duplicate endpoints `/api/module-role/*` and `/api/rbac/*` no longer exist
      - Only `/api/role-management/*` endpoints are registered
      - Duplicate controllers and routes are deleted
      - Only one RoleManagementPage component exists
      - Only one frontend route `/admin/roles` exists
    - **EXPECTED OUTCOME**: Test PASSES (confirms bug is fixed)
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5_

  - [x] 3.9 Verify preservation tests still pass
    - **Property 2: Preservation** - Existing Module Functionality
    - **IMPORTANT**: Re-run the SAME tests from task 2 - do NOT write new tests
    - Run preservation property tests from step 2
    - Verify all non-RBAC endpoints still work:
      - Employee module endpoints return correct responses
      - Attendance module endpoints return correct responses
      - Leave module endpoints return correct responses
      - Authentication flow works identically
      - Authorize middleware enforces permissions correctly
      - Audit logging works correctly
    - **EXPECTED OUTCOME**: Tests PASS (confirms no regressions)
    - Confirm all tests still pass after consolidation (no regressions)
    - _Requirements: 3.1, 3.2, 3.3, 3.4, 4.1, 4.2, 4.3, 4.4_

- [x] 4. Integration testing and validation

  - [x] 4.1 Test unified role management UI end-to-end
    - Start the application (backend and frontend)
    - Navigate to `/admin/roles` in the browser
    - Verify the Role Management page loads without errors
    - Verify system roles display correctly in the table
    - Click "View Details" on a role and verify it navigates to `/admin/roles/:uuid`
    - Verify role details page loads with permissions displayed
    - Test creating a new role
    - Test assigning permissions to a role
    - Test updating a role
    - Test deleting a role (non-system role)
    - _Requirements: 2.1, 2.2, 2.3, 3.1, 3.2, 3.3, 4.1_

  - [x] 4.2 Test permission enforcement after consolidation
    - Log in as a user with specific role permissions
    - Attempt to access permitted resources - should succeed
    - Attempt to access non-permitted resources - should be denied
    - Verify authorize middleware correctly enforces permissions
    - Verify authorization audit logs are written correctly
    - _Requirements: 3.2, 3.3, 3.4, 4.3_

  - [x] 4.3 Verify all other modules still function correctly
    - Test Employee module: list, create, update, view employees
    - Test Department module: manage departments and hierarchies
    - Test Attendance module: check-in/out, view reports
    - Test Leave module: submit requests, approve/reject
    - Verify no regressions in any existing functionality
    - _Requirements: 3.1, 3.2, 3.3, 3.4, 4.1, 4.2, 4.3, 4.4_

- [x] 5. Checkpoint - Ensure all tests pass
  - Run all automated tests (bug condition, preservation, unit, integration)
  - Verify manual testing results are successful
  - Confirm no 404 errors, SQL errors, or data structure mismatches
  - Confirm role management functionality works end-to-end
  - Confirm all existing modules continue to function correctly
  - Document any issues found and resolve before marking complete
  - Ask the user if questions arise or issues are encountered

---

## Testing Notes

### Bug Condition Test (Property 1)
- Tests that duplicate APIs exist before fix (should FAIL)
- Tests that only unified API exists after fix (should PASS)
- Validates: Requirements 1.1, 1.2, 1.3, 1.5, 2.1, 2.2, 2.3

### Preservation Tests (Property 2)
- Tests non-RBAC endpoints before fix (baseline)
- Tests non-RBAC endpoints after fix (preservation)
- Should PASS both before and after fix
- Validates: Requirements 3.1, 3.2, 3.3, 3.4, 4.1, 4.2, 4.3, 4.4

### Rollback Plan
If consolidation causes unexpected issues:
1. Restore deleted controllers/routes from version control
2. Restore deleted frontend pages from version control
3. Restore route registrations in app.js and frontend router
4. Investigate which component was using the old endpoints
5. Create proper migration for that component
6. Re-attempt consolidation
