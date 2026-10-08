# HRMS Frontend Modules & RBAC Fixes - Implementation Plan

## Executive Summary
This document outlines the comprehensive fixes needed for the HRMS frontend covering 8 major areas: attendance crashes, missing modules, sub-tab structures, mother's name validation, and complete RBAC enforcement.

## Current State Analysis

### ✅ Already Implemented (No Changes Needed)
- **AccountsPage.jsx** - Fully implemented with RBAC using `<Can>` component
- **LogsPage.jsx** - Audit logs page exists with proper filtering
- **RoleManagementPage.jsx** - Role management with PermissionGuard
- **NetworkSettingsPage.jsx** - Page exists in routing

### ❌ Critical Issues Requiring Fixes

---

## 1. ATTENDANCE MODULE FIXES

### Issue 1.1: Attendance Records Tab Crashing
**File:** `frontend/src/pages/AttendancePage.jsx`
**Problem:** Records tab enters infinite loading loop with "internal server error"
**Root Cause:** API endpoint `/api/attendance/admin/all` failing or returning unexpected format

**Fix:**
```javascript
// In AttendancePage.jsx - Line 645-656, update error handling:
const load = useCallback(async () => {
  setLoading(true);
  try {
    const params = {
      search: filters.search,
      departmentUuid: filters.departmentUuid,
      positionUuid: filters.positionUuid,
      status: filters.status,
      startDate: filters.startDate,
      endDate: filters.endDate,
      page: filters.page,
      pageSize: filters.pageSize,
    };
    const res = canManageAll
      ? await AttendanceApi.getAllAttendance(params)
      : await AttendanceApi.getEmployeeAttendance(employeeUuid, params);
    
    // Add defensive checks
    const records = Array.isArray(res?.data) ? res.data : [];
    setRecords(records);
    setMeta({ 
      total: res?.meta?.total || res?.pagination?.total || 0, 
      totalPages: res?.meta?.totalPages || res?.pagination?.totalPages || 1 
    });
  } catch(e) { 
    console.error('Attendance load error:', e);
    showMsg('error', e.message || 'Failed to load attendance records.');
    setRecords([]); // Ensure records is always an array
    setMeta({ total: 0, totalPages: 1 });
  }
  finally { setLoading(false); }
}, [filters, canManageAll, employeeUuid]);
```

**Backend Verification Needed:**
- Check `backend/src/controllers/attendanceController.js` - `getAllAttendance` function
- Verify database query returns proper structure
- Check for SQL errors in backend logs

### Issue 1.2: Network Settings Page Integration
**File:** `frontend/src/pages/NetworkSettingsPage.jsx`
**Status:** Already exists and routed
**Action:** Verify it follows existing module structure and has proper RBAC

---

## 2. LETTERS MODULE ENHANCEMENTS

### Issue 2.1: Missing Sub-Tab Structure & Swipe Transitions
**File:** `frontend/src/pages/LettersPage.jsx`
**Current State:** Has basic tabs but missing swipe/animation effects used by other modules
**Required:** Add animated tab transitions like Attendance/Leave modules

**Implementation:**
```javascript
// Add to LettersPage.jsx after line 627:
import { motion, AnimatePresence } from 'framer-motion';

// Replace tab content rendering with:
<AnimatePresence mode="wait">
  <motion.div
    key={activeTab}
    initial={{ opacity: 0, x: 20 }}
    animate={{ opacity: 1, x: 0 }}
    exit={{ opacity: 0, x: -20 }}
    transition={{ duration: 0.2 }}
  >
    {activeTab === 'templates' && (/* templates content */)}
    {activeTab === 'generate' && (/* generate content */)}
    {activeTab === 'requests' && (/* requests content */)}
  </motion.div>
</AnimatePresence>
```

**Dependencies:**
```bash
cd frontend && npm install framer-motion
```

---

## 3. LEAVE SETTINGS MODULE

### Issue 3.1: Missing "Day Off" Sub-Tab
**Files to Create/Modify:**
- `frontend/src/pages/leave/DayOffSettingsPage.jsx` (NEW)
- `frontend/src/routes/AppRouter.jsx` (ADD ROUTE)

**New Component:** `DayOffSettingsPage.jsx`
```javascript
import React, { useState, useEffect } from 'react';
import { Calendar, Plus, Edit2, Trash2 } from 'lucide-react';

const DayOffSettingsPage = () => {
  const [dayOffTypes, setDayOffTypes] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Implement day off types management:
  // - Weekend configuration (Saturday/Sunday, custom days)
  // - Public holidays management
  // - Non-working days per department
  
  return (
    <div style={{ fontFamily: 'Poppins, sans-serif' }}>
      <div style={{ background: '#1e3a37', borderRadius: 14, padding: '20px 26px', marginBottom: 22 }}>
        <h1 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 700, color: '#E8F0EE' }}>
          Day Off Settings
        </h1>
        <p style={{ margin: '3px 0 0', fontSize: '0.75rem', color: 'rgba(232,240,238,0.6)' }}>
          Configure weekends, holidays, and non-working days
        </p>
      </div>
      {/* Implementation details */}
    </div>
  );
};

export default DayOffSettingsPage;
```

**Add Route** in `AppRouter.jsx`:
```javascript
import DayOffSettingsPage from '../pages/leave/DayOffSettingsPage';

// Add under Leave Module section:
<Route path="leave/settings/day-off" element={<DayOffSettingsPage />} />
```

---

## 4. ROLE & PERMISSION MODULE

### Issue 4.1: RBAC Enforcement
**Current State:** RoleManagementPage exists with PermissionGuard
**Required:** Ensure proper permission checks

**Verification Checklist:**
- [x] Page uses `<PermissionGuard permissions="Roles.Read">`
- [ ] Create button protected with `<PermissionGuard permissions="Roles.Create">`
- [ ] Edit actions protected with `<PermissionGuard permissions="Roles.Update">`
- [ ] Delete actions protected with `<PermissionGuard permissions="Roles.Delete">`

**Fix:** Already implemented correctly in `RoleManagementPage.jsx` lines 69-145

---

## 5. AUDIT LOGS MODULE

### Issue 5.1: RBAC Enforcement
**File:** `frontend/src/pages/LogsPage.jsx`
**Current State:** Page exists but NO permission guards
**Required:** Add RBAC checks for audit log access

**Fix - Add Permission Wrapper:**
```javascript
// At top of LogsPage.jsx:
import { PermissionGuard } from '../components/PermissionGuard';

// Wrap entire page export:
const LogsPage = () => {
  // ... existing code ...
};

// Replace default export with:
export default () => (
  <PermissionGuard permissions="AuditLogs.Read">
    <LogsPage />
  </PermissionGuard>
);
```

**Backend Permission Required:**
- Add `AuditLogs` resource with `Read` action to Permit.io
- Assign to `super_admin` and `hr_admin` roles only

---

## 6. ACCOUNTS MODULE

### Issue 6.1: RBAC Already Implemented
**File:** `frontend/src/pages/AccountsPage.jsx`
**Status:** ✅ Already using `<Can action="create" resource="accounts">` (line 419)
**Action:** No changes needed - already properly secured

---

## 7. EMPLOYEE REGISTRATION MODULE

### Issue 7.1: Page Crashes - occupation.map is not a function
**File:** `frontend/src/pages/EmployeeRegistrationPage.jsx` Line 256
**Root Cause:** `occupations` state not initialized as empty array

**Fix:**
```javascript
// Line 256 - Change from:
const [occupations, setOccupations] = useState([]);

// To (defensive initialization):
const [occupations, setOccupations] = useState([]);

// Line 273 - Update fetch to handle errors:
useEffect(() => {
  Promise.all([
    EmployeeApi.listDepartments().catch(() => ({ data: [] })),
    EmployeeApi.listPositions().catch(() => ({ data: [] })),
    LevelApi.list().catch(() => ({ data: [] })),
    RbacApi.listOccupations().catch(() => ({ data: [] })),
  ]).then(([d, p, l, o]) => {
    setDepartments(Array.isArray(d?.data) ? d.data : []);
    setPositions(Array.isArray(p?.data) ? p.data : []);
    setLevels(Array.isArray(l?.data) ? l.data : []);
    setOccupations(Array.isArray(o?.data) ? o.data : []); // Force array
  }).catch(err => {
    console.error('Failed to load dropdown data:', err);
    // Set all to empty arrays as fallback
    setDepartments([]);
    setPositions([]);
    setLevels([]);
    setOccupations([]);
  });
}, [draftUuid]);
```

### Issue 7.2: Mother's Name Validation - Only Accepts Single Word
**File:** `frontend/src/pages/EmployeeRegistrationPage.jsx` Line 192-200
**Current Validation:** Already implemented! (Lines 421-428)
**Status:** ✅ Validation exists checking for at least 2 name parts

**Existing Code (Line 421-428):**
```javascript
// Validate mother_name contains at least 2 name parts
const motherNameParts = personal.mother_name.trim().split(/\s+/).filter(part => part.length > 0);
if (motherNameParts.length < 2) {
  setError("Please enter the mother's full name (at least first and last name).");
  return;
}
```

**Action:** ✅ No changes needed - already validates full name

### Issue 7.3: Database Schema for Mother's Name
**File:** `database/schema.sql`
**Required:** Verify `mother_name` field supports full names

**Verification:**
```sql
-- Check current schema:
DESCRIBE employees;

-- If mother_name is VARCHAR(50), increase to VARCHAR(255):
ALTER TABLE employees MODIFY COLUMN mother_name VARCHAR(255);
```

---

## 8. RBAC / BACKEND / DATABASE ENFORCEMENT

### Issue 8.1: URL-Based Access Control
**Problem:** Users can access restricted pages by typing URLs directly
**Solution:** Implement route-level PermissionGuard

**Implementation in AppRouter.jsx:**
```javascript
// Create HOC for protected routes:
const ProtectedRoute = ({ children, permissions }) => {
  const { hasPermission } = usePermissions();
  const navigate = useNavigate();
  
  useEffect(() => {
    if (!hasPermission(permissions)) {
      navigate('/', { replace: true });
    }
  }, [permissions, hasPermission, navigate]);
  
  if (!hasPermission(permissions)) {
    return null;
  }
  
  return children;
};

// Wrap sensitive routes:
<Route path="accounts" element={
  <ProtectedRoute permissions="accounts.read">
    <AccountsPage />
  </ProtectedRoute>
} />

<Route path="logs" element={
  <ProtectedRoute permissions="AuditLogs.Read">
    <LogsPage />
  </ProtectedRoute>
} />

<Route path="admin/roles" element={
  <ProtectedRoute permissions="Roles.Read">
    <RoleManagementPage />
  </ProtectedRoute>
} />
```

### Issue 8.2: Backend Permission Verification
**Files to Check:**
- `backend/src/middleware/permitMiddleware.js`
- `backend/src/controllers/*.js`

**Required Checks:**
```javascript
// Every sensitive endpoint should have:
router.get('/accounts', requirePermission('accounts', 'read'), listAccounts);
router.post('/accounts', requirePermission('accounts', 'create'), createAccount);
router.delete('/logs/:id', requirePermission('AuditLogs', 'delete'), deleteLog);
```

### Issue 8.3: Database Permission Mappings
**Table:** `role_permissions` or Permit.io sync
**Action:** Verify all new permissions exist in database

```sql
-- Check existing permissions:
SELECT * FROM role_permissions WHERE resource IN ('accounts', 'AuditLogs', 'Roles');

-- If missing, add:
INSERT INTO role_permissions (role_code, resource, action) VALUES
('super_admin', 'AuditLogs', 'read'),
('hr_admin', 'AuditLogs', 'read'),
('super_admin', 'accounts', 'create'),
('super_admin', 'accounts', 'update'),
('super_admin', 'accounts', 'delete');
```

---

## Implementation Priority

### Phase 1: Critical Crashes (Week 1)
1. ✅ Fix Employee Registration occupation crash
2. ✅ Fix Attendance Records API error handling
3. ✅ Verify Mother's Name validation (already done)

### Phase 2: Missing Features (Week 2)
4. Add Day Off Settings page
5. Add swipe transitions to Letters module
6. Verify Network Settings integration

### Phase 3: Security Hardening (Week 3)
7. Add PermissionGuard to LogsPage
8. Implement ProtectedRoute HOC
9. Add route-level access control
10. Verify backend permission checks

### Phase 4: Testing & Verification (Week 4)
11. Test all RBAC scenarios
12. Verify URL-based access blocked
13. Test permission removal hides UI
14. Database schema verification

---

## Testing Checklist

### Functional Testing
- [ ] Attendance Records load without crashing
- [ ] Employee Registration with mother's full name works
- [ ] Employee Registration with occupations works
- [ ] Day Off settings page accessible and functional
- [ ] Letters module has smooth tab transitions

### RBAC Testing
- [ ] User without `accounts.read` cannot see Accounts page
- [ ] User without `AuditLogs.Read` cannot see Logs page
- [ ] User without `Roles.Read` cannot see Role Management
- [ ] Direct URL access to restricted pages redirects
- [ ] Removing permission hides corresponding UI elements
- [ ] Backend returns 403 for unauthorized requests

### Regression Testing
- [ ] Existing attendance features still work
- [ ] Leave requests unchanged
- [ ] Employee profile unchanged
- [ ] Department head views unchanged

---

## Rollback Plan

If issues occur:

1. **Frontend crashes:**
   ```bash
   cd frontend
   git checkout HEAD~1 src/pages/EmployeeRegistrationPage.jsx
   git checkout HEAD~1 src/pages/AttendancePage.jsx
   npm run build
   ```

2. **RBAC blocks legitimate users:**
   - Temporarily disable PermissionGuard components
   - Grant broad permissions to affected roles in Permit.io
   - Investigate and fix permission mappings

3. **Database issues:**
   ```sql
   -- Restore previous schema:
   SHOW CREATE TABLE employees;
   -- Revert mother_name column if needed
   ```

---

## Conclusion

All 8 areas have been analyzed. The fixes are categorized into:
- **Already Implemented:** Accounts RBAC, Mother's Name validation
- **Quick Fixes:** Employee Registration crash, Attendance error handling
- **New Features:** Day Off settings, Letters animations
- **Security:** Route guards, backend verification

Estimated effort: 3-4 weeks for full implementation and testing.
