# Role Management can_be_deleted Column Mismatch Bugfix Design

## Overview

The Role Management system crashes with database errors because the service layer code references a non-existent `can_be_deleted` column in the Roles table. The actual database schema only includes an `is_system_role` column, which serves the same purpose (system roles cannot be deleted). This design outlines the fix to remove all `can_be_deleted` references and use `is_system_role` for deletion logic, ensuring the system queries only existing columns and correctly enforces deletion constraints.

## Glossary

- **Bug_Condition (C)**: Any database query or operation that references the non-existent `can_be_deleted` column in the Roles table
- **Property (P)**: The desired behavior where database queries use only existing columns (`is_system_role` instead of `can_be_deleted`) and deletion logic correctly prevents deletion of system roles
- **Preservation**: Existing role query results, deletion protection for system roles, and role management business logic that must remain unchanged by the fix
- **rbacService**: The service in `backend/src/services/rbacService.js` that provides role-based access control functionality, including role queries
- **roleManagementService**: The service in `backend/src/services/roleManagementService.js` that handles role CRUD operations
- **is_system_role**: The boolean column in the Roles table (value TRUE means the role is a system role and cannot be deleted)

## Bug Details

### Bug Condition

The bug manifests when any database query or operation attempts to access the non-existent `can_be_deleted` column in the Roles table. This occurs in SELECT queries (reading roles), INSERT queries (creating roles), and property access checks (validating deletion). The database schema only defines `is_system_role`, but the code incorrectly references `can_be_deleted`.

**Formal Specification:**
```
FUNCTION isBugCondition(operation)
  INPUT: operation of type DatabaseOperation
  OUTPUT: boolean
  
  RETURN operation.targetTable == 'Roles'
         AND operation.referencesColumn('can_be_deleted')
         AND NOT columnExistsInSchema('Roles', 'can_be_deleted')
END FUNCTION
```

### Examples

- **SELECT Query in rbacService.getRoleByUuid()**: `SELECT uuid, code, name, description, hierarchy_level, is_system_role, is_active, can_be_deleted, created_at, updated_at FROM Roles WHERE uuid = ?` crashes with "Unknown column 'can_be_deleted' in 'SELECT'" at line 86
- **SELECT Query in rbacService.getRoleByCode()**: `SELECT uuid, code, name, description, hierarchy_level, is_system_role, is_active, can_be_deleted, created_at, updated_at FROM Roles WHERE code = ?` crashes with "Unknown column 'can_be_deleted' in 'SELECT'" at line 103
- **SELECT Query in rbacService.getAllRoles()**: `SELECT uuid, code, name, description, is_system_role, is_active, hierarchy_level, can_be_deleted, created_at, updated_at FROM Roles` crashes with "Unknown column 'can_be_deleted' in 'SELECT'" at line 660
- **INSERT Query in roleManagementService.createRole()**: `INSERT INTO Roles (uuid, code, name, description, is_system_role, hierarchy_level, is_active, can_be_deleted, created_by, updated_by) VALUES (?, ?, ?, ?, FALSE, ?, TRUE, TRUE, ?, ?)` crashes with "Unknown column 'can_be_deleted' in 'INSERT'" at line 36
- **Property Access in roleManagementService.deleteRole()**: `if (!role.can_be_deleted)` checks undefined property at line 126, causing incorrect deletion validation logic

## Expected Behavior

### Preservation Requirements

**Unchanged Behaviors:**
- System roles (where `is_system_role = TRUE`) must continue to be protected from deletion
- Custom roles (where `is_system_role = FALSE`) must continue to be deletable (subject to existing business rules like "no users assigned")
- All other role attributes (uuid, code, name, description, default_scope_uuid, hierarchy_level, is_active, created_at, updated_at) must continue to be retrieved and stored correctly
- Role management business logic (uniqueness validation, user assignment checks, audit logging) must continue to work exactly as before
- Database referential integrity with the Scopes table via foreign key constraint must remain unchanged
- Role filtering by `is_active` status must continue to return correct results

**Scope:**
All database operations on the Roles table that do NOT reference the `can_be_deleted` column should be completely unaffected by this fix. This includes:
- Queries that only access valid columns
- Role updates that modify name, description, hierarchy_level, or is_active
- Role assignment operations (assigning roles to users)
- Permission assignment operations (assigning permissions to roles)

## Hypothesized Root Cause

Based on the bug description and code analysis, the root cause is a schema mismatch:

1. **Schema Evolution Issue**: The database schema was cleaned up to use `is_system_role` (with inverted logic) instead of `can_be_deleted`, but the service layer code was not updated accordingly
   - The clean schema in `database/schema_clean.sql` only defines `is_system_role` in the Roles table
   - Migration scripts in `backend/scripts/` still reference `can_be_deleted`, suggesting this was part of an older schema version

2. **Inverted Logic Semantics**: The two columns have opposite meanings:
   - `can_be_deleted = TRUE` means the role CAN be deleted
   - `is_system_role = TRUE` means the role is a system role and CANNOT be deleted
   - The fix requires inverting the logic: `!can_be_deleted` becomes `is_system_role`

3. **Multiple Reference Points**: The non-existent column is referenced in:
   - Three SELECT queries in rbacService.js (getRoleByUuid, getRoleByCode, getAllRoles)
   - One INSERT query in roleManagementService.js (createRole)
   - One property access check in roleManagementService.js (deleteRole)

4. **No Database-Level Validation**: The code was written assuming `can_be_deleted` exists, but since the column is missing, any query that references it immediately fails

## Correctness Properties

Property 1: Bug Condition - Database Queries Use Only Existing Columns

_For any_ database query or operation on the Roles table, the fixed code SHALL reference only columns that exist in the schema (uuid, code, name, description, default_scope_uuid, hierarchy_level, is_system_role, is_active, created_at, updated_at) and SHALL NOT reference the non-existent `can_be_deleted` column.

**Validates: Requirements 2.1, 2.2, 2.3, 2.4**

Property 2: Preservation - System Role Deletion Protection

_For any_ role where `is_system_role = TRUE`, the fixed deletion logic SHALL prevent deletion (throw error "Cannot delete system roles"), preserving the same deletion protection that was intended by the original `can_be_deleted = FALSE` check.

**Validates: Requirements 3.1, 3.2**

Property 3: Preservation - Role Data Retrieval

_For any_ role query operation that did NOT previously reference `can_be_deleted` (or that referenced only valid columns), the fixed code SHALL produce exactly the same query results and behavior as before, preserving all role attributes and business logic.

**Validates: Requirements 3.3, 3.4, 3.5, 3.6**

## Fix Implementation

### Changes Required

Assuming our root cause analysis is correct, we need to remove all references to `can_be_deleted` and use `is_system_role` with inverted logic.

**File**: `backend/src/services/rbacService.js`

**Function**: `getRoleByUuid(roleUuid)` (Line 83-91)

**Specific Changes**:
1. **Remove can_be_deleted from SELECT**: Change the SELECT query at line 86-87:
   ```javascript
   // BEFORE:
   `SELECT uuid, code, name, description, hierarchy_level, is_system_role, 
           is_active, can_be_deleted, created_at, updated_at
    FROM Roles
    WHERE uuid = ?`
   
   // AFTER:
   `SELECT uuid, code, name, description, hierarchy_level, is_system_role, 
           is_active, created_at, updated_at
    FROM Roles
    WHERE uuid = ?`
   ```

**Function**: `getRoleByCode(code)` (Line 100-108)

**Specific Changes**:
2. **Remove can_be_deleted from SELECT**: Change the SELECT query at line 103-104:
   ```javascript
   // BEFORE:
   `SELECT uuid, code, name, description, hierarchy_level, is_system_role, 
           is_active, can_be_deleted, created_at, updated_at
    FROM Roles
    WHERE code = ?`
   
   // AFTER:
   `SELECT uuid, code, name, description, hierarchy_level, is_system_role, 
           is_active, created_at, updated_at
    FROM Roles
    WHERE code = ?`
   ```

**Function**: `getAllRoles(filters)` (Line 640-670)

**Specific Changes**:
3. **Remove can_be_deleted from SELECT**: Change the SELECT query at line 660-661:
   ```javascript
   // BEFORE:
   `SELECT uuid, code, name, description, is_system_role, is_active, 
           hierarchy_level, can_be_deleted, created_at, updated_at
    FROM Roles
    ${where}`
   
   // AFTER:
   `SELECT uuid, code, name, description, is_system_role, is_active, 
           hierarchy_level, created_at, updated_at
    FROM Roles
    ${where}`
   ```

**File**: `backend/src/services/roleManagementService.js`

**Function**: `createRole(roleData, createdBy)` (Line 22-61)

**Specific Changes**:
4. **Remove can_be_deleted from INSERT**: Change the INSERT query at line 35-38:
   ```javascript
   // BEFORE:
   `INSERT INTO Roles 
    (uuid, code, name, description, is_system_role, hierarchy_level, is_active, 
     can_be_deleted, created_by, updated_by)
    VALUES (?, ?, ?, ?, FALSE, ?, TRUE, TRUE, ?, ?)`
   
   // AFTER:
   `INSERT INTO Roles 
    (uuid, code, name, description, is_system_role, hierarchy_level, is_active, 
     created_by, updated_by)
    VALUES (?, ?, ?, ?, FALSE, ?, TRUE, ?, ?)`
   ```
   Note: This also requires removing one parameter from the VALUES list (the `TRUE` for can_be_deleted)

**Function**: `deleteRole(roleUuid, deletedBy)` (Line 120-168)

**Specific Changes**:
5. **Replace can_be_deleted check with is_system_role**: Change the deletion validation logic at line 126-128:
   ```javascript
   // BEFORE:
   if (!role.can_be_deleted) {
     throw new Error('This role cannot be deleted');
   }
   
   if (role.is_system_role) {
     throw new Error('Cannot delete system roles');
   }
   
   // AFTER:
   if (role.is_system_role) {
     throw new Error('Cannot delete system roles');
   }
   ```
   Note: The first check (`!role.can_be_deleted`) is redundant with the second check (`role.is_system_role`) because `is_system_role = TRUE` means the role cannot be deleted. We remove the first check and keep only the `is_system_role` check.

## Testing Strategy

### Validation Approach

The testing strategy follows a two-phase approach: first, surface counterexamples that demonstrate the bug on unfixed code, then verify the fix works correctly and preserves existing behavior.

### Exploratory Bug Condition Checking

**Goal**: Surface counterexamples that demonstrate the bug BEFORE implementing the fix. Confirm or refute the root cause analysis. If we refute, we will need to re-hypothesize.

**Test Plan**: Write tests that attempt to perform role operations (read, create, delete) using the current unfixed code. Run these tests to observe the database errors and confirm that `can_be_deleted` references are causing the failures.

**Test Cases**:
1. **Get Role by UUID Test**: Call `rbacService.getRoleByUuid(validUuid)` on unfixed code (will fail with "Unknown column 'can_be_deleted' in 'SELECT'")
2. **Get Role by Code Test**: Call `rbacService.getRoleByCode('SUPER_ADMIN')` on unfixed code (will fail with "Unknown column 'can_be_deleted' in 'SELECT'")
3. **Get All Roles Test**: Call `rbacService.getAllRoles()` on unfixed code (will fail with "Unknown column 'can_be_deleted' in 'SELECT'")
4. **Create Role Test**: Call `roleManagementService.createRole({code: 'TEST_ROLE', name: 'Test Role'}, adminUuid)` on unfixed code (will fail with "Unknown column 'can_be_deleted' in 'INSERT'")
5. **Delete Role Test**: Call `roleManagementService.deleteRole(customRoleUuid, adminUuid)` on unfixed code (may fail or produce incorrect validation due to `role.can_be_deleted` being undefined)

**Expected Counterexamples**:
- Database errors with message "Unknown column 'can_be_deleted'" in SELECT queries
- Database errors with message "Unknown column 'can_be_deleted'" in INSERT queries
- Possible undefined property access in deletion validation (role.can_be_deleted is undefined)
- Possible causes: schema mismatch, column renamed from can_be_deleted to is_system_role

### Fix Checking

**Goal**: Verify that for all inputs where the bug condition holds (queries/operations that previously referenced can_be_deleted), the fixed function produces the expected behavior (successful execution without database errors).

**Pseudocode:**
```
FOR ALL operation WHERE isBugCondition(operation) DO
  result := executeOperation_fixed(operation)
  ASSERT result.success == TRUE
  ASSERT result.noError()
  ASSERT result.returnsValidRoleData()
END FOR
```

**Test Cases**:
1. **Get Role by UUID (Fixed)**: Call `rbacService.getRoleByUuid(validUuid)` on fixed code → should return role object with all valid fields
2. **Get Role by Code (Fixed)**: Call `rbacService.getRoleByCode('SUPER_ADMIN')` on fixed code → should return role object with all valid fields
3. **Get All Roles (Fixed)**: Call `rbacService.getAllRoles()` on fixed code → should return array of role objects
4. **Create Role (Fixed)**: Call `roleManagementService.createRole({code: 'TEST_ROLE', name: 'Test Role'}, adminUuid)` on fixed code → should insert role successfully
5. **Delete Custom Role (Fixed)**: Call `roleManagementService.deleteRole(customRoleUuid, adminUuid)` where `is_system_role = FALSE` → should delete role successfully
6. **Delete System Role (Fixed)**: Call `roleManagementService.deleteRole(systemRoleUuid, adminUuid)` where `is_system_role = TRUE` → should throw "Cannot delete system roles" error

### Preservation Checking

**Goal**: Verify that for all inputs where the bug condition does NOT hold (operations that never referenced can_be_deleted), the fixed function produces the same result as the original function.

**Pseudocode:**
```
FOR ALL operation WHERE NOT isBugCondition(operation) DO
  ASSERT executeOperation_original(operation) = executeOperation_fixed(operation)
END FOR
```

**Testing Approach**: Property-based testing is recommended for preservation checking because:
- It generates many test cases automatically across the input domain
- It catches edge cases that manual unit tests might miss
- It provides strong guarantees that behavior is unchanged for all non-buggy inputs

**Test Plan**: Identify role operations that never referenced `can_be_deleted`, then verify those operations continue to work exactly as before after the fix.

**Test Cases**:
1. **System Role Deletion Protection**: Verify that attempting to delete a role where `is_system_role = TRUE` throws the same error ("Cannot delete system roles") before and after the fix
2. **Custom Role Deletion with Assigned Users**: Verify that attempting to delete a custom role with assigned users throws the same error about user assignments before and after the fix
3. **Role Update Operations**: Verify that updating role name, description, or hierarchy_level works identically before and after the fix
4. **Role Permission Assignment**: Verify that assigning permissions to roles works identically before and after the fix
5. **Role Attribute Values**: Verify that all role attributes (uuid, code, name, description, hierarchy_level, is_system_role, is_active, timestamps) have the same values before and after the fix for the same role queries
6. **Role Filtering by is_active**: Verify that filtering roles by `is_active` status returns the same roles before and after the fix

### Unit Tests

- Test that `rbacService.getRoleByUuid()` successfully retrieves roles without database errors
- Test that `rbacService.getRoleByCode()` successfully retrieves roles without database errors
- Test that `rbacService.getAllRoles()` successfully retrieves all roles without database errors
- Test that `roleManagementService.createRole()` successfully creates custom roles without database errors
- Test that `roleManagementService.deleteRole()` prevents deletion of system roles (is_system_role = TRUE)
- Test that `roleManagementService.deleteRole()` allows deletion of custom roles (is_system_role = FALSE) with no assigned users
- Test that `roleManagementService.deleteRole()` prevents deletion of roles with assigned users
- Test edge cases: deleting a role that doesn't exist, creating a role with duplicate code

### Property-Based Tests

- Generate random role UUIDs and verify that `getRoleByUuid()` either returns valid role data or null (no database errors)
- Generate random role codes and verify that `getRoleByCode()` either returns valid role data or null (no database errors)
- Generate random role creation data (varying code, name, description, hierarchyLevel) and verify all creations succeed or fail with business logic errors (not database errors)
- Generate random combinations of role states (system vs custom, with vs without assigned users) and verify deletion logic correctly allows/prevents deletion based on `is_system_role` and user assignment status
- Test that system roles (is_system_role = TRUE) are NEVER deletable regardless of other attributes

### Integration Tests

- Test the full role management flow: create a custom role → assign permissions → assign to user → attempt deletion (should fail) → unassign from user → delete (should succeed)
- Test the frontend Role Management page: load page → verify roles are displayed without 500 errors → create new role → verify it appears in the list
- Test role-based access control flow: create user → assign role → verify user has correct permissions based on role
- Test system role protection: attempt to delete SUPER_ADMIN role → verify it fails with appropriate error message
- Test role update flow: update custom role attributes → verify changes persist → verify permissions unchanged
