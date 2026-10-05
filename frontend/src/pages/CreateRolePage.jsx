import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import roleManagementAPI from '../api/roleManagement';
import PermissionSelector from '../components/PermissionSelector';

export default function CreateRolePage() {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    name: '',
    code: '',
    description: '',
    hierarchy_level: 50,
    is_active: true
  });
  const [selectedPermissions, setSelectedPermissions] = useState([]);
  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
    // Clear error for this field
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: null }));
    }
  };

  const validateForm = () => {
    const newErrors = {};

    if (!formData.name.trim()) {
      newErrors.name = 'Role name is required';
    }

    if (!formData.code.trim()) {
      newErrors.code = 'Role code is required';
    } else if (!/^[A-Z_]+$/.test(formData.code)) {
      newErrors.code = 'Role code must be uppercase letters and underscores only';
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
      // Create the role
      const roleResponse = await roleManagementAPI.createRole({
        name: formData.name.trim(),
        code: formData.code.trim().toUpperCase(),
        description: formData.description.trim() || null,
        hierarchy_level: parseInt(formData.hierarchy_level),
        is_active: formData.is_active
      });

      const roleUuid = roleResponse.data.role.uuid;

      // Assign permissions
      if (selectedPermissions.length > 0) {
        const permissionAssignments = selectedPermissions.map(perm => ({
          permission_uuid: perm.permission_uuid,
          data_scope: perm.data_scope || null
        }));

        await roleManagementAPI.assignBulkPermissions(roleUuid, {
          permissions: permissionAssignments
        });
      }

      alert('Role created successfully!');
      navigate(`/admin/roles/${roleUuid}`);
    } catch (err) {
      console.error('Error creating role:', err);
      alert(`Failed to create role: ${err.message || 'Unknown error'}`);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="p-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center gap-4 mb-2">
          <button
            onClick={() => navigate('/admin/roles')}
            className="text-gray-500 hover:text-gray-700"
          >
            ← Back
          </button>
          <h1 className="text-2xl font-bold text-gray-900">Create New Role</h1>
        </div>
        <p className="text-sm text-gray-500">
          Define a new custom role with specific permissions and access scopes
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Basic Information */}
        <div className="bg-white border rounded-lg p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Basic Information</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                Role Code <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                name="code"
                value={formData.code}
                onChange={handleInputChange}
                className={`w-full px-3 py-2 border rounded-md focus:ring-blue-500 focus:border-blue-500 uppercase ${
                  errors.code ? 'border-red-500' : 'border-gray-300'
                }`}
                placeholder="e.g., DEPT_MANAGER"
              />
              {errors.code && (
                <p className="mt-1 text-sm text-red-600">{errors.code}</p>
              )}
              <p className="mt-1 text-xs text-gray-500">
                Uppercase letters and underscores only
              </p>
            </div>
          </div>

          <div className="mt-4">
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

          <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
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
                  Activate role immediately
                </span>
              </label>
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

        {/* Action Buttons */}
        <div className="flex items-center justify-end gap-3 pt-4">
          <button
            type="button"
            onClick={() => navigate('/admin/roles')}
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
            {submitting ? 'Creating...' : 'Create Role'}
          </button>
        </div>
      </form>
    </div>
  );
}
