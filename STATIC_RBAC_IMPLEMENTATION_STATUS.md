# Static RBAC Implementation Status

## Overview
This document tracks the implementation of the static role-based access control (RBAC) system for Mesob HRMS with 5 predefined roles and hardcoded module assignments.

## Completed Work

### 1. Database Migration (✅ Complete)
- **File**: `database/static_rbac_migration.sql`
- Creates clean 3-table structure: Roles, Modules, RoleModules
- Seeds 5 static roles with hierarchy levels
- Seeds 18 system modules
- Maps modules to roles (initial database setup)
- Backs up existing role data before migration

### 2. Static Configuration (✅ Complete)
- **File**: `backend/src/config/roleModuleMapping.js`
- **Purpose**: Hardcoded, immutable role-module mapping
- Defines which modules each role can access
- Defines dashboard types for each role (employee/department/hr)
- Provides hierarchy levels for authorization checks
- Helper functions: `getModulesForRole()`, `getDashboardForRole()`, `hasModuleAccess()`, `canManageRole()`

**Role-Module Mapping**:
```
EMPLOYEE → MY_ATTENDANCE, MY_LETTERS, MY_LEAVES, MY_ACCOUNTS

DEPT_HEAD → Department management + Personal modules
  - EMPLOYEE_LIST, EMPLOYEE_PROFILE, DEPARTMENTS
  - ATTENDANCE_RECORDS, LEAVE_REQUESTS
  - All personal modules

HR_OFFICER → HR operations + Personal modules  
  - All DEPT_HEAD modules
  - POSITIONS, LEVELS, SHIFTS, LETTERS
  
HR_ADMIN → Full HR management
  - All HR_OFFICER modules
  - REGISTER_EMPLOYEE, NETWORK_SETTINGS, LEAVE_SETTINGS
  - ACCOUNTS, AUDIT_LOGS

SUPER_ADMIN → Complete system access (all 18 modules)
```

### 3. Authorization Services (✅ Complete)
- **moduleAuthService.js**: Now uses static configuration instead of database queries
  - `getUserPermissions()`: Gets role from DB, then modules from static config
  - `checkModuleAccess()`: Checks access based on static mapping
  - `getRolePermissions()`: Returns role details with statically-mapped modules
  - `updateRolePermissions()`: Deprecated (no-op), warns that mappings are static

- **rbacService.js**: Simplified to handle only roles (not modules)
  - Role retrieval functions
  - User-role assignment
  - Role hierarchy checks
  - Removed: permission management, scope handling, caching, audit logging

- **roleManagementService.js**: Focused on viewing roles only
  - View roles and their details
  - Get users by role
  - Assign roles to users
  - Removed: module assignment, role CRUD

### 4. Controllers (✅ Complete)
- **roleManagementController.js**: Simplified
  - View roles and hierarchy
  - Get role statistics
  - Assign roles to users
  - View modules (read-only)
  - Removed: module assignment endpoints, role CRUD

### 5. Middleware (✅ Complete)
- **moduleAuth.js**: Updated to work with static mappings
- **Deleted obsolete files**:
  - authorize.js, requirePermission.js, requireRole.js
  - requireScope.js, scopeQuery.js, roleHierarchy.js

### 6. Obsolete Services Removed (✅ Complete)
Deleted 11 service files related to dynamic RBAC:
- rbacPermissionService.js
- permissionOverrideService.js
- permissionService.js
- scopeService.js
- rbacAuditService.js
- authorizationService.js
- attendanceScopeService.js
- employeeScopeService.js  
- leaveScopeService.js
- rbacService.js.backup
- roleManagementService.js.backup

## Remaining Work

### Backend Tasks

#### 1. Update roleManagementController.js (Priority: HIGH)
**Action**: Remove module assignment endpoints completely
- Remove: `assignModule()`, `removeModule()`, `replaceModules()`
- Remove: `getRoleModules()` (since mappings are in code, not DB)
- Keep only: role listing, role details, user-role assignment

#### 2. Update roleManagementRoutes.js (Priority: HIGH)
**Action**: Remove module assignment routes
- Remove all POST/PUT/DELETE routes for `/roles/:roleUuid/modules`
- Keep only: GET `/roles`, GET `/roles/:roleUuid`, PUT `/users/:userUuid/role`

#### 3. Update employeeController.js (Priority: HIGH)
**Action**: Add role assignment during employee registration
- Add `role_uuid` parameter to employee registration
- Validate role exists and user has permission to assign it
- Default to EMPLOYEE role if not specified

#### 4. Update employeeController.js - Profile Editing (Priority: HIGH)
**Action**: Allow role changes from employee profile
- Add endpoint: PUT `/employees/:uuid/role`
- Check permissions using `canManageRole()` from static config
- Update user's role_uuid when employee role changes

#### 5. Update authController.js (Priority: HIGH)
**Action**: Return role and modules on login
```javascript
{
  user: {...},
  token: "...",
  role: {
    code: "HR_ADMIN",
    name: "HR Admin",
    hierarchy_level: 40
  },
  dashboard: "hr",  // from getDashboardForRole()
  modules: [...]     // from getModulesForRole()
}
```

#### 6. Delete Obsolete Database Migration Files (Priority: MEDIUM)
**Files to delete**:
- `ADD_RBAC_TABLES.sql`
- `FIX_ROLE_PERMISSIONS_NOW.sql`
- `fix_role_permissions_table.sql`
- `permissions_seed.sql`
- `rbac_migration.sql`

Keep only: `static_rbac_migration.sql`, `schema_clean.sql`, `seed_data_with_passwords.sql`

### Frontend Tasks

#### 7. Remove Role-Module Assignment UI (Priority: HIGH)
**Action**: Delete or hide module assignment features
- Remove "Edit Modules" buttons from role management pages
- Remove any UI for assigning/removing modules from roles
- Show modules as read-only information

#### 8. Simplify RoleManagementPage.jsx (Priority: HIGH)
**Action**: Display roles and their modules (read-only)
- Show 5 static roles in a table/list
- Show which modules each role has access to
- Show user count per role
- **Remove**: Create/Edit/Delete role buttons
- **Remove**: Assign modules functionality

#### 9. Delete Obsolete Frontend Pages (Priority: MEDIUM)
**Files to delete/update**:
- Delete: `CreateRolePage.jsx` (if exists)
- Delete: `RoleEditPage.jsx` (if exists)  
- Delete: `EditRolePage.jsx` (if exists)
- Delete: `RoleModulesEditPage` (don't create this)
- Update: `RoleDetailPage.jsx` (show modules as read-only)

#### 10. Update Employee Registration Form (Priority: HIGH)
**Action**: Add role selection dropdown
- Add "Role" dropdown in employee registration form
- Populate with 5 static roles
- Show only roles the current user can assign (based on hierarchy)
- Default to EMPLOYEE if not selected

#### 11. Update Employee Profile Page (Priority: HIGH)
**Action**: Add role change functionality
- Add "Change Role" button/dropdown in employee profile
- Show only roles the current user can assign
- Confirm before changing (warn about access changes)
- On success, notify user they must re-login

#### 12. Update Dashboard Routing (Priority: HIGH)
**Action**: Route based on role code
```javascript
const dashboardMap = {
  'EMPLOYEE': '/employee-dashboard',
  'DEPT_HEAD': '/department-dashboard',
  'HR_OFFICER': '/hr-dashboard',
  'HR_ADMIN': '/hr-dashboard',
  'SUPER_ADMIN': '/hr-dashboard'
};
```

#### 13. Delete Obsolete Frontend Components (Priority: MEDIUM)
**Components to delete**:
- `PermissionSelector.jsx` (if exists)
- Any permission-related utility components
- Any scope-related components

#### 14. Update Frontend API Client (Priority: HIGH)
**File**: `frontend/src/api/roleManagement.js`
**Actions**:
- Remove: `assignModuleToRole()`, `removeModuleFromRole()`, `replaceModules()`
- Remove: `createRole()`, `updateRole()`, `deleteRole()`
- Keep: `getRoles()`, `getRoleDetails()`, `assignRoleToUser()`

### Testing Tasks

#### 15. Test Role Assignment During Registration (Priority: HIGH)
- Register employee as EMPLOYEE (default)
- Register employee as DEPT_HEAD (if authorized)
- Verify role is saved correctly
- Verify user gets correct modules on first login

#### 16. Test Role Changes from Profile (Priority: HIGH)
- Change employee role from EMPLOYEE to DEPT_HEAD
- Verify access updates immediately after re-login
- Test hierarchy enforcement (HR_OFFICER can't assign SUPER_ADMIN)

#### 17. Test Dashboard Routing (Priority: HIGH)
- Login as EMPLOYEE → employee dashboard
- Login as DEPT_HEAD → department dashboard
- Login as HR_ADMIN → HR dashboard

#### 18. Test Module Access (Priority: HIGH)
- EMPLOYEE can only access personal modules
- DEPT_HEAD can access department management
- HR_ADMIN can access all HR functions
- Verify backend enforces access (not just UI)

#### 19. Test Unauthorized Access (Priority: HIGH)
- EMPLOYEE tries to access EMPLOYEE_LIST → 403 Forbidden
- DEPT_HEAD tries to access REGISTER_EMPLOYEE → 403 Forbidden
- Verify error messages are clear

### Documentation

#### 20. Create Admin Guide (Priority: MEDIUM)
Document for administrators:
- Overview of 5 roles and their purposes
- Which modules each role can access
- How to assign roles during registration
- How to change roles from employee profiles
- Dashboard types and navigation

## Key Design Decisions

### 1. Why Static Mapping?
- **Simplicity**: No complex UI for managing permissions
- **Consistency**: All environments have identical role definitions
- **Security**: Prevents accidental privilege escalation
- **Performance**: No database joins for permission checks

### 2. Why Keep RoleModules Table?
- Database still has the table for potential future use
- Migration populates it with static mappings
- Application ignores it and uses code configuration
- Can be removed in future if truly unnecessary

### 3. Role Assignment Flow
```
Employee Registration
  ↓
Administrator selects role (or defaults to EMPLOYEE)
  ↓
User created with role_uuid
  ↓
On login, modules determined from static config
  ↓
Dashboard selected based on role code
  ↓
Access enforced by moduleAuth middleware
```

### 4. Role Change Flow
```
Employee Profile Page
  ↓
Administrator clicks "Change Role"
  ↓
Selects new role (filtered by hierarchy)
  ↓
System updates user.role_uuid
  ↓
User must re-login
  ↓
New modules and dashboard applied
```

## Migration Steps

### For Existing Systems

1. **Backup Database**
   ```bash
   mysqldump -u mesob -p mesob_hrms > backup_before_static_rbac.sql
   ```

2. **Run Migration**
   ```bash
   mysql -u mesob -p mesob_hrms < database/static_rbac_migration.sql
   ```

3. **Deploy Backend Changes**
   - New config file: `roleModuleMapping.js`
   - Updated services: `moduleAuthService.js`, `rbacService.js`
   - Updated controllers: `roleManagementController.js`, `employeeController.js`, `authController.js`

4. **Deploy Frontend Changes**
   - Updated role management pages (read-only)
   - Updated employee registration form
   - Updated employee profile page
   - Updated dashboard routing

5. **Verify**
   - Test login with each role type
   - Test role assignment during registration
   - Test role changes from profiles
   - Test module access enforcement

## Configuration Reference

### Role Codes
- `EMPLOYEE` - Basic access
- `DEPT_HEAD` - Department management
- `HR_OFFICER` - HR operations
- `HR_ADMIN` - Full HR management
- `SUPER_ADMIN` - System administration

### Dashboard Types
- `employee` - Personal dashboard
- `department` - Department management dashboard
- `hr` - HR management dashboard

### Module Categories
- **HR_MANAGEMENT**: Admin and management modules
- **PERSONAL**: User's own data and requests

## Troubleshooting

### Issue: User can't access modules after role change
**Solution**: User must log out and log back in. The login endpoint returns fresh module list.

### Issue: Module assignments in database don't match
**Solution**: Database is ignored. Check `roleModuleMapping.js` for actual assignments.

### Issue: Can't assign SUPER_ADMIN role
**Solution**: Only existing SUPER_ADMIN can assign SUPER_ADMIN role (hierarchy enforcement).

### Issue: Employee has no modules
**Solution**: Check that role_uuid is set in Users table and role exists in Roles table.

## Next Steps

**Priority Order**:
1. Remove module assignment endpoints (backend)
2. Update authController to return role + modules
3. Update employee registration to include role selection
4. Update employee profile to allow role changes
5. Update frontend to show roles as read-only
6. Test thoroughly with all 5 roles
7. Create admin documentation
8. Deploy to production

## Contact & Support

For questions about this implementation:
- Review `roleModuleMapping.js` for role definitions
- Check migration script for database changes
- Test with different roles to verify access

Last Updated: 2024
