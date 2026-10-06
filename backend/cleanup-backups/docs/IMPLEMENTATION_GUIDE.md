# Mesob HRMS - Module-Level Permission System Implementation Guide

## Overview

This guide documents the comprehensive refactoring of the Mesob HRMS navigation, UX, and authorization system. The system has been migrated from Permit.io to a simplified database-driven module-level permission system.

---

## ✅ Completed Tasks

### Backend Infrastructure

1. **Database Schema** (`backend/scripts/setupModulePermissions.js`)
   - Created simplified tables: `Modules`, `Scopes`, `Roles`, `RoleModules`
   - Removed complex RBAC tables (Resources, Permissions, Actions)
   - Module-level permissions instead of action-level permissions
   - Scopes: ORGANIZATION, DEPARTMENT, PERSONAL

2. **Authorization Service** (`backend/src/services/moduleAuthService.js`)
   - `getUserPermissions()` - Get user's module access and scopes
   - `checkModuleAccess()` - Check access to specific module
   - `getScopeFilter()` - Generate SQL filters based on scope
   - `applyScopeToQuery()` - Apply scope to database queries
   - `canAccessResource()` - Check resource-level access

3. **Authorization Middleware** (`backend/src/middleware/moduleAuth.js`)
   - `requireModule(moduleCode)` - Require access to a module
   - `requireAnyModule(moduleCodes)` - OR logic for multiple modules
   - `withScope()` - Load and apply scope context
   - `checkResourceAccess(getResource)` - Resource-level checks

4. **Role Management API** (`backend/src/controllers/moduleRoleController.js`)
   - GET `/api/module-roles/roles` - List all roles
   - GET `/api/module-roles/roles/:uuid` - Get role details
   - POST `/api/module-roles/roles` - Create role
   - PUT `/api/module-roles/roles/:uuid` - Update role
   - DELETE `/api/module-roles/roles/:uuid` - Delete role
   - GET `/api/module-roles/modules` - List modules
   - GET `/api/module-roles/scopes` - List scopes
   - GET `/api/module-roles/permissions/me` - Get current user permissions
   - GET `/api/module-roles/permissions/check` - Check module access

5. **Permit.io Removal**
   - Removed all Permit.io dependencies and code
   - Updated `package.json` to remove `permitio`
   - Removed Permit.io environment variables
   - Cleaned up auth services

### Frontend Infrastructure

1. **Module Permission Service** (`frontend/src/services/modulePermissionService.js`)
   - `getUserPermissions()` - Fetch user permissions from API
   - `checkModuleAccess()` - Check specific module access
   - `hasModuleAccess()` - Check from cached permissions
   - `hasAnyModuleAccess()` - OR logic for multiple modules
   - Helper functions for scopes

2. **Module Permissions Hook** (`frontend/src/hooks/useModulePermissions.js`)
   - React hook for component-level permission checks
   - `hasModule()` - Check single module
   - `hasAnyModule()` - Check multiple modules
   - `getScope()` - Get module scope
   - `hasOrgScope()`, `hasDeptScope()` - Scope checks

3. **Dynamic Navigation** (`frontend/src/components/layout/ModularSidebar.jsx`)
   - Builds navigation based on user's module permissions
   - Automatically shows/hides menu items
   - Personal Space always visible
   - Responsive design (mobile, tablet, desktop)

4. **New Routing Structure** (`frontend/src/routes/ModularAppRouter.jsx`)
   ```
   Home (Dashboard)
   Employees
   ├── Employee List
   ├── Employee Details
   └── Register Employee
   Organization
   ├── Departments
   ├── Positions
   └── Levels
   Attendance (Combined Records + Analytics)
   Shifts
   Letters
   Leave
   ├── Leave Requests
   ├── Leave Settings
   ├── Leave Policies
   └── Days Off
   Personal Space (Always Accessible)
   ├── My Attendance
   ├── My Letters
   ├── My Leaves
   └── My Account
   ```

5. **Updated Auth Context**
   - Modified `login()` to accept and store permissions
   - Permissions included in auth state
   - Available to all components via context

---

## 🔨 Remaining Implementation Tasks

### Task #10: Create Unified Management Pages

**Goal:** Replace separate List/Manage/Add pages with single-page management interfaces using slide panel UI.

#### Pages to Create:

1. **Departments Management** (`frontend/src/pages/organization/DepartmentsManagementPage.jsx`)
   - Single table view with all departments
   - "Add Department" button opens slide panel
   - Click row to edit in slide panel
   - Actions: Add, Edit, Delete, View details
   - Scope-aware: Show only departments user can access

2. **Positions Management** (`frontend/src/pages/organization/PositionsManagementPage.jsx`)
   - Table with all positions
   - Slide panel for add/edit
   - Link to department

3. **Levels Management** (`frontend/src/pages/organization/LevelsManagementPage.jsx`)
   - Table with all levels
   - Slide panel for add/edit

4. **Shifts Management** (Update existing `ShiftsPage.jsx`)
   - Convert to single-page with slide panel
   - Shift assignments in same interface

#### UI Pattern:

```jsx
<PageContainer>
  <Header>
    <Title>Departments</Title>
    <SearchBar />
    <AddButton onClick={openSlidePanel} />
  </Header>
  
  <DataTable
    data={departments}
    columns={columns}
    onRowClick={openEditPanel}
    scopeFilter={userScope}
  />
  
  <SlidePanel
    open={panelOpen}
    mode={mode} // 'add' or 'edit'
    onClose={closePanel}
    onSave={handleSave}
  >
    <DepartmentForm data={selectedItem} />
  </SlidePanel>
</PageContainer>
```

### Task #11: Combine Attendance Records and Analytics

**Goal:** Merge `AttendanceOverviewPage` and attendance analytics into single page with tabs.

**File:** `frontend/src/pages/attendance/UnifiedAttendancePage.jsx`

**Structure:**
- Tab 1: Attendance Records (table view)
- Tab 2: Analytics (charts and stats)
- Scope-aware filtering
- Date range selector
- Export functionality

### Task #12: Create Personal Space Module

**Goal:** Create pages for personal/employee self-service.

**Pages to Create:**

1. **Personal Attendance** (`frontend/src/pages/personal/PersonalAttendancePage.jsx`)
   - View own attendance records
   - Punch in/out functionality
   - Monthly calendar view

2. **Personal Letters** (`frontend/src/pages/personal/PersonalLettersPage.jsx`)
   - View letters issued to user
   - Request new letters
   - Download PDF

3. **Personal Leaves** (`frontend/src/pages/personal/PersonalLeavesPage.jsx`)
   - View leave balance
   - Submit leave requests
   - View request status

4. **Personal Account** (`frontend/src/pages/personal/PersonalAccountPage.jsx`)
   - Update profile information
   - Change password
   - Upload profile photo

### Task #14: Build Role Management UI

**Goal:** Create admin interface for managing roles and permissions.

**File:** `frontend/src/pages/admin/RoleManagementPage.jsx`

**Features:**
- List all roles
- Create custom roles
- Assign modules to roles
- Set module scopes per role
- Visual permission matrix
- Cannot delete system roles
- Cannot modify certain system role properties

**UI Components:**
- Role list table
- Role form with module checkboxes
- Scope selector per module
- Permission matrix view

### Task #15: Update Routes with Permission Checks

**Goal:** Apply module-level authorization to all backend routes.

#### Example Migration:

**Before (Permit.io):**
```javascript
router.get("/employees", 
  authorize("view", "employees"), 
  listEmployees
);
```

**After (Module-level):**
```javascript
const { requireModule, withScope } = require("../middleware/moduleAuth");

router.get("/employees", 
  requireModule('EMPLOYEES'),
  withScope(),
  listEmployees
);
```

#### Routes to Update:

1. **Employee Routes** (`backend/src/routes/employeeRoutes.js`)
   - Use `requireModule('EMPLOYEES')`
   - Apply `withScope()` for list endpoints
   - Use `checkResourceAccess()` for detail pages

2. **Department Routes** (`backend/src/routes/departmentRoutes.js`)
   - Use `requireModule('ORGANIZATION')`

3. **Position Routes** (`backend/src/routes/positionRoutes.js`)
   - Use `requireModule('ORGANIZATION')`

4. **Level Routes** (`backend/src/routes/levelRoutes.js`)
   - Use `requireModule('ORGANIZATION')`

5. **Attendance Routes** (`backend/src/routes/attendanceRoutes.js`)
   - Use `requireModule('ATTENDANCE')`
   - Apply scope filtering in controllers

6. **Shift Routes** (`backend/src/routes/shiftRoutes.js`)
   - Use `requireModule('SHIFTS')`

7. **Letter Routes** (`backend/src/routes/letterRoutes.js`)
   - Use `requireModule('LETTERS')`

8. **Leave Routes** (`backend/src/routes/leaveRoutes.js`)
   - Use `requireModule('LEAVE')`

### Task #16: Standardize UI Components

**Goal:** Create reusable components with consistent styling.

#### Components to Create:

1. **SlidePanel** (`frontend/src/components/common/SlidePanel.jsx`)
   - Smooth slide-in animation from right
   - Close on backdrop click
   - Header with title and close button
   - Footer with action buttons
   - Responsive (full screen on mobile)

2. **DataTable** (`frontend/src/components/common/DataTable.jsx`)
   - Sortable columns
   - Pagination
   - Row selection
   - Search/filter
   - Loading state
   - Empty state
   - Consistent styling

3. **FormField** (`frontend/src/components/common/FormField.jsx`)
   - Label + input wrapper
   - Error state display
   - Required indicator
   - Help text
   - Consistent spacing

4. **Button** (`frontend/src/components/common/Button.jsx`)
   - Primary, secondary, danger variants
   - Loading state
   - Disabled state
   - Icon support
   - Consistent sizing

5. **Card** (`frontend/src/components/common/Card.jsx`)
   - Standard container with shadow
   - Header, body, footer sections
   - Consistent padding and borders

6. **EmptyState** (`frontend/src/components/common/EmptyState.jsx`)
   - Icon + message
   - Call to action button
   - Friendly messaging

#### Design System:

```javascript
// Colors
const COLORS = {
  primary: '#0F766E',    // Teal
  secondary: '#14B8A6',  // Lighter teal
  background: '#C5CECC', // Gray-green
  surface: '#FFFFFF',
  text: '#1e3a37',
  textSecondary: '#6b7280',
  border: 'rgba(0,0,0,0.1)',
  error: '#EF4444',
  success: '#10B981',
  warning: '#F59E0B'
};

// Spacing
const SPACING = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48
};

// Border Radius
const RADIUS = {
  sm: 4,
  md: 8,
  lg: 12,
  xl: 16
};

// Typography
const FONT_SIZE = {
  xs: 11,
  sm: 12,
  base: 14,
  lg: 16,
  xl: 20,
  xxl: 24
};
```

### Task #17: Test and Verify

**Testing Checklist:**

#### Backend Tests:
- [ ] Run database setup script
- [ ] Verify tables created correctly
- [ ] Test role management API endpoints
- [ ] Test module permission checks
- [ ] Test scope filtering in queries
- [ ] Verify backend routes use new middleware

#### Frontend Tests:
- [ ] Login and verify permissions loaded
- [ ] Check navigation shows correct modules
- [ ] Test module access restrictions
- [ ] Verify Personal Space always accessible
- [ ] Test role management UI
- [ ] Verify slide panels work correctly
- [ ] Test on mobile, tablet, desktop
- [ ] Check browser console for errors

#### Integration Tests:
- [ ] Super Admin sees all modules
- [ ] HR Admin sees all modules
- [ ] Department Head sees correct modules with DEPARTMENT scope
- [ ] Employee sees only Home and Personal Space
- [ ] Scope filtering works correctly in lists
- [ ] Cannot access restricted modules via URL
- [ ] Permission changes take effect immediately

---

## 📝 Implementation Order

1. **Setup Database** (Required first)
   ```bash
   cd backend
   node scripts/setupModulePermissions.js
   ```

2. **Create Reusable UI Components** (Task #16)
   - Start with SlidePanel and DataTable
   - These are needed for all management pages

3. **Create Management Pages** (Task #10)
   - Departments → Positions → Levels → Shifts
   - Use slide panel pattern consistently

4. **Combine Attendance Page** (Task #11)
   - Merge records and analytics
   - Add tabbed interface

5. **Create Personal Space** (Task #12)
   - Personal Attendance → Letters → Leaves → Account

6. **Build Role Management** (Task #14)
   - Admin interface for managing roles

7. **Update Backend Routes** (Task #15)
   - Migrate from Permit.io middleware to module middleware
   - Test each route after migration

8. **Update Frontend Routes** (Task #15)
   - Use ModularAppRouter
   - Replace old Sidebar with ModularSidebar
   - Test navigation

9. **Test Everything** (Task #17)
   - Follow testing checklist
   - Fix any issues found

---

## 🔧 Quick Reference

### Backend: Protect a Route

```javascript
const { requireModule } = require('../middleware/moduleAuth');

router.get('/endpoint', requireModule('MODULE_CODE'), controller.method);
```

### Frontend: Check Permission in Component

```javascript
import { useModulePermissions } from '../hooks/useModulePermissions';

function MyComponent() {
  const { hasModule } = useModulePermissions();
  
  if (!hasModule('EMPLOYEES')) {
    return <AccessDenied />;
  }
  
  return <div>Content</div>;
}
```

### Frontend: Conditional Rendering

```javascript
{hasModule('EMPLOYEES') && (
  <Button onClick={openEmployeeDialog}>
    Add Employee
  </Button>
)}
```

---

## 📚 Module Codes

- `HOME` - Dashboard
- `EMPLOYEES` - Employee management
- `ORGANIZATION` - Departments, Positions, Levels
- `ATTENDANCE` - Attendance tracking
- `SHIFTS` - Shift management
- `LETTERS` - Letter generation
- `LEAVE` - Leave management

---

## 🔒 Scope Codes

- `ORGANIZATION` - Access to all data (level 100)
- `DEPARTMENT` - Access to department data only (level 50)
- `PERSONAL` - Access to own data only (level 10)

---

## 🚀 Deployment Notes

1. **Database Migration**
   - Run `setupModulePermissions.js` on production database
   - Backup database before running
   - Verify all users have `role_uuid` assigned

2. **Backend Deployment**
   - Remove Permit.io environment variables
   - No Permit.io API key needed
   - Update all route files to use new middleware

3. **Frontend Deployment**
   - Update Login component to pass permissions to AuthContext
   - Replace Sidebar with ModularSidebar
   - Replace AppRouter with ModularAppRouter
   - Test navigation thoroughly

4. **Verify**
   - All users can log in
   - Navigation displays correctly
   - Permissions enforce correctly
   - No console errors

---

## 🐛 Troubleshooting

**Issue: Navigation not showing any modules**
- Check if permissions are loaded in AuthContext
- Verify backend returns permissions in login response
- Check browser console for errors

**Issue: "Cannot read property 'modules' of null"**
- Permissions not loaded yet
- Add loading state to components using permissions

**Issue: Backend routes return 403 Forbidden**
- Verify route uses correct module code
- Check user has role_uuid in database
- Verify RoleModules table has entries

**Issue: Slide panel not opening**
- Check state management in parent component
- Verify SlidePanel component imported correctly
- Check CSS/styling not hiding panel

---

## 📄 Files Created/Modified

### Backend
- `scripts/setupModulePermissions.js` - Database setup
- `middleware/moduleAuth.js` - Authorization middleware
- `services/moduleAuthService.js` - Permission service
- `controllers/moduleRoleController.js` - Role management
- `routes/moduleRoleRoutes.js` - Role API routes
- Modified: `app.js`, `authService.js`, `package.json`, `.env.example`

### Frontend
- `hooks/useModulePermissions.js` - Permission hook
- `services/modulePermissionService.js` - Permission service
- `components/layout/ModularSidebar.jsx` - Dynamic navigation
- `routes/ModularAppRouter.jsx` - New routing structure
- Modified: `context/AuthContext.jsx`

---

## ✨ Key Benefits

1. **Simplicity** - Module-level permissions instead of complex action-level
2. **Database-driven** - No external service dependency
3. **Flexible** - Easy to add new modules or roles
4. **Consistent** - Single pattern throughout the app
5. **Scope-aware** - Automatic data filtering based on role
6. **Self-service** - Personal Space for all users
7. **Admin-friendly** - Easy role management UI

---

## 📞 Support

For questions or issues during implementation:
1. Check this guide first
2. Review code comments in created files
3. Test with Super Admin role first
4. Check browser and server console logs
5. Verify database tables created correctly

---

**Last Updated:** 2026-10-06
**Version:** 1.0
**Status:** Implementation In Progress (10/17 tasks complete)
