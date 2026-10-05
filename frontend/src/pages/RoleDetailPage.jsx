import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { PermissionGuard } from '../components/PermissionGuard';
import roleManagementAPI from '../api/roleManagement';
import { groupPermissionsByResource, formatPermissionName } from '../utils/permissions';

export default function RoleDetailPage() {
  const { roleUuid } = useParams();
  const navigate = useNavigate();
  const [role, setRole] = useState(null);
  const [permissions, setPermissions] = useState([]);
  const [users, setUsers] = useState([]);
  const [auditLogs, setAuditLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('permissions'); // permissions, users, audit

  useEffect(() => {
    loadRoleData();
  }, [roleUuid]);

  const loadRoleData = async () => {
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
      console.error('Error loading role data:', err);
      alert('Failed to load role details');
      navigate('/admin/roles');
    } finally {
      setLoading(false);
    }
  };

  const loadAuditLogs = async () => {
    try {
      const response = await roleManagementAPI.getRoleAuditLogs(roleUuid, { limit: 50 });
      setAuditLogs(response.data.logs || []);
    } catch (err) {
      console.error('Error loading audit logs:', err);
    }
  };

  useEffect(() => {
    if (activeTab === 'audit' && auditLogs.length === 0) {
      loadAuditLogs();
    }
  }, [activeTab]);

  const handleRemoveUser = async (userUuid) => {
    if (!confirm('Remove this user from the role?')) return;

    try {
      await roleManagementAPI.removeUserFromRole(roleUuid, userUuid);
      loadRoleData();
    } catch (err) {
      alert(`Failed to remove user: ${err.message}`);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500">Loading role details...</div>
      </div>
    );
  }

  if (!role) {
    return (
      <div className="p-6">
        <div className="text-center py-12">
          <p className="text-gray-500">Role not found</p>
        </div>
      </div>
    );
  }

  const groupedPermissions = groupPermissionsByResource(permissions);

  return (
    <div className="p-6">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={() => navigate('/admin/roles')}
              className="text-gray-500 hover:text-gray-700"
            >
              ← Back
            </button>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-2xl font-bold text-gray-900">{role.name}</h1>
                {role.is_system_role && (
                  <span className="px-2 py-1 text-xs font-medium bg-purple-100 text-purple-700 rounded">
                    System Role
                  </span>
                )}
                {!role.is_active && (
                  <span className="px-2 py-1 text-xs font-medium bg-gray-100 text-gray-600 rounded">
                    Inactive
                  </span>
                )}
              </div>
              <p className="mt-1 text-sm text-gray-500">{role.code}</p>
            </div>
          </div>
          <PermissionGuard permissions="Roles.Update">
            {!role.is_system_role && (
              <button
                onClick={() => navigate(`/admin/roles/${roleUuid}/edit`)}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
              >
                Edit Role
              </button>
            )}
          </PermissionGuard>
        </div>
      </div>

      {/* Role Info Card */}
      <div className="bg-white border rounded-lg p-6 mb-6">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div>
            <p className="text-sm text-gray-500">Hierarchy Level</p>
            <p className="text-lg font-semibold text-gray-900">{role.hierarchy_level}</p>
          </div>
          <div>
            <p className="text-sm text-gray-500">Permissions</p>
            <p className="text-lg font-semibold text-gray-900">{permissions.length}</p>
          </div>
          <div>
            <p className="text-sm text-gray-500">Assigned Users</p>
            <p className="text-lg font-semibold text-gray-900">{users.length}</p>
          </div>
          <div>
            <p className="text-sm text-gray-500">Status</p>
            <p className="text-lg font-semibold text-gray-900">
              {role.is_active ? 'Active' : 'Inactive'}
            </p>
          </div>
        </div>
        {role.description && (
          <div className="mt-4 pt-4 border-t">
            <p className="text-sm text-gray-500 mb-1">Description</p>
            <p className="text-gray-700">{role.description}</p>
          </div>
        )}
      </div>

      {/* Tabs */}
      <div className="mb-4 border-b border-gray-200">
        <nav className="flex space-x-4">
          {[
            { key: 'permissions', label: `Permissions (${permissions.length})` },
            { key: 'users', label: `Users (${users.length})` },
            { key: 'audit', label: 'Audit Log' }
          ].map(tab => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`py-2 px-4 border-b-2 font-medium text-sm transition-colors ${
                activeTab === tab.key
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      {/* Tab Content */}
      <div className="bg-white border rounded-lg p-6">
        {activeTab === 'permissions' && (
          <div>
            <h3 className="font-semibold text-gray-900 mb-4">Role Permissions</h3>
            {permissions.length === 0 ? (
              <p className="text-gray-500 text-center py-8">No permissions assigned</p>
            ) : (
              <div className="space-y-6">
                {Object.entries(groupedPermissions).map(([resource, perms]) => (
                  <div key={resource} className="border-b pb-4 last:border-b-0">
                    <h4 className="font-medium text-gray-900 mb-3">{resource}</h4>
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                      {perms.map(perm => (
                        <div
                          key={perm.uuid}
                          className="flex items-center gap-2 p-2 bg-gray-50 rounded"
                        >
                          <span className="text-sm text-gray-700">
                            {formatPermissionName(perm.action)}
                          </span>
                          {perm.data_scope && (
                            <span className="text-xs text-gray-500 bg-white px-1.5 py-0.5 rounded">
                              {perm.data_scope}
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
        )}

        {activeTab === 'users' && (
          <div>
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-gray-900">Assigned Users</h3>
              <PermissionGuard permissions="Users.AssignRole">
                <button
                  onClick={() => navigate(`/admin/roles/${roleUuid}/assign-users`)}
                  className="px-3 py-1.5 text-sm bg-blue-600 text-white rounded hover:bg-blue-700"
                >
                  + Assign Users
                </button>
              </PermissionGuard>
            </div>
            {users.length === 0 ? (
              <p className="text-gray-500 text-center py-8">No users assigned to this role</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                        Name
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                        Email
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                        Employee ID
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                        Status
                      </th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {users.map(user => (
                      <tr key={user.uuid}>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                          {user.full_name || user.username}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {user.email}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {user.employee_id || '-'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`px-2 py-1 text-xs font-medium rounded ${
                            user.is_active
                              ? 'bg-green-100 text-green-700'
                              : 'bg-gray-100 text-gray-600'
                          }`}>
                            {user.is_active ? 'Active' : 'Inactive'}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm">
                          <PermissionGuard permissions="Users.AssignRole">
                            {!role.is_system_role && (
                              <button
                                onClick={() => handleRemoveUser(user.uuid)}
                                className="text-red-600 hover:text-red-800"
                              >
                                Remove
                              </button>
                            )}
                          </PermissionGuard>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {activeTab === 'audit' && (
          <div>
            <h3 className="font-semibold text-gray-900 mb-4">Audit Log</h3>
            {auditLogs.length === 0 ? (
              <p className="text-gray-500 text-center py-8">No audit logs available</p>
            ) : (
              <div className="space-y-3">
                {auditLogs.map(log => (
                  <div
                    key={log.id}
                    className="p-4 border rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-medium text-gray-900">{log.action}</span>
                          <span className="px-2 py-0.5 text-xs bg-gray-100 text-gray-600 rounded">
                            {log.resource_type}
                          </span>
                        </div>
                        <p className="text-sm text-gray-600 mb-2">{log.description}</p>
                        <div className="flex items-center gap-4 text-xs text-gray-500">
                          <span>By: {log.performed_by_name || log.performed_by}</span>
                          <span>•</span>
                          <span>{new Date(log.created_at).toLocaleString()}</span>
                          {log.ip_address && (
                            <>
                              <span>•</span>
                              <span>IP: {log.ip_address}</span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
