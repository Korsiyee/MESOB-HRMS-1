# Implementation Plan

## Overview

This implementation plan follows the exploratory bugfix workflow to fix the `can_be_deleted` column mismatch bug. The bug occurs when service layer code references a non-existent `can_be_deleted` column in the Roles table, causing database crashes. The actual schema only includes `is_system_role`, which serves the same purpose with inverted logic.

---

## Tasks

- [ ] 1. Write bug condition exploration test
  - **Property 1: Bug Condition** - Database Queries Crash on can_be_deleted References
  - **CRITICAL**: This test MUST FAIL on unfixed code - failure confirms the bug exists
  - **DO NOT attempt to fix the test or the code when it fails**
  - **NOTE**: This test encodes the expected behavior - it will validate the fix when it passes after implementation
  - **GOAL**: Surface counterexamples that demonstrate the bug exists
  - **Scoped PBT Approach**: For deterministic bugs, scope the property to the concrete failing cases to ensure reproducibility
  - Test implementation details from Bug Condition in design:
    - Test that `rbacService.getRoleByUuid()` crashes with "Unknown column 'can_be_deleted'" error on unfixed code
    - Test that `rbacService.getRoleByCode()` crashes with "Unknown column 'can_be_deleted'" error on unfixed code
    - Test that `rbacService.getAllRoles()` crashes with "Unknown column 'can_be_deleted'" error on unfixed code
    - Test that `roleManagementService.createRole()` crashes with "Unknown column 'can_be_deleted'" error on unfixed code
    - Test that `roleManagementService.deleteRole()` accesses undefined `role.can_be_deleted` property on unfixed code
  - The test assertions should match the Expected Behavior Properties from design:
    - After fix: queries should execute successfully without database errors
    - After fix: deletion logic should use `is_system_role` column correctly
  - Run test on UNFIXED code
  - **EXPECTED OUTCOME**: Test FAILS (this is correct - it proves the bug exists)
  - Document counterexamples found to understand root cause:
    - Record exact error messages from database crashes
    - Record which service functions fail (getRoleByUuid, getRoleByCode, getAllRoles, createRole, deleteRole)
    - Confirm that `can_be_deleted` column does not exist in Roles table schema
  - Mark task complete when test is written, run, and failure is documented
  - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 1.6_

- [ ] 2. Write preservation property tests (BEFORE implementing fix)
  - **Property 2: Preservation** - System Role Protection and Non-Buggy Operations
  - **IMPORTANT**: Follow observation-first methodology
  - Observe behavior on UNFIXED code for non-buggy inputs (operations that don't reference `can_be_deleted`):
    - Observe that system roles with `is_system_role = TRUE` are protected from deletion
    - Observe that custom roles with `is_system_role = FALSE` can be deleted (if no users assigned)
    - Observe that role update operations work correctly
    - Observe that role permission assignments work correctly
    - Observe that all role attributes (uuid, code, name, description, hierarchy_level, is_system_role, is_active, timestamps) are retrieved correctly
  - Write property-based tests capturing observed behavior patterns from Preservation Requirements:
    - **Test 1**: For all roles where `is_system_role = TRUE`, deletion SHALL throw "Cannot delete system roles" error
    - **Test 2**: For all roles where `is_system_role = FALSE` AND no users assigned, deletion SHALL succeed
    - **Test 3**: For all role update operations (name, description, hierarchy_level), updates SHALL persist correctly
    - **Test 4**: For all role queries, attributes SHALL match expected values
    - **Test 5**: For all role filtering by `is_active`, results SHALL match filter criteria
  - Property-based testing generates many test cases for stronger guarantees
  - Run tests on UNFIXED code
  - **EXPECTED OUTCOME**: Tests PASS (this confirms baseline behavior to preserve)
  - Mark task complete when tests are written, run, and passing on unfixed code
  - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 3.6_

- [ ] 3. Fix for can_be_deleted column mismatch

  - [ ] 3.1 Remove can_be_deleted from rbacService.getRoleByUuid()
    - File: `backend/src/services/rbacService.js`
    - Line: 86-87
    - Change SELECT query to exclude `can_be_deleted` column
    - _Bug_Condition: isBugCondition(operation) where operation.targetTable == 'Roles' AND operation.referencesColumn('can_be_deleted')_
    - _Expected_Behavior: Query executes successfully using only existing columns (expectedBehavior from design)_
    - _Preservation: System role protection and role data retrieval must remain unchanged_
    - _Requirements: 1.1, 2.1_

  - [ ] 3.2 Remove can_be_deleted from rbacService.getRoleByCode()
    - File: `backend/src/services/rbacService.js`
    - Line: 103-104
    - Change SELECT query to exclude `can_be_deleted` column
    - _Bug_Condition: isBugCondition(operation) where operation.targetTable == 'Roles' AND operation.referencesColumn('can_be_deleted')_
    - _Expected_Behavior: Query executes successfully using only existing columns (expectedBehavior from design)_
    - _Preservation: System role protection and role data retrieval must remain unchanged_
    - _Requirements: 1.2, 2.2_

  - [ ] 3.3 Remove can_be_deleted from rbacService.getAllRoles()
    - File: `backend/src/services/rbacService.js`
    - Line: 660-661
    - Change SELECT query to exclude `can_be_deleted` column
    - _Bug_Condition: isBugCondition(operation) where operation.targetTable == 'Roles' AND operation.referencesColumn('can_be_deleted')_
    - _Expected_Behavior: Query executes successfully using only existing columns (expectedBehavior from design)_
    - _Preservation: System role protection and role data retrieval must remain unchanged_
    - _Requirements: 1.3, 2.3_

  - [ ] 3.4 Remove can_be_deleted from roleManagementService.createRole()
    - File: `backend/src/services/roleManagementService.js`
    - Line: 35-38
    - Change INSERT query to exclude `can_be_deleted` column and its corresponding value (TRUE)
    - Remove one parameter from VALUES list
    - _Bug_Condition: isBugCondition(operation) where operation.targetTable == 'Roles' AND operation.referencesColumn('can_be_deleted')_
    - _Expected_Behavior: Query executes successfully using only existing columns (expectedBehavior from design)_
    - _Preservation: Role creation business logic must remain unchanged_
    - _Requirements: 1.4, 2.4_

  - [ ] 3.5 Replace can_be_deleted check with is_system_role in roleManagementService.deleteRole()
    - File: `backend/src/services/roleManagementService.js`
    - Line: 126-128
    - Remove `if (!role.can_be_deleted)` check (references undefined property)
    - Keep only `if (role.is_system_role)` check for deletion validation
    - Use error message "Cannot delete system roles" for system role protection
    - _Bug_Condition: isBugCondition(operation) where operation.referencesColumn('can_be_deleted')_
    - _Expected_Behavior: Deletion logic uses is_system_role correctly (expectedBehavior from design)_
    - _Preservation: System role deletion protection must remain unchanged (is_system_role = TRUE prevents deletion)_
    - _Requirements: 1.5, 2.5_

  - [ ] 3.6 Verify bug condition exploration test now passes
    - **Property 1: Expected Behavior** - Database Queries Execute Successfully
    - **IMPORTANT**: Re-run the SAME test from task 1 - do NOT write a new test
    - The test from task 1 encodes the expected behavior
    - When this test passes, it confirms the expected behavior is satisfied
    - Run bug condition exploration test from step 1:
      - Verify `rbacService.getRoleByUuid()` executes without database errors
      - Verify `rbacService.getRoleByCode()` executes without database errors
      - Verify `rbacService.getAllRoles()` executes without database errors
      - Verify `roleManagementService.createRole()` executes without database errors
      - Verify `roleManagementService.deleteRole()` uses `is_system_role` correctly
    - **EXPECTED OUTCOME**: Test PASSES (confirms bug is fixed)
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 2.6_

  - [ ] 3.7 Verify preservation tests still pass
    - **Property 2: Preservation** - System Role Protection and Non-Buggy Operations
    - **IMPORTANT**: Re-run the SAME tests from task 2 - do NOT write new tests
    - Run preservation property tests from step 2:
      - Verify system roles (is_system_role = TRUE) still cannot be deleted
      - Verify custom roles (is_system_role = FALSE) can still be deleted
      - Verify role update operations still work correctly
      - Verify role attributes are still retrieved correctly
      - Verify role filtering by is_active still works correctly
    - **EXPECTED OUTCOME**: Tests PASS (confirms no regressions)
    - Confirm all tests still pass after fix (no regressions)
    - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 3.6_

- [ ] 4. Checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise
  - Verify bug condition test passes (bug is fixed)
  - Verify preservation tests pass (no regressions)
  - Verify frontend Role Management page loads without 500 errors
  - Verify system roles cannot be deleted
  - Verify custom roles can be deleted (when no users assigned)
