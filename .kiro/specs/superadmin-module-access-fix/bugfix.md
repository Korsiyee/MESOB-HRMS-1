# Bugfix Requirements Document

## Introduction

This document specifies requirements for fixing a bug where users with the SUPER_ADMIN role can only see 2 modules (LETTERS and SHIFTS) in the system navigation instead of all 18 modules they should have access to. This is a critical issue as it prevents system administrators from accessing essential system management functions.

The system uses a static role-based access control (RBAC) model where:
- Module assignments are defined in `roleModuleMapping.js` (static configuration)
- The `moduleAuthService.js` queries the database `Modules` table for module details based on the static configuration
- SUPER_ADMIN should have access to all 18 modules in the system

## Bug Analysis

### Current Behavior (Defect)

1.1 WHEN a user with role_code 'SUPER_ADMIN' logs in THEN the system returns only 2 modules (LETTERS and SHIFTS) instead of all 18 modules

1.2 WHEN the `getUserPermissions()` function queries the database for modules WHERE code IN (18 module codes from static config) THEN the database returns only 2 module records (LETTERS and SHIFTS)

1.3 WHEN the system attempts to display navigation/menu items for SUPER_ADMIN THEN only "Letter" and "Shift" modules appear in the UI

### Expected Behavior (Correct)

2.1 WHEN a user with role_code 'SUPER_ADMIN' logs in THEN the system SHALL return all 18 modules defined in the static configuration

2.2 WHEN the `getUserPermissions()` function queries the database for modules WHERE code IN (18 module codes from static config) THEN the database SHALL return all 18 module records with matching codes

2.3 WHEN the system displays navigation/menu items for SUPER_ADMIN THEN all 18 modules SHALL appear: Employee List, Employee Profile, Register Employee, Departments, Positions, Levels, Attendance Records, Network Settings, Shifts, Letters, Leave Requests, Leave Settings, Accounts, Audit Logs, My Attendance, My Letters, My Leaves, and My Accounts

### Unchanged Behavior (Regression Prevention)

3.1 WHEN a user with role_code 'EMPLOYEE' logs in THEN the system SHALL CONTINUE TO return only their 4 personal modules (MY_ATTENDANCE, MY_LETTERS, MY_LEAVES, MY_ACCOUNTS)

3.2 WHEN a user with role_code 'HR_OFFICER' logs in THEN the system SHALL CONTINUE TO return their assigned 13 modules as defined in the static configuration

3.3 WHEN a user with role_code 'HR_ADMIN' logs in THEN the system SHALL CONTINUE TO return all 18 modules

3.4 WHEN the static configuration file `roleModuleMapping.js` defines module codes for any role THEN the system SHALL CONTINUE TO query only those specific module codes from the database (not return modules not in the static config)

3.5 WHEN a module record in the database has `is_active = FALSE` THEN the system SHALL CONTINUE TO exclude it from the results regardless of role

## Bug Condition and Property Specification

### Bug Condition Function

```pascal
FUNCTION isBugCondition(X)
  INPUT: X of type UserLoginRequest with role_code
  OUTPUT: boolean
  
  // Returns true when the SUPER_ADMIN user would see incomplete modules
  RETURN X.role_code = 'SUPER_ADMIN' AND 
         COUNT(database_modules_matching_static_config) < 18
END FUNCTION
```

### Property: Fix Checking

```pascal
// Property: SUPER_ADMIN sees all 18 modules
FOR ALL X WHERE isBugCondition(X) DO
  result ← getUserPermissions'(X.user_uuid)
  ASSERT result.modules.length = 18 AND
         all_required_module_codes_present(result.modules) AND
         no_crash(result)
END FOR

FUNCTION all_required_module_codes_present(modules)
  required_codes ← [
    'EMPLOYEE_LIST', 'EMPLOYEE_PROFILE', 'REGISTER_EMPLOYEE',
    'DEPARTMENTS', 'POSITIONS', 'LEVELS', 'ATTENDANCE_RECORDS',
    'NETWORK_SETTINGS', 'SHIFTS', 'LETTERS', 'LEAVE_REQUESTS',
    'LEAVE_SETTINGS', 'ACCOUNTS', 'AUDIT_LOGS', 'MY_ATTENDANCE',
    'MY_LETTERS', 'MY_LEAVES', 'MY_ACCOUNTS'
  ]
  
  RETURN FOR ALL code IN required_codes:
    EXISTS module IN modules WHERE module.code = code
END FUNCTION
```

### Property: Preservation Checking

```pascal
// Property: Other roles' module access unchanged
FOR ALL X WHERE NOT isBugCondition(X) DO
  ASSERT getUserPermissions(X.user_uuid) = getUserPermissions'(X.user_uuid)
END FOR
```

## Root Cause Analysis

The root cause is a **database state issue**: The `Modules` table in the database either:
1. Is missing 16 module records (only has LETTERS and SHIFTS), OR
2. Has 18 records but with incorrect `code` values that don't match the static configuration

The system flow is:
1. User logs in → Backend identifies role_code = 'SUPER_ADMIN'
2. `getModulesForRole('SUPER_ADMIN')` returns array of 18 module codes from static config
3. `moduleAuthService.js` queries: `SELECT * FROM Modules WHERE code IN (18 codes) AND is_active = TRUE`
4. **Database returns only 2 rows** (LETTERS and SHIFTS match)
5. User sees only 2 modules in UI

The fix must ensure all 18 module records exist in the database with the correct `code` values matching the static configuration.
