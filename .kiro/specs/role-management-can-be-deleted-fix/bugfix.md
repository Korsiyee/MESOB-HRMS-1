# Bugfix Requirements Document

## Introduction

The Role Management API crashes with a database error when attempting to retrieve or manipulate roles. The root cause is that service layer code references a non-existent `can_be_deleted` column in the Roles table. The actual database schema only includes an `is_system_role` column, which serves the same purpose (system roles cannot be deleted). This bug prevents the entire role management functionality from working, affecting administrative operations and user management.

## Bug Analysis

### Current Behavior (Defect)

1.1 WHEN `rbacService.getRoleByUuid()` queries the Roles table THEN the system crashes with "Unknown column 'can_be_deleted' in 'SELECT'" error at line 86

1.2 WHEN `rbacService.getRoleByCode()` queries the Roles table THEN the system crashes with "Unknown column 'can_be_deleted' in 'SELECT'" error at line 103

1.3 WHEN `rbacService.getAllRoles()` queries the Roles table THEN the system crashes with "Unknown column 'can_be_deleted' in 'SELECT'" error at line 660

1.4 WHEN `roleManagementService.createRole()` attempts to insert a new role THEN the system crashes with "Unknown column 'can_be_deleted' in 'INSERT'" error at line 36

1.5 WHEN `roleManagementService.deleteRole()` checks role properties THEN the system attempts to access undefined `role.can_be_deleted` property at line 126, causing incorrect deletion validation logic

1.6 WHEN the frontend Role Management page loads THEN the system returns 500 Internal Server Error and displays "Internal server error" message

### Expected Behavior (Correct)

2.1 WHEN `rbacService.getRoleByUuid()` queries the Roles table THEN the system SHALL successfully execute the SELECT query using only columns that exist in the schema (excluding `can_be_deleted`)

2.2 WHEN `rbacService.getRoleByCode()` queries the Roles table THEN the system SHALL successfully execute the SELECT query using only columns that exist in the schema (excluding `can_be_deleted`)

2.3 WHEN `rbacService.getAllRoles()` queries the Roles table THEN the system SHALL successfully execute the SELECT query using only columns that exist in the schema (excluding `can_be_deleted`)

2.4 WHEN `roleManagementService.createRole()` attempts to insert a new role THEN the system SHALL successfully execute the INSERT query using only columns that exist in the schema (excluding `can_be_deleted`)

2.5 WHEN `roleManagementService.deleteRole()` checks if a role can be deleted THEN the system SHALL use the `is_system_role` column to determine deletability (where `is_system_role = FALSE` means the role can be deleted)

2.6 WHEN the frontend Role Management page loads THEN the system SHALL return 200 OK with a valid list of roles

### Unchanged Behavior (Regression Prevention)

3.1 WHEN querying roles with `is_system_role = TRUE` THEN the system SHALL CONTINUE TO identify them as system roles that cannot be deleted

3.2 WHEN querying roles with `is_system_role = FALSE` THEN the system SHALL CONTINUE TO identify them as custom roles that can be deleted

3.3 WHEN all other Roles table columns are accessed (uuid, code, name, description, default_scope_uuid, hierarchy_level, is_active, created_at, updated_at) THEN the system SHALL CONTINUE TO retrieve them correctly

3.4 WHEN role data is returned to the frontend THEN the system SHALL CONTINUE TO provide all necessary role information for display and management

3.5 WHEN database transactions involve the Roles table THEN the system SHALL CONTINUE TO maintain referential integrity with the Scopes table via the foreign key constraint

3.6 WHEN roles are filtered by `is_active` status THEN the system SHALL CONTINUE TO return only active or inactive roles as requested
