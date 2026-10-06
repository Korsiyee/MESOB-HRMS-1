# Mesob HRMS - Testing and Deployment Guide

## 🎉 Refactoring Complete!

All major components have been successfully refactored:
- ✅ Database schema with module-level permissions
- ✅ Backend authorization middleware
- ✅ Frontend permission hooks and services
- ✅ All management pages created
- ✅ Personal Space module complete
- ✅ Role management UI built
- ✅ Routes updated (frontend + backend)
- ✅ Permit.io completely removed

---

## 📋 Pre-Testing Checklist

### 1. Database Setup

```bash
cd backend

# Verify database connection
node scripts/verifyModuleSetup.js

# If tables don't exist, run setup
node scripts/setupModulePermissions.js

# Migrate existing users to new role system
node scripts/migrateUserRoles.js
```

**Expected Output:**
```
✓ Modules table exists (7 modules)
✓ Scopes table exists (3 scopes)
✓ Roles table exists (5 roles)
✓ RoleModules table exists
✓ Users table has role_uuid column
✓ User migration: X users updated
```

### 2. Environment Setup

**Backend (.env):**
```bash
# Ensure these are set
DB_HOST=localhost
DB_USER=mesob
DB_PASSWORD=your_password
DB_NAME=mesob_hrms
JWT_SECRET=your_secret
PORT=5000
```

**Frontend (.env):**
```bash
VITE_API_BASE_URL=http://localhost:5000/api
```

---

## 🧪 Testing Plan

### Phase 1: Backend API Tests (15 minutes)

#### Start Backend
```bash
cd backend
npm install
npm start
```

**Expected:** Server running on port 5000

#### Test Module Roles API
```bash
# Health check
curl http://localhost:5000/api/health

# Get all modules
curl http://localhost:5000/api/module-roles/modules

# Get all scopes
curl http://localhost:5000/api/module-roles/scopes

# Get all roles
curl http://localhost:5000/api/module-roles/roles
```

**Expected:** JSON responses with module/scope/role data

#### Test Authentication
```bash
# Login as admin
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"employee_id":"ADMIN001","password":"password123"}'
```

**Expected:** Response with token and modulePermissions array

Save the token for next tests:
```bash
TOKEN="your_token_here"
```

#### Test Authorization
```bash
# Get user permissions
curl -H "Authorization: Bearer $TOKEN" \
  http://localhost:5000/api/module-roles/permissions/me

# Try accessing employees (requires EMPLOYEES module)
curl -H "Authorization: Bearer $TOKEN" \
  http://localhost:5000/api/employees

# Try accessing departments (requires ORGANIZATION module)
curl -H "Authorization: Bearer $TOKEN" \
  http://localhost:5000/api/departments
```

**Expected:** Successful responses for users with correct modules, 403 for unauthorized

---

### Phase 2: Frontend Tests (20 minutes)

#### Start Frontend
```bash
cd frontend
npm install
npm run dev
```

**Expected:** Vite dev server on http://localhost:5173

#### Test 1: Login with Different Roles

**SUPER_ADMIN Login:**
1. Login with super admin credentials
2. **Expected Navigation Items:**
   - Home
   - Employees
   - Organization (Departments, Positions, Levels)
   - Attendance
   - Shifts
   - Letters
   - Leave
   - Personal Space (always visible)
   - Admin (Role Management)

**DEPARTMENT_HEAD Login:**
1. Login with department head credentials
2. **Expected Navigation Items:**
   - Home
   - Employees
   - Attendance
   - Letters
   - Leave
   - Personal Space
3. **Should NOT see:**
   - Organization
   - Shifts
   - Admin

**EMPLOYEE Login:**
1. Login with employee credentials
2. **Expected Navigation Items:**
   - Home
   - Personal Space (My Attendance, My Letters, My Leaves, My Account)
3. **Should NOT see:**
   - Any administrative modules

#### Test 2: Management Pages

**Departments Management:**
1. Navigate to Organization → Departments
2. Click "Add Department"
3. Slide panel opens from right
4. Fill form and save
5. New department appears in grid
6. Click Edit, modify, and save
7. Search for department
8. Delete department (if no employees)

**Positions & Levels:**
- Repeat same flow
- Verify slide panels work
- Verify CRUD operations

**Expected:** All operations work smoothly with proper error handling

#### Test 3: Personal Space

**As any authenticated user:**
1. Navigate to Personal Space → My Attendance
   - See current time and punch in/out buttons
   - Click "Punch In"
   - See attendance record
   - View recent attendance history

2. Navigate to Personal Space → My Letters
   - See list of your letters
   - Filter by status
   - Download approved letters

3. Navigate to Personal Space → My Leaves
   - Click "Request Leave"
   - Fill leave request form
   - Submit request
   - See request in list

4. Navigate to Personal Space → My Account
   - View profile information
   - Click "Edit Profile"
   - Update contact info
   - Save changes

**Expected:** All personal data operations work without requiring admin permissions

#### Test 4: Role Management

**As SUPER_ADMIN:**
1. Navigate to Admin → Role Management
2. Click "Add Role"
3. Fill role details (name, code, description, hierarchy level)
4. Select default scope
5. Check modules to grant access
6. Set scope per module
7. Save role
8. Edit existing role
9. Toggle module permissions
10. Update and verify changes

**Expected:** Role CRUD works, module permissions update correctly

---

### Phase 3: Integration Tests (15 minutes)

#### Scope Filtering Test

**As DEPARTMENT_HEAD:**
1. Login
2. Navigate to Employees
3. **Expected:** Only see employees from your department
4. Try to view employee from different department
5. **Expected:** 403 Forbidden or filtered out

**As SUPER_ADMIN:**
1. Login  
2. Navigate to Employees
3. **Expected:** See ALL employees from all departments

#### Permission Enforcement Test

**As EMPLOYEE:**
1. Try to access `/organization/departments` directly
2. **Expected:** Redirect or empty navigation (no link visible)
3. Try API call: `curl -H "Authorization: Bearer $TOKEN" http://localhost:5000/api/departments`
4. **Expected:** 403 Forbidden

**As HR_ADMIN:**
1. Access should be granted to most modules
2. Verify data scope is appropriate (organization-wide)

---

### Phase 4: Stress & Edge Case Tests (10 minutes)

#### Test 1: Rapid Navigation
- Click through navigation items rapidly
- **Expected:** No crashes, smooth transitions

#### Test 2: Empty States
- Login as new user with no data
- **Expected:** See helpful empty state messages with action buttons

#### Test 3: Form Validation
- Try to save empty forms
- **Expected:** Proper validation errors displayed

#### Test 4: Long Data
- Create department with very long name
- **Expected:** UI handles gracefully (truncation, wrapping)

#### Test 5: Concurrent Edits
- Open same record in two browser tabs
- Edit in both
- **Expected:** Proper error handling or last-write-wins

---

## 🐛 Common Issues & Fixes

### Issue: "Cannot read property 'modulePermissions' of null"
**Fix:** User object not properly updated after login
```javascript
// Check AuthContext.jsx - ensure permissions are stored
login(user, permissions)
```

### Issue: Navigation doesn't show up
**Fix:** Check module permissions in database
```sql
SELECT u.employee_id, r.name, m.name as module 
FROM Users u 
JOIN Roles r ON u.role_uuid = r.uuid
LEFT JOIN RoleModules rm ON r.uuid = rm.role_uuid
LEFT JOIN Modules m ON rm.module_uuid = m.uuid
WHERE u.employee_id = 'YOUR_ID';
```

### Issue: 403 Forbidden on API calls
**Fix:** Check backend middleware is properly configured
- Verify requireModule() is used instead of authorize()
- Check module codes match exactly ('EMPLOYEES', not 'employees')

### Issue: Slide panels don't open
**Fix:** Check SlidePanel component props
- Ensure `open` prop is boolean
- Verify `onClose` is provided

### Issue: Database connection error
**Fix:** 
```bash
# Test MySQL connection
mysql -u mesob -p mesob_hrms

# Verify credentials in .env
```

---

## ✅ Success Criteria

All tests pass if:

1. **Authentication Works**
   - ✓ Users can login
   - ✓ Token is stored
   - ✓ Permissions are loaded

2. **Authorization Works**
   - ✓ Navigation shows only permitted modules
   - ✓ Backend enforces module access
   - ✓ Scope filtering works correctly

3. **Pages Work**
   - ✓ All management pages load
   - ✓ CRUD operations function properly
   - ✓ Slide panels open/close smoothly
   - ✓ Forms validate correctly

4. **Personal Space Works**
   - ✓ All users can access their own data
   - ✓ Punch in/out works
   - ✓ Leave requests submit successfully
   - ✓ Profile updates save

5. **Role Management Works**
   - ✓ Admins can create/edit roles
   - ✓ Module permissions update
   - ✓ New roles apply immediately

---

## 🚀 Deployment Steps

### 1. Database Migration (Production)

```bash
# Backup first!
mysqldump -u mesob -p mesob_hrms > backup_$(date +%Y%m%d).sql

# Run setup script
node backend/scripts/setupModulePermissions.js

# Migrate users
node backend/scripts/migrateUserRoles.js

# Verify
node backend/scripts/verifyModuleSetup.js
```

### 2. Backend Deployment

```bash
cd backend

# Install dependencies
npm ci --production

# Run migrations
npm run migrate  # if you have migrations

# Start with PM2
pm2 start server.js --name mesob-hrms-backend

# Check logs
pm2 logs mesob-hrms-backend
```

### 3. Frontend Deployment

```bash
cd frontend

# Build for production
npm run build

# Output is in dist/ folder
# Copy to web server (nginx, apache, etc.)
cp -r dist/* /var/www/html/mesob-hrms/
```

### 4. Nginx Configuration

```nginx
server {
    listen 80;
    server_name hrms.yourdomain.com;

    # Frontend
    location / {
        root /var/www/html/mesob-hrms;
        try_files $uri $uri/ /index.html;
    }

    # Backend API
    location /api/ {
        proxy_pass http://localhost:5000/api/;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

### 5. Post-Deployment Verification

```bash
# Health check
curl https://hrms.yourdomain.com/api/health

# Test login
curl -X POST https://hrms.yourdomain.com/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"employee_id":"test","password":"test"}'

# Check modules
curl https://hrms.yourdomain.com/api/module-roles/modules
```

---

## 📊 Performance Benchmarks

Expected response times:

- Login: < 500ms
- Get Modules: < 100ms
- List Employees (100 records): < 300ms
- CRUD Operations: < 200ms
- Page Load: < 1s

---

## 📞 Support

If you encounter issues:

1. Check browser console for errors
2. Check backend logs: `pm2 logs mesob-hrms-backend`
3. Verify database connection
4. Review FINAL_COMPLETION_STATUS.md
5. Check IMPLEMENTATION_GUIDE.md

---

**Status:** Ready for Testing  
**Last Updated:** 2024  
**Version:** 2.0.0 (Module-Based Authorization)
