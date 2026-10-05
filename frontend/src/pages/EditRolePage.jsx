import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import roleManagementAPI from '../api/roleManagement';
import PermissionSelector from '../components/PermissionSelector';

export default function EditRolePage() {
  const { roleUuid } = useParams();
  const navigate = useNavigate();
  const [role, setRole] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    hierarchy_level: 50,
    is_active: true
  });
  const [selectedPermissions, setSelectedPermissions] = useState([]);
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    loadRole();
  }, [roleUuid]);

  const loadRole = async () => {
    try {
      setLoading(true);
      const [roleRes, permsRes] = await Promise.all([
        roleManagementAPI.getRoleById(roleUuid),
        roleManagementAPI.getRolePermissions(roleUuid)
      ]);

      const roleData = roleRes.data.role;
      const permissions = permsRes.data.permissions || [];

      setRole(roleData);
      setFormData({
        name: roleData.name,
        description: roleData.description || '',
        hierarchy_level: roleData.hierarchy_level,
        is_active: roleData.is_active
      });

      // Map permissions to the format expected by PermissionSelector
      setSelectedPermissions(permissions.map(p => ({
        permission_uuid: p.uuid,
        data_scope: p.data_scope || null,
        _permission: p
      })));
    } catch (err) {
      console.error('Error loading role:', err);
      alert('Failed to load role details');
      navigate('/admin/roles');
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: null }));
    }
  };

  const validateForm = () => {
    const newErrors = {};

    if (!formData.name.trim()) {
      newErrors.name = 'Role name is required';
    }

    if (formData.hierarchy_level < 1 || formData.hierarchy_level > 100) {
      newErrors.hierarchy_level = 'Hierarchy level must be between 1 and 100';
    }

    if (selectedPermissions.length === 0) {
      newErrors.permissions = 'At least one permission must be selected';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    setSubmitting(true);

    try {
      // Update role details
      await roleManagementAPI.updateRole(roleUuid, {
        name: formData.name.trim(),
        description: formData.description.trim() || null,
        hierarchy_level: parseInt(formData.hierarchy_level),
        is_active: formData.is_active
      });

      // Replace all permissions
      const permissionAssignments = selectedPermissions.map(perm => ({
        permission_uuid: perm.permission_uuid,
        data_scope: perm.data_scope || null
      }));

      await roleManagementAPI.replaceRolePermissions(roleUuid, {
        permissions: permissionAssignments
      });

      alert('Role updated successfully!');
      navigate(`/admin/roles/${roleUuid}`);
    } catch (err) {
      console.error('Error updating role:', err);
      alert(`Failed to update role: ${err.message || 'Unknown error'}`);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500">Loading role...</div>
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

  if (role.is_system_role) {
    return (
      <div className="p-6">
        <div className="max-w-2xl mx-auto">
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6 text-center">
            <h2 className="text-xl font-semibold text-yellow-900 mb-2">
              System Role
            </h2>
            <p className="text-yellow-800 mb-4">
              System roles cannot be edited. Their core attributes and permissions are managed by the system.
            </p>
            <button
              onClick={() => navigate(`/admin/roles/${roleUuid}`)}
              className="px-4 py-2 bg-yellow-600 text-white rounded-md hover:bg-yellow-700 transition-colors"
            >
              View Role Details
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center gap-4 mb-2">
          <button
            onClick={() => navigate(`/admin/roles/${roleUuid}`)}
            className="text-gray-500 hover:text-gray-700"
          >
            ← Back
          </button>
          <h1 className="text-2xl font-bold text-gray-900">Edit Role</h1>
        </div>
        <p className="text-sm text-gray-500">
          Modify role details, permissions, and access scopes
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Basic Information */}
        <div className="bg-white border rounded-lg p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Basic Information</h2>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Role Code
              </label>
              <input
                type="text"
                value={role.code}
                disabled
                className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-50 text-gray-500 cursor-not-allowed"
              />
              <p className="mt-1 text-xs text-gray-500">
                Role code cannot be changed
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Role Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                name="name"
                value={formData.name}
                onChange={handleInputChange}
                className={`w-full px-3 py-2 border rounded-md focus:ring-blue-500 focus:border-blue-500 ${
                  errors.name ? 'border-red-500' : 'border-gray-300'
                }`}
                placeholder="e.g., Department Manager"
              />
              {errors.name && (
                <p className="mt-1 text-sm text-red-600">{errors.name}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Description
              </label>
              <textarea
                name="description"
                value={formData.description}
                onChange={handleInputChange}
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                placeholder="Describe the purpose and responsibilities of this role..."
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Hierarchy Level <span className="text-red-500">*</span>
                </label>
                <input
                  type="number"
                  name="hierarchy_level"
                  value={formData.hierarchy_level}
                  onChange={handleInputChange}
                  min="1"
                  max="100"
                  className={`w-full px-3 py-2 border rounded-md focus:ring-blue-500 focus:border-blue-500 ${
                    errors.hierarchy_level ? 'border-red-500' : 'border-gray-300'
                  }`}
                />
                {errors.hierarchy_level && (
                  <p className="mt-1 text-sm text-red-600">{errors.hierarchy_level}</p>
                )}
                <p className="mt-1 text-xs text-gray-500">
                  1-100. Higher levels can manage lower levels
                </p>
              </div>

              <div className="flex items-center pt-6">
                <label className="flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    name="is_active"
                    checked={formData.is_active}
                    onChange={handleInputChange}
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  />
                  <span className="ml-2 text-sm text-gray-700">
                    Role is active
                  </span>
                </label>
              </div>
            </div>
          </div>
        </div>

        {/* Permission Selection */}
        <div className="bg-white border rounded-lg p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">
            Permissions <span className="text-red-500">*</span>
          </h2>
          {errors.permissions && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-md">
              <p className="text-sm text-red-600">{errors.permissions}</p>
            </div>
          )}
          <PermissionSelector
            selectedPermissions={selectedPermissions}
            onChange={setSelectedPermissions}
          />
        </div>

        {/* Warning */}
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <span className="text-yellow-600 text-xl">⚠️</span>
            <div className="flex-1">
              <h4 className="font-medium text-yellow-900 mb-1">Important</h4>
              <p className="text-sm text-yellow-800">
                Changes to role permissions will affect all users assigned to this role. 
                Users will need to log out and log back in to see the updated permissions.
              </p>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center justify-end gap-3 pt-4">
          <button
            type="button"
            onClick={() => navigate(`/admin/roles/${roleUuid}`)}
            className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 transition-colors"
            disabled={submitting}
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={submitting}
            className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {submitting ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </form>
    </div>
  );
}
