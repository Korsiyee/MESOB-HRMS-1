# Role Management Module - Design Document

## 1. Architecture Overview

The Role Management Module consolidates two legacy implementations (roleManagementController and moduleRoleController) into a unified, modern RBAC system. The architecture follows a layered approach with clear separation of concerns:

```
┌─────────────────────────────────────────────────────────────┐
│                    Frontend (React + Vite)                   │
├─────────────────────────────────────────────────────────────┤
│  Role List View │ Role Detail View │ Role Form │ Permission  │
│                 │                  │           │   Matrix    │
└────────────┬────────────────────────────────────────────────┘
             │ REST API (JSON)
┌────────────┴────────────────────────────────────────────────┐
│              Backend (Node.js + Express)                     │
├─────────────────────────────────────────────────────────────┤
│  Routes Layer    │  Middleware Layer  │  Controller Layer   │
│  - /api/rbac/*   │  - Auth (JWT)      │  - roleController   │
│                  │  - Authorization   │                     │
│                  │  - Role Hierarchy  │                     │
├─────────────────────────────────────────────────────────────┤
│              Service Layer (Business Logic)                  │
│  - rbacService                                              │
│  - permissionService                                        │
│  - scopeService                                             │
│  - auditService                                             │
├─────────────────────────────────────────────────────────────┤
│              Data Access Layer (MySQL)                       │
│  - Roles           - Role_Permissions                       │
│  - Resources       - Role_Permission_Scopes                 │
│  - Permissions     - Users                                  │
│  - DataScopes      - AuthorizationAuditLogs                 │
└─────────────────────────────────────────────────────────────┘
```

### Key Design Principles

1. **Single Responsibility**: Each layer has a clear, focused purpose
2. **Separation of Concerns**: UI, business logic, and data access are isolated
3. **Permission-Based Security**: All operations protected by granular permissions
4. **Audit Trail**: Complete logging of all RBAC changes
5. **Progressive Enhancement**: UI works without JavaScript for core features
6. **Accessibility First**: WCAG 2.1 AA compliance throughout

## 2. Component Design

### 2.1 Backend Components

#### 2.1.1 Unified Role Controller (`roleController.js`)

This controller consolidates functionality from both legacy controllers.

**Core Responsibilities:**
- Handle HTTP requests for role CRUD operations
- Validate request parameters and bodies
- Delegate business logic to services
- Format responses with consistent structure
- Handle errors gracefully

**Key Methods:**

```javascript
class RoleController {
  // Role CRUD
  async getAllRoles(req, res) { }
  async getRoleDetails(req, res) { }
  async createRole(req, res) { }
  async updateRole(req, res) { }
  async deleteRole(req, res) { }
  async setRoleStatus(req, res) { }
  
  // Permission Management
  async getAllPermissions(req, res) { }
  async assignPermission(req, res) { }
  async removePermission(req, res) { }
  async bulkAssignPermissions(req, res) { }
  async replacePermissions(req, res) { }
  
  // Scope Management
  async getAllScopes(req, res) { }
  async assignScope(req, res) { }
  async removeScope(req, res) { }
  
  // User Assignment
  async getRoleUsers(req, res) { }
  async assignRoleToUser(req, res) { }
  
  // Audit and Reporting
  async getAuditLogs(req, res) { }
}
```

**Request/Response Formats:**

```javascript
// GET /api/rbac/roles - List all roles
Response: {
  success: true,
  data: [
    {
      uuid: "550e8400-e29b-41d4-a716-446655440000",
      code: "SUPER_ADMIN",
      name: "Super Administrator",
      description: "Full system access",
      hierarchy_level: 100,
      is_system_role: true,
      is_active: true,
      user_count: 3,
      created_at: "2024-01-15T10:30:00Z",
      updated_at: "2024-01-15T10:30:00Z"
    }
  ],
  meta: {
    total: 8,
    system_roles: 3,
    custom_roles: 5
  }
}

// POST /api/rbac/roles - Create role
Request: {
  code: "HR_MANAGER",
  name: "HR Manager",
  description: "Human resources management role",
  hierarchy_level: 60
}
Response: {
  success: true,
  data: {
    uuid: "660e8400-e29b-41d4-a716-446655440000",
    code: "HR_MANAGER",
    name: "HR Manager",
    description: "Human resources management role",
    hierarchy_level: 60,
    is_system_role: false,
    is_active: true,
    created_at: "2024-01-20T14:22:00Z"
  },
  message: "Role created successfully"
}

// GET /api/rbac/roles/:uuid - Get role details
Response: {
  success: true,
  data: {
    uuid: "660e8400-e29b-41d4-a716-446655440000",
    code: "HR_MANAGER",
    name: "HR Manager",
    description: "Human resources management role",
    hierarchy_level: 60,
    is_system_role: false,
    is_active: true,
    permissions: [
      {
        uuid: "perm-uuid-1",
        code: "Employees.View",
        name: "View Employees",
        resource: {
          code: "Employees",
          name: "Employees"
        },
        scope: {
          uuid: "scope-uuid-1",
          code: "DEPARTMENT",
          name: "Department"
        }
      }
    ],
    user_count: 12,
    created_at: "2024-01-20T14:22:00Z",
    updated_at: "2024-01-20T14:22:00Z"
  }
}

// POST /api/rbac/roles/:roleUuid/permissions - Assign permission
Request: {
  permission_uuid: "perm-uuid-2",
  data_scope_uuid: "scope-uuid-2"  // Optional
}
Response: {
  success: true,
  message: "Permission assigned successfully"
}

// POST /api/rbac/roles/:roleUuid/permissions/bulk - Bulk assign
Request: {
  permissions: [
    {
      permission_uuid: "perm-uuid-1",
      data_scope_uuid: "scope-uuid-1"
    },
    {
      permission_uuid: "perm-uuid-2",
      data_scope_uuid: "scope-uuid-2"
    }
  ]
}
Response: {
  success: true,
  data: {
    assigned: 2,
    skipped: 0
  },
  message: "Bulk assignment completed"
}

// Error Response Format
Response: {
  success: false,
  error: {
    code: "DUPLICATE_ROLE_CODE",
    message: "A role with code 'HR_MANAGER' already exists",
    field: "code"  // Optional, for validation errors
  }
}
```

#### 2.1.2 RBAC Service (`rbacService.js`)

Core business logic for role management operations.

```javascript
class RBACService {
  constructor(db, auditService) {
    this.db = db;
    this.auditService = auditService;
  }

  // Role Operations
  async findAllRoles(filters = {}) {
    // Retrieve roles with optional filtering
    // Join with Users to get user counts
    // Return roles sorted by hierarchy_level DESC
  }

  async findRoleByUuid(roleUuid) {
    // Retrieve single role with all related data
    // Include permissions with resources
    // Include scopes for each permission
    // Calculate user count
  }

  async createRole(roleData, actorUuid) {
    // Validate code format (uppercase + underscores)
    // Check for duplicate code
    // Generate UUID
    // Set is_system_role = false
    // Insert into Roles table
    // Log to audit trail
    // Return created role
  }

  async updateRole(roleUuid, updates, actorUuid) {
    // Validate role exists
    // Check if system role (restrict modifications)
    // Validate allowed field updates
    // Update only name, description, hierarchy_level
    // Log to audit trail
    // Return updated role
  }

  async deleteRole(roleUuid, actorUuid) {
    // Validate role exists
    // Check if system role (prevent deletion)
    // Check for assigned users
    // Perform soft delete (is_active = false)
    // Log to audit trail
    // Return success
  }

  async setRoleStatus(roleUuid, isActive, actorUuid) {
    // Toggle is_active flag
    // Log to audit trail
  }

  // Permission Operations
  async assignPermissionToRole(roleUuid, permissionUuid, dataScopeUuid, actorUuid) {
    // Start transaction
    // Validate role and permission exist
    // Check for duplicate assignment
    // Create Role_Permission record
    // If permission requires_scope, create Role_Permission_Scope
    // Commit transaction
    // Log to audit trail
  }

  async removePermissionFromRole(roleUuid, permissionUuid, actorUuid) {
    // Start transaction
    // Delete from Role_Permission_Scopes
    // Delete from Role_Permissions
    // Commit transaction
    // Log to audit trail
  }

  async bulkAssignPermissions(roleUuid, permissionAssignments, actorUuid) {
    // Start transaction
    // Validate all permissions exist
    // Check for duplicates
    // Batch insert Role_Permission records
    // Batch insert Role_Permission_Scope records where needed
    // Commit transaction
    // Log to audit trail
  }

  async replaceAllPermissions(roleUuid, permissionAssignments, actorUuid) {
    // Start transaction
    // Delete all existing Role_Permission_Scopes for role
    // Delete all existing Role_Permissions for role
    // Bulk insert new assignments
    // Commit transaction
    // Log to audit trail
  }

  // Scope Operations
  async assignScopeToRolePermission(roleUuid, permissionUuid, dataScopeUuid, scopeConfig, actorUuid) {
    // Validate permission requires scope
    // Check unique constraint
    // Insert or update Role_Permission_Scope
    // Store scope_configuration JSON if provided
    // Log to audit trail
  }

  async removeScopeFromRolePermission(roleUuid, permissionUuid, actorUuid) {
    // Delete Role_Permission_Scope record
    // Apply default scope if permission requires_scope
    // Log to audit trail
  }

  // User Assignment
  async assignRoleToUser(userUuid, roleUuid, actorUuid) {
    // Validate role exists and is active
    // Update Users.role_uuid
    // Log to audit trail
    // Return notification about re-login requirement
  }

  async getUsersByRole(roleUuid) {
    // Query Users table where role_uuid matches
    // Return user list with employee details
  }

  // Helper Methods
  async validateRoleCode(code) {
    // Regex: /^[A-Z_]+$/
  }

  async getLowestHierarchyScope() {
    // Return DataScope with minimum hierarchy_level
  }

  async checkSystemRole(roleUuid) {
    // Query is_system_role flag
  }

  async checkUsersAssigned(roleUuid) {
    // Count users with role_uuid
  }
}
```

#### 2.1.3 Permission Service (`permissionService.js`)

Handles permission and resource queries.

```javascript
class PermissionService {
  constructor(db) {
    this.db = db;
  }

  async getAllPermissions() {
    // Query all Permissions with Resources
    // Group by resource_uuid
    // Sort by resource display_order, then permission display_order
    // Return grouped structure
  }

  async getPermissionsByResource(resourceCode) {
    // Query permissions for specific resource
  }

  async getPermissionsForRole(roleUuid) {
    // Query Role_Permissions with joins
    // Include Resource, Permission, and DataScope details
    // Return enriched permission list
  }

  async getAllResources() {
    // Query all active Resources
    // Sort by display_order
  }
}
```

#### 2.1.4 Scope Service (`scopeService.js`)

Manages data scope operations.

```javascript
class ScopeService {
  constructor(db) {
    this.db = db;
  }

  async getAllScopes() {
    // Query all DataScopes
    // Sort by hierarchy_level DESC
    // Return scope list
  }

  async getScopeForRolePermission(roleUuid, permissionUuid) {
    // Query Role_Permission_Scopes
    // Return assigned scope with configuration
  }

  async getDefaultScope() {
    // Return OWN scope (lowest hierarchy)
  }
}
```

#### 2.1.5 Audit Service (`auditService.js`)

Centralized audit logging for all RBAC operations.

```javascript
class AuditService {
  constructor(db) {
    this.db = db;
  }

  async logRoleCreated(roleUuid, actorUuid, ipAddress, userAgent) {
    await this.log({
      action_type: 'ROLE_CREATED',
      actor_user_uuid: actorUuid,
      target_role_uuid: roleUuid,
      ip_address: ipAddress,
      user_agent: userAgent
    });
  }

  async logRoleUpdated(roleUuid, actorUuid, changes, ipAddress, userAgent) {
    await this.log({
      action_type: 'ROLE_UPDATED',
      actor_user_uuid: actorUuid,
      target_role_uuid: roleUuid,
      details: JSON.stringify(changes),
      ip_address: ipAddress,
      user_agent: userAgent
    });
  }

  async logRoleDeleted(roleUuid, actorUuid, ipAddress, userAgent) {
    await this.log({
      action_type: 'ROLE_DELETED',
      actor_user_uuid: actorUuid,
      target_role_uuid: roleUuid,
      ip_address: ipAddress,
      user_agent: userAgent
    });
  }

  async logPermissionAssigned(roleUuid, permissionUuid, actorUuid, ipAddress, userAgent) {
    await this.log({
      action_type: 'PERMISSION_ASSIGNED',
      actor_user_uuid: actorUuid,
      target_role_uuid: roleUuid,
      target_permission_uuid: permissionUuid,
      ip_address: ipAddress,
      user_agent: userAgent
    });
  }

  async logPermissionRemoved(roleUuid, permissionUuid, actorUuid, ipAddress, userAgent) {
    await this.log({
      action_type: 'PERMISSION_REMOVED',
      actor_user_uuid: actorUuid,
      target_role_uuid: roleUuid,
      target_permission_uuid: permissionUuid,
      ip_address: ipAddress,
      user_agent: userAgent
    });
  }

  async logScopeAssigned(roleUuid, permissionUuid, scopeUuid, actorUuid, ipAddress, userAgent) {
    await this.log({
      action_type: 'SCOPE_ASSIGNED',
      actor_user_uuid: actorUuid,
      target_role_uuid: roleUuid,
      target_permission_uuid: permissionUuid,
      details: JSON.stringify({ scope_uuid: scopeUuid }),
      ip_address: ipAddress,
      user_agent: userAgent
    });
  }

  async logScopeRemoved(roleUuid, permissionUuid, actorUuid, ipAddress, userAgent) {
    await this.log({
      action_type: 'SCOPE_REMOVED',
      actor_user_uuid: actorUuid,
      target_role_uuid: roleUuid,
      target_permission_uuid: permissionUuid,
      ip_address: ipAddress,
      user_agent: userAgent
    });
  }

  async logRoleAssigned(userUuid, roleUuid, actorUuid, ipAddress, userAgent) {
    await this.log({
      action_type: 'ROLE_ASSIGNED',
      actor_user_uuid: actorUuid,
      target_user_uuid: userUuid,
      target_role_uuid: roleUuid,
      ip_address: ipAddress,
      user_agent: userAgent
    });
  }

  async log(entry) {
    // Insert into AuthorizationAuditLogs
    // Include timestamp (auto)
    // Include all provided fields
  }

  async getAuditLogs(filters = {}) {
    // Query logs with optional filters
    // Support filtering by action_type, actor, date range
    // Join with Users, Roles for display names
    // Return paginated results
  }
}
```

#### 2.1.6 Middleware

**Authorization Middleware (`authorize.js`)**

```javascript
function authorize(options) {
  return async (req, res, next) => {
    const { permissions = [], logic = 'OR' } = options;
    
    // Extract user from JWT (req.user set by authenticateJwt)
    const userUuid = req.user.uuid;
    
    // If no permissions required, just check authentication
    if (permissions.length === 0) {
      return next();
    }
    
    // Query user's effective permissions via role
    const userPermissions = await getUserEffectivePermissions(userUuid);
    
    // Check permission requirements
    const hasAccess = logic === 'AND' 
      ? permissions.every(p => userPermissions.includes(p))
      : permissions.some(p => userPermissions.includes(p));
    
    if (!hasAccess) {
      return res.status(403).json({
        success: false,
        error: {
          code: 'INSUFFICIENT_PERMISSIONS',
          message: 'You do not have permission to perform this action'
        }
      });
    }
    
    next();
  };
}
```

**Role Hierarchy Middleware (`roleHierarchy.js`)**

```javascript
function canModifyRole(roleUuidParam) {
  return async (req, res, next) => {
    const targetRoleUuid = req.params[roleUuidParam];
    const actorUuid = req.user.uuid;
    
    // Get actor's role hierarchy level
    const actorRole = await getRoleForUser(actorUuid);
    
    // Get target role hierarchy level
    const targetRole = await getRoleByUuid(targetRoleUuid);
    
    // Actor must have higher or equal hierarchy level
    if (actorRole.hierarchy_level < targetRole.hierarchy_level) {
      return res.status(403).json({
        success: false,
        error: {
          code: 'HIERARCHY_VIOLATION',
          message: 'Cannot modify roles with higher hierarchy level'
        }
      });
    }
    
    next();
  };
}

function preventSystemRoleModification(roleUuidParam) {
  return async (req, res, next) => {
    const roleUuid = req.params[roleUuidParam];
    const role = await getRoleByUuid(roleUuid);
    
    if (role.is_system_role) {
      // Allow only specific fields for system roles
      const allowedUpdates = ['description'];
      const requestedUpdates = Object.keys(req.body);
      const hasDisallowedUpdates = requestedUpdates.some(
        key => !allowedUpdates.includes(key)
      );
      
      if (hasDisallowedUpdates || req.method === 'DELETE') {
        return res.status(403).json({
          success: false,
          error: {
            code: 'SYSTEM_ROLE_PROTECTED',
            message: 'System roles cannot be deleted or have restricted modifications'
          }
        });
      }
    }
    
    next();
  };
}
```

### 2.2 Frontend Components

#### 2.2.1 Component Hierarchy

```
App
└── AuthenticatedLayout
    └── RoleManagementSection
        ├── RoleListView
        │   ├── RoleListHeader
        │   │   ├── SearchBar
        │   │   └── CreateRoleButton
        │   ├── RoleFilterBar
        │   │   ├── SystemRoleFilter
        │   │   ├── CustomRoleFilter
        │   │   └── StatusFilter
        │   └── RoleTable
        │       └── RoleRow (repeating)
        │           └── RoleActions
        │
        ├── RoleDetailView
        │   ├── RoleHeader
        │   │   ├── Breadcrumbs
        │   │   └── ActionButtons
        │   ├── RoleInfoCard
        │   ├── RolePermissionsCard
        │   │   └── PermissionList
        │   │       └── PermissionItem (repeating)
        │   └── RoleUsersCard
        │       └── UserList
        │
        ├── RoleFormModal
        │   ├── FormHeader
        │   ├── FormFields
        │   │   ├── CodeInput
        │   │   ├── NameInput
        │   │   ├── DescriptionTextarea
        │   │   └── HierarchyLevelInput
        │   └── FormActions
        │
        └── PermissionMatrixModal
            ├── MatrixHeader
            │   ├── SearchBar
            │   └── BulkActions
            ├── ResourceGroups
            │   └── ResourceSection (repeating)
            │       ├── ResourceHeader
            │       ├── SelectAllCheckbox
            │       └── PermissionRows
            │           └── PermissionCheckbox (repeating)
            │               └── ScopeSelector (conditional)
            └── MatrixActions
```

#### 2.2.2 Role List View Component

**File**: `frontend/src/pages/RoleManagement/RoleListView.jsx`

```jsx
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { roleAPI } from '../../api/roleAPI';
import { useAuth } from '../../context/AuthContext';
import { hasPermission } from '../../utils/permissions';

export default function RoleListView() {
  const [roles, setRoles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({
    search: '',
    type: 'all', // 'all', 'system', 'custom'
    status: 'active' // 'all', 'active', 'inactive'
  });
  const [sortConfig, setSortConfig] = useState({
    field: 'hierarchy_level',
    direction: 'desc'
  });
  
  const navigate = useNavigate();
  const { user, permissions } = useAuth();
  
  const canCreate = hasPermission(permissions, 'Roles.Create');
  const canUpdate = hasPermission(permissions, 'Roles.Update');
  const canDelete = hasPermission(permissions, 'Roles.Delete');

  useEffect(() => {
    loadRoles();
  }, [filters, sortConfig]);

  const loadRoles = async () => {
    setLoading(true);
    try {
      const response = await roleAPI.getAllRoles(filters);
      setRoles(response.data);
    } catch (error) {
      console.error('Failed to load roles:', error);
      // Show error notification
    } finally {
      setLoading(false);
    }
  };

  const handleSearchChange = (e) => {
    setFilters(prev => ({ ...prev, search: e.target.value }));
  };

  const handleSort = (field) => {
    setSortConfig(prev => ({
      field,
      direction: prev.field === field && prev.direction === 'asc' ? 'desc' : 'asc'
    }));
  };

  const handleRoleClick = (roleUuid) => {
    navigate(`/rbac/roles/${roleUuid}`);
  };

  const handleCreateRole = () => {
    navigate('/rbac/roles/new');
  };

  const handleDeleteRole = async (roleUuid, roleName) => {
    if (!confirm(`Are you sure you want to delete role "${roleName}"?`)) {
      return;
    }
    
    try {
      await roleAPI.deleteRole(roleUuid);
      // Show success notification
      loadRoles(); // Refresh list
    } catch (error) {
      // Show error notification with specific message
      console.error('Failed to delete role:', error);
    }
  };

  if (loading) {
    return <LoadingSpinner />;
  }

  if (roles.length === 0 && filters.search === '') {
    return (
      <EmptyState
        title="No Roles Found"
        description="Create your first role to manage permissions"
        action={canCreate && (
          <button onClick={handleCreateRole}>Create Role</button>
        )}
      />
    );
  }

  return (
    <div className="role-list-view">
      <div className="role-list-header">
        <h1>Role Management</h1>
        {canCreate && (
          <button 
            onClick={handleCreateRole}
            className="btn-primary"
            aria-label="Create new role"
          >
            Create Role
          </button>
        )}
      </div>

      <div className="role-filters">
        <SearchBar
          value={filters.search}
          onChange={handleSearchChange}
          placeholder="Search roles by code or name..."
          aria-label="Search roles"
        />
        
        <FilterButtonGroup
          value={filters.type}
          onChange={(type) => setFilters(prev => ({ ...prev, type }))}
          options={[
            { value: 'all', label: 'All Roles' },
            { value: 'system', label: 'System Roles' },
            { value: 'custom', label: 'Custom Roles' }
          ]}
        />
        
        <FilterButtonGroup
          value={filters.status}
          onChange={(status) => setFilters(prev => ({ ...prev, status }))}
          options={[
            { value: 'all', label: 'All Status' },
            { value: 'active', label: 'Active' },
            { value: 'inactive', label: 'Inactive' }
          ]}
        />
      </div>

      <div className="role-table-container">
        <table className="role-table" role="table" aria-label="Roles list">
          <thead>
            <tr>
              <th>
                <SortableHeader
                  label="Code"
                  field="code"
                  sortConfig={sortConfig}
                  onSort={handleSort}
                />
              </th>
              <th>
                <SortableHeader
                  label="Name"
                  field="name"
                  sortConfig={sortConfig}
                  onSort={handleSort}
                />
              </th>
              <th>Description</th>
              <th>
                <SortableHeader
                  label="Hierarchy"
                  field="hierarchy_level"
                  sortConfig={sortConfig}
                  onSort={handleSort}
                />
              </th>
              <th>Type</th>
              <th>
                <SortableHeader
                  label="Users"
                  field="user_count"
                  sortConfig={sortConfig}
                  onSort={handleSort}
                />
              </th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {roles.map(role => (
              <RoleRow
                key={role.uuid}
                role={role}
                canUpdate={canUpdate}
                canDelete={canDelete && !role.is_system_role}
                onClick={() => handleRoleClick(role.uuid)}
                onDelete={() => handleDeleteRole(role.uuid, role.name)}
              />
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
```

#### 2.2.3 Role Detail View Component

**File**: `frontend/src/pages/RoleManagement/RoleDetailView.jsx`

```jsx
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { roleAPI } from '../../api/roleAPI';
import { useAuth } from '../../context/AuthContext';
import { hasPermission } from '../../utils/permissions';

export default function RoleDetailView() {
  const { roleUuid } = useParams();
  const navigate = useNavigate();
  const { permissions } = useAuth();
  
  const [role, setRole] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showPermissionMatrix, setShowPermissionMatrix] = useState(false);
  
  const canUpdate = hasPermission(permissions, 'Roles.Update');
  const canDelete = hasPermission(permissions, 'Roles.Delete');
  const canManagePermissions = hasPermission(permissions, 'Roles.AssignPermissions');

  useEffect(() => {
    loadRoleDetails();
  }, [roleUuid]);

  const loadRoleDetails = async () => {
    setLoading(true);
    try {
      const response = await roleAPI.getRoleDetails(roleUuid);
      setRole(response.data);
    } catch (error) {
      console.error('Failed to load role:', error);
      // Show error and redirect
      navigate('/rbac/roles');
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = () => {
    navigate(`/rbac/roles/${roleUuid}/edit`);
  };

  const handleDelete = async () => {
    if (!confirm(`Are you sure you want to delete role "${role.name}"?`)) {
      return;
    }
    
    try {
      await roleAPI.deleteRole(roleUuid);
      // Show success notification
      navigate('/rbac/roles');
    } catch (error) {
      // Show error notification
      console.error('Failed to delete role:', error);
    }
  };

  const handleManagePermissions = () => {
    setShowPermissionMatrix(true);
  };

  if (loading) {
    return <LoadingSpinner />;
  }

  if (!role) {
    return <NotFound message="Role not found" />;
  }

  return (
    <div className="role-detail-view">
      <Breadcrumbs
        items={[
          { label: 'Role Management', path: '/rbac/roles' },
          { label: role.name, path: `/rbac/roles/${roleUuid}` }
        ]}
      />

      <div className="role-header">
        <div className="role-title">
          <h1>{role.name}</h1>
          {role.is_system_role && (
            <Badge variant="system" aria-label="System role">
              System Role
            </Badge>
          )}
          {!role.is_active && (
            <Badge variant="inactive" aria-label="Inactive role">
              Inactive
            </Badge>
          )}
        </div>
        
        <div className="role-actions">
          {canUpdate && (
            <button
              onClick={handleEdit}
              className="btn-secondary"
              aria-label="Edit role"
            >
              Edit Role
            </button>
          )}
          {canDelete && !role.is_system_role && role.user_count === 0 && (
            <button
              onClick={handleDelete}
              className="btn-danger"
              aria-label="Delete role"
            >
              Delete Role
            </button>
          )}
        </div>
      </div>

      <div className="role-content">
        <RoleInfoCard role={role} />
        
        <RolePermissionsCard
          permissions={role.permissions}
          canManage={canManagePermissions}
          onManageClick={handleManagePermissions}
        />
        
        <RoleUsersCard
          roleUuid={roleUuid}
          userCount={role.user_count}
        />
      </div>

      {showPermissionMatrix && (
        <PermissionMatrixModal
          roleUuid={roleUuid}
          currentPermissions={role.permissions}
          onClose={() => setShowPermissionMatrix(false)}
          onSave={() => {
            setShowPermissionMatrix(false);
            loadRoleDetails(); // Refresh
          }}
        />
      )}
    </div>
  );
}
```

#### 2.2.4 Role Form Component

**File**: `frontend/src/pages/RoleManagement/RoleForm.jsx`

```jsx
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { roleAPI } from '../../api/roleAPI';
import { useForm } from '../../hooks/useForm';
import { validateRoleCode } from '../../utils/validation';

export default function RoleForm() {
  const { roleUuid } = useParams();
  const navigate = useNavigate();
  const isEdit = Boolean(roleUuid);
  
  const [loading, setLoading] = useState(false);
  const [existingRole, setExistingRole] = useState(null);

  const {
    values,
    errors,
    touched,
    handleChange,
    handleBlur,
    setValues,
    setFieldError,
    validateForm
  } = useForm({
    initialValues: {
      code: '',
      name: '',
      description: '',
      hierarchy_level: 50
    },
    validationRules: {
      code: {
        required: true,
        pattern: /^[A-Z_]+$/,
        message: 'Code must contain only uppercase letters and underscores'
      },
      name: {
        required: true,
        minLength: 3,
        maxLength: 100
      },
      hierarchy_level: {
        required: true,
        min: 0,
        max: 100
      }
    }
  });

  useEffect(() => {
    if (isEdit) {
      loadRole();
    }
  }, [roleUuid]);

  const loadRole = async () => {
    try {
      const response = await roleAPI.getRoleDetails(roleUuid);
      setExistingRole(response.data);
      setValues({
        code: response.data.code,
        name: response.data.name,
        description: response.data.description || '',
        hierarchy_level: response.data.hierarchy_level
      });
    } catch (error) {
      console.error('Failed to load role:', error);
      navigate('/rbac/roles');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }
    
    setLoading(true);
    try {
      if (isEdit) {
        await roleAPI.updateRole(roleUuid, values);
        // Show success notification
        navigate(`/rbac/roles/${roleUuid}`);
      } else {
        const response = await roleAPI.createRole(values);
        // Show success notification
        navigate(`/rbac/roles/${response.data.uuid}`);
      }
    } catch (error) {
      // Handle specific error codes
      if (error.response?.data?.error?.code === 'DUPLICATE_ROLE_CODE') {
        setFieldError('code', 'A role with this code already exists');
      } else {
        // Show generic error notification
        console.error('Failed to save role:', error);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    navigate(isEdit ? `/rbac/roles/${roleUuid}` : '/rbac/roles');
  };

  const isSystemRole = existingRole?.is_system_role;

  return (
    <div className="role-form-container">
      <h1>{isEdit ? 'Edit Role' : 'Create Role'}</h1>
      
      <form onSubmit={handleSubmit} className="role-form" noValidate>
        <FormField
          label="Code"
          name="code"
          value={values.code}
          error={touched.code && errors.code}
          disabled={isEdit} // Code cannot be changed after creation
          onChange={handleChange}
          onBlur={handleBlur}
          required
          helpText="Unique identifier using uppercase letters and underscores (e.g., HR_MANAGER)"
          aria-describedby="code-help code-error"
        />

        <FormField
          label="Name"
          name="name"
          value={values.name}
          error={touched.name && errors.name}
          onChange={handleChange}
          onBlur={handleBlur}
          required
          helpText="Display name for the role"
          aria-describedby="name-help name-error"
        />

        <FormField
          label="Description"
          name="description"
          type="textarea"
          value={values.description}
          error={touched.description && errors.description}
          onChange={handleChange}
          onBlur={handleBlur}
          rows={3}
          helpText="Brief description of the role's purpose"
          aria-describedby="description-help"
        />

        <FormField
          label="Hierarchy Level"
          name="hierarchy_level"
          type="number"
          min="0"
          max="100"
          value={values.hierarchy_level}
          error={touched.hierarchy_level && errors.hierarchy_level}
          disabled={isSystemRole} // System roles have fixed hierarchy
          onChange={handleChange}
          onBlur={handleBlur}
          required
          helpText="Determines role precedence (0-100). Higher values have more authority."
          aria-describedby="hierarchy-help hierarchy-error"
        />

        <div className="form-actions">
          <button
            type="button"
            onClick={handleCancel}
            className="btn-secondary"
            disabled={loading}
          >
            Cancel
          </button>
          <button
            type="submit"
            className="btn-primary"
            disabled={loading}
            aria-busy={loading}
          >
            {loading ? 'Saving...' : (isEdit ? 'Save Changes' : 'Create Role')}
          </button>
        </div>
      </form>
    </div>
  );
}
```

#### 2.2.5 Permission Matrix Component

**File**: `frontend/src/pages/RoleManagement/PermissionMatrix.jsx`

```jsx
import React, { useState, useEffect } from 'react';
import { roleAPI, permissionAPI, scopeAPI } from '../../api';

export default function PermissionMatrixModal({ 
  roleUuid, 
  currentPermissions = [], 
  onClose, 
  onSave 
}) {
  const [resources, setResources] = useState([]);
  const [permissions, setPermissions] = useState([]);
  const [scopes, setScopes] = useState([]);
  const [selectedPermissions, setSelectedPermissions] = useState(new Map());
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    // Initialize selected permissions from current role permissions
    const permissionMap = new Map();
    currentPermissions.forEach(perm => {
      permissionMap.set(perm.uuid, {
        selected: true,
        scopeUuid: perm.scope?.uuid || null
      });
    });
    setSelectedPermissions(permissionMap);
  }, [currentPermissions]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [permsResponse, scopesResponse] = await Promise.all([
        permissionAPI.getAllPermissions(),
        scopeAPI.getAllScopes()
      ]);
      
      // permsResponse.data is grouped by resource
      setPermissions(permsResponse.data);
      setScopes(scopesResponse.data);
    } catch (error) {
      console.error('Failed to load permission data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handlePermissionToggle = (permissionUuid, requiresScope) => {
    setSelectedPermissions(prev => {
      const newMap = new Map(prev);
      const current = newMap.get(permissionUuid);
      
      if (current?.selected) {
        // Unselect
        newMap.delete(permissionUuid);
      } else {
        // Select with default scope if required
        newMap.set(permissionUuid, {
          selected: true,
          scopeUuid: requiresScope ? scopes[scopes.length - 1]?.uuid : null
        });
      }
      
      return newMap;
    });
  };

  const handleScopeChange = (permissionUuid, scopeUuid) => {
    setSelectedPermissions(prev => {
      const newMap = new Map(prev);
      const current = newMap.get(permissionUuid);
      if (current) {
        newMap.set(permissionUuid, {
          ...current,
          scopeUuid
        });
      }
      return newMap;
    });
  };

  const handleSelectAllResource = (resourcePermissions) => {
    setSelectedPermissions(prev => {
      const newMap = new Map(prev);
      resourcePermissions.forEach(perm => {
        if (!newMap.has(perm.uuid)) {
          newMap.set(perm.uuid, {
            selected: true,
            scopeUuid: perm.requires_scope ? scopes[scopes.length - 1]?.uuid : null
          });
        }
      });
      return newMap;
    });
  };

  const handleDeselectAllResource = (resourcePermissions) => {
    setSelectedPermissions(prev => {
      const newMap = new Map(prev);
      resourcePermissions.forEach(perm => {
        newMap.delete(perm.uuid);
      });
      return newMap;
    });
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      // Build permission assignments array
      const assignments = Array.from(selectedPermissions.entries()).map(
        ([permissionUuid, config]) => ({
          permission_uuid: permissionUuid,
          data_scope_uuid: config.scopeUuid
        })
      );
      
      // Replace all permissions atomically
      await roleAPI.replacePermissions(roleUuid, { permissions: assignments });
      
      // Show success notification
      onSave();
    } catch (error) {
      console.error('Failed to save permissions:', error);
      // Show error notification
    } finally {
      setSaving(false);
    }
  };

  const filteredPermissions = searchTerm
    ? permissions.map(resource => ({
        ...resource,
        permissions: resource.permissions.filter(perm =>
          perm.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          perm.code.toLowerCase().includes(searchTerm.toLowerCase())
        )
      })).filter(resource => resource.permissions.length > 0)
    : permissions;

  if (loading) {
    return (
      <Modal onClose={onClose}>
        <LoadingSpinner />
      </Modal>
    );
  }

  return (
    <Modal onClose={onClose} size="large" aria-labelledby="permission-matrix-title">
      <div className="permission-matrix">
        <div className="matrix-header">
          <h2 id="permission-matrix-title">Manage Permissions</h2>
          <SearchBar
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search permissions..."
            aria-label="Search permissions"
          />
        </div>

        <div className="matrix-content">
          {filteredPermissions.map(resource => {
            const resourcePermissions = resource.permissions;
            const selectedCount = resourcePermissions.filter(
              p => selectedPermissions.has(p.uuid)
            ).length;
            const allSelected = selectedCount === resourcePermissions.length;

            return (
              <div key={resource.code} className="resource-section">
                <div className="resource-header">
                  <h3>{resource.name}</h3>
                  <div className="resource-actions">
                    <span className="permission-count">
                      {selectedCount} of {resourcePermissions.length} selected
                    </span>
                    {allSelected ? (
                      <button
                        onClick={() => handleDeselectAllResource(resourcePermissions)}
                        className="btn-link"
                        aria-label={`Deselect all ${resource.name} permissions`}
                      >
                        Deselect All
                      </button>
                    ) : (
                      <button
                        onClick={() => handleSelectAllResource(resourcePermissions)}
                        className="btn-link"
                        aria-label={`Select all ${resource.name} permissions`}
                      >
                        Select All
                      </button>
                    )}
                  </div>
                </div>

                <div className="permission-list">
                  {resourcePermissions.map(permission => {
                    const isSelected = selectedPermissions.has(permission.uuid);
                    const config = selectedPermissions.get(permission.uuid);

                    return (
                      <div
                        key={permission.uuid}
                        className={`permission-item ${permission.is_sensitive ? 'sensitive' : ''}`}
                      >
                        <label className="permission-checkbox">
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => handlePermissionToggle(
                              permission.uuid,
                              permission.requires_scope
                            )}
                            aria-describedby={`perm-${permission.uuid}-desc`}
                          />
                          <span className="permission-name">
                            {permission.name}
                            {permission.is_sensitive && (
                              <Badge variant="warning" aria-label="Sensitive permission">
                                Sensitive
                              </Badge>
                            )}
                          </span>
                        </label>
                        
                        <p
                          id={`perm-${permission.uuid}-desc`}
                          className="permission-description"
                        >
                          {permission.description}
                        </p>

                        {isSelected && permission.requires_scope && (
                          <div className="scope-selector">
                            <label htmlFor={`scope-${permission.uuid}`}>
                              Data Scope:
                            </label>
                            <select
                              id={`scope-${permission.uuid}`}
                              value={config?.scopeUuid || ''}
                              onChange={(e) => handleScopeChange(
                                permission.uuid,
                                e.target.value
                              )}
                              aria-label={`Data scope for ${permission.name}`}
                            >
                              {scopes.map(scope => (
                                <option key={scope.uuid} value={scope.uuid}>
                                  {scope.name}
                                </option>
                              ))}
                            </select>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>

        <div className="matrix-actions">
          <button
            onClick={onClose}
            className="btn-secondary"
            disabled={saving}
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            className="btn-primary"
            disabled={saving}
            aria-busy={saving}
          >
            {saving ? 'Saving...' : 'Save Permissions'}
          </button>
        </div>
      </div>
    </Modal>
  );
}
```

## 3. Data Models

### 3.1 Database Schema

The RBAC database schema is already defined in `ADD_RBAC_TABLES.sql`. Key tables:

**Roles**
```sql
- id (INT, PK, AUTO_INCREMENT)
- uuid (VARCHAR(36), UNIQUE)
- code (VARCHAR(50), UNIQUE)
- name (VARCHAR(200))
- description (TEXT)
- hierarchy_level (INT)
- is_system_role (TINYINT(1))
- is_active (TINYINT(1))
- created_at (DATETIME)
- updated_at (DATETIME)
```

**Resources**
```sql
- id (INT, PK, AUTO_INCREMENT)
- uuid (VARCHAR(36), UNIQUE)
- code (VARCHAR(100), UNIQUE)
- name (VARCHAR(200))
- description (TEXT)
- display_order (INT)
- is_active (TINYINT(1))
- created_at (DATETIME)
- updated_at (DATETIME)
```

**Permissions**
```sql
- id (INT, PK, AUTO_INCREMENT)
- uuid (VARCHAR(36), UNIQUE)
- resource_uuid (VARCHAR(36), FK -> Resources.uuid)
- code (VARCHAR(100), UNIQUE) -- Format: Resource.Action
- name (VARCHAR(200))
- action (VARCHAR(50))
- description (TEXT)
- requires_scope (TINYINT(1))
- is_sensitive (TINYINT(1))
- display_order (INT)
- is_active (TINYINT(1))
- created_at (DATETIME)
- updated_at (DATETIME)
```

**DataScopes**
```sql
- id (INT, PK, AUTO_INCREMENT)
- uuid (VARCHAR(36), UNIQUE)
- code (VARCHAR(50), UNIQUE)
- name (VARCHAR(100))
- scope_type (VARCHAR(50))
- description (TEXT)
- hierarchy_level (INT)
- is_active (TINYINT(1))
- created_at (DATETIME)
- updated_at (DATETIME)
```

**Role_Permissions**
```sql
- id (INT, PK, AUTO_INCREMENT)
- uuid (VARCHAR(36), UNIQUE)
- role_uuid (VARCHAR(36), FK -> Roles.uuid)
- permission_uuid (VARCHAR(36), FK -> Permissions.uuid)
- granted_by (VARCHAR(36))
- created_at (DATETIME)
- UNIQUE(role_uuid, permission_uuid)
```

**Role_Permission_Scopes**
```sql
- id (INT, PK, AUTO_INCREMENT)
- uuid (VARCHAR(36), UNIQUE)
- role_uuid (VARCHAR(36), FK -> Roles.uuid)
- permission_uuid (VARCHAR(36), FK -> Permissions.uuid)
- data_scope_uuid (VARCHAR(36), FK -> DataScopes.uuid)
- scope_configuration (JSON)
- created_at (DATETIME)
- UNIQUE(role_uuid, permission_uuid)
```

**AuthorizationAuditLogs**
```sql
- id (INT, PK, AUTO_INCREMENT)
- uuid (VARCHAR(36), UNIQUE)
- action_type (VARCHAR(50))
- actor_user_uuid (VARCHAR(36))
- target_user_uuid (VARCHAR(36), NULL)
- target_role_uuid (VARCHAR(36), NULL)
- target_permission_uuid (VARCHAR(36), NULL)
- details (TEXT)
- ip_address (VARCHAR(45))
- user_agent (VARCHAR(500))
- created_at (DATETIME)
```

### 3.2 Data Flow Diagrams

#### Role Creation Flow

```
User -> RoleForm -> POST /api/rbac/roles -> RoleController.createRole()
                                              |
                                              v
                                        RBACService.createRole()
                                              |
                                              +-> Validate code format
                                              +-> Check duplicate code
                                              +-> Generate UUID
                                              +-> Insert into Roles table
                                              +-> AuditService.logRoleCreated()
                                              |
                                              v
                                        Return created role
                                              |
                                              v
User <- RoleDetailView <- JSON Response <- RoleController
```

#### Permission Assignment Flow

```
User -> PermissionMatrix -> POST /api/rbac/roles/:uuid/permissions/bulk
                                              |
                                              v
                                    RoleController.bulkAssignPermissions()
                                              |
                                              v
                                    RBACService.bulkAssignPermissions()
                                              |
                                              +-> START TRANSACTION
                                              +-> Validate role exists
                                              +-> Validate all permissions exist
                                              +-> Check for duplicates
                                              +-> Batch INSERT Role_Permissions
                                              +-> Batch INSERT Role_Permission_Scopes
                                              +-> AuditService.logPermissionAssigned()
                                              +-> COMMIT TRANSACTION
                                              |
                                              v
                                        Return success
                                              |
                                              v
User <- PermissionMatrix <- JSON Response <- RoleController
        (refresh role details)
```

## 4. API Endpoints

### 4.1 RESTful API Design

Base path: `/api/rbac`

#### Role Management Endpoints

| Method | Endpoint | Description | Permissions Required |
|--------|----------|-------------|---------------------|
| GET | /roles | List all roles | Roles.View |
| GET | /roles/:uuid | Get role details | Roles.View |
| POST | /roles | Create new role | Roles.Create |
| PUT | /roles/:uuid | Update role | Roles.Update |
| DELETE | /roles/:uuid | Delete role (soft) | Roles.Delete |
| PATCH | /roles/:uuid/status | Activate/deactivate role | Roles.Update |
| GET | /roles/:uuid/users | Get users assigned to role | Roles.View, Accounts.View |

#### Permission Management Endpoints

| Method | Endpoint | Description | Permissions Required |
|--------|----------|-------------|---------------------|
| GET | /permissions | List all permissions | Roles.View |
| POST | /roles/:roleUuid/permissions | Assign single permission | Roles.AssignPermissions |
| DELETE | /roles/:roleUuid/permissions/:permUuid | Remove permission | Roles.AssignPermissions |
| POST | /roles/:roleUuid/permissions/bulk | Bulk assign permissions | Roles.AssignPermissions |
| PUT | /roles/:roleUuid/permissions | Replace all permissions | Roles.AssignPermissions |

#### Scope Management Endpoints

| Method | Endpoint | Description | Permissions Required |
|--------|----------|-------------|---------------------|
| GET | /scopes | List all data scopes | Roles.View |
| POST | /roles/:roleUuid/permissions/:permUuid/scope | Assign scope | Roles.AssignPermissions |
| DELETE | /roles/:roleUuid/permissions/:permUuid/scope | Remove scope | Roles.AssignPermissions |

#### User Role Assignment Endpoints

| Method | Endpoint | Description | Permissions Required |
|--------|----------|-------------|---------------------|
| PUT | /users/:userUuid/role | Assign role to user | Accounts.Update |

#### Audit Endpoints

| Method | Endpoint | Description | Permissions Required |
|--------|----------|-------------|---------------------|
| GET | /audit-logs | Get RBAC audit logs | AuditLogs.View |

## 5. Error Handling Strategy

### 5.1 Error Response Format

All errors follow a consistent format:

```javascript
{
  success: false,
  error: {
    code: "ERROR_CODE",
    message: "Human-readable error message",
    field: "fieldName", // Optional, for validation errors
    details: { } // Optional, additional context
  }
}
```

### 5.2 Error Codes

| Code | HTTP Status | Description |
|------|-------------|-------------|
| VALIDATION_ERROR | 400 | Invalid input data |
| INVALID_ROLE_CODE | 400 | Role code format invalid |
| DUPLICATE_ROLE_CODE | 409 | Role code already exists |
| ROLE_NOT_FOUND | 404 | Role UUID not found |
| PERMISSION_NOT_FOUND | 404 | Permission UUID not found |
| SCOPE_NOT_FOUND | 404 | Scope UUID not found |
| SYSTEM_ROLE_PROTECTED | 403 | Cannot modify/delete system role |
| HIERARCHY_VIOLATION | 403 | Cannot modify higher hierarchy role |
| ROLE_HAS_USERS | 409 | Cannot delete role with assigned users |
| INSUFFICIENT_PERMISSIONS | 403 | User lacks required permissions |
| UNAUTHORIZED | 401 | Not authenticated |
| SESSION_EXPIRED | 401 | JWT expired |
| DUPLICATE_PERMISSION | 409 | Permission already assigned |
| SCOPE_REQUIRED | 400 | Permission requires scope |
| TRANSACTION_FAILED | 500 | Database transaction failed |
| INTERNAL_ERROR | 500 | Unexpected server error |

### 5.3 Error Handling Implementation

**Backend Error Handler**

```javascript
// middleware/errorHandler.js
function errorHandler(err, req, res, next) {
  console.error('Error:', err);
  
  // Default error response
  let statusCode = 500;
  let errorResponse = {
    success: false,
    error: {
      code: 'INTERNAL_ERROR',
      message: 'An unexpected error occurred'
    }
  };
  
  // Map specific errors
  if (err.name === 'ValidationError') {
    statusCode = 400;
    errorResponse.error = {
      code: 'VALIDATION_ERROR',
      message: err.message,
      field: err.field
    };
  } else if (err.code === 'ER_DUP_ENTRY') {
    statusCode = 409;
    errorResponse.error = {
      code: 'DUPLICATE_ROLE_CODE',
      message: 'A role with this code already exists'
    };
  } else if (err.name === 'NotFoundError') {
    statusCode = 404;
    errorResponse.error = {
      code: err.code || 'NOT_FOUND',
      message: err.message
    };
  } else if (err.name === 'ForbiddenError') {
    statusCode = 403;
    errorResponse.error = {
      code: err.code || 'FORBIDDEN',
      message: err.message
    };
  }
  
  res.status(statusCode).json(errorResponse);
}
```

**Frontend Error Handler**

```javascript
// utils/errorHandler.js
export function handleAPIError(error, showNotification) {
  if (!error.response) {
    // Network error
    showNotification('Network error. Please check your connection.', 'error');
    return;
  }
  
  const { error: errorData } = error.response.data;
  
  // Map error codes to user-friendly messages
  const messages = {
    INSUFFICIENT_PERMISSIONS: 'You do not have permission to perform this action.',
    SESSION_EXPIRED: 'Your session has expired. Please log in again.',
    DUPLICATE_ROLE_CODE: 'A role with this code already exists.',
    ROLE_HAS_USERS: `Cannot delete role: ${errorData.details?.user_count} users are assigned to it.`,
    SYSTEM_ROLE_PROTECTED: 'System roles cannot be deleted or modified in this way.'
  };
  
  const message = messages[errorData.code] || errorData.message || 'An error occurred';
  showNotification(message, 'error');
  
  // Handle session expiration
  if (errorData.code === 'SESSION_EXPIRED') {
    setTimeout(() => {
      window.location.href = '/login';
    }, 2000);
  }
}
```

## 6. Security Considerations

### 6.1 Authentication & Authorization

- **JWT-based authentication**: All requests require valid JWT token
- **Permission-based authorization**: Every endpoint protected by specific permissions
- **Role hierarchy enforcement**: Users cannot modify roles with higher hierarchy than their own
- **System role protection**: System roles cannot be deleted and have restricted modifications

### 6.2 Input Validation

- **Role code format**: Enforced regex pattern `/^[A-Z_]+$/`
- **UUID validation**: All UUID parameters validated before use
- **SQL injection prevention**: Parameterized queries used throughout
- **XSS prevention**: React automatically escapes content

### 6.3 Audit Logging

- **Complete audit trail**: All CRUD operations logged with actor, timestamp, IP, user agent
- **Immutable logs**: Audit logs cannot be deleted or modified
- **Retention policy**: Logs retained indefinitely for compliance

### 6.4 Rate Limiting

```javascript
// middleware/rateLimiter.js
const rateLimit = require('express-rate-limit');

const rbacLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per window
  message: {
    success: false,
    error: {
      code: 'RATE_LIMIT_EXCEEDED',
      message: 'Too many requests, please try again later'
    }
  }
});

module.exports = { rbacLimiter };
```

## 7. Performance Optimization

### 7.1 Backend Optimizations

- **Database indexing**: Indexes on UUID, code, and foreign key columns
- **Query optimization**: Joins minimized, eager loading used where appropriate
- **Transaction batching**: Bulk operations use single transactions
- **Connection pooling**: MySQL connection pool configured for concurrent requests

### 7.2 Frontend Optimizations

- **Component memoization**: React.memo used for expensive components
- **Lazy loading**: Permission matrix loaded on demand
- **Debounced search**: Search input debounced to reduce API calls
- **Optimistic updates**: UI updated immediately with rollback on failure
- **Caching**: Permission and resource metadata cached in browser for 5 minutes

### 7.3 Caching Strategy

```javascript
// Frontend cache implementation
class CacheService {
  constructor() {
    this.cache = new Map();
    this.ttl = 5 * 60 * 1000; // 5 minutes
  }
  
  set(key, value) {
    this.cache.set(key, {
      value,
      timestamp: Date.now()
    });
  }
  
  get(key) {
    const cached = this.cache.get(key);
    if (!cached) return null;
    
    const age = Date.now() - cached.timestamp;
    if (age > this.ttl) {
      this.cache.delete(key);
      return null;
    }
    
    return cached.value;
  }
  
  clear() {
    this.cache.clear();
  }
}

export const cache = new CacheService();
```

## 8. Accessibility Implementation

### 8.1 WCAG 2.1 AA Compliance

- **Keyboard navigation**: All interactive elements accessible via keyboard
- **Focus management**: Visible focus indicators with 3px outline
- **Screen reader support**: ARIA labels, roles, and live regions
- **Color contrast**: Minimum 4.5:1 for normal text, 3:1 for large text
- **Semantic HTML**: Proper heading hierarchy, landmarks, tables
- **Form labels**: All inputs have associated labels
- **Error announcements**: Form errors announced to screen readers

### 8.2 Responsive Design Breakpoints

```css
/* Mobile first approach */
.role-list-view {
  /* Base styles for mobile (320px+) */
}

@media (min-width: 768px) {
  /* Tablet styles */
  .role-table {
    display: table;
  }
}

@media (min-width: 1024px) {
  /* Desktop styles */
  .permission-matrix {
    grid-template-columns: repeat(2, 1fr);
  }
}

@media (min-width: 1440px) {
  /* Large desktop styles */
  .role-detail-view {
    max-width: 1400px;
    margin: 0 auto;
  }
}
```

### 8.3 Touch Target Sizing

```css
/* Minimum 44x44 pixels for touch targets */
.btn-primary, .btn-secondary, .btn-danger {
  min-height: 44px;
  min-width: 44px;
  padding: 12px 24px;
}

.checkbox-input {
  width: 24px;
  height: 24px;
  margin: 10px; /* Total interactive area 44x44 */
}
```

## 9. Testing Strategy

### 9.1 Backend Unit Tests

Test files located in `backend/__tests__/`

**RBACService Tests**

```javascript
describe('RBACService', () => {
  describe('createRole', () => {
    it('should create role with valid data', async () => {
      const roleData = {
        code: 'TEST_ROLE',
        name: 'Test Role',
        description: 'Test',
        hierarchy_level: 50
      };
      
      const role = await rbacService.createRole(roleData, actorUuid);
      
      expect(role.uuid).toBeDefined();
      expect(role.code).toBe('TEST_ROLE');
      expect(role.is_system_role).toBe(false);
    });
    
    it('should reject invalid code format', async () => {
      const roleData = {
        code: 'test-role', // lowercase not allowed
        name: 'Test Role'
      };
      
      await expect(
        rbacService.createRole(roleData, actorUuid)
      ).rejects.toThrow('Invalid role code format');
    });
    
    it('should reject duplicate code', async () => {
      const roleData = {
        code: 'DUPLICATE',
        name: 'First'
      };
      
      await rbacService.createRole(roleData, actorUuid);
      
      await expect(
        rbacService.createRole(roleData, actorUuid)
      ).rejects.toThrow('Role code already exists');
    });
  });
  
  describe('deleteRole', () => {
    it('should soft delete custom role with no users', async () => {
      const role = await rbacService.createRole({
        code: 'DELETE_ME',
        name: 'Delete Me'
      }, actorUuid);
      
      await rbacService.deleteRole(role.uuid, actorUuid);
      
      const deleted = await rbacService.findRoleByUuid(role.uuid);
      expect(deleted.is_active).toBe(false);
    });
    
    it('should prevent deleting system role', async () => {
      const systemRoleUuid = 'system-role-uuid';
      
      await expect(
        rbacService.deleteRole(systemRoleUuid, actorUuid)
      ).rejects.toThrow('Cannot delete system role');
    });
    
    it('should prevent deleting role with users', async () => {
      const roleWithUsers = await createRoleWithUsers();
      
      await expect(
        rbacService.deleteRole(roleWithUsers.uuid, actorUuid)
      ).rejects.toThrow('Cannot delete role with assigned users');
    });
  });
});
```

### 9.2 Frontend Component Tests

Test files located in `frontend/src/test/`

**RoleListView Tests**

```javascript
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import RoleListView from '../pages/RoleManagement/RoleListView';

describe('RoleListView', () => {
  it('should render role list', async () => {
    const mockRoles = [
      { uuid: '1', code: 'ADMIN', name: 'Administrator', user_count: 3 },
      { uuid: '2', code: 'USER', name: 'User', user_count: 50 }
    ];
    
    jest.spyOn(roleAPI, 'getAllRoles').mockResolvedValue({
      data: mockRoles
    });
    
    render(<RoleListView />);
    
    await waitFor(() => {
      expect(screen.getByText('Administrator')).toBeInTheDocument();
      expect(screen.getByText('User')).toBeInTheDocument();
    });
  });
  
  it('should filter roles by search term', async () => {
    render(<RoleListView />);
    
    const searchInput = screen.getByPlaceholderText('Search roles...');
    await userEvent.type(searchInput, 'admin');
    
    await waitFor(() => {
      expect(screen.getByText('Administrator')).toBeInTheDocument();
      expect(screen.queryByText('User')).not.toBeInTheDocument();
    });
  });
  
  it('should navigate to role detail on row click', async () => {
    const navigate = jest.fn();
    jest.spyOn(require('react-router-dom'), 'useNavigate').mockReturnValue(navigate);
    
    render(<RoleListView />);
    
    const roleRow = await screen.findByText('Administrator');
    await userEvent.click(roleRow);
    
    expect(navigate).toHaveBeenCalledWith('/rbac/roles/1');
  });
});
```

### 9.3 Integration Tests

**Permission Assignment Integration Test**

```javascript
describe('Permission Assignment Integration', () => {
  it('should assign permissions with scopes', async () => {
    // Create role
    const role = await request(app)
      .post('/api/rbac/roles')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        code: 'TEST_MANAGER',
        name: 'Test Manager',
        hierarchy_level: 60
      });
    
    const roleUuid = role.body.data.uuid;
    
    // Get permissions
    const perms = await request(app)
      .get('/api/rbac/permissions')
      .set('Authorization', `Bearer ${adminToken}`);
    
    const employeeViewPerm = perms.body.data
      .find(r => r.code === 'Employees')
      .permissions
      .find(p => p.action === 'View');
    
    // Get scopes
    const scopes = await request(app)
      .get('/api/rbac/scopes')
      .set('Authorization', `Bearer ${adminToken}`);
    
    const deptScope = scopes.body.data.find(s => s.code === 'DEPARTMENT');
    
    // Assign permission with scope
    const assignment = await request(app)
      .post(`/api/rbac/roles/${roleUuid}/permissions`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        permission_uuid: employeeViewPerm.uuid,
        data_scope_uuid: deptScope.uuid
      });
    
    expect(assignment.status).toBe(200);
    
    // Verify assignment
    const roleDetails = await request(app)
      .get(`/api/rbac/roles/${roleUuid}`)
      .set('Authorization', `Bearer ${adminToken}`);
    
    const assignedPerm = roleDetails.body.data.permissions
      .find(p => p.uuid === employeeViewPerm.uuid);
    
    expect(assignedPerm).toBeDefined();
    expect(assignedPerm.scope.code).toBe('DEPARTMENT');
  });
});
```

## 10. Migration and Legacy Code Cleanup

### 10.1 Migration Strategy

1. **Phase 1: Deploy Unified System**
   - Deploy new unified roleController alongside legacy controllers
   - Add feature flag to switch between implementations
   - Test unified system in staging environment

2. **Phase 2: Gradual Migration**
   - Update frontend to use new API endpoints
   - Keep legacy endpoints active with deprecation warnings
   - Monitor for errors and edge cases

3. **Phase 3: Legacy Cleanup**
   - Remove unused functions from legacy controllers
   - Remove deprecated routes
   - Update all import statements
   - Remove feature flags

4. **Phase 4: Verification**
   - Run automated tests to verify no broken references
   - Perform manual testing of all role management features
   - Review audit logs to ensure logging is complete

### 10.2 Files to Clean Up

**Backend Files:**
- `controllers/moduleRoleController.js` - Remove or rename
- `routes/moduleRoleRoutes.js` - Remove duplicate routes
- Update imports in `app.js` or main server file

**Frontend Files:**
- Remove any components in `pages/ModuleRoles/` if separate from main RBAC UI
- Update imports in routing configuration
- Remove duplicate API client functions

### 10.3 Deprecation Comments

Add comments to legacy code during transition:

```javascript
/**
 * @deprecated Use unified roleController instead
 * This function will be removed in version 2.0
 * Migration path: Use roleController.createRole()
 */
function oldCreateRole() {
  // ... legacy implementation
}
```

## 11. Deployment Checklist

- [ ] Database schema deployed (run ADD_RBAC_TABLES.sql)
- [ ] Backend services deployed with unified controller
- [ ] Frontend build deployed with new role management UI
- [ ] Feature flags configured (if using gradual rollout)
- [ ] Environment variables set (.env configuration)
- [ ] Database indexes verified
- [ ] Initial system roles and permissions seeded
- [ ] Audit logging verified
- [ ] Permission checks tested on all endpoints
- [ ] Error handling tested with invalid inputs
- [ ] Performance benchmarks met (<1s for role list, <2s for permission matrix)
- [ ] Accessibility audit passed (WCAG 2.1 AA)
- [ ] Browser compatibility tested (Chrome, Firefox, Safari, Edge)
- [ ] Mobile responsive design verified
- [ ] Documentation updated
- [ ] Training materials prepared for administrators
- [ ] Rollback plan documented

## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system-essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

### Property 1: Role Code Validation

For any role code submitted for creation or validation, the system SHALL accept the code if and only if it matches the pattern of uppercase letters and underscores, ensuring consistent role identifier formatting across the system.

**Validates: Requirements 1.3**

### Property 2: Role UUID Uniqueness

For any set of roles created within the system, each role SHALL have a unique UUID that is never reused, ensuring unambiguous identification of roles throughout their lifecycle.

**Validates: Requirements 1.4**

### Property 3: Role Update Immutability

For any role update operation, the system SHALL preserve the role's code and is_system_role status regardless of the update payload, ensuring core identity attributes remain constant after creation.

**Validates: Requirements 1.5**

### Property 4: System Role Protection

For any role where is_system_role is TRUE, the system SHALL reject deletion operations and reject updates to hierarchy_level, ensuring system-critical roles cannot be removed or have their authority level changed.

**Validates: Requirements 1.6**

### Property 5: Soft Delete Verification

For any deletion request on a custom role, the system SHALL set is_active to FALSE rather than removing the database record, and SHALL reject the deletion if any users are currently assigned to the role, ensuring role history is preserved and user access is not disrupted.

**Validates: Requirements 1.7**

### Property 6: Duplicate Code Rejection

For any role creation request, if a role with the submitted code already exists in the database, the system SHALL reject the request with a duplicate error response, ensuring role code uniqueness.

**Validates: Requirements 1.8**

### Property 7: CRUD Audit Completeness

For any role creation, update, or deletion operation, the system SHALL create a corresponding record in AuthorizationAuditLogs containing the action type, actor UUID, and timestamp, ensuring complete audit trail coverage.

**Validates: Requirements 1.9**

### Property 8: Permission Grouping by Resource

For any request for available permissions, the system SHALL return all Permission_Entity records grouped by their associated Resource_Entity, with each group sorted by display_order, ensuring permissions are organized logically for assignment interfaces.

**Validates: Requirements 2.1**

### Property 9: Permission Assignment Recording

For any successful permission assignment to a role, the system SHALL create a Role_Permission_Association record with the granted_by field populated with the actor's UUID, ensuring permission grants are traceable to their authorizer.

**Validates: Requirements 2.2**

### Property 10: Permission Removal Cleanup

For any permission removal operation, the system SHALL delete both the Role_Permission_Association and any related Role_Permission_Scope_Association records, ensuring complete cleanup of permission configuration.

**Validates: Requirements 2.3**

### Property 11: Scoped Permission Requirement

For any permission where requires_scope is TRUE, that permission SHALL only become effective when a corresponding DataScope_Entity is assigned through Role_Permission_Scopes, ensuring data access boundaries are enforced.

**Validates: Requirements 2.6**

### Property 12: Permission Assignment Uniqueness

For any role-permission combination, the system SHALL prevent creation of duplicate Role_Permission_Association records through the unique constraint, ensuring each permission is assigned at most once per role.

**Validates: Requirements 2.7**

### Property 13: Permission Modification Audit

For any permission assignment or removal operation, the system SHALL create an audit log entry with action_type set to PERMISSION_ASSIGNED or PERMISSION_REMOVED respectively, ensuring permission changes are tracked.

**Validates: Requirements 2.8**

### Property 14: Scope Hierarchy Ordering

For any request for available data scopes, the system SHALL return all DataScope_Entity records ordered by hierarchy_level in descending order, ensuring broader scopes appear first in selection interfaces.

**Validates: Requirements 3.1**

### Property 15: Default Scope Assignment

For any permission with requires_scope TRUE that is assigned without an explicit DataScope_Entity, the system SHALL automatically assign the scope with the lowest hierarchy_level value, ensuring a safe default access boundary.

**Validates: Requirements 3.3**

### Property 16: Scope Assignment Replacement

For any scope update operation on a role-permission combination, the system SHALL replace the existing Role_Permission_Scope_Association with the new DataScope_Entity rather than creating additional records, ensuring one scope per permission.

**Validates: Requirements 3.4**

### Property 17: Scope Association Uniqueness

For any role-permission combination, the system SHALL enforce exactly one DataScope_Entity assignment through the unique constraint uk_role_perm_scope, ensuring unambiguous data access boundaries.

**Validates: Requirements 3.6**

### Property 18: Scope Configuration Storage

For any scope assignment where scope_configuration JSON is provided, the system SHALL store the configuration in the Role_Permission_Scope_Association record without modification, enabling extended scope constraints.

**Validates: Requirements 3.7**

### Property 19: Scope Modification Audit

For any scope assignment or removal operation, the system SHALL create an audit log entry with action_type set to SCOPE_ASSIGNED or SCOPE_REMOVED respectively, ensuring scope changes are tracked.

**Validates: Requirements 3.8**

### Property 20: User Role Assignment Update

For any role assignment to a user, the system SHALL update the user's role_uuid field in the Users table to reference the assigned role, ensuring the user's effective permissions are determined by the new role.

**Validates: Requirements 4.1**

### Property 21: Role Assignment Validation

For any role assignment operation, the system SHALL verify that the target Role_Entity exists and has is_active set to TRUE before updating the user's role_uuid, preventing assignment of invalid or inactive roles.

**Validates: Requirements 4.6**

### Property 22: Role Assignment Audit

For any successful role assignment to a user, the system SHALL create an audit log entry with action_type ROLE_ASSIGNED, actor_user_uuid, and target_user_uuid, ensuring role changes are traceable.

**Validates: Requirements 4.5**

### Property 23: Role User Retrieval Accuracy

For any query for users assigned to a specific role, the system SHALL return all and only those user records where role_uuid matches the queried role's UUID, ensuring accurate role membership reporting.

**Validates: Requirements 4.3**

### Property 24: Error Response Consistency

For any operation that fails due to validation, authorization, or constraint violations, the system SHALL return a response with success: false and an error object containing code and message fields, ensuring consistent error handling across all endpoints.

**Validates: Requirements 11.1, 11.2, 11.3, 11.4, 11.5, 11.6**

### Property 25: Permission Enforcement

For any protected endpoint in the role management system, the system SHALL verify the authenticated user possesses the required permission(s) before allowing the operation to proceed, returning 403 Forbidden if the check fails, ensuring authorization is enforced consistently.

**Validates: Requirements 13.6, 13.7, 13.8, 13.9, 13.10, 13.11**

## 12. Conclusion

This design document provides a comprehensive blueprint for implementing the unified Role Management Module for the Mesob HRMS system. The architecture consolidates legacy implementations into a modern, maintainable system with:

- **Clear separation of concerns** across backend layers
- **Comprehensive security** with permission-based access control
- **Exceptional UI/UX** with accessible, responsive interfaces
- **Complete audit trail** for compliance and security
- **Robust error handling** with user-friendly messages
- **Performance optimization** for responsive user experience
- **Thorough testing strategy** covering unit, integration, and UI tests

The implementation follows industry best practices for RBAC systems while being tailored to the specific needs of the HRMS domain. The correctness properties provide formal specifications that can be validated through property-based testing, ensuring the system behaves correctly across all input scenarios.
