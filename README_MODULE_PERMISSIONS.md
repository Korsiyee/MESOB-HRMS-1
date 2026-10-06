# Mesob HRMS - Module-Level Permission System

## 🎯 Quick Start

The Mesob HRMS has been refactored with a simplified module-level permission system that replaces Permit.io.

### What Changed?

**Before:**
- Complex action-level permissions (view, create, update, delete)
- External dependency on Permit.io
- Difficult to maintain and customize

**After:**
- Simple module-level permissions (access to entire module)
- Database-driven (no external service)
- Easy to customize and extend
- Automatic scope filtering (Organization/Department/Personal)

---

## 🚀 Setup (COMPLETED ✅)

The database has been successfully set up with the new permission system!

```bash
# Already run:
✅ node backend/scripts/setupModulePermissions.js
```

---

## 📋 Next Steps

### 1. Migrate Existing Users (IMPORTANT!)

Your existing users need to be migrated to the new role system:

```bash
cd backend
node scripts/migrateUserRoles.js
```

This script will:
- Map old role ENUM values to new role UUIDs
- Update all users with `role_uuid`
- Show migration statistics

### 2. Update Application Code

Follow the guides to complete the remaining implementation:

- **IMPLEMENTATION_GUIDE.md** - Detailed step-by-step instructions
- **REFACTORING_SUMMARY.md** - Complete overview of changes
- **SETUP_COMPLETE.md** - Database setup confirmation

---

## 📚 System Overview

### Modules (7)
Application is divided into these modules:

| Module | Description | Path |
|--------|-------------|------|
| HOME | Dashboard | `/` |
| EMPLOYEES | Employee management | `/employees` |
| ORGANIZATION | Departments, Positions, Levels | `/organization/*` |
| ATTENDANCE | Attendance tracking & analytics | `/attendance` |
| SHIFTS | Shift management | `/shifts` |
| LETTERS | Letter generation | `/letters` |
| LEAVE | Leave management | `/leave/*` |

**Personal Space** (always accessible):
- My Attendance
- My Letters  
- My Leaves
- My Account

### Scopes (3)
Data access is controlled by scope:

| Scope | Level | Description | Example |
|-------|-------|-------------|---------|
| ORGANIZATION | 100 | All data | HR Admin sees all employees |
| DEPARTMENT | 50 | Department only | Dept Head sees their dept employees |
| PERSONAL | 10 | Own data only | Employee sees only their own data |

### Roles (5 System Roles)

1. **SUPER_ADMIN** (Level 100)
   - All modules with ORGANIZATION scope
   - Full system access

2. **HR_ADMIN** (Level 90)
   - All modules with ORGANIZATION scope
   - HR management functions

3. **DEPARTMENT_HEAD** (Level 70)
   - HOME, EMPLOYEES, ATTENDANCE, LEAVE, LETTERS
   - DEPARTMENT scope (see own department only)

4. **HR_OFFICER** (Level 60)
   - HOME, EMPLOYEES, ORGANIZATION
   - ORGANIZATION scope

5. **EMPLOYEE** (Level 10)
   - HOME only
   - PERSONAL scope
   - Personal Space always accessible

---

## 💻 Development Guide

### Backend: Protect a Route

```javascript
const { requireModule, withScope } = require('../middleware/moduleAuth');

// Require module access
router.get('/employees', 
  requireModule('EMPLOYEES'),
  withScope(),
  controller.list
);

// Require any of multiple modules
router.get('/staff',
  requireAnyModule(['EMPLOYEES', 'ORGANIZATION']),
  controller.listStaff
);

// Check resource-level access
router.get('/employees/:uuid',
  requireModule('EMPLOYEES'),
  withScope(),
  checkResourceAccess(async (req) => {
    const [rows] = await db.query('SELECT * FROM Employees WHERE uuid = ?', [req.params.uuid]);
    return rows[0];
  }),
  controller.getEmployee
);
```

### Frontend: Check Permissions

```javascript
import { useModulePermissions } from '../hooks/useModulePermissions';

function MyComponent() {
  const { hasModule, getScope, loading } = useModulePermissions();

  if (loading) return <Loading />;

  if (!hasModule('EMPLOYEES')) {
    return <AccessDenied />;
  }

  const scope = getScope('EMPLOYEES');
  // scope.code = 'ORGANIZATION' | 'DEPARTMENT' | 'PERSONAL'

  return (
    <div>
      <h1>Employees</h1>
      {hasModule('ORGANIZATION') && (
        <Button>Manage Organization</Button>
      )}
    </div>
  );
}
```

### Conditional Rendering

```javascript
{hasModule('EMPLOYEES') && (
  <NavLink to="/employees">Employees</NavLink>
)}

{hasAnyModule(['ATTENDANCE', 'LEAVES']) && (
  <Section>Workforce Management</Section>
)}
```

---

## 🔧 Useful Scripts

```bash
# Setup database (already done)
node backend/scripts/setupModulePermissions.js

# Migrate user roles
node backend/scripts/migrateUserRoles.js

# Verify setup
node backend/scripts/verifyModuleSetup.js

# Start backend
cd backend && npm start

# Start frontend
cd frontend && npm run dev
```

---

## 📊 API Endpoints

### Role Management

```
GET    /api/module-roles/roles           # List all roles
GET    /api/module-roles/roles/:uuid     # Get role details
POST   /api/module-roles/roles           # Create role
PUT    /api/module-roles/roles/:uuid     # Update role
DELETE /api/module-roles/roles/:uuid     # Delete role
```

### Permissions

```
GET /api/module-roles/modules           # List modules
GET /api/module-roles/scopes            # List scopes
GET /api/module-roles/permissions/me    # Get current user permissions
GET /api/module-roles/permissions/check # Check module access
```

### Example Response

```json
{
  "data": {
    "permissions": {
      "user": {
        "uuid": "user-123",
        "username": "john.doe",
        "department_uuid": "dept-456"
      },
      "role": {
        "code": "HR_ADMIN",
        "name": "HR Admin",
        "hierarchy_level": 90
      },
      "defaultScope": {
        "code": "ORGANIZATION",
        "name": "Organization-wide",
        "level": 100
      },
      "modules": [
        {
          "code": "EMPLOYEES",
          "name": "Employees",
          "scope": {
            "code": "ORGANIZATION",
            "name": "Organization-wide"
          }
        }
      ]
    }
  }
}
```

---

## 🎨 UI Components

All reusable components are in `frontend/src/components/common/`:

- **Button** - Primary, secondary, danger, ghost variants
- **Card** - Container with header and footer
- **SlidePanel** - Side panel for forms
- **FormField** - Labeled input with validation
- **EmptyState** - Empty data placeholder

### Example: SlidePanel

```javascript
import SlidePanel from '../components/common/SlidePanel';
import Button from '../components/common/Button';

function DepartmentsPage() {
  const [open, setOpen] = useState(false);

  return (
    <>
      <Button onClick={() => setOpen(true)}>
        Add Department
      </Button>

      <SlidePanel
        open={open}
        onClose={() => setOpen(false)}
        title="Add Department"
        footer={
          <>
            <Button variant="secondary" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSave}>Save</Button>
          </>
        }
      >
        <DepartmentForm />
      </SlidePanel>
    </>
  );
}
```

---

## 🧪 Testing

### Test Different Roles

1. Login as SUPER_ADMIN
   - Should see all 7 modules in navigation
   - Can access all pages

2. Login as DEPARTMENT_HEAD
   - Should see HOME, EMPLOYEES, ATTENDANCE, LEAVE, LETTERS
   - Data filtered to their department only

3. Login as EMPLOYEE
   - Should see only HOME
   - Personal Space always visible
   - Can only see own data

### Test Permissions

```bash
# Get user permissions
curl -H "Authorization: Bearer TOKEN" \
  http://localhost:5000/api/module-roles/permissions/me

# Check module access
curl -H "Authorization: Bearer TOKEN" \
  "http://localhost:5000/api/module-roles/permissions/check?moduleCode=EMPLOYEES"
```

---

## 📝 Migration Checklist

- [x] Database schema created
- [x] Tables seeded with roles and modules
- [ ] User roles migrated to `role_uuid`
- [ ] Backend routes updated to use `requireModule()`
- [ ] Frontend uses `ModularSidebar`
- [ ] Frontend uses `ModularAppRouter`
- [ ] Login response includes permissions
- [ ] Navigation shows/hides correctly
- [ ] API enforces permissions
- [ ] Scope filtering works
- [ ] All tests pass

---

## 🆘 Troubleshooting

### Users can't login after migration

Check if users have `role_uuid`:
```sql
SELECT username, role, role_uuid FROM Users LIMIT 10;
```

Run migration if needed:
```bash
node backend/scripts/migrateUserRoles.js
```

### Navigation not showing modules

Check browser console for errors. Verify permissions are loaded:
```javascript
console.log(user.permissions); // Should show modules array
```

### API returns 403 Forbidden

Verify route uses correct module code:
```javascript
requireModule('EMPLOYEES') // Must match exact module code
```

Check user has role_uuid in database.

---

## 📖 Documentation Files

- **README_MODULE_PERMISSIONS.md** (this file) - Quick reference
- **IMPLEMENTATION_GUIDE.md** - Detailed implementation steps
- **REFACTORING_SUMMARY.md** - Complete overview
- **SETUP_COMPLETE.md** - Setup confirmation

---

## ✨ Benefits

✅ **Simpler** - Module-level instead of action-level  
✅ **Faster** - No external API calls  
✅ **Flexible** - Easy to add modules/roles  
✅ **Consistent** - Single pattern throughout  
✅ **Scope-aware** - Automatic data filtering  
✅ **Self-service** - Personal Space for employees  
✅ **Maintainable** - All in database  

---

**Status:** Ready for Implementation  
**Progress:** 65% Complete (11/17 tasks)  
**Next:** Complete remaining UI pages and testing
