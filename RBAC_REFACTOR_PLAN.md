# RBAC Refactor — Implementation Plan

**Goal:** Replace the complex, broken occupation-based system with a simple, database-driven `User → Role → Permissions → Scope` model.

---

## Phase 1: Database Schema Design & Migration

### 1.1 Create New Tables

**New tables to create:**

```sql
Roles
  - id (PK, auto-increment INT)
  - uuid (VARCHAR(36), unique, indexed)
  - name (VARCHAR(100), unique, NOT NULL) -- e.g., "Employee", "HR Admin"
  - code (VARCHAR(50), unique, NOT NULL) -- e.g., "EMPLOYEE", "HR_ADMIN" 
  - rank (INT, NOT NULL, unique) -- Privilege hierarchy: 10, 20, 30, 40, 50
  - description (TEXT)
  - is_active (BOOLEAN, default TRUE)
  - created_at, updated_at

Permissions
  - id (PK, auto-increment INT)
  - uuid (VARCHAR(36), unique, indexed)
  - resource (VARCHAR(100), NOT NULL) -- e.g., "employees", "leave", "attendance"
  - action (VARCHAR(100), NOT NULL) -- e.g., "view", "create", "update", "approve"
  - code (VARCHAR(200), unique, NOT NULL) -- e.g., "employees.view", "leave.approve"
  - description (TEXT)
  - requires_scope (BOOLEAN, default FALSE) -- Whether this permission uses data scoping
  - is_active (BOOLEAN, default TRUE)
  - created_at

RolePermissions
  - id (PK, auto-increment INT)
  - uuid (VARCHAR(36), unique, indexed)
  - role_id (FK → Roles.id, NOT NULL)
  - permission_id (FK → Permissions.id, NOT NULL)
  - assigned_at
  - assigned_by_uuid (FK → Users.uuid, nullable)
  - UNIQUE (role_id, permission_id)

UserScopes (keep but simplify)
  - id (PK, auto-increment INT)
  - uuid (VARCHAR(36), unique)
  - user_uuid (FK → Users.uuid, NOT NULL)
  - scope_type (ENUM: 'SELF', 'DEPARTMENT', 'BRANCH', 'COMPANY', 'ALL')
  - scope_value (VARCHAR(36), nullable) -- department_uuid, branch_uuid, etc.
  - assigned_at
  - assigned_by_uuid

AuthorizationAuditLogs (rename AccessAuditLogs)
  - uuid (PK)
  - actor_user_uuid
  - target_user_uuid
  - action_type (ENUM)
  - resource_type
  - resource_uuid
  - old_value (JSON)
  - new_value (JSON)
  - reason (TEXT)
  - ip_address
  - user_agent
  - created_at
```

**Changes to existing tables:**

```sql
Users
  - ADD COLUMN role_id (INT, FK → Roles.id, nullable initially for migration)
  - KEEP role ENUM temporarily for migration
  - ADD COLUMN permissions_version (INT, default 1)
  - ADD COLUMN last_activity (DATETIME, nullable)
```

### 1.2 Migration Strategy

**Migration file:** `database/migrations/100_rbac_refactor.sql`

**Steps:**

1. Create `Roles` table
2. Seed initial roles with ranks:
   - Employee (rank 10)
   - Department Head (rank 20)
   - HR Officer (rank 30)
   - HR Admin (rank 40)
   - Super Admin (rank 50)

3. Create `Permissions` table
4. Map existing `Occupations` to new `Permissions`:
   ```
   Dashboard → dashboard.view
   My Account → account.view_own
   Leave - My Leave → leave.view_own, leave.create_own
   Leave - Manage Requests → leave.approve, leave.view_department
   Leave - Overview → leave.view_all
   Leave Policies → leave_policies.manage
   Employees - Overview → employees.view
   Employees - Registration → employees.create
   Departments - Overview → departments.view
   Positions - Overview → positions.view
   Attendance - Overview → attendance.view
   Attendance - Manage → attendance.manage
   Shifts - Overview → shifts.view
   Shifts - Add → shifts.create
   Letters → letters.manage
   Accounts → accounts.manage
   Network Settings → network_settings.manage
   Audit Logs → audit.view
   ```

5. Create `RolePermissions` table
6. Migrate `RoleOccupations` → `RolePermissions`
7. Add `role_id` column to `Users`
8. Populate `Users.role_id` based on `Users.role` ENUM
9. Migrate `EmployeeOccupations` → direct `RolePermissions` assignments (or drop if not needed)
10. Create simplified `UserScopes` table
11. Rename `AccessAuditLogs` → `AuthorizationAuditLogs`

**Rollback plan:** Keep old tables (Occupations, RoleOccupations, EmployeeOccupations) until full verification passes.

---

## Phase 2: Backend Authorization Layer

### 2.1 Core Authorization Service

**New file:** `backend/src/services/authorizationService.js`

```js
class AuthorizationService {
  // Core methods
  async getUserRole(userId)
  async getUserPermissions(userId) // Returns array of permission codes
  async getUserScope(userId)
  async hasPermission(userId, permissionCode)
  async hasAnyPermission(userId, permissionCodes)
  async hasAllPermissions(userId, permissionCodes)
  async canModifyRole(actorRoleId, targetRoleId)
  
  // Permission checking with scope
  async authorizeAction(userId, permissionCode, resourceOwnerId?)
  
  // Cache management
  async invalidateUserPermissions(userId)
}
```

**Caching:** Use in-memory cache (LRU, max 1000 entries, 15-minute TTL) for permissions. Invalidate on permission changes.

### 2.2 Centralized Middleware

**Replace:**
- `requireRole.js` ❌
- `requirePermission.js` ❌
- `requireScope.js` ❌

**With:**
- `backend/src/middleware/authorize.js` ✅

```js
/**
 * Database-driven authorization middleware
 * 
 * @param {Object} options
 * @param {string|string[]} options.permissions - Required permission code(s)
 * @param {string} options.logic - 'AND' or 'OR' (default 'OR')
 * @param {boolean} options.allowSelfAccess - Allow if accessing own resource
 * @param {Function} options.getResourceOwnerId - Extract owner ID from request
 */
function authorize(options = {})
```

Example usage:
```js
router.get('/employees', 
  authenticateJwt,
  authorize({ permissions: 'employees.view' }),
  employeeController.list
);

router.get('/employees/:uuid',
  authenticateJwt,
  authorize({ 
    permissions: 'employees.view',
    allowSelfAccess: true,
    getResourceOwnerId: (req) => req.params.uuid
  }),
  employeeController.getOne
);
```

### 2.3 Modified Auth Middleware

**File:** `backend/src/middleware/authMiddleware.js`

**Changes:**
- Remove `occupations` and `scopes` from JWT payload
- Add `role_id` to JWT payload (keep minimal)
- Keep `token_version` and `permissions_version`
- Populate `req.user` with:
  ```js
  {
    uuid,
    employee_uuid,
    department_uuid,
    username,
    email,
    role_id, // Database ID, not name
    full_name,
    profile_photo_url
  }
  ```

### 2.4 Modified Auth Service

**File:** `backend/src/services/authService.js`

**Changes:**
- `createAccessToken()`: Include only `role_id`, `token_version`, `permissions_version`
- `createRefreshToken()`: Same minimal payload
- `register()`: Protected route, validate role hierarchy
- `login()`: Return user with permissions via authorization service
- `getUserWithPermissions()`: New method that returns user + permissions array

---

## Phase 3: Fix Critical Vulnerabilities

### 3.1 Fix Unauthenticated Registration

**File:** `backend/src/routes/authRoutes.js`

```js
router.post("/register", 
  authRateLimiter,
  authenticateJwt, // ADD
  authorize({ permissions: 'accounts.create' }), // ADD
  validateRequest({ required: ["username", "password", "first_name", "last_name"] }),
  register
);
```

**File:** `backend/src/services/authService.js` — `register()` function

```js
async function register(registrationData, actorRoleId) {
  const { role_id, ... } = registrationData;
  
  // Validate role hierarchy
  const canAssign = await authorizationService.canModifyRole(actorRoleId, role_id);
  if (!canAssign) {
    throw new Error("Cannot assign a role equal to or higher than your own");
  }
  
  // ... rest of registration
}
```

### 3.2 Fix changeAccountRole

**File:** `backend/src/controllers/accountController.js`

```js
exports.changeAccountRole = async (req, res) => {
  const { uuid } = req.params;
  const { role_id } = req.body; // Change from role string to role_id
  
  // Prevent self-modification
  if (uuid === req.user.uuid) {
    return sendError(res, { status: 403, message: "Cannot modify your own role" });
  }
  
  // Load target user's current role
  const targetUser = await findUserByUuid(uuid);
  
  // Validate hierarchy using authorization service
  const canModify = await authorizationService.canModifyRole(
    req.user.role_id,
    targetUser.role_id
  );
  
  const canAssign = await authorizationService.canModifyRole(
    req.user.role_id,
    role_id
  );
  
  if (!canModify || !canAssign) {
    return sendError(res, { 
      status: 403, 
      message: "Insufficient privileges to modify this user's role" 
    });
  }
  
  // Update role
  await pool.execute("UPDATE Users SET role_id = ? WHERE uuid = ?", [role_id, uuid]);
  
  // Audit log
  await auditService.log({
    action: AUDIT_ACTIONS.ACCOUNT_ROLE_CHANGED,
    actor_uuid: req.user.uuid,
    target_uuid: uuid,
    old_value: targetUser.role_id,
    new_value: role_id
  });
  
  // Revoke tokens
  await revokeAllUserTokens(uuid);
  
  return sendSuccess(res, { message: "Role changed successfully" });
};
```

### 3.3 Fix Internal Sync Endpoint

**File:** `backend/src/middleware/internalApiKeyMiddleware.js`

```js
function internalApiKeyMiddleware(req, res, next) {
  const expectedApiKey = process.env.INTERNAL_SYNC_API_KEY;
  
  // FAIL CLOSED: Deny if key is not configured
  if (!expectedApiKey) {
    console.error('[SECURITY] INTERNAL_SYNC_API_KEY is not configured - denying request');
    return sendError(res, {
      status: 503,
      message: "Service misconfigured.",
      error: "SERVICE_UNAVAILABLE",
    });
  }

  const providedApiKey = String(req.headers["x-internal-api-key"] || "");
  if (providedApiKey !== expectedApiKey) {
    return sendError(res, {
      status: 401,
      message: "Unauthorized request.",
      error: "UNAUTHORIZED",
    });
  }

  return next();
}
```

**Startup validation:** `backend/src/config/env.js`

```js
function validateCriticalConfig() {
  if (!process.env.INTERNAL_SYNC_API_KEY) {
    console.warn('[WARNING] INTERNAL_SYNC_API_KEY is not set - sync endpoint will be unavailable');
  }
  // ... other validations
}
```

---

## Phase 4: Remove Hardcoded Role Checks

### 4.1 Backend Files to Refactor

**Controllers:**
- `backend/src/controllers/requestController.js` — Replace 97+ role checks
- `backend/src/controllers/leaveController.js` — Replace role array checks
- `backend/src/controllers/rbacController.js` — Replace SUPER_ADMIN/HR_ADMIN checks
- `backend/src/controllers/employeeController.js` — Replace `role === "DEPARTMENT_HEAD"`
- `backend/src/controllers/accountController.js` — Already covered in 3.2

**Services:**
- `backend/src/utils/rbac.js` — Replace all `isHrOfficer()`, `isHrAdmin()`, role comparisons

**Middleware:**
- `backend/src/middleware/requireRole.js` — DELETE
- `backend/src/middleware/requirePermission.js` — DELETE
- `backend/src/middleware/requireScope.js` — REFACTOR to use authorization service

**Routes:** Audit all 20+ route files, replace guards with `authorize()` middleware

### 4.2 Specific Patterns to Replace

**Pattern 1: Inline role array checks**
```js
// BEFORE
if (!["HR_OFFICER", "HR_ADMIN", "SUPER_ADMIN"].includes(req.user.role)) {
  return sendError(...);
}

// AFTER
// Use authorize middleware at route level
router.get('/path', authorize({ permissions: 'resource.action' }), handler);
```

**Pattern 2: Department Head logic**
```js
// BEFORE
if (user.role === "DEPARTMENT_HEAD") {
  departmentUuid = req.user.department_uuid;
}

// AFTER
const scope = await authorizationService.getUserScope(req.user.uuid);
if (scope.type === 'DEPARTMENT') {
  departmentUuid = scope.value;
}
```

**Pattern 3: SUPER_ADMIN bypass**
```js
// BEFORE
if (req.user.role === "SUPER_ADMIN") {
  return next();
}

// AFTER
// Authorization service handles this via role rank automatically
// No explicit checks needed
```

---

## Phase 5: Frontend Refactor

### 5.1 Create Permission Hook

**New file:** `frontend/src/hooks/usePermissions.js`

```js
export function usePermissions() {
  const { user } = useAuth();
  const [permissions, setPermissions] = useState([]);
  const [loading, setLoading] = useState(true);
  
  useEffect(() => {
    if (user?.uuid) {
      fetchUserPermissions(user.uuid).then(setPermissions);
    }
  }, [user?.uuid]);
  
  const hasPermission = useCallback((permissionCode) => {
    return permissions.includes(permissionCode);
  }, [permissions]);
  
  const hasAnyPermission = useCallback((permissionCodes) => {
    return permissionCodes.some(code => permissions.includes(code));
  }, [permissions]);
  
  const hasAllPermissions = useCallback((permissionCodes) => {
    return permissionCodes.every(code => permissions.includes(code));
  }, [permissions]);
  
  return { permissions, hasPermission, hasAnyPermission, hasAllPermissions, loading };
}
```

### 5.2 Create Permission Guard Component

**New file:** `frontend/src/components/PermissionGuard.jsx`

```jsx
export function PermissionGuard({ permissions, requireAll = false, fallback = null, children }) {
  const { hasPermission, hasAnyPermission, hasAllPermissions, loading } = usePermissions();
  
  if (loading) return null;
  
  const permissionArray = Array.isArray(permissions) ? permissions : [permissions];
  const hasAccess = requireAll 
    ? hasAllPermissions(permissionArray)
    : hasAnyPermission(permissionArray);
  
  return hasAccess ? children : fallback;
}
```

### 5.3 Refactor Frontend Files

**Files to modify:**
- `frontend/src/routes/AppRouter.jsx` — Replace all `user?.role` checks
- `frontend/src/components/layout/Sidebar.jsx` — Replace role-based nav rendering
- `frontend/src/pages/DashboardPage.jsx` — Replace role routing
- `frontend/src/pages/rbac/RoleManagementPage.jsx` — Replace `isSuperAdmin` check
- `frontend/src/pages/MyAccountPage.jsx` — Keep display only (non-auth)
- `frontend/src/pages/leave/ManageLeavePage.jsx` — Replace role checks
- `frontend/src/pages/AttendancePage.jsx` — Replace `isEmployee` check
- `frontend/src/components/MainLayout.jsx` — Replace `isAdmin` check
- `frontend/src/components/layout/Topbar.jsx` — Keep display only (non-auth)

**Example refactor:**

```jsx
// BEFORE (AppRouter.jsx)
const AttendanceRouter = () => {
  const { user } = useAuth();
  const role = user?.role;
  
  if (role === 'EMPLOYEE') return <EmployeeAttendancePage />;
  if (role === 'DEPARTMENT_HEAD') return <DeptHeadAttendancePage />;
  return <AttendanceOverviewPage />;
};

// AFTER
const AttendanceRouter = () => {
  const { hasPermission } = usePermissions();
  
  if (hasPermission('attendance.manage')) return <AttendanceOverviewPage />;
  if (hasPermission('attendance.view_department')) return <DeptHeadAttendancePage />;
  return <EmployeeAttendancePage />;
};
```

```jsx
// BEFORE (Sidebar.jsx)
const isEmployee = user?.role === "EMPLOYEE";
const isDeptHead = user?.role === "DEPARTMENT_HEAD";

// AFTER
const { hasPermission } = usePermissions();
const canManageEmployees = hasPermission('employees.create');
const canManageAttendance = hasPermission('attendance.manage');
```

### 5.4 AuthContext Changes

**File:** `frontend/src/context/AuthContext.jsx`

**Changes:**
- Remove `occupations` from user state
- Add `permissions` to user state
- Fetch permissions after login via `GET /api/auth/me/permissions`
- Expose `permissions` array in context
- Keep role name for display purposes only (non-auth)

---

## Phase 6: Route Protection Audit

### 6.1 Files Requiring Guards

**Add/fix authorization middleware:**

```js
// Leave request routes
POST   /api/requests              → authorize({ permissions: 'leave.create_own' })
PATCH  /api/requests/:uuid        → authorize({ permissions: 'leave.update_own', allowSelfAccess: true })
PATCH  /api/requests/:uuid/cancel → authorize({ permissions: 'leave.cancel_own', allowSelfAccess: true })
POST   /api/requests/:uuid/documents → authorize({ permissions: 'leave.update_own', allowSelfAccess: true })

// Notification routes
GET    /api/notifications         → (controller enforces user_uuid filter)
PATCH  /api/notifications/read-all → (controller enforces user_uuid filter)
DELETE /api/notifications/history → authorize({ permissions: 'notifications.manage_all' }) OR self-only

// Leave policy routes
GET    /api/admin/policies        → authorize({ permissions: 'leave_policies.view' })
GET    /api/admin/policies/:type  → authorize({ permissions: 'leave_policies.view' })

// RBAC management routes (frontend)
/rbac/permissions → <PermissionGuard permissions="rbac.manage" />
/rbac/roles       → <PermissionGuard permissions="rbac.manage" />

// Face recognition routes
POST   /api/face-recognition/attendance → authorize({ permissions: 'attendance.punch', allowSelfAccess: true })
```

### 6.2 Remove Dashboard Permission Bug

**File:** `backend/src/routes/requestRoutes.js`

```js
// BEFORE
const canViewPendingRequests = requirePermission({ 
  occupations: ['Leave - Manage Requests', 'Dashboard'],
  logic: 'OR'
});

// AFTER
router.get("/pending",
  authenticateJwt,
  authorize({ permissions: 'leave.view_pending' }),
  requireScopeFilter('leave'),
  getPendingRequests
);
```

---

## Phase 7: Cleanup & Removal

### 7.1 Remove Obsolete Tables (After Full Verification)

```sql
-- Drop old RBAC tables
DROP TABLE IF EXISTS OccupationDelegations;
DROP TABLE IF EXISTS UserPermissionOverrides;
DROP TABLE IF EXISTS EmployeeOccupations;
DROP TABLE IF EXISTS RoleOccupations;
DROP TABLE IF EXISTS Occupations;

-- Remove old columns
ALTER TABLE Users DROP COLUMN role; -- Keep role_id only
ALTER TABLE Employees DROP COLUMN occupation_uuid;
```

### 7.2 Remove Obsolete Code

**Delete files:**
- `backend/src/middleware/requireRole.js`
- `backend/src/middleware/requirePermission.js`
- `backend/src/services/permissionService.js` (old occupation-based)
- `backend/src/utils/rbac.js` (if fully replaced)
- All occupation-related migration files after data is migrated

**Remove from constants:**
- `backend/src/config/constants.js` — Remove `ROLES` array (use database)

---

## Phase 8: Testing

### 8.1 Automated Tests

**Create:** `backend/tests/authorization.test.js`

**Test cases:**
1. Unauthenticated user cannot create admin account
2. Employee cannot create HR Admin account
3. HR Admin cannot create Super Admin account
4. User cannot promote themselves
5. Lower-rank role cannot modify higher-rank user
6. Permission granted via role works
7. Missing permission returns 403
8. Scope filtering works correctly (SELF, DEPARTMENT, ALL)
9. Employee can manage own leave
10. Employee cannot approve arbitrary leave
11. Authorized manager can approve department leave
12. Notification ownership enforced
13. Internal sync fails closed when API key missing
14. Role change is audited
15. Account creation is audited
16. Token invalidation on permission change
17. Frontend permission check matches backend

### 8.2 Manual Testing Checklist

- [ ] Login with each role type
- [ ] Verify UI shows correct navigation
- [ ] Verify API endpoints enforce permissions
- [ ] Attempt privilege escalation (should fail)
- [ ] Change user permission, verify token invalidation
- [ ] Verify audit logs captured
- [ ] Test leave request workflow end-to-end
- [ ] Test attendance punch (Wi-Fi check still works)
- [ ] Test letter generation
- [ ] Test employee registration
- [ ] Test RBAC management UI (admin only)
- [ ] Verify frontend permission guards work
- [ ] Test with network disconnected (API key should fail)

---

## Phase 9: Security Audit (Post-Refactor)

### 9.1 Search for Remaining Issues

**Grep patterns:**
```bash
# Backend
grep -r "user\.role" backend/src
grep -r "req\.user\.role" backend/src
grep -r "EMPLOYEE\|DEPARTMENT_HEAD\|HR_ADMIN" backend/src
grep -r "requireRole\|requirePermission" backend/src

# Frontend
grep -r "user\.role\|user\?\.role" frontend/src
grep -r "EMPLOYEE\|HR_ADMIN" frontend/src
```

**Manual inspection:**
- All route files
- All controllers
- All middleware
- All services
- Frontend routing
- Frontend components with conditional rendering

### 9.2 Verify Definition of Done

```
✓ Roles exist in database (Roles table)
✓ Permissions exist in database (Permissions table)
✓ Users reference database roles (Users.role_id FK)
✓ Role-permission relationships are database-driven (RolePermissions table)
✓ Scopes are database-driven (UserScopes table)
✓ No hardcoded role authorization exists (grepped and replaced)
✓ No hardcoded role hierarchy exists (rank-based in DB)
✓ No duplicate authorization systems exist (old tables dropped)
✓ No occupation-based authorization remains (removed)
✓ Delegation/override system no longer interferes (removed)
✓ JWT does not contain stale permission snapshots (only role_id in JWT)
✓ Registration is protected (authenticateJwt + authorize)
✓ Account privilege escalation impossible (rank check)
✓ Internal sync fails closed (updated middleware)
✓ Leave authorization centralized (authorize middleware)
✓ Notification ownership enforced (controller + middleware)
✓ Frontend uses permissions (usePermissions hook)
✓ Backend is final authority (all checks server-side)
✓ Sensitive actions audited (ACCOUNT_ROLE_CHANGED, etc.)
✓ Database migrations preserve data (migration 100)
✓ Automated tests pass (authorization.test.js)
✓ Full build succeeds
✓ Existing HRMS functionality works (manual test)
```

---

## Implementation Order

1. **Phase 1** — Database migration (100_rbac_refactor.sql)
2. **Phase 2** — Core authorization service + middleware
3. **Phase 3** — Fix critical vulnerabilities (registration, role change, sync)
4. **Phase 4** — Remove hardcoded checks (backend)
5. **Phase 6** — Route protection audit
6. **Phase 5** — Frontend refactor (parallel with Phase 4)
7. **Phase 8** — Testing
8. **Phase 7** — Cleanup (after verification passes)
9. **Phase 9** — Final security audit

---

## Files to Create

**New files:**
- `database/migrations/100_rbac_refactor.sql`
- `database/seed_roles.sql`
- `database/seed_permissions.sql`
- `database/seed_role_permissions.sql`
- `backend/src/services/authorizationService.js`
- `backend/src/middleware/authorize.js`
- `backend/tests/authorization.test.js`
- `frontend/src/hooks/usePermissions.js`
- `frontend/src/components/PermissionGuard.jsx`

## Files to Modify (Major Changes)

**Backend (20+ files):**
- `backend/src/middleware/authMiddleware.js`
- `backend/src/services/authService.js`
- `backend/src/controllers/accountController.js`
- `backend/src/controllers/requestController.js`
- `backend/src/controllers/leaveController.js`
- `backend/src/controllers/employeeController.js`
- `backend/src/controllers/rbacController.js`
- `backend/src/routes/authRoutes.js`
- `backend/src/routes/accountRoutes.js`
- `backend/src/routes/requestRoutes.js`
- `backend/src/routes/notificationRoutes.js`
- `backend/src/routes/rbacRoutes.js`
- All other route files (20+ files)
- `backend/src/middleware/internalApiKeyMiddleware.js`
- `backend/src/middleware/requireScope.js`
- `backend/src/utils/rbac.js`
- `backend/src/config/constants.js`

**Frontend (10+ files):**
- `frontend/src/context/AuthContext.jsx`
- `frontend/src/routes/AppRouter.jsx`
- `frontend/src/components/layout/Sidebar.jsx`
- `frontend/src/pages/DashboardPage.jsx`
- `frontend/src/pages/rbac/RoleManagementPage.jsx`
- `frontend/src/pages/leave/ManageLeavePage.jsx`
- `frontend/src/pages/AttendancePage.jsx`
- `frontend/src/components/MainLayout.jsx`

## Files to Delete (After Verification)

- `backend/src/middleware/requireRole.js`
- `backend/src/middleware/requirePermission.js`
- `backend/src/services/permissionService.js`
- Occupation-related migrations (if data fully migrated)

---

## Estimated Effort

- Database design & migration: **2-3 hours**
- Core authorization service: **3-4 hours**
- Critical vulnerability fixes: **2 hours**
- Backend hardcoded role removal: **6-8 hours**
- Route protection audit: **3-4 hours**
- Frontend refactor: **4-6 hours**
- Testing: **4-5 hours**
- Cleanup & final audit: **2-3 hours**

**Total: 26-35 hours** (3-5 days of focused work)

---

## Risk Mitigation

1. **Data loss:** Keep old tables until full verification passes
2. **Breaking changes:** Run full test suite after each phase
3. **Performance:** Add caching to authorization service (LRU cache)
4. **Rollback:** Tag commit before each phase for easy rollback
5. **Production safety:** Test in staging environment first
6. **User impact:** Deploy during maintenance window if possible

---

## Success Criteria

The refactor is successful when:

1. All 23 automated tests pass
2. Manual test checklist is 100% complete
3. No hardcoded roles found in security audit grep
4. Build succeeds with zero errors
5. Existing HRMS workflows function correctly
6. Response time for authorization checks < 50ms (with cache)
7. Zero production incidents in first 2 weeks post-deployment
8. Code is simpler and easier to maintain than before

---

*This plan ensures a systematic, safe migration from the broken occupation-based system to a clean, database-driven RBAC model while preserving all existing business functionality.*
