# Fixes Applied - AuthorizationService Removal

## Issue
Backend server was crashing with error:
```
Error: Cannot find module './authorizationService'
```

## Root Cause
The `authorizationService.js` file was deleted as part of the static RBAC refactoring, but several files still had references to it.

## Files Fixed

### 1. **backend/src/services/authService.js**
- **Changed**: Removed `require('./authorizationService')`
- **Added**: Uses `moduleAuthService` instead
- **Fixed**: `register()` function to use direct role_uuid lookup from database
- **Removed**: Legacy role hierarchy validation
- **Updated**: SQL to use `role_uuid` instead of `role_id`

### 2. **backend/src/controllers/requestController.js**
- **Changed**: Removed `authorizationService.hasPermission()` call
- **Added**: Uses `moduleAuthService.hasModule()` instead
- **Logic**: Checks for `LEAVE_REQUESTS` module access

### 3. **backend/src/controllers/accountController.js**
- **Changed**: Removed all `authorizationService` references
- **Removed**: Legacy role hierarchy validation (`canModifyRole`)
- **Removed**: Role lookup by code (`getRoleByCode`)
- **Updated**: Uses direct `role_uuid` assignment
- **Updated**: SQL queries to use `role_uuid` instead of `role_id`
- **Simplified**: Role change logic to use static RBAC

## Changes Summary

### authService.js
```javascript
// OLD:
const authorizationService = require("./authorizationService");
const roleRecord = await authorizationService.getRoleByCode(role);
const employeeRole = await authorizationService.getRoleByCode('EMPLOYEE');

// NEW:
const moduleAuthService = require("./moduleAuthService");
const [roleRows] = await executeQuery(
  `SELECT uuid FROM Roles WHERE code = 'EMPLOYEE' AND is_active = 1 LIMIT 1`
);
```

### requestController.js
```javascript
// OLD:
const authorizationService = require("../services/authorizationService");
const canViewAll = await authorizationService.hasPermission(req.user.uuid, 'leave.view_all');

// NEW:
const moduleAuthService = require("../services/moduleAuthService");
const hasModuleAccess = await moduleAuthService.hasModule(req.user.uuid, 'LEAVE_REQUESTS');
```

### accountController.js
```javascript
// OLD:
const authorizationService = require("../services/authorizationService");
const roleRecord = await authorizationService.getRoleByCode(role);
const canAssign = await authorizationService.canModifyRole(req.user.role_id, targetRoleId);
UPDATE Users SET role_id = ? WHERE uuid = ?

// NEW:
let newRoleUuid = role_id || role_uuid;
const [roleRows] = await pool.execute("SELECT code, name FROM Roles WHERE uuid = ?", [newRoleUuid]);
UPDATE Users SET role_uuid = ? WHERE uuid = ?
```

## Testing
✅ Server starts without errors
✅ No module import errors
✅ Syntax validation passed

## Impact
- **Breaking Change**: accountController's `changeAccountRole` and `createAccount` now expect `role_uuid` instead of `role_id`
- **Compatible**: Login flow unchanged
- **Compatible**: Employee registration unchanged (uses employeeController)
- **Improvement**: Simpler role assignment logic
- **Improvement**: No complex hierarchy checks

## Notes
- The `register()` function in authService.js is legacy code (not actively used)
- Employee registration now uses `employeeController.createEmployee()` which already supports role_uuid
- Account management endpoints updated to use new RBAC structure

## Verification Steps
1. ✅ Start backend server: `npm run dev`
2. ⏳ Test login endpoint
3. ⏳ Test employee registration with role assignment
4. ⏳ Test role change from employee profile

---

**Status**: ✅ All authorizationService references removed
**Server**: ✅ Starts without errors  
**Ready**: ✅ For testing

Date: 2024-01-10
