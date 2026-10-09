# RBAC Verification and Testing Script

## Purpose
This document provides step-by-step verification of the RBAC (Role-Based Access Control) implementation for the HRMS system.

## Prerequisites
1. Database schema is up to date
2. Permission seeds have been run: `mysql -u user -p database < database/permissions_seed.sql`
3. Backend server is running
4. Frontend is built and deployed

## Test Accounts Required

### Super Admin Account
- Username: `admin@mesob.gov.et` (or create one)
- Should have role: `SUPER_ADMIN`
- Expected permissions: ALL

### HR Admin Account  
- Username: `hradmin@mesob.gov.et` (or create one)
- Should have role: `HR_ADMIN`
- Expected permissions: Limited (View-only for most admin features)

### Regular Employee Account
- Username: `employee@mesob.gov.et` (or create one)
- Should have role: `EMPLOYEE`
- Expected permissions: Personal space only

## Verification Steps

### 1. Database Permission Verification

```sql
-- Check if ADMIN module exists
SELECT * FROM Modules WHERE code = 'ADMIN';

-- Check if Actions exist
SELECT * FROM Actions WHERE code IN ('VIEW', 'CREATE', 'UPDATE', 'DELETE', 'EXPORT');

-- Check Super Admin permissions
SELECT 
    r.name AS role_name,
    m.name AS module_name,
    a.name AS action_name,
    s.name AS scope_name,
    CONCAT(m.code, '.', a.code) AS permission_code
FROM RolePermissions rp
JOIN Roles r ON rp.role_uuid = r.uuid
JOIN Modules m ON rp.module_uuid = m.uuid
JOIN Actions a ON rp.action_uuid = a.uuid
JOIN Scopes s ON rp.scope_uuid = s.uuid
WHERE r.code = 'SUPER_ADMIN'
AND m.code IN ('ADMIN', 'ATTENDANCE')
ORDER BY m.code, a.code;

-- Check HR Admin permissions
SELECT 
    r.name AS role_name,
    m.name AS module_name,
    a.name AS action_name,
    s.name AS scope_name
FROM RolePermissions rp
JOIN Roles r ON rp.role_uuid = r.uuid
JOIN Modules m ON rp.module_uuid = m.uuid
JOIN Actions a ON rp.action_uuid = a.uuid
JOIN Scopes s ON rp.scope_uuid = s.uuid
WHERE r.code = 'HR_ADMIN'
AND m.code IN ('ADMIN', 'ATTENDANCE')
ORDER BY m.code, a.code;
```

**Expected Results:**
- Super Admin should have VIEW, CREATE, UPDATE, DELETE permissions for ADMIN module
- Super Admin should have VIEW, CREATE, UPDATE, DELETE permissions for NetworkSettings (ATTENDANCE module)
- HR Admin should have VIEW permission for ADMIN module with DEPARTMENT scope
- HR Admin should have VIEW, UPDATE permissions for NetworkSettings

### 2. Backend API Verification

#### Test Network Settings Endpoints

```bash
# Get auth token first
TOKEN="your-jwt-token-here"

# Test as Super Admin - Should succeed
curl -X GET http://localhost:5000/api/network-settings \
  -H "Authorization: Bearer $TOKEN"

# Test creating network setting - Super Admin should succeed
curl -X POST http://localhost:5000/api/network-settings \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"label":"Test IP","ip_address":"192.168.1.100","is_active":true}'

# Test as Regular Employee - Should return 403
curl -X GET http://localhost:5000/api/network-settings \
  -H "Authorization: Bearer $EMPLOYEE_TOKEN"
```

**Expected Results:**
- Super Admin: 200 OK with data
- HR Admin: 200 OK with data (VIEW permission)
- Regular Employee: 403 Forbidden

#### Test Accounts Endpoints

```bash
# Test as Super Admin - Should succeed
curl -X GET http://localhost:5000/api/accounts \
  -H "Authorization: Bearer $TOKEN"

# Test creating account - Super Admin should succeed, HR Admin should fail
curl -X POST http://localhost:5000/api/accounts \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"username":"testuser","employee_uuid":"...", "role_uuid":"..."}'

# Test as HR Admin - Should return 403 for CREATE
curl -X POST http://localhost:5000/api/accounts \
  -H "Authorization: Bearer $HR_ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{...}'
```

**Expected Results:**
- Super Admin GET: 200 OK
- Super Admin POST: 201 Created
- HR Admin GET: 200 OK  
- HR Admin POST: 403 Forbidden
- Regular Employee GET: 403 Forbidden

#### Test Audit Logs Endpoints

```bash
# Test as Super Admin - Should succeed
curl -X GET http://localhost:5000/api/logs \
  -H "Authorization: Bearer $TOKEN"

# Test as HR Admin - Should succeed with department scope
curl -X GET http://localhost:5000/api/logs \
  -H "Authorization: Bearer $HR_ADMIN_TOKEN"

# Test export - Only Super Admin should succeed
curl -X GET http://localhost:5000/api/logs/export \
  -H "Authorization: Bearer $TOKEN"

curl -X GET http://localhost:5000/api/logs/export \
  -H "Authorization: Bearer $HR_ADMIN_TOKEN"
```

**Expected Results:**
- Super Admin GET: 200 OK with all logs
- Super Admin EXPORT: 200 OK with file
- HR Admin GET: 200 OK with department-scoped logs only
- HR Admin EXPORT: 403 Forbidden
- Regular Employee: 403 Forbidden

#### Test Roles Management Endpoints

```bash
# Test getting roles - Super Admin and HR Admin should succeed
curl -X GET http://localhost:5000/api/admin/roles \
  -H "Authorization: Bearer $TOKEN"

# Test creating role - Only Super Admin should succeed
curl -X POST http://localhost:5000/api/admin/roles \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"code":"TEST_ROLE","name":"Test Role","hierarchy_level":50}'

# Test as HR Admin - Should return 403
curl -X POST http://localhost:5000/api/admin/roles \
  -H "Authorization: Bearer $HR_ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{...}'
```

**Expected Results:**
- Super Admin GET: 200 OK
- Super Admin POST: 201 Created
- HR Admin GET: 200 OK
- HR Admin POST: 403 Forbidden

### 3. Frontend UI Verification

#### Login as Super Admin

1. **Navigate to Attendance Module**
   - ✅ Should see "Network Settings" sub-tab
   - ✅ Click Network Settings - page should load
   - ✅ Should see "Add Network Setting" button
   - ✅ Should be able to create, edit, delete settings

2. **Navigate to Administration Section**
   - ✅ Should see "Accounts" in sidebar
   - ✅ Should see "Roles & Permissions" in sidebar
   - ✅ Should see "Audit Log" in sidebar

3. **Test Accounts Page**
   - ✅ Page loads without errors
   - ✅ Can see all accounts
   - ✅ Can create new account
   - ✅ Can edit account role
   - ✅ Can reset password
   - ✅ Can activate/deactivate account

4. **Test Roles & Permissions Page**
   - ✅ Page loads without errors
   - ✅ Can see all roles
   - ✅ "Create Role" button is visible
   - ✅ Can edit existing roles
   - ✅ Can delete custom roles (not system roles)

5. **Test Audit Logs Page**
   - ✅ Page loads without errors
   - ✅ Can see all audit logs
   - ✅ Can export logs

#### Login as HR Admin

1. **Navigate to Attendance Module**
   - ✅ Should see "Network Settings" sub-tab
   - ✅ Click Network Settings - page should load
   - ✅ Should see settings but limited actions
   - ❌ Should NOT see "Add Network Setting" button
   - ❌ Should NOT be able to delete settings

2. **Navigate to Administration Section**
   - ✅ Should see "Accounts" in sidebar
   - ✅ Should see "Roles & Permissions" in sidebar
   - ✅ Should see "Audit Log" in sidebar

3. **Test Accounts Page**
   - ✅ Page loads without errors
   - ✅ Can view accounts
   - ❌ Should NOT see "Create Account" button
   - ❌ Edit/Delete buttons should not work (403 error)

4. **Test Roles & Permissions Page**
   - ✅ Page loads without errors
   - ✅ Can view all roles
   - ❌ "Create Role" button should be hidden/disabled
   - ❌ Edit/Delete buttons should not work

5. **Test Audit Logs Page**
   - ✅ Page loads without errors
   - ✅ Can see logs (department-scoped)
   - ❌ Should NOT see "Export" button or it should fail

#### Login as Regular Employee

1. **Navigate to Modules**
   - ❌ Should NOT see "Network Settings" under Attendance
   - ❌ Should NOT see "Accounts" in sidebar
   - ❌ Should NOT see "Roles & Permissions" in sidebar
   - ❌ Should NOT see "Audit Log" in sidebar

2. **Test Direct URL Access**
   - Navigate to `/attendance/network-settings`
     - ❌ Should redirect or show "Access Denied" message
   - Navigate to `/accounts`
     - ❌ Should redirect or show "Access Denied" message
   - Navigate to `/admin/roles`
     - ❌ Should redirect or show "Access Denied" message
   - Navigate to `/logs`
     - ❌ Should redirect or show "Access Denied" message

### 4. Browser Console Verification

Open browser dev tools console and check:

1. **No Permission Errors in Console**
   - ✅ No 403 errors when loading pages user has access to
   - ✅ No JavaScript errors related to undefined permissions

2. **Authorization Logs** (if backend logging is enabled)
   ```
   [authorize] ✅ Access granted - User: admin@mesob.gov.et, Permissions: [NetworkSettings.View], Endpoint: /api/network-settings
   [authorize] ❌ Permission denied - User: employee@mesob.gov.et, Required: [Accounts.View], Endpoint: /api/accounts
   ```

### 5. Permission Removal Test

1. **Remove a permission from HR Admin**
   ```sql
   -- Remove NetworkSettings.View from HR Admin
   DELETE FROM RolePermissions 
   WHERE role_uuid = (SELECT uuid FROM Roles WHERE code = 'HR_ADMIN')
   AND module_uuid = (SELECT uuid FROM Modules WHERE code = 'ATTENDANCE')
   AND action_uuid = (SELECT uuid FROM Actions WHERE code = 'VIEW');
   
   -- Increment permissions_version to invalidate tokens
   UPDATE Users 
   SET permissions_version = permissions_version + 1
   WHERE role_uuid = (SELECT uuid FROM Roles WHERE code = 'HR_ADMIN');
   ```

2. **Test as HR Admin**
   - Logout and login again (to get new token with updated permissions)
   - ❌ "Network Settings" should disappear from sidebar
   - ❌ Direct access to `/attendance/network-settings` should fail

3. **Restore Permission**
   ```sql
   -- Re-add permission
   INSERT INTO RolePermissions (uuid, role_uuid, module_uuid, action_uuid, scope_uuid, created_at)
   SELECT 
       UUID(),
       (SELECT uuid FROM Roles WHERE code = 'HR_ADMIN'),
       (SELECT uuid FROM Modules WHERE code = 'ATTENDANCE'),
       (SELECT uuid FROM Actions WHERE code = 'VIEW'),
       (SELECT uuid FROM Scopes WHERE code = 'ORGANIZATION'),
       NOW();
   
   -- Increment permissions_version again
   UPDATE Users 
   SET permissions_version = permissions_version + 1
   WHERE role_uuid = (SELECT uuid FROM Roles WHERE code = 'HR_ADMIN');
   ```

### 6. Scope Enforcement Test (Audit Logs)

1. **Create test data in different departments**
   - Create audit logs for Department A
   - Create audit logs for Department B

2. **Login as Department A Head**
   - Navigate to Audit Logs
   - ✅ Should only see logs from Department A
   - ❌ Should NOT see logs from Department B

3. **Login as Super Admin**
   - Navigate to Audit Logs
   - ✅ Should see logs from ALL departments

## Automated Test Script

Create a test file `test_rbac.sh`:

```bash
#!/bin/bash

# RBAC Automated Test Script
# Usage: ./test_rbac.sh

API_BASE="http://localhost:5000/api"

# Color codes
GREEN='\033[0;32m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo "========================================="
echo "HRMS RBAC Verification Test"
echo "========================================="

# Test function
test_endpoint() {
    local name="$1"
    local method="$2"
    local endpoint="$3"
    local token="$4"
    local expected_status="$5"
    
    response=$(curl -s -w "%{http_code}" -X $method "$API_BASE$endpoint" \
        -H "Authorization: Bearer $token" \
        -o /dev/null)
    
    if [ "$response" -eq "$expected_status" ]; then
        echo -e "${GREEN}✅ PASS${NC}: $name (Expected: $expected_status, Got: $response)"
        return 0
    else
        echo -e "${RED}❌ FAIL${NC}: $name (Expected: $expected_status, Got: $response)"
        return 1
    fi
}

# Get tokens (you need to implement login first)
echo "Please provide test tokens:"
read -p "Super Admin Token: " SUPER_ADMIN_TOKEN
read -p "HR Admin Token: " HR_ADMIN_TOKEN
read -p "Employee Token: " EMPLOYEE_TOKEN

echo ""
echo "Testing Network Settings..."
test_endpoint "Super Admin can view network settings" "GET" "/network-settings" "$SUPER_ADMIN_TOKEN" "200"
test_endpoint "HR Admin can view network settings" "GET" "/network-settings" "$HR_ADMIN_TOKEN" "200"
test_endpoint "Employee cannot view network settings" "GET" "/network-settings" "$EMPLOYEE_TOKEN" "403"

echo ""
echo "Testing Accounts..."
test_endpoint "Super Admin can view accounts" "GET" "/accounts" "$SUPER_ADMIN_TOKEN" "200"
test_endpoint "HR Admin can view accounts" "GET" "/accounts" "$HR_ADMIN_TOKEN" "200"
test_endpoint "Employee cannot view accounts" "GET" "/accounts" "$EMPLOYEE_TOKEN" "403"

echo ""
echo "Testing Audit Logs..."
test_endpoint "Super Admin can view logs" "GET" "/logs" "$SUPER_ADMIN_TOKEN" "200"
test_endpoint "HR Admin can view logs" "GET" "/logs" "$HR_ADMIN_TOKEN" "200"
test_endpoint "Employee cannot view logs" "GET" "/logs" "$EMPLOYEE_TOKEN" "403"

echo ""
echo "Testing Roles..."
test_endpoint "Super Admin can view roles" "GET" "/admin/roles" "$SUPER_ADMIN_TOKEN" "200"
test_endpoint "HR Admin can view roles" "GET" "/admin/roles" "$HR_ADMIN_TOKEN" "200"
test_endpoint "Employee cannot view roles" "GET" "/admin/roles" "$EMPLOYEE_TOKEN" "403"

echo ""
echo "========================================="
echo "Test Complete"
echo "========================================="
```

Make it executable:
```bash
chmod +x test_rbac.sh
```

## Troubleshooting

### Issue: "Permission denied" for authorized user

**Check:**
1. JWT token is valid and not expired
2. `permissions_version` matches between token and database
3. User's role is active (`is_active = 1`)
4. Permission exists in `RolePermissions` table
5. Backend `authorize()` middleware is properly applied to route

### Issue: UI shows buttons but API returns 403

**Cause:** Frontend permission check doesn't match backend permission check

**Fix:**
1. Ensure PermissionGuard uses same permission code as backend authorize()
2. Check user's JWT contains the permission
3. Verify permission code format: `Resource.Action`

### Issue: Direct URL access works when it shouldn't

**Cause:** Missing PermissionGuard wrapper

**Fix:**
1. Wrap page component export with PermissionGuard
2. Example: `export default () => <PermissionGuard permissions="Resource.View"><Page /></PermissionGuard>`

### Issue: Scope not working (seeing all data when should see department only)

**Cause:** Scope enforcement not enabled in authorize() middleware

**Fix:**
1. Add `enforceScope: true` to authorize() options
2. Use `req.scope` in controller to filter query
3. Example: `authorize({ permissions: 'AuditLogs.View', enforceScope: true })`

## Success Criteria

All tests should pass with these results:

- ✅ Super Admin has full access to all pages
- ✅ HR Admin has view-only access to admin pages
- ✅ Regular Employee has no access to admin pages
- ✅ Direct URL access is blocked without proper permissions
- ✅ Removing a permission immediately hides UI access
- ✅ Backend returns 403 for unauthorized requests
- ✅ Scope enforcement limits data visibility correctly
- ✅ No permission-related errors in browser console

## Completion Checklist

- [ ] Database permissions verified
- [ ] Backend API endpoints tested
- [ ] Frontend UI verified for all roles
- [ ] Direct URL access blocked
- [ ] Permission removal test passed
- [ ] Scope enforcement verified
- [ ] No console errors
- [ ] All automated tests pass

## Sign-off

**Tested by:** ___________________  
**Date:** ___________________  
**Result:** ☐ PASS ☐ FAIL  
**Notes:** ___________________________________________________________
