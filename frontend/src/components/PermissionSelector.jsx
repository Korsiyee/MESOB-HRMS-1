import React, { useState, useEffect } from 'react';
import roleManagementAPI from '../api/roleManagement';
import { groupPermissionsByResource, formatPermissionName } from '../utils/permissions';

export default function PermissionSelector({ selectedPermissions, onChange }) {
  const [allPermissions, setAllPermissions] = useState([]);
  const [dataScopes, setDataScopes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedResource, setSelectedResource] = useState('all');
  const [showScopeModal, setShowScopeModal] = useState(false);
  const [scopeModalPerm, setScopeModalPerm] = useState(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [permsRes, scopesRes] = await Promise.all([
        roleManagementAPI.getAllPermissions(),
        roleManagementAPI.getAllDataScopes()
      ]);
      setAllPermissions(permsRes.data.permissions || []);
      setDataScopes(scopesRes.data.scopes || []);
    } catch (err) {
      console.error('Error loading permissions:', err);
      alert('Failed to load permissions');
    } finally {
      setLoading(false);
    }
  };

  const groupedPermissions = groupPermissionsByResource(allPermissions);
  const resources = Object.keys(groupedPermissions);

  const filteredPermissions = allPermissions.filter(perm => {
    const matchesSearch = !searchTerm || 
      perm.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      perm.resource.toLowerCase().includes(searchTerm.toLowerCase()) ||
      perm.action.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesResource = selectedResource === 'all' || perm.resource === selectedResource;

    return matchesSearch && matchesResource;
  });

  const isPermissionSelected = (permUuid) => {
    return selectedPermissions.some(p => p.permission_uuid === permUuid);
  };

  const getPermissionScope = (permUuid) => {
    const selected = selectedPermissions.find(p => p.permission_uuid === permUuid);
    return selected?.data_scope || null;
  };

  const handleTogglePermission = (permission) => {
    if (isPermissionSelected(permission.uuid)) {
      // Remove permission
      onChange(selectedPermissions.filter(p => p.permission_uuid !== permission.uuid));
    } else {
      // Add permission
      onChange([...selectedPermissions, {
        permission_uuid: permission.uuid,
        data_scope: null,
        _permission: permission // Store for display
      }]);
    }
  };

  const handleToggleAll = () => {
    const filtered = filteredPermissions;
    const allSelected = filtered.every(p => isPermissionSelected(p.uuid));

    if (allSelected) {
      // Remove all filtered permissions
      const filteredUuids = filtered.map(p => p.uuid);
      onChange(selectedPermissions.filter(p => !filteredUuids.includes(p.permission_uuid)));
    } else {
      // Add all filtered permissions
      const toAdd = filtered
        .filter(p => !isPermissionSelected(p.uuid))
        .map(p => ({
          permission_uuid: p.uuid,
          data_scope: null,
          _permission: p
        }));
      onChange([...selectedPermissions, ...toAdd]);
    }
  };

  const handleSetScope = (permUuid, scope) => {
    onChange(selectedPermissions.map(p =>
      p.permission_uuid === permUuid
        ? { ...p, data_scope: scope }
        : p
    ));
  };

  const openScopeModal = (permission) => {
    setScopeModalPerm(permission);
    setShowScopeModal(true);
  };

  const closeScopeModal = () => {
    setShowScopeModal(false);
    setScopeModalPerm(null);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="text-gray-500">Loading permissions...</div>
      </div>
    );
  }

  const groupedFiltered = groupPermissionsByResource(filteredPermissions);

  return (
    <div className="space-y-4">
      {/* Controls */}
      <div className="flex flex-col md:flex-row gap-3">
        <input
          type="text"
          placeholder="Search permissions..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
        />
        <select
          value={selectedResource}
          onChange={(e) => setSelectedResource(e.target.value)}
          className="px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
        >
          <option value="all">All Resources</option>
          {resources.map(resource => (
            <option key={resource} value={resource}>{resource}</option>
          ))}
        </select>
        <button
          type="button"
          onClick={handleToggleAll}
          className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 transition-colors whitespace-nowrap"
        >
          {filteredPermissions.every(p => isPermissionSelected(p.uuid))
            ? 'Deselect All'
            : 'Select All'}
        </button>
      </div>

      {/* Selected Count */}
      <div className="text-sm text-gray-600">
        {selectedPermissions.length} permission{selectedPermissions.length !== 1 ? 's' : ''} selected
      </div>

      {/* Permission List */}
      <div className="border rounded-lg divide-y max-h-96 overflow-y-auto">
        {Object.keys(groupedFiltered).length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            No permissions found
          </div>
        ) : (
          Object.entries(groupedFiltered).map(([resource, perms]) => (
            <div key={resource} className="p-4">
              <h4 className="font-medium text-gray-900 mb-3">{resource}</h4>
              <div className="space-y-2">
                {perms.map(permission => {
                  const selected = isPermissionSelected(permission.uuid);
                  const scope = getPermissionScope(permission.uuid);

                  return (
                    <div
                      key={permission.uuid}
                      className={`flex items-center justify-between p-2 rounded transition-colors ${
                        selected ? 'bg-blue-50' : 'hover:bg-gray-50'
                      }`}
                    >
                      <label className="flex items-center flex-1 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={selected}
                          onChange={() => handleTogglePermission(permission)}
                          className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                        />
                        <div className="ml-3">
                          <div className="text-sm font-medium text-gray-900">
                            {formatPermissionName(permission.action)}
                          </div>
                          <div className="text-xs text-gray-500">
                            {permission.name}
                          </div>
                        </div>
                      </label>

                      {selected && (
                        <div className="flex items-center gap-2">
                          {scope ? (
                            <button
                              type="button"
                              onClick={() => openScopeModal(permission)}
                              className="px-2 py-1 text-xs bg-blue-100 text-blue-700 rounded hover:bg-blue-200 transition-colors"
                            >
                              Scope: {scope}
                            </button>
                          ) : (
                            <button
                              type="button"
                              onClick={() => openScopeModal(permission)}
                              className="px-2 py-1 text-xs border border-gray-300 text-gray-600 rounded hover:bg-gray-100 transition-colors"
                            >
                              Set Scope
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          ))
        )}
      </div>

      {/* Scope Selection Modal */}
      {showScopeModal && scopeModalPerm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              Set Data Scope
            </h3>
            <p className="text-sm text-gray-600 mb-4">
              For permission: <strong>{scopeModalPerm.name}</strong>
            </p>

            <div className="space-y-2 mb-6">
              <button
                onClick={() => {
                  handleSetScope(scopeModalPerm.uuid, null);
                  closeScopeModal();
                }}
                className={`w-full p-3 text-left border rounded-lg transition-colors ${
                  !getPermissionScope(scopeModalPerm.uuid)
                    ? 'border-blue-500 bg-blue-50'
                    : 'border-gray-300 hover:bg-gray-50'
                }`}
              >
                <div className="font-medium text-gray-900">No Scope</div>
                <div className="text-xs text-gray-500">Full access (default)</div>
              </button>

              {dataScopes.map(scope => (
                <button
                  key={scope.uuid}
                  onClick={() => {
                    handleSetScope(scopeModalPerm.uuid, scope.code);
                    closeScopeModal();
                  }}
                  className={`w-full p-3 text-left border rounded-lg transition-colors ${
                    getPermissionScope(scopeModalPerm.uuid) === scope.code
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-gray-300 hover:bg-gray-50'
                  }`}
                >
                  <div className="font-medium text-gray-900">{scope.name}</div>
                  <div className="text-xs text-gray-500">{scope.description}</div>
                </button>
              ))}
            </div>

            <div className="flex justify-end">
              <button
                onClick={closeScopeModal}
                className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
