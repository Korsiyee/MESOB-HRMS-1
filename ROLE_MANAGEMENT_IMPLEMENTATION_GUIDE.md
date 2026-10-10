# Complete Role Management Implementation Guide

## Overview

This guide provides step-by-step instructions to implement a complete role management system with full CRUD operations, permission assignment, data scope management, and frontend-backend synchronization.

## Current System Status

### ✅ What's Already Working

1. **Database Schema**: Complete permission-based RBAC schema defined in `database/ADD_RBAC_TABLES.sql`
   - Resources, Permissions, Role_Permissions, DataScopes, Role_Permission_Scopes, Roles

2. **Backend Services**:
   - `rbacService.js`: Permission checking, scope resolution, caching
   - `roleManagementService.js`: Role CRUD, permission assignment
   - `authorize.js` middleware: Route protection with permissions

3. **Backend API**:
   - `roleManagementController.js`: Complete role management endpoints
   - Routes defined in `backend/src/routes/roleManagementRoutes.js`

4. **Frontend**:
   - `RoleManagementPage.jsx`: Basic role listing UI
   - `roleManagement.js` API client: Complete API wrapper

### ⚠️ Critical Issues to Fix

1. **Table Naming Inconsistency**: `Role_Permissions` vs `RolePermissions`
2. **Missing Frontend Components**: Permission Matrix, Role Form, Role Detail View
3. **Incomplete Integration**: Frontend doesn't fully sync with backend permissions

---

## Implementation Steps

### Phase 1: Database Setup (CRITICAL - Do This First)

#### Step 1.1: Start MySQL/MariaDB

```bash
# Check if MySQL is running
systemctl status mysql
# OR
systemctl status mariadb

# If not running, start it
sudo systemctl start mysql
# OR
sudo systemctl start mariadb
```

#### Step 1.2: Verify Database Connection

```bash
cd backend
node scripts/checkDatabase.js
```

Expected output should show:
- ✅ Database connection successful
- Status of all RBAC tables

#### Step 1.3: Fix Table Naming (If Needed)

If `checkDatabase.js` shows `RolePermissions` without underscore exists:

```bash
cd backend
mysql -u mesob -pmesob_password mesob_hrms < ../database/FIX_ROLE_PERMISSIONS_NOW.sql
```

#### Step 1.4: Seed RBAC Tables (If Empty)

```bash
cd backend
mysql -u mesob -pmesob_password mesob_hrms < ../database/ADD_RBAC_TABLES.sql
```

This creates and seeds:
- 10 Resources (Employees, Attendance, Leave, etc.)
- 33 Permissions (Employees.View, Attendance.Create, etc.)
- 4 DataScopes (ALL, ORGANIZATION, DEPARTMENT, OWN)
- Assigns all permissions to SUPER_ADMIN role

#### Step 1.5: Verify Seeding

```bash
cd backend
node scripts/checkDatabase.js
```

Should show:
- Resources: ~10 rows
- Permissions: ~33 rows
- DataScopes: 4 rows
- Role_Permissions: ~33 rows (SUPER_ADMIN permissions)

---

### Phase 2: Complete Backend Implementation

#### Step 2.1: Verify roleManagementService.js

Check if these methods exist and are complete:

```javascript
// backend/src/services/roleManagementService.js
getRoleWithDetails(roleUuid)  // Returns role with permissions and scopes
getUsersByRole(roleUuid)      // Returns users assigned to role
assignRoleToUser(userUuid, roleUuid, assignedBy)  // Assigns role to user
removeScopeFromRolePermission(roleUuid, permissionUuid)  // Removes scope
```

#### Step 2.2: Verify roleManagementController.js

Check if these endpoints are implemented:

```javascript
// backend/src/controllers/roleManagementController.js
exports.getRolePermissions     // GET /roles/:roleUuid/permissions
exports.removeScope            // DELETE /roles/:roleUuid/permissions/:permissionUuid/scope
exports.assignRoleToUser       // PUT /users/:userUuid/role
exports.getRoleAuditLogs       // GET /roles/:roleUuid/audit-logs
exports.getAuditLogs           // GET /audit-logs
```

#### Step 2.3: Implement roleHierarchy.js Middleware

Create `backend/src/middleware/roleHierarchy.js`:

```javascript
const rbacService = require('../services/rbacService');
const { sendError } = require('../utils/response');

/**
 * Check if actor can modify target role based on hierarchy
 */
function canModifyRole(roleUuidParam) {
  return async (req, res, next) => {
    try {
      const actorRole = await rbacService.getUserRole(req.user.uuid);
      const targetRole = await rbacService.getRoleByUuid(req.params[roleUuidParam]);
      
      if (!targetRole) {
        return sendError(res, {
          status: 404,
          message: 'Target role not found',
          error: 'NOT_FOUND'
        });
      }
      
      // Super Admin can modify any role
      if (actorRole.code === 'SUPER_ADMIN') {
        return next();
      }
      
      // Actor must have higher or equal hierarchy level
      if (actorRole.hierarchy_level < targetRole.hierarchy_level) {
        return sendError(res, {
          status: 403,
          message: 'Insufficient hierarchy level to modify this role',
          error: 'FORBIDDEN'
        });
      }
      
      next();
    } catch (err) {
      console.error('[roleHierarchy] Error:', err);
      return sendError(res, {
        status: 500,
        message: 'Role hierarchy check failed',
        error: 'INTERNAL_ERROR'
      });
    }
  };
}

/**
 * Prevent modification of system roles
 */
function preventSystemRoleModification(roleUuidParam) {
  return async (req, res, next) => {
    try {
      const role = await rbacService.getRoleByUuid(req.params[roleUuidParam]);
      
      if (!role) {
        return sendError(res, {
          status: 404,
          message: 'Role not found',
          error: 'NOT_FOUND'
        });
      }
      
      if (role.is_system_role) {
        return sendError(res, {
          status: 403,
          message: 'Cannot modify system roles',
          error: 'SYSTEM_ROLE_PROTECTED'
        });
      }
      
      next();
    } catch (err) {
      console.error('[roleHierarchy] Error:', err);
      return sendError(res, {
        status: 500,
        message: 'System role check failed',
        error: 'INTERNAL_ERROR'
        });
    }
  };
}

/**
 * Check if actor can assign a specific role
 */
function canAssignRole(roleUuidField) {
  return async (req, res, next) => {
    try {
      const actorRole = await rbacService.getUserRole(req.user.uuid);
      const targetRoleUuid = req.body[roleUuidField];
      const targetRole = await rbacService.getRoleByUuid(targetRoleUuid);
      
      if (!targetRole) {
        return sendError(res, {
          status: 404,
          message: 'Role to assign not found',
          error: 'NOT_FOUND'
        });
      }
      
      // Super Admin can assign any role
      if (actorRole.code === 'SUPER_ADMIN') {
        return next();
      }
      
      // Actor must have higher hierarchy level than role being assigned
      if (actorRole.hierarchy_level <= targetRole.hierarchy_level) {
        return sendError(res, {
          status: 403,
          message: 'Insufficient hierarchy level to assign this role',
          error: 'FORBIDDEN'
        });
      }
      
      next();
    } catch (err) {
      console.error('[roleHierarchy] Error:', err);
      return sendError(res, {
        status: 500,
        message: 'Role assignment check failed',
        error: 'INTERNAL_ERROR'
      });
    }
  };
}

/**
 * Check if actor can modify target user
 */
function canModifyUser(userUuidParam) {
  return async (req, res, next) => {
    try {
      const actorRole = await rbacService.getUserRole(req.user.uuid);
      const targetUserUuid = req.params[userUuidParam];
      const targetUserRole = await rbacService.getUserRole(targetUserUuid);
      
      if (!targetUserRole) {
        return sendError(res, {
          status: 404,
          message: 'Target user not found',
          error: 'NOT_FOUND'
        });
      }
      
      // Super Admin can modify anyone
      if (actorRole.code === 'SUPER_ADMIN') {
        return next();
      }
      
      // Cannot modify users with equal or higher hierarchy
      if (actorRole.hierarchy_level <= targetUserRole.hierarchy_level) {
        return sendError(res, {
          status: 403,
          message: 'Insufficient hierarchy level to modify this user',
          error: 'FORBIDDEN'
        });
      }
      
      next();
    } catch (err) {
      console.error('[roleHierarchy] Error:', err);
      return sendError(res, {
        status: 500,
        message: 'User modification check failed',
        error: 'INTERNAL_ERROR'
      });
    }
  };
}

module.exports = {
  canModifyRole,
  preventSystemRoleModification,
  canAssignRole,
  canModifyUser
};
```

#### Step 2.4: Update authController.js

Modify `getCurrentUser()` to return permission codes instead of module permissions:

```javascript
// In authController.js, find getCurrentUser() method and update:

exports.getCurrentUser = asyncHandler(async (req, res) => {
  const userUuid = req.user.uuid;
  
  // Get user's permission-based permissions
  const permissions = await rbacService.getUserPermissions(userUuid);
  const role = await rbacService.getUserRole(userUuid);
  
  sendSuccess(res, {
    message: "User information retrieved successfully",
    data: {
      user: {
        uuid: req.user.uuid,
        username: req.user.username,
        email: req.user.email,
        full_name: req.user.full_name,
        profile_photo_url: req.user.profile_photo_url,
        employee_uuid: req.user.employee_uuid,
        department_uuid: req.user.department_uuid
      },
      role: {
        uuid: role.uuid,
        code: role.code,
        name: role.name,
        hierarchy_level: role.hierarchy_level
      },
      permissions: permissions  // Array of permission codes: ['Employees.View', 'Attendance.Create', ...]
    }
  });
});
```

---

### Phase 3: Complete Frontend Implementation

#### Step 3.1: Create Permission Matrix Component

Create `frontend/src/components/RoleManagement/PermissionMatrix.jsx`:

```jsx
import React, { useState, useEffect } from 'react';
import { X, Search, Check } from 'lucide-react';
import roleManagementAPI from '../../api/roleManagement';

export default function PermissionMatrix({ roleUuid, roleName, onClose, onSave }) {
  const [resources, setResources] = useState([]);
  const [scopes, setScopes] = useState([]);
  const [selectedPermissions, setSelectedPermissions] = useState(new Map());
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadData();
  }, [roleUuid]);

  const loadData = async () => {
    try {
      setLoading(true);
      const [permsRes, scopesRes, rolePermsRes] = await Promise.all([
        roleManagementAPI.getAllPermissions(),
        roleManagementAPI.getAllDataScopes(),
        roleManagementAPI.getRolePermissions(roleUuid)
      ]);

      setResources(permsRes.data.resources || []);
      setScopes(scopesRes.data.scopes || []);

      // Initialize selected permissions map
      const permMap = new Map();
      if (rolePermsRes.data.permissions) {
        rolePermsRes.data.permissions.forEach(p => {
          permMap.set(p.permission_uuid, {
            selected: true,
            scopeUuid: p.data_scope_uuid || null
          });
        });
      }
      setSelectedPermissions(permMap);
    } catch (err) {
      console.error('Failed to load permission data:', err);
      alert('Failed to load permissions');
    } finally {
      setLoading(false);
    }
  };

  const togglePermission = (permissionUuid, requiresScope) => {
    const newMap = new Map(selectedPermissions);
    const current = newMap.get(permissionUuid);

    if (current?.selected) {
      // Deselect
      newMap.delete(permissionUuid);
    } else {
      // Select with default scope if required
      const defaultScope = requiresScope ? scopes.find(s => s.code === 'OWN')?.uuid : null;
      newMap.set(permissionUuid, {
        selected: true,
        scopeUuid: defaultScope
      });
    }

    setSelectedPermissions(newMap);
  };

  const changeScope = (permissionUuid, scopeUuid) => {
    const newMap = new Map(selectedPermissions);
    const current = newMap.get(permissionUuid);
    if (current) {
      newMap.set(permissionUuid, { ...current, scopeUuid });
    }
    setSelectedPermissions(newMap);
  };

  const handleSave = async () => {
    try {
      setSaving(true);

      // Build permission assignments array
      const assignments = [];
      selectedPermissions.forEach((value, permissionUuid) => {
        if (value.selected) {
          assignments.push({
            permissionUuid,
            dataScopeUuid: value.scopeUuid
          });
        }
      });

      // Call replace permissions API
      await roleManagementAPI.replaceRolePermissions(roleUuid, {
        permissionUuids: assignments.map(a => a.permissionUuid)
      });

      // Assign scopes
      for (const assignment of assignments) {
        if (assignment.dataScopeUuid) {
          await roleManagementAPI.updatePermissionScope(
            roleUuid,
            assignment.permissionUuid,
            { data_scope_uuid: assignment.dataScopeUuid }
          );
        }
      }

      alert('Permissions updated successfully');
      if (onSave) onSave();
      onClose();
    } catch (err) {
      console.error('Failed to save permissions:', err);
      alert(`Failed to save: ${err.message}`);
    } finally {
      setSaving(false);
    }
  };

  const filteredResources = resources.filter(resource =>
    resource.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    resource.permissions.some(p => p.name.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  if (loading) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg p-6">
          <p>Loading permissions...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-5xl w-full max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="p-6 border-b flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Assign Permissions</h2>
            <p className="text-sm text-gray-600 mt-1">Role: {roleName}</p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X size={24} />
          </button>
        </div>

        {/* Search */}
        <div className="p-4 border-b">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
            <input
              type="text"
              placeholder="Search permissions..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500"
            />
          </div>
        </div>

        {/* Permission List */}
        <div className="flex-1 overflow-y-auto p-6">
          {filteredResources.map(resource => (
            <div key={resource.uuid} className="mb-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-3 flex items-center">
                {resource.name}
                <span className="ml-2 text-sm font-normal text-gray-500">
                  ({resource.permissions.filter(p => selectedPermissions.get(p.uuid)?.selected).length}/{resource.permissions.length})
                </span>
              </h3>
              <div className="space-y-2">
                {resource.permissions.map(permission => {
                  const isSelected = selectedPermissions.get(permission.uuid)?.selected || false;
                  const scopeUuid = selectedPermissions.get(permission.uuid)?.scopeUuid;

                  return (
                    <div key={permission.uuid} className="flex items-center gap-4 p-3 bg-gray-50 rounded-lg">
                      <label className="flex items-center gap-2 flex-1 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => togglePermission(permission.uuid, permission.requires_scope)}
                          className="w-4 h-4 text-teal-600 rounded focus:ring-teal-500"
                        />
                        <span className="text-sm font-medium text-gray-900">{permission.name}</span>
                        {permission.is_sensitive && (
                          <span className="text-xs bg-red-100 text-red-700 px-2 py-0.5 rounded">Sensitive</span>
                        )}
                      </label>

                      {permission.requires_scope && isSelected && (
                        <select
                          value={scopeUuid || ''}
                          onChange={(e) => changeScope(permission.uuid, e.target.value)}
                          className="text-sm border border-gray-300 rounded px-3 py-1 focus:outline-none focus:ring-2 focus:ring-teal-500"
                        >
                          <option value="">Select Scope</option>
                          {scopes.map(scope => (
                            <option key={scope.uuid} value={scope.uuid}>
                              {scope.name}
                            </option>
                          ))}
                        </select>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>

        {/* Footer */}
        <div className="p-6 border-t flex justify-between items-center">
          <div className="text-sm text-gray-600">
            {Array.from(selectedPermissions.values()).filter(v => v.selected).length} permissions selected
          </div>
          <div className="flex gap-3">
            <button
              onClick={onClose}
              disabled={saving}
              className="px-6 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={saving}
              className="px-6 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 disabled:opacity-50 flex items-center gap-2"
            >
              {saving ? (
                <>
                  <span className="animate-spin">⚙</span>
                  Saving...
                </>
              ) : (
                <>
                  <Check size={18} />
                  Save Permissions
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
```

#### Step 3.2: Create Role Form Component

Create `frontend/src/components/RoleManagement/RoleForm.jsx`:

```jsx
import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Save, AlertCircle } from 'lucide-react';
import roleManagementAPI from '../../api/roleManagement';

export default function RoleForm() {
  const navigate = useNavigate();
  const { roleUuid } = useParams();
  const isEdit = Boolean(roleUuid);

  const [formData, setFormData] = useState({
    code: '',
    name: '',
    description: '',
    hierarchyLevel: 10
  });
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(isEdit);
  const [submitting, setSubmitting] = useState(false);
  const [isSystemRole, setIsSystemRole] = useState(false);

  useEffect(() => {
    if (isEdit) {
      loadRole();
    }
  }, [roleUuid]);

  const loadRole = async () => {
    try {
      setLoading(true);
      const response = await roleManagementAPI.getRoleById(roleUuid);
      const role = response.data.role;
      
      setFormData({
        code: role.code,
        name: role.name,
        description: role.description || '',
        hierarchyLevel: role.hierarchy_level
      });
      setIsSystemRole(role.is_system_role);
    } catch (err) {
      alert('Failed to load role: ' + err.message);
      navigate('/admin/roles');
    } finally {
      setLoading(false);
    }
  };

  const validateForm = () => {
    const newErrors = {};

    if (!formData.code.trim()) {
      newErrors.code = 'Role code is required';
    } else if (!/^[A-Z_]+$/.test(formData.code)) {
      newErrors.code = 'Code must contain only uppercase letters and underscores';
    }

    if (!formData.name.trim()) {
      newErrors.name = 'Role name is required';
    }

    if (formData.hierarchyLevel < 1 || formData.hierarchyLevel > 100) {
      newErrors.hierarchyLevel = 'Hierarchy level must be between 1 and 100';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    try {
      setSubmitting(true);

      if (isEdit) {
        await roleManagementAPI.updateRole(roleUuid, {
          name: formData.name,
          description: formData.description,
          hierarchyLevel: parseInt(formData.hierarchyLevel)
        });
        alert('Role updated successfully');
      } else {
        const response = await roleManagementAPI.createRole({
          code: formData.code,
          name: formData.name,
          description: formData.description,
          hierarchyLevel: parseInt(formData.hierarchyLevel)
        });
        alert('Role created successfully');
        navigate(`/admin/roles/${response.data.role.uuid}`);
        return;
      }

      navigate(`/admin/roles/${roleUuid}`);
    } catch (err) {
      alert('Failed to save role: ' + err.message);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return <div className="p-6">Loading role...</div>;
  }

  return (
    <div className="max-w-3xl mx-auto p-6">
      {/* Header */}
      <button
        onClick={() => navigate('/admin/roles')}
        className="flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-6"
      >
        <ArrowLeft size={20} />
        Back to Roles
      </button>

      <div className="bg-white rounded-lg shadow-lg p-8">
        <h1 className="text-2xl font-bold text-gray-900 mb-6">
          {isEdit ? 'Edit Role' : 'Create New Role'}
        </h1>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Role Code */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Role Code *
            </label>
            <input
              type="text"
              value={formData.code}
              onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
              disabled={isEdit || isSystemRole}
              placeholder="HR_MANAGER"
              className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 ${
                errors.code ? 'border-red-500' : 'border-gray-300'
              } ${(isEdit || isSystemRole) ? 'bg-gray-100 cursor-not-allowed' : ''}`}
            />
            {errors.code && (
              <p className="mt-1 text-sm text-red-600 flex items-center gap-1">
                <AlertCircle size={14} />
                {errors.code}
              </p>
            )}
            <p className="mt-1 text-xs text-gray-500">
              Uppercase letters and underscores only. Cannot be changed after creation.
            </p>
          </div>

          {/* Role Name */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Role Name *
            </label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="HR Manager"
              className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 ${
                errors.name ? 'border-red-500' : 'border-gray-300'
              }`}
            />
            {errors.name && (
              <p className="mt-1 text-sm text-red-600 flex items-center gap-1">
                <AlertCircle size={14} />
                {errors.name}
              </p>
            )}
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Description
            </label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              rows={4}
              placeholder="Brief description of this role's purpose and responsibilities..."
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500"
            />
          </div>

          {/* Hierarchy Level */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Hierarchy Level *
            </label>
            <input
              type="number"
              value={formData.hierarchyLevel}
              onChange={(e) => setFormData({ ...formData, hierarchyLevel: e.target.value })}
              min="1"
              max="100"
              disabled={isSystemRole}
              className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 ${
                errors.hierarchyLevel ? 'border-red-500' : 'border-gray-300'
              } ${isSystemRole ? 'bg-gray-100 cursor-not-allowed' : ''}`}
            />
            {errors.hierarchyLevel && (
              <p className="mt-1 text-sm text-red-600 flex items-center gap-1">
                <AlertCircle size=14} />
                {errors.hierarchyLevel}
              </p>
            )}
            <p className="mt-1 text-xs text-gray-500">
              Higher values = higher authority. Range: 1-100. Super Admin is typically 100.
            </p>
          </div>

          {/* Actions */}
          <div className="flex gap-4 pt-4">
            <button
              type="button"
              onClick={() => navigate(isEdit ? `/admin/roles/${roleUuid}` : '/admin/roles')}
              disabled={submitting}
              className="px-6 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-6 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 disabled:opacity-50 flex items-center gap-2"
            >
              {submitting ? (
                <>
                  <span className="animate-spin">⚙</span>
                  Saving...
                </>
              ) : (
                <>
                  <Save size={18} />
                  {isEdit ? 'Update Role' : 'Create Role'}
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
```

#### Step 3.3: Create Role Detail View Component

Create `frontend/src/components/RoleManagement/RoleDetailView.jsx`:

```jsx
import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Edit2, Shield, Users, Lock, Trash2 } from 'lucide-react';
import roleManagementAPI from '../../api/roleManagement';
import PermissionMatrix from './PermissionMatrix';
import { usePermissions } from '../../hooks/usePermissions';

export default function RoleDetailView() {
  const navigate = useNavigate();
  const { roleUuid } = useParams();
  const { hasPermission } = usePermissions();
  
  const [role, setRole] = useState(null);
  const [permissions, setPermissions] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showPermissionMatrix, setShowPermissionMatrix] = useState(false);

  useEffect(() => {
    loadRoleDetails();
  }, [roleUuid]);

  const loadRoleDetails = async () => {
    try {
      setLoading(true);
      const [roleRes, permsRes, usersRes] = await Promise.all([
        roleManagementAPI.getRoleById(roleUuid),
        roleManagementAPI.getRolePermissions(roleUuid),
        roleManagementAPI.getRoleUsers(roleUuid)
      ]);

      setRole(roleRes.data.role);
      setPermissions(permsRes.data.permissions || []);
      setUsers(usersRes.data.users || []);
    } catch (err) {
      console.error('Failed to load role details:', err);
      alert('Failed to load role details');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm(`Are you sure you want to delete "${role.name}"? This action cannot be undone.`)) {
      return;
    }

    try {
      await roleManagementAPI.deleteRole(roleUuid);
      alert('Role deleted successfully');
      navigate('/admin/roles');
    } catch (err) {
      alert(`Failed to delete role: ${err.message}`);
    }
  };

  const handleToggleStatus = async () => {
    try {
      await roleManagementAPI.setRoleStatus(roleUuid, !role.is_active);
      alert(`Role ${role.is_active ? 'deactivated' : 'activated'} successfully`);
      loadRoleDetails();
    } catch (err) {
      alert(`Failed to update status: ${err.message}`);
    }
  };

  if (loading) {
    return <div className="p-6">Loading role details...</div>;
  }

  if (!role) {
    return <div className="p-6">Role not found</div>;
  }

  // Group permissions by resource
  const permissionsByResource = permissions.reduce((acc, perm) => {
    const resource = perm.resource_name || 'Other';
    if (!acc[resource]) {
      acc[resource] = [];
    }
    acc[resource].push(perm);
    return acc;
  }, {});

  const canEdit = hasPermission('Roles.Update') && !role.is_system_role;
  const canDelete = hasPermission('Roles.Delete') && !role.is_system_role && users.length === 0;
  const canManagePermissions = hasPermission('Roles.AssignPermissions');

  return (
    <div className="max-w-6xl mx-auto p-6">
      {/* Header */}
      <button
        onClick={() => navigate('/admin/roles')}
        className="flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-6"
      >
        <ArrowLeft size={20} />
        Back to Roles
      </button>

      <div className="bg-white rounded-lg shadow-lg">
        {/* Role Header */}
        <div className="p-6 border-b">
          <div className="flex items-start justify-between">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <h1 className="text-2xl font-bold text-gray-900">{role.name}</h1>
                {role.is_system_role && (
                  <span className="px-3 py-1 bg-blue-100 text-blue-700 text-sm font-medium rounded-full">
                    System Role
                  </span>
                )}
                {!role.is_active && (
                  <span className="px-3 py-1 bg-gray-100 text-gray-700 text-sm font-medium rounded-full">
                    Inactive
                  </span>
                )}
              </div>
              <p className="text-sm text-gray-600 font-mono bg-gray-50 px-2 py-1 rounded inline-block">
                {role.code}
              </p>
              {role.description && (
                <p className="text-gray-700 mt-3">{role.description}</p>
              )}
            </div>

            <div className="flex gap-2">
              {canEdit && (
                <button
                  onClick={() => navigate(`/admin/roles/${roleUuid}/edit`)}
                  className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
                >
                  <Edit2 size={18} />
                  Edit
                </button>
              )}
              {canDelete && (
                <button
                  onClick={handleDelete}
                  className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
                >
                  <Trash2 size={18} />
                  Delete
                </button>
              )}
            </div>
          </div>

          {/* Role Info */}
          <div className="grid grid-cols-3 gap-4 mt-6">
            <div>
              <p className="text-sm text-gray-600">Hierarchy Level</p>
              <p className="text-lg font-semibold text-gray-900">{role.hierarchy_level}</p>
            </div>
            <div>
              <p className="text-sm text-gray-600">Permissions</p>
              <p className="text-lg font-semibold text-gray-900">{permissions.length}</p>
            </div>
            <div>
              <p className="text-sm text-gray-600">Assigned Users</p>
              <p className="text-lg font-semibold text-gray-900">{users.length}</p>
            </div>
          </div>
        </div>

        {/* Permissions Section */}
        <div className="p-6 border-b">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
              <Shield size={24} />
              Permissions
            </h2>
            {canManagePermissions && !role.is_system_role && (
              <button
                onClick={() => setShowPermissionMatrix(true)}
                className="px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700"
              >
                Manage Permissions
              </button>
            )}
          </div>

          {permissions.length === 0 ? (
            <p className="text-gray-500 italic">No permissions assigned to this role</p>
          ) : (
            <div className="space-y-4">
              {Object.entries(permissionsByResource).map(([resource, perms]) => (
                <div key={resource} className="bg-gray-50 rounded-lg p-4">
                  <h3 className="font-semibold text-gray-900 mb-2">{resource}</h3>
                  <div className="grid grid-cols-2 gap-2">
                    {perms.map(perm => (
                      <div key={perm.permission_uuid} className="flex items-center justify-between text-sm">
                        <span className="text-gray-700">{perm.permission_name}</span>
                        {perm.scope_name && (
                          <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded">
                            {perm.scope_name}
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Users Section */}
        <div className="p-6">
          <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2 mb-4">
            <Users size={24} />
            Assigned Users ({users.length})
          </h2>

          {users.length === 0 ? (
            <p className="text-gray-500 italic">No users assigned to this role</p>
          ) : (
            <div className="grid grid-cols-3 gap-4">
              {users.map(user => (
                <div key={user.uuid} className="bg-gray-50 rounded-lg p-3">
                  <p className="font-medium text-gray-900">{user.full_name || user.username}</p>
                  <p className="text-sm text-gray-600">{user.email}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Permission Matrix Modal */}
      {showPermissionMatrix && (
        <PermissionMatrix
          roleUuid={roleUuid}
          roleName={role.name}
          onClose={() => setShowPermissionMatrix(false)}
          onSave={() => {
            setShowPermissionMatrix(false);
            loadRoleDetails();
          }}
        />
      )}
    </div>
  );
}
```

#### Step 3.4: Update Routing

In your main router file (likely `frontend/src/App.jsx` or `frontend/src/routes.jsx`):

```jsx
import RoleManagementPage from './pages/RoleManagementPage';
import RoleForm from './components/RoleManagement/RoleForm';
import RoleDetailView from './components/RoleManagement/RoleDetailView';

// Add these routes:
<Route path="/admin/roles" element={<RoleManagementPage />} />
<Route path="/admin/roles/new" element={<RoleForm />} />
<Route path="/admin/roles/:roleUuid" element={<RoleDetailView />} />
<Route path="/admin/roles/:roleUuid/edit" element={<RoleForm />} />
```

---

### Phase 4: Testing

#### Step 4.1: Start Backend Server

```bash
cd backend
npm install
npm start
```

Server should start on `http://localhost:5000`

#### Step 4.2: Start Frontend

```bash
cd frontend
npm install
npm start
```

Frontend should start on `http://localhost:3000`

#### Step 4.3: Test Workflow

1. **Login** as Super Admin user
2. **Navigate** to `/admin/roles`
3. **View** existing roles (should see SUPER_ADMIN and others)
4. **Create** a new custom role:
   - Click "Create Role"
   - Enter code: `TEST_MANAGER`
   - Enter name: `Test Manager`
   - Set hierarchy: `50`
   - Save
5. **Assign Permissions**:
   - Open role detail view
   - Click "Manage Permissions"
   - Select permissions: `Employees.View`, `Attendance.View`
   - Assign scopes: `DEPARTMENT` for both
   - Save
6. **Verify**:
   - Check role detail view shows assigned permissions
   - Check scopes are displayed correctly
7. **Delete Role**:
   - From detail view, click "Delete"
   - Confirm deletion
   - Verify redirect to role list

---

## Common Issues & Solutions

### Issue 1: "Table 'Role_Permissions' doesn't exist"

**Solution**: Run the fix script:
```bash
mysql -u mesob -pmesob_password mesob_hrms < database/FIX_ROLE_PERMISSIONS_NOW.sql
```

### Issue 2: "Cannot read property 'uuid' of null" (Frontend)

**Cause**: API returning unexpected data structure

**Solution**: Check browser console for API errors. Verify backend is running and accessible.

### Issue 3: "Permission denied" when creating role

**Cause**: User doesn't have `Roles.Create` permission

**Solution**: Ensure logged-in user has SUPER_ADMIN role or has been assigned the permission.

### Issue 4: Frontend shows no permissions after login

**Cause**: authController not returning permission codes

**Solution**: Verify authController.getCurrentUser() was updated in Step 2.4

---

## Security Checklist

- [ ] All role management routes protected with `authorize()` middleware
- [ ] System roles cannot be modified or deleted
- [ ] Role hierarchy enforced (lower levels can't modify higher levels)
- [ ] Permission changes logged in AuthorizationAuditLogs
- [ ] Frontend hides unauthorized actions
- [ ] Token versioning working (increment permissions_version on permission changes)

---

## Performance Optimization

- [ ] rbacService uses 5-minute cache for permissions
- [ ] Database has indexes on: uuid, code, role_uuid, permission_uuid
- [ ] Frontend uses React.memo for permission matrix components
- [ ] API responses include only necessary data

---

## Next Steps

After completing this implementation:

1. **Document** all permission codes in a developer guide
2. **Train** administrators on role management workflow
3. **Audit** existing users and assign appropriate roles
4. **Monitor** authorization logs for security events
5. **Consider** adding:
   - Permission templates for common role types
   - Bulk user-role assignment
   - Role cloning feature
   - Permission delegation with time limits

---

## Support

If you encounter issues:

1. Check backend logs: `backend/logs/` or console output
2. Check frontend console for errors
3. Run `node backend/scripts/checkDatabase.js` to verify schema
4. Review this guide's "Common Issues" section

Good luck with your implementation! 🚀
