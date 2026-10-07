# Test Admin Access - Quick Guide

## ✅ System Status

**Backend:** ✅ Running on http://localhost:5000  
**Frontend:** ✅ Running on http://localhost:5173  
**Database:** ✅ Permission system initialized  
**Fix Applied:** ✅ Module-based permissions configured

---

## 🧪 Test Steps

### 1. Clear Browser Data (Important!)

Before testing, **clear your browser cache and storage**:

1. Open browser DevTools (F12)
2. Go to **Application** tab (Chrome) or **Storage** tab (Firefox)
3. Click **Clear storage** → **Clear site data**
4. Or use Console:
   ```javascript
   localStorage.clear();
   sessionStorage.clear();
   location.reload();
   ```

### 2. Login as Admin

1. Go to: http://localhost:5173
2. Login with:
   - **Username:** `admin`
   - **Password:** `admin123`

### 3. Verify Admin Dashboard

You should now see the **Admin Dashboard** (NOT Employee Dashboard):

#### ✅ Expected to See:

**Dashboard (Home Page):**
- [ ] **KPI Cards** at the top:
  - Total Employees
  - On Leave Today
  - Present Today
  - Pending Approvals
- [ ] **Attendance Chart** (organization-wide data)
- [ ] **Department Chart** (all departments)
- [ ] **Recent Activity** (audit logs)
- [ ] **Upcoming Holidays**

**Sidebar Navigation - MODULES Section:**
- [ ] Home
- [ ] Employees (with submenu: Employee List, Register Employee)
- [ ] Organization (with submenu: Departments, Positions, Levels)
- [ ] Attendance (with submenu: Attendance Records, Attendance Analytics)
- [ ] Shifts
- [ ] Letters
- [ ] Leave (with submenu: Leave Requests, Leave Settings)

**Sidebar Navigation - ADMINISTRATION Section:**
- [ ] **Accounts** ← This is new!
- [ ] **Roles & Permissions** ← This is new!
- [ ] **Audit Log** ← This is new!

**Sidebar Navigation - PERSONAL SPACE Section:**
- [ ] My Attendance
- [ ] My Letters
- [ ] My Leaves
- [ ] My Account

### 4. Test Admin Pages

Click each admin page to verify access:

| Page | URL | Expected |
|------|-----|----------|
| Accounts | `/accounts` | User account management |
| Roles & Permissions | `/admin/roles` | Role management interface |
| Audit Log | `/logs` | System audit logs |
| Employees | `/employees` | All employees list with "Register Employee" button |
| Departments | `/departments` | All departments |
| Attendance | `/attendance` | Organization-wide attendance view |

### 5. Verify NOT Seeing Employee Interface

#### ❌ Should NOT See:
- Simple employee dashboard without statistics
- Limited navigation (personal space only)
- "You don't have access" messages on admin pages

---

## 🐛 Troubleshooting

### Problem: Still seeing Employee Dashboard

**Solution 1 - Clear Cache:**
```javascript
// In browser console (F12)
localStorage.clear();
sessionStorage.clear();
location.reload();
```

**Solution 2 - Hard Refresh:**
- Windows: `Ctrl + Shift + R` or `Ctrl + F5`
- Mac: `Cmd + Shift + R`

**Solution 3 - Check Database:**
```bash
cd backend
node -e "require('dotenv').config();const mysql=require('mysql2/promise');mysql.createConnection({host:'localhost',user:'root',password:process.env.DB_PASSWORD,database:'hrms_leave_service'}).then(async c=>{const[r]=await c.query('SELECT u.username,r.code as role,COUNT(rm.uuid) as modules FROM Users u JOIN Roles r ON u.role_uuid=r.uuid JOIN RoleModules rm ON r.uuid=rm.role_uuid WHERE u.username=\"admin\" GROUP BY u.uuid');console.log(r[0]);process.exit(0);})"
```

Expected output: `{ username: 'admin', role: 'SUPER_ADMIN', modules: '8' }`

### Problem: Sidebar missing Admin section

**Check Network Tab:**
1. Open DevTools → Network tab
2. Filter: `permissions`
3. Refresh page
4. Look for: `GET /api/module-roles/permissions/me`
5. Check response - should show 8 modules including ADMIN

**Check Console:**
Look for errors related to permissions or authorization

### Problem: Admin pages return 403 Forbidden

**Backend Issue:**
1. Check backend logs for errors
2. Restart backend:
   ```bash
   cd backend
   npm start
   ```

---

## 📊 Expected Permission Data

When logged in as Admin, the permissions API should return:

```json
{
  "role": {
    "code": "SUPER_ADMIN",
    "name": "Super Admin",
    "hierarchy_level": 100
  },
  "defaultScope": {
    "code": "ORGANIZATION",
    "name": "Organization-wide"
  },
  "modules": [
    { "code": "HOME", "name": "Home", "scope": { "code": "ORGANIZATION" } },
    { "code": "EMPLOYEES", "name": "Employees", "scope": { "code": "ORGANIZATION" } },
    { "code": "ORGANIZATION", "name": "Organization", "scope": { "code": "ORGANIZATION" } },
    { "code": "ATTENDANCE", "name": "Attendance", "scope": { "code": "ORGANIZATION" } },
    { "code": "SHIFTS", "name": "Shifts", "scope": { "code": "ORGANIZATION" } },
    { "code": "LETTERS", "name": "Letters", "scope": { "code": "ORGANIZATION" } },
    { "code": "LEAVE", "name": "Leave", "scope": { "code": "ORGANIZATION" } },
    { "code": "ADMIN", "name": "Administration", "scope": { "code": "ORGANIZATION" } }
  ]
}
```

You can check this in browser console:
```javascript
// After logging in, check:
fetch('http://localhost:5000/api/module-roles/permissions/me', {
  headers: { 'Authorization': 'Bearer ' + localStorage.getItem('authToken') }
})
.then(r => r.json())
.then(d => console.log(d));
```

---

## ✅ Success Criteria

Admin access is working correctly if:

1. ✅ **Dashboard shows organization statistics** (not just personal data)
2. ✅ **Sidebar shows ADMINISTRATION section** with 3 admin items
3. ✅ **Can access all 8 modules** without permission errors
4. ✅ **Can view /accounts page** (user management)
5. ✅ **Can view /admin/roles page** (role management)
6. ✅ **Can view /logs page** (audit logs)
7. ✅ **Can see all employees** (not filtered to department)
8. ✅ **Can register new employees** (button visible)

---

## 📋 Test Other Roles

After verifying Admin works, test other roles if available:

### Test Employee Account
1. Logout from admin
2. Login as employee (if you have credentials)
3. **Expected:** Simple personal dashboard, Personal Space only
4. **Should NOT see:** Admin section, organization-wide data

### Test Department Head Account  
1. Logout
2. Login as department head (if available)
3. **Expected:** Department dashboard, limited modules
4. **Should see:** Only their department's data

---

## 🆘 Need Help?

If the fix doesn't work:

1. **Check the detailed documentation:**
   - Read `ROLE_BASED_UI_FIX.md` for complete details

2. **Verify database state:**
   ```bash
   cd backend
   node -e "require('dotenv').config();const mysql=require('mysql2/promise');mysql.createConnection({host:'localhost',user:'root',password:process.env.DB_PASSWORD,database:'hrms_leave_service'}).then(async c=>{const[m]=await c.query('SELECT COUNT(*) as count FROM Modules');const[r]=await c.query('SELECT COUNT(*) as count FROM Roles');const[rm]=await c.query('SELECT COUNT(*) as count FROM RoleModules');console.log('Modules:',m[0].count,'Roles:',r[0].count,'Permissions:',rm[0].count);process.exit(0);})"
   ```
   Expected: `Modules: 8 Roles: 5 Permissions: 24`

3. **Re-run setup scripts:**
   ```bash
   cd backend
   node scripts/setupModulePermissions.js
   node add-admin-module.js
   ```

4. **Restart both servers:**
   - Stop backend and frontend
   - Start backend: `cd backend && npm start`
   - Start frontend: `cd frontend && npm run dev`

---

**Last Updated:** December 7, 2026  
**Status:** ✅ Ready for Testing
