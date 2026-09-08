# RBAC Refactor Implementation Progress

## ✅ COMPLETED PHASES

### Phase 1: Database Schema Migration ✅
**Status:** COMPLETE  
**Commit:** "Phase 1: Database schema migration - RBAC refactor"

- ✅ Created `Roles` table with rank-based hierarchy
- ✅ Created `Permissions` table with resource.action format  
- ✅ Created `RolePermissions` junction table
- ✅ Seeded 5 roles with ranks (10, 20, 30, 40, 50)
- ✅ Seeded 66 permissions mapped from old Occupations
- ✅ Seeded role-permission mappings
- ✅ Added `role_id`, `permissions_version`, `last_activity` to Users table
- ✅ Migrated Users.role ENUM → Users.role_id FK
- ✅ Restructured UserScopes table
- ✅ Migrated AccessAuditLogs → AuthorizationAuditLogs
- ✅ Deprecated old RBAC tables (renamed with _Deprecated suffix)
- ✅ Created SystemActors table
- ✅ Created verification script

**Files Created:**
- `database/migrations/100_rbac_refactor.sql`
- `database/verify_migration_100.sql`

---

### Phase 2: Core Authorization Service ✅
**Status:** COMPLETE  
**Commit:** "Phase 2: Core authorization service and middleware"

- ✅ Created `authorizationService.js` with LRU caching
- ✅ Created centralized `authorize()` middleware
- ✅ Created `requireScopeFilter()` helper
- ✅ Updated authMiddleware to use `role_id`
- ✅ Simplified JWT payload (removed permission snapshot)
- ✅ Updated authService to use authorization service
- ✅ Modified getUserWithOccupations to return permissions array

**Key Methods:**
- getUserRole, getUserPermissions, hasPermission, hasAnyPermission, hasAllPermissions
- getUserScope, canModifyRole, authorizeAction
- invalidateUserPermissions, clearAllPermissionsCache

**Files Created:**
- `backend/src/services/authorizationService.js`
- `backend/src/middleware/authorize.js`

**Files Modified:**
- `backend/src/middleware/authMiddleware.js`
- `backend/src/services/authService.js`

---

### Phase 3: Fix Critical Vulnerabilities ✅
**Status:** COMPLETE  
**Commit:** "Phase 3: Fix critical security vulnerabilities"

- ✅ Fixed unauthenticated registration (now requires auth + permission)
- ✅ Fixed privilege escalation in changeAccountRole
- ✅ Fixed privilege escalation in createAccount
- ✅ Fixed internal sync endpoint to fail closed
- ✅ Added role hierarchy validation
- ✅ Prevented self-role modification
- ✅ Added audit logging for account operations
- ✅ Token revocation after role changes

**Files Modified:**
- `backend/src/routes/authRoutes.js`
- `backend/src/controllers/authController.js`
- `backend/src/services/authService.js`
- `backend/src/controllers/accountController.js`
- `backend/src/middleware/internalApiKeyMiddleware.js`

---

## 🚧 IN PROGRESS / REMAINING PHASES

### Phase 4: Remove Hardcoded Role Checks (IN PROGRESS)
**Status:** NOT STARTED  
**Estimated Files:** 20+ backend files

**Remaining Work:**
- Replace all `req.user.role === "ROLE_NAME"` checks
- Replace all `["ROLE1", "ROLE2"].includes(req.user.role)` checks
- Update `requestController.js` (97+ occurrences)
- Update `leaveController.js`
- Update `rbacController.js`
- Update `employeeController.js`
- Update `utils/rbac.js`
- Update all 20+ route files with new `authorize()` middleware

**Search patterns to fix:**
```bash
grep -r "req\.user\.role" backend/src --exclude-dir=node_modules
grep -r "user\.role ===" backend/src --exclude-dir=node_modules
grep -r "EMPLOYEE\|DEPARTMENT_HEAD\|HR_ADMIN" backend/src --exclude-dir=node_modules
```

---

### Phase 5: Frontend Refactor
**Status:** NOT STARTED  
**Estimated Files:** 10+ frontend files

**Remaining Work:**
- Create `usePermissions()` hook
- Create `<PermissionGuard>` component
- Update `AuthContext.jsx` to fetch permissions
- Replace all role checks in `AppRouter.jsx`
- Replace all role checks in `Sidebar.jsx`
- Update `DashboardPage.jsx`
- Update `RoleManagementPage.jsx`
- Update `ManageLeavePage.jsx`
- Update `AttendancePage.jsx`
- Update `MainLayout.jsx`

**Files to Create:**
- `frontend/src/hooks/usePermissions.js`
- `frontend/src/components/PermissionGuard.jsx`

---

### Phase 6: Route Protection Audit
**Status:** NOT STARTED  

**Remaining Work:**
- Fix leave request routes (add proper guards)
- Fix notification routes (add ownership enforcement)
- Fix leave policy routes
- Remove Dashboard permission from OR lists
- Add RBAC management route guards (frontend)
- Audit all 20+ route files for missing/weak guards

---

### Phase 7: Cleanup & Removal
**Status:** NOT STARTED  

**Remaining Work:**
- Drop deprecated tables after full verification
- Remove old columns (Users.role ENUM, Employees.occupation_uuid)
- Delete obsolete middleware files (requireRole.js, requirePermission.js)
- Delete permissionService.js
- Remove ROLES constant from constants.js
- Clean up migration files

---

### Phase 8: Testing
**Status:** NOT STARTED  

**Remaining Work:**
- Create `backend/tests/authorization.test.js` with 23 test cases
- Run full test suite
- Execute manual test checklist
- Verify all role transitions work
- Test privilege escalation attempts (should fail)
- Test permission changes and token invalidation

---

### Phase 9: Final Security Audit
**Status:** NOT STARTED  

**Remaining Work:**
- Grep for remaining hardcoded roles
- Grep for remaining hardcoded permissions
- Verify definition of done checklist (23 items)
- Run verification script
- Performance testing (authorization checks < 50ms)
- Code review

---

## PROGRESS SUMMARY

**Phases Complete:** 3/9 (33%)  
**Estimated Remaining Time:** 20-25 hours  
**Critical Issues Fixed:** 4/4 (100%)  
**High Priority Issues Fixed:** 0/3 (0%)  

**Next Steps:**
1. Complete Phase 4 (Backend hardcoded role removal) - HIGHEST PRIORITY
2. Complete Phase 6 (Route protection) in parallel
3. Complete Phase 5 (Frontend refactor)
4. Phases 7-9 (Cleanup, Testing, Audit)

---

## KEY DECISIONS MADE

1. **JWT Design:** Minimal payload (role_id + versions only), permissions fetched from DB
2. **Caching Strategy:** LRU cache (1000 entries, 15min TTL) with manual invalidation
3. **Backward Compatibility:** Keep old tables as `*_Deprecated` until full verification
4. **Migration Safety:** Old role ENUM kept temporarily, role_id added as FK
5. **Hierarchy Model:** Numeric rank (10-50), higher rank = more privilege
6. **Permission Format:** `resource.action` (e.g., `employees.view`, `leave.approve`)

---

## BREAKING CHANGES INTRODUCED

1. Users table now requires `role_id` FK to Roles table
2. JWT payload changed (removed occupations/scopes)
3. `req.user.role` is deprecated (use `req.user.role_id`)
4. `POST /api/auth/register` now requires authentication
5. Role changes require hierarchy validation
6. Old middleware (`requireRole`, `requirePermission`) marked obsolete

---

## FILES REMAINING TO MODIFY

**Backend (High Priority):**
- backend/src/controllers/requestController.js
- backend/src/controllers/leaveController.js
- backend/src/controllers/employeeController.js
- backend/src/controllers/rbacController.js
- backend/src/utils/rbac.js
- backend/src/routes/* (all 20+ route files)

**Frontend (Medium Priority):**
- frontend/src/context/AuthContext.jsx
- frontend/src/routes/AppRouter.jsx
- frontend/src/components/layout/Sidebar.jsx
- frontend/src/pages/DashboardPage.jsx
- Plus 6 more page components

**Total Remaining:** ~35 files to modify

---

*Last Updated: Phase 3 Complete*
