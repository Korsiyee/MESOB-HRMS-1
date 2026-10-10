# SUPER_ADMIN Module Access Bugfix Design

## Overview

This document specifies the design for fixing a critical bug where users with the SUPER_ADMIN role can only access 2 modules (LETTERS and SHIFTS) instead of all 18 modules they should have access to. The root cause has been identified as missing module records in the database Modules table.

The fix involves inserting 16 missing module records into the Modules table with correct codes that match the static configuration defined in `roleModuleMapping.js`. This is a data migration fix that requires no code changes to the application logic.

**Impact**: This fix will restore full system access for SUPER_ADMIN users, enabling them to access all administrative functions including Employee Management, Departments, Positions, Levels, Attendance Records, Network Settings, Leave Settings, Accounts, and Audit Logs.

## Glossary

- **Bug_Condition (C)**: The condition that triggers the bug - when a SUPER_ADMIN user logs in and the database returns fewer than 18 module records
- **Property (P)**: The desired behavior when SUPER_ADMIN logs in - all 18 modules should be returned from the database with matching codes
- **Preservation**: Existing module access for other roles (EMPLOYEE, DEPT_HEAD, HR_OFFICER, HR_ADMIN) that must remain unchanged by the fix
- **Modules Table**: The database table that stores module definitions with columns: uuid, code, name, description, category, icon, display_order, is_active
- **Static Configuration**: The hardcoded role-module mapping defined in `backend/src/config/roleModuleMapping.js` that specifies which module codes each role should have access to
- **getUserPermissions()**: The function in `moduleAuthService.js` that queries the Modules table to get full module details for a user's role based on the static configuration
- **Module Code**: A unique identifier for each module (e.g., EMPLOYEE_LIST, MY_ATTENDANCE) used to match static configuration with database records

## Bug Details

### Bug Condition

The bug manifests when a SUPER_ADMIN user logs in and the system queries the Modules table for 18 module codes defined in the static configuration, but the database only returns 2 module records (LETTERS and SHIFTS). This causes the getUserPermissions() function to return an incomplete module list, preventing the user from accessing 16 critical system functions.

**Formal Specification:**
```
FUNCTION isBugCondition(input)
  INPUT: input of type UserLoginRequest with role_code and user_uuid
  OUTPUT: boolean
  
  RETURN input.role_code = 'SUPER_ADMIN' AND
         LET static_module_codes = getModulesForRole('SUPER_ADMIN') IN
         LET db_modules = SELECT code FROM Modules WHERE code IN (static_module_codes) AND is_active = TRUE IN
         COUNT(db_modules) < 18
END FUNCTION
```

**System Flow:**
1. User with role_code = 'SUPER_ADMIN' logs in
2. `getModulesForRole('SUPER_ADMIN')` returns array of 18 module codes from static configuration
3. `moduleAuthService.js` executes: `SELECT * FROM Modules WHERE code IN (18 codes) AND is_active = TRUE`
4. **Database returns only 2 rows** because only LETTERS and SHIFTS exist with matching codes
5. Frontend receives only 2 modules and displays limited navigation menu

**Database State Issue:**
The Modules table is missing 16 records. Current state:
- **Present**: LETTERS, SHIFTS (2 records)
- **Missing**: EMPLOYEE_LIST, EMPLOYEE_PROFILE, REGISTER_EMPLOYEE, DEPARTMENTS, POSITIONS, LEVELS, ATTENDANCE_RECORDS, NETWORK_SETTINGS, LEAVE_REQUESTS, LEAVE_SETTINGS, ACCOUNTS, AUDIT_LOGS, MY_ATTENDANCE, MY_LETTERS, MY_LEAVES, MY_ACCOUNTS (16 records)

### Examples

**Scenario 1: SUPER_ADMIN Login (Current Buggy Behavior)**
- Input: User with role_code = 'SUPER_ADMIN' logs in
- Static Config Returns: 18 module codes
- Database Query: `SELECT * FROM Modules WHERE code IN (18 codes)`
- **Actual Result**: 2 modules returned (LETTERS, SHIFTS)
- **Expected Result**: 18 modules returned
- Impact: Admin cannot access employee management, departments, audit logs, etc.

**Scenario 2: Attempting to Access Missing Module**
- Input: SUPER_ADMIN tries to access /admin/employees route
- Static Config: EMPLOYEE_LIST module code is in SUPER_ADMIN's array
- Database Query: `SELECT * FROM Modules WHERE code = 'EMPLOYEE_LIST'`
- **Actual Result**: No record found, access denied or 404 error
- **Expected Result**: Module record found, access granted

**Scenario 3: HR_ADMIN Login (Working Correctly)**
- Input: User with role_code = 'HR_ADMIN' logs in
- Static Config Returns: 18 module codes (same as SUPER_ADMIN)
- Database Query: `SELECT * FROM Modules WHERE code IN (18 codes)`
- **Actual Result**: 2 modules returned (LETTERS, SHIFTS)
- **Expected Result**: 18 modules returned
- Note: HR_ADMIN has the same bug as SUPER_ADMIN

**Scenario 4: EMPLOYEE Login (Unaffected)**
- Input: User with role_code = 'EMPLOYEE' logs in
- Static Config Returns: 4 module codes (MY_ATTENDANCE, MY_LETTERS, MY_LEAVES, MY_ACCOUNTS)
- Database Query: `SELECT * FROM Modules WHERE code IN (4 codes)`
- **Actual Result**: 2 modules returned (MY_LETTERS only, MY_ATTENDANCE/MY_LEAVES/MY_ACCOUNTS missing)
- **Expected Result**: 4 modules returned
- Note: EMPLOYEE role is also affected but to a lesser extent

## Expected Behavior

After applying the fix, the database will contain all 18 module records with correct codes matching the static configuration. When any role queries for their assigned modules, the database will return complete results.

### Preservation Requirements

**Unchanged Behaviors:**
- The static configuration in `roleModuleMapping.js` must remain unchanged (no code modifications)
- The `getUserPermissions()` function logic must remain unchanged (no code modifications)
- Users with role_code 'EMPLOYEE' must continue to see only their 4 personal modules (subset of 18)
- Users with role_code 'DEPT_HEAD' must continue to see their 11 assigned modules
- Users with role_code 'HR_OFFICER' must continue to see their 13 assigned modules
- Module access filtering by `is_active = TRUE` must continue to work
- The RoleModules join table mappings must remain functional (though they are informational only since static config is authoritative)

**Scope:**
All database queries that do NOT involve the 16 missing module codes should be completely unaffected by this fix. This includes:
- Queries for existing modules (LETTERS, SHIFTS)
- Queries for user authentication and role assignment
- Queries for employee data, attendance, leaves, etc.
- All application logic and code functionality

**What Changes:**
- Modules table will grow from 2 records to 18 records
- Database queries `WHERE code IN (module_codes)` will return more results for all roles
- All roles will now see their complete module list as defined in static configuration

## Hypothesized Root Cause

Based on the bug description and code analysis, the root cause is definitively:

**Incomplete Database Seeding**

The Modules table was not fully populated during system setup or migration. The most likely scenarios are:

1. **Partial Migration Execution**: The `static_rbac_migration.sql` script (which seeds all 18 modules) was either:
   - Never executed on this database instance
   - Executed but interrupted before completing the module inserts
   - Executed on a different database that was not deployed to production

2. **Manual Database Manipulation**: Someone may have manually deleted 16 module records from the Modules table, leaving only LETTERS and SHIFTS

3. **Failed Transaction Rollback**: A database transaction that inserted the module records may have been rolled back due to an error, but LETTERS and SHIFTS were inserted in a separate successful transaction

**Evidence Supporting This Hypothesis:**
- The static configuration correctly defines all 18 modules for SUPER_ADMIN
- The `getUserPermissions()` query logic is correct (no code bugs)
- Only 2 modules exist in the database when 18 are expected
- The migration script exists and contains correct INSERT statements for all 18 modules
- No error handling or validation prevents the system from working with incomplete data

**Why LETTERS and SHIFTS Exist:**
These two modules likely exist because:
- They were inserted manually for testing purposes
- They were part of an earlier, partial migration
- They correspond to the most frequently used features and were prioritized

## Correctness Properties

Property 1: Bug Condition - SUPER_ADMIN Sees All 18 Modules

_For any_ user login request where role_code = 'SUPER_ADMIN' and the static configuration defines 18 module codes, the fixed database SHALL contain all 18 module records with matching codes, and the getUserPermissions() function SHALL return all 18 modules with is_active = TRUE.

**Validates: Requirements 2.1, 2.2, 2.3**

Property 2: Preservation - Other Roles' Module Access Unchanged

_For any_ user login request where role_code is NOT 'SUPER_ADMIN' (i.e., EMPLOYEE, DEPT_HEAD, HR_OFFICER, HR_ADMIN), the fixed database SHALL return the same module records for the codes defined in their static configuration, and the getUserPermissions() function SHALL produce the same module list as before the fix (or more modules if they were also affected by missing records, but filtered correctly by their role's static configuration).

**Validates: Requirements 3.1, 3.2, 3.3, 3.4, 3.5**

## Fix Implementation

### Changes Required

This is a **data-only fix** - no application code changes are required. The fix involves executing a SQL migration script that inserts the 16 missing module records into the Modules table.

**File**: `database/fix_superadmin_modules.sql` (new file to be created)

**Migration Strategy**: Idempotent INSERT using INSERT IGNORE to safely add missing modules without duplicating existing ones

### Specific Changes

**1. Create Migration Script**

Create a new SQL file that:
- Uses INSERT IGNORE to safely add missing modules
- Preserves existing LETTERS and SHIFTS records
- Uses consistent UUID generation
- Sets appropriate metadata (name, description, category, icon, display_order)
- Ensures all modules have is_active = TRUE
- Orders modules logically for UI display

**2. Module Metadata Definitions**

Each of the 16 missing modules needs:
- **uuid**: Generated using UUID() function
- **code**: Exact match to static configuration (e.g., 'EMPLOYEE_LIST')
- **name**: User-friendly display name (e.g., 'Employee List')
- **description**: Clear explanation of module purpose
- **category**: Either 'HR_MANAGEMENT' or 'PERSONAL' based on static MODULE_CATEGORIES
- **icon**: Font Awesome icon name (e.g., 'users', 'briefcase')
- **display_order**: Integer for UI ordering (1-18)
- **is_active**: Set to TRUE (1)

**3. Missing Modules to Insert**

| Code | Name | Category | Icon | Display Order |
|------|------|----------|------|---------------|
| EMPLOYEE_LIST | Employee List | HR_MANAGEMENT | users | 1 |
| EMPLOYEE_PROFILE | Employee Profile | HR_MANAGEMENT | user | 2 |
| REGISTER_EMPLOYEE | Register Employee | HR_MANAGEMENT | user-plus | 3 |
| DEPARTMENTS | Departments | HR_MANAGEMENT | building | 4 |
| POSITIONS | Positions | HR_MANAGEMENT | briefcase | 5 |
| LEVELS | Levels | HR_MANAGEMENT | layers | 6 |
| ATTENDANCE_RECORDS | Attendance Records | HR_MANAGEMENT | calendar-check | 7 |
| NETWORK_SETTINGS | Network Settings | HR_MANAGEMENT | settings | 8 |
| LEAVE_REQUESTS | Leave Requests | HR_MANAGEMENT | calendar-x | 11 |
| LEAVE_SETTINGS | Leave Settings | HR_MANAGEMENT | settings | 12 |
| ACCOUNTS | Accounts | HR_MANAGEMENT | key | 13 |
| AUDIT_LOGS | Audit Logs | HR_MANAGEMENT | file-search | 14 |
| MY_ATTENDANCE | My Attendance | PERSONAL | calendar-check | 15 |
| MY_LETTERS | My Letters | PERSONAL | file-text | 16 |
| MY_LEAVES | My Leaves | PERSONAL | calendar-x | 17 |
| MY_ACCOUNTS | My Accounts | PERSONAL | user-cog | 18 |

**Note**: SHIFTS (display_order 9) and LETTERS (display_order 10) already exist and will be preserved.

**4. Safe Execution Strategy**

The migration script must:
- Start with a SELECT query to verify current state (show existing modules)
- Use INSERT IGNORE to prevent errors if modules already exist
- Include verification queries at the end to confirm all 18 modules exist
- Be idempotent (safe to run multiple times)
- Not require transaction rollback (uses INSERT IGNORE)
- Log execution results for audit trail

**5. Verification Queries**

After execution, verify:
```sql
-- Should return 18
SELECT COUNT(*) as total_modules FROM Modules WHERE is_active = TRUE;

-- Should return all 18 module codes
SELECT code, name, category FROM Modules ORDER BY display_order;

-- Should return 18 for SUPER_ADMIN
SELECT r.code as role_code, COUNT(m.uuid) as module_count
FROM Roles r
CROSS JOIN Modules m
WHERE r.code = 'SUPER_ADMIN' 
  AND m.code IN (
    'EMPLOYEE_LIST', 'EMPLOYEE_PROFILE', 'REGISTER_EMPLOYEE',
    'DEPARTMENTS', 'POSITIONS', 'LEVELS', 'ATTENDANCE_RECORDS',
    'NETWORK_SETTINGS', 'SHIFTS', 'LETTERS', 'LEAVE_REQUESTS',
    'LEAVE_SETTINGS', 'ACCOUNTS', 'AUDIT_LOGS', 'MY_ATTENDANCE',
    'MY_LETTERS', 'MY_LEAVES', 'MY_ACCOUNTS'
  )
  AND m.is_active = TRUE;
```

### Alternative: Update RoleModules Table

**Note**: The RoleModules table is **informational only** in the current system because the static configuration in `roleModuleMapping.js` is authoritative. However, for database consistency and potential future use, the fix should also ensure the RoleModules table has correct mappings for all roles.

The migration script should optionally include:
```sql
-- Sync RoleModules with static configuration
-- This ensures database consistency even though static config is authoritative
```

This is a **low-priority enhancement** and not required for the bug fix to work, since `moduleAuthService.js` doesn't use the RoleModules table for access control.

## Testing Strategy

### Validation Approach

The testing strategy follows a two-phase approach: first, write tests that demonstrate the bug on the current database state (exploration), then verify the fix works correctly after executing the migration script (fix checking) and ensure other roles are unaffected (preservation checking).

### Exploratory Bug Condition Checking

**Goal**: Surface counterexamples that demonstrate the bug BEFORE executing the migration script. Confirm that the database is missing 16 module records.

**Test Plan**: Write tests that query the database directly and assert that only 2 modules exist. Run these tests on the UNFIXED database to observe failures and confirm the root cause.

**Test Cases**:

1. **Database State Verification**: Query Modules table and assert only 2 records exist
   ```javascript
   const [modules] = await db.query('SELECT code FROM Modules WHERE is_active = TRUE');
   expect(modules.length).toBe(2); // Will pass on unfixed DB
   expect(modules.map(m => m.code)).toContain('LETTERS');
   expect(modules.map(m => m.code)).toContain('SHIFTS');
   ```

2. **SUPER_ADMIN Module Count Test**: Call getUserPermissions() for SUPER_ADMIN and assert it returns only 2 modules (will fail on unfixed code)
   ```javascript
   const permissions = await getUserPermissions(superAdminUserUuid);
   expect(permissions.modules.length).toBe(2); // Will pass on unfixed DB, should be 18
   ```

3. **Missing Module Code Test**: Query for a specific missing module code and assert it doesn't exist
   ```javascript
   const [rows] = await db.query("SELECT * FROM Modules WHERE code = 'EMPLOYEE_LIST'");
   expect(rows.length).toBe(0); // Will pass on unfixed DB - module missing
   ```

4. **Static Config vs Database Mismatch Test**: Compare static config module codes with database and assert 16 are missing
   ```javascript
   const staticCodes = getModulesForRole('SUPER_ADMIN'); // Returns 18 codes
   const [dbModules] = await db.query('SELECT code FROM Modules WHERE is_active = TRUE');
   const dbCodes = dbModules.map(m => m.code);
   const missingCodes = staticCodes.filter(code => !dbCodes.includes(code));
   expect(missingCodes.length).toBe(16); // Will pass on unfixed DB
   ```

**Expected Counterexamples**:
- Database query returns 2 modules when 18 are expected
- getUserPermissions() returns incomplete module list for SUPER_ADMIN
- Specific module codes defined in static config are missing from database
- Frontend navigation shows only 2 menu items for SUPER_ADMIN

### Fix Checking

**Goal**: Verify that after executing the migration script, the database contains all 18 module records with correct codes, and getUserPermissions() returns all 18 modules for SUPER_ADMIN.

**Pseudocode:**
```
GIVEN migration script has been executed
FOR ALL input WHERE isBugCondition(input) BEFORE FIX DO
  // After fix, bug condition should no longer be true
  result := getUserPermissions_fixed(input.user_uuid)
  ASSERT result.modules.length = 18
  ASSERT all_required_module_codes_present(result.modules)
  ASSERT no_crash(result)
END FOR

FUNCTION all_required_module_codes_present(modules)
  required_codes := [
    'EMPLOYEE_LIST', 'EMPLOYEE_PROFILE', 'REGISTER_EMPLOYEE',
    'DEPARTMENTS', 'POSITIONS', 'LEVELS', 'ATTENDANCE_RECORDS',
    'NETWORK_SETTINGS', 'SHIFTS', 'LETTERS', 'LEAVE_REQUESTS',
    'LEAVE_SETTINGS', 'ACCOUNTS', 'AUDIT_LOGS', 'MY_ATTENDANCE',
    'MY_LETTERS', 'MY_LEAVES', 'MY_ACCOUNTS'
  ]
  
  FOR EACH code IN required_codes DO
    ASSERT EXISTS module IN modules WHERE module.code = code
  END FOR
  
  RETURN true
END FUNCTION
```

**Test Implementation:**
```javascript
describe('Fix Checking: SUPER_ADMIN Module Access', () => {
  test('Database contains all 18 modules after fix', async () => {
    const [modules] = await db.query('SELECT code FROM Modules WHERE is_active = TRUE');
    expect(modules.length).toBe(18);
  });

  test('SUPER_ADMIN getUserPermissions returns 18 modules', async () => {
    const permissions = await getUserPermissions(superAdminUserUuid);
    expect(permissions.modules.length).toBe(18);
  });

  test('All required module codes present in database', async () => {
    const requiredCodes = [
      'EMPLOYEE_LIST', 'EMPLOYEE_PROFILE', 'REGISTER_EMPLOYEE',
      'DEPARTMENTS', 'POSITIONS', 'LEVELS', 'ATTENDANCE_RECORDS',
      'NETWORK_SETTINGS', 'SHIFTS', 'LETTERS', 'LEAVE_REQUESTS',
      'LEAVE_SETTINGS', 'ACCOUNTS', 'AUDIT_LOGS', 'MY_ATTENDANCE',
      'MY_LETTERS', 'MY_LEAVES', 'MY_ACCOUNTS'
    ];
    
    for (const code of requiredCodes) {
      const [rows] = await db.query('SELECT * FROM Modules WHERE code = ?', [code]);
      expect(rows.length).toBe(1);
      expect(rows[0].is_active).toBe(1);
    }
  });

  test('All modules have correct metadata', async () => {
    const [modules] = await db.query('SELECT * FROM Modules ORDER BY display_order');
    expect(modules.length).toBe(18);
    
    // Verify display_order sequence
    modules.forEach((module, index) => {
      expect(module.display_order).toBe(index + 1);
    });
    
    // Verify categories
    const hrModules = modules.filter(m => m.category === 'HR_MANAGEMENT');
    const personalModules = modules.filter(m => m.category === 'PERSONAL');
    expect(hrModules.length).toBe(14);
    expect(personalModules.length).toBe(4);
  });
});
```

### Preservation Checking

**Goal**: Verify that after executing the migration script, other roles (EMPLOYEE, DEPT_HEAD, HR_OFFICER, HR_ADMIN) continue to receive their correct module lists as defined in the static configuration, and no unintended modules are added to their access.

**Pseudocode:**
```
GIVEN migration script has been executed
FOR ALL role IN ['EMPLOYEE', 'DEPT_HEAD', 'HR_OFFICER', 'HR_ADMIN'] DO
  // Get expected module codes from static config
  expected_codes := getModulesForRole(role)
  
  // Get actual modules from getUserPermissions
  user_with_role := findUserWithRole(role)
  actual_permissions := getUserPermissions_fixed(user_with_role.uuid)
  actual_codes := actual_permissions.modules.map(m => m.code)
  
  // Verify exact match
  ASSERT actual_codes.length = expected_codes.length
  ASSERT actual_codes.sort() = expected_codes.sort()
  
  // Verify no extra modules leaked in
  FOR EACH code IN actual_codes DO
    ASSERT code IN expected_codes
  END FOR
END FOR
```

**Test Implementation:**
```javascript
describe('Preservation Checking: Other Roles Unaffected', () => {
  test('EMPLOYEE role receives exactly 4 personal modules', async () => {
    const employeeUser = await findUserByRole('EMPLOYEE');
    const permissions = await getUserPermissions(employeeUser.uuid);
    
    expect(permissions.modules.length).toBe(4);
    
    const expectedCodes = ['MY_ATTENDANCE', 'MY_LETTERS', 'MY_LEAVES', 'MY_ACCOUNTS'];
    const actualCodes = permissions.modules.map(m => m.code).sort();
    expect(actualCodes).toEqual(expectedCodes.sort());
  });

  test('DEPT_HEAD role receives exactly 11 modules', async () => {
    const deptHeadUser = await findUserByRole('DEPT_HEAD');
    const permissions = await getUserPermissions(deptHeadUser.uuid);
    
    expect(permissions.modules.length).toBe(11);
    
    const expectedCodes = getModulesForRole('DEPT_HEAD');
    const actualCodes = permissions.modules.map(m => m.code).sort();
    expect(actualCodes).toEqual(expectedCodes.sort());
  });

  test('HR_OFFICER role receives exactly 13 modules', async () => {
    const hrOfficerUser = await findUserByRole('HR_OFFICER');
    const permissions = await getUserPermissions(hrOfficerUser.uuid);
    
    expect(permissions.modules.length).toBe(13);
    
    const expectedCodes = getModulesForRole('HR_OFFICER');
    const actualCodes = permissions.modules.map(m => m.code).sort();
    expect(actualCodes).toEqual(expectedCodes.sort());
  });

  test('HR_ADMIN role receives exactly 18 modules', async () => {
    const hrAdminUser = await findUserByRole('HR_ADMIN');
    const permissions = await getUserPermissions(hrAdminUser.uuid);
    
    expect(permissions.modules.length).toBe(18);
    
    const expectedCodes = getModulesForRole('HR_ADMIN');
    const actualCodes = permissions.modules.map(m => m.code).sort();
    expect(actualCodes).toEqual(expectedCodes.sort());
  });

  test('No role receives modules not in their static configuration', async () => {
    const allRoles = ['EMPLOYEE', 'DEPT_HEAD', 'HR_OFFICER', 'HR_ADMIN', 'SUPER_ADMIN'];
    
    for (const role of allRoles) {
      const user = await findUserByRole(role);
      const permissions = await getUserPermissions(user.uuid);
      const expectedCodes = getModulesForRole(role);
      
      permissions.modules.forEach(module => {
        expect(expectedCodes).toContain(module.code);
      });
    }
  });

  test('Module filtering by is_active continues to work', async () => {
    // Temporarily deactivate a module
    await db.query("UPDATE Modules SET is_active = FALSE WHERE code = 'AUDIT_LOGS'");
    
    const superAdminUser = await findUserByRole('SUPER_ADMIN');
    const permissions = await getUserPermissions(superAdminUser.uuid);
    
    // Should return 17 modules (18 - 1 inactive)
    expect(permissions.modules.length).toBe(17);
    expect(permissions.modules.map(m => m.code)).not.toContain('AUDIT_LOGS');
    
    // Restore module
    await db.query("UPDATE Modules SET is_active = TRUE WHERE code = 'AUDIT_LOGS'");
  });
});
```

### Unit Tests

**Database Layer Tests:**
- Test direct SELECT queries on Modules table for all 18 codes
- Test INSERT IGNORE behavior to ensure idempotency
- Test that module metadata (name, category, icon, display_order) is correct
- Test that is_active flag works correctly for filtering

**Service Layer Tests:**
- Test `getUserPermissions()` for each role returns correct module count
- Test `checkModuleAccess()` returns correct results for all 18 modules
- Test `getAllModules()` returns all 18 modules after fix
- Test that module codes from static config match database codes exactly

**Edge Cases:**
- Test behavior when a module has is_active = FALSE
- Test behavior when database has extra modules not in static config (should be ignored)
- Test behavior when module codes have different casing (should match exactly)

### Property-Based Tests

**Random Module Access Testing:**
- Generate random user UUIDs with different roles
- For each user, verify their module list matches static configuration exactly
- Generate random module codes and verify access control works correctly
- Test with random combinations of active/inactive modules

**Database Consistency Testing:**
- Generate random queries with different WHERE clauses on Modules table
- Verify all 18 modules are always present when is_active = TRUE
- Verify display_order creates consistent ordering across queries
- Test that category filtering returns correct subsets

**Static Config Alignment Testing:**
- For each role in ROLE_MODULE_MAPPING, verify database contains exactly those modules
- Generate random role codes and verify they return expected module counts
- Test that adding/removing modules from static config (in test environment) correctly filters database results

### Integration Tests

**Full Login Flow Testing:**
- Test complete login flow for SUPER_ADMIN user from authentication to module retrieval
- Verify that frontend receives all 18 modules in API response
- Test that navigation menu renders all 18 items correctly
- Verify that clicking each module navigates to correct route

**Cross-Role Workflow Testing:**
- Test switching between users with different roles and verify module lists update correctly
- Test that SUPER_ADMIN can access all routes that other roles can access
- Verify that lower-privilege roles cannot access SUPER_ADMIN-only modules

**Database Consistency Testing:**
- Run full application test suite to ensure no regressions in other features
- Test concurrent logins from multiple users with different roles
- Verify that module access remains consistent across multiple requests
- Test system behavior during database migration (if applied to production with downtime)

### Manual Testing Checklist

After deploying the fix:

1. ✅ Login as SUPER_ADMIN user and verify navigation shows all 18 modules
2. ✅ Click each module and verify it loads without errors
3. ✅ Login as EMPLOYEE user and verify only 4 personal modules appear
4. ✅ Login as HR_OFFICER user and verify 13 modules appear
5. ✅ Login as HR_ADMIN user and verify all 18 modules appear
6. ✅ Verify no console errors or API failures during navigation
7. ✅ Check database and confirm Modules table has 18 active records
8. ✅ Verify application performance is not degraded by additional modules
