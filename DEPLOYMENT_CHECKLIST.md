# HRMS Modifications - Deployment Checklist

## 🎯 Overview
This checklist ensures all modifications are properly deployed and verified in the production environment.

## ✅ Pre-Deployment Verification

### 1. Code Review
- [x] All 12 tasks completed
- [x] Modified files reviewed and tested
- [x] No console errors in development
- [x] Git changes committed with proper messages

### 2. Database Preparation
- [ ] Backup current production database
- [ ] Review `database/permissions_seed.sql`
- [ ] Test seed script on staging database
- [ ] Verify no conflicts with existing data

### 3. Backend Preparation
- [ ] Review route changes in `backend/src/routes/`
- [ ] Verify `authorize()` middleware is properly applied
- [ ] Check environment variables are set
- [ ] Run backend tests (if available)

### 4. Frontend Preparation  
- [ ] Review permission guard implementations
- [ ] Verify navigation structure updates
- [ ] Check all imports are correct
- [ ] Build frontend: `npm run build`
- [ ] Test build locally

## 🚀 Deployment Steps

### Step 1: Database Migration
```bash
# 1. Connect to database server
ssh user@database-server

# 2. Backup existing database
mysqldump -u root -p hrms_database > hrms_backup_$(date +%Y%m%d_%H%M%S).sql

# 3. Apply permission seeds
mysql -u root -p hrms_database < database/permissions_seed.sql

# 4. Verify permissions were created
mysql -u root -p hrms_database -e "
SELECT COUNT(*) as permission_count 
FROM RolePermissions rp
JOIN Modules m ON rp.module_uuid = m.uuid
WHERE m.code IN ('ADMIN', 'ATTENDANCE');
"

# Expected: Should show new permission entries
```

### Step 2: Backend Deployment
```bash
# 1. Pull latest code
cd /path/to/backend
git pull origin main

# 2. Install dependencies (if package.json changed)
npm install

# 3. Restart backend service
sudo systemctl restart hrms-backend
# OR
pm2 restart hrms-backend

# 4. Check logs for errors
tail -f /var/log/hrms/backend.log
# OR
pm2 logs hrms-backend

# 5. Verify API is responding
curl http://localhost:5000/api/health
```

### Step 3: Frontend Deployment
```bash
# 1. Pull latest code
cd /path/to/frontend
git pull origin main

# 2. Install dependencies (if package.json changed)
npm install

# 3. Build production bundle
npm run build

# 4. Deploy build files
# Option A: Copy to web server
sudo cp -r dist/* /var/www/html/hrms/

# Option B: Deploy to CDN/S3
aws s3 sync dist/ s3://your-bucket/hrms/ --delete

# 5. Clear CDN cache (if applicable)
aws cloudfront create-invalidation --distribution-id XXXXX --paths "/*"

# 6. Restart web server
sudo systemctl restart nginx
```

### Step 4: Permission Version Reset (Important!)
```bash
# Users need to re-login to get new permissions
# Increment permissions_version to invalidate existing tokens

mysql -u root -p hrms_database -e "
UPDATE Users 
SET permissions_version = permissions_version + 1
WHERE role_uuid IN (
  SELECT uuid FROM Roles 
  WHERE code IN ('SUPER_ADMIN', 'HR_ADMIN')
);
"

# This forces re-authentication for affected users
```

## 🧪 Post-Deployment Testing

### Test 1: Database Verification
```sql
-- Verify ADMIN module exists
SELECT * FROM Modules WHERE code = 'ADMIN';
-- Expected: 1 row

-- Verify NetworkSettings permissions
SELECT 
    r.name,
    CONCAT(m.code, '.', a.code) as permission
FROM RolePermissions rp
JOIN Roles r ON rp.role_uuid = r.uuid
JOIN Modules m ON rp.module_uuid = m.uuid
JOIN Actions a ON rp.action_uuid = a.uuid
WHERE m.code = 'ATTENDANCE'
AND r.code = 'SUPER_ADMIN';
-- Expected: Multiple rows including NetworkSettings.*

-- Verify Accounts permissions
SELECT 
    r.name,
    CONCAT(m.code, '.', a.code) as permission
FROM RolePermissions rp
JOIN Roles r ON rp.role_uuid = r.uuid
JOIN Modules m ON rp.module_uuid = m.uuid
JOIN Actions a ON rp.action_uuid = a.uuid
WHERE m.code = 'ADMIN'
AND r.code IN ('SUPER_ADMIN', 'HR_ADMIN')
ORDER BY r.name, permission;
-- Expected: Super Admin has all, HR Admin has limited
```

### Test 2: Backend API Testing

```bash
# Get tokens for testing
SUPER_ADMIN_TOKEN="..." # Login as super admin
HR_ADMIN_TOKEN="..."     # Login as HR admin
EMPLOYEE_TOKEN="..."     # Login as employee

# Test Network Settings
echo "Testing Network Settings API..."
curl -X GET http://your-domain/api/network-settings \
  -H "Authorization: Bearer $SUPER_ADMIN_TOKEN"
# Expected: 200 OK with data

curl -X GET http://your-domain/api/network-settings \
  -H "Authorization: Bearer $EMPLOYEE_TOKEN"
# Expected: 403 Forbidden

# Test Accounts
echo "Testing Accounts API..."
curl -X GET http://your-domain/api/accounts \
  -H "Authorization: Bearer $SUPER_ADMIN_TOKEN"
# Expected: 200 OK with data

curl -X GET http://your-domain/api/accounts \
  -H "Authorization: Bearer $EMPLOYEE_TOKEN"
# Expected: 403 Forbidden

# Test Audit Logs
echo "Testing Audit Logs API..."
curl -X GET http://your-domain/api/logs \
  -H "Authorization: Bearer $SUPER_ADMIN_TOKEN"
# Expected: 200 OK with data

curl -X GET http://your-domain/api/logs \
  -H "Authorization: Bearer $HR_ADMIN_TOKEN"
# Expected: 200 OK with department-scoped data

# Test Roles
echo "Testing Roles API..."
curl -X GET http://your-domain/api/admin/roles \
  -H "Authorization: Bearer $SUPER_ADMIN_TOKEN"
# Expected: 200 OK with data
```

### Test 3: Frontend UI Testing

#### As Super Admin:
1. **Navigation**
   - [ ] Login as Super Admin
   - [ ] Verify Attendance > Network Settings visible in sidebar
   - [ ] Verify Letters sub-tabs visible
   - [ ] Verify Accounts, Roles & Permissions, Audit Log visible

2. **Network Settings Page**
   - [ ] Navigate to Attendance > Network Settings
   - [ ] Page loads without errors
   - [ ] Can see list of settings
   - [ ] "Add Network Setting" button visible
   - [ ] Can create new setting
   - [ ] Can edit existing setting
   - [ ] Can delete setting

3. **Accounts Page**
   - [ ] Navigate to Accounts
   - [ ] Page loads without errors
   - [ ] Can see all accounts
   - [ ] "Create Account" button visible
   - [ ] Can create new account
   - [ ] Can change account role
   - [ ] Can reset password
   - [ ] Can activate/deactivate account

4. **Roles & Permissions Page**
   - [ ] Navigate to Roles & Permissions
   - [ ] Page loads without errors
   - [ ] Can see all roles
   - [ ] "Create Role" button visible
   - [ ] Can create new role
   - [ ] Can edit existing role
   - [ ] Cannot edit/delete system roles
   - [ ] Can assign permissions to roles

5. **Audit Logs Page**
   - [ ] Navigate to Audit Log
   - [ ] Page loads without errors
   - [ ] Can see all audit logs
   - [ ] Can filter logs
   - [ ] "Export" button visible and working

#### As HR Admin:
1. **Navigation**
   - [ ] Login as HR Admin
   - [ ] Verify Attendance > Network Settings visible
   - [ ] Verify Letters sub-tabs visible
   - [ ] Verify Accounts, Roles & Permissions, Audit Log visible

2. **Network Settings Page**
   - [ ] Navigate to Attendance > Network Settings
   - [ ] Page loads without errors
   - [ ] Can see settings
   - [ ] "Add Network Setting" button NOT visible or disabled
   - [ ] Cannot delete settings (403 error if attempted)

3. **Accounts Page**
   - [ ] Navigate to Accounts
   - [ ] Page loads without errors
   - [ ] Can view accounts
   - [ ] "Create Account" button NOT visible
   - [ ] Edit/Delete actions return 403 error

4. **Roles & Permissions Page**
   - [ ] Navigate to Roles & Permissions
   - [ ] Page loads without errors
   - [ ] Can view all roles
   - [ ] "Create Role" button NOT visible
   - [ ] Edit/Delete buttons not working (403 error)

5. **Audit Logs Page**
   - [ ] Navigate to Audit Log
   - [ ] Page loads without errors
   - [ ] Can see department-scoped logs only
   - [ ] "Export" button NOT visible or returns 403

#### As Regular Employee:
1. **Navigation**
   - [ ] Login as Regular Employee
   - [ ] Network Settings NOT visible in sidebar
   - [ ] Accounts NOT visible in sidebar
   - [ ] Roles & Permissions NOT visible in sidebar
   - [ ] Audit Log NOT visible in sidebar

2. **Direct URL Access** (All should fail)
   - [ ] `/attendance/network-settings` → Access Denied or redirect
   - [ ] `/accounts` → Access Denied or redirect
   - [ ] `/admin/roles` → Access Denied or redirect
   - [ ] `/logs` → Access Denied or redirect

3. **API Calls** (Open browser console)
   - [ ] No 403 errors for pages user has access to
   - [ ] No JavaScript errors

### Test 4: Crash Prevention Testing
1. **Attendance Page**
   - [ ] Navigate to Attendance Records
   - [ ] Page loads without errors even with empty data
   - [ ] Filtering works without crashes
   - [ ] Export to CSV/PDF works with empty data

2. **Register Employee Page**
   - [ ] Navigate to Register Employee
   - [ ] Page loads without errors
   - [ ] Can enter full mother's name (3+ words)
   - [ ] Validation error if only 1 word entered
   - [ ] Form submits successfully with full name

## 📊 Success Metrics

### All Tests Must Pass:
- ✅ Database permissions exist and are correct
- ✅ Backend APIs return correct status codes (200/403)
- ✅ Super Admin has full access to all pages
- ✅ HR Admin has limited access as specified
- ✅ Regular Employee cannot access admin pages
- ✅ Direct URL access is blocked for unauthorized users
- ✅ No JavaScript errors in browser console
- ✅ No backend errors in server logs

### Performance Checks:
- [ ] Page load times < 2 seconds
- [ ] API response times < 500ms
- [ ] No memory leaks (check browser dev tools)
- [ ] Database query performance acceptable

## 🔄 Rollback Plan

If issues are discovered:

### Option 1: Quick Fix
```bash
# If minor issue, apply hotfix
git revert <commit-hash>
# Redeploy frontend/backend
```

### Option 2: Database Rollback
```bash
# Restore database backup
mysql -u root -p hrms_database < hrms_backup_YYYYMMDD_HHMMSS.sql

# Decrement permissions_version to revalidate old tokens
mysql -u root -p hrms_database -e "
UPDATE Users 
SET permissions_version = permissions_version - 1;
"
```

### Option 3: Full Rollback
```bash
# 1. Restore database
mysql -u root -p hrms_database < hrms_backup_YYYYMMDD_HHMMSS.sql

# 2. Revert code to previous version
git checkout <previous-stable-commit>

# 3. Rebuild frontend
npm run build

# 4. Redeploy everything
# Follow deployment steps with previous version
```

## 📝 Post-Deployment Notes

### Known Limitations:
1. Letters TabSwipe: Uses state-based tabs (not URL-based TabSwipe)
   - **Impact**: None - fully functional
   - **Reason**: Better UX for modal-heavy workflows

### Monitoring:
- [ ] Set up alerts for 403 errors (unexpected denials)
- [ ] Monitor API response times for new endpoints
- [ ] Watch for increased database query load
- [ ] Check frontend error reporting service

### Documentation:
- [ ] Update user manual with new features
- [ ] Train HR staff on new Accounts/Roles pages
- [ ] Document permission structure for IT team
- [ ] Update API documentation

## ✅ Sign-Off

**Deployment Date:** _______________  
**Deployed By:** _______________  
**Tested By:** _______________  
**Approved By:** _______________  

**Status:** ☐ Success ☐ Issues Found  
**Notes:** _________________________________________________________________

---

## 📚 Reference Documents

- `HRMS_FRONTEND_MODIFICATIONS_COMPLETE.md` - Complete implementation details
- `RBAC_VERIFICATION_SCRIPT.md` - Detailed testing procedures
- `database/permissions_seed.sql` - Database permission seeds

## 🆘 Support Contacts

**Backend Issues:** backend-team@company.com  
**Frontend Issues:** frontend-team@company.com  
**Database Issues:** dba-team@company.com  
**Emergency:** on-call-engineer@company.com

---

**End of Deployment Checklist**
