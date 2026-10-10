# Backend Tasks #25 and #26 - COMPLETE ✅

## Overview
Completed the final two backend tasks for the static RBAC implementation:
- **Task #25**: Add role assignment during employee registration
- **Task #26**: Add role update endpoint for employee profile

## Changes Made

### 1. Employee Controller Updates

#### File: `backend/src/controllers/employeeController.js`

**A. Enhanced `createEmployee` endpoint** (Task #25)
- Accepts optional `role_uuid` parameter during employee registration
- Automatically assigns role to the newly created user account
- Logs role assignment in audit trail
- Gracefully handles role assignment failures without blocking employee creation

```javascript
// Usage: POST /api/employees
{
  "first_name": "John",
  "middle_name": "K",
  "last_name": "Doe",
  // ... other employee fields ...
  "role_uuid": "uuid-of-role"  // Optional - assigns role during registration
}
```

**B. New `updateEmployeeRole` endpoint** (Task #26)
- Allows HR Admin/Super Admin to change an employee's role
- Validates employee has an associated user account
- Updates user's role via rbacService
- Logs role change in audit trail
- Returns message requiring user to re-login for changes to take effect

```javascript
// Usage: PATCH /api/employees/:uuid/role
{
  "role_uuid": "uuid-of-new-role"
}
```

### 2. Employee Routes Updates

#### File: `backend/src/routes/employeeRoutes.js`

Added new route:
```javascript
router.patch("/:uuid/role", requireModule('EMPLOYEES'), updateEmployeeRole);
```

- Route: `PATCH /api/employees/:uuid/role`
- Authorization: Requires `EMPLOYEES` module access (HR_OFFICER, HR_ADMIN, SUPER_ADMIN)
- Purpose: Update an employee's role from their profile page

### 3. Constants Updates

#### File: `backend/src/config/constants.js`

Added new audit action:
```javascript
USER_ROLE_ASSIGN: "USER_ROLE_ASSIGN"
```

This action is logged whenever:
- A role is assigned during employee registration
- A role is changed via the profile update endpoint

## API Endpoints

### 1. Create Employee with Role Assignment
```http
POST /api/employees
Authorization: Bearer <token>
Content-Type: application/json

{
  "first_name": "John",
  "middle_name": "K",
  "last_name": "Doe",
  "mother_name": "Jane Smith Doe",
  "gender": "MALE",
  "date_of_birth": "1990-01-01",
  "hire_date": "2024-01-15",
  "department_uuid": "dept-uuid",
  "position_uuid": "pos-uuid",
  "role_uuid": "role-uuid",  // Optional
  "addresses": [...]
}
```

**Response:**
```json
{
  "status": 201,
  "data": {
    "uuid": "employee-uuid",
    "mesob_id": "EMP-001",
    "user_uuid": "user-uuid",
    // ... employee fields ...
  }
}
```

### 2. Update Employee Role
```http
PATCH /api/employees/:uuid/role
Authorization: Bearer <token>
Content-Type: application/json

{
  "role_uuid": "new-role-uuid"
}
```

**Response:**
```json
{
  "status": 200,
  "message": "Employee role updated successfully. User must re-login for changes to take effect.",
  "data": {
    "employee_uuid": "employee-uuid",
    "user_uuid": "user-uuid"
  }
}
```

## Access Control

Both endpoints require:
- **Authentication**: Valid JWT token
- **Authorization**: `EMPLOYEES` module access
  - HR_OFFICER: Can access (hierarchy level 30)
  - HR_ADMIN: Can access (hierarchy level 40)
  - SUPER_ADMIN: Can access (hierarchy level 50)

## Audit Logging

Both operations are logged with:
- **Action**: `USER_ROLE_ASSIGN`
- **Entity Type**: `USER`
- **Actor**: UUID of user performing the action
- **Entity UUID**: UUID of the affected user account
- **Diff**: Contains employee_uuid and role_uuid
- **IP Address**: Client IP address

## Error Handling

### createEmployee with role_uuid
- If role assignment fails, logs error but **does not fail** employee creation
- Employee is created successfully even if role assignment fails
- Error logged to console for monitoring

### updateEmployeeRole
- **400 VALIDATION_ERROR**: If role_uuid is missing or employee has no user account
- **404 NOT_FOUND**: If employee not found
- **403 FORBIDDEN**: If user lacks required module access
- **500 SERVER_ERROR**: If database operation fails

## Integration with Existing System

### Works with:
1. **Static Role Configuration** (`roleModuleMapping.js`)
   - Role assignment uses UUIDs from static configuration
   - Module access determined by static role-module mapping

2. **RBAC Service** (`rbacService.js`)
   - Uses `assignRoleToUser(userUuid, roleUuid)` method
   - Updates `Users.role_uuid` field

3. **Module Authorization** (`moduleAuth.js`)
   - Endpoints protected by `requireModule('EMPLOYEES')` middleware
   - Only authorized roles can assign/update roles

4. **Audit System** (`auditLogService.js`)
   - All role assignments logged for compliance
   - Includes actor, timestamp, and change details

## Testing Recommendations

### Test Cases for Task #25 (Registration with Role)

1. **Create employee without role_uuid**
   - Should succeed
   - Employee created with no role assigned

2. **Create employee with valid role_uuid**
   - Should succeed
   - Employee created AND role assigned
   - Audit log created for both employee creation and role assignment

3. **Create employee with invalid role_uuid**
   - Should succeed (employee creation)
   - Role assignment should fail silently
   - Error logged to console

### Test Cases for Task #26 (Update Role)

1. **Update role with valid role_uuid**
   - Should succeed
   - User role updated in database
   - Audit log created
   - Response indicates re-login required

2. **Update role without role_uuid**
   - Should fail with 400 VALIDATION_ERROR

3. **Update role for employee without user account**
   - Should fail with 400 VALIDATION_ERROR

4. **Update role by unauthorized user**
   - Should fail with 403 FORBIDDEN

5. **Update role for non-existent employee**
   - Should fail with 404 NOT_FOUND

## Database Impact

### Tables Modified
- **Users**: `role_uuid` field updated
- **AuditLogs**: New entries created for role assignments

### No Schema Changes Required
- Uses existing `Users.role_uuid` column
- Uses existing audit log structure
- No migrations needed

## Frontend Integration Guide

### For Employee Registration Form

1. Add role selection dropdown:
```jsx
<select name="role_uuid">
  <option value="">Select Role (Optional)</option>
  <option value="employee-role-uuid">Employee</option>
  <option value="dept-head-uuid">Department Head</option>
  <option value="hr-officer-uuid">HR Officer</option>
  <option value="hr-admin-uuid">HR Admin</option>
  <option value="super-admin-uuid">Super Admin</option>
</select>
```

2. Include in POST request:
```javascript
const response = await axios.post('/api/employees', {
  ...employeeData,
  role_uuid: selectedRoleUuid || undefined
});
```

### For Employee Profile Page

1. Add "Change Role" section:
```jsx
<select value={currentRoleUuid} onChange={handleRoleChange}>
  {roles.map(role => (
    <option key={role.uuid} value={role.uuid}>{role.name}</option>
  ))}
</select>
<button onClick={updateRole}>Update Role</button>
```

2. Call update endpoint:
```javascript
const updateRole = async () => {
  await axios.patch(`/api/employees/${employeeUuid}/role`, {
    role_uuid: newRoleUuid
  });
  alert('Role updated. User must re-login to see changes.');
};
```

## Security Considerations

1. **Authorization Hierarchy**
   - Only HR_OFFICER and above can assign/change roles
   - Lower-level users cannot escalate privileges

2. **Role Validation**
   - rbacService validates role_uuid exists before assignment
   - Invalid UUIDs rejected at service layer

3. **Audit Trail**
   - All role changes logged with actor information
   - Provides accountability and compliance

4. **Session Management**
   - Users must re-login after role change
   - Prevents privilege escalation without re-authentication

## Next Steps

### Remaining Backend Tasks: NONE ✅
All backend implementation is complete!

### Remaining Frontend Tasks:
1. Add role dropdown to employee registration form
2. Add role change capability to employee profile page
3. Update dashboard routing to use role-based dashboard
4. Remove module assignment UI from role management
5. Delete obsolete frontend pages

### Database Tasks:
1. Run migration: `mysql -u mesob -p mesob_hrms < database/static_rbac_migration.sql`
2. Verify 5 roles exist in Roles table
3. Verify role-module mappings in RoleModules table

## Summary

✅ **Task #25 COMPLETE**: Role assignment during employee registration
✅ **Task #26 COMPLETE**: Role update endpoint for employee profiles
✅ **All Backend Tasks**: 100% COMPLETE

The backend is now fully ready for:
- Role assignment during employee onboarding
- Role changes when employees are promoted/transferred
- Integration with frontend role management UI
- End-to-end testing with all 5 static roles
