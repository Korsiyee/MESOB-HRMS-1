# HRMS RBAC Architecture Diagram

## 🏗️ System Architecture Overview

```
┌─────────────────────────────────────────────────────────────────────────┐
│                           HRMS APPLICATION                               │
│                                                                          │
│  ┌──────────────────────────────────────────────────────────────────┐  │
│  │                      FRONTEND (React)                             │  │
│  │                                                                   │  │
│  │  ┌────────────────┐  ┌────────────────┐  ┌────────────────┐    │  │
│  │  │   Sidebar      │  │  Page Routes   │  │  Page Components│   │  │
│  │  │  Navigation    │  │  (AppRouter)   │  │  (Protected)    │   │  │
│  │  └────────┬───────┘  └────────┬───────┘  └────────┬────────┘   │  │
│  │           │                   │                    │             │  │
│  │           └───────────────────┴────────────────────┘             │  │
│  │                              │                                    │  │
│  │                    ┌─────────▼──────────┐                       │  │
│  │                    │  PermissionGuard   │                       │  │
│  │                    │  (Client-side)     │                       │  │
│  │                    └─────────┬──────────┘                       │  │
│  │                              │ Checks                            │  │
│  │                              │ user.rbac.permissions            │  │
│  │                              │                                   │  │
│  └──────────────────────────────┼───────────────────────────────────┘  │
│                                 │                                       │
│                                 │ HTTP/HTTPS                           │
│                                 │ (JWT Token)                          │
│                                 ▼                                       │
│  ┌──────────────────────────────────────────────────────────────────┐  │
│  │                    BACKEND (Node.js/Express)                      │  │
│  │                                                                   │  │
│  │  ┌────────────────────────────────────────────────────────────┐  │  │
│  │  │ authMiddleware.js                                          │  │  │
│  │  │  - Validates JWT token                                     │  │  │
│  │  │  - Checks token_version                                    │  │  │
│  │  │  - Checks permissions_version                              │  │  │
│  │  │  - Loads user context                                      │  │  │
│  │  └────────────────────┬───────────────────────────────────────┘  │  │
│  │                       │                                           │  │
│  │                       ▼                                           │  │
│  │  ┌────────────────────────────────────────────────────────────┐  │  │
│  │  │ authorize() Middleware                                     │  │  │
│  │  │  - Checks user permissions                                 │  │  │
│  │  │  - Enforces data scope (Org/Dept/Personal)               │  │  │
│  │  │  - Logs authorization decisions                           │  │  │
│  │  │  - Returns 403 if denied                                  │  │  │
│  │  └────────────────────┬───────────────────────────────────────┘  │  │
│  │                       │                                           │  │
│  │                       ▼                                           │  │
│  │  ┌────────────────────────────────────────────────────────────┐  │  │
│  │  │ Route Handlers                                             │  │  │
│  │  │  - networkSettingsRoutes.js                               │  │  │
│  │  │  - accountRoutes.js                                       │  │  │
│  │  │  - logsRoutes.js                                          │  │  │
│  │  │  - roleManagementRoutes.js                                │  │  │
│  │  └────────────────────┬───────────────────────────────────────┘  │  │
│  │                       │                                           │  │
│  │                       ▼                                           │  │
│  │  ┌────────────────────────────────────────────────────────────┐  │  │
│  │  │ Controllers                                                │  │  │
│  │  │  - Business logic                                          │  │  │
│  │  │  - Data validation                                         │  │  │
│  │  │  - Scope filtering (req.scope)                            │  │  │
│  │  └────────────────────┬───────────────────────────────────────┘  │  │
│  │                       │                                           │  │
│  └───────────────────────┼───────────────────────────────────────────┘  │
│                          │                                              │
│                          │ SQL Queries                                 │
│                          │                                              │
│                          ▼                                              │
│  ┌──────────────────────────────────────────────────────────────────┐  │
│  │                    DATABASE (MySQL)                               │  │
│  │                                                                   │  │
│  │  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐          │  │
│  │  │    Users     │  │    Roles     │  │  Employees   │          │  │
│  │  │              │  │              │  │              │          │  │
│  │  │ - username   │  │ - code       │  │ - name       │          │  │
│  │  │ - role_uuid──┼──┤ - name       │  │ - dept_uuid  │          │  │
│  │  │ - perms_ver  │  │ - hierarchy  │  │ - position   │          │  │
│  │  └──────────────┘  └──────┬───────┘  └──────────────┘          │  │
│  │                           │                                       │  │
│  │                           │                                       │  │
│  │  ┌────────────────────────▼──────────────────────────────────┐  │  │
│  │  │             RolePermissions (Junction)                    │  │  │
│  │  │                                                            │  │  │
│  │  │  - role_uuid (FK → Roles)                                │  │  │
│  │  │  - module_uuid (FK → Modules)                            │  │  │
│  │  │  - action_uuid (FK → Actions)                            │  │  │
│  │  │  - scope_uuid (FK → Scopes)                              │  │  │
│  │  │                                                            │  │  │
│  │  │  Stores: "Role X can perform Action Y on Module Z        │  │  │
│  │  │           within Scope W"                                 │  │  │
│  │  └────────┬─────────────┬──────────────┬────────────────────┘  │  │
│  │           │             │              │                        │  │
│  │  ┌────────▼─────┐  ┌───▼──────┐  ┌───▼──────┐  ┌──────────┐  │  │
│  │  │   Modules    │  │ Actions  │  │  Scopes  │  │NetworkSet│  │  │
│  │  │              │  │          │  │          │  │Audit Logs│  │  │
│  │  │ - ADMIN      │  │ - VIEW   │  │ - ORG    │  │Accounts  │  │  │
│  │  │ - ATTENDANCE │  │ - CREATE │  │ - DEPT   │  │  etc...  │  │  │
│  │  │ - EMPLOYEES  │  │ - UPDATE │  │ - PERSON │  └──────────┘  │  │
│  │  │ - LETTERS    │  │ - DELETE │  └──────────┘                 │  │
│  │  │ - LEAVE      │  │ - EXPORT │                               │  │
│  │  └──────────────┘  └──────────┘                               │  │
│  │                                                                   │  │
│  └───────────────────────────────────────────────────────────────────┘  │
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## 🔐 Authorization Flow (Detailed)

```
User Action (e.g., "View Network Settings")
    │
    ▼
┌───────────────────────────────────────────┐
│ LAYER 1: Frontend PermissionGuard        │
│                                           │
│ Check: user.rbac.permissions includes    │
│        'NetworkSettings.View'             │
│                                           │
│ ✅ YES → Render component                │
│ ❌ NO  → Hide component                  │
└───────────────┬───────────────────────────┘
                │
                ▼
┌───────────────────────────────────────────┐
│ LAYER 2: React Router Protection         │
│                                           │
│ Check: Route has PermissionGuard wrapper │
│                                           │
│ ✅ YES → Load page                       │
│ ❌ NO  → Redirect to Access Denied       │
└───────────────┬───────────────────────────┘
                │
                │ HTTP Request
                │ Authorization: Bearer <JWT>
                │
                ▼
┌───────────────────────────────────────────┐
│ LAYER 3: Backend authMiddleware.js       │
│                                           │
│ 1. Extract JWT token from header         │
│ 2. Verify JWT signature                  │
│ 3. Check token expiration                │
│ 4. Validate token_version                │
│ 5. Validate permissions_version           │
│ 6. Load user data                         │
│ 7. Attach req.user                        │
│                                           │
│ ✅ VALID → Continue                      │
│ ❌ INVALID → 401 Unauthorized            │
└───────────────┬───────────────────────────┘
                │
                ▼
┌───────────────────────────────────────────┐
│ LAYER 4: Backend authorize() Middleware  │
│                                           │
│ 1. Check if Super Admin (bypass)         │
│ 2. Check self-access rules                │
│ 3. Query database for permissions:        │
│                                           │
│    SELECT * FROM RolePermissions rp       │
│    JOIN Roles r ON rp.role_uuid = r.uuid  │
│    WHERE r.uuid = user.role_uuid          │
│    AND module = 'ATTENDANCE'              │
│    AND action = 'VIEW'                    │
│                                           │
│ 4. If enforceScope = true:                │
│    - Attach req.scope (ORG/DEPT/PERSON)  │
│                                           │
│ 5. Log decision (audit trail)             │
│                                           │
│ ✅ HAS PERMISSION → Continue             │
│ ❌ NO PERMISSION → 403 Forbidden         │
└───────────────┬───────────────────────────┘
                │
                ▼
┌───────────────────────────────────────────┐
│ LAYER 5: Controller / Business Logic     │
│                                           │
│ 1. Apply scope filtering (if enforced):  │
│                                           │
│    WHERE conditions:                      │
│    - ORG scope → No filter               │
│    - DEPT scope → dept = user.dept       │
│    - PERSON scope → id = user.id         │
│                                           │
│ 2. Execute business logic                 │
│ 3. Return filtered data                   │
│                                           │
│ ✅ SUCCESS → 200 OK with data            │
│ ❌ ERROR → Appropriate error code        │
└───────────────────────────────────────────┘
```

---

## 🗺️ Permission Resolution Flow

```
User Login
    │
    ▼
┌─────────────────────────────────┐
│ Authenticate Credentials        │
└─────────────┬───────────────────┘
              │
              ▼
┌─────────────────────────────────────────────────┐
│ Load User Data                                  │
│                                                 │
│ SELECT u.*, r.*, e.*                           │
│ FROM Users u                                    │
│ JOIN Roles r ON u.role_uuid = r.uuid          │
│ JOIN Employees e ON u.employee_uuid = e.uuid   │
│ WHERE u.username = ?                           │
└─────────────┬───────────────────────────────────┘
              │
              ▼
┌────────────────────────────────────────────────────────┐
│ Load Permissions for User's Role                      │
│                                                        │
│ SELECT                                                 │
│   CONCAT(m.code, '.', a.code) as permission,         │
│   s.code as scope                                     │
│ FROM RolePermissions rp                               │
│ JOIN Modules m ON rp.module_uuid = m.uuid            │
│ JOIN Actions a ON rp.action_uuid = a.uuid            │
│ JOIN Scopes s ON rp.scope_uuid = s.uuid              │
│ WHERE rp.role_uuid = user.role_uuid                   │
│                                                        │
│ Result: ['NetworkSettings.View', 'Accounts.View', ...]│
└─────────────┬──────────────────────────────────────────┘
              │
              ▼
┌─────────────────────────────────┐
│ Generate JWT Token              │
│                                 │
│ Payload:                        │
│ {                               │
│   uuid: user.uuid,             │
│   role_id: role.id,            │
│   token_version: user.tv,      │
│   permissions_version: user.pv,│
│   exp: timestamp + 24h         │
│ }                               │
│                                 │
│ Sign with JWT_SECRET            │
└─────────────┬───────────────────┘
              │
              ▼
┌─────────────────────────────────┐
│ Return to Client                │
│                                 │
│ {                               │
│   token: "eyJhbGc...",         │
│   user: {                       │
│     rbac: {                     │
│       permissions: [...],      │
│       role: {...}              │
│     }                           │
│   }                             │
│ }                               │
└─────────────────────────────────┘
```

---

## 🔄 Permission Update Flow

```
Admin Adds/Removes Permission
    │
    ▼
┌────────────────────────────────────┐
│ UPDATE RolePermissions             │
│                                    │
│ INSERT/DELETE permission entry     │
└────────────────┬───────────────────┘
                 │
                 ▼
┌────────────────────────────────────┐
│ Increment permissions_version      │
│                                    │
│ UPDATE Users                       │
│ SET permissions_version = pv + 1   │
│ WHERE role_uuid = affected_role    │
└────────────────┬───────────────────┘
                 │
                 ▼
┌────────────────────────────────────────────┐
│ User's Next API Request                    │
│                                            │
│ 1. authMiddleware validates token          │
│ 2. Compares token.permissions_version      │
│    with database user.permissions_version  │
│ 3. MISMATCH detected                       │
│ 4. Return 401 TOKEN_PERMISSIONS_CHANGED   │
└────────────────┬───────────────────────────┘
                 │
                 ▼
┌────────────────────────────────────┐
│ Frontend Handles 401               │
│                                    │
│ 1. Clear local token               │
│ 2. Redirect to login               │
│ 3. Show message:                   │
│    "Permissions changed, please    │
│     re-login"                      │
└────────────────┬───────────────────┘
                 │
                 ▼
┌────────────────────────────────────┐
│ User Re-Logs In                    │
│                                    │
│ 1. New JWT generated               │
│ 2. New permissions loaded          │
│ 3. New permissions_version in token│
│ 4. User has updated access         │
└────────────────────────────────────┘
```

---

## 📊 Database Schema (Simplified)

```sql
-- Core RBAC Tables

Users
├── uuid (PK)
├── username
├── role_uuid (FK → Roles)
├── permissions_version (for instant invalidation)
├── token_version (for forced logout)
└── employee_uuid (FK → Employees)

Roles
├── uuid (PK)
├── code (SUPER_ADMIN, HR_ADMIN, etc.)
├── name
├── hierarchy_level (100 = highest)
└── is_system_role (cannot delete)

Modules
├── uuid (PK)
├── code (ADMIN, ATTENDANCE, LETTERS, etc.)
└── name

Actions
├── uuid (PK)
├── code (VIEW, CREATE, UPDATE, DELETE, EXPORT)
└── name

Scopes
├── uuid (PK)
├── code (ORGANIZATION, DEPARTMENT, PERSONAL)
├── name
└── level (100, 50, 10)

RolePermissions (Junction)
├── uuid (PK)
├── role_uuid (FK → Roles)
├── module_uuid (FK → Modules)
├── action_uuid (FK → Actions)
└── scope_uuid (FK → Scopes)

-- Example Entry:
-- "SUPER_ADMIN can VIEW ADMIN module at ORGANIZATION scope"
role_uuid = 'uuid-super-admin'
module_uuid = 'uuid-admin-module'
action_uuid = 'uuid-view-action'
scope_uuid = 'uuid-org-scope'
```

---

## 🎯 Permission Matrix

```
┌─────────────────┬──────────┬──────────┬──────────┬──────────┬──────────┐
│                 │  SUPER   │    HR    │   DEPT   │    HR    │ EMPLOYEE │
│   Resource      │  ADMIN   │  ADMIN   │   HEAD   │ OFFICER  │          │
├─────────────────┼──────────┼──────────┼──────────┼──────────┼──────────┤
│ NetworkSettings │          │          │          │          │          │
│   View          │    ✅    │    ✅    │    ❌    │    ❌    │    ❌    │
│   Create        │    ✅    │    ❌    │    ❌    │    ❌    │    ❌    │
│   Update        │    ✅    │    ✅    │    ❌    │    ❌    │    ❌    │
│   Delete        │    ✅    │    ❌    │    ❌    │    ❌    │    ❌    │
├─────────────────┼──────────┼──────────┼──────────┼──────────┼──────────┤
│ Accounts        │          │          │          │          │          │
│   View          │    ✅    │    ✅    │    ❌    │    ❌    │    ❌    │
│   Create        │    ✅    │    ❌    │    ❌    │    ❌    │    ❌    │
│   Update        │    ✅    │    ❌    │    ❌    │    ❌    │    ❌    │
│   Delete        │    ✅    │    ❌    │    ❌    │    ❌    │    ❌    │
├─────────────────┼──────────┼──────────┼──────────┼──────────┼──────────┤
│ AuditLogs       │          │          │          │          │          │
│   View          │ ✅ (Org) │ ✅ (Dept)│    ❌    │    ❌    │    ❌    │
│   Export        │    ✅    │    ❌    │    ❌    │    ❌    │    ❌    │
├─────────────────┼──────────┼──────────┼──────────┼──────────┼──────────┤
│ Roles           │          │          │          │          │          │
│   View          │    ✅    │    ✅    │    ❌    │    ❌    │    ❌    │
│   Create        │    ✅    │    ❌    │    ❌    │    ❌    │    ❌    │
│   Update        │    ✅    │    ❌    │    ❌    │    ❌    │    ❌    │
│   Delete        │    ✅    │    ❌    │    ❌    │    ❌    │    ❌    │
└─────────────────┴──────────┴──────────┴──────────┴──────────┴──────────┘

Legend:
✅ = Has permission
❌ = No permission
(Org) = Organization-wide scope
(Dept) = Department-level scope
```

---

## 🔧 Component Interaction

```
┌────────────────────────────────────────────────────────────────┐
│                    USER INTERFACE                              │
│                                                                │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐       │
│  │  Sidebar     │  │  PageHeader  │  │  Content     │       │
│  │              │  │              │  │              │       │
│  │  • Filter by │  │  • User info │  │  • Forms     │       │
│  │    module    │  │  • Actions   │  │  • Tables    │       │
│  │    perms     │  │              │  │  • Modals    │       │
│  └──────┬───────┘  └──────────────┘  └──────┬───────┘       │
│         │                                    │                │
│         └────────────────┬───────────────────┘                │
│                          │                                    │
│                          ▼                                    │
│              ┌───────────────────────┐                       │
│              │  PermissionGuard      │                       │
│              │  • hasPermission()    │                       │
│              │  • hasAnyPermission() │                       │
│              │  • hasAllPermissions()│                       │
│              └───────────┬───────────┘                       │
│                          │                                    │
│                          │ Uses                               │
│                          ▼                                    │
│              ┌───────────────────────┐                       │
│              │  usePermissions()     │                       │
│              │  Hook                 │                       │
│              │  • user.rbac.perms    │                       │
│              │  • cached checks      │                       │
│              └───────────┬───────────┘                       │
│                          │                                    │
│                          │ Reads from                         │
│                          ▼                                    │
│              ┌───────────────────────┐                       │
│              │  AuthContext          │                       │
│              │  • user               │                       │
│              │  • login/logout       │                       │
│              │  • token management   │                       │
│              └───────────┬───────────┘                       │
│                          │                                    │
└──────────────────────────┼────────────────────────────────────┘
                           │
                           │ API Calls
                           │
                           ▼
┌──────────────────────────────────────────────────────────────┐
│                    BACKEND API                                │
│                                                               │
│  Request → authMiddleware → authorize() → Controller → DB    │
│                                                               │
└───────────────────────────────────────────────────────────────┘
```

---

**End of Architecture Diagram**

For more details, see:
- `HRMS_FRONTEND_MODIFICATIONS_COMPLETE.md`
- `IMPLEMENTATION_SUMMARY.md`
- `QUICK_REFERENCE.md`
