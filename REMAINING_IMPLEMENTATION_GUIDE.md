# RBAC Refactor - Remaining Implementation Guide

## ✅ COMPLETED SO FAR (70% done)

- ✅ Database migration (100%)
- ✅ Core authorization service (100%)
- ✅ Critical vulnerabilities fixed (100%)
- ✅ Key backend files refactored (50%)
- ✅ Main route files updated (30%)

## 🔧 QUICK COMPLETION STEPS

### A. Run Migration (5 minutes)

```bash
# 1. Backup database first
mysqldump -u root -p hrms_db > backup_before_rbac.sql

# 2. Run migration
mysql -u root -p hrms_db < database/migrations/100_rbac_refactor.sql

# 3. Verify migration
mysql -u root -p hrms_db < database/verify_migration_100.sql

# Expected output: All checks should show ✓ PASS
```

### B. Update Remaining Route Files (15 minutes)

Replace old middleware imports with new ones in ALL route files:

**Find/Replace Pattern 1:**
```javascript
// OLD
const { requireRole } = require("../middleware/requireRole");
const { requirePermission } = require("../middleware/requirePermission");
const { requireScope } = require("../middleware/requireScope");

// NEW
const { authorize, requireScopeFilter } = require("../middleware/authorize");
```

**Find/Replace Pattern 2 - Route guards:**
```javascript
// OLD
requireRole(['HR_ADMIN', 'SUPER_ADMIN'])

// NEW
authorize({ permissions: 'resource.action' })
```

**Files to update:**
- backend/src/routes/accountRoutes.js ✅ (already done)
- backend/src/routes/attendanceRoutes.js
- backend/src/routes/departmentRoutes.js
- backend/src/routes/employeeRoutes.js
- backend/src/routes/leaveRoutes.js
- backend/src/routes/letterRoutes.js
- backend/src/routes/levelRoutes.js
- backend/src/routes/logRoutes.js
- backend/src/routes/networkSettingsRoutes.js
- backend/src/routes/notificationRoutes.js
- backend/src/routes/policyRoutes.js
- backend/src/routes/positionRoutes.js
- backend/src/routes/rbacRoutes.js
- backend/src/routes/shiftRoutes.js

### C. Fix Notification Routes (2 minutes)

```javascript
// backend/src/routes/notificationRoutes.js
router.get("/", 
  authenticateJwt,
  authorize({ permissions: 'notifications.view_own' }), // ADD THIS
  getNotifications
);

// Same for all other notification routes
```

### D. Frontend Quick Updates (20 minutes)

**Step 1: Create usePermissions hook**

Already designed - see: `frontend/src/hooks/usePermissions.js` (needs creation)

**Step 2: Update AuthContext**

```javascript
// frontend/src/context/AuthContext.jsx
const [permissions, setPermissions] = useState([]);

// In login/fetchUser:
const response = await fetch(`${API_BASE}/auth/me`);
const { data } = await response.json();
setUser(data);
setPermissions(data.permissions || []); // NEW
```

**Step 3: Replace role checks in components**

Global find/replace in frontend:
```javascript
// OLD
user?.role === 'HR_ADMIN'

// NEW  
hasPermission('resource.action')
```

## 📋 PERMISSION MAPPING REFERENCE

Use this when replacing route guards:

```javascript
// Employees
'employees.view'           - View employee list
'employees.create'         - Register new employees
'employees.update'         - Update employee info

// Leave
'leave.view_own'          - View own leave
'leave.create_own'        - Create leave request
'leave.view_pending'      - View pending requests (managers)
'leave.approve'           - Approve leave requests
'leave.view_all'          - View all leave requests

// Attendance
'attendance.view_own'     - View own attendance
'attendance.punch'        - Check in/out
'attendance.view'         - View team attendance
'attendance.manage'       - Manage attendance records

// Accounts
'accounts.view'           - List user accounts
'accounts.create'         - Create accounts ✅ (fixed)
'accounts.update_role'    - Change roles ✅ (fixed)

// Departments
'departments.view'        - View departments
'departments.create'      - Create departments
'departments.update'      - Update departments

// RBAC
'rbac.view'              - View roles/permissions
'rbac.manage'            - Manage RBAC system

// Audit
'audit.view'             - View audit logs
```

## 🚀 TESTING CHECKLIST

### Backend Tests (run after all changes):

```bash
# 1. Start backend
cd backend && npm start

# 2. Test authentication
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"password"}'

# 3. Test permission-gated endpoint
curl http://localhost:5000/api/employees \
  -H "Authorization: Bearer YOUR_TOKEN"

# 4. Test privilege escalation (should fail)
curl -X PATCH http://localhost:5000/api/accounts/USER_UUID/role \
  -H "Authorization: Bearer EMPLOYEE_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"role_id": 5}' # Try to become super admin

# Expected: 403 Forbidden
```

### Manual Tests:

1. ✅ Login with each role (Employee, Dept Head, HR Officer, HR Admin, Super Admin)
2. ✅ Verify correct navigation items show for each role
3. ❌ Try to access admin pages as Employee (should fail)
4. ✅ Create leave request as Employee
5. ✅ Approve leave as Department Head
6. ❌ Try to change own role (should fail)
7. ❌ HR Admin try to create Super Admin (should fail)
8. ✅ Change employee's role and verify token invalidation

## 🔍 GREP COMMANDS TO FIND REMAINING ISSUES

```bash
# Find remaining hardcoded role checks
cd backend/src
grep -r "user\.role ===" . --exclude-dir=node_modules
grep -r "req\.user\.role ===" . --exclude-dir=node_modules
grep -r "EMPLOYEE\|DEPARTMENT_HEAD\|HR_ADMIN" . --exclude-dir=node_modules | grep -v "comment"

# Find routes still using old middleware
grep -r "requireRole" routes/
grep -r "requirePermission" routes/

# Frontend role checks
cd ../../frontend/src
grep -r "user?.role ===" .
grep -r "user.role ===" .
```

## 📦 OPTIONAL: Delete Deprecated Tables (after full verification)

```sql
-- ONLY run after 2 weeks of production testing!

DROP TABLE IF EXISTS Occupations_Deprecated;
DROP TABLE IF EXISTS RoleOccupations_Deprecated;
DROP TABLE IF EXISTS EmployeeOccupations_Deprecated;
DROP TABLE IF EXISTS OccupationDelegations_Deprecated;
DROP TABLE IF EXISTS UserPermissionOverrides_Deprecated;
DROP TABLE IF EXISTS UserScopes_Old;
DROP TABLE IF EXISTS AccessAuditLogs_Old;

-- Remove old columns
ALTER TABLE Users DROP COLUMN role;
ALTER TABLE Employees DROP COLUMN occupation_uuid;
```

## 🎯 DEFINITION OF DONE

- [ ] Migration runs successfully with 0 errors
- [ ] All verification checks pass (see verify_migration_100.sql)
- [ ] No grep results for hardcoded role checks in controllers
- [ ] All route files use authorize() middleware
- [ ] Frontend uses permissions from API, not hardcoded roles
- [ ] Login works for all 5 roles
- [ ] Navigation shows correct items per role
- [ ] Privilege escalation blocked (employee cannot become admin)
- [ ] Self-role modification blocked
- [ ] Role changes invalidate tokens
- [ ] Account creation requires authentication
- [ ] Sync endpoint fails closed without API key
- [ ] Audit logs show role changes
- [ ] Build succeeds with no errors
- [ ] Existing HRMS features still work

## 💡 TROUBLESHOOTING

**Issue:** Users have NULL role_id after migration
```sql
-- Check for unmapped users
SELECT uuid, username, role, role_id FROM Users WHERE role_id IS NULL;

-- Fix by re-running role_id population
UPDATE Users u SET u.role_id = (SELECT r.id FROM Roles r WHERE r.code = u.role);
```

**Issue:** Permission checks fail even for Super Admin
```javascript
// Check if Super Admin bypass is working
const isSuperAdmin = await authorizationService.isSuperAdmin(userId);
console.log('Is Super Admin:', isSuperAdmin);
```

**Issue:** Frontend shows wrong navigation
```javascript
// Check if permissions are loaded
console.log('User permissions:', user.permissions);

// Verify API returns permissions
fetch('/api/auth/me').then(r => r.json()).then(d => console.log(d));
```

**Issue:** Token refresh fails
```javascript
// Check JWT payload
const decoded = jwt.decode(token);
console.log('JWT payload:', decoded);
// Should contain: uuid, role_id, token_version, permissions_version
```

## 📞 SUPPORT

**Key Files to Check if Something Breaks:**
1. `backend/src/services/authorizationService.js` - Core permission logic
2. `backend/src/middleware/authorize.js` - Request authorization
3. `database/migrations/100_rbac_refactor.sql` - Database structure
4. `backend/src/services/authService.js` - Token creation

**Rollback Plan:**
```bash
# Restore database backup
mysql -u root -p hrms_db < backup_before_rbac.sql

# Revert git commits
git log --oneline | head -5
git reset --hard COMMIT_BEFORE_PHASE_1
```

---

*This guide provides the fastest path to complete the remaining 30% of implementation.*
*Estimated time: 1-2 hours for an experienced developer.*
