# RBAC & Permission System Audit Report

**Project:** Mesob HRMS  
**Audit Date:** September 8, 2026  
**Scope:** Full role-based access control and permission enforcement — backend, frontend, and database

---

## Table of Contents

1. [System Overview](#1-system-overview)
2. [Critical Vulnerabilities](#2-critical-vulnerabilities)
3. [High Severity Issues](#3-high-severity-issues)
4. [Medium Severity Issues](#4-medium-severity-issues)
5. [Low Severity Issues](#5-low-severity-issues)
6. [Frontend vs. Backend Inconsistencies](#6-frontend-vs-backend-inconsistencies)
7. [Permission Enforcement Flow](#7-permission-enforcement-flow)
8. [Role-Permission Matrix](#8-role-permission-matrix)
9. [Remediation Checklist](#9-remediation-checklist)

---

## 1. System Overview

Mesob HRMS uses a **hybrid permission model** combining:

- **5 fixed system roles:** `EMPLOYEE`, `DEPARTMENT_HEAD`, `HR_OFFICER`, `HR_ADMIN`, `SUPER_ADMIN`
- **Occupations:** Named permission grants (e.g., `Employees - Registration`, `Attendance - Manage`) stored in the `Occupations` table
- **Role-occupation mappings:** Default permissions per role in `RoleOccupations`
- **Direct employee occupations:** Per-user overrides in `EmployeeOccupations` (optionally time-bounded)
- **Delegations:** Peer-to-peer temporary permission grants in `OccupationDelegations`
- **Permission overrides:** Explicit ALLOW/DENY per user in `UserPermissionOverrides`
- **Scopes:** Data visibility boundaries (`SELF`, `DEPARTMENT`, `BRANCH`, `COMPANY`, `ALL`) in `UserScopes`

Permissions are embedded into JWT access tokens at login time. The middleware reads occupations from `req.user.occupations` (JWT payload) — **not from the database** — on every request. Token invalidation (via `permissions_version` and `token_version` columns) forces re-login when permissions change.

---

## 2. Critical Vulnerabilities

### 2.1 — Unauthenticated Account Registration Accepts Any Role Including SUPER_ADMIN

**File:** `backend/src/routes/authRoutes.js` line 15  
**File:** `backend/src/services/authService.js` — `register()` function

```js
// authRoutes.js — no authentication middleware on this route
router.post("/register", authRateLimiter, register);
```

```js
// authService.js — role is accepted from the caller's body with no auth context
const userRole = role || "EMPLOYEE";
if (!["EMPLOYEE", "DEPARTMENT_HEAD", "HR_OFFICER", "HR_ADMIN", "SUPER_ADMIN"].includes(userRole)) {
  throw error;
}
await executeQuery(`INSERT INTO Users ... VALUES (?, ?, ?, ?, ?, 1)`, [... userRole ...]);
```

**Impact:** Any unauthenticated person on the network can POST to `POST /api/auth/register` with `{"role": "SUPER_ADMIN", ...}` and create a privileged account. No existing session or elevated token is required. This completely bypasses all RBAC.

**Fix:** Add `authenticateJwt` + `requireRole(['HR_ADMIN', 'SUPER_ADMIN'])` to the register route. The role field in the body should be validated against the caller's own privilege level (e.g., only SUPER_ADMIN can assign SUPER_ADMIN; HR_ADMIN cannot assign a role higher than their own).

---

### 2.2 — Active Delegations Are Never Applied to JWT Tokens

**File:** `backend/src/services/permissionService.js` — `calculateEffectiveOccupations()`

The file-level comment states the formula is:

> `EffectiveOccupations = (RoleOccupations ∪ DirectOccupations ∪ ActiveDelegations ∪ ALLOWOverrides) − DENYOverrides`

However, the actual implementation is:

```js
async function calculateEffectiveOccupations(userUuid, role, employeeUuid = null) {
  const roleOccupations = await getRoleOccupations(role);
  const directOccupations = employeeUuid ? await getEmployeeOccupations(employeeUuid) : [];

  // ← getActiveDelegations() is never called here
  // ← getPermissionOverrides() is never called here

  const allAllowed = [...roleOccupations, ...directOccupations];
  return [...new Set(allAllowed)];
}
```

`getActiveDelegations()` and `getPermissionOverrides()` are both implemented correctly in the same file but are simply never called from `calculateEffectiveOccupations`. As a result, delegations created via `rbacController.createDelegation()` are stored in the database but never reflected in any user's token. **The entire delegation feature is silently broken.**

**Fix:** Call `getActiveDelegations(userUuid)` and `getPermissionOverrides(userUuid)` inside `calculateEffectiveOccupations` and merge them into the result per the documented formula.

---

### 2.3 — DENY Permission Overrides Have No Effect

**File:** `backend/src/services/permissionService.js` — same function as above

For the same reason described in 2.2, DENY overrides stored in `UserPermissionOverrides` with `effect = 'DENY'` are never subtracted from a user's effective occupations. An administrator who explicitly blocks a user from an occupation via a DENY override will find that user still has the occupation in their JWT and can still access the protected endpoint.

**Fix:** Apply the deny list returned by `getPermissionOverrides(userUuid)` as a filter at the end of `calculateEffectiveOccupations`.

---

### 2.4 — Delegation and Scope/Override API Routes Are Not Registered

**File:** `backend/src/routes/rbacRoutes.js`

The RBAC router (`rbacRoutes.js`) only registers the following route groups:

- `GET /api/rbac/occupations`
- `GET|POST|DELETE /api/rbac/roles/:role/occupations`
- `GET /api/rbac/users`
- `GET|POST|DELETE /api/rbac/users/:user_uuid/occupations`
- `GET /api/rbac/users/:user_uuid/effective-access`

The following controller functions exist in `rbacController.js` but are **never wired to any route**:

| Controller Function | Expected Route | Status |
|---|---|---|
| `createDelegation` | `POST /api/rbac/delegations` | ❌ Not registered |
| `revokeDelegation` | `DELETE /api/rbac/delegations/:uuid` | ❌ Not registered |
| `getDelegations` | `GET /api/rbac/delegations` | ❌ Not registered |
| `assignScope` | `POST /api/rbac/users/:uuid/scopes` | ❌ Not registered |
| `removeScope` | `DELETE /api/rbac/users/:uuid/scopes/:uuid` | ❌ Not registered |
| `getUserScopes` | `GET /api/rbac/users/:uuid/scopes` | ❌ Not registered |
| `createPermissionOverride` | `POST /api/rbac/users/:uuid/overrides` | ❌ Not registered |
| `removePermissionOverride` | `DELETE /api/rbac/users/:uuid/overrides/:uuid` | ❌ Not registered |
| `getAuditLogs` | `GET /api/rbac/audit-logs` | ❌ Not registered |

These features are fully implemented but unreachable via HTTP. The RBAC admin UI cannot create delegations, manage scopes, apply overrides, or view audit logs through the API.

**Fix:** Add the missing route registrations to `rbacRoutes.js` with appropriate `requirePermission` guards.

---

## 3. High Severity Issues

### 3.1 — `changeAccountRole` Allows HR_ADMIN to Create SUPER_ADMIN Accounts

**File:** `backend/src/controllers/accountController.js` — `changeAccountRole()`  
**File:** `backend/src/routes/accountRoutes.js`

The route guard only checks that the caller has the `Accounts` occupation:

```js
router.patch("/:uuid/role", accountAccess, changeAccountRole);
```

Inside the controller, the only validation is that the target role is a valid role name:

```js
if (!VALID_ROLES.includes(role)) { /* reject */ }
// Then immediately:
await pool.execute("UPDATE Users SET role = ? WHERE uuid = ?", [role, uuid]);
```

There is no check that:
1. The caller's own role is higher than the target role being assigned
2. The caller cannot assign a role equal to or higher than their own
3. The caller cannot apply the change to their own UUID

**Impact:** An `HR_ADMIN` (or any user with the `Accounts` occupation) can call `PATCH /api/accounts/<any-uuid>/role` with `{"role": "SUPER_ADMIN"}` and elevate any user including themselves to SUPER_ADMIN.

**Fix:** Add a privilege hierarchy check. The caller's role rank must be strictly greater than the target role being assigned. Also block self-role-modification (`req.params.uuid !== req.user.uuid`).

---

### 3.2 — `createAccount` Also Accepts SUPER_ADMIN Role Without Hierarchy Check

**File:** `backend/src/controllers/accountController.js` — `createAccount()`

The same `VALID_ROLES` list is used for the account creation endpoint (`POST /api/accounts`) without any restriction on what role the caller is allowed to assign. An HR_ADMIN with `Accounts` occupation can create a new SUPER_ADMIN account.

**Fix:** Same privilege hierarchy check as 3.1. The assigned role must be strictly below the caller's own role.

---

### 3.3 — Internal Sync Endpoint Is Open When `INTERNAL_SYNC_API_KEY` Is Unset

**File:** `backend/src/middleware/internalApiKeyMiddleware.js`

```js
function internalApiKeyMiddleware(req, res, next) {
  const expectedApiKey = process.env.INTERNAL_SYNC_API_KEY;
  if (!expectedApiKey) {
    return next(); // ← Passes all requests through if the env var is not configured
  }
  // ...
}
```

`POST /api/sync` is guarded only by this middleware (not `authenticateJwt`). If `INTERNAL_SYNC_API_KEY` is absent from the environment (e.g., a dev deployment or misconfigured production), the sync endpoint accepts requests from anyone without authentication.

**Fix:** Treat a missing `INTERNAL_SYNC_API_KEY` as a configuration error and **deny** the request rather than allowing it. Throw a startup warning or block the request with a 503 if the key is not configured.

---

## 4. Medium Severity Issues

### 4.1 — Several Leave Request Routes Use Only `authenticateJwt` With No Occupation Guard

**File:** `backend/src/routes/requestRoutes.js`

The following endpoints accept any authenticated user regardless of occupation or role:

| Route | Method | Guard |
|---|---|---|
| `POST /api/requests/` | Create leave request | `authenticateJwt` only |
| `PATCH /api/requests/:uuid` | Update request | `authenticateJwt` only |
| `PATCH /api/requests/:uuid/cancel` | Cancel request | `authenticateJwt` only |
| `POST /api/requests/:uuid/documents` | Add documents | `authenticateJwt` only |
| `PUT /api/requests/:uuid/documents/:docUuid` | Replace document | `authenticateJwt` only |
| `DELETE /api/requests/:uuid/documents/:docUuid` | Delete document | `authenticateJwt` only |
| `GET /api/requests/:uuid/documents/:docUuid/content` | Stream document file | `authenticateJwt` only |

Authorization for these endpoints is fully deferred to controller/service logic. While the service layer likely validates ownership, this relies entirely on controller-level checks that are not auditable via middleware inspection alone. A bug in the service layer would silently expose these endpoints.

Additionally, `GET /api/requests/:uuid` uses:
```js
isSelfAccess: (req) => true // Defer to controller
```
This pattern always grants self-access, meaning `requirePermissionOrSelfAccess` effectively becomes a no-op — any authenticated user passes the middleware unconditionally and only the controller can reject them.

**Fix:** Replace `authenticateJwt` with explicit `requirePermission({ occupations: 'Leave - My Leave' })` for employee-facing request endpoints. Replace `isSelfAccess: () => true` with actual ownership resolution, or move the check to the service layer and document it.

---

### 4.2 — Notification Routes Have No Occupation or Role Guard

**File:** `backend/src/routes/notificationRoutes.js`

```js
// Comment says "All routes require authenticateJwt (applied globally in app.js)"
router.get("/",               getNotifications);
router.get("/count",          getUnreadCount);
router.patch("/read-all",     markAllRead);
router.patch("/:uuid/read",   markRead);
router.delete("/history",     clearAllHistory);
router.delete("/history/read",clearReadHistory);
```

No `requirePermission` or `requireRole` is applied to any notification route. If `notificationController.js` does not strictly filter notifications by `req.user.uuid`, any authenticated user can read or clear another user's notifications.

**Fix:** Add user-ownership filtering in the controller (if not already present — verify this). Consider adding `requirePermission({ occupations: 'My Account' })` as a minimum guard to confirm the user has at least base self-service access.

---

### 4.3 — Leave Policy Read Endpoints Are Open to All Authenticated Users

**File:** `backend/src/routes/adminRoutes.js` (policy routes)

`GET /api/admin/policies/` and `GET /api/admin/policies/:leaveType` are protected only by the global `authenticateJwt`. Any authenticated employee can read internal leave policy configurations. Write operations correctly require `Leave Policies` occupation, but the read side has no guard.

**Fix:** Either explicitly allow policy reads for all employees (which may be intentional — employees may need to know their leave entitlements), or add a `requirePermission({ occupations: ['Leave Policies', 'Dashboard'] })` guard on the read endpoints if policy data is considered administrative.

---

### 4.4 — Inline Hardcoded Role Checks in Controllers Bypass the Occupation System

**Files:** `backend/src/controllers/requestController.js`, `backend/src/controllers/leaveController.js`

Multiple controllers contain inline checks like:

```js
// requestController.js
if (!["HR_OFFICER", "HR_ADMIN", "SUPER_ADMIN", "DEPARTMENT_HEAD"].includes(req.user.role)) {
  return sendError(res, { status: 403, ... });
}
```

```js
// leaveController.js
if (!["HR_OFFICER", "HR_ADMIN", "SUPER_ADMIN"].includes(req.user.role)) {
  // block access to leave balances
}
```

These checks are entirely separate from the RBAC occupation system. A user granted the `Leave - Manage Requests` occupation via direct assignment (e.g., a trusted EMPLOYEE) will still be blocked by these inline role checks. The RBAC system and the hardcoded system create two conflicting authorization paths.

**Fix:** Replace inline role checks in controllers with `req.user.occupations` checks, or push them to dedicated middleware using `requirePermission`. Alternatively, document that these controller-level role guards are intentional hard limits that the RBAC system cannot override.

---

### 4.5 — Frontend RBAC Management Pages Lack Route Guards

**File:** `frontend/src/routes/AppRouter.jsx`

The RBAC management routes (`/rbac/permissions`, `/rbac/roles`) are nested inside the `<Protected>` wrapper (which only checks `isAuthenticated`), but have no role or occupation redirect guard. Any authenticated user who navigates directly to `http://app/rbac/permissions` will load the page. The API calls will fail, but the user reaches the admin UI.

**Fix:** Wrap these routes with a role check component (e.g., `<RequireRole roles={['HR_ADMIN', 'SUPER_ADMIN']}>`), redirecting unauthorized users to the dashboard or a 403 page.

---

### 4.6 — `department-decision` Route Allows Any User With `Dashboard` Occupation to Approve Leave

**File:** `backend/src/routes/requestRoutes.js`

```js
router.patch("/:uuid/department-decision",
  requirePermission({
    occupations: ['Leave - Manage Requests', 'Dashboard'],
    logic: 'OR'
  }),
  departmentApproveRejectRequest
);
```

The `Dashboard` occupation is granted to **all roles** including `EMPLOYEE`. This means any authenticated employee (who inherits `Dashboard` by default) passes the middleware check for the department leave decision endpoint. The actual authorization logic in the controller may correctly gate this to DEPARTMENT_HEAD, but this middleware guard is ineffective as written.

**Fix:** Remove `Dashboard` from this OR list. The guard should be `requirePermission({ occupations: 'Leave - Manage Requests' })` only, relying on the controller for additional department-head-specific routing.

---

### 4.7 — `GET /api/requests/pending` Also Allows Any User With `Dashboard` Occupation

**File:** `backend/src/routes/requestRoutes.js`

```js
const canViewPendingRequests = requirePermission({
  occupations: ['Leave - Manage Requests', 'Dashboard'],
  logic: 'OR'
});
router.get("/pending", canViewPendingRequests, requireScope('leave'), getPendingRequests);
```

Same issue as 4.6. Because every role gets `Dashboard` by default, any authenticated user can query the pending leave requests endpoint. The `requireScope('leave')` middleware will limit the data returned (e.g., EMPLOYEE scope = only their own), but the endpoint should not be accessible to basic employees conceptually.

**Fix:** Remove `Dashboard` from `canViewPendingRequests`. Use `Leave - Manage Requests` only, and handle the DEPARTMENT_HEAD case by granting that occupation in the role-occupation seed data (it already is seeded correctly).

---

## 5. Low Severity Issues

### 5.1 — DEPARTMENT_HEAD Powers Are Partially Hardcoded in Controller SQL

**File:** `backend/src/controllers/requestController.js`, `backend/src/controllers/employeeController.js`

Department Head behavior is implemented through direct SQL queries that check `u.role = 'DEPARTMENT_HEAD'` and `req.user.role === 'DEPARTMENT_HEAD'`:

```js
// employeeController.js
if (user?.role === "DEPARTMENT_HEAD") {
  departmentUuid = req.user.department_uuid;
}
```

This wires the DEPARTMENT_HEAD functionality directly to the role string. If an HR_OFFICER is ever given departmental-oversight occupations via RBAC, they cannot behave like a department head because the code path branches on role, not occupation.

**Fix:** Where department-scoped behavior is needed, branch on scope (`req.user.scopes`) or a dedicated `Department - Oversight` occupation rather than the role string. This makes the behavior adjustable via RBAC.

---

### 5.2 — `requireScope` Hardcodes HR_ADMIN to Always Get `ALL` Scope

**File:** `backend/src/middleware/requireScope.js`

```js
// From context-gatherer analysis
if (req.user.role === 'HR_ADMIN' || req.user.role === 'SUPER_ADMIN') {
  req.scopeFilter = { type: 'ALL' };
  return next();
}
```

HR_ADMIN always receives `ALL` data scope regardless of any `UserScopes` entries. If an organization wanted to restrict an HR_ADMIN to a specific branch or department, there is no way to do so — the scope override logic ignores HR_ADMIN's assigned scopes entirely.

**Fix:** Only apply the `ALL` hardcode for SUPER_ADMIN (which is justified by the bypass model). For HR_ADMIN, check their `UserScopes` first and fall back to `ALL` only if no scopes are assigned.

---

### 5.3 — `ProtectedRoles` Table Is Declarative Only — No Application Enforcement

**File:** `database/migrations/008_add_protected_roles.sql`

A `ProtectedRoles` table exists in the database, presumably to mark roles as protected against modification. However, there is no application code that consults this table before modifying role assignments. The `changeAccountRole` controller does not check it. The table exists purely as documentation.

**Fix:** Either remove the table (to avoid misleading future developers) or add enforcement logic in `changeAccountRole` and `assignOccupationToRole` that rejects modifications to roles listed in `ProtectedRoles`.

---

### 5.4 — `POST /api/auth/register` Rate Limiter Is the Only Remaining Guard After Fixing Auth

**File:** `backend/src/routes/authRoutes.js`

Once the authentication fix from issue 2.1 is applied (adding `authenticateJwt`), the route will still use `authRateLimiter` — which is sized for public-facing login attempts. The rate limit should be reviewed to ensure it is appropriate for an authenticated admin operation.

---

### 5.5 — Refresh Token Contains Occupations Baked In, Causing Stale Data on Refresh

**File:** `backend/src/services/authService.js` — `createRefreshToken()`

The refresh token embeds `occupations` and `scopes` in its payload. When the access token is refreshed, the new access token is generated from the **refresh token's embedded occupations** (not freshly fetched from the database), because `createRefreshToken` snapshot's occupations at login time.

If a user's permissions change and their `permissions_version` is incremented (invalidating the access token), they correctly must re-login — BUT if they were in an active session, the refresh token used to get a new access token may re-embed stale occupation data. The `permissions_version` check in `authenticateJwt` would catch the mismatch on the *access* token, but a newly issued access token from a valid refresh token path needs to re-fetch occupations from the database.

**Fix:** In the `refreshToken` handler, after validating the refresh token, call `calculateEffectiveOccupations()` freshly from the DB (as done in `createAccessToken` during login) rather than re-using occupations embedded in the refresh token payload.

---

### 5.6 — Audit Log `AccessAuditLogs` Has No Foreign Key Enforcement on Actor/Target UUIDs

**File:** `database/migrations/003_add_rbac_tables.sql`

```sql
-- Note: No foreign keys on actor/target UUIDs to preserve audit logs even after user deletion
```

This is an explicit design choice (preserving audit history). However, it means that `actor_user_uuid` can contain any arbitrary UUID string with no validation — including values like `'SYSTEM'` (already used in `permissionService.incrementPermissionsVersion`). The mixed format (UUID vs. string sentinel) makes audit log queries brittle.

**Fix:** Use a dedicated sentinel UUID for system actions (e.g., a fixed UUID like `00000000-0000-0000-0000-000000000000` reserved for SYSTEM) rather than the string `'SYSTEM'`. Document this in the migration.

---

### 5.7 — No Audit Logging for `changeAccountRole` and `createAccount`

**File:** `backend/src/controllers/accountController.js`

The `changeAccountRole` function updates the `role` column directly but only calls `revokeAllUserTokens()` — it does not emit an audit log entry. Role changes are among the most sensitive security events and should be tracked in `AccessAuditLogs`.

Similarly, `createAccount` does not log the account creation event to `AccessAuditLogs`.

**Fix:** Add `auditService.auditLog(...)` calls in both functions with action types `ROLE_CHANGED` and `ACCOUNT_CREATED` (or use the existing `ROLE_OCCUPATION_ASSIGNED` type if no dedicated type exists).

---

### 5.8 — `bcrypt` Salt Rounds Are Fixed at 10 With No Configuration

**File:** `backend/src/services/authService.js`

```js
const salt = await bcrypt.genSalt(10);
```

The salt round count is hardcoded at 10. This is acceptable today but is not configurable for environments requiring higher security standards. A constant of 10 is below the OWASP-recommended minimum of 12 for bcrypt in 2026.

**Fix:** Read the salt rounds from an environment variable (e.g., `BCRYPT_ROUNDS`, defaulting to 12) and apply it. Existing passwords continue to work since bcrypt stores the cost factor in the hash.

---

## 6. Frontend vs. Backend Inconsistencies

### 6.1 — Frontend Gates by Role; Backend Gates by Occupation

The frontend (`AppRouter.jsx`, `Sidebar.jsx`) uses `user?.role` string comparisons to decide what UI to show. The backend uses occupation membership from `req.user.occupations`. These are two entirely different authorization systems.

**Consequence:** An `EMPLOYEE` with a directly assigned `Employees - Registration` occupation can call `POST /api/employees` and it will succeed, but the UI will never show them the registration form because `Sidebar.jsx` hides it based on role.

Conversely, an `HR_OFFICER` without the `Letters` occupation will see the full letters management UI (because their role is not `EMPLOYEE`) but all mutations will be rejected by the backend.

**Fix:** Expose a `hasOccupation(name)` helper from `AuthContext` and use it in `AppRouter.jsx` and `Sidebar.jsx` to gate UI rendering on occupations rather than raw role strings. The `user.occupations` array is already available in `AuthContext` (fetched at login via `GET /api/auth/me`).

---

### 6.2 — Delegations Are Fully Non-Functional End-to-End

Three independent bugs combine to make the delegation system completely non-operational:

1. **API routes not registered** (issue 2.4) — delegations cannot be created via HTTP
2. **`calculateEffectiveOccupations` does not call `getActiveDelegations`** (issue 2.2) — even if created via raw DB insert, delegations would not appear in tokens
3. **Frontend has no delegation UI** — no components exist to create or view delegations

**Status:** Delegation is implemented in controller + service + database but unreachable and non-functional in all three layers.

---

### 6.3 — `/attendance/manage` Frontend Route Has No Guard but Backend Rejects Unauthorized Roles

`AppRouter.jsx` does not guard `<Route path="attendance/manage" element={<AttendancePage />} />` with any role or occupation check. An `EMPLOYEE` who navigates directly to `/attendance/manage` loads the full management page. All API calls will fail, but the user sees the admin UI structure.

---

## 7. Permission Enforcement Flow

```
HTTP Request
    │
    ▼
app.js global middleware
    ├── (public) /api/auth/login, /api/auth/refresh → no auth
    ├── (public) /api/auth/register → ⚠️ NO AUTH (see issue 2.1)
    ├── (key-gated) /api/sync → internalApiKeyMiddleware (⚠️ fails open if key unset)
    └── (protected) all other routes → authenticateJwt
                                            │
                                            ▼
                                    Verify JWT signature
                                    Fetch user from DB
                                    Check is_active
                                    Validate token_version (revocation)
                                    Validate permissions_version (permission changes)
                                    Check inactivity timeout (1 hour)
                                    Inject req.user { role, occupations (from JWT), scopes (from JWT) }
                                            │
                                            ▼
                                    Route-level middleware
                                    ├── requireRole([...])
                                    │       └── Checks req.user.role
                                    │           SUPER_ADMIN bypasses
                                    ├── requirePermission({ occupations, roles, logic })
                                    │       └── Checks req.user.occupations (from JWT)
                                    │           SUPER_ADMIN bypasses
                                    └── requireScope(resourceType)
                                            └── Sets req.scopeFilter for data filtering
                                                HR_ADMIN + SUPER_ADMIN always get ALL
                                                Others read from req.user.scopes (from JWT)
                                                    │
                                                    ▼
                                            Controller / Service
```

**Key design note:** `req.user.occupations` comes from the JWT, not a live DB query. Permission changes are propagated by incrementing `permissions_version`, which invalidates existing tokens and forces re-login. This is correct for security, but means delegations and DENY overrides that are not reflected in the JWT have zero effect.

---

## 8. Role-Permission Matrix

| Occupation | EMPLOYEE | DEPT_HEAD | HR_OFFICER | HR_ADMIN | SUPER_ADMIN |
|---|:---:|:---:|:---:|:---:|:---:|
| Dashboard | ✅ | ✅ | ✅ | ✅ | ✅ bypass |
| My Account | ✅ | ✅ | ✅ | ✅ | ✅ bypass |
| Leave - My Leave | ✅ | ✅ | ✅ | ✅ | ✅ bypass |
| Leave - Manage Requests | ❌ | ✅ | ✅ | ✅ | ✅ bypass |
| Leave - Overview | ❌ | ❌ | ✅ | ✅ | ✅ bypass |
| Leave Policies | ❌ | ❌ | ❌ | ✅ | ✅ bypass |
| Employees - Overview | ❌ | ✅ | ✅ | ✅ | ✅ bypass |
| Employees - Registration | ❌ | ❌ | ✅ | ✅ | ✅ bypass |
| Departments - Overview | ❌ | ❌ | ✅ | ✅ | ✅ bypass |
| Positions - Overview | ❌ | ❌ | ✅ | ✅ | ✅ bypass |
| Attendance - Overview | ❌ | ✅ | ✅ | ✅ | ✅ bypass |
| Attendance - Manage | ❌ | ❌ | ✅ | ✅ | ✅ bypass |
| Shifts - Overview | ❌ | ✅ | ✅ | ✅ | ✅ bypass |
| Shifts - Add | ❌ | ❌ | ✅ | ✅ | ✅ bypass |
| Letters | ❌ | ❌ | ✅ | ✅ | ✅ bypass |
| Accounts | ❌ | ❌ | ❌ | ✅ | ✅ bypass |
| Network Settings | ❌ | ❌ | ❌ | ❌ | ✅ bypass only |
| Audit Logs | ❌ | ❌ | ❌ | ❌ | ✅ bypass only |

> SUPER_ADMIN bypasses all occupation checks in middleware. The bypass is SUPER_ADMIN-only; all other roles must have the occupation.

---

## 9. Remediation Checklist

### Critical — Fix Immediately

- [ ] **[2.1]** Add `authenticateJwt` + `requireRole(['HR_ADMIN', 'SUPER_ADMIN'])` to `POST /api/auth/register`. Validate that the assigned role is strictly below the caller's role rank.
- [ ] **[2.2]** Call `getActiveDelegations(userUuid)` inside `calculateEffectiveOccupations` and merge delegated occupations into the result.
- [ ] **[2.3]** Call `getPermissionOverrides(userUuid)` inside `calculateEffectiveOccupations` and subtract DENY occupations from the final list.
- [ ] **[2.4]** Register delegation, scope, override, and audit log routes in `rbacRoutes.js`.

### High — Fix Before Next Release

- [ ] **[3.1]** Add privilege hierarchy check to `changeAccountRole`: caller's role rank must exceed the target role being assigned. Block self-modification.
- [ ] **[3.2]** Same hierarchy check for `createAccount`.
- [ ] **[3.3]** Fail closed (deny request) in `internalApiKeyMiddleware` when `INTERNAL_SYNC_API_KEY` is not set.

### Medium — Address in Next Sprint

- [ ] **[4.1]** Replace bare `authenticateJwt` on leave request mutation routes with `requirePermission({ occupations: 'Leave - My Leave' })`. Fix `isSelfAccess: () => true` patterns.
- [ ] **[4.2]** Verify notification controller filters by `req.user.uuid`; add minimum occupation guard to notification routes.
- [ ] **[4.3]** Decide whether leave policy reads should be gated; add guard if so.
- [ ] **[4.4]** Replace inline role array checks in `requestController.js` and `leaveController.js` with occupation or middleware checks.
- [ ] **[4.5]** Add role-based redirect guards on `/rbac/permissions` and `/rbac/roles` in `AppRouter.jsx`.
- [ ] **[4.6]** Remove `Dashboard` from `department-decision` route occupation OR list.
- [ ] **[4.7]** Remove `Dashboard` from `canViewPendingRequests` occupation OR list.

### Low — Backlog

- [ ] **[5.1]** Replace DEPARTMENT_HEAD role-string checks in controllers with scope or occupation checks.
- [ ] **[5.2]** Apply `UserScopes` for HR_ADMIN instead of unconditionally granting `ALL` scope.
- [ ] **[5.3]** Enforce `ProtectedRoles` table in application code, or remove it.
- [ ] **[5.5]** In the token refresh handler, re-fetch occupations from DB instead of reusing refresh token's embedded occupations.
- [ ] **[5.7]** Add audit log entries in `changeAccountRole` and `createAccount`.
- [ ] **[5.8]** Make bcrypt salt rounds configurable; set default to 12.
- [ ] **[6.1]** Add `hasOccupation(name)` helper to `AuthContext`; replace role-string UI gates with occupation checks in `AppRouter.jsx` and `Sidebar.jsx`.

---

*This audit was conducted by static analysis and execution-path tracing across all backend route files, middleware, services, controllers, database migrations, and frontend routing/context files. Dynamic testing was not performed; additional runtime issues may exist beyond what is documented here.*
