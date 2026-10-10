# Database Schema Verification Report
## Task 3.6: Verify Database Schema Consistency

**Date:** Generated from schema files analysis  
**Task:** Verify Permission-based RBAC tables exist and document obsolete tables

---

## Executive Summary

Based on analysis of the database schema SQL files:
- `/database/ADD_RBAC_TABLES.sql` - Permission-based RBAC schema (current)
- `/database/schema_clean.sql` - Module-based schema (legacy)

### ✓ Required Permission-based RBAC Tables

The following tables are defined in `ADD_RBAC_TABLES.sql` and should exist in the database:

| Table | Status | Description |
|-------|--------|-------------|
| **Resources** | ✓ Defined | System resources (Employees, Attendance, etc.) |
| **Permissions** | ✓ Defined | Granular permissions (Resource.Action format) |
| **Role_Permissions** | ✓ Defined | Maps roles to their permissions |
| **DataScopes** | ✓ Defined | Data access scopes (ALL, ORGANIZATION, DEPARTMENT, OWN) |
| **Role_Permission_Scopes** | ✓ Defined | Maps role permissions to data scopes |
| **Roles** | ✓ Defined | System roles (shared between schemas) |

---

## Detailed Table Structures

### 1. Resources Table

**Purpose:** Defines system resources that can have permissions

**Columns:**
```
id (INT, AUTO_INCREMENT, PRIMARY KEY)
uuid (VARCHAR(36), UNIQUE, NOT NULL)
code (VARCHAR(100), UNIQUE, NOT NULL) - e.g., 'Employees', 'Attendance'
name (VARCHAR(200), NOT NULL)
description (TEXT)
display_order (INT, DEFAULT 0)
is_active (TINYINT(1), DEFAULT 1)
created_at (DATETIME, DEFAULT CURRENT_TIMESTAMP)
updated_at (DATETIME, ON UPDATE CURRENT_TIMESTAMP)
```

**Seed Data:** 10 resources (Employees, Attendance, Leave, Letters, Accounts, Roles, NetworkSettings, AuditLogs, Departments, Positions)

---

### 2. Permissions Table

**Purpose:** Defines granular permissions in Resource.Action format

**Columns:**
```
id (INT, AUTO_INCREMENT, PRIMARY KEY)
uuid (VARCHAR(36), UNIQUE, NOT NULL)
resource_uuid (VARCHAR(36), NOT NULL, FK -> Resources.uuid)
code (VARCHAR(100), UNIQUE, NOT NULL) - e.g., 'Employees.View', 'Attendance.Create'
name (VARCHAR(200), NOT NULL)
action (VARCHAR(50), NOT NULL) - e.g., 'View', 'Create', 'Update', 'Delete'
description (TEXT)
requires_scope (TINYINT(1), DEFAULT 0)
is_sensitive (TINYINT(1), DEFAULT 0)
display_order (INT, DEFAULT 0)
is_active (TINYINT(1), DEFAULT 1)
created_at (DATETIME, DEFAULT CURRENT_TIMESTAMP)
updated_at (DATETIME, ON UPDATE CURRENT_TIMESTAMP)
```

**Seed Data:** 33 permissions covering all resources

**Foreign Keys:**
- `resource_uuid` -> `Resources.uuid` (ON DELETE CASCADE)

---

### 3. Role_Permissions Table

**Purpose:** Maps roles to their permissions

**Columns:**
```
id (INT, AUTO_INCREMENT, PRIMARY KEY)
uuid (VARCHAR(36), UNIQUE, NOT NULL)
role_uuid (VARCHAR(36), NOT NULL, FK -> Roles.uuid)
permission_uuid (VARCHAR(36), NOT NULL, FK -> Permissions.uuid)
granted_by (VARCHAR(36)) - User UUID who granted this permission
created_at (DATETIME, DEFAULT CURRENT_TIMESTAMP)
```

**Unique Constraint:** `(role_uuid, permission_uuid)` - prevents duplicate assignments

**Foreign Keys:**
- `role_uuid` -> `Roles.uuid` (ON DELETE CASCADE)
- `permission_uuid` -> `Permissions.uuid` (ON DELETE CASCADE)

**Seed Data:** All permissions assigned to SUPER_ADMIN role

---

### 4. DataScopes Table

**Purpose:** Defines data access scopes for permission filtering

**Columns:**
```
id (INT, AUTO_INCREMENT, PRIMARY KEY)
uuid (VARCHAR(36), UNIQUE, NOT NULL)
code (VARCHAR(50), UNIQUE, NOT NULL) - e.g., 'ALL', 'ORGANIZATION', 'DEPARTMENT', 'OWN'
name (VARCHAR(100), NOT NULL)
scope_type (VARCHAR(50), DEFAULT 'STANDARD')
description (TEXT)
hierarchy_level (INT, DEFAULT 0) - Higher = broader scope
is_active (TINYINT(1), DEFAULT 1)
created_at (DATETIME, DEFAULT CURRENT_TIMESTAMP)
updated_at (DATETIME, ON UPDATE CURRENT_TIMESTAMP)
```

**Seed Data:** 4 scopes:
- `ALL` (hierarchy_level: 100) - Access to all data across the organization
- `ORGANIZATION` (hierarchy_level: 90) - Access to organization-wide data
- `DEPARTMENT` (hierarchy_level: 50) - Access to own department data only
- `OWN` (hierarchy_level: 10) - Access to own data only

---

### 5. Role_Permission_Scopes Table

**Purpose:** Maps role permissions to their data scopes

**Columns:**
```
id (INT, AUTO_INCREMENT, PRIMARY KEY)
uuid (VARCHAR(36), UNIQUE, NOT NULL)
role_uuid (VARCHAR(36), NOT NULL, FK -> Roles.uuid)
permission_uuid (VARCHAR(36), NOT NULL, FK -> Permissions.uuid)
data_scope_uuid (VARCHAR(36), NOT NULL, FK -> DataScopes.uuid)
scope_configuration (JSON) - Additional scope constraints
created_at (DATETIME, DEFAULT CURRENT_TIMESTAMP)
```

**Unique Constraint:** `(role_uuid, permission_uuid)` - one scope per role-permission pair

**Foreign Keys:**
- `role_uuid` -> `Roles.uuid` (ON DELETE CASCADE)
- `permission_uuid` -> `Permissions.uuid` (ON DELETE CASCADE)
- `data_scope_uuid` -> `DataScopes.uuid` (ON DELETE CASCADE)

**Seed Data:** SUPER_ADMIN has ORGANIZATION scope for all permissions

---

### 6. Roles Table (Shared)

**Purpose:** Defines system roles

**Columns:**
```
uuid (VARCHAR(36), PRIMARY KEY)
code (VARCHAR(50), UNIQUE, NOT NULL)
name (VARCHAR(100), NOT NULL)
description (TEXT)
default_scope_uuid (VARCHAR(36), FK -> Scopes.uuid) - Legacy reference
hierarchy_level (INT, DEFAULT 10)
is_system_role (TINYINT(1), DEFAULT 0)
is_active (TINYINT(1), DEFAULT 1)
created_at (DATETIME, DEFAULT CURRENT_TIMESTAMP)
updated_at (DATETIME, ON UPDATE CURRENT_TIMESTAMP)
```

**Note:** This table is shared between the old Module-based schema and new Permission-based schema. The `default_scope_uuid` column references the legacy `Scopes` table (not `DataScopes`).

---

## ⚠️ Obsolete Tables (DO NOT DROP)

The following tables are defined in `schema_clean.sql` as part of the legacy Module-based RBAC system. These should be **documented but NOT dropped** as they may contain legacy data or be referenced elsewhere:

### 1. Modules Table (Obsolete)

**Status:** ⚠️ OBSOLETE - Replaced by `Resources` table

**Columns:**
```
uuid (VARCHAR(36), PRIMARY KEY)
code (VARCHAR(50), UNIQUE, NOT NULL)
name (VARCHAR(100), NOT NULL)
description (TEXT)
icon (VARCHAR(50))
display_order (INT, DEFAULT 0)
is_active (TINYINT(1), DEFAULT 1)
created_at (DATETIME)
updated_at (DATETIME)
```

**Why Obsolete:** The Permission-based system uses `Resources` table instead, which has the same purpose but integrates with the new permission model.

---

### 2. RoleModules Table (Obsolete)

**Status:** ⚠️ OBSOLETE - Replaced by `Role_Permissions` table

**Columns:**
```
uuid (VARCHAR(36), PRIMARY KEY)
role_uuid (VARCHAR(36), FK -> Roles.uuid)
module_uuid (VARCHAR(36), FK -> Modules.uuid)
scope_uuid (VARCHAR(36), FK -> Scopes.uuid)
created_at (DATETIME)
```

**Why Obsolete:** The Permission-based system uses `Role_Permissions` table which provides more granular permission control (e.g., View, Create, Update, Delete) rather than module-level access.

---

### 3. Scopes Table (Obsolete)

**Status:** ⚠️ OBSOLETE - Replaced by `DataScopes` table

**Columns:**
```
uuid (VARCHAR(36), PRIMARY KEY)
code (VARCHAR(50), UNIQUE, NOT NULL)
name (VARCHAR(100), NOT NULL)
description (TEXT)
level (INT, DEFAULT 0)
created_at (DATETIME)
```

**Why Obsolete:** The Permission-based system uses `DataScopes` table which has additional fields (`scope_type`, `hierarchy_level`) and different semantics.

**Note:** The `Roles` table still has a foreign key `default_scope_uuid` referencing this table, so it should NOT be dropped without careful migration.

---

### 4. Occupations Table

**Status:** ✓ DOES NOT EXIST

The `rbacController` was designed to work with an `Occupations` table, but this table was never created in any schema file. This confirms that `rbacController` is incompatible with the current database.

---

### 5. RoleOccupations Table

**Status:** ✓ DOES NOT EXIST

The `rbacController` was designed to work with a `RoleOccupations` table, but this table was never created. This confirms that `rbacController` is incompatible with the current database.

---

## Verification Conclusion

### ✓ Schema Consistency Verified

Based on schema file analysis:

1. **All required Permission-based RBAC tables are defined** in `ADD_RBAC_TABLES.sql`:
   - ✓ Resources
   - ✓ Permissions
   - ✓ Role_Permissions
   - ✓ DataScopes
   - ✓ Role_Permission_Scopes
   - ✓ Roles

2. **Obsolete Module-based tables exist** in `schema_clean.sql`:
   - ⚠️ Modules (should be documented, not dropped)
   - ⚠️ RoleModules (should be documented, not dropped)
   - ⚠️ Scopes (should be documented, not dropped - referenced by Roles.default_scope_uuid)

3. **Non-existent tables** (never created):
   - ✓ Occupations (does not exist)
   - ✓ RoleOccupations (does not exist)

### Architecture Validation

The codebase analysis confirms:

✓ **`rbacService.js`** queries `Role_Permissions` and `Permissions` tables (Permission-based schema)  
✓ **`authorize` middleware** uses `rbacService` for permission enforcement  
✓ **`roleManagementController`** operates on Permission-based schema (Resources, Permissions, Role_Permissions)  
✗ **`moduleRoleController`** operates on Module-based schema (Modules, RoleModules) - INCOMPATIBLE  
✗ **`rbacController`** operates on Occupation-based schema (Occupations, RoleOccupations) - INCOMPATIBLE  

### Recommendation

**The Permission-based RBAC schema is the correct, active schema.** All consolidation work should:
- Keep `roleManagementController` and `/api/role-management/*` endpoints
- Remove `moduleRoleController` and `/api/module-role/*` endpoints
- Remove `rbacController` and `/api/rbac/*` endpoints
- Document obsolete tables but DO NOT drop them (may contain seed data or be referenced)

---

## Migration Notes

If the database needs to be set up from scratch:

1. Run `schema_clean.sql` first (creates base tables including Roles)
2. Run `ADD_RBAC_TABLES.sql` second (adds Permission-based RBAC tables)
3. The obsolete Module-based tables (Modules, RoleModules, Scopes) will exist but be unused
4. The system will use only the Permission-based tables (Resources, Permissions, Role_Permissions, DataScopes, Role_Permission_Scopes)

---

**Task 3.6 Status:** ✓ COMPLETE

All required Permission-based RBAC tables are defined in the schema. Obsolete Module-based tables are documented. The schema is consistent with the unified `roleManagementController` implementation.
