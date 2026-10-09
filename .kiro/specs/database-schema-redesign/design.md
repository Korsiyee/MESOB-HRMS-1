# Database Schema Redesign Design Document

## Overview

This design addresses 10 categories of structural defects in the HRMS database schema that violate relational database principles and impact data integrity, performance, and maintainability. The redesign eliminates circular dependencies, consolidates redundant tables, optimizes join depths, standardizes temporal patterns, clarifies sources of truth, justifies denormalization, removes unnecessary junctions, standardizes identifiers, adds explicit constraints, and improves type safety.

**Design Approach:**
- Break circular dependencies through separate temporal assignment tables
- Consolidate single-purpose lookup tables into ENUMs where appropriate
- Reduce maximum join depth from 5 to 3 tables
- Apply consistent temporal patterns (effective_from/effective_to)
- Clarify single source of truth for critical data
- Document all denormalization decisions
- Remove redundant junction tables
- Add human-readable codes to key entities
- Add explicit CHECK constraints
- Strengthen type safety through better ENUM usage

**Impact Assessment:**
- Improved data integrity through elimination of circular dependencies
- Better query performance through reduced join complexity
- Simplified application logic through clearer data models
- Enhanced maintainability through consistent patterns
- Preserved backward compatibility through migration views



## Glossary

- **Bug_Condition (C)**: Schema design patterns that violate database normalization principles, create circular dependencies, add unnecessary complexity, or reduce type safety
- **Property (P)**: The desired schema characteristics - no circular dependencies, maximum 3-table joins, consistent temporal patterns, clear source of truth, justified denormalization, explicit constraints
- **Preservation**: All existing data, query results, application behavior, and performance characteristics that must remain unchanged or improved
- **Circular Dependency**: A foreign key relationship chain where Table A references Table B, which directly or indirectly references Table A, making insert/delete operations impossible without constraint violations
- **Over-normalization**: Excessive table decomposition that requires 4+ joins for common queries, degrading performance without meaningful integrity benefits
- **Source of Truth**: The authoritative table/column for a specific data element, clearly documented so all other representations are derivable
- **Temporal Pattern**: The standard way of tracking historical/versioned data using effective_from and effective_to dates
- **Snapshot Denormalization**: Intentional duplication of reference data at a point in time to preserve historical context when source data may change or be deleted
- **Junction Table**: A many-to-many relationship table that may be unnecessary if the relationship can be represented through direct foreign keys or ENUMs


## Bug Details

### Bug Condition

The database schema contains structural design flaws that manifest across 10 distinct categories. Each category represents a pattern that violates relational database principles or creates unnecessary complexity.

**Formal Specification:**
```
FUNCTION isBugCondition(SchemaElement)
  INPUT: SchemaElement of type (Table, ForeignKey, Column, Relationship)
  OUTPUT: boolean
  
  RETURN (hasCircularForeignKey(SchemaElement) = TRUE)
         OR (isRedundantSinglePurposeTable(SchemaElement) = TRUE)
         OR (maxJoinDepth(SchemaElement) > 3)
         OR (hasInconsistentTemporalPattern(SchemaElement) = TRUE)
         OR (hasAmbiguousSourceOfTruth(SchemaElement) = TRUE)
         OR (hasUnjustifiedDenormalization(SchemaElement) = TRUE)
         OR (hasUnnecessaryJunctionTable(SchemaElement) = TRUE)
         OR (hasInconsistentIdentifierStrategy(SchemaElement) = TRUE)
         OR (hasMissingNullConstraints(SchemaElement) = TRUE)
         OR (hasWeakTypeSafety(SchemaElement) = TRUE)
END FUNCTION
```

### Examples

**Category 1 - Circular Dependency:**
- **Current:** Departments.head_employee_uuid → Employees.uuid, Employees.position_uuid → Positions.uuid, Positions.department_uuid → Departments.uuid (circular chain)
- **Problem:** Cannot create first department with a head, cannot delete departments cleanly
- **Expected:** Separate DepartmentLeadership table to break the cycle

**Category 2 - Redundant Tables:**
- **Current:** Actions table with 7 rows ('VIEW', 'CREATE', 'UPDATE', 'DELETE', 'APPROVE', 'REJECT', 'EXPORT'), each with UUID, indexes, FK constraints
- **Problem:** Entire table infrastructure for fixed enum-like values
- **Expected:** action ENUM('VIEW','CREATE','UPDATE','DELETE','APPROVE','REJECT','EXPORT','MANAGE') in RolePermissions

**Category 3 - Over-normalization:**
- **Current:** Permission check requires 5 joins: Users → Roles → RolePermissions → Modules → Actions → Scopes
- **Problem:** Excessive join overhead for every authorization check
- **Expected:** Maximum 3 joins: Users → Roles → RolePermissions (with scope and action as ENUMs)

**Category 4 - Inconsistent Temporal Patterns:**
- **Current:** EmployeeLevelHistory uses (effective_from, effective_to), EmployeeOccupations uses (assigned_at, expires_at)
- **Problem:** Different column names for same temporal concept
- **Expected:** All temporal tables use consistent (effective_from, effective_to) pattern

**Category 5 - Ambiguous Source of Truth:**
- **Current:** EmployeeOccupations marked "SOURCE OF TRUTH" in comments, but Positions also defines job function
- **Problem:** Unclear which table is authoritative for employee job definition
- **Expected:** Single clear source documented: Position defines organizational role, remove redundant EmployeeOccupations

**Category 6 - Unjustified Denormalization:**
- **Current:** AttendanceSummary stores shift_name_snapshot, shift_start_time_snapshot, shift_end_time_snapshot
- **Problem:** Denormalization exists but justification unclear (can retrieve via temporal join)
- **Expected:** Document reason ("Shifts can be deleted; attendance must preserve original details for payroll audit") OR remove if unjustified

**Category 7 - Unnecessary Junction:**
- **Current:** RoleOccupations creates many-to-many between Roles and Occupations with tracking metadata
- **Problem:** Adds complexity when occupation could be role attribute
- **Expected:** Evaluate if junction provides value; if not, make occupation a direct Role attribute

**Category 8 - Inconsistent Identifiers:**
- **Current:** Departments has uuid but no human-readable code; Levels has uuid but no level_code
- **Problem:** Users must reference entities by UUID instead of memorable codes
- **Expected:** Add dept_code VARCHAR(50) UNIQUE to Departments, level_code to Levels

**Category 9 - Missing NULL Constraints:**
- **Current:** UserScopes.scope_value is VARCHAR(36) DEFAULT NULL, but DEPARTMENT scope requires non-null value
- **Problem:** Schema cannot enforce scope_type-dependent null constraints
- **Expected:** ADD CHECK (scope_type NOT IN ('DEPARTMENT','BRANCH') OR scope_value IS NOT NULL)

**Category 10 - Weak Type Safety:**
- **Current:** LeaveRequests.status has 8 ENUM values encoding workflow: 'PENDING', 'PENDING_DEPARTMENT', 'PENDING_HR', 'APPROVED', 'REJECTED', 'REJECTED_DEPARTMENT', 'REJECTED_HR', 'CANCELLED'
- **Problem:** Complex workflow state embedded in single ENUM
- **Expected:** Simplified ENUM('DRAFT','PENDING','APPROVED','REJECTED','CANCELLED') + separate workflow tracking if needed


## Expected Behavior

### Preservation Requirements

**Unchanged Behaviors:**
- All existing data must be preserved through migration with zero data loss
- Query results for employee data, permissions, attendance, leave balances must remain semantically identical
- Application authorization decisions (GRANTED/DENIED) must not change for existing permission configurations
- Temporal queries (employee level at date X, shift at date Y) must return same historical accuracy
- Foreign key cascading behavior for parent-child relationships must be maintained
- ACID transaction properties for multi-entity operations must be preserved
- Audit trail completeness must be maintained (no historical audit data lost)
- Query performance must be maintained or improved for critical paths

**Scope:**
All queries and operations that do NOT directly involve the buggy schema patterns (circular dependencies, redundant table joins, ambiguous sources) should be completely unaffected by this redesign. This includes:
- Simple employee lookups by name or ID
- Department hierarchies (parent-child navigation)
- Holiday calendar queries
- Document storage/retrieval operations
- Notification delivery logic
- Audit log queries
- Organization configuration access


## Hypothesized Root Cause

Based on the comprehensive schema analysis, the root causes of these design flaws are:

1. **Premature Optimization of Lookup Tables**: The schema over-applies the "separate table for lookup values" pattern without considering that some values are fixed system constants that would be better represented as ENUMs. This creates the Actions, Scopes, and potentially LeaveTypes/Modules redundancy.

2. **Insufficient Planning for Insert Order**: The Departments ↔ Employees circular dependency suggests the schema was designed without careful consideration of entity creation order. The designer likely added head_employee_uuid to Departments after Employees already referenced Departments through Positions, creating the cycle.

3. **Inconsistent Normalization Philosophy**: The schema oscillates between over-normalization (5-table joins for permissions) and under-normalization (snapshot fields in AttendanceSummary). This suggests multiple developers or design iterations without a unified normalization strategy.

4. **Lack of Temporal Pattern Standards**: Different temporal tracking approaches (effective_from/effective_to vs assigned_at/expires_at) indicate the absence of a documented standard for historical data modeling when the schema was created.

5. **Unclear Requirements for Source of Truth**: The overlap between EmployeeOccupations and Positions suggests unclear requirements about what "occupation" vs "position" means in the business domain, leading to redundant structures.

6. **Defensive Junction Table Creation**: RoleOccupations appears to be a "just in case" junction table created without clear many-to-many use cases, possibly anticipating future flexibility that may never be needed.

7. **Incomplete Human-Readable Identifier Strategy**: The pattern of adding {entity}_code fields was started (Occupations.code, Modules.code) but not completed consistently across all major entities (Departments, Levels, Positions lack codes).

8. **Schema-Level Validation Gaps**: Missing CHECK constraints for conditional NOT NULL requirements (e.g., scope_value based on scope_type) suggest reliance on application-level validation instead of database enforcement.


## Correctness Properties

Property 1: Bug Condition - Schema Design Correctness

_For any_ schema element where the bug condition holds (isBugCondition returns true), the redesigned schema SHALL eliminate circular dependencies, consolidate redundant tables into ENUMs where appropriate, reduce maximum join depth to 3 tables, apply consistent temporal patterns, establish clear sources of truth, justify all denormalization with documentation, eliminate unnecessary junction tables, add human-readable codes to key entities, enforce conditional NULL constraints through CHECK constraints, and strengthen type safety through appropriate ENUM usage.

**Validates: Requirements 2.1-2.26**

Property 2: Preservation - Data and Query Behavior

_For any_ query or operation that does NOT directly involve the buggy schema patterns (circular dependencies, redundant lookup joins, ambiguous sources), the redesigned schema SHALL produce exactly the same semantic results, maintain or improve query performance, preserve foreign key cascading behavior, maintain ACID transaction properties, and preserve complete audit trail history.

**Validates: Requirements 3.1-3.17**


## Fix Implementation

### Category 1: Break Circular Dependencies

**Problem:** Departments.head_employee_uuid → Employees → Position → Departments creates impossible insert/delete scenarios

**Solution:** Create DepartmentLeadership temporal assignment table

**DDL Changes:**

```sql
-- Remove circular FK from Departments table
ALTER TABLE Departments 
  DROP FOREIGN KEY fk_departments_head,
  DROP COLUMN head_employee_uuid,
  DROP INDEX idx_departments_head;

-- Create new temporal leadership assignment table
CREATE TABLE DepartmentLeadership (
  uuid VARCHAR(36) NOT NULL,
  department_uuid VARCHAR(36) NOT NULL,
  employee_uuid VARCHAR(36) NOT NULL,
  effective_from DATE NOT NULL,
  effective_to DATE DEFAULT NULL COMMENT 'NULL means currently active',
  assigned_by_uuid VARCHAR(36) DEFAULT NULL,
  assignment_reason TEXT DEFAULT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP(),
  PRIMARY KEY (uuid),
  KEY idx_dept_leadership_department (department_uuid),
  KEY idx_dept_leadership_employee (employee_uuid),
  KEY idx_dept_leadership_effective (department_uuid, effective_from, effective_to),
  KEY idx_dept_leadership_current (department_uuid, effective_to),
  KEY idx_dept_leadership_assigned_by (assigned_by_uuid),
  CONSTRAINT fk_dept_leadership_department 
    FOREIGN KEY (department_uuid) REFERENCES Departments(uuid) ON DELETE CASCADE,
  CONSTRAINT fk_dept_leadership_employee 
    FOREIGN KEY (employee_uuid) REFERENCES Employees(uuid) ON DELETE CASCADE,
  CONSTRAINT fk_dept_leadership_assigned_by 
    FOREIGN KEY (assigned_by_uuid) REFERENCES Users(uuid) ON DELETE SET NULL,
  CONSTRAINT chk_dept_leadership_dates 
    CHECK (effective_to IS NULL OR effective_to >= effective_from)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
COMMENT='Temporal department head assignments - breaks circular dependency';
```

**Migration Script:**

```sql
-- Migrate existing department heads to new table
INSERT INTO DepartmentLeadership (
  uuid, department_uuid, employee_uuid, effective_from, effective_to
)
SELECT 
  UUID(),
  d.uuid,
  d.head_employee_uuid,
  COALESCE(e.hire_date, CURDATE()),
  NULL
FROM Departments d
WHERE d.head_employee_uuid IS NOT NULL
  AND EXISTS (SELECT 1 FROM Employees e WHERE e.uuid = d.head_employee_uuid);
```

**Impact:**
- ✅ Eliminates circular dependency
- ✅ Enables clean department creation without head
- ✅ Provides temporal history of leadership changes
- ✅ Consistent with other temporal patterns

**Application Changes Required:**
- Update queries that access `Departments.head_employee_uuid` to join DepartmentLeadership with `effective_to IS NULL`
- Update department head assignment logic to insert into DepartmentLeadership instead of updating Departments


### Category 2: Consolidate Redundant Single-Purpose Tables

**Problem:** Actions, Scopes, LeaveTypes, Modules tables store fixed enum-like values with full table infrastructure

**Solution:** Convert to ENUMs for fixed values, keep tables only if user-extensible

#### 2.1: Convert Actions Table to ENUM

**DDL Changes:**

```sql
-- Add new action column to RolePermissions
ALTER TABLE RolePermissions 
  ADD COLUMN action ENUM('VIEW','CREATE','UPDATE','DELETE','APPROVE','REJECT','EXPORT','MANAGE') NOT NULL 
  AFTER module_uuid;

-- Migrate data from Actions table UUID to ENUM
UPDATE RolePermissions rp
INNER JOIN Actions a ON rp.action_uuid = a.uuid
SET rp.action = a.code;

-- Drop old FK and column
ALTER TABLE RolePermissions 
  DROP FOREIGN KEY fk_rp_action,
  DROP INDEX idx_rp_action,
  DROP COLUMN action_uuid;

-- Drop Actions table
DROP TABLE Actions;
```

**Rationale:** Actions are fixed system constants (never user-defined), referenced in application code, never dynamically added

#### 2.2: Convert Scopes Table to ENUM

**DDL Changes:**

```sql
-- Add new scope column to RolePermissions
ALTER TABLE RolePermissions 
  ADD COLUMN scope ENUM('SELF','DEPARTMENT','BRANCH','COMPANY','ALL') NOT NULL 
  AFTER action;

-- Migrate data
UPDATE RolePermissions rp
INNER JOIN Scopes s ON rp.scope_uuid = s.uuid
SET rp.scope = s.code;

-- Drop old FK and column
ALTER TABLE RolePermissions 
  DROP FOREIGN KEY fk_rp_scope,
  DROP INDEX idx_rp_scope,
  DROP COLUMN scope_uuid;

-- Update UserScopes table similarly
ALTER TABLE UserScopes 
  ADD COLUMN scope ENUM('SELF','DEPARTMENT','BRANCH','COMPANY','ALL') NOT NULL
  AFTER user_uuid;

UPDATE UserScopes SET scope = scope_type;

ALTER TABLE UserScopes DROP COLUMN scope_type;

-- Drop Scopes table
DROP TABLE Scopes;
```

**Rationale:** Scopes are fixed authorization levels, never dynamically extended

#### 2.3: Evaluate LeaveTypes Table (KEEP)

**Decision:** KEEP LeaveTypes table

**Rationale:**
- Leave types may be country/organization-specific (Ethiopian context may have unique types)
- Organizations may need to add custom leave categories (Study Leave, Pilgrimage, etc.)
- requires_documentation flag provides per-type configuration
- User-extensible at admin level is a reasonable feature

**Optimization:**

```sql
-- Add human-readable code for better referencing
ALTER TABLE LeaveTypes 
  ADD COLUMN sort_order INT NOT NULL DEFAULT 0 AFTER description,
  ADD INDEX idx_leave_types_sort_order (sort_order);
```

#### 2.4: Evaluate Modules Table (KEEP with Enhancement)

**Decision:** KEEP Modules table

**Rationale:**
- System may support plugin/extension modules in future
- Module metadata (icon, display_order, is_active) provides UI configuration
- Central registry of modules useful for permission management UI

**Enhancement:**

```sql
-- Add explicit module type to distinguish core vs extensions
ALTER TABLE Modules 
  ADD COLUMN module_type ENUM('CORE','PLUGIN','CUSTOM') NOT NULL DEFAULT 'CORE' 
  AFTER name;

-- Mark current modules as CORE
UPDATE Modules SET module_type = 'CORE';
```

**Impact:**
- ✅ Reduces RolePermissions join depth from 5 to 3 tables (User → Role → RolePermissions)
- ✅ Eliminates redundant table infrastructure for fixed values
- ✅ Retains extensibility where appropriate (LeaveTypes, Modules)
- ✅ 40% reduction in permission check join operations


### Category 3: Optimize Over-normalized Structures

**Problem:** Permission checks require 5 joins, compensation queries require 4 joins

**Solution:** Already addressed in Category 2 for permissions. Now optimize compensation structure.

#### 3.1: Optimize Compensation Query Path

**Current Join Chain:** Employee → EmployeeLevelHistory → LevelVersions → LevelAllowances → Levels

**Optimized Approach 1: JSON Allowances (Preferred for read-heavy workload)**

```sql
-- Add allowances JSON column to LevelVersions
ALTER TABLE LevelVersions 
  ADD COLUMN allowances_json JSON DEFAULT NULL COMMENT 'Embedded allowances for this version'
  AFTER base_salary;

-- Migrate allowances to JSON
UPDATE LevelVersions lv
SET allowances_json = (
  SELECT JSON_ARRAYAGG(
    JSON_OBJECT(
      'type', allowance_type,
      'name', allowance_name,
      'amount', amount,
      'is_taxable', is_taxable,
      'description', description
    )
  )
  FROM LevelAllowances
  WHERE level_version_uuid = lv.uuid
);

-- Drop LevelAllowances table (after verification)
-- DROP TABLE LevelAllowances;
```

**Optimized Approach 2: Materialized View (Alternative for complex aggregations)**

```sql
-- Create materialized view for current compensation
CREATE TABLE EmployeeCurrentCompensation (
  employee_uuid VARCHAR(36) NOT NULL,
  level_uuid VARCHAR(36) NOT NULL,
  level_name VARCHAR(200) NOT NULL,
  base_salary DECIMAL(15,2) NOT NULL,
  total_allowances DECIMAL(15,2) NOT NULL,
  total_compensation DECIMAL(15,2) NOT NULL,
  effective_from DATE NOT NULL,
  last_updated DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP() ON UPDATE CURRENT_TIMESTAMP(),
  PRIMARY KEY (employee_uuid),
  KEY idx_comp_level (level_uuid),
  KEY idx_comp_updated (last_updated)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
COMMENT='Materialized view of current employee compensation for fast queries';

-- Trigger to update on EmployeeLevelHistory changes
DELIMITER $$
CREATE TRIGGER trg_update_comp_on_level_change
AFTER INSERT ON EmployeeLevelHistory
FOR EACH ROW
BEGIN
  IF NEW.effective_to IS NULL THEN
    INSERT INTO EmployeeCurrentCompensation (
      employee_uuid, level_uuid, level_name, base_salary, 
      total_allowances, total_compensation, effective_from
    )
    SELECT 
      NEW.employee_uuid,
      l.uuid,
      l.name,
      lv.base_salary,
      COALESCE(SUM(la.amount), 0),
      lv.base_salary + COALESCE(SUM(la.amount), 0),
      NEW.effective_from
    FROM Levels l
    INNER JOIN LevelVersions lv ON l.uuid = lv.level_uuid
    LEFT JOIN LevelAllowances la ON lv.uuid = la.level_version_uuid
    WHERE lv.uuid = NEW.level_version_uuid
    GROUP BY l.uuid, l.name, lv.base_salary
    ON DUPLICATE KEY UPDATE
      level_uuid = VALUES(level_uuid),
      level_name = VALUES(level_name),
      base_salary = VALUES(base_salary),
      total_allowances = VALUES(total_allowances),
      total_compensation = VALUES(total_compensation),
      effective_from = VALUES(effective_from);
  END IF;
END$$
DELIMITER ;
```

**Recommendation:** Use JSON approach (Approach 1) because:
- Allowances rarely change independently of level versions
- Typical query: "Show me employee's current salary and allowances" (read-heavy)
- JSON reduces joins from 4 to 2: Employee → EmployeeLevelHistory → LevelVersions
- Simpler maintenance than materialized views

**Impact:**
- ✅ Reduces compensation query joins from 4 to 2 tables (50% reduction)
- ✅ Improves query performance for salary display and reports
- ✅ Maintains full historical accuracy through versioning
- ⚠️ Trade-off: Allowance queries across versions less flexible (acceptable for read-heavy pattern)


### Category 4: Standardize Temporal Patterns

**Problem:** Inconsistent temporal column naming (effective_from/effective_to vs assigned_at/expires_at)

**Solution:** Standardize all temporal tables to use effective_from/effective_to pattern

#### 4.1: Standardize EmployeeOccupations Temporal Columns

```sql
-- Rename columns for consistency
ALTER TABLE EmployeeOccupations 
  CHANGE COLUMN assigned_at effective_from DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP(),
  CHANGE COLUMN expires_at effective_to DATETIME DEFAULT NULL 
    COMMENT 'NULL means currently active';

-- Update check constraint if exists
ALTER TABLE EmployeeOccupations 
  ADD CONSTRAINT chk_employee_occupations_dates 
  CHECK (effective_to IS NULL OR effective_to >= effective_from);

-- Update indexes for consistent naming
ALTER TABLE EmployeeOccupations 
  DROP INDEX IF EXISTS idx_employee_occupations_expires,
  ADD INDEX idx_employee_occupations_effective (employee_uuid, effective_from, effective_to),
  ADD INDEX idx_employee_occupations_current (employee_uuid, effective_to);
```

#### 4.2: Standardize OccupationDelegations

```sql
-- Already uses start_date/end_date, standardize to effective pattern
ALTER TABLE OccupationDelegations 
  CHANGE COLUMN start_date effective_from DATETIME NOT NULL,
  CHANGE COLUMN end_date effective_to DATETIME NOT NULL;

-- Update check constraint
ALTER TABLE OccupationDelegations 
  DROP CONSTRAINT IF EXISTS chk_delegations_dates,
  ADD CONSTRAINT chk_delegations_dates 
  CHECK (effective_to > effective_from);
```

#### 4.3: Document Standard Temporal Pattern

**Standard Pattern Documentation:**

All temporal/historical tracking tables SHALL use:
- `effective_from` (DATE or DATETIME NOT NULL): Start of validity period
- `effective_to` (DATE or DATETIME DEFAULT NULL): End of validity period
  - NULL means "currently active" / "no end date"
  - Non-NULL means historical record
- CHECK constraint: `effective_to IS NULL OR effective_to >= effective_from`
- Index pattern: `(entity_uuid, effective_from, effective_to)` for range queries
- Index pattern: `(entity_uuid, effective_to)` for current record queries (WHERE effective_to IS NULL)

**Tables Using Standard Temporal Pattern (After Fixes):**
- EmployeeLevelHistory ✅
- EmployeeShifts ✅
- LevelVersions ✅
- DepartmentLeadership ✅ (new)
- EmployeeOccupations ✅ (standardized)
- OccupationDelegations ✅ (standardized)

**Impact:**
- ✅ Consistent temporal query patterns across all tables
- ✅ Easier for developers to learn and use (one pattern, not multiple)
- ✅ Simplified query logic for "current" vs "historical" records
- ✅ Foundation for generic temporal query utilities


### Category 5: Clarify Source of Truth

**Problem:** EmployeeOccupations overlaps with Position.title; unclear which defines employee job function

**Solution:** Consolidate or clearly differentiate the two concepts

#### 5.1: Analyze the Semantic Difference

**Position (Organizational View):**
- Position is an organizational slot: "Senior Accountant in Finance Department"
- Tied to department structure and organizational chart
- Determines reporting lines and organizational hierarchy
- Relatively stable (positions exist even when vacant)

**Occupation (Professional View - IF NEEDED):**
- Occupation is professional classification: "Certified Public Accountant"
- Independent of organizational structure
- Used for professional development, certification tracking, skills taxonomy
- Employee may have multiple professional qualifications

**Decision Matrix:**

| Scenario | Action |
|----------|--------|
| Organization only needs organizational roles | Remove EmployeeOccupations, use Position only |
| Organization tracks professional certifications separately | Keep both, clarify purpose |
| System uses occupations for role-based permissions | Indicates confusion - permissions should use Roles, not Occupations |

#### 5.2: Recommended Solution - Remove EmployeeOccupations

**Rationale:**
- RoleOccupations junction suggests occupations drive permissions, but Roles already handle this
- Position.title already provides job function definition
- No clear business case for separate professional classification in requirements
- Simpler model: Employee → Position → Role

**DDL Changes:**

```sql
-- Check if EmployeeOccupations is actually used for anything beyond Position
-- If not, migrate any unique occupation data to Employee notes or Position description

-- Drop EmployeeOccupations table
DROP TABLE IF EXISTS EmployeeOccupations;

-- Drop RoleOccupations junction (also unnecessary)
DROP TABLE IF EXISTS RoleOccupations;

-- Drop Occupations table
DROP TABLE IF EXISTS Occupations;
```

**Alternative Solution - Keep with Clear Differentiation (if business justifies)**

If professional classification is required:

```sql
-- Rename table to clarify purpose
RENAME TABLE EmployeeOccupations TO EmployeeProfessionalCertifications;

-- Add certification-specific fields
ALTER TABLE EmployeeProfessionalCertifications
  ADD COLUMN certification_number VARCHAR(100) DEFAULT NULL,
  ADD COLUMN issued_by VARCHAR(200) DEFAULT NULL,
  ADD COLUMN certification_date DATE DEFAULT NULL,
  ADD COLUMN expiry_date DATE DEFAULT NULL;

-- Update documentation
ALTER TABLE EmployeeProfessionalCertifications 
  COMMENT='Professional certifications and qualifications - NOT organizational position';

-- Rename Occupations to clarify
RENAME TABLE Occupations TO ProfessionalCertifications;

ALTER TABLE ProfessionalCertifications
  COMMENT='Professional certification types (CPA, PE, MD, etc.) - distinct from organizational positions';
```

**Documented Source of Truth (After Fix):**

| Data Element | Source of Truth | Documentation |
|--------------|-----------------|---------------|
| Employee organizational role | Employees.position_uuid → Positions.title | Position defines job within org structure |
| Employee department | Position.department_uuid → Departments.name | Department derived from position |
| Employee work authorization | Users.role_uuid → Roles → RolePermissions | Permissions based on system role |
| Employee compensation level | EmployeeLevelHistory (current: effective_to IS NULL) | Level determines salary/allowances |
| Employee professional certifications | Removed (not needed) OR EmployeeProfessionalCertifications (if kept) | Optional: professional qualifications |

**Impact:**
- ✅ Eliminates ambiguity about job function definition
- ✅ Removes unnecessary tables (3 tables dropped if occupation not needed)
- ✅ Clarifies that Roles (not Occupations) drive permissions
- ✅ Simpler application logic for employee job information


### Category 6: Justify or Remove Denormalization

**Problem:** AttendanceSummary denormalizes shift details without clear justification

**Solution:** Document justification if valid, otherwise remove denormalization

#### 6.1: Evaluate AttendanceSummary Shift Snapshots

**Current Denormalization:**
- shift_name_snapshot
- shift_start_time_snapshot
- shift_end_time_snapshot

**Analysis:**

| Factor | Justification |
|--------|---------------|
| Can shift definitions be deleted? | Yes - old shifts may be retired |
| Can shift times change? | Yes - work hours may adjust |
| Is attendance legally binding? | Yes - for payroll and labor law compliance |
| Can we reconstruct from EmployeeShifts? | Only if EmployeeShifts has effective dates overlapping attendance date |
| Risk of missing data? | High - if shift deleted or EmployeeShifts record missing |

**Decision: KEEP denormalization with enhanced documentation**

**DDL Changes:**

```sql
-- Enhance documentation
ALTER TABLE AttendanceSummary 
  COMMENT='Daily attendance summary with shift snapshots for immutability. 
  DENORMALIZATION JUSTIFICATION: Shift definitions may change or be deleted; 
  attendance records are legal documents for payroll and must preserve exact 
  shift details at time of attendance for audit trail and labor law compliance.';

-- Add NOT NULL constraints (if attendance recorded, shift must be captured)
ALTER TABLE AttendanceSummary 
  MODIFY COLUMN shift_name_snapshot VARCHAR(100) DEFAULT NULL 
    COMMENT 'IMMUTABLE: Shift name at attendance time (preserved even if shift deleted)',
  MODIFY COLUMN shift_start_time_snapshot TIME DEFAULT NULL 
    COMMENT 'IMMUTABLE: Shift start time at attendance time (preserved even if shift modified)',
  MODIFY COLUMN shift_end_time_snapshot TIME DEFAULT NULL 
    COMMENT 'IMMUTABLE: Shift end time at attendance time (preserved even if shift modified)';

-- Add check: if status is PRESENT/LATE, shift snapshots must exist
ALTER TABLE AttendanceSummary 
  ADD CONSTRAINT chk_attendance_shift_snapshot 
  CHECK (
    status IN ('ABSENT','ON_LEAVE') 
    OR (shift_name_snapshot IS NOT NULL 
        AND shift_start_time_snapshot IS NOT NULL 
        AND shift_end_time_snapshot IS NOT NULL)
  );
```

#### 6.2: Evaluate Polymorphic References in Notifications

**Current Pattern:**
```sql
entity_type VARCHAR(50)
entity_uuid VARCHAR(50)
```

**Problem:** No referential integrity, can reference deleted/invalid entities

**Solution: Accept pattern but add validation**

```sql
-- Add ENUM constraint for known entity types
ALTER TABLE Notifications 
  MODIFY COLUMN entity_type 
  ENUM('LEAVE_REQUEST','EMPLOYEE','ATTENDANCE','LETTER_REQUEST','DELEGATION','OTHER') 
  DEFAULT NULL;

-- Add documentation
ALTER TABLE Notifications 
  COMMENT='User notifications with polymorphic entity references. 
  REFERENTIAL INTEGRITY TRADE-OFF: entity_uuid is not FK-constrained for flexibility 
  across entity types. Application must validate entity existence before creating notification.';

-- Similar for AuditLogs
ALTER TABLE AuditLogs 
  MODIFY COLUMN entity_type VARCHAR(100) DEFAULT NULL 
  COMMENT='Entity type - not FK constrained to allow flexible auditing',
  COMMENT='General audit trail. Entity references are not FK-constrained for flexibility. 
  Use AccessAuditLogs for security-critical access control auditing with stronger typing.';
```

**Impact:**
- ✅ AttendanceSummary denormalization justified and documented for legal compliance
- ✅ Polymorphic references accepted with clear documentation of trade-off
- ✅ Added constraints to prevent NULL inconsistencies
- ✅ Pattern consistency: denormalization allowed only with explicit justification


### Category 7: Remove Unnecessary Junction Tables

**Problem:** RoleOccupations creates many-to-many without clear use case

**Solution:** Already addressed in Category 5 - remove RoleOccupations and Occupations tables entirely

**Additional Analysis:**

**RoleOccupations Junction:**
- Original intent: Map roles to occupations for permission derivation
- Reality: Permissions come from RolePermissions, not occupations
- Conclusion: Junction serves no purpose if occupations removed

**EmployeeOccupations Junction:**
- If occupations removed (per Category 5), this junction also removed
- If occupations kept as professional certifications, rename and keep

**Final Table Structure After Junction Cleanup:**

**Removed Tables:**
- ~~Actions~~ (converted to ENUM)
- ~~Scopes~~ (converted to ENUM)
- ~~Occupations~~ (redundant with Positions)
- ~~RoleOccupations~~ (unnecessary junction)
- ~~EmployeeOccupations~~ (redundant with Positions)

**Retained Junctions (still valid):**
- UserScopes: Valid - users can have scope assignments beyond role defaults
- EmployeeLevelHistory: Not a junction, temporal history - valid
- EmployeeShifts: Not a junction, temporal history - valid
- DepartmentLeadership: Not a junction, temporal assignment - valid (new)

**Impact:**
- ✅ 5 tables eliminated from schema (10% reduction)
- ✅ Simplified permission model (no occupation confusion)
- ✅ Clearer data model with justified relationships only
- ✅ Reduced foreign key constraint overhead


### Category 8: Standardize Identifiers

**Problem:** Inconsistent application of human-readable codes across entities

**Solution:** Add {entity}_code pattern to all major entities that users reference

#### 8.1: Add Human-Readable Codes

```sql
-- Departments: Add dept_code
ALTER TABLE Departments 
  ADD COLUMN dept_code VARCHAR(50) UNIQUE DEFAULT NULL 
    COMMENT 'Human-readable department code (e.g., FIN, HR, IT)' 
    AFTER uuid,
  ADD UNIQUE KEY uk_departments_code (dept_code);

-- Update documentation
ALTER TABLE Departments 
  COMMENT='Organizational departments with hierarchical structure. 
  dept_code provides human-readable reference (e.g., reports, user communication).';

-- Levels: Add level_code
ALTER TABLE Levels 
  ADD COLUMN level_code VARCHAR(50) UNIQUE DEFAULT NULL 
    COMMENT 'Human-readable level code (e.g., L1, L2, MGR1)' 
    AFTER uuid,
  ADD UNIQUE KEY uk_levels_code (level_code);

-- Positions: Add position_code
ALTER TABLE Positions 
  ADD COLUMN position_code VARCHAR(50) UNIQUE DEFAULT NULL 
    COMMENT 'Human-readable position code (e.g., FIN-ACCT-01)' 
    AFTER uuid,
  ADD UNIQUE KEY uk_positions_code (position_code);

-- Roles: Add role_code (already has code field, ensure UNIQUE)
-- (Already exists as Roles.code with UNIQUE constraint - no change needed)

-- ShiftDefinitions: Add shift_code
ALTER TABLE ShiftDefinitions 
  ADD COLUMN shift_code VARCHAR(50) UNIQUE DEFAULT NULL 
    COMMENT 'Human-readable shift code (e.g., DAY, NIGHT, FLEX)' 
    AFTER uuid,
  ADD UNIQUE KEY uk_shifts_code (shift_code);
```

#### 8.2: Document Identifier Strategy

**Primary Key Strategy:**
- UUID (VARCHAR(36)) for all entity tables
- Stable across environments (dev, staging, prod)
- Enables distributed system integration
- No sequential exposure of record counts

**Human-Readable Code Strategy:**
- {entity}_code VARCHAR(50) UNIQUE for user-facing entities
- Optional (DEFAULT NULL) to allow system-generated entities
- Business-defined values (e.g., "FIN" for Finance, "L5" for Level 5)
- Used in reports, user interfaces, and business communications

**Auto-Increment Strategy:**
- INT AUTO_INCREMENT only for true sequences
- Examples: MesobIdSequence, LetterReferenceSequence
- NOT used for entity primary keys

**Entities with Codes (After Standardization):**

| Table | UUID (PK) | Human-Readable Code | Example Code |
|-------|-----------|---------------------|--------------|
| Departments | uuid | dept_code | FIN, HR, IT, ADMIN |
| Positions | uuid | position_code | FIN-ACCT-001, HR-MGR-001 |
| Levels | uuid | level_code | L1, L2, L3, MGR1, DIR1 |
| Roles | uuid | code (existing) | SUPER_ADMIN, HR_ADMIN, EMPLOYEE |
| ShiftDefinitions | uuid | shift_code | DAY, NIGHT, EVENING, FLEX |
| Modules | uuid | code (existing) | EMPLOYEE, LEAVE, ATTENDANCE |
| LeaveTypes | uuid | code (existing) | ANNUAL, SICK, MATERNITY |

**Impact:**
- ✅ Consistent identifier strategy across all major entities
- ✅ Improved usability (users reference "FIN dept" not "a3b2c1...")
- ✅ Better reporting (codes appear in exports and printed documents)
- ✅ Easier troubleshooting (logs show meaningful codes)
- ⚠️ Migration: existing records have NULL codes until populated by admin


### Category 9: Add Explicit Constraints

**Problem:** Conditional NULL requirements not enforced at schema level

**Solution:** Add CHECK constraints for business rules

#### 9.1: UserScopes Conditional NOT NULL

```sql
-- Enforce: DEPARTMENT and BRANCH scopes require scope_value
ALTER TABLE UserScopes 
  ADD CONSTRAINT chk_user_scopes_value_required 
  CHECK (
    scope NOT IN ('DEPARTMENT','BRANCH') 
    OR scope_value IS NOT NULL
  );

-- Enforce: SELF, COMPANY, ALL scopes should NOT have scope_value
ALTER TABLE UserScopes 
  ADD CONSTRAINT chk_user_scopes_value_forbidden 
  CHECK (
    scope IN ('DEPARTMENT','BRANCH')
    OR scope_value IS NULL
  );

-- Add documentation
ALTER TABLE UserScopes 
  COMMENT='Additional scope assignments for users beyond role defaults. 
  CONSTRAINT: DEPARTMENT/BRANCH scopes require scope_value (department/branch UUID). 
  SELF/COMPANY/ALL scopes must have NULL scope_value.';
```

#### 9.2: Users.employee_uuid Clarity

```sql
-- Add user_type to clarify when employee_uuid is expected
ALTER TABLE Users 
  ADD COLUMN user_type ENUM('EMPLOYEE','SYSTEM','ADMIN') NOT NULL DEFAULT 'EMPLOYEE' 
  AFTER uuid;

-- Enforce: EMPLOYEE users must have employee_uuid
ALTER TABLE Users 
  ADD CONSTRAINT chk_users_employee_link 
  CHECK (
    user_type != 'EMPLOYEE' 
    OR employee_uuid IS NOT NULL
  );

-- Update existing records
UPDATE Users SET user_type = 'SYSTEM' WHERE employee_uuid IS NULL AND username IN ('admin', 'system');
UPDATE Users SET user_type = 'EMPLOYEE' WHERE employee_uuid IS NOT NULL;

-- Update documentation
ALTER TABLE Users 
  COMMENT='System users with authentication. 
  user_type: EMPLOYEE (must have employee_uuid), SYSTEM (no employee link), ADMIN (optional employee link).';
```

#### 9.3: Departments.head Assignment Tracking

Since we moved head to DepartmentLeadership, the issue is resolved structurally. But we can add a view to monitor departments without heads:

```sql
-- Create view for departments missing leadership
CREATE OR REPLACE VIEW vw_departments_without_head AS
SELECT 
  d.uuid,
  d.dept_code,
  d.name,
  d.created_at,
  DATEDIFF(CURDATE(), d.created_at) AS days_without_head
FROM Departments d
WHERE NOT EXISTS (
  SELECT 1 
  FROM DepartmentLeadership dl 
  WHERE dl.department_uuid = d.uuid 
    AND dl.effective_to IS NULL
)
ORDER BY d.created_at;
```

#### 9.4: LeaveRequests Approval Consistency

```sql
-- Enforce: APPROVED status requires approval timestamps
ALTER TABLE LeaveRequests 
  ADD CONSTRAINT chk_leave_approved_timestamps 
  CHECK (
    status NOT IN ('APPROVED') 
    OR (department_approved_at IS NOT NULL AND hr_approved_at IS NOT NULL)
  );

-- Enforce: REJECTED status requires rejection_reason
ALTER TABLE LeaveRequests 
  ADD CONSTRAINT chk_leave_rejected_reason 
  CHECK (
    status NOT IN ('REJECTED','REJECTED_DEPARTMENT','REJECTED_HR') 
    OR rejection_reason IS NOT NULL
  );

-- Enforce: CANCELLED status requires cancelled_at
ALTER TABLE LeaveRequests 
  ADD CONSTRAINT chk_leave_cancelled_timestamp 
  CHECK (
    status != 'CANCELLED' 
    OR cancelled_at IS NOT NULL
  );
```

**Impact:**
- ✅ Database enforces business rules (not just application)
- ✅ Prevents invalid states at schema level
- ✅ Clearer semantics for nullable foreign keys
- ✅ Improved data quality and debugging
- ✅ Self-documenting constraints (CHECK clauses explain rules)


### Category 10: Improve Type Safety

**Problem:** LeaveRequests.status ENUM embeds complex workflow; weak type safety in ENUMs

**Solution:** Simplify status ENUM, add separate workflow tracking if needed

#### 10.1: Simplify LeaveRequests Status

**Current Status Values:**
- PENDING
- PENDING_DEPARTMENT
- PENDING_HR
- APPROVED
- REJECTED
- REJECTED_DEPARTMENT
- REJECTED_HR
- CANCELLED

**Analysis:**
- Status encodes workflow step (WHO is processing) and outcome (approved/rejected)
- Separate timestamp columns (department_approved_at, hr_approved_at) duplicate state info
- Complex branching logic in application to map status to UI state

**Simplified Approach:**

```sql
-- Simplify status to core states
ALTER TABLE LeaveRequests 
  MODIFY COLUMN status ENUM('DRAFT','PENDING','APPROVED','REJECTED','CANCELLED') 
  NOT NULL DEFAULT 'PENDING';

-- Add workflow_stage to track approval process
ALTER TABLE LeaveRequests 
  ADD COLUMN workflow_stage ENUM('EMPLOYEE','DEPARTMENT','HR','COMPLETED') 
  NOT NULL DEFAULT 'DEPARTMENT' 
  AFTER status;

-- Migrate existing data
UPDATE LeaveRequests 
SET 
  status = CASE 
    WHEN status IN ('PENDING','PENDING_DEPARTMENT') THEN 'PENDING'
    WHEN status = 'PENDING_HR' THEN 'PENDING'
    WHEN status IN ('REJECTED_DEPARTMENT','REJECTED_HR') THEN 'REJECTED'
    ELSE status
  END,
  workflow_stage = CASE
    WHEN status = 'PENDING' THEN 'EMPLOYEE'
    WHEN status = 'PENDING_DEPARTMENT' THEN 'DEPARTMENT'
    WHEN status = 'PENDING_HR' THEN 'HR'
    ELSE 'COMPLETED'
  END;

-- Add constraint: PENDING must have active workflow stage
ALTER TABLE LeaveRequests 
  ADD CONSTRAINT chk_leave_workflow_consistency 
  CHECK (
    status != 'PENDING' 
    OR workflow_stage IN ('DEPARTMENT','HR')
  );

-- Add constraint: APPROVED/REJECTED/CANCELLED must be COMPLETED
ALTER TABLE LeaveRequests 
  ADD CONSTRAINT chk_leave_completed_workflow 
  CHECK (
    status = 'PENDING' 
    OR workflow_stage = 'COMPLETED'
  );
```

**Alternative: Full Workflow Table (if more complex approval chains needed)**

```sql
-- Create separate workflow tracking (only if business requires it)
CREATE TABLE LeaveRequestWorkflowLog (
  uuid VARCHAR(36) NOT NULL,
  leave_request_uuid VARCHAR(36) NOT NULL,
  stage ENUM('DEPARTMENT','HR','FINAL') NOT NULL,
  action ENUM('APPROVED','REJECTED','RETURNED') NOT NULL,
  actor_uuid VARCHAR(36) NOT NULL,
  comments TEXT DEFAULT NULL,
  processed_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP(),
  PRIMARY KEY (uuid),
  KEY idx_workflow_request (leave_request_uuid, processed_at),
  KEY idx_workflow_actor (actor_uuid),
  CONSTRAINT fk_workflow_request 
    FOREIGN KEY (leave_request_uuid) REFERENCES LeaveRequests(uuid) ON DELETE CASCADE,
  CONSTRAINT fk_workflow_actor 
    FOREIGN KEY (actor_uuid) REFERENCES Users(uuid) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
COMMENT='Workflow audit trail for leave request approval process';
```

**Recommendation:** Use simplified status + workflow_stage approach because:
- Two-stage approval (Department → HR) is relatively simple
- Separate workflow table adds overhead without clear benefit for this use case
- Existing timestamp columns (department_approved_at, hr_approved_at) already provide audit trail
- Can add workflow table later if requirements become more complex

#### 10.2: Strengthen AttendanceSummary Type Safety

```sql
-- Add constraint: ON_LEAVE status requires leave_request_uuid
ALTER TABLE AttendanceSummary 
  ADD CONSTRAINT chk_attendance_leave_reference 
  CHECK (
    status != 'ON_LEAVE' 
    OR leave_request_uuid IS NOT NULL
  );

-- Add constraint: PRESENT/LATE status requires worked_hours
ALTER TABLE AttendanceSummary 
  ADD CONSTRAINT chk_attendance_hours_recorded 
  CHECK (
    status NOT IN ('PRESENT','LATE') 
    OR worked_hours IS NOT NULL
  );
```

**Impact:**
- ✅ Simplified status ENUMs with clear semantics
- ✅ Separated workflow stage from outcome (PENDING + HR stage vs REJECTED)
- ✅ Reduced status value count from 8 to 5 (38% reduction)
- ✅ Easier UI logic (map workflow_stage to progress indicator)
- ✅ Added constraints for type-dependent field requirements
- ✅ Foundation for future workflow complexity if needed


## Testing Strategy

### Validation Approach

The testing strategy follows a three-phase approach:

1. **Pre-Migration Analysis**: Capture baseline data, query results, and performance metrics from current schema
2. **Migration Validation**: Apply changes incrementally with verification at each step
3. **Post-Migration Testing**: Verify data integrity, query equivalence, and performance improvements

### Exploratory Bug Condition Checking

**Goal**: Identify and document all instances of the 10 bug categories in the current schema BEFORE implementing fixes. Confirm root cause analysis is correct.

**Test Plan**: Write analysis scripts that scan the current schema and report all violations. Run on unfixed schema to catalog issues.

**Test Cases**:

1. **Circular Dependency Detection**
   - Script: Analyze foreign key chains to detect cycles
   - Expected: Will find Departments → Employees → Positions → Departments cycle
   - Purpose: Confirm circular dependency exists and understand full impact

2. **Redundant Table Analysis**
   - Script: Query Actions, Scopes, LeaveTypes, Modules to count distinct values and check for extensibility patterns
   - Expected: Actions has 7 fixed values, Scopes has 5 fixed values (candidates for ENUM)
   - Purpose: Confirm which tables are truly redundant vs. justifiably extensible

3. **Join Depth Analysis**
   - Script: Analyze common queries (permission check, salary retrieval) and measure join count
   - Expected: Permission query requires 5 joins, salary query requires 4 joins
   - Purpose: Establish baseline for optimization measurement

4. **Temporal Pattern Audit**
   - Script: List all tables with date range columns and their naming patterns
   - Expected: Inconsistent naming (effective_from/to, assigned_at/expires_at, start_date/end_date)
   - Purpose: Document full scope of standardization needed

5. **Source of Truth Conflicts**
   - Script: Find tables that store overlapping information (EmployeeOccupations vs Positions)
   - Expected: Find occupation/position overlap, unclear permission calculation
   - Purpose: Confirm ambiguous sources exist

6. **Denormalization Inventory**
   - Script: Find all columns with "_snapshot" suffix or duplicated reference data
   - Expected: AttendanceSummary has 3 snapshot columns
   - Purpose: Catalog all denormalization for justification review

7. **Junction Table Usage Analysis**
   - Script: Query RoleOccupations and EmployeeOccupations for cardinality and usage patterns
   - Expected: Low usage or unclear many-to-many relationship
   - Purpose: Confirm junctions are unnecessary

8. **Identifier Consistency Check**
   - Script: List all entity tables and check for presence of {entity}_code pattern
   - Expected: Inconsistent - some have codes, some don't
   - Purpose: Document scope of identifier standardization

9. **NULL Constraint Validation**
   - Script: Find columns with conditional NULL requirements not enforced by CHECK constraints
   - Expected: UserScopes.scope_value, Users.employee_uuid lack constraints
   - Purpose: Identify all missing constraints

10. **Type Safety Review**
    - Script: Find ENUMs with 5+ values or complex state encoding
    - Expected: LeaveRequests.status has 8 values encoding workflow
    - Purpose: Identify overly complex ENUMs

**Expected Counterexamples**:
- Circular dependency prevents department creation with head
- Permission queries slow due to 5-table joins
- Inconsistent temporal queries due to different column names
- Null constraint violations allow invalid data states

### Fix Checking

**Goal**: Verify that for all schema elements where the bug condition holds, the redesigned schema produces the expected correct structure.

**Pseudocode:**
```
FOR ALL SchemaElement WHERE isBugCondition(SchemaElement) DO
  redesignedElement := applyRedesign(SchemaElement)
  
  ASSERT NOT hasCircularForeignKey(redesignedElement)
  ASSERT maxJoinDepth(redesignedElement) <= 3
  ASSERT hasConsistentTemporalPattern(redesignedElement)
  ASSERT hasClearSourceOfTruth(redesignedElement)
  ASSERT denormalizationIsJustified(redesignedElement)
  ASSERT hasOnlyNecessaryJunctions(redesignedElement)
  ASSERT hasConsistentIdentifiers(redesignedElement)
  ASSERT hasExplicitConstraints(redesignedElement)
  ASSERT hasStrongTypeSafety(redesignedElement)
END FOR
```

**Testing Approach**: Migration scripts with automated verification

**Test Cases**:

1. **Circular Dependency Resolution**
   - Create test department without head in new schema
   - Assign head after employee exists
   - Delete department and verify clean cascade
   - **Pass Criteria**: No foreign key violations

2. **Join Depth Reduction**
   - Execute permission check query on new schema
   - Count table joins
   - **Pass Criteria**: Maximum 3 joins (User → Role → RolePermissions)

3. **Temporal Pattern Consistency**
   - Query all temporal tables for column names
   - **Pass Criteria**: All use (effective_from, effective_to)

4. **Source of Truth Clarity**
   - Query employee department from Position only
   - Verify Occupations table removed or clearly differentiated
   - **Pass Criteria**: Single path to department, documented source

5. **Denormalization Documentation**
   - Check AttendanceSummary table comment
   - Verify justification includes legal/audit requirements
   - **Pass Criteria**: Comment explains WHY denormalization exists

6. **Junction Reduction**
   - Verify RoleOccupations table dropped
   - Verify EmployeeOccupations removed or renamed with clear purpose
   - **Pass Criteria**: Only justified junctions remain

7. **Identifier Completeness**
   - Query Departments, Positions, Levels for {entity}_code columns
   - **Pass Criteria**: All major entities have code column

8. **Constraint Enforcement**
   - Attempt to insert UserScopes with DEPARTMENT scope and NULL scope_value
   - **Pass Criteria**: CHECK constraint violation error

9. **Type Safety**
   - Check LeaveRequests.status ENUM values
   - **Pass Criteria**: 5 or fewer values, workflow separate

10. **Performance Improvement**
    - Run 100 permission check queries on old vs new schema
    - Measure average execution time
    - **Pass Criteria**: New schema >= 30% faster due to reduced joins


### Preservation Checking

**Goal**: Verify that for all data and queries NOT affected by bug conditions, the redesigned schema produces identical semantic results and maintains or improves performance.

**Pseudocode:**
```
FOR ALL Query WHERE NOT isAffectedByBugCondition(Query) DO
  resultOld := executeQuery(Query, originalSchema)
  resultNew := executeQuery(Query, redesignedSchema)
  
  ASSERT resultOld.semanticEquivalent(resultNew)
  ASSERT performanceMaintainedOrImproved(Query)
  ASSERT referentialIntegrityPreserved()
  ASSERT auditTrailComplete()
END FOR
```

**Testing Approach**: Create compatibility views that mimic old schema structure, then compare query results between original tables and views pointing to new tables.

**Test Plan**: 

1. **Pre-Migration Baseline**: Capture query results, row counts, data samples from existing schema
2. **Post-Migration Comparison**: Execute same queries on new schema and compare results
3. **Performance Benchmarking**: Compare query execution times

**Test Cases**:

1. **Employee Data Preservation**
   - Query: SELECT all employee records with name, hire_date, status
   - **Pass Criteria**: 100% match on row count and data values

2. **Department Hierarchy Navigation**
   - Query: SELECT department tree with parent-child relationships
   - **Pass Criteria**: Identical hierarchy structure

3. **Attendance Record Queries**
   - Query: SELECT attendance logs and summary for date range
   - **Pass Criteria**: All attendance records preserved, calculations unchanged

4. **Leave Balance Calculations**
   - Query: SELECT employee leave balances across budget years
   - **Pass Criteria**: entitled_days, used_days, remaining_days match exactly

5. **Historical Level Queries**
   - Query: SELECT employee level at specific past date
   - **Pass Criteria**: Point-in-time queries return same results

6. **Authorization Decision Preservation**
   - Test: Check user permissions for 100 permission scenarios (module + action combinations)
   - **Pass Criteria**: All GRANTED/DENIED decisions identical to original

7. **Shift Assignment History**
   - Query: SELECT employee shift assignments over time
   - **Pass Criteria**: All historical assignments preserved correctly

8. **Audit Log Completeness**
   - Query: SELECT count and sample from AuditLogs and AccessAuditLogs
   - **Pass Criteria**: All audit records preserved, no data loss

9. **Foreign Key Cascade Behavior**
   - Test: Delete department and verify positions are handled correctly
   - **Pass Criteria**: Same cascade/restrict behavior as original

10. **Transaction Atomicity**
    - Test: Create employee with position, level, shift in single transaction
    - **Pass Criteria**: ACID properties maintained, all-or-nothing success/failure

### Unit Tests

- Test each migration script independently with rollback capability
- Verify data type conversions (UUID → ENUM mappings)
- Test CHECK constraint enforcement with invalid data
- Verify human-readable code UNIQUE constraints
- Test temporal query helpers (current vs historical records)

### Property-Based Tests

- Generate random employee datasets and verify department derivation (Employee → Position → Department)
- Generate random permission configurations and verify authorization decisions remain consistent
- Generate random date ranges and verify temporal queries return consistent results
- Test constraint validation with randomly generated invalid states (should all fail appropriately)

### Integration Tests

- Full migration dry-run on production database copy
- Application integration testing with new schema (all CRUD operations)
- Performance testing on realistic data volumes (100k+ employees, 1M+ attendance records)
- Backup and restore testing to verify data preservation
- Rollback testing for each migration phase


## Migration Approach

### Phase-by-Phase Execution

**Phase 1: Pre-Migration Analysis (Duration: 1-2 days)**
- Export current schema DDL and document all tables, relationships, constraints
- Capture baseline query performance metrics for critical queries
- Create full database backup
- Run exploratory bug condition checks
- Document all application code that accesses affected tables

**Phase 2: Category 8 - Add Identifier Codes (Duration: 1 day)**
- Add {entity}_code columns to Departments, Positions, Levels, ShiftDefinitions
- Populate initial codes for existing records (admin task)
- Test application with new code fields
- **Risk**: Low - additive change, no breaking changes
- **Rollback**: Drop added columns

**Phase 3: Category 4 - Standardize Temporal Patterns (Duration: 1 day)**
- Rename EmployeeOccupations columns (assigned_at → effective_from, expires_at → effective_to)
- Rename OccupationDelegations columns (start_date → effective_from, end_date → effective_to)
- Update indexes and constraints
- **Risk**: Medium - breaks queries using old column names
- **Rollback**: Rename back to original names
- **Mitigation**: Create views with old names for backward compatibility

**Phase 4: Category 9 - Add Explicit Constraints (Duration: 1 day)**
- Add user_type ENUM to Users
- Add CHECK constraints for conditional NOT NULL requirements
- Add workflow_stage to LeaveRequests
- Test constraint violations to ensure they trigger correctly
- **Risk**: Medium - existing data may violate constraints
- **Rollback**: Drop constraints
- **Mitigation**: Clean up invalid data before adding constraints

**Phase 5: Category 10 - Improve Type Safety (Duration: 2 days)**
- Simplify LeaveRequests.status ENUM
- Add workflow_stage column
- Migrate status data
- Add consistency CHECK constraints
- Update application code to use new status values
- **Risk**: High - application logic depends on status values
- **Rollback**: Revert ENUM and drop workflow_stage
- **Mitigation**: Compatibility view mapping old statuses to new

**Phase 6: Category 1 - Break Circular Dependencies (Duration: 2 days)**
- Create DepartmentLeadership table
- Migrate Departments.head_employee_uuid data
- Drop head_employee_uuid column and FK
- Update application to use DepartmentLeadership
- Test department creation and deletion
- **Risk**: High - structural change affects core relationships
- **Rollback**: Restore head_employee_uuid column
- **Mitigation**: Compatibility view exposing head as virtual column

**Phase 7: Category 2 - Consolidate Redundant Tables (Duration: 3 days)**
- Add action ENUM to RolePermissions
- Add scope ENUM to RolePermissions and UserScopes
- Migrate data from Actions and Scopes tables
- Drop Actions and Scopes tables
- Update application permission checks
- **Risk**: High - core authorization system affected
- **Rollback**: Recreate tables and FKs
- **Mitigation**: Extensive testing of permission scenarios, compatibility views

**Phase 8: Category 5 & 7 - Remove Occupations (Duration: 2 days)**
- Analyze EmployeeOccupations and RoleOccupations usage
- If removing: migrate any unique data, drop tables
- If keeping: rename to ProfessionalCertifications and clarify purpose
- Update application code
- **Risk**: Medium - depends on actual usage
- **Rollback**: Restore tables from backup
- **Mitigation**: Thorough analysis of occupation usage before decision

**Phase 9: Category 3 - Optimize Compensation (Duration: 2 days)**
- Add allowances_json column to LevelVersions
- Migrate LevelAllowances data to JSON
- Test salary queries performance
- Drop LevelAllowances table (after validation)
- Update application to read from JSON
- **Risk**: Medium - affects payroll queries
- **Rollback**: Restore LevelAllowances table
- **Mitigation**: Keep LevelAllowances temporarily for parallel validation

**Phase 10: Category 6 - Document Denormalization (Duration: 1 day)**
- Enhance table and column comments for AttendanceSummary
- Add CHECK constraints for snapshot consistency
- Add documentation for polymorphic references
- **Risk**: Low - documentation only
- **Rollback**: N/A

**Phase 11: Post-Migration Validation (Duration: 2-3 days)**
- Run full test suite (unit, integration, property-based)
- Execute preservation checking queries
- Benchmark query performance against baseline
- Run application through full user acceptance testing
- Verify audit trail completeness
- Document all changes and update technical documentation

**Total Duration**: 18-24 days (assuming sequential execution with testing at each phase)

### Rollback Strategy

Each phase has an explicit rollback procedure:

1. **Backup before each phase**: Full database backup + incremental binlog backup
2. **Migration scripts paired with rollback scripts**: For each `migrate_phaseX.sql`, create `rollback_phaseX.sql`
3. **Compatibility views**: Create views mimicking old structure for graceful application migration
4. **Feature flags**: Use application flags to toggle between old and new schema access patterns
5. **Parallel validation period**: Keep old structure alongside new for 1-2 weeks to verify correctness

**Critical Rollback Points**:
- After Phase 7 (consolidate tables): Major structural change
- After Phase 6 (circular dependency): Core relationship change
- Any phase can rollback independently if tested properly


## Performance Impact Analysis

### Query Performance Improvements

**Permission Checks (Most Frequent Operation):**

| Metric | Before | After | Improvement |
|--------|--------|-------|-------------|
| Tables Joined | 5 (Users → Roles → RolePermissions → Modules → Actions → Scopes) | 3 (Users → Roles → RolePermissions) | 40% reduction |
| Estimated Query Time | ~5-8ms | ~2-3ms | 60% faster |
| Index Lookups | 5 FK lookups | 3 FK lookups | 40% reduction |

**Salary/Compensation Queries:**

| Metric | Before | After | Improvement |
|--------|--------|-------|-------------|
| Tables Joined | 4 (Employee → EmployeeLevelHistory → LevelVersions → LevelAllowances → Levels) | 2 (Employee → EmployeeLevelHistory → LevelVersions) | 50% reduction |
| Estimated Query Time | ~3-5ms | ~1-2ms | 60% faster |
| Data Format | Relational (multiple rows) | JSON (single row) | Fewer roundtrips |

**Department Leadership Queries:**

| Metric | Before | After | Impact |
|--------|--------|-------|--------|
| Tables Accessed | 1 (Departments.head_employee_uuid) | 2 (Departments + DepartmentLeadership) | +1 join |
| Query Complexity | Direct FK lookup | Temporal join with effective_to IS NULL | Slightly more complex |
| Estimated Query Time | ~1ms | ~1-2ms | Minimal impact |
| **Benefit** | Impossible to create dept with head | Clean insert/delete operations | **Structural correctness** |

**Overall Database Size:**

| Metric | Before | After | Change |
|--------|--------|-------|--------|
| Total Tables | 51 | 47 (removed 5, added 1) | -8% tables |
| Permission System Tables | 7 (Roles, RolePermissions, Modules, Actions, Scopes, RoleOccupations, UserScopes) | 4 (Roles, RolePermissions, Modules, UserScopes) | -43% tables |
| Foreign Key Constraints | ~120 estimated | ~100 estimated | -17% FK overhead |
| Index Count | ~200 estimated | ~180 estimated | -10% index overhead |

### Storage Impact

**Actions and Scopes Consolidation:**
- Eliminated: 2 tables × (7-10 rows each) = ~100KB metadata
- Saved: Foreign key indexes in RolePermissions = ~500KB
- Trade-off: Slightly larger RolePermissions rows (ENUM vs UUID FK)
- **Net Savings**: ~400KB + improved cache locality

**LevelAllowances to JSON:**
- Assumption: Average 3-5 allowances per level version
- Before: 5 allowances × 200 bytes/row = 1KB per version (separate table)
- After: 1 JSON column × 800 bytes = 0.8KB per version (embedded)
- **Net Savings**: ~20% per level version, better query performance

**Occupations Table Removal:**
- Eliminated: 3 tables (Occupations, RoleOccupations, EmployeeOccupations)
- Estimated: 50 occupations × 500 bytes + 200 role-occupations × 300 bytes + 1000 employee-occupations × 400 bytes
- **Net Savings**: ~500KB + reduced join overhead

### Indexing Strategy

**New Indexes Added:**
```sql
-- Temporal queries on new DepartmentLeadership
idx_dept_leadership_effective (department_uuid, effective_from, effective_to)
idx_dept_leadership_current (department_uuid, effective_to)

-- Human-readable code lookups
uk_departments_code (dept_code)
uk_levels_code (level_code)
uk_positions_code (position_code)
uk_shifts_code (shift_code)

-- Workflow stage queries
idx_leave_workflow_stage (workflow_stage, status)
```

**Indexes Removed:**
```sql
-- Redundant table indexes
idx_rp_action (RolePermissions.action_uuid) -- now ENUM
idx_rp_scope (RolePermissions.scope_uuid) -- now ENUM
idx_departments_head (Departments.head_employee_uuid) -- moved to DepartmentLeadership
```

**Net Index Impact**: Slightly reduced index count with improved query targeting

### Maintenance Impact

**Positive Impacts:**
- ✅ Simpler permission checks = easier debugging
- ✅ Consistent temporal patterns = reusable query templates
- ✅ Explicit constraints = earlier error detection
- ✅ Fewer tables = simpler backups and migrations
- ✅ Clear sources of truth = less developer confusion

**Trade-offs:**
- ⚠️ JSON allowances = less flexible for complex allowance queries (acceptable trade-off)
- ⚠️ Temporal leadership tracking = slightly more complex current head query (worth the structural correctness)

**Overall Assessment**: 30-50% improvement in query performance for critical paths, 8% reduction in table count, improved data integrity and maintainability


## Risk Assessment and Mitigation

### High-Risk Changes

#### 1. Permission System Restructure (Phases 2 & 7)

**Risk**: Authorization failures leading to security vulnerabilities or access denial

**Specific Concerns:**
- Actions/Scopes ENUM conversion may miss edge cases
- Permission check queries may return different results
- Caching logic may break with new structure

**Mitigation Strategies:**
- Export all current RolePermissions with resolved action/scope names before migration
- Run diff on permission decisions before/after migration for 1000+ test cases
- Implement compatibility views for 2-week parallel validation
- Add automated permission testing in CI/CD
- Phased rollout: migrate read operations first, then writes
- Keep rollback script readily available during initial deployment

**Validation Checklist:**
- [ ] All super admin permissions verified
- [ ] All HR admin permissions verified
- [ ] All department head permissions verified
- [ ] All employee self-service permissions verified
- [ ] Negative test cases (denied access) verified

#### 2. Circular Dependency Breaking (Phase 6)

**Risk**: Department head queries break, cannot create departments with heads

**Specific Concerns:**
- Application code assumes Departments.head_employee_uuid exists
- Reports and UI components may display department heads
- Performance regression on department head lookups

**Mitigation Strategies:**
- Create compatibility view `vw_departments_with_head` exposing virtual head_employee_uuid column
- Audit all SQL queries and ORM code for `Departments.head` references
- Add application-level helper function `getDepartmentHead(department_uuid)` that queries DepartmentLeadership
- Maintain old column as virtual/computed column during transition period
- Test all department CRUD operations thoroughly

**Validation Checklist:**
- [ ] Can create department without head
- [ ] Can assign head after department creation
- [ ] Can reassign head (creates new DepartmentLeadership record)
- [ ] Can delete department with cascade to leadership records
- [ ] Department list view shows current head correctly

#### 3. Leave Request Status Changes (Phase 5)

**Risk**: Workflow breaks, leave requests stuck in invalid states

**Specific Concerns:**
- Application state machine logic depends on specific status values
- Email notifications triggered by status changes
- Reports filtering by status values

**Mitigation Strategies:**
- Map all application code using status ENUM to new values
- Create trigger to maintain backward compatibility during transition
- Update notification templates to use new status + workflow_stage combination
- Add data validation script to check for orphaned states
- Phased migration: update status first, add workflow_stage second

**Validation Checklist:**
- [ ] Can submit leave request (PENDING state)
- [ ] Department approval works (workflow_stage transition)
- [ ] HR approval works (workflow_stage transition)
- [ ] Rejection works with rejection_reason
- [ ] Cancellation works with cancelled_at
- [ ] Notifications sent correctly for each state transition

### Medium-Risk Changes

#### 4. Compensation Structure (Phase 9)

**Risk**: Salary calculations incorrect, payroll errors

**Mitigation:**
- Run parallel queries (relational vs JSON) for 1 month to verify equivalence
- Export all compensation data before migration for comparison
- Keep LevelAllowances table in parallel for validation period
- Add unit tests for salary calculation with edge cases (no allowances, multiple allowances, etc.)

#### 5. Temporal Pattern Standardization (Phase 3)

**Risk**: Historical queries return wrong dates, compliance issues

**Mitigation:**
- Verify all temporal data migrates correctly (assigned_at → effective_from values identical)
- Test point-in-time queries before/after migration
- Add explicit tests for edge cases (NULL end dates, overlapping periods, etc.)

### Low-Risk Changes

#### 6. Identifier Standardization (Phase 2)

**Risk**: Minimal - additive change

**Mitigation:**
- NULL codes are acceptable initially
- Admin can populate codes at their pace
- No breaking changes to existing queries

#### 7. Documentation Updates (Phase 10)

**Risk**: None - documentation only

### Overall Risk Level

**Overall Project Risk**: MEDIUM-HIGH

**Key Risk Factors:**
- Core authorization system affected (HIGH impact if wrong)
- Multiple interconnected changes (complexity risk)
- Production system with active users (limited downtime tolerance)

**Risk Reduction Strategies:**
- Phased execution with validation at each step
- Comprehensive automated testing
- Compatibility views for graceful migration
- Extensive rollback procedures
- Staged rollout (test environment → staging → production)
- Post-deployment monitoring for 2 weeks

**Go/No-Go Criteria:**
- ✅ All unit tests passing (100% coverage of affected code)
- ✅ Integration tests passing on test database
- ✅ Permission validation tests passing (1000+ scenarios)
- ✅ Performance benchmarks meet targets (no regression)
- ✅ Rollback procedures tested successfully
- ✅ Stakeholder approval obtained
- ✅ Maintenance window scheduled (4-6 hours for full migration)


## Detailed Change Summary

### Schema Changes by Category

#### Category 1: Circular Dependencies
| Change | Old Structure | New Structure | Impact |
|--------|---------------|---------------|--------|
| Department Leadership | Departments.head_employee_uuid FK → Employees | DepartmentLeadership temporal table | Breaks cycle, enables clean insert/delete |
| Head Assignment | Direct FK (current only) | Temporal history (effective_from/to) | Adds historical tracking |

#### Category 2: Redundant Tables
| Change | Old Structure | New Structure | Tables Removed |
|--------|---------------|---------------|----------------|
| Actions | Separate table with 7 rows | ENUM in RolePermissions | Actions table (1) |
| Scopes | Separate table with 5 rows | ENUM in RolePermissions, UserScopes | Scopes table (1) |
| LeaveTypes | Separate table | Kept (justified as extensible) | None |
| Modules | Separate table | Kept (justified as extensible) | None |

#### Category 3: Over-normalization
| Query Type | Old Join Depth | New Join Depth | Performance Gain |
|------------|----------------|----------------|------------------|
| Permission Check | 5 tables | 3 tables | ~60% faster |
| Salary Retrieval | 4 tables | 2 tables | ~60% faster |
| Total Reduction | - | 40% fewer joins | 30-50% overall improvement |

#### Category 4: Temporal Patterns
| Table | Old Columns | New Columns | Consistency |
|-------|-------------|-------------|-------------|
| EmployeeOccupations | assigned_at, expires_at | effective_from, effective_to | ✅ Standardized |
| OccupationDelegations | start_date, end_date | effective_from, effective_to | ✅ Standardized |
| All Temporal Tables | Various patterns | Consistent (effective_from, effective_to) | ✅ Unified |

#### Category 5: Source of Truth
| Data Element | Old Sources | New Source | Clarity |
|--------------|-------------|------------|---------|
| Employee Job Function | EmployeeOccupations + Positions | Positions only (Occupations removed) | ✅ Single source |
| Employee Department | Derived from Position | Derived from Position | ✅ Confirmed authoritative |
| Permissions | RolePermissions (but unclear) | RolePermissions with docs | ✅ Documented clearly |

#### Category 6: Denormalization
| Table | Denormalized Columns | Justification | Status |
|-------|----------------------|---------------|--------|
| AttendanceSummary | shift_name/start/end_snapshot | Legal/audit requirement for payroll | ✅ Justified + documented |
| Notifications | entity_type, entity_uuid | Flexibility for polymorphic refs | ✅ Documented trade-off |
| AuditLogs | entity_type, entity_uuid | Flexibility for auditing | ✅ Documented trade-off |

#### Category 7: Junction Tables
| Table | Purpose | Decision | Rationale |
|-------|---------|----------|-----------|
| RoleOccupations | Role ↔ Occupation many-to-many | REMOVE | Occupations removed, junction unnecessary |
| EmployeeOccupations | Employee ↔ Occupation many-to-many | REMOVE | Redundant with Positions |
| UserScopes | User ↔ Scope assignments | KEEP | Justified - scope overrides beyond role |

#### Category 8: Identifiers
| Table | Added Column | Example Values | Benefit |
|-------|--------------|----------------|---------|
| Departments | dept_code VARCHAR(50) | FIN, HR, IT, ADMIN | Human-readable references |
| Positions | position_code VARCHAR(50) | FIN-ACCT-001, HR-MGR-001 | Easier position tracking |
| Levels | level_code VARCHAR(50) | L1, L2, MGR1, DIR1 | Simpler level references |
| ShiftDefinitions | shift_code VARCHAR(50) | DAY, NIGHT, FLEX | Clear shift identification |

#### Category 9: Explicit Constraints
| Constraint Type | Table | Constraint | Enforces |
|-----------------|-------|------------|----------|
| Conditional NOT NULL | UserScopes | scope_value required for DEPARTMENT/BRANCH | Scope integrity |
| Conditional NOT NULL | UserScopes | scope_value NULL for SELF/COMPANY/ALL | Scope integrity |
| User Type Validation | Users | user_type + employee_uuid consistency | User categorization |
| Approval Timestamps | LeaveRequests | APPROVED status requires timestamps | Workflow integrity |
| Rejection Reason | LeaveRequests | REJECTED status requires reason | Data completeness |
| Attendance Shift | AttendanceSummary | PRESENT/LATE requires shift snapshots | Attendance data quality |

#### Category 10: Type Safety
| Table | Old ENUM | New ENUM | Additional Field | Benefit |
|-------|----------|----------|------------------|---------|
| LeaveRequests | 8 status values | 5 status values (DRAFT, PENDING, APPROVED, REJECTED, CANCELLED) | workflow_stage ENUM | Separated outcome from process stage |
| Users | N/A | Added user_type ENUM (EMPLOYEE, SYSTEM, ADMIN) | N/A | Clarifies user categories |
| Modules | N/A | Added module_type ENUM (CORE, PLUGIN, CUSTOM) | N/A | Distinguishes module origins |

### Tables Summary

**Removed Tables (5):**
1. Actions - converted to ENUM
2. Scopes - converted to ENUM  
3. Occupations - redundant with Positions
4. RoleOccupations - unnecessary junction
5. EmployeeOccupations - redundant with Positions

**Added Tables (1):**
1. DepartmentLeadership - breaks circular dependency, adds temporal leadership tracking

**Modified Tables (15):**
1. Departments - removed head_employee_uuid, added dept_code
2. RolePermissions - added action/scope ENUMs, removed action_uuid/scope_uuid FKs
3. UserScopes - changed scope_type to scope ENUM, added CHECK constraints
4. Users - added user_type ENUM, added CHECK constraint
5. Positions - added position_code
6. Levels - added level_code, added module_type ENUM
7. ShiftDefinitions - added shift_code
8. EmployeeOccupations - renamed temporal columns (if kept as ProfessionalCertifications)
9. OccupationDelegations - renamed temporal columns
10. LeaveRequests - simplified status ENUM, added workflow_stage, added CHECK constraints
11. AttendanceSummary - enhanced documentation, added CHECK constraints
12. Notifications - restricted entity_type to ENUM, enhanced documentation
13. AuditLogs - enhanced documentation
14. LevelVersions - added allowances_json column
15. Modules - added module_type ENUM

**Net Change:** -4 tables (8% reduction), significant structural improvements

### Application Code Impact

**High Impact (Requires Code Changes):**
- Permission checking logic (action/scope now ENUMs, not UUIDs)
- Department head access (now via DepartmentLeadership join)
- Leave request workflow (status + workflow_stage)
- Salary/allowance queries (JSON instead of relational)
- Employee occupation references (removed or renamed)

**Medium Impact (May Require Changes):**
- Temporal queries using old column names (compatibility views mitigate)
- Code generation/ORMs with hard-coded column names
- Reports filtering on old status values

**Low Impact (Minimal Changes):**
- Entity code references (additive, backward compatible)
- Enhanced documentation and constraints (transparent to reads)
- User type categorization (additive column)

### Migration Compatibility Views

```sql
-- Compatibility view for old Departments.head_employee_uuid access
CREATE OR REPLACE VIEW vw_departments_old_structure AS
SELECT 
  d.*,
  dl.employee_uuid AS head_employee_uuid
FROM Departments d
LEFT JOIN DepartmentLeadership dl ON d.uuid = dl.department_uuid 
  AND dl.effective_to IS NULL;

-- Compatibility view for old RolePermissions structure
CREATE OR REPLACE VIEW vw_role_permissions_old_structure AS
SELECT 
  rp.uuid,
  rp.role_uuid,
  rp.module_uuid,
  (SELECT a.uuid FROM Actions a WHERE a.code = rp.action) AS action_uuid,
  (SELECT s.uuid FROM Scopes s WHERE s.code = rp.scope) AS scope_uuid,
  rp.created_at
FROM RolePermissions rp;

-- Compatibility view for old leave status values
CREATE OR REPLACE VIEW vw_leave_requests_old_status AS
SELECT 
  lr.*,
  CASE 
    WHEN lr.status = 'PENDING' AND lr.workflow_stage = 'DEPARTMENT' THEN 'PENDING_DEPARTMENT'
    WHEN lr.status = 'PENDING' AND lr.workflow_stage = 'HR' THEN 'PENDING_HR'
    WHEN lr.status = 'REJECTED' AND lr.department_approved_at IS NULL THEN 'REJECTED_DEPARTMENT'
    WHEN lr.status = 'REJECTED' AND lr.hr_approved_at IS NULL THEN 'REJECTED_HR'
    ELSE lr.status
  END AS old_status_value
FROM LeaveRequests lr;
```

These views enable gradual application migration without forcing simultaneous code deployment.


## Conclusion

This database schema redesign addresses 10 fundamental categories of design flaws in the HRMS system, transforming it from a problematic "3NF-claimed" schema into a truly normalized, performant, and maintainable database structure.

### Key Achievements

1. **Eliminated Circular Dependencies**: Broke the Departments ↔ Employees cycle through temporal DepartmentLeadership table, enabling clean data operations

2. **Reduced Complexity**: Decreased table count by 8% (51 → 47 tables), permission join depth by 40% (5 → 3 tables), and overall query complexity by 30-50%

3. **Improved Performance**: Permission checks ~60% faster, salary queries ~60% faster through strategic denormalization and ENUM usage

4. **Standardized Patterns**: Unified temporal tracking (effective_from/effective_to), consistent identifier strategy ({entity}_code), clear source of truth documentation

5. **Enhanced Data Integrity**: Added 15+ CHECK constraints enforcing business rules at schema level, preventing invalid states

6. **Simplified Permission Model**: Removed unnecessary Occupations abstraction, consolidated Actions/Scopes into ENUMs, clarified role-based authorization

7. **Improved Type Safety**: Simplified complex ENUMs (LeaveRequests.status: 8 → 5 values), added typed enumerations for user/module categorization

8. **Justified All Denormalization**: Documented reasons for AttendanceSummary snapshots (legal audit requirements), accepted polymorphic references with explicit trade-off documentation

9. **Removed Redundancy**: Eliminated 5 unnecessary tables (Actions, Scopes, Occupations, RoleOccupations, EmployeeOccupations)

10. **Enabled Future Growth**: Retained extensible structures (LeaveTypes, Modules) where appropriate, added type categorization for plugins/extensions

### Implementation Readiness

The design provides:
- ✅ Concrete DDL statements for all 10 categories
- ✅ Data migration scripts with before/after mapping
- ✅ Rollback procedures for each phase
- ✅ Compatibility views for gradual application migration
- ✅ Comprehensive testing strategy (exploratory, fix checking, preservation checking)
- ✅ Performance benchmarks and impact analysis
- ✅ Risk assessment with mitigation strategies
- ✅ 11-phase migration plan (18-24 days estimated)

### Success Criteria

Post-migration validation will confirm:
- Zero data loss (100% data preservation)
- Identical query results for non-affected queries (semantic equivalence)
- 30-50% performance improvement on critical paths (permission checks, salary queries)
- All CHECK constraints enforced (no invalid states possible)
- Circular dependencies eliminated (department creation works cleanly)
- Clear documentation (every denormalization justified, every source of truth documented)
- Application compatibility maintained (through compatibility views during transition)

### Next Steps

1. **Stakeholder Review**: Present design to technical leadership and DBA team for approval
2. **Test Environment Setup**: Clone production database to test environment for dry-run
3. **Migration Script Development**: Convert DDL changes to tested, reversible migration scripts
4. **Application Code Audit**: Identify all code touching affected tables, plan refactoring
5. **Testing Infrastructure**: Set up automated testing for 1000+ permission scenarios, temporal queries, etc.
6. **Phased Execution**: Begin with low-risk phases (identifier codes, documentation), progress to high-risk (permission restructure) with extensive validation
7. **Monitoring**: Establish performance baselines, set up monitoring for query times and error rates
8. **Gradual Rollout**: Deploy to test → staging → production with validation gates at each step

This design represents a complete, implementable solution to transform the HRMS database from a flawed structure into a production-grade, normalized, performant system that serves as a solid foundation for future feature development.

