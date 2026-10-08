# Implementation Plan

- [ ] 1. Write bug condition exploration test
  - **Property 1: Bug Condition** - Corrector Column Reference Causes SQL Error
  - **CRITICAL**: This test MUST FAIL on unfixed code - failure confirms the bug exists
  - **DO NOT attempt to fix the test or the code when it fails**
  - **NOTE**: This test encodes the expected behavior - it will validate the fix when it passes after implementation
  - **GOAL**: Surface counterexamples that demonstrate the bug exists
  - **Scoped PBT Approach**: Scope the property to the concrete failing queries - getAttendanceRecords and getRecentCorrections functions
  - Test that getAttendanceRecords() throws ER_BAD_FIELD_ERROR with "Unknown column 'a.corrected_by'" for any valid date range
  - Test that getRecentCorrections() throws ER_BAD_FIELD_ERROR with "Unknown column 'a.corrected_by'" when called
  - Verify the error originates from SQL JOIN clauses: `LEFT JOIN Employees c ON c.uuid = a.corrected_by`
  - Verify the AttendanceSummary schema contains column `corrected_by_uuid` (not `corrected_by`)
  - The test assertions should match: queries execute successfully and return corrector information when it exists
  - Run test on UNFIXED code
  - **EXPECTED OUTCOME**: Test FAILS (this is correct - it proves the bug exists)
  - Document counterexamples found: specific error messages, line numbers, and query fragments that fail
  - Mark task complete when test is written, run, and failure is documented
  - _Requirements: 1.1, 1.2, 1.3_

- [ ] 2. Write preservation property tests (BEFORE implementing fix)
  - **Property 2: Preservation** - Non-Corrector Query Behavior
  - **IMPORTANT**: Follow observation-first methodology
  - Observe behavior on UNFIXED code for queries that don't reference corrector columns
  - Test getOverviewSummary() - capture status counts (PRESENT, ABSENT, LATE, etc.) from unfixed code
  - Test getAttendanceTrend() - capture daily present/absent trends from unfixed code
  - Test getDepartmentStats() - capture department statistics from unfixed code
  - Test getTopEmployees() - capture top employee rankings from unfixed code
  - Write property-based tests: for all date ranges and filter combinations, these queries return consistent results
  - Property-based testing generates many test cases for stronger guarantees
  - Verify filtering logic (departmentUuid, positionUuid, status, search) works identically
  - Verify pagination logic (page, pageSize, offset) produces correct results
  - Run tests on UNFIXED code
  - **EXPECTED OUTCOME**: Tests PASS (this confirms baseline behavior to preserve)
  - Mark task complete when tests are written, run, and passing on unfixed code
  - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5_

- [ ] 3. Fix corrected_by column name in attendanceAnalyticsService.js

  - [ ] 3.1 Update getRecentCorrections function (lines 161-186)
    - Change line ~175 JOIN clause: `LEFT JOIN Employees c ON c.uuid = a.corrected_by` → `LEFT JOIN Employees c ON c.uuid = a.corrected_by_uuid`
    - Change line ~176 WHERE clause: `WHERE a.corrected_by IS NOT NULL` → `WHERE a.corrected_by_uuid IS NOT NULL`
    - _Bug_Condition: isBugCondition(query) where query.joins CONTAINS 'a.corrected_by' AND AttendanceSummary.schema NOT CONTAINS 'corrected_by'_
    - _Expected_Behavior: Queries execute successfully using corrected_by_uuid and return corrector information when it exists_
    - _Preservation: All non-corrector queries (getOverviewSummary, getAttendanceTrend, getDepartmentStats, getTopEmployees) produce identical results_
    - _Requirements: 2.1, 2.2, 2.3, 3.1, 3.2, 3.3, 3.4, 3.5_

  - [ ] 3.2 Update getAttendanceRecords function (lines 195-260)
    - Change line ~217 JOIN clause: `LEFT JOIN Employees c ON c.uuid = a.corrected_by` → `LEFT JOIN Employees c ON c.uuid = a.corrected_by_uuid`
    - _Bug_Condition: isBugCondition(query) where query.joins CONTAINS 'a.corrected_by' AND AttendanceSummary.schema NOT CONTAINS 'corrected_by'_
    - _Expected_Behavior: Queries execute successfully using corrected_by_uuid and return corrector information when it exists_
    - _Preservation: Filtering, pagination, and aggregation logic remain unchanged_
    - _Requirements: 2.1, 2.2, 2.3, 3.1, 3.2, 3.3, 3.4, 3.5_

  - [ ] 3.3 Verify bug condition exploration test now passes
    - **Property 1: Expected Behavior** - Corrector Column Reference Executes Successfully
    - **IMPORTANT**: Re-run the SAME test from task 1 - do NOT write a new test
    - The test from task 1 encodes the expected behavior
    - When this test passes, it confirms the expected behavior is satisfied
    - Run bug condition exploration test from step 1
    - Verify getAttendanceRecords() executes successfully without SQL errors
    - Verify getRecentCorrections() executes successfully without SQL errors
    - Verify queries return corrector information when corrected_by_uuid is not NULL
    - Verify queries handle NULL corrector gracefully (LEFT JOIN behavior)
    - **EXPECTED OUTCOME**: Test PASSES (confirms bug is fixed)
    - _Requirements: 2.1, 2.2, 2.3_

  - [ ] 3.4 Verify preservation tests still pass
    - **Property 2: Preservation** - Non-Corrector Query Behavior Unchanged
    - **IMPORTANT**: Re-run the SAME tests from task 2 - do NOT write new tests
    - Run preservation property tests from step 2
    - Verify getOverviewSummary produces identical results
    - Verify getAttendanceTrend produces identical results
    - Verify getDepartmentStats produces identical results
    - Verify getTopEmployees produces identical results
    - Verify all filtering and pagination logic works identically
    - **EXPECTED OUTCOME**: Tests PASS (confirms no regressions)
    - Confirm all tests still pass after fix (no regressions)
    - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5_

- [ ] 4. Checkpoint - Ensure all tests pass
  - Verify bug condition test passes (queries execute successfully)
  - Verify preservation tests pass (non-corrector queries unchanged)
  - Test with records containing corrector information (corrected_by_uuid NOT NULL)
  - Test with records without corrector information (corrected_by_uuid IS NULL)
  - Verify no ER_BAD_FIELD_ERROR errors in server logs
  - Ensure attendance overview dashboard loads successfully
  - Ask the user if questions arise
