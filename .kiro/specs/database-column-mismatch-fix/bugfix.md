# Bugfix Requirements Document

## Introduction

This bugfix addresses critical database SQL query errors that cause authentication and page display failures throughout the HRMS application. After successful login, user pages vanish completely due to SQL errors from missing JOIN clauses, incorrect JOIN ordering, and wrong column naming. These issues stem from queries that don't match the actual database schema.

**Key Schema Facts:**
- `Employees` table HAS BOTH `position_uuid` (FK to Positions) AND `department_uuid` (FK to Departments - direct reference)
- `Positions` table has `department_uuid` (FK to Departments)
- Employees can reference departments EITHER directly via `e.department_uuid` OR via position relationship `e.position_uuid` → `p.department_uuid`

The impact is severe: users cannot access the application after login, making the system effectively unusable. The fix must correct all SQL queries to match the database schema while ensuring existing functionality for correctly-written queries remains unchanged.

## Bug Analysis

### Current Behavior (Defect)

1.1 WHEN a query references `p.department_uuid` without first joining the `Positions` table via `LEFT JOIN Positions p ON p.uuid = e.position_uuid` THEN the system returns SQL error "Unknown column 'p.department_uuid' in field list/on clause" because the table alias `p` does not exist

1.2 WHEN a query joins `Departments` before `Positions` (e.g., `LEFT JOIN Departments d ON d.uuid = p.department_uuid` followed by `LEFT JOIN Positions p`) THEN the system returns SQL error "Unknown column 'p.department_uuid'" because `p` is referenced before it is defined, causing query failure

1.3 WHEN a query references `al.diff_json` in the `AuditLogs` table THEN the system returns SQL error "Unknown column 'al.diff_json' in field list" because the actual column name is `old_values_json`

1.4 WHEN a query uses camelCase timestamp column names like `updatedAt` THEN the system returns SQL error "Unknown column 'updatedAt'" because the database uses snake_case (`updated_at`, `created_at`)

1.5 WHEN any of these SQL errors occur during post-authentication data fetching THEN user pages vanish completely after login, rendering the application unusable

### Expected Behavior (Correct)

2.1 WHEN a query needs to reference department information via the position relationship THEN the system SHALL first join `Positions` via `LEFT JOIN Positions p ON p.uuid = e.position_uuid` BEFORE referencing `p.department_uuid` in subsequent JOINs or WHERE clauses

2.2 WHEN a query needs department data from employees and already uses `e.department_uuid` directly THEN the system SHALL continue using the direct reference (no change needed - this is valid)

2.3 WHEN a query references department via position but uses wrong JOIN order (Departments before Positions) THEN the system SHALL reorder JOINs so Positions is joined BEFORE Departments (enabling `p.department_uuid` reference)

2.4 WHEN a query accesses audit log data THEN the system SHALL reference the correct column name `old_values_json` instead of `diff_json`

2.5 WHEN a query accesses timestamp columns THEN the system SHALL use snake_case column names (`created_at`, `updated_at`) matching the database schema

2.6 WHEN queries use correct column names and JOIN patterns THEN the system SHALL successfully fetch data, allowing pages to display correctly after authentication

### Unchanged Behavior (Regression Prevention)

3.1 WHEN a query already uses `e.department_uuid` directly THEN the system SHALL CONTINUE TO execute the query successfully without modification (direct reference is valid per schema)

3.2 WHEN a query already uses the correct `Positions` JOIN before referencing `p.department_uuid` THEN the system SHALL CONTINUE TO execute successfully without modification

3.3 WHEN a query already uses correct JOIN ordering (any table referenced is joined before being used) THEN the system SHALL CONTINUE TO return correct results without modification

3.4 WHEN a query already uses snake_case column names (`created_at`, `updated_at`, `old_values_json`) THEN the system SHALL CONTINUE TO execute successfully

3.5 WHEN queries do not involve the problematic patterns THEN the system SHALL CONTINUE TO function exactly as before

3.6 WHEN user authentication succeeds and all queries are corrected THEN the system SHALL CONTINUE TO enforce proper authorization and access controls as designed
