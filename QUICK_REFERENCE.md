# HRMS Modifications - Quick Reference Guide

## 🚀 Quick Start (For Developers)

### What Was Changed?
- ✅ Added Network Settings, Accounts, Audit Logs, Roles pages with RBAC
- ✅ Fixed crashes in Attendance and Register Employee pages
- ✅ Added permission guards to all admin pages
- ✅ Created database permission seeds

### Deploy in 5 Minutes
```bash
# 1. Database (30 seconds)
mysql -u root -p hrms_db < database/permissions_seed.sql

# 2. Backend (1 minute)
cd backend && npm install && pm2 restart hrms-backend

# 3. Frontend (2 minutes)
cd frontend && npm run build && cp -r dist/* /var/www/html/

# 4. Force re-login (30 seconds)
mysql -u root -p hrms_db -e "UPDATE Users SET permissions_version = permissions_version + 1;"

# Done! 🎉
```

---

## 📍 Navigation Changes

### New Sub-Tabs
```
Attendance
  ├── Attendance Records
  ├── Attendance Analytics
  └── Network Settings ← NEW

Letters
  ├── Letter Templates ← NEW (visible in sidebar)
  ├── Generate Letter ← NEW (visible in sidebar)
  └── Letter Requests ← NEW (visible in sidebar)

Leave
  └── Leave Settings
      ├── Leave Policies
      └── Days Off ← VERIFIED (already existed)

Administration
  ├── Accounts ← PROTECTED
  ├── Roles & Permissions ← PROTECTED
  └── Audit Log ← PROTECTED
```

---

## 🔒 Permission Quick Reference

### Permission Format
```
Resource.Action
```

### Examples
```javascript
// Network Settings
'NetworkSettings.View'
'NetworkSettings.Create'
'NetworkSettings.Update'
'NetworkSettings.Delete'

// Accounts
'Accounts.View'
'Accounts.Create'
'Accounts.Update'

// Audit Logs
'AuditLogs.View'
'AuditLogs.Export'

// Roles
'Roles.View'
'Roles.Create'
'Roles.Update'
'Roles.Delete'
'Roles.AssignPermissions'
```

---

## 🛡️ Adding Permission to New Page

### 1. Backend Route (Required)
```javascript
// backend/src/routes/myRoutes.js
const { authorize } = require('../middleware/authorize');

router.get('/my-resource', 
  authorize({ permissions: 'MyResource.View' }), 
  controller.getMyResource
);

router.post('/my-resource',
  authorize({ permissions: 'MyResource.Create' }),
  controller.createMyResource
);
```

### 2. Frontend Page (Required)
```javascript
// frontend/src/pages/MyPage.jsx
import { PermissionGuard } from '../components/PermissionGuard';

const MyPage = () => {
  return <div>My Content</div>;
};

const ProtectedMyPage = () => (
  <PermissionGuard permissions="MyResource.View">
    <MyPage />
  </PermissionGuard>
);

export default ProtectedMyPage;
```

### 3. Database Permission (Required)
```sql
-- Add permission to Super Admin
INSERT INTO RolePermissions (uuid, role_uuid, module_uuid, action_uuid, scope_uuid)
SELECT 
  UUID(),
  (SELECT uuid FROM Roles WHERE code = 'SUPER_ADMIN'),
  (SELECT uuid FROM Modules WHERE code = 'YOUR_MODULE'),
  (SELECT uuid FROM Actions WHERE code = 'VIEW'),
  (SELECT uuid FROM Scopes WHERE code = 'ORGANIZATION');
```

### 4. Sidebar Navigation (Optional)
```javascript
// frontend/src/components/layout/Sidebar.jsx
{
  label: "My Feature",
  icon: MyIcon,
  to: "/my-feature",
  module: "MY_MODULE"
}
```

---

## 🐛 Troubleshooting

### "403 Forbidden" Error
**Check:**
1. Permission exists in database
2. User's role has the permission
3. JWT token is not expired
4. `permissions_version` matches

**Fix:**
```sql
-- Check user's permissions
SELECT p.name as permission
FROM Users u
JOIN Roles r ON u.role_uuid = r.uuid
JOIN RolePermissions rp ON r.uuid = rp.role_uuid
JOIN Modules m ON rp.module_uuid = m.uuid
JOIN Actions a ON rp.action_uuid = a.uuid
WHERE u.username = 'user@example.com';

-- If missing, add permission
INSERT INTO RolePermissions (...) VALUES (...);

-- Force re-login
UPDATE Users SET permissions_version = permissions_version + 1
WHERE username = 'user@example.com';
```

### UI Shows But API Fails
**Cause:** Frontend permission check doesn't match backend

**Fix:**
```javascript
// Ensure these match:
// Frontend
<PermissionGuard permissions="Resource.Action">

// Backend
authorize({ permissions: 'Resource.Action' })
```

### Page Crashes on Load
**Cause:** Undefined data from API

**Fix:**
```javascript
// Always validate arrays
const data = Array.isArray(response?.data) ? response.data : [];

// Use optional chaining
const name = employee?.first_name || 'N/A';
```

---

## 📝 Common Tasks

### Test Permission Works
```bash
# Get auth token
TOKEN="your-jwt-token"

# Test endpoint
curl -X GET http://localhost:5000/api/your-endpoint \
  -H "Authorization: Bearer $TOKEN"

# Should return:
# 200 OK - If has permission
# 403 Forbidden - If no permission
```

### Add User to Role
```sql
UPDATE Users 
SET role_uuid = (SELECT uuid FROM Roles WHERE code = 'HR_ADMIN')
WHERE username = 'user@example.com';

-- Force re-login
UPDATE Users SET permissions_version = permissions_version + 1
WHERE username = 'user@example.com';
```

### Check What Permissions a Role Has
```sql
SELECT 
  CONCAT(m.code, '.', a.code) as permission,
  s.name as scope
FROM RolePermissions rp
JOIN Roles r ON rp.role_uuid = r.uuid
JOIN Modules m ON rp.module_uuid = m.uuid
JOIN Actions a ON rp.action_uuid = a.uuid
JOIN Scopes s ON rp.scope_uuid = s.uuid
WHERE r.code = 'HR_ADMIN'
ORDER BY permission;
```

### Revoke Permission
```sql
DELETE FROM RolePermissions
WHERE role_uuid = (SELECT uuid FROM Roles WHERE code = 'HR_ADMIN')
AND module_uuid = (SELECT uuid FROM Modules WHERE code = 'ADMIN')
AND action_uuid = (SELECT uuid FROM Actions WHERE code = 'DELETE');

-- Force re-login for affected users
UPDATE Users 
SET permissions_version = permissions_version + 1
WHERE role_uuid = (SELECT uuid FROM Roles WHERE code = 'HR_ADMIN');
```

---

## 🎨 Code Patterns

### Conditional Rendering (Frontend)
```javascript
import { usePermissions } from '../hooks/usePermissions';

const MyComponent = () => {
  const { hasPermission } = usePermissions();
  
  return (
    <div>
      {hasPermission('Resource.View') && (
        <button>View</button>
      )}
      
      {hasPermission('Resource.Create') && (
        <button>Create</button>
      )}
    </div>
  );
};
```

### Multiple Permissions (Backend)
```javascript
// OR logic (default)
authorize({ 
  permissions: ['Resource.View', 'Resource.Update'],
  logic: 'OR' 
})

// AND logic
authorize({ 
  permissions: ['Resource.View', 'Resource.Update'],
  logic: 'AND' 
})
```

### Scope Enforcement (Backend)
```javascript
// Attach scope to request
authorize({ 
  permissions: 'AuditLogs.View',
  enforceScope: true 
})

// Use in controller
const logs = await LogModel.findAll({
  where: {
    // req.scope is automatically attached
    ...(req.scope.type === 'DEPARTMENT' && {
      department_uuid: req.user.department_uuid
    })
  }
});
```

---

## 🔍 Quick Checks

### Is My Permission Working?
```bash
# 1. Database check
mysql> SELECT * FROM RolePermissions WHERE ...;

# 2. Backend check (look for authorize in route)
grep -n "authorize" backend/src/routes/myRoutes.js

# 3. Frontend check (look for PermissionGuard)
grep -n "PermissionGuard" frontend/src/pages/MyPage.jsx

# 4. API test
curl -X GET http://localhost:5000/api/my-endpoint -H "Authorization: Bearer TOKEN"
```

### Common Error Messages
| Error | Meaning | Fix |
|-------|---------|-----|
| 401 Unauthorized | Token missing/invalid | Re-login |
| 403 Forbidden | No permission | Add permission to role |
| TOKEN_EXPIRED | Token expired | Re-login |
| PERMISSIONS_CHANGED | permissions_version mismatch | Re-login |

---

## 📦 File Locations

### Modified Files
```
frontend/src/
  ├── components/layout/Sidebar.jsx
  ├── routes/AppRouter.jsx
  └── pages/
      ├── AttendancePage.jsx
      ├── AccountsPage.jsx
      └── NetworkSettingsPage.jsx

backend/src/routes/
  ├── accountRoutes.js
  └── logsRoutes.js

database/
  └── permissions_seed.sql (NEW)
```

### Documentation Files
```
HRMS_FRONTEND_MODIFICATIONS_COMPLETE.md - Full details
RBAC_VERIFICATION_SCRIPT.md - Testing guide
DEPLOYMENT_CHECKLIST.md - Deployment steps
IMPLEMENTATION_SUMMARY.md - Executive summary
QUICK_REFERENCE.md - This file
```

---

## 💡 Pro Tips

### Tip 1: Always Test with Multiple Roles
```
1. Test as Super Admin (should have full access)
2. Test as HR Admin (should have limited access)
3. Test as Employee (should be denied)
```

### Tip 2: Check Backend Logs
```bash
# See authorization decisions
tail -f /var/log/hrms/backend.log | grep authorize

# Should show:
# [authorize] ✅ Access granted - User: admin@example.com
# [authorize] ❌ Permission denied - User: employee@example.com
```

### Tip 3: Use Browser DevTools
```
1. Open Console
2. Look for permission-related logs
3. Check Network tab for 403 errors
4. Verify JWT token in Application > Storage
```

### Tip 4: Database Shortcuts
```sql
-- Quick permission grant
CALL grant_permission('HR_ADMIN', 'Accounts', 'View', 'ORGANIZATION');

-- Quick role assignment  
CALL assign_role('user@example.com', 'HR_ADMIN');
```

---

## ⚡ Performance Tips

### Frontend
- PermissionGuard caches permission checks
- Use `useMemo` for expensive permission calculations
- Lazy load protected routes

### Backend
- authorize() is optimized with caching
- Permissions loaded once per request
- Scope filtering uses indexed queries

### Database
- RolePermissions has composite index
- Permission queries are cached
- Use `EXPLAIN` to verify query performance

---

## 🆘 Emergency Procedures

### Rollback Deployment
```bash
# 1. Restore database
mysql -u root -p hrms_db < backup_YYYYMMDD.sql

# 2. Revert code
git revert HEAD
git push

# 3. Redeploy
npm run build && pm2 restart all
```

### Lock Out All Users
```sql
-- Emergency: Disable all accounts except super admins
UPDATE Users 
SET is_active = 0 
WHERE role_uuid NOT IN (
  SELECT uuid FROM Roles WHERE code = 'SUPER_ADMIN'
);
```

### Grant Emergency Access
```sql
-- Give someone temp super admin
UPDATE Users 
SET role_uuid = (SELECT uuid FROM Roles WHERE code = 'SUPER_ADMIN'),
    permissions_version = permissions_version + 1
WHERE username = 'emergency@example.com';
```

---

## 📞 Who to Contact

| Issue | Contact |
|-------|---------|
| Backend API errors | Backend Team |
| Frontend crashes | Frontend Team |
| Database queries | DBA Team |
| Permission confusion | This documentation |
| Production emergency | On-call engineer |

---

## ✅ Pre-Deployment Checklist

```
[ ] Database permissions seeded
[ ] Backend routes updated
[ ] Frontend guards added
[ ] Tested with multiple roles
[ ] Checked backend logs
[ ] No console errors
[ ] Direct URL access blocked
[ ] Documentation updated
[ ] Rollback plan ready
[ ] Team notified
```

---

## 🎓 Learn More

- **Full Implementation:** `HRMS_FRONTEND_MODIFICATIONS_COMPLETE.md`
- **Testing Guide:** `RBAC_VERIFICATION_SCRIPT.md`
- **Deployment:** `DEPLOYMENT_CHECKLIST.md`
- **Executive Summary:** `IMPLEMENTATION_SUMMARY.md`

---

**Last Updated:** October 8, 2026  
**Version:** 1.0.0  
**Status:** Production Ready ✅
