# Database Schema Cleanup Bugfix Design

## Overview

This design addresses the corrupted database schema by creating a clean, normalized schema file that implements the simple module-level RBAC system used by the backend. The current schema is corrupted with commented-out tables, duplicate definitions, incorrect unique key names, and a mismatched RBAC system. The fix will produce a single clean SQL file that creates a working database from scratch with:

1. **Simple Module-Level RBAC**: Four-table system (Roles, Modules, Scopes, RoleModules) instead of complex action-level permissions
2. **Clean Table Definitions**: No duplicates, no deprecated tables, proper unique key naming
3. **Complete HRMS Tables**: All tables needed for employees, attendance, leave, letters, compensation, and organization management
4. **Proper Case Sensitivity**: Lowercase names for leave-related tables to match backend queries
5. **Correct Seeds**: Predefined modules, scopes, and roles with proper permissions

## Glossary

- **Bug_Condition (C)**: The schema file is examined or SQL migrations are executed
- **Property (P)**: The schema contains clean table definitions with simple RBAC and all required HRMS tables
- **Preservation**: Existing table structures, foreign key relationships, and indexes for core functionality must remain unchanged
- **RoleModules**: Junction table mapping roles to modules with scopes (core of simple RBAC system)
- **Module**: Application functional area (HOME, EMPLOYEES, ORGANIZATION, ATTENDANCE, SHIFTS, LETTERS, LEAVE, ADMIN)
- **Scope**: Data access level (ORGANIZATION, DEPARTMENT, PERSONAL) determining what data a user can see
- **Simple RBAC**: Permission system where access is granted at the module/page level, not individual actions

## Bug Details

### Bug Condition

The bug manifests when the schema.sql file is examined or when SQL migrations are executed. The schema file either has structural corruption (commented-out tables, duplicates, wrong unique keys) OR has RBAC system mismatch (defines RolePermissions/Actions instead of RoleModules) OR has missing required tables (RoleModules not defined) OR has case-sensitivity issues (LeaveRequests instead of leaveRequests).

**Formal Specification:**
```
FUNCTION isBugCondition(input)
  INPUT: input of type SchemaFileOrMigration
  OUTPUT: boolean
  
  RETURN (input.hasCommentedOutTables = true)
         OR (input.hasDuplicateTables = true)
         OR (input.hasIncorrectUniqueKeys = true)
         OR (input.definesComplexRBAC = true)
         OR (NOT input.definesRoleModulesTable = true)
         OR (input.hasIncorrectCasing = true)
         OR (NOT input.definesAllRequiredTables = true)
END FUNCTION
```

### Examples

- **Example 1**: Schema file contains `-- CREATE TABLE Scopes (` (commented out) but also defines `RolePermissions` with FK to `Scopes` → **BUG** (inconsistent state)
- **Example 2**: Schema file defines `DepartmentLeadership` table twice → **BUG** (duplicate definition)
- **Example 3**: All tables use `uk_positions_code` unique key name → **BUG** (should be table-specific like `uk_modules_code`)
- **Example 4**: Schema defines `RolePermissions` but backend uses `requireModule()` middleware → **BUG** (RBAC mismatch)
- **Example 5**: Backend queries `SELECT * FROM RoleModules` but table doesn't exist in schema → **BUG** (missing required table)
- **Example 6**: Backend queries `SELECT * FROM leaveRequests` but schema defines `LeaveRequests` → **BUG** (case mismatch)
- **Edge Case**: Schema has 50+ tables but they are all clean, properly named, and match backend requirements → **NOT A BUG**

## Expected Behavior

### Preservation Requirements

**Unchanged Behaviors:**
- Core table structures (Employees, Departments, Positions, Levels, Users, ShiftDefinitions) must maintain their existing column definitions
- Foreign key relationships between Employees→Departments, Users→Employees, AttendanceLogs→Employees must continue to be enforced
- Attendance tables (AttendanceLogs, AttendanceSummary) must maintain their structure with intentional denormalization for shift snapshots
- Letter-related tables (LetterTemplates, LetterRequests, IssuedLetters, LetterLayoutConfig, LetterApprovers, LetterSigners) must continue to exist
- Employee-related tables (EmployeeAddresses, EmployeeIDDocuments, EmployeeFaceImages, EmployeeShifts, EmployeeLevelHistory) must continue to exist
- Indexes on employee_uuid, date columns, status/active flags must remain for query performance
- Budget year tracking (BudgetYears table) must continue to exist for leave management
- Holiday calendar (Holidays table) must remain for attendance calculations

**Scope:**
All SQL files, migration scripts, and backend queries that do NOT involve RBAC table definitions or deprecated tables should be completely unaffected by this fix. This includes:
- Queries to Employees, Departments, Positions tables
- Attendance tracking and calculation queries
- Leave balance and request management queries
- Letter generation and approval workflows
- User authentication (but not authorization/permissions)

## Hypothesized Root Cause

Based on the bug description and schema analysis, the most likely issues are:

1. **Manual Schema Editing Gone Wrong**: The schema file was manually edited multiple times, with developers commenting out sections instead of removing them cleanly, leading to corruption with commented-out CREATE TABLE statements mixed with active ones.

2. **Failed RBAC System Migration**: An attempt was made to migrate from simple module-level RBAC to complex action-level RBAC (with Actions, RolePermissions tables), but the migration was incomplete or abandoned, leaving the schema in an inconsistent state where it defines the complex system but the backend still uses the simple system.

3. **Copy-Paste Errors**: Unique key names were likely copied from one table definition to another without updating the names, resulting in all tables having `uk_positions_code` instead of proper table-specific names. The duplicate DepartmentLeadership definition suggests copy-paste without proper review.

4. **Case Sensitivity Oversight**: MySQL on Windows is case-insensitive but Linux/Mac are case-sensitive. The schema was likely written on Windows (using PascalCase like `LeaveRequests`) but deployed on Linux where backend queries using lowercase (`leaveRequests`) fail.

5. **Lack of Schema Source Control**: Multiple developers may have created separate schema versions without proper merging, resulting in deprecated tables that are marked but not removed, and conflicting table definitions.

## Correctness Properties

Property 1: Bug Condition - Clean Schema Structure

_For any_ schema file or SQL migration where structural corruption exists (commented-out tables, duplicates, incorrect unique keys, deprecated table markers), the fixed schema file SHALL contain only active table definitions with no commented-out CREATE TABLE statements, each table appearing exactly once, all unique keys properly named following the pattern `uk_{tablename}_{columnname}`, no columns defined more than once in the same table, and no tables marked as "DEPRECATED".

**Validates: Requirements 2.1, 2.2, 2.3, 2.4, 2.5**

Property 2: Bug Condition - Correct RBAC System

_For any_ schema file or SQL migration where RBAC system mismatch exists (defines RolePermissions/Actions instead of RoleModules, or missing RoleModules table), the fixed schema file SHALL define the simple module-level RBAC system with exactly four tables (Modules, Scopes, Roles, RoleModules), the RoleModules table SHALL have columns (uuid, role_uuid, module_uuid, scope_uuid) with proper foreign keys to the other three tables, the Roles table SHALL have a default_scope_uuid column referencing Scopes, and SHALL NOT define RolePermissions, Actions, or any other granular permission tables.

**Validates: Requirements 2.6, 2.7, 2.8, 2.9, 2.10**

Property 3: Bug Condition - Complete Table Definitions

_For any_ schema file or SQL migration where required tables are missing or have incorrect casing, the fixed schema file SHALL define all tables required by backend controllers with correct case-sensitive names matching backend queries, leave-related tables SHALL use lowercase names (leavePolicies, leaveRequests, budgetYears, employeeLeaveBalances instead of PascalCase), and all tables SHALL have proper foreign key constraints, indexes, and column definitions matching backend expectations.

**Validates: Requirements 2.14, 2.15, 2.16**

Property 4: Bug Condition - Working Permission System

_For any_ database operations involving RBAC queries where permission checks fail due to missing or incorrect RBAC tables, the fixed database SHALL allow Super Admin users to successfully access protected routes by querying the RoleModules table, the moduleAuthService.checkModuleAccess() function SHALL successfully query the RoleModules table and return module access information, and the backend SHALL successfully load all RBAC tables on startup without errors.

**Validates: Requirements 2.11, 2.12, 2.13**

Property 5: Preservation - Core Table Structures

_For any_ schema recreation or migration where core functionality tables (Employees, Departments, Positions, Levels, Users, AttendanceLogs, AttendanceSummary, letter-related tables, employee-related tables) are affected, the fixed schema SHALL preserve the same column structure for all these core tables, SHALL maintain foreign key relationships between Employees→Departments, Users→Employees, AttendanceLogs→Employees, and SHALL maintain indexes on employee_uuid, date columns, and status/active flags for query performance.

**Validates: Requirements 3.1, 3.2, 3.3, 3.4, 3.5, 3.6, 3.7, 3.8, 3.9, 3.10**

## Fix Implementation

### Changes Required

Based on the root cause analysis, we need to completely rewrite the schema.sql file with a clean structure:

**File**: `database/schema.sql`

**Approach**: Complete rewrite following strict normalization and naming conventions

**Specific Changes**:

1. **RBAC System Tables** (Simple Module-Level):
   - Create `Modules` table with columns: uuid, code, name, description, icon, display_order, is_active
   - Create `Scopes` table with columns: uuid, code, name, description, level
   - Create `Roles` table with columns: uuid, code, name, description, default_scope_uuid, hierarchy_level, is_system_role, is_active
   - Create `RoleModules` table with columns: uuid, role_uuid, module_uuid, scope_uuid
   - Add proper foreign keys: RoleModules → Roles, Modules, Scopes; Roles → Scopes
   - Remove all references to: RolePermissions, Actions, Permissions, Resources, DataScopes

2. **Organization Structure Tables**:
   - `Departments`: uuid, dept_code, name, parent_uuid, is_active, head_employee_uuid
   - `DepartmentLeadership`: uuid, department_uuid, employee_uuid, effective_from, effective_to (breaks circular dependency)
   - `ShiftDefinitions`: uuid, shift_code, name, start_time, end_time, working_days_json, grace_period_minutes
   - `Positions`: uuid, position_code, title, grade, occupation_type, department_uuid, default_shift_uuid
   - Remove deprecated tables: Occupations, RoleOccupations, OccupationDelegations, EmployeeOccupations

3. **User and Authentication Tables**:
   - `Users`: uuid, employee_uuid, user_type, username, password_hash, refresh_token, token_version, permissions_version, role_uuid, is_active, must_change_password
   - Remove deprecated table: UserScopes (functionality moved to RoleModules with Scopes)
   - Add foreign keys: Users → Employees, Users → Roles

4. **Employee Management Tables**:
   - `Employees`: uuid, mesob_id, title, first_name, middle_name, last_name, mother_name, gender, date_of_birth, nationality, profile_photo_key, tin_number, pension_code, bank_name, bank_account_number, hire_date, prior_gov_service_years, status, attendance_exempt, face_images_registered, position_uuid
   - `EmployeeAddresses`: uuid, employee_uuid, address_type, region, zone, woreda, kebele, house_number, phone_primary, phone_secondary, email
   - `EmployeeIDDocuments`: uuid, employee_uuid, doc_type, id_number, issue_date, valid_until, file_key, original_name, mime_type, file_size
   - `EmployeeFaceImages`: uuid, employee_uuid, image_key, image_number, descriptor_json
   - `EmployeeShifts`: uuid, employee_uuid, shift_uuid, effective_from, effective_to
   - `EmployeeRegistrationDrafts`: uuid, step_completed, draft_json

5. **Compensation Tables**:
   - `Levels`: uuid, level_code, name, description, sort_order, is_active
   - `LevelVersions`: uuid, level_uuid, base_salary, allowances_json, effective_from, effective_to, version_number, notes, created_by_uuid
   - `EmployeeLevelHistory`: uuid, employee_uuid, level_uuid, level_version_uuid, effective_from, effective_to, changed_by_uuid, reason
   - Remove deprecated table: LevelAllowances (consolidated into LevelVersions.allowances_json for optimization)

6. **Attendance System Tables** (Lowercase for backend compatibility):
   - `Holidays`: uuid, holiday_date, holiday_name, calendar_year, calendar_type, is_active, source, description
   - `AttendanceLogs`: uuid, employee_uuid, date, check_in, check_out, state, source
   - `AttendanceSummary`: uuid, employee_uuid, date, status, shift_uuid, shift_name_snapshot, shift_start_time_snapshot, shift_end_time_snapshot, leave_request_uuid, worked_hours, overtime_hours, missing_hours, late_minutes, break_duration_minutes, corrected_by_uuid

7. **Leave Management Tables** (Lowercase for backend compatibility):
   - `leaveTypes`: uuid, code, name, description, requires_documentation, is_active
   - `leavePolicies`: uuid, leave_type_uuid, base_days, increment_per_year, max_days, eligibility_months, use_budget_year
   - `budgetYears`: uuid, year, start_date, end_date, status
   - `employeeLeaveBalances`: uuid, employee_uuid, budget_year_uuid, leave_type_uuid, entitled_days, carried_forward_days, used_days, remaining_days, status
   - `leavePostponements`: uuid, employee_uuid, leave_balance_uuid, postponed_days, reason, status, approved_by_uuid, approved_at
   - `leaveRequests`: uuid, employee_uuid, leave_type_uuid, start_date, end_date, total_days, day_pattern, daily_plan_json, reason, rejection_reason, status, department_approved_by_uuid, department_approved_at, hr_approved_by_uuid, hr_approved_at, cancelled_at, cancelled_by_uuid, original_end_date, actual_return_date, is_shortened, shortened_at, shortened_by_uuid
   - `leaveRequestDocuments`: uuid, leave_request_uuid, employee_uuid, original_name, object_key, mime_type, size_bytes

8. **Letter Management Tables** (PascalCase - backend uses PascalCase for these):
   - `LetterLayoutConfig`: uuid, layout_name, margin_top, margin_bottom, margin_left, margin_right, header_height, footer_height, font_family, font_size, is_active
   - `LetterTemplates`: uuid, template_code, template_name, letter_type, subject_template, body_template, footer_template, required_fields_json, available_variables_json, requires_approval, approval_levels, is_active, layout_config_uuid
   - `LetterRequests`: uuid, employee_uuid, template_uuid, letter_type, subject, body_content, footer_content, request_reason, status, current_approval_level, requested_by_uuid, requested_at, final_approved_by_uuid, final_approved_at, rejected_by_uuid, rejected_at, rejection_reason, issued_letter_uuid
   - `LetterApprovers`: uuid, letter_request_uuid, approver_user_uuid, approval_level, status, approved_at, rejection_reason, comments
   - `LetterSigners`: uuid, template_uuid, signer_name, signer_title, signature_image_key, display_order
   - `IssuedLetters`: uuid, letter_request_uuid, employee_uuid, template_uuid, letter_number, issued_date, content_html, file_key, file_size, issued_by_uuid, invalidated_at, invalidation_reason

9. **Unique Key Naming Convention**:
   - Pattern: `uk_{tablename}_{columnname}` for all unique constraints
   - Example: `uk_modules_code`, `uk_roles_code`, `uk_employees_mesob_id`
   - NOT: `uk_positions_code` on every table

10. **Seed Data** (Insert statements at end of schema):
    - **Modules**: HOME, EMPLOYEES, ORGANIZATION, ATTENDANCE, SHIFTS, LETTERS, LEAVE, ADMIN
    - **Scopes**: ORGANIZATION (level 100), DEPARTMENT (level 50), PERSONAL (level 10)
    - **Roles**: SUPER_ADMIN (hierarchy 100), HR_ADMIN (90), DEPARTMENT_HEAD (70), HR_OFFICER (60), EMPLOYEE (10)
    - **RoleModules** assignments:
      - SUPER_ADMIN: All modules with ORGANIZATION scope
      - HR_ADMIN: All modules except ADMIN with ORGANIZATION scope
      - DEPARTMENT_HEAD: EMPLOYEES, ATTENDANCE, SHIFTS, LEAVE with DEPARTMENT scope
      - HR_OFFICER: EMPLOYEES, LETTERS, LEAVE with ORGANIZATION scope
      - EMPLOYEE: HOME with PERSONAL scope

### File Structure

The new schema.sql will be organized into clear sections:

```
-- ============================================================================
-- DATABASE SCHEMA FOR MESOB HRMS
-- Clean module-level RBAC implementation
-- ============================================================================

-- Section 1: RBAC System (Simple Module-Level)
-- Section 2: Organization Structure
-- Section 3: Users and Authentication
-- Section 4: Employee Management
-- Section 5: Compensation (Levels and Allowances)
-- Section 6: Attendance System
-- Section 7: Leave Management
-- Section 8: Letter Management
-- Section 9: Seed Data (Modules, Scopes, Roles, RoleModules)
```

## Testing Strategy

### Validation Approach

The testing strategy follows a two-phase approach: first, surface counterexamples that demonstrate the bugs in the unfixed schema, then verify the fix works correctly and preserves existing behavior.

### Exploratory Bug Condition Checking

**Goal**: Surface counterexamples that demonstrate the schema bugs BEFORE implementing the fix. Confirm or refute the root cause analysis.

**Test Plan**: Write tests that parse and analyze the current schema.sql file, check for RBAC table definitions, attempt to execute the schema, and verify backend queries. Run these tests on the UNFIXED schema to observe failures and understand the root causes.

**Test Cases**:
1. **Commented-Out Tables Test**: Parse schema.sql and count lines with `-- CREATE TABLE` pattern (will fail on unfixed - finds commented tables)
2. **Duplicate Tables Test**: Parse schema.sql and check for duplicate CREATE TABLE statements for same table name (will fail on unfixed - finds DepartmentLeadership twice)
3. **Unique Key Test**: Parse CREATE TABLE statements and verify all unique keys follow `uk_{tablename}_{columnname}` pattern (will fail on unfixed - finds all `uk_positions_code`)
4. **RBAC Tables Test**: Parse schema.sql and verify RoleModules table exists, RolePermissions does not exist (will fail on unfixed - opposite is true)
5. **Case Sensitivity Test**: Parse schema.sql and verify leave tables use lowercase names (will fail on unfixed - finds PascalCase)
6. **SQL Execution Test**: Attempt to execute schema.sql in test database (will fail on unfixed - syntax errors from duplicates/incorrect FKs)
7. **Backend Query Test**: Execute backend query `SELECT * FROM RoleModules LIMIT 1` (will fail on unfixed - table doesn't exist)
8. **Permission Check Test**: Simulate user login and call `moduleAuthService.checkModuleAccess()` (will fail on unfixed - RoleModules query fails)

**Expected Counterexamples**:
- Schema parser finds at least 3 commented-out CREATE TABLE statements
- Schema parser finds at least 1 duplicate table definition (DepartmentLeadership)
- Schema parser finds 40+ tables with incorrect unique key name `uk_positions_code`
- Schema parser finds RolePermissions table defined but not RoleModules
- SQL execution fails with "Duplicate column" or "Foreign key constraint" errors
- Backend query fails with "Table 'mesob_hrms.RoleModules' doesn't exist"
- Permission check fails with database error instead of returning access decision

**Root Cause Confirmation**:
If these tests fail as expected, it confirms:
1. Manual schema editing gone wrong (commented-out tables)
2. Failed RBAC migration (RolePermissions defined, RoleModules missing)
3. Copy-paste errors (all tables have same unique key name)
4. Case sensitivity oversight (PascalCase vs lowercase mismatch)

If tests don't fail as expected, we will need to re-hypothesize the root causes.

### Fix Checking

**Goal**: Verify that for all schema operations where the bug condition holds, the fixed schema produces the expected behavior.

**Pseudocode:**
```
FOR ALL input WHERE isBugCondition(input) DO
  result := fixedSchema(input)
  ASSERT expectedBehavior(result)
END FOR
```

**Test Cases**:
1. **Clean Structure Test**: Parse fixed schema.sql → no commented-out tables, no duplicates, all unique keys properly named
2. **RBAC System Test**: Parse fixed schema.sql → RoleModules exists, RolePermissions does not exist, all four RBAC tables present
3. **Complete Tables Test**: Parse fixed schema.sql → all required tables exist with correct casing
4. **SQL Execution Test**: Execute fixed schema.sql in clean test database → succeeds without errors
5. **Backend Query Test**: Execute `SELECT * FROM RoleModules` → returns results without error
6. **Permission Check Test**: Call `moduleAuthService.checkModuleAccess()` with SUPER_ADMIN → returns access granted
7. **Seed Data Test**: Query Modules, Scopes, Roles, RoleModules → finds expected seed records

**Success Criteria**:
- Schema parser finds ZERO commented-out CREATE TABLE statements
- Schema parser finds ZERO duplicate table definitions
- Schema parser finds ZERO incorrect unique key names (all follow pattern)
- Schema defines RoleModules, not RolePermissions
- SQL execution completes successfully
- Backend queries succeed and return expected data
- Permission checks work correctly for all roles

### Preservation Checking

**Goal**: Verify that for all schema operations where the bug condition does NOT hold (core table structures, foreign keys, indexes), the fixed schema produces the same result as the desired state.

**Pseudocode:**
```
FOR ALL input WHERE NOT isBugCondition(input) DO
  ASSERT expectedCoreStructure(input) = actualFixedStructure(input)
END FOR
```

**Testing Approach**: Property-based testing is recommended for preservation checking because:
- It generates many test cases automatically across the table definition space
- It catches edge cases that manual unit tests might miss (e.g., obscure FK constraints)
- It provides strong guarantees that core structures are unchanged for all non-buggy tables

**Test Plan**: First document the expected core table structures from requirements (Employees, Departments, Users, etc.), then write property-based tests that verify the fixed schema maintains these exact structures.

**Test Cases**:
1. **Employees Table Structure**: Verify all columns (uuid, mesob_id, first_name, middle_name, last_name, mother_name, gender, date_of_birth, position_uuid, etc.) exist with correct types and constraints
2. **Departments Table Structure**: Verify columns (uuid, dept_code, name, parent_uuid, is_active, head_employee_uuid) exist
3. **Users Table Structure**: Verify columns (uuid, employee_uuid, username, password_hash, role_uuid, is_active) exist
4. **AttendanceLogs Structure**: Verify columns (uuid, employee_uuid, date, check_in, check_out, state) exist
5. **Foreign Key Preservation**: Verify FK constraints exist for Employees→Departments, Users→Employees, AttendanceLogs→Employees, etc.
6. **Index Preservation**: Verify indexes exist on employee_uuid, date, status columns across relevant tables
7. **Leave Tables Preservation**: Verify structure of leaveRequests, employeeLeaveBalances, budgetYears unchanged (except casing)
8. **Letter Tables Preservation**: Verify structure of LetterTemplates, LetterRequests, IssuedLetters unchanged

**Property-Based Test Generators**:
```javascript
// Generate table name variations
forAll(tableNames(['Employees', 'Departments', 'Users', ...]), (tableName) => {
  const schema = parseFixedSchema();
  const table = schema.tables.find(t => t.name === tableName);
  assert(table !== undefined, `Table ${tableName} must exist`);
  assert(table.columns.length > 0, `Table ${tableName} must have columns`);
});

// Generate foreign key relationship checks
forAll(fkRelationships([
  {from: 'Employees', to: 'Departments', column: 'department_uuid'},
  {from: 'Users', to: 'Employees', column: 'employee_uuid'},
  ...
]), (fk) => {
  const schema = parseFixedSchema();
  assert(schema.hasForeignKey(fk.from, fk.to, fk.column));
});
```

### Unit Tests

- Parse schema.sql file and verify structure (no comments, no duplicates, proper naming)
- Parse RBAC table definitions and verify correct tables exist
- Verify each table has expected columns with correct types
- Verify unique constraints follow naming pattern
- Verify foreign key constraints reference correct tables
- Execute schema.sql in test database and verify success
- Query seed data and verify expected modules, scopes, roles exist

### Property-Based Tests

- Generate random table names and verify they exist in fixed schema if required
- Generate random foreign key relationships and verify they are enforced
- Generate random index definitions and verify they exist on expected columns
- Generate random user permissions and verify moduleAuthService returns correct results
- Test case sensitivity: generate queries with various case combinations for leave tables

### Integration Tests

- Full schema execution: Drop test database, execute fixed schema.sql, verify all tables created
- Backend integration: Start backend with fixed schema, call all RBAC APIs, verify success
- Permission flow: Create test user with SUPER_ADMIN role, access protected routes, verify permission checks pass
- Leave management flow: Create leave request using lowercase table name, verify insert succeeds
- Data migration: Export data from old schema, import to fixed schema, verify data integrity maintained

### Manual Testing

After schema deployment:
1. Log in as Super Admin user
2. Navigate to each protected page (Employees, Organization, Attendance, Shifts, Letters, Leave, Admin)
3. Verify navigation succeeds (no permission errors)
4. Create test employee, department, leave request, letter
5. Verify all CRUD operations work
6. Check database logs for any FK constraint errors
7. Run backend test suite against new schema
