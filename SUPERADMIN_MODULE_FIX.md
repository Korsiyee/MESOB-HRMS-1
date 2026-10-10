# SUPER_ADMIN Module Access Issue - FIXED

## Problem Summary

The SUPER_ADMIN role user was not seeing all modules in the system.

## Root Cause

There was a **mismatch between the module codes defined in the database and the module codes referenced in the static configuration file**.

Additionally, the **DEPT_HEAD role was missing** from the static configuration, even though it exists in the database.

### In the Database (`static_rbac_migration.sql`)
The migration script created 18 modules with these codes:
- EMPLOYEE_LIST
- EMPLOYEE_PROFILE
- REGISTER_EMPLOYEE
- DEPARTMENTS
- POSITIONS
- LEVELS
- ATTENDANCE_RECORDS
- NETWORK_SETTINGS
- SHIFTS
- LETTERS
- LEAVE_REQUESTS
- LEAVE_SETTINGS
- ACCOUNTS
- AUDIT_LOGS
- MY_ATTENDANCE
- MY_LETTERS
- MY_LEAVES
- MY_ACCOUNTS

And created 5 roles:
- EMPLOYEE
- DEPT_HEAD (not in static config!)
- HR_OFFICER
- HR_ADMIN
- SUPER_ADMIN

### In the Static Config (`roleModuleMapping.js`)
The static configuration had two problems:

**Problem 1**: Referenced module codes that **didn't exist in the database**:
- ❌ `HOME` - not in database
- ❌ `EMPLOYEES` - not in database (should be EMPLOYEE_LIST)
- ❌ `ORGANIZATION` - not in database
- ❌ `ATTENDANCE` - not in database (should be ATTENDANCE_RECORDS)
- ❌ `LEAVE` - not in database (should be LEAVE_REQUESTS)

**Problem 2**: Missing DEPT_HEAD role mapping
- Only had MANAGER role defined
- DEPT_HEAD role exists in database but had no static mapping

### How the System Works

The `moduleAuthService.js` does the following:
1. Gets the user's role from the database
2. Calls `getModulesForRole(roleCode)` from `roleModuleMapping.js` to get the static list of module codes
3. **Queries the database** for modules WHERE code IN (module codes from step 2)
4. Returns only the modules that exist in the database

**If a module code in the static config doesn't exist in the database, it won't be returned!**

## Solution Applied

Updated `/backend/src/config/roleModuleMapping.js` to:
1. Use **only the module codes that actually exist in the database**
2. Add the missing **DEPT_HEAD role mapping**

### Fixed Role Mappings

#### EMPLOYEE
```javascript
EMPLOYEE: [
  'MY_ATTENDANCE',
  'MY_LETTERS',
  'MY_LEAVES',
  'MY_ACCOUNTS'
]
```

#### DEPT_HEAD (Department Head) - NOW ADDED
```javascript
DEPT_HEAD: [
  'EMPLOYEE_LIST',
  'EMPLOYEE_PROFILE',
  'DEPARTMENTS',
  'POSITIONS',
  'LEVELS',
  'ATTENDANCE_RECORDS',
  'LEAVE_REQUESTS',
  'MY_ATTENDANCE',
  'MY_LETTERS',
  'MY_LEAVES',
  'MY_ACCOUNTS'
]
```

#### MANAGER (kept for compatibility)
```javascript
MANAGER: [
  'EMPLOYEE_LIST',
  'EMPLOYEE_PROFILE',
  'DEPARTMENTS',
  'POSITIONS',
  'LEVELS',
  'ATTENDANCE_RECORDS',
  'LEAVE_REQUESTS',
  'MY_ATTENDANCE',
  'MY_LETTERS',
  'MY_LEAVES',
  'MY_ACCOUNTS'
]
```

#### HR_OFFICER
```javascript
HR_OFFICER: [
  'EMPLOYEE_LIST',
  'EMPLOYEE_PROFILE',
  'DEPARTMENTS',
  'POSITIONS',
  'LEVELS',
  'ATTENDANCE_RECORDS',
  'SHIFTS',
  'LETTERS',
  'LEAVE_REQUESTS',
  'MY_ATTENDANCE',
  'MY_LETTERS',
  'MY_LEAVES',
  'MY_ACCOUNTS'
]
```

#### HR_ADMIN & SUPER_ADMIN (All 18 modules)
```javascript
HR_ADMIN: [
  'EMPLOYEE_LIST',
  'EMPLOYEE_PROFILE',
  'REGISTER_EMPLOYEE',
  'DEPARTMENTS',
  'POSITIONS',
  'LEVELS',
  'ATTENDANCE_RECORDS',
  'NETWORK_SETTINGS',
  'SHIFTS',
  'LETTERS',
  'LEAVE_REQUESTS',
  'LEAVE_SETTINGS',
  'ACCOUNTS',
  'AUDIT_LOGS',
  'MY_ATTENDANCE',
  'MY_LETTERS',
  'MY_LEAVES',
  'MY_ACCOUNTS'
]

SUPER_ADMIN: [
  // Same as HR_ADMIN - all 18 modules
]
```

## Testing the Fix

### Backend Test (Restart Required)
1. **Restart the backend server** to pick up the configuration changes:
   ```bash
   cd backend
   npm start
   ```

2. The backend needs to be restarted because `roleModuleMapping.js` is loaded once at startup.

### Frontend Test
1. **Clear browser localStorage** or logout and login again
2. Login with a SUPER_ADMIN account
3. All 18 modules should now be visible

### Verify User Can See Modules
When a SUPER_ADMIN logs in, they should see navigation for:
- Employee List
- Employee Profile  
- Register Employee
- Departments
- Positions
- Levels
- Attendance Records
- Network Settings
- Shifts
- Letters
- Leave Requests
- Leave Settings
- Accounts
- Audit Logs
- My Attendance
- My Letters
- My Leaves
- My Accounts

## Important Notes

1. **Static Configuration**: Module assignments are now completely static and controlled by `roleModuleMapping.js`
2. **Database Sync**: The module codes in `roleModuleMapping.js` MUST match the codes in the `Modules` table
3. **No Runtime Changes**: Module assignments cannot be changed through the UI - they are hardcoded
4. **Server Restart Required**: Any changes to `roleModuleMapping.js` require a backend server restart

## Files Modified

- ✅ `/backend/src/config/roleModuleMapping.js` - Fixed all role mappings to use correct module codes

## No Changes Needed

- ✅ `/database/static_rbac_migration.sql` - Already correct
- ✅ `/backend/src/services/moduleAuthService.js` - Already correct
- ✅ `/backend/src/services/rbacService.js` - Already correct

## Summary

The issue was caused by the static configuration referencing non-existent module codes. By aligning the static configuration with the actual database module codes, SUPER_ADMIN (and all other roles) will now see the correct modules.

**Action Required**: Restart the backend server for changes to take effect.
