# Implementation Plan

- [ ] 1. Write bug condition exploration test
  - **Property 1: Bug Condition** - SQL Query Schema Compliance
  - **CRITICAL**: This test MUST FAIL on unfixed code - failure confirms the bug exists
  - **DO NOT attempt to fix the test or the code when it fails**
  - **NOTE**: This test encodes the expected behavior - it will validate the fix when it passes after implementation
  - **GOAL**: Surface counterexamples that demonstrate the bug exists
  - **Scoped PBT Approach**: Test the three concrete defect patterns to ensure reproducibility
  - **IMPORTANT Schema Fact**: `e.department_uuid` is VALID - Employees table HAS this column as a direct FK to Departments
  - Create test suite that executes representative SQL queries from each defect category:
    1. Missing Positions JOIN: Query from `accountController.js:158` that references `p.department_uuid` without Positions JOIN
    2. Wrong JOIN Order: Query from `employeeController.js:314-315` that references `p.department_uuid` BEFORE joining Positions
    3. Wrong Column Names: Query from `logController.js:152` that references `al.diff_json` instead of `al.old_values_json`
    4. CamelCase Timestamps: Query that references `updatedAt` or `createdAt`
    5. Direct Reference Test: Verify `e.department_uuid` queries PASS (not a bug - should work correctly)
  - Test assertions should match Expected Behavior: queries with defects fail, direct references succeed
  - Run test on UNFIXED code against test database
  - **EXPECTED OUTCOME**: Defect pattern tests FAIL with SQL errors ("Unknown column 'p.department_uuid'", "Unknown column 'al.diff_json'", etc.), but direct `e.department_uuid` test PASSES
  - Document counterexamples found to understand root cause
  - Mark task complete when test is written, run, and failures are documented
  - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5_

- [ ] 2. Write preservation property tests (BEFORE implementing fix)
  - **Property 2: Preservation** - Correct Query Behavior
  - **IMPORTANT**: Follow observation-first methodology
  - **CRITICAL**: Verify that direct `e.department_uuid` references work correctly and should be preserved
  - Identify correctly-written queries in the codebase:
    1. Queries using `e.department_uuid` directly (VALID per schema - must be preserved)
    2. Queries already using correct JOIN order (Positions joined before referencing `p.department_uuid`)
    3. Queries already using snake_case columns (`created_at`, `updated_at`, `old_values_json`)
    4. Queries on unrelated tables
  - Observe behavior on UNFIXED code for queries that DON'T have the three defect patterns
  - Write property-based tests capturing observed behavior patterns:
    - Test that direct `e.department_uuid` queries return same results before and after
    - Test that correct JOIN order queries return same results before and after
    - Test that snake_case column queries execute identically
    - Test that authentication flow works identically
    - Generate test cases across various employee/position/department data combinations
  - Property-based testing generates many test cases for stronger guarantees
  - Run tests on UNFIXED code
  - **EXPECTED OUTCOME**: Tests PASS (confirms baseline correct behavior to preserve)
  - Mark task complete when tests are written, run, and passing on unfixed code
  - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 3.6_

- [ ] 3. Fix database column mismatch across backend files

  - [ ] 3.1 Fix accountController.js queries
    - **File**: `backend/controllers/accountController.js`
    - **Lines**: 158, 211-213, 280-282
    - **Strategy**: Analyze each query to determine if Positions data is needed
      - If query only needs department data: Use `e.department_uuid` directly (Option A - simpler)
      - If query also needs Positions columns: Add proper Positions JOIN before Departments (Option B)
    - Line 158: Fix missing Positions JOIN OR convert to direct `e.department_uuid` reference
    - Lines 211-213: Fix JOIN order OR convert to direct reference
    - Lines 280-282: Correct JOIN chain OR use direct reference
    - **DO NOT change** queries already using `e.department_uuid` directly (these are CORRECT)
    - _Bug_Condition: isBugCondition(query) where query references p.department_uuid without proper JOIN_
    - _Expected_Behavior: Query executes without SQL errors using correct approach_
    - _Preservation: Correctly-written queries and direct references remain unchanged_
    - _Requirements: 2.1, 2.2, 2.3, 3.1_

  - [ ] 3.2 Fix employeeController.js queries
    - **File**: `backend/controllers/employeeController.js`
    - **Lines**: 314-316, 383, 391, 399, 407, 454, 487-489
    - **Strategy**: For each query, determine if Positions data is needed or just department data
    - Lines 314-316: Fix wrong JOIN order OR convert to direct `e.department_uuid` if Positions not needed
    - Lines 383, 391, 399, 407: Add proper Positions JOIN OR use direct reference
    - Line 454: Fix timestamp column from camelCase to snake_case if present
    - Lines 487-489: Fix JOIN order OR convert to direct reference
    - **DO NOT change** queries already using `e.department_uuid` correctly
    - _Bug_Condition: isBugCondition(query) where query has wrong JOIN order or missing table_
    - _Expected_Behavior: All employee queries execute successfully with correct schema references_
    - _Preservation: Queries using direct department references and other correct queries unchanged_
    - _Requirements: 2.1, 2.3, 2.5, 3.1, 3.2_

  - [ ] 3.3 Fix requestController.js queries
    - **File**: `backend/controllers/requestController.js`
    - **Lines**: 397, 420, 471, 475, 1038, 1275, 1284-1286
    - **Strategy**: Analyze if queries need Positions data or just department data
    - Lines 397, 420, 471, 475: Fix missing Positions JOIN OR use direct `e.department_uuid`
    - Line 1038: Correct JOIN chain OR convert to direct reference
    - Line 1275: Fix department relationship OR use direct reference
    - Lines 1284-1286: Apply appropriate fix (proper JOIN OR direct reference)
    - Prefer direct reference (simpler) unless Positions columns are also needed
    - _Bug_Condition: isBugCondition(query) where query references p.department_uuid without proper JOIN_
    - _Expected_Behavior: Request queries execute without errors, correctly access department data_
    - _Preservation: Request queries not involving defect patterns remain unchanged_
    - _Requirements: 2.1, 2.3, 3.1, 3.3_

  - [ ] 3.4 Fix rbacController.js queries
    - **File**: `backend/controllers/rbacController.js`
    - **Lines**: 501, 507-509, 544, 550-552
    - **Strategy**: Use direct `e.department_uuid` unless Positions data also needed
    - Lines 501, 507-509: Fix RBAC user listing - add proper JOIN OR use direct reference
    - Lines 550-552: Fix department access in role assignment - prefer direct reference
    - Ensure RBAC queries maintain correct foreign key relationships
    - _Bug_Condition: isBugCondition(query) where RBAC query has missing or incorrect JOIN_
    - _Expected_Behavior: RBAC queries execute correctly, permission checks work as designed_
    - _Preservation: RBAC authorization logic and correctly-written queries unchanged_
    - _Requirements: 2.1, 2.3, 3.1, 3.4_

  - [ ] 3.5 Fix letterController.js queries
    - **File**: `backend/controllers/letterController.js`
    - **Lines**: 363, 618, 620
    - **Strategy**: Prefer direct `e.department_uuid` for simplicity unless Positions data needed
    - Line 363: Fix department data access - use direct reference OR add proper JOIN
    - Lines 618, 620: Fix JOIN chain OR convert to direct reference
    - Ensure letter generation has access to correct department information
    - _Bug_Condition: isBugCondition(query) where letter query lacks proper JOIN chain_
    - _Expected_Behavior: Letter queries execute successfully, letters generate with correct data_
    - _Preservation: Letter generation logic and templates remain unchanged_
    - _Requirements: 2.1, 2.3, 3.1_

  - [ ] 3.6 Fix logController.js queries - wrong column name
    - **File**: `backend/controllers/logController.js`
    - **Lines**: 152-155, 248-251, 459-462
    - Lines 152-155: Replace `al.diff_json` with `al.old_values_json` in audit log queries
    - Lines 248-251: Correct column name in log filtering queries
    - Lines 459-462: Fix column reference in log export queries
    - Apply systematically: `diff_json` → `old_values_json` for all AuditLogs queries
    - _Bug_Condition: isBugCondition(query) where query references non-existent diff_json column_
    - _Expected_Behavior: Audit log queries execute successfully, return correct historical data_
    - _Preservation: Other audit log columns and logging logic unchanged_
    - _Requirements: 2.3, 3.2_

  - [ ] 3.7 Fix service layer queries - departmentService.js
    - **File**: `backend/services/departmentService.js`
    - **Lines**: 23, 81
    - **Strategy**: Use direct reference where possible for efficiency
    - Line 23: Fix department employee listing - use direct reference OR proper JOIN
    - Line 81: Fix department statistics query - prefer direct reference
    - Ensure service methods return correct department-related data
    - _Bug_Condition: isBugCondition(query) where service query has schema mismatch_
    - _Expected_Behavior: Department service methods execute without SQL errors_
    - _Preservation: Other department service logic unchanged_
    - _Requirements: 2.1, 2.3, 3.1_

  - [ ] 3.8 Fix service layer queries - accountScopeService.js
    - **File**: `backend/services/accountScopeService.js`
    - **Line**: 169
    - **Strategy**: Prefer direct `e.department_uuid` for scope filtering (simpler)
    - Fix account scope filtering - use direct reference OR add proper JOIN if Positions needed
    - Ensure scope filtering works correctly with department relationships
    - _Bug_Condition: isBugCondition(query) where scope query lacks proper JOIN_
    - _Expected_Behavior: Account scope filtering works correctly_
    - _Preservation: Other scope service logic unchanged_
    - _Requirements: 2.1, 2.3, 3.1_

  - [ ] 3.9 Fix service layer queries - roleManagementService.js
    - **File**: `backend/services/roleManagementService.js`
    - **Lines**: 611-613
    - **Strategy**: Use direct reference unless Positions data also required
    - Fix role assignment queries - prefer direct `e.department_uuid` OR add proper JOIN
    - Ensure role management maintains correct relationships
    - _Bug_Condition: isBugCondition(query) where role query has incorrect JOIN_
    - _Expected_Behavior: Role management queries execute successfully_
    - _Preservation: Role assignment logic and permissions unchanged_
    - _Requirements: 2.1, 2.3, 3.1_

  - [ ] 3.10 Fix service layer queries - letterGenerationService.js
    - **File**: `backend/services/letterGenerationService.js`
    - **Line**: 45
    - **Strategy**: Use direct reference for simplicity unless Positions details needed in letters
    - Fix letter generation - use direct `e.department_uuid` OR add proper JOIN
    - Ensure generated letters have accurate department information
    - _Bug_Condition: isBugCondition(query) where letter service query has schema mismatch_
    - _Expected_Behavior: Letter generation service executes without errors_
    - _Preservation: Letter template processing unchanged_
    - _Requirements: 2.1, 2.3, 3.1_

  - [ ] 3.11 Fix service layer queries - attendanceScopeService.js
    - **File**: `backend/services/attendanceScopeService.js`
    - **Lines**: 117, 170
    - **Strategy**: Direct reference likely best for attendance scope (simpler filtering)
    - Line 117: Fix attendance scope filtering - prefer direct `e.department_uuid`
    - Line 170: Fix attendance data retrieval - use direct reference OR proper JOIN
    - Ensure attendance scope correctly accesses department information
    - _Bug_Condition: isBugCondition(query) where attendance query lacks proper JOIN_
    - _Expected_Behavior: Attendance scope filtering works correctly_
    - _Preservation: Attendance calculation logic unchanged_
    - _Requirements: 2.1, 2.3, 3.1_

  - [ ] 3.12 Fix service layer queries - moduleAuthService.js
    - **File**: `backend/services/moduleAuthService.js`
    - **Line**: 29
    - **Strategy**: Use direct reference for auth queries (simpler)
    - Fix module authorization query - prefer direct `e.department_uuid`
    - Ensure module access control uses correct department relationships
    - _Bug_Condition: isBugCondition(query) where auth query has schema mismatch_
    - _Expected_Behavior: Module authorization executes correctly_
    - _Preservation: Authorization logic and access controls unchanged_
    - _Requirements: 2.1, 2.3, 3.4_

  - [ ] 3.13 Fix any camelCase timestamp references across all files
    - Search for `updatedAt` and `createdAt` references in SQL queries
    - Replace with `updated_at` and `created_at` systematically
    - Verify timestamp columns use snake_case consistently
    - _Bug_Condition: isBugCondition(query) where query uses camelCase timestamp columns_
    - _Expected_Behavior: Timestamp queries execute without column errors_
    - _Preservation: All timestamp data and sorting logic unchanged_
    - _Requirements: 2.4, 2.5, 3.2_

  - [ ] 3.14 Verify bug condition exploration test now passes
    - **Property 1: Expected Behavior** - SQL Query Schema Compliance
    - **IMPORTANT**: Re-run the SAME test from task 1 - do NOT write a new test
    - The test from task 1 encodes the expected behavior
    - When this test passes, it confirms the expected behavior is satisfied
    - Run bug condition exploration test from step 1
    - Verify all three defect patterns are fixed:
      1. Missing Positions JOIN queries now execute successfully (either have proper JOIN OR converted to direct reference)
      2. Wrong JOIN order queries now have correct order (Positions joined before use)
      3. Wrong column name queries now reference `old_values_json` and use snake_case timestamps
    - Verify direct `e.department_uuid` references still work (preservation of valid pattern)
    - **EXPECTED OUTCOME**: Test PASSES (confirms bug is fixed)
    - _Requirements: 2.1, 2.3, 2.4, 2.5, 2.6_

  - [ ] 3.15 Verify preservation tests still pass
    - **Property 2: Preservation** - Correct Query Behavior
    - **IMPORTANT**: Re-run the SAME tests from task 2 - do NOT write new tests
    - Run preservation property tests from step 2
    - Verify correctly-written queries produce identical results:
      1. Queries using direct `e.department_uuid` still work identically (critical preservation)
      2. Queries with correct JOIN order still work identically
      3. Snake_case column queries unchanged
      4. Unrelated queries unaffected
      5. Authentication flow works identically
    - **EXPECTED OUTCOME**: Tests PASS (confirms no regressions)
    - Confirm all tests still pass after fix (no regressions)

- [ ] 4. Checkpoint - Ensure all tests pass
  - Run full test suite including bug condition and preservation tests
  - Verify all affected files have corrected queries
  - Confirm both fix strategies work correctly:
    - Direct `e.department_uuid` references work (Option A)
    - Position-based references with proper JOINs work (Option B)
  - Test authentication flow: login → page display works without SQL errors
  - Test all affected endpoints (accounts, employees, requests, RBAC, letters, logs)
  - Verify user pages display correctly after authentication (primary symptom resolution)
  - Test with different user roles and data combinations
  - Confirm no SQL "Unknown column" errors in application logs
  - Verify direct department references preserved (critical - these were never broken)
  - Ensure all tests pass, ask the user if questions arise
