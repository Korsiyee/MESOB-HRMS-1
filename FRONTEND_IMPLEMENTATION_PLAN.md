# Frontend Implementation Plan for Static RBAC

## Overview
This document outlines the frontend changes required to integrate with the new static RBAC backend implementation.

## Backend Changes Summary (Already Complete ✅)

### Login Response Now Includes:
```json
{
  "accessToken": "...",
  "refreshToken": "...",
  "user": {...},
  "role": {
    "uuid": "...",
    "code": "HR_ADMIN",
    "name": "HR Admin",
    "hierarchy_level": 40
  },
  "dashboard": "hr",  // NEW - "employee" | "department" | "hr"
  "modules": [         // NEW - Array of accessible modules
    {
      "uuid": "...",
      "code": "EMPLOYEE_LIST",
      "name": "Employee List",
      "category": "HR_MANAGEMENT"
    },
    ...
  ]
}
```

### New Backend Endpoints:
1. `POST /api/employees` - Now accepts optional `role_uuid` field
2. `PATCH /api/employees/:uuid/role` - Update employee's role
3. `GET /api/role-management/my-permissions` - Get current user's role & modules

## Frontend Tasks

### Task 1: Update Login Handler ✅ (PRIORITY 1)
**File**: `frontend/src/api/authApi.js`

**Changes Needed**:
```javascript
// Store role, dashboard, and modules from login response
if (response.data?.role) {
  localStorage.setItem("userRole", JSON.stringify(response.data.role));
}
if (response.data?.dashboard) {
  localStorage.setItem("userDashboard", response.data.dashboard);
}
if (response.data?.modules) {
  localStorage.setItem("userModules", JSON.stringify(response.data.modules));
}
```

**File**: `frontend/src/context/AuthContext.jsx`

**Changes Needed**:
```javascript
// Update login() function to handle role, dashboard, modules
const login = useCallback(async (userData, permissions = null, additionalData = {}) => {
  // Store role, dashboard, modules
  if (additionalData.role) {
    localStorage.setItem("userRole", JSON.stringify(additionalData.role));
  }
  if (additionalData.dashboard) {
    localStorage.setItem("userDashboard", additionalData.dashboard);
  }
  if (additionalData.modules) {
    localStorage.setItem("userModules", JSON.stringify(additionalData.modules));
  }
  
  // Include in user object
  const fullUserData = {
    ...userData,
    role: additionalData.role,
    dashboard: additionalData.dashboard,
    modules: additionalData.modules,
    permissions
  };
  
  setUser(fullUserData);
  localStorage.setItem('user', JSON.stringify(fullUserData));
  // ...rest of login logic
}, []);
```

**File**: `frontend/src/components/Login.jsx`

**Changes Needed**:
```javascript
const handleSubmit = async (e) => {
  e.preventDefault();
  setError('');
  setLogoutMessage('');
  setIsLoading(true);
  try {
    const response = await AuthApi.login(formData.username, formData.password);
    
    // Pass full response data including role, dashboard, modules
    if (onLoginSuccess) {
      onLoginSuccess({
        user: response.data.user,
        role: response.data.role,
        dashboard: response.data.dashboard,
        modules: response.data.modules
      });
    }
  } catch (err) {
    setError(err.message || 'Login failed. Please check your credentials.');
  } finally {
    setIsLoading(false);
  }
};
```

**File**: `frontend/src/routes/AppRouter.jsx`

**Changes Needed**:
```javascript
const LoginRoute = () => {
  const { isAuthenticated, isLoading, login } = useAuth();
  const navigate = useNavigate();
  
  if (isLoading) return <LoadingScreen />;
  if (isAuthenticated) return <Navigate to="/" replace />;
  
  const handleLoginSuccess = (data) => {
    if (data?.user) {
      login(data.user, null, {
        role: data.role,
        dashboard: data.dashboard,
        modules: data.modules
      });
    }
    navigate('/', { replace: true });
  };
  
  return <Login onLoginSuccess={handleLoginSuccess} />;
};
```

### Task 2: Update Dashboard Routing ✅ (PRIORITY 2)
**File**: `frontend/src/pages/DashboardPage.jsx` (or similar)

**Current Behavior**: Likely routes based on role code check
**New Behavior**: Route based on `dashboard` value from login

**Changes Needed**:
```javascript
const DashboardPage = () => {
  const { user } = useAuth();
  const dashboard = user?.dashboard || localStorage.getItem('userDashboard');
  
  // Route to correct dashboard based on backend-provided value
  switch(dashboard) {
    case 'employee':
      return <EmployeeDashboard />;
    case 'department':
      return <DepartmentHeadDashboard />;
    case 'hr':
      return <HRDashboard />;
    default:
      return <EmployeeDashboard />; // Fallback
  }
};
```

### Task 3: Add Role Selection to Registration Form (PRIORITY 3)
**File**: `frontend/src/pages/EmployeeRegistrationPage.jsx` (or similar)

**Changes Needed**:
1. Add role dropdown field to form
2. Fetch available roles from `/api/role-management/roles`
3. Filter roles based on current user's hierarchy (can't assign higher roles)
4. Include `role_uuid` in POST request to `/api/employees`

**Example**:
```javascript
const [roles, setRoles] = useState([]);
const [selectedRoleUuid, setSelectedRoleUuid] = useState('');

useEffect(() => {
  // Fetch roles
  const fetchRoles = async () => {
    const response = await apiRequest('/role-management/roles');
    setRoles(response.data.roles);
  };
  fetchRoles();
}, []);

const handleSubmit = async () => {
  const payload = {
    ...employeeData,
    role_uuid: selectedRoleUuid || undefined  // Optional
  };
  
  await apiRequest('/employees', {
    method: 'POST',
    body: JSON.stringify(payload)
  });
};

// In JSX:
<select 
  value={selectedRoleUuid} 
  onChange={(e) => setSelectedRoleUuid(e.target.value)}
>
  <option value="">Select Role (Optional)</option>
  {roles.map(role => (
    <option key={role.uuid} value={role.uuid}>
      {role.name}
    </option>
  ))}
</select>
```

### Task 4: Add Role Change to Employee Profile (PRIORITY 4)
**File**: `frontend/src/pages/EmployeeProfilePage.jsx` or `EmployeeDetailPage.jsx`

**Changes Needed**:
1. Add "Change Role" section (visible only to HR_ADMIN/SUPER_ADMIN)
2. Show current role
3. Allow selecting new role from dropdown
4. Call `PATCH /api/employees/:uuid/role` with `{ role_uuid: newRoleUuid }`
5. Show success message: "Role updated. User must re-login to see changes."

**Example**:
```javascript
const [currentRole, setCurrentRole] = useState(null);
const [newRoleUuid, setNewRoleUuid] = useState('');
const [roles, setRoles] = useState([]);

const canChangeRoles = user?.role?.code === 'HR_ADMIN' || user?.role?.code === 'SUPER_ADMIN';

const handleRoleChange = async () => {
  try {
    await apiRequest(`/employees/${employeeUuid}/role`, {
      method: 'PATCH',
      body: JSON.stringify({ role_uuid: newRoleUuid })
    });
    
    alert('Role updated successfully. User must re-login for changes to take effect.');
    // Refresh employee data
    fetchEmployeeData();
  } catch (error) {
    alert('Failed to update role: ' + error.message);
  }
};

// In JSX (only show if canChangeRoles):
{canChangeRoles && (
  <div className="role-change-section">
    <h3>Change Role</h3>
    <p>Current Role: {currentRole?.name}</p>
    <select value={newRoleUuid} onChange={(e) => setNewRoleUuid(e.target.value)}>
      <option value="">Select New Role</option>
      {roles.map(role => (
        <option key={role.uuid} value={role.uuid}>{role.name}</option>
      ))}
    </select>
    <button onClick={handleRoleChange} disabled={!newRoleUuid}>
      Update Role
    </button>
  </div>
)}
```

### Task 5: Remove Module Assignment UI (PRIORITY 5)
**Files to Update**:
- `frontend/src/pages/RoleManagementPage.jsx`
- `frontend/src/pages/RoleDetailPage.jsx`
- `frontend/src/pages/RoleEditPage.jsx`

**Changes Needed**:
1. Remove "Edit Modules" buttons
2. Remove "Assign Modules" functionality
3. Show modules as **read-only** on role details page
4. Add note: "Module assignments are static and defined in code"

**Example**:
```javascript
// In RoleDetailPage:
<div className="role-modules">
  <h3>Assigned Modules</h3>
  <p className="note">Module assignments are static and cannot be changed.</p>
  <ul>
    {role.modules?.map(module => (
      <li key={module.uuid}>{module.name}</li>
    ))}
  </ul>
</div>
```

### Task 6: Delete Obsolete Frontend Pages (PRIORITY 6)
**Files to DELETE**:
```
frontend/src/pages/CreateRolePage.jsx (if exists)
frontend/src/pages/RoleEditPage.jsx (contains module assignment UI)
frontend/src/components/PermissionSelector.jsx
frontend/src/pages/rbac/PermissionsManagementPage.jsx (if purely for dynamic permissions)
```

**Routes to REMOVE** from `AppRouter.jsx`:
```javascript
// Remove these routes:
<Route path="admin/roles/new" element={<RoleEditPage />} />
<Route path="admin/roles/:roleUuid/edit" element={<RoleEditPage />} />
<Route path="rbac/permissions" element={<PermissionsManagementPage />} />
```

**Keep these routes**:
```javascript
// Keep for viewing roles:
<Route path="admin/roles" element={<RoleManagementPage />} />
<Route path="admin/roles/:roleUuid" element={<RoleDetailPage />} />
```

### Task 7: Update API Client (PRIORITY 7)
**File**: `frontend/src/api/roleApi.js` (or similar)

**Remove these methods** (if they exist):
- `assignModulesToRole()`
- `removeModulesFromRole()`
- `createRole()`
- `updateRole()`
- `deleteRole()`

**Keep these methods**:
- `getRoles()` - List all roles
- `getRoleDetails(uuid)` - Get role with modules (read-only)
- `assignRoleToUser(userUuid, roleUuid)` - Assign role to user

## Testing Checklist

### After Each Task:
- [ ] Task 1: Login and verify role/dashboard/modules are stored in localStorage
- [ ] Task 2: Login as each role type and verify correct dashboard is shown
- [ ] Task 3: Register new employee with role assignment
- [ ] Task 4: Change employee role from profile page
- [ ] Task 5: View role details - modules shown as read-only, no edit buttons
- [ ] Task 6: Verify deleted pages don't break navigation
- [ ] Task 7: Test API client methods work correctly

### End-to-End Testing:
- [ ] **EMPLOYEE**: Login → See employee dashboard → Only personal modules
- [ ] **DEPT_HEAD**: Login → See department dashboard → Department + personal modules
- [ ] **HR_OFFICER**: Login → See HR dashboard → HR operations modules
- [ ] **HR_ADMIN**: Login → See HR dashboard → All 18 modules
- [ ] **SUPER_ADMIN**: Login → See HR dashboard → All 18 modules

### Authorization Testing:
- [ ] Try accessing unauthorized module → Should get 403 error
- [ ] Try assigning higher role than your own → Should fail
- [ ] Change role → User re-logs in → See new dashboard and modules

## Implementation Order

1. **Phase 1 - Core Login** (Tasks 1-2) - Get login working with new response
2. **Phase 2 - Role Management** (Tasks 3-4) - Add role assignment features
3. **Phase 3 - Cleanup** (Tasks 5-7) - Remove obsolete code and UI

## File Summary

### Files to Modify:
1. `frontend/src/api/authApi.js`
2. `frontend/src/context/AuthContext.jsx`
3. `frontend/src/components/Login.jsx`
4. `frontend/src/routes/AppRouter.jsx`
5. `frontend/src/pages/DashboardPage.jsx` (or equivalent)
6. `frontend/src/pages/EmployeeRegistrationPage.jsx`
7. `frontend/src/pages/EmployeeProfilePage.jsx` or `EmployeeDetailPage.jsx`
8. `frontend/src/pages/RoleManagementPage.jsx`
9. `frontend/src/pages/RoleDetailPage.jsx`
10. `frontend/src/api/roleApi.js` (if exists)

### Files to Delete:
1. `frontend/src/pages/RoleEditPage.jsx`
2. `frontend/src/components/PermissionSelector.jsx`
3. `frontend/src/pages/rbac/PermissionsManagementPage.jsx` (if exists)
4. Any other dynamic permission management components

## Notes

- **Backward Compatibility**: Existing user sessions will need to re-login to get new role/dashboard/modules data
- **Migration**: No database changes needed - backend migration handles everything
- **Error Handling**: Add proper error handling for role assignment failures
- **UI/UX**: Add loading states, success messages, and error messages for role changes
- **Permissions**: Use `user.modules` array to check if user has access to specific modules
- **Session Management**: After role change, user MUST re-login for changes to take effect

## Questions/Decisions

1. **Dashboard Components**: Do we have separate components for Employee/Department/HR dashboards?
   - Answer: Check `frontend/src/pages/` or `frontend/src/components/dashboard/`

2. **Role Hierarchy Enforcement**: Should frontend prevent assigning higher roles?
   - Recommendation: Yes, filter available roles based on current user's hierarchy level

3. **Module Access Checking**: How is module access currently checked?
   - Recommendation: Update to check `user.modules.some(m => m.code === 'MODULE_CODE')`

4. **Re-login Enforcement**: Should we automatically log out users after role change?
   - Recommendation: No, show message and let them re-login manually

## Success Criteria

✅ Login response includes role, dashboard, and modules
✅ Dashboard routing works based on dashboard value
✅ Can assign role during employee registration
✅ Can change role from employee profile
✅ Module assignments shown as read-only
✅ No UI for editing module assignments
✅ Obsolete pages deleted
✅ All 5 roles work correctly
✅ Authorization enforced in frontend and backend

---

**Status**: Ready for implementation
**Backend**: ✅ Complete
**Frontend**: ⏳ In Progress
**Database**: ✅ Migration ready
