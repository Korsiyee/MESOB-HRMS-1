# Bugfix Requirements Document

## Introduction

The current HRMS database schema (51 tables) contains significant design flaws that violate relational database design principles despite claims of "3NF compliance." These issues include circular foreign key dependencies, redundant table structures, and questionable normalization decisions that impact data integrity, performance, and maintainability. This document identifies specific schema design defects that must be corrected to achieve a truly normalized, efficient database design suitable for a production HRMS system.

**Impact:** These design flaws create:
- **Data Integrity Risks**: Circular dependencies make it impossible to insert/delete data cleanly
- **Performance Issues**: Redundant joins and unnecessary tables slow query execution
- **Maintenance Burden**: Complex relationships make schema evolution difficult
- **Application Complexity**: Business logic must work around structural defects

**Scope:** This bugfix addresses structural design issues in the database schema itself, not runtime data integrity or application-level bugs.

---

## Bug Analysis

### Current Behavior (Defect)

#### 1. Circular Foreign Key Dependencies

**1.1** WHEN the Departments table references Employees.uuid via head_employee_uuid AND Employees table references Departments via position_uuid→Positions→department_uuid THEN the system creates a circular dependency that makes it impossible to insert a department with a head OR an employee without first having both entities exist

**1.2** WHEN attempting to create the first department in the organization THEN the system cannot assign a department head because no employees exist yet (employees require departments through positions)

**1.3** WHEN attempting to delete a department THEN the system must first handle the circular reference chain: Department→head_employee_uuid→Employee→position_uuid→Position→department_uuid→Department

#### 2. Redundant Single-Purpose Tables

**2.1** WHEN the Actions table exists solely to store atomic string values like 'VIEW', 'CREATE', 'UPDATE', 'DELETE', 'APPROVE', 'REJECT', 'EXPORT' THEN the system uses an entire table with UUIDs, indexes, and foreign keys for what should be an ENUM or VARCHAR field

**2.2** WHEN the Scopes table exists solely to store atomic values like 'SELF', 'DEPARTMENT', 'BRANCH', 'COMPANY', 'ALL' THEN the system creates unnecessary joins and complexity for a fixed set of authorization scope values

**2.3** WHEN the LeaveTypes table stores only code, name, and description for a fixed set of leave categories THEN the system adds foreign key overhead for data that rarely changes and could be a simple ENUM

**2.4** WHEN the Modules table stores system module codes like 'EMPLOYEE', 'LEAVE', 'ATTENDANCE' THEN the system maintains a lookup table for application-level constants that are hardcoded in the codebase anyway

#### 3. Questionable Normalization - Over-normalization

**3.1** WHEN RolePermissions requires joining 5 tables (Roles→RolePermissions→Modules→Actions→Scopes) to determine if a user can perform a single action THEN the system incurs excessive join overhead for every authorization check

**3.2** WHEN the compensation system requires joining 4 tables (Employee→EmployeeLevelHistory→LevelVersions→LevelAllowances→Levels) to retrieve an employee's current salary THEN the system performs multiple joins for a frequently accessed data point

**3.3** WHEN UserScopes table exists separately with scope_type ENUM AND Scopes table exists with similar values THEN the system duplicates scope management logic across two structures

#### 4. Inconsistent Temporal Data Management

**4.1** WHEN EmployeeLevelHistory tracks historical level assignments with effective_from/effective_to dates AND EmployeeShifts tracks historical shift assignments with effective_from/effective_to dates AND EmployeeOccupations tracks temporal assignments with assigned_at/expires_at dates THEN the system uses inconsistent temporal patterns for similar historical tracking needs

**4.2** WHEN AttendanceSummary denormalizes shift details (shift_name_snapshot, shift_start_time_snapshot, shift_end_time_snapshot) for historical preservation AND LevelAllowances does NOT denormalize level version details THEN the system applies snapshot patterns inconsistently

#### 5. Ambiguous Source of Truth

**5.1** WHEN EmployeeOccupations is marked as "SOURCE OF TRUTH for current occupations" via comments AND Employees.position_uuid determines department via Positions.department_uuid THEN the system has unclear authority about employee organizational placement

**5.2** WHEN Users table has permissions_version field to "force permission recalculation" AND RolePermissions stores the actual permissions THEN the system's permission calculation strategy is unclear and cache invalidation is ad-hoc

**5.3** WHEN LeaveRequests has multiple approval status values ('PENDING', 'PENDING_DEPARTMENT', 'PENDING_HR', 'APPROVED', 'REJECTED', 'REJECTED_DEPARTMENT', 'REJECTED_HR', 'CANCELLED') AND separate approval timestamp columns (department_approved_at, hr_approved_at) THEN the system encodes workflow state in both status values and timestamps, creating potential inconsistencies

#### 6. Denormalization Without Clear Justification

**6.1** WHEN AttendanceSummary stores shift_name_snapshot, shift_start_time_snapshot, shift_end_time_snapshot with a comment "DENORMALIZED: Shift name/time at time of attendance" AND AttendanceLogs already stores the date with reference to employee and shift THEN the system denormalizes data that can be retrieved via temporal join to ShiftDefinitions with EmployeeShifts effective dates

**6.2** WHEN Notifications table stores entity_type (VARCHAR) and entity_uuid (VARCHAR) instead of properly typed foreign keys THEN the system sacrifices referential integrity for generic polymorphic references

**6.3** WHEN AuditLogs and AccessAuditLogs both store entity_type and entity_uuid as VARCHAR fields THEN the system cannot enforce referential integrity on audit trails and creates ambiguous entity references

#### 7. Unnecessary Junction Tables

**7.1** WHEN RoleOccupations creates a many-to-many relationship between Roles and Occupations with assigned_by_uuid, assigned_at, assigned_reason fields THEN the system adds tracking overhead for a relationship that may be better served by role definition itself

**7.2** WHEN EmployeeOccupations creates temporal assignments with expires_at dates AND assigned_reason text AND the Employees table already links to Positions which define job functions THEN the system duplicates employee job function tracking through two parallel structures

#### 8. Inconsistent Identifier Strategies

**8.1** WHEN most tables use UUID (VARCHAR(36)) as primary keys AND MesobIdSequence uses INT AUTO_INCREMENT AND LetterReferenceSequence uses INT AUTO_INCREMENT THEN the system mixes identifier strategies without clear architectural rationale

**8.2** WHEN Employees has both uuid (primary key) AND mesob_id (human-readable) THEN the system correctly separates surrogate from natural keys, but this pattern is not consistently applied (e.g., Departments use UUID but no human-readable department code)

#### 9. Potential NULL Constraint Issues

**9.1** WHEN Departments.head_employee_uuid is nullable (DEFAULT NULL) with ON DELETE SET NULL AND the first department must be created without a head THEN the system allows departments to exist indefinitely without leadership assignment (no constraint to ensure eventual assignment)

**9.2** WHEN Users.employee_uuid is nullable AND the comment says "Link to employee record if applicable" THEN the system allows system accounts, but lacks clear constraints or documentation about when NULL is valid versus required

#### 10. Weak Type Safety in ENUM Usage

**10.1** WHEN UserScopes.scope_type uses ENUM('SELF','DEPARTMENT','BRANCH','COMPANY','ALL') AND also has scope_value VARCHAR(36) comment "UUID reference to department/branch if applicable" THEN the system cannot enforce which scope_types require scope_value (e.g., DEPARTMENT requires it, ALL does not) through schema constraints

**10.2** WHEN LeaveRequests.status uses ENUM with 8 values including workflow states that overlap (PENDING, PENDING_DEPARTMENT, PENDING_HR) THEN the system embeds complex workflow logic in status values that should potentially be separate workflow tracking

---

### Expected Behavior (Correct)

#### 1. Elimination of Circular Dependencies

**2.1** WHEN the Departments table needs to reference a department head THEN the system SHALL use a separate DepartmentHeads historical assignment table with employee_uuid, department_uuid, effective_from, effective_to to break the circular dependency

**2.2** WHEN creating the first department THEN the system SHALL allow department creation without a head assignment, and enable head assignment after employees exist

**2.3** WHEN deleting a department THEN the system SHALL cleanly remove all dependent records (positions, department head assignments) without circular constraint violations

#### 2. Consolidation of Single-Value Lookup Tables

**2.4** WHEN storing action types for permissions THEN the system SHALL use ENUM('VIEW','CREATE','UPDATE','DELETE','APPROVE','REJECT','EXPORT','MANAGE') in RolePermissions directly instead of a separate Actions table

**2.5** WHEN storing scope values THEN the system SHALL use ENUM('SELF','DEPARTMENT','BRANCH','COMPANY','ALL') in RolePermissions and UserScopes directly instead of a separate Scopes table

**2.6** WHEN storing leave types THEN the system SHALL evaluate whether a LeaveTypes table is justified (if extensible by users: keep table; if fixed system types: convert to ENUM)

**2.7** WHEN storing module codes THEN the system SHALL evaluate whether Modules table is necessary (if module list is fixed and hardcoded in application: consider ENUM; if dynamically extensible: keep table with clearer documentation)

#### 3. Balanced Normalization Strategy

**2.8** WHEN checking user permissions THEN the system SHALL simplify the permission structure to require maximum 3 joins (User→Role→RolePermissions) by embedding scope and action as ENUMs

**2.9** WHEN retrieving employee salary information THEN the system SHALL optimize the structure to require maximum 2 joins (Employee→EmployeeLevelHistory→LevelVersions) with allowances as a JSON column OR a well-indexed separate table

**2.10** WHEN managing scopes THEN the system SHALL use a single, consistent scope mechanism (either UserScopes with ENUM types OR a Scopes table, not both patterns)

#### 4. Consistent Temporal Pattern

**2.11** WHEN tracking temporal/historical data THEN the system SHALL use a consistent pattern across ALL temporal tables: effective_from (DATE NOT NULL), effective_to (DATE DEFAULT NULL with NULL meaning current), with index on (entity_uuid, effective_from, effective_to)

**2.12** WHEN requiring snapshots for immutability THEN the system SHALL clearly document the reason in comments and apply consistently (e.g., if attendance needs shift snapshots, then payroll needs compensation snapshots)

#### 5. Clear Source of Truth

**2.13** WHEN determining employee department THEN the system SHALL use a single source: Employee→Position→Department (remove EmployeeOccupations if redundant OR clearly document how it differs from Position)

**2.14** WHEN managing permissions THEN the system SHALL clarify permission calculation: RolePermissions is authoritative, permissions_version is a cache invalidation counter (document this relationship clearly)

**2.15** WHEN tracking leave request workflow THEN the system SHALL either use ENUM status values OR separate workflow tracking table with timestamps, not both (choose one canonical representation)

#### 6. Justified Denormalization with Documentation

**2.16** WHEN denormalizing shift details in AttendanceSummary THEN the system SHALL document the specific business reason (e.g., "Shifts can be deleted; attendance records must preserve original shift details for historical payroll accuracy") and apply similar patterns to other temporal data consistently

**2.17** WHEN storing polymorphic references (entity_type, entity_uuid) THEN the system SHALL clearly document that referential integrity is sacrificed for flexibility and consider whether separate notification tables per entity type would be better

**2.18** WHEN creating audit trails THEN the system SHALL decide: accept generic VARCHAR entity references for flexibility OR create typed audit tables per module for referential integrity

#### 7. Elimination of Unnecessary Junction Tables

**2.19** WHEN relating Roles to Occupations THEN the system SHALL evaluate if RoleOccupations provides business value OR if occupation should be an attribute of Role definition itself

**2.20** WHEN tracking employee job functions THEN the system SHALL consolidate EmployeeOccupations and Position into a single coherent model (e.g., Position already defines job function within department; is EmployeeOccupations redundant?)

#### 8. Consistent Identifier Strategy

**2.21** WHEN designing primary keys THEN the system SHALL use UUIDs consistently for all entity tables (maintain current approach) and use AUTO_INCREMENT integers only for true sequences (MesobIdSequence, LetterReferenceSequence are appropriate)

**2.22** WHEN entities need human-readable codes THEN the system SHALL consistently add a {entity}_code VARCHAR(50) UNIQUE field pattern for entities that users reference (Departments, Positions, Levels)

#### 9. Explicit Constraint Enforcement

**2.23** WHEN allowing nullable foreign keys THEN the system SHALL document when NULL is valid business state versus temporary state, and add CHECK constraints or triggers where eventual assignment is required

**2.24** WHEN Users.employee_uuid is nullable THEN the system SHALL add clear documentation: "NULL for system accounts (e.g., admin, system); non-NULL for employee users" and consider a user_type ENUM if behavior differs significantly

#### 10. Strong Type Safety

**2.25** WHEN using ENUM with associated reference fields THEN the system SHALL add CHECK constraints to enforce scope_type and scope_value consistency (e.g., scope_type='DEPARTMENT' requires scope_value NOT NULL)

**2.26** WHEN modeling workflow state THEN the system SHALL separate workflow tracking into a dedicated state machine table (LeaveRequestWorkflow with state transitions) OR simplify ENUM to core states only (DRAFT, PENDING, APPROVED, REJECTED, CANCELLED)

---

### Unchanged Behavior (Regression Prevention)

#### 3. Data Preservation

**3.1** WHEN refactoring table structures THEN the system SHALL CONTINUE TO preserve all existing data through migration scripts with zero data loss

**3.2** WHEN removing redundant tables THEN the system SHALL CONTINUE TO maintain foreign key relationships for remaining tables that reference the removed table (migrate references to new structure)

**3.3** WHEN changing data types (e.g., Actions table UUID → ENUM) THEN the system SHALL CONTINUE TO preserve the semantic meaning of existing data (map 'VIEW' UUID → 'VIEW' ENUM correctly)

#### 4. Query Compatibility

**3.4** WHEN simplifying table structures THEN the system SHALL CONTINUE TO support existing application queries through database views that mimic the old structure during migration period

**3.5** WHEN consolidating joins THEN the system SHALL CONTINUE TO return the same result sets for existing authorization, compensation, and leave balance queries

#### 5. Performance Maintenance

**3.6** WHEN removing tables or consolidating structures THEN the system SHALL CONTINUE TO maintain or improve query performance for critical paths (permission checks, salary retrieval, attendance calculations)

**3.7** WHEN changing indexing strategy THEN the system SHALL CONTINUE TO support efficient lookups on commonly queried columns (employee lookups by name, attendance by date range, leave requests by status)

#### 6. Foreign Key Integrity

**3.8** WHEN restructuring relationships THEN the system SHALL CONTINUE TO enforce referential integrity through foreign keys where appropriate (maintain cascading delete behavior for parent-child relationships)

**3.9** WHEN breaking circular dependencies THEN the system SHALL CONTINUE TO ensure that orphaned records cannot exist (e.g., positions must have valid departments, employees must have valid positions)

#### 7. Temporal Query Behavior

**3.10** WHEN querying historical data THEN the system SHALL CONTINUE TO accurately return point-in-time values (employee's level at date X, shift assignment at date Y) with the same accuracy as before restructuring

**3.11** WHEN calculating leave balances across budget years THEN the system SHALL CONTINUE TO correctly aggregate carried forward days, used days, and remaining days

#### 8. Application Layer Compatibility

**3.12** WHEN the application layer accesses employee department THEN the system SHALL CONTINUE TO provide department information through Employee→Position→Department navigation regardless of internal restructuring

**3.13** WHEN checking user permissions THEN the system SHALL CONTINUE TO return the same authorization decisions (GRANTED/DENIED) for all existing permission configurations after table restructuring

#### 9. Audit Trail Completeness

**3.14** WHEN schema changes are applied THEN the system SHALL CONTINUE TO maintain complete audit trails for all pre-migration changes (do not lose historical audit log data during migration)

**3.15** WHEN new audit records are created post-migration THEN the system SHALL CONTINUE TO capture all relevant change information with the same level of detail

#### 10. Transaction Consistency

**3.16** WHEN inserting related entities THEN the system SHALL CONTINUE TO maintain ACID properties (e.g., creating employee with position, shift, and level assignments should be atomic)

**3.17** WHEN cascading deletes occur THEN the system SHALL CONTINUE TO properly clean up all dependent records without leaving orphaned data

---

## Bug Condition Derivation

### Bug Condition Function

The bug condition identifies schema design patterns that violate database design principles:

```pascal
FUNCTION isBugCondition(SchemaElement)
  INPUT: SchemaElement (Table, ForeignKey, Column, Relationship)
  OUTPUT: boolean
  
  RETURN (
    hasCircularForeignKey(SchemaElement) OR
    isRedundantSinglePurposeTable(SchemaElement) OR
    hasExcessiveJoinDepth(SchemaElement, threshold=5) OR
    hasInconsistentTemporalPattern(SchemaElement) OR
    hasAmbiguousSourceOfTruth(SchemaElement) OR
    hasUnjustifiedDenormalization(SchemaElement) OR
    hasUnnecessaryJunctionTable(SchemaElement) OR
    hasInconsistentIdentifierStrategy(SchemaElement) OR
    hasMissingNullConstraints(SchemaElement) OR
    hasWeakTypeSafety(SchemaElement)
  )
END FUNCTION
```

### Property Specification - Fix Checking

```pascal
// Property: Fix Checking - Schema Design Correctness
FOR ALL SchemaElement WHERE isBugCondition(SchemaElement) DO
  redesignedSchema ← applyDatabaseRedesign(SchemaElement)
  
  ASSERT NOT hasCircularForeignKey(redesignedSchema) AND
         (isRedundantSinglePurposeTable(SchemaElement) 
          IMPLIES isConsolidatedOrJustified(redesignedSchema)) AND
         maxJoinDepth(redesignedSchema) <= 3 AND
         hasConsistentTemporalPattern(redesignedSchema) AND
         hasClearSourceOfTruth(redesignedSchema) AND
         (isDenormalized(redesignedSchema) 
          IMPLIES isDocumentedAndJustified(redesignedSchema)) AND
         hasMinimalJunctionTables(redesignedSchema) AND
         hasConsistentIdentifierStrategy(redesignedSchema) AND
         hasExplicitNullConstraints(redesignedSchema) AND
         hasStrongTypeSafety(redesignedSchema)
END FOR
```

### Property Specification - Preservation Checking

```pascal
// Property: Preservation Checking - Data and Behavior Preservation
FOR ALL Query WHERE NOT isAffectedByBugCondition(Query) DO
  resultBefore ← executeQuery(Query, originalSchema)
  resultAfter ← executeQuery(Query, redesignedSchema)
  
  ASSERT resultBefore.semanticEquivalent(resultAfter) AND
         performanceMaintainedOrImproved(Query, originalSchema, redesignedSchema) AND
         referentialIntegrityPreserved(redesignedSchema) AND
         auditTrailComplete(redesignedSchema)
END FOR
```

---

## Implementation Notes

### Migration Strategy

The redesign must follow a phased approach:

1. **Phase 1 - Analysis**: Document all dependencies, queries, and application usage patterns
2. **Phase 2 - Design**: Create new schema design with explicit justification for each change
3. **Phase 3 - Migration Scripts**: Write reversible migration scripts with rollback capability
4. **Phase 4 - Compatibility Layer**: Create database views to maintain application compatibility during transition
5. **Phase 5 - Application Updates**: Update application code to use new schema
6. **Phase 6 - Validation**: Verify data integrity, query performance, and application functionality
7. **Phase 7 - Cleanup**: Remove compatibility layer after confirming application migration success

### Risk Mitigation

- All migrations must be testable on a copy of production data
- Each phase must have explicit rollback procedures
- Critical queries must have before/after performance benchmarks
- Data integrity checks must run after each migration phase

