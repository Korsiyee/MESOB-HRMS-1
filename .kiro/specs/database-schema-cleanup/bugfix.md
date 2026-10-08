# Bugfix Requirements Document

## Introduction

The database schema file (`database/schema.sql`) is corrupted and contains incompatible RBAC system definitions that conflict with the backend code implementation. This causes RBAC system failures, preventing Super Admin users from accessing protected pages, and causes SQL migration scripts to fail silently. The schema contains a mix of two different RBAC approaches: a complex granular action-level permission system (using `RolePermissions`, `Actions`, and complex scoping) and a simple module-level permission system (using `RoleModules`). The backend code exclusively uses the simple module-level system via the `requireModule()` middleware, but the schema defines the wrong tables, leading to runtime failures.

The schema also contains multiple critical defects including:
- Commented-out table definitions mixed with active ones
- Duplicate table definitions (e.g., `DepartmentLeadership` appears twice)
- Incorrect unique key names (`uk_positions_code` used on all tables instead of proper table-specific names)
- Tables marked "DEPRECATED" but still defined in the schema
- Duplicate column definitions (e.g., `Departments` table has `uuid` defined twice)
- Foreign key references to tables that don't exist in the simple RBAC system

## Bug Analysis

### Current Behavior (Defect)

**1. Schema Structure Issues**

1.1 WHEN the schema.sql file is examined THEN it contains commented-out table definitions for `Scopes` and `Actions` that are marked "DEPRECATED: Will be removed"

1.2 WHEN the schema.sql file is examined THEN it defines `RolePermissions` table with foreign keys to `Actions` and `Scopes` tables that should not exist in the simple RBAC system

1.3 WHEN the schema.sql file is examined THEN the `DepartmentLeadership` table appears twice with identical definitions

1.4 WHEN the schema.sql file is examined THEN every table uses the same incorrect unique key name `uk_positions_code` instead of table-specific names like `uk_modules_code`, `uk_roles_code`, etc.

1.5 WHEN the schema.sql file is examined THEN the `Departments` table has the `uuid` column defined twice

1.6 WHEN the schema.sql file is examined THEN multiple tables are marked with comments like "DEPRECATED: To be consolidated into other tables" but still have CREATE TABLE statements

**2. RBAC System Mismatch**

1.7 WHEN the backend middleware uses `requireModule()` THEN it expects simple module-level permissions via the `RoleModules` table

1.8 WHEN the schema.sql is examined THEN it defines a `RolePermissions` table with granular action-level permissions that the backend does not use

1.9 WHEN the schema.sql is examined THEN it does not define the `RoleModules` table that the backend requires

1.10 WHEN SQL migrations are run THEN they fail silently because table creation statements have syntax errors

**3. Runtime Permission Failures**

1.11 WHEN a Super Admin user attempts to access protected routes THEN the permission check fails because `RoleModules` table does not exist

1.12 WHEN the `moduleAuthService.checkModuleAccess()` is called THEN it queries the non-existent `RoleModules` table causing database errors

1.13 WHEN the backend starts and attempts to load user permissions THEN it fails to find the required RBAC tables

**4. Missing Required Tables**

1.14 WHEN examining the schema THEN the `RoleModules` table (required for simple module-level RBAC) is not defined

1.15 WHEN examining backend controllers THEN they reference tables like `leavePolicies`, `leaveRequests`, `budgetYears`, `employeeLeaveBalances` but the schema defines them as `LeavePolicies`, `LeaveRequests`, `BudgetYears`, `EmployeeLeaveBalances` (incorrect case sensitivity)

### Expected Behavior (Correct)

**1. Clean Schema Structure**

2.1 WHEN the schema is examined THEN it SHALL contain only active table definitions with no commented-out CREATE TABLE statements

2.2 WHEN the schema is examined THEN each table SHALL appear exactly once with no duplicates

2.3 WHEN the schema is examined THEN each table SHALL have properly named unique keys following the pattern `uk_{tablename}_{columnname}` (e.g., `uk_modules_code`, `uk_roles_code`)

2.4 WHEN the schema is examined THEN no column SHALL be defined more than once in the same table

2.5 WHEN the schema is examined THEN no tables SHALL be marked as "DEPRECATED" - deprecated tables shall be completely removed

**2. Correct RBAC System Implementation**

2.6 WHEN the schema is examined THEN it SHALL define the `RoleModules` table with columns (uuid, role_uuid, module_uuid, scope_uuid) and proper foreign keys

2.7 WHEN the schema is examined THEN it SHALL define the `Modules` table for storing application modules (HOME, EMPLOYEES, ORGANIZATION, ATTENDANCE, SHIFTS, LETTERS, LEAVE)

2.8 WHEN the schema is examined THEN it SHALL define the `Scopes` table for storing data access scopes (ORGANIZATION, DEPARTMENT, PERSONAL)

2.9 WHEN the schema is examined THEN it SHALL define the `Roles` table with a `default_scope_uuid` foreign key to `Scopes`

2.10 WHEN the schema is examined THEN it SHALL NOT define `RolePermissions`, `Actions`, or any other granular permission tables

**3. Working Permission System**

2.11 WHEN a Super Admin user accesses protected routes THEN the permission check SHALL succeed by querying `RoleModules` table

2.12 WHEN `moduleAuthService.checkModuleAccess()` is called THEN it SHALL successfully query the `RoleModules` table and return module access information

2.13 WHEN the backend starts THEN it SHALL successfully load all RBAC tables without errors

**4. Complete Table Definitions**

2.14 WHEN the schema is created THEN all tables required by backend controllers SHALL be defined with correct table names matching case-sensitive queries

2.15 WHEN the schema is created THEN all tables SHALL have proper foreign key constraints, indexes, and column definitions matching backend expectations

2.16 WHEN the schema is created THEN leave-related tables SHALL use lowercase names: `leavePolicies`, `leaveRequests`, `budgetYears`, `employeeLeaveBalances`

### Unchanged Behavior (Regression Prevention)

**1. Existing Table Structure Preservation**

3.1 WHEN the schema is recreated THEN tables for core functionality (Employees, Departments, Positions, Levels, Users) SHALL CONTINUE TO exist with the same column structure

3.2 WHEN the schema is recreated THEN attendance tables (AttendanceLogs, AttendanceSummary) SHALL CONTINUE TO exist with the same structure

3.3 WHEN the schema is recreated THEN letter-related tables (LetterTemplates, LetterRequests, IssuedLetters, LetterLayoutConfig) SHALL CONTINUE TO exist

3.4 WHEN the schema is recreated THEN employee-related tables (EmployeeAddresses, EmployeeIDDocuments, EmployeeFaceImages, EmployeeShifts) SHALL CONTINUE TO exist

**2. Data Relationships Preservation**

3.5 WHEN foreign key relationships exist between Employees and Departments THEN they SHALL CONTINUE TO be enforced

3.6 WHEN foreign key relationships exist between Users and Employees THEN they SHALL CONTINUE TO be enforced

3.7 WHEN foreign key relationships exist between AttendanceLogs and Employees THEN they SHALL CONTINUE TO be enforced

**3. Index and Performance Optimization**

3.8 WHEN queries filter by employee_uuid THEN the indexes on employee_uuid columns SHALL CONTINUE TO exist for performance

3.9 WHEN queries filter by dates THEN the indexes on date columns SHALL CONTINUE TO exist

3.10 WHEN queries filter by status or active flags THEN the indexes on these columns SHALL CONTINUE TO exist
