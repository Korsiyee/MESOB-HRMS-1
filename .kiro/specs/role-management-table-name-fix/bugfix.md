# Bugfix Requirements Document

## Introduction

The Role Management page in the HRMS application crashes with a 500 Internal Server Error due to database table name mismatches in SQL queries. The application code references tables named `RolePermissions` and `RolePermissionScopes`, but the actual database schema uses underscore-separated names: `Role_Permissions` and `Role_Permission_Scopes`. This mismatch causes MySQL to throw "Table doesn't exist" errors when the Role Management page attempts to fetch role and permission data.

The bug affects critical role and permission management functionality, preventing administrators from viewing, creating, or modifying roles and their associated permissions. This fix ensures all SQL queries use the correct table names that match the existing database schema, without requiring any schema changes.

## Bug Analysis

### Current Behavior (Defect)

1.1 WHEN the Role Management page is accessed THEN the system crashes with HTTP 500 error and logs "Table 'mesob_hrms.RolePermissions' doesn't exist" at roleManagementService.js:490

1.2 WHEN any service queries the `RolePermissions` table THEN the system fails with "Table doesn't exist" error because the code references `RolePermissions` instead of `Role_Permissions`

1.3 WHEN any service queries the `RolePermissionScopes` table THEN the system fails with "Table doesn't exist" error because the code references `RolePermissionScopes` instead of `Role_Permission_Scopes`

1.4 WHEN roleManagementService.getRoleWithPermissions() executes THEN the system crashes trying to SELECT from `RolePermissions` table that doesn't exist

1.5 WHEN rbacService.getRolePermissions() executes THEN the system crashes trying to SELECT from `RolePermissions` table that doesn't exist

1.6 WHEN authorizationService functions execute permission checks THEN the system crashes trying to JOIN with `RolePermissions` table that doesn't exist

1.7 WHEN roleManagementService attempts to insert, update, or delete role permission records THEN the system crashes because it targets the non-existent `RolePermissions` table

1.8 WHEN roleManagementService attempts to manage permission scopes THEN the system crashes because it targets the non-existent `RolePermissionScopes` table

### Expected Behavior (Correct)

2.1 WHEN the Role Management page is accessed THEN the system SHALL load successfully without 500 errors and display role and permission data correctly

2.2 WHEN any service queries role permissions THEN the system SHALL use the correct table name `Role_Permissions` (with underscore) in all SQL queries

2.3 WHEN any service queries role permission scopes THEN the system SHALL use the correct table name `Role_Permission_Scopes` (with underscore) in all SQL queries

2.4 WHEN roleManagementService.getRoleWithPermissions() executes THEN the system SHALL successfully SELECT from `Role_Permissions` table and return role permission data

2.5 WHEN rbacService.getRolePermissions() executes THEN the system SHALL successfully SELECT from `Role_Permissions` table and return cached permission codes

2.6 WHEN authorizationService functions execute permission checks THEN the system SHALL successfully JOIN with `Role_Permissions` table and validate user permissions

2.7 WHEN roleManagementService attempts to insert, update, or delete role permission records THEN the system SHALL successfully execute these operations against the `Role_Permissions` table

2.8 WHEN roleManagementService attempts to manage permission scopes THEN the system SHALL successfully execute operations against the `Role_Permission_Scopes` table

### Unchanged Behavior (Regression Prevention)

3.1 WHEN queries reference other database tables with correct names THEN the system SHALL CONTINUE TO execute those queries successfully without modification

3.2 WHEN roleManagementService functions that don't involve RolePermissions or RolePermissionScopes tables execute THEN the system SHALL CONTINUE TO function identically

3.3 WHEN rbacService cache invalidation occurs THEN the system SHALL CONTINUE TO clear caches correctly using the existing cache key structure

3.4 WHEN permission checking logic evaluates user permissions THEN the system SHALL CONTINUE TO apply the same authorization rules and return identical results

3.5 WHEN the application queries the Permissions, DataScopes, Resources, Roles, or Users tables THEN the system SHALL CONTINUE TO use the existing correct table names without changes

3.6 WHEN frontend API calls are made to role management endpoints THEN the system SHALL CONTINUE TO receive the same response structure and data format

3.7 WHEN existing role and permission data exists in the database THEN the system SHALL CONTINUE TO return that data with identical field names and values

3.8 WHEN error handling and logging execute for other types of errors THEN the system SHALL CONTINUE TO handle those errors using existing error handling patterns

## Bug Condition Specification

### Bug Condition Function

```pascal
FUNCTION isBugCondition(query)
  INPUT: query of type SQLQuery
  OUTPUT: boolean
  
  // Returns true when query references incorrect table names
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
    query.contains("FROM Role_Permissions") OR
    query.contains("FROM Role_Permission_Scopes")
  )
END FUNCTION
```

### Counterexample

**Concrete Buggy Input:**
```javascript
// Current code at roleManagementService.js:490
const [permissions] = await executeQuery(
  `SELECT p.uuid, p.code FROM RolePermissions rp
   INNER JOIN Permissions p ON rp.permission_uuid = p.uuid
   WHERE rp.role_uuid = ?`,
  [roleUuid]
);
```

**Observed Behavior:** MySQL error: "Table 'mesob_hrms.RolePermissions' doesn't exist"

**Expected Behavior:** Query should execute successfully using `Role_Permissions`

### Property Specification

```pascal
// Property: Fix Checking - Correct Table Names
FOR ALL query WHERE isBugCondition(query) DO
  fixedQuery ← replaceTableNames(query)
  result ← executeQuery(fixedQuery)
  ASSERT (
    result.success = true AND
    result.data IS NOT NULL AND
    NOT result.error.contains("Table") AND
    NOT result.error.contains("doesn't exist")
  )
END FOR

FUNCTION replaceTableNames(query)
  OUTPUT: correctedQuery
  
  correctedQuery ← query
  correctedQuery ← replace(correctedQuery, "FROM RolePermissions", "FROM Role_Permissions")
  correctedQuery ← replace(correctedQuery, "JOIN RolePermissions", "JOIN Role_Permissions")
  correctedQuery ← replace(correctedQuery, "INTO RolePermissions", "INTO Role_Permissions")
  correctedQuery ← replace(correctedQuery, "UPDATE RolePermissions", "UPDATE Role_Permissions")
  correctedQuery ← replace(correctedQuery, "DELETE FROM RolePermissions", "DELETE FROM Role_Permissions")
  
  correctedQuery ← replace(correctedQuery, "FROM RolePermissionScopes", "FROM Role_Permission_Scopes")
  correctedQuery ← replace(correctedQuery, "JOIN RolePermissionScopes", "JOIN Role_Permission_Scopes")
  correctedQuery ← replace(correctedQuery, "INTO RolePermissionScopes", "INTO Role_Permission_Scopes")
  correctedQuery ← replace(correctedQuery, "UPDATE RolePermissionScopes", "UPDATE Role_Permission_Scopes")
  correctedQuery ← replace(correctedQuery, "DELETE FROM RolePermissionScopes", "DELETE FROM Role_Permission_Scopes")
  
  RETURN correctedQuery
END FUNCTION
```

### Preservation Goal

```pascal
// Property: Preservation Checking
FOR ALL query WHERE NOT isBugCondition(query) DO
  // Queries that don't reference the problematic table names should remain unchanged
  ASSERT F(query) = F'(query)
  
  // Where:
  // F = original query execution function
  // F' = fixed query execution function
END FOR

// Specifically, these should remain unchanged:
FOR ALL query WHERE (
  query.references("Permissions") OR
  query.references("DataScopes") OR
  query.references("Resources") OR
  query.references("Roles") OR
  query.references("Users")
) AND NOT isBugCondition(query) DO
  ASSERT F(query).result = F'(query).result
END FOR
```

## Affected Files and Code Locations

Based on codebase analysis, the following files contain references to the incorrect table names:

### Backend Service Files (Primary Impact)
1. **backend/src/services/roleManagementService.js** - Multiple functions including:
   - Line ~210: `assignPermissionToRole()` - INSERT INTO RolePermissions
   - Line ~250: `removePermissionFromRole()` - DELETE FROM RolePermissions
   - Line ~282: `assignPermissionsToRole()` - SELECT and INSERT RolePermissions
   - Line ~325: `replaceRolePermissions()` - SELECT and DELETE RolePermissions
   - Line ~399: `updatePermissionScope()` - SELECT RolePermissions, SELECT/UPDATE/INSERT RolePermissionScopes
   - Line ~459: `removeScopeFromRolePermission()` - DELETE FROM RolePermissionScopes
   - Line ~493: `getRoleWithPermissions()` - SELECT FROM RolePermissions
   - Line ~505: `getRoleWithPermissions()` - SELECT FROM RolePermissionScopes

2. **backend/src/services/rbacService.js** - Multiple functions including:
   - Line ~141: `getRolePermissions()` - SELECT FROM RolePermissions
   - Line ~408: `getRoleScopes()` - SELECT FROM RolePermissionScopes

3. **backend/src/services/authorizationService.js** - Permission validation functions:
   - Line ~125: `getUserPermissions()` - JOIN RolePermissions
   - Line ~151: `hasPermission()` - JOIN RolePermissions
   - Line ~391: `getRolePermissions()` - SELECT FROM RolePermissions

### Frontend Files (API references - function names only, no SQL)
4. **frontend/src/api/roleManagement.js** - API function names (no SQL, safe):
   - `getRolePermissions()` - Function name, not SQL query
   - `replaceRolePermissions()` - Function name, not SQL query

### Script Files
5. **backend/scripts/fixRBACMigration.js** - Table creation script:
   - Lines ~196-197: CREATE TABLE RolePermissions
   - Lines ~229-230: CREATE TABLE RolePermissionScopes

**Note:** The script files create the tables with incorrect names. These should be fixed to match the existing schema convention, but since the requirement is "no schema changes," we'll only fix query references in this bugfix.

## Scope of Changes

- **Total SQL queries to fix:** Approximately 15-20 query statements across 3 backend service files
- **Table name replacements needed:**
  - `RolePermissions` → `Role_Permissions` (all SQL contexts: SELECT, INSERT, UPDATE, DELETE, JOIN)
  - `RolePermissionScopes` → `Role_Permission_Scopes` (all SQL contexts)
- **No changes required:**
  - Frontend API function names
  - JavaScript variable names or function names
  - Cache key structures
  - Response data structures
  - Other database tables

## Verification Criteria

After applying the fix, the following must be verified:

1. **Primary Test:** Role Management page loads without 500 errors
2. **Query Execution:** All modified queries execute successfully against the database
3. **Data Integrity:** Role permission data displays correctly on the frontend
4. **CRUD Operations:** Create, read, update, and delete operations for role permissions work correctly
5. **Scope Management:** Permission scope assignment and removal functions work correctly
6. **No Regressions:** Other pages and features that query different tables continue working
7. **Cache Functionality:** Permission caching and invalidation continue working correctly
8. **Authorization:** User permission checks continue returning correct results
