import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { PermissionGuard } from '../components/PermissionGuard';
import { usePermissions } from '../hooks/usePermissions';
import roleManagementAPI from '../api/roleManagement';

export default function RoleManagementPage() {
  const navigate = useNavigate();
  const { hasPermission } = usePermissions();
  const [roles, setRoles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filter, setFilter] = useState('all'); // all, system, custom

  useEffect(() => {
    loadRoles();
  }, [filter]);

  const loadRoles = async () => {
    try {
      setLoading(true);
      const params = {
        includeInactive: true,
        systemOnly: filter === 'system',
        customOnly: filter === 'custom'
      };
      const response = await roleManagementAPI.getAllRoles(params);
      setRoles(response.data.roles || []);
      setError(null);
    } catch (err) {
      setError(err.message || 'Failed to load roles');
      console.error('Error loading roles:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateRole = () => {
    navigate('/admin/roles/new');
  };

  const handleEditRole = (roleUuid) => {
    navigate(`/admin/roles/${roleUuid}/edit`);
  };

  const handleViewRole = (roleUuid) => {
    navigate(`/admin/roles/${roleUuid}`);
  };

  const handleToggleStatus = async (role) => {
    if (!confirm(`Are you sure you want to ${role.is_active ? 'deactivate' : 'activate'} this role?`)) {
      return;
    }

    try {
      await roleManagementAPI.setRoleStatus(role.uuid, !role.is_active);
      loadRoles();
    } catch (err) {
      alert(`Failed to update role status: ${err.message}`);
    }
  };

  const handleDeleteRole = async (role) => {
    if (!confirm(`Are you sure you want to delete "${role.name}"? This action cannot be undone.`)) {
      return;
    }

    try {
      await roleManagementAPI.deleteRole(role.uuid);
      loadRoles();
    } catch (err) {
      alert(`Failed to delete role: ${err.message}`);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500">Loading roles...</div>
      </div>
    );
  }

  return (
    <div className="p-6">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Role Management</h1>
            <p className="mt-1 text-sm text-gray-500">
              Manage roles, permissions, and data access scopes
            </p>
          </div>
          <PermissionGuard permissions="Roles.Create">
            <button
              onClick={handleCreateRole}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
            >
              + Create Role
            </button>
          </PermissionGuard>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="mb-4 border-b border-gray-200">
        <nav className="flex space-x-4">
          {[
            { key: 'all', label: 'All Roles' },
            { key: 'system', label: 'System Roles' },
            { key: 'custom', label: 'Custom Roles' }
          ].map(tab => (
            <button
              key={tab.key}
              onClick={() => setFilter(tab.key)}
              className={`py-2 px-4 border-b-2 font-medium text-sm transition-colors ${
                filter === tab.key
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      {/* Error Message */}
      {error && (
        <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-md">
          <p className="text-sm text-red-600">{error}</p>
        </div>
      )}

      {/* Roles Grid */}
      {roles.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-gray-500">No roles found</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {roles.map(role => (
            <div
              key={role.uuid}
              className={`bg-white border rounded-lg p-5 shadow-sm hover:shadow-md transition-shadow ${
                !role.is_active ? 'opacity-60' : ''
              }`}
            >
              {/* Role Header */}
              <div className="flex items-start justify-between mb-3">
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <h3 className="font-semibold text-gray-900">{role.name}</h3>
                    {role.is_system_role && (
                      <span className="px-2 py-0.5 text-xs font-medium bg-purple-100 text-purple-700 rounded">
                        System
                      </span>
                    )}
                    {!role.is_active && (
                      <span className="px-2 py-0.5 text-xs font-medium bg-gray-100 text-gray-600 rounded">
                        Inactive
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-gray-500 mt-1">{role.code}</p>
                </div>
                <div className="flex items-center gap-1">
                  <span className="text-xs text-gray-400">
                    Level {role.hierarchy_level}
                  </span>
                </div>
              </div>

              {/* Description */}
              {role.description && (
                <p className="text-sm text-gray-600 mb-4 line-clamp-2">
                  {role.description}
                </p>
              )}

              {/* Actions */}
              <div className="flex items-center gap-2 pt-3 border-t">
                <button
                  onClick={() => handleViewRole(role.uuid)}
                  className="flex-1 px-3 py-1.5 text-sm text-blue-600 hover:bg-blue-50 rounded transition-colors"
                >
                  View Details
                </button>
                
                <PermissionGuard permissions="Roles.Update">
                  {!role.is_system_role && (
                    <button
                      onClick={() => handleEditRole(role.uuid)}
                      className="px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-100 rounded transition-colors"
                    >
                      Edit
                    </button>
                  )}
                </PermissionGuard>

                <PermissionGuard permissions="Roles.Update">
                  {!role.is_system_role && (
                    <button
                      onClick={() => handleToggleStatus(role)}
                      className="px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-100 rounded transition-colors"
                      title={role.is_active ? 'Deactivate' : 'Activate'}
                    >
                      {role.is_active ? '⏸' : '▶'}
                    </button>
                  )}
                </PermissionGuard>

                <PermissionGuard permissions="Roles.Delete">
                  {role.can_be_deleted && !role.is_system_role && (
                    <button
                      onClick={() => handleDeleteRole(role)}
                      className="px-3 py-1.5 text-sm text-red-600 hover:bg-red-50 rounded transition-colors"
                      title="Delete"
                    >
                      🗑
                    </button>
                  )}
                </PermissionGuard>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Info Box */}
      <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-md">
        <h4 className="font-medium text-blue-900 mb-2">About Roles</h4>
        <ul className="text-sm text-blue-800 space-y-1">
          <li>• <strong>System Roles</strong> cannot be deleted or have their core attributes changed</li>
          <li>• <strong>Custom Roles</strong> can be created, edited, and deleted by authorized users</li>
          <li>• <strong>Hierarchy Level</strong> determines which roles can manage other roles</li>
          <li>• Users must re-login after role changes to see updated permissions</li>
        </ul>
      </div>
    </div>
  );
}
