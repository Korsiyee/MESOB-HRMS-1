# Role Management Table Name Fix - Bugfix Design

## Overview

This bugfix addresses database table name mismatches in SQL queries throughout the HRMS backend services. The application code references tables named `RolePermissions` and `RolePermissionScopes` (CamelCase), but the actual database schema uses underscore-separated names: `Role_Permissions` and `Role_Permission_Scopes`. This mismatch causes MySQL "Table doesn't exist" errors, resulting in 500 Internal Server Errors on the Role Management page and preventing administrators from managing roles and permissions.

The fix involves a systematic find-and-replace operation across three backend service files to correct all SQL query table references. This is a low-risk, surgical fix that only modifies string literals in SQL queries without changing any business logic, cache structures, API contracts, or database schema.

## Glossary

- **Bug_Condition (C)**: SQL query references incorrect table names (`RolePermissions` or `RolePermissionScopes` without underscores)
- **Property (P)**: All SQL queries successfully execute against the correct database tables (`Role_Permissions` and `Role_Permission_Scopes`)
- **Preservation**: All queries referencing other tables, all business logic, cache mechanisms, API responses, and authorization rules remain completely unchanged
- **roleManagementService**: Service module in `backend/src/services/roleManagementService.js` handling CRUD operations for roles, permissions, and scopes
- **rbacService**: Service module in `backend/src/services/rbacService.js` handling role-based access control, permission caching, and authorization
- **authorizationService**: Legacy service module in `backend/src/services/authorizationService.js` containing permission validation logic
- **Role_Permissions**: Junction table linking roles to permissions (correct database name with underscore)
- **Role_Permission_Scopes**: Table storing data scope configurations for role-permission combinations (correct database name with underscores)

## Bug Details

### Bug Condition

The bug manifests when any SQL query attempts to SELECT, INSERT, UPDATE, DELETE, or JOIN with the `RolePermissions` or `RolePermissionScopes` tables using CamelCase names. MySQL cannot find these tables because they exist in the database with underscore-separated names. The query execution fails immediately with a "Table doesn't exist" error, which propagates up as a 500 Internal Server Error to the frontend.

**Formal Specification:**
```
FUNCTION isBugCondition(query)
  INPUT: query of type SQLQuery (string)
  OUTPUT: boolean
  
  RETURN (
    query.contains("FROM RolePermissions") OR
    query.contains("JOIN RolePermissions") OR
    query.contains("INTO RolePermissions") OR
    query.contains("UPDATE RolePermissions") OR
    query.contains("DELETE FROM RolePermissions") OR
    query.contains("FROM RolePermissionScopes") OR
    query.contains("JOIN RolePermissionScopes") OR
    query.contains("INTO RolePermissionScopes") OR
    query.contains("UPDATE RolePermissionScopes") OR
    query.contains("DELETE FROM RolePermissionScopes")
  ) AND NOT (
    // Ensure we haven't already fixed these references
    query.contains("FROM Role_Permissions") OR
    query.contains("FROM Role_Permission_Scopes")
  )
END FUNCTION
```

### Examples

**Example 1: SELECT Query Failure**
- **Location**: `roleManagementService.js:493`
- **Query**: `SELECT p.uuid, p.code FROM RolePermissions rp INNER JOIN Permissions p ON rp.permission_uuid = p.uuid WHERE rp.role_uuid = ?`
- **Expected Behavior**: Returns array of permission objects for the specified role
- **Actual Behavior**: MySQL Error: "Table 'mesob_hrms.RolePermissions' doesn't exist"

**Example 2: INSERT Query Failure**
- **Location**: `roleManagementService.js:227`
- **Query**: `INSERT INTO RolePermissions (uuid, role_uuid, permission_uuid, granted_by) VALUES (?, ?, ?, ?)`
- **Expected Behavior**: Creates new role-permission association record
- **Actual Behavior**: MySQL Error: "Table 'mesob_hrms.RolePermissions' doesn't exist"

**Example 3: DELETE Query Failure**
- **Location**: `roleManagementService.js:252`
- **Query**: `DELETE FROM RolePermissions WHERE role_uuid = ? AND permission_uuid = ?`
- **Expected Behavior**: Removes role-permission association
- **Actual Behavior**: MySQL Error: "Table 'mesob_hrms.RolePermissions' doesn't exist"

**Example 4: Scope Management Query Failure**
- **Location**: `roleManagementService.js:402`
- **Query**: `SELECT uuid FROM RolePermissionScopes WHERE role_uuid = ? AND permission_uuid = ?`
- **Expected Behavior**: Returns existing scope configuration for role-permission pair
- **Actual Behavior**: MySQL Error: "Table 'mesob_hrms.RolePermissionScopes' doesn't exist"

**Edge Case: JOIN with Multiple Tables**
- **Location**: `authorizationService.js:125`
- **Query**: Multi-table JOIN including `JOIN RolePermissions rp ON r.uuid = rp.role_uuid`
- **Expected Behavior**: Returns user's permissions by joining Users → Roles → RolePermissions → Permissions
- **Actual Behavior**: Entire query fails when it reaches the RolePermissions join, preventing any permission checks

## Expected Behavior

### Preservation Requirements

**Unchanged Behaviors:**
- All queries referencing other tables (Roles, Permissions, DataScopes, Resources, Users, Employees, Departments, etc.) must continue to work exactly as before
- Business logic in all service functions must remain completely unchanged
- Cache key structures and invalidation patterns must remain identical
- API response structures and field names must remain unchanged
- Error handling patterns for other error types must remain unchanged
- Authorization rules and permission checking logic must continue to apply identical rules
- Frontend API contracts must remain compatible
- Existing data in the database must continue to be readable with identical field names and values

**Scope:**
All SQL queries that do NOT reference `RolePermissions` or `RolePermissionScopes` tables should be completely unaffected by this fix. This includes:
- Queries for Users, Roles, Permissions, DataScopes, Resources tables
- Employee management queries
- Attendance and leave management queries
- Department and position queries
- Authorization log queries
- All non-SQL code including JavaScript functions, variable names, cache operations, and API handlers

## Hypothesized Root Cause

Based on the requirements analysis, the root cause is definitively identified:

1. **Database Schema Naming Convention Mismatch**: The database schema follows an underscore-separated naming convention (`Role_Permissions`, `Role_Permission_Scopes`), likely established by earlier migration scripts or manual table creation. This convention is consistent with other junction tables in the schema.

2. **Code Generation or Copy-Paste Error**: The service layer code was written using CamelCase table names (`RolePermissions`, `RolePermissionScopes`), which is a common JavaScript naming convention. This suggests the queries were either auto-generated with incorrect assumptions, copied from a template with different naming conventions, or written without verification against the actual database schema.

3. **Missing Schema Validation**: There is no automated schema validation or query testing that would have caught this discrepancy during development. The code likely worked in a development environment that had tables with CamelCase names, but failed when deployed to an environment with the actual schema.

4. **Inconsistent Migration History**: The migration script `fixRBACMigration.js` creates tables with CamelCase names, while the production database uses underscore-separated names. This indicates either:
   - The migration script was never run on production, OR
   - Production tables were created manually with different naming, OR
   - A separate migration corrected the table names but didn't update the service code

**Confidence Level**: Very High - The error messages explicitly confirm the table name mismatch, and code review shows no other plausible causes.

## Correctness Properties

Property 1: Bug Condition - SQL Queries Execute Successfully

_For any_ SQL query where the bug condition holds (references `RolePermissions` or `RolePermissionScopes` without underscores), the fixed query SHALL execute successfully against the database using the correct table names (`Role_Permissions` and `Role_Permission_Scopes`), returning valid results without "Table doesn't exist" errors.

**Validates: Requirements 2.1, 2.2, 2.3, 2.4, 2.5, 2.6, 2.7, 2.8**

Property 2: Preservation - Non-Affected Queries Remain Unchanged

_For any_ SQL query that does NOT reference `RolePermissions` or `RolePermissionScopes` tables (queries for Users, Roles, Permissions, DataScopes, Resources, Employees, Departments, etc.), the fixed code SHALL execute those queries with identical SQL text and produce exactly the same results as the original code, preserving all existing database functionality.

**Validates: Requirements 3.1, 3.2, 3.3, 3.4, 3.5, 3.6, 3.7, 3.8**

## Fix Implementation

### Changes Required

This fix involves systematic string replacement in SQL query literals across three backend service files. No business logic, function signatures, API contracts, or cache mechanisms are modified.

**File 1**: `backend/src/services/roleManagementService.js`

**Affected Functions and Queries**:

1. **`assignPermissionToRole()` (Lines ~214-228)**:
   - Line 214: `SELECT uuid FROM RolePermissions WHERE...` → `SELECT uuid FROM Role_Permissions WHERE...`
   - Line 223: `INSERT INTO RolePermissions (uuid, role_uuid...)` → `INSERT INTO Role_Permissions (uuid, role_uuid...)`

2. **`removePermissionFromRole()` (Lines ~252)**:
   - Line 252: `DELETE FROM RolePermissions WHERE...` → `DELETE FROM Role_Permissions WHERE...`

3. **`assignPermissionsToRole()` (Lines ~285-299)**:
   - Line 285: `SELECT uuid FROM RolePermissions WHERE...` → `SELECT uuid FROM Role_Permissions WHERE...`
   - Line 294: `INSERT INTO RolePermissions (uuid, role_uuid...)` → `INSERT INTO Role_Permissions (uuid, role_uuid...)`

4. **`replaceRolePermissions()` (Lines ~326-357)**:
   - Line 326: `SELECT permission_uuid FROM RolePermissions WHERE...` → `SELECT permission_uuid FROM Role_Permissions WHERE...`
   - Line 343: `DELETE FROM RolePermissions WHERE role_uuid = ? AND permission_uuid IN (...)` → `DELETE FROM Role_Permissions WHERE role_uuid = ? AND permission_uuid IN (...)`
   - Line 352: `INSERT INTO RolePermissions (uuid, role_uuid...)` → `INSERT INTO Role_Permissions (uuid, role_uuid...)`

5. **`assignScopeToRolePermission()` (Lines ~399-437)**:
   - Line 399: `SELECT uuid FROM RolePermissions WHERE...` → `SELECT uuid FROM Role_Permissions WHERE...`
   - Line 408: `SELECT uuid FROM RolePermissionScopes WHERE...` → `SELECT uuid FROM Role_Permission_Scopes WHERE...`
   - Line 417: `UPDATE RolePermissionScopes SET...` → `UPDATE Role_Permission_Scopes SET...`
   - Line 424: `INSERT INTO RolePermissionScopes (uuid, role_uuid...)` → `INSERT INTO Role_Permission_Scopes (uuid, role_uuid...)`

6. **`removeScopeFromRolePermission()` (Lines ~459)**:
   - Line 459: `DELETE FROM RolePermissionScopes WHERE...` → `DELETE FROM Role_Permission_Scopes WHERE...`

7. **`getRoleWithDetails()` (Lines ~493-505)**:
   - Line 493: `SELECT ... FROM RolePermissions rp INNER JOIN Permissions p...` → `SELECT ... FROM Role_Permissions rp INNER JOIN Permissions p...`
   - Line 505: `SELECT ... FROM RolePermissionScopes rps INNER JOIN DataScopes ds...` → `SELECT ... FROM Role_Permission_Scopes rps INNER JOIN DataScopes ds...`

**File 2**: `backend/src/services/rbacService.js`

**Affected Functions and Queries**:

1. **`getRolePermissions()` (Lines ~141)**:
   - Line 141: `SELECT DISTINCT p.code FROM RolePermissions rp INNER JOIN Permissions p...` → `SELECT DISTINCT p.code FROM Role_Permissions rp INNER JOIN Permissions p...`

2. **`getPermissionScope()` (Lines ~408)**:
   - Line 408: `SELECT ds.code, ds.name, rps.scope_configuration FROM RolePermissionScopes rps...` → `SELECT ds.code, ds.name, rps.scope_configuration FROM Role_Permission_Scopes rps...`

**File 3**: `backend/src/services/authorizationService.js`

**Affected Functions and Queries**:

1. **`getUserPermissions()` (Lines ~125)**:
   - Line 125: `SELECT DISTINCT p.code FROM Users u JOIN Roles r ... JOIN RolePermissions rp ON r.uuid = rp.role_uuid...` → `SELECT DISTINCT p.code FROM Users u JOIN Roles r ... JOIN Role_Permissions rp ON r.uuid = rp.role_uuid...`

2. **`getUserPermissionsDetailed()` (Lines ~151)**:
   - Line 151: `SELECT DISTINCT p.id, p.uuid, p.code ... FROM Users u JOIN Roles r ... JOIN RolePermissions rp ON r.uuid = rp.role_uuid...` → `SELECT DISTINCT p.id, p.uuid, p.code ... FROM Users u JOIN Roles r ... JOIN Role_Permissions rp ON r.uuid = rp.role_uuid...`

3. **`getRolePermissions()` (Lines ~391)**:
   - Line 391: `SELECT p.id, p.uuid, p.code ... FROM RolePermissions rp JOIN Permissions p...` → `SELECT p.id, p.uuid, p.code ... FROM Role_Permissions rp JOIN Permissions p...`

### Implementation Strategy

**Approach**: Use `str_replace` tool for precise, targeted replacements in each file. This ensures:
- Only SQL query strings are modified
- Table aliases (`rp`, `rps`) remain unchanged
- Comments and documentation remain unchanged
- Function names and variable names remain unchanged
- Each replacement is verified for exact context match

**Replacement Pattern**:
- `FROM RolePermissions` → `FROM Role_Permissions`
- `JOIN RolePermissions` → `JOIN Role_Permissions`
- `INTO RolePermissions` → `INTO Role_Permissions`
- `UPDATE RolePermissions` → `UPDATE Role_Permissions`
- `DELETE FROM RolePermissions` → `DELETE FROM Role_Permissions`
- `FROM RolePermissionScopes` → `FROM Role_Permission_Scopes`
- `JOIN RolePermissionScopes` → `JOIN Role_Permission_Scopes`
- `INTO RolePermissionScopes` → `INTO Role_Permission_Scopes`
- `UPDATE RolePermissionScopes` → `UPDATE Role_Permission_Scopes`
- `DELETE FROM RolePermissionScopes` → `DELETE FROM Role_Permission_Scopes`

**Verification After Each Replacement**:
- Syntax check: Ensure no syntax errors introduced
- Context check: Verify replacement was in SQL query context only
- Alias check: Confirm table aliases (rp, rps) were not modified

## Testing Strategy

### Validation Approach

The testing strategy follows a two-phase approach: first, confirm the bug exists in the unfixed code by attempting to access the Role Management page and observing the failure; then, verify the fix works correctly by testing all affected operations and ensuring non-affected functionality remains unchanged.

### Exploratory Bug Condition Checking

**Goal**: Demonstrate the bug BEFORE implementing the fix. Confirm that the table name mismatch causes the Role Management page to crash.

**Test Plan**: Access the Role Management page in the unfixed application and observe the 500 error. Check MySQL error logs for "Table doesn't exist" messages. This confirms the root cause analysis.

**Test Cases**:
1. **Role Management Page Load Test**: Access `/role-management` endpoint (will fail with 500 on unfixed code)
   - Expected counterexample: HTTP 500, logs show "Table 'mesob_hrms.RolePermissions' doesn't exist"

2. **Direct Service Call Test**: Call `roleManagementService.getRoleWithDetails()` from backend console (will fail on unfixed code)
   - Expected counterexample: MySQL error thrown, stack trace shows query failure at RolePermissions reference

3. **Permission Check Test**: Call `rbacService.getRolePermissions()` for any role UUID (will fail on unfixed code)
   - Expected counterexample: MySQL error, query fails at `SELECT FROM RolePermissions`

4. **Database Verification Test**: Query database directly to confirm actual table names
   - Run: `SHOW TABLES LIKE '%Permission%'` in MySQL
   - Expected result: Shows `Role_Permissions` and `Role_Permission_Scopes` (with underscores)

**Expected Counterexamples**:
- All Role Management API calls fail with 500 errors
- MySQL logs contain: "Table 'mesob_hrms.RolePermissions' doesn't exist" and "Table 'mesob_hrms.RolePermissionScopes' doesn't exist"
- Root cause confirmed: Table name mismatch between code and schema

### Fix Checking

**Goal**: Verify that for all SQL queries where the bug condition holds (references incorrect table names), the fixed queries execute successfully against the database.

**Pseudocode:**
```
FOR ALL query IN affectedQueries DO
  // Test on FIXED code
  result := executeQuery(fixedQuery)
  
  ASSERT result.success = true
  ASSERT result.error IS NULL OR NOT result.error.contains("Table")
  ASSERT result.data IS NOT NULL OR result.affectedRows >= 0
END FOR

// Specific test scenarios after fix
testCases := [
  {name: "Role Management Page Load", endpoint: "/role-management"},
  {name: "Get Role Permissions", service: "roleManagementService.getRoleWithDetails"},
  {name: "Assign Permission", service: "roleManagementService.assignPermissionToRole"},
  {name: "Remove Permission", service: "roleManagementService.removePermissionFromRole"},
  {name: "Assign Scope", service: "roleManagementService.assignScopeToRolePermission"},
  {name: "Get User Permissions", service: "rbacService.getUserPermissions"},
  {name: "Check Permission", service: "authorizationService.hasPermission"}
]

FOR EACH test IN testCases DO
  result := executeTest(test)
  ASSERT result.success = true
  ASSERT NOT result.error.contains("Table")
END FOR
```

**Manual Test Plan**:
1. Start the backend server with fixed code
2. Access Role Management page - should load without 500 error
3. View list of roles - should display all roles with permission counts
4. Click on a specific role - should show role details with assigned permissions
5. Assign a new permission to a role - should succeed without errors
6. Remove a permission from a role - should succeed without errors
7. Assign a data scope to a role-permission - should succeed without errors
8. Check application logs - should contain no "Table doesn't exist" errors

### Preservation Checking

**Goal**: Verify that for all SQL queries that do NOT reference the affected tables, the fixed code produces exactly the same results as the original code.

**Pseudocode:**
```
FOR ALL query IN nonAffectedQueries DO
  // Non-affected queries should remain completely unchanged
  ASSERT originalQuery.text = fixedQuery.text
  ASSERT executeQuery(originalQuery) = executeQuery(fixedQuery)
END FOR

// Test queries for other tables remain unchanged
preservationTests := [
  "SELECT * FROM Users",
  "SELECT * FROM Roles", 
  "SELECT * FROM Permissions",
  "SELECT * FROM DataScopes",
  "SELECT * FROM Resources",
  "SELECT * FROM Employees",
  "SELECT * FROM Departments"
]

FOR EACH query IN preservationTests DO
  resultBefore := executeBefore(query)
  resultAfter := executeAfter(query)
  ASSERT resultBefore = resultAfter
END FOR
```

**Testing Approach**: Property-based testing is recommended for preservation checking because:
- It generates many test cases automatically across different modules and endpoints
- It catches edge cases where unintended side effects might occur
- It provides strong guarantees that behavior is unchanged for all non-role-permission operations

**Test Plan**: Test all other major application features to ensure they continue working identically after the fix.

**Test Cases**:
1. **Employee Management Preservation**: Create, view, update employee records (should work identically)
2. **Attendance Management Preservation**: Record attendance, view reports (should work identically)
3. **Leave Management Preservation**: Submit leave requests, approve leaves (should work identically)
4. **Department Management Preservation**: View and manage departments (should work identically)
5. **User Authentication Preservation**: Login, session management (should work identically)
6. **Other Authorization Checks Preservation**: Permission checks for non-role-permission operations (should work identically)
7. **Cache Behavior Preservation**: Role cache invalidation should still use same keys and work correctly
8. **API Response Structure Preservation**: All API responses should have identical JSON structure and field names

### Unit Tests

After fix implementation, the following should be tested:

- **Query Execution Tests**: Test each modified query executes successfully with correct table names
- **CRUD Operation Tests**: Test create, read, update, delete operations for role permissions
- **Scope Management Tests**: Test scope assignment and removal for role-permission pairs
- **Cache Invalidation Tests**: Verify cache keys and invalidation logic still work correctly
- **Error Handling Tests**: Verify other types of errors (validation, authorization) are still handled correctly
- **Edge Case Tests**: Test with non-existent UUIDs, empty result sets, NULL values

### Property-Based Tests

Generate random inputs to verify correctness across many scenarios:

- **Random Role UUIDs**: Generate random valid role UUIDs and verify `getRolePermissions()` executes without table errors
- **Random Permission Assignments**: Generate random role-permission pairs and verify assignment operations succeed
- **Random Scope Configurations**: Generate random scope assignments and verify they execute correctly
- **Random User Permission Checks**: Generate random user UUIDs and verify permission checks execute without errors
- **Preservation Property**: For queries not involving Role_Permissions or Role_Permission_Scopes, verify results are identical before and after fix

### Integration Tests

Test complete workflows involving multiple service calls:

- **Full Role Management Workflow**: Create role → Assign permissions → Assign scopes → View role details → Remove permissions → Delete role
- **User Permission Flow**: Create user → Assign role → Check permissions → Verify permission cache → Modify role permissions → Verify cache invalidation
- **Authorization Flow**: Login → Access protected resource → Verify permission check queries execute correctly
- **Role Management UI Flow**: Frontend loads roles → Displays permissions → Modifies role → Saves changes → Verifies in database
- **Cross-Service Integration**: Test that roleManagementService, rbacService, and authorizationService all work together correctly after fix
