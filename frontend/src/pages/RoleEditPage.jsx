import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Save, X, Shield, Check } from 'lucide-react';
import roleManagementAPI from '../api/roleManagement';

const C = {
  card: '#EEF1F0',
  cardBorder: 'rgba(0,80,60,0.09)',
  shadow: '0 2px 12px rgba(0,60,45,0.07)',
  primary: '#0F766E',
  primaryHov: '#14B8A6',
  textMain: '#1A2E2B',
  textSub: '#1E4A42',
  textMuted: '#2E6058',
  border: 'rgba(0,80,60,0.12)',
  headerBg: 'linear-gradient(135deg, #0c1e1c 0%, #1e3a37 100%)',
};

export default function RoleEditPage() {
  const { roleUuid } = useParams();
  const navigate = useNavigate();
  const isCreateMode = !roleUuid || roleUuid === 'new'; // FIX: roleUuid is undefined for /new route

  const [loading, setLoading] = useState(false); // FIX: Always load permissions even in create mode
  const [saving, setSaving] = useState(false);
  const [allPermissions, setAllPermissions] = useState([]);
  const [role, setRole] = useState({
    name: '',
    code: '',
    description: '',
    hierarchy_level: 50,
    is_active: true
  });
  const [selectedPermissions, setSelectedPermissions] = useState(new Set());
  const [expandedResources, setExpandedResources] = useState(new Set());

  useEffect(() => {
    loadData();
  }, [roleUuid]);

  const loadData = async () => {
    try {
      setLoading(true);
      
      // Load all available permissions
      console.log('[RoleEditPage] Loading permissions...');
      const permsResponse = await roleManagementAPI.getAllPermissions();
      console.log('[RoleEditPage] Permissions response:', permsResponse);
      console.log('[RoleEditPage] Permissions data.resources:', permsResponse.data.resources);
      
      setAllPermissions(permsResponse.data.resources || []);

      // Expand all resources by default
      const resourceNames = (permsResponse.data.resources || []).map(r => r.name);
      console.log('[RoleEditPage] Resource names:', resourceNames);
      setExpandedResources(new Set(resourceNames));

      // If editing, load role data
      if (!isCreateMode) {
        const [roleRes, rolePermsRes] = await Promise.all([
          roleManagementAPI.getRoleById(roleUuid),
          roleManagementAPI.getRolePermissions(roleUuid)
        ]);

        setRole(roleRes.data.role);
        
        // Set selected permissions
        const permUuids = (rolePermsRes.data.permissions || []).map(p => p.uuid);
        setSelectedPermissions(new Set(permUuids));
      }
    } catch (err) {
      console.error('Error loading data:', err);
      alert(`Failed to load role data: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    // Validation
    if (!role.name || !role.code) {
      alert('Please fill in all required fields');
      return;
    }

    if (!/^[A-Z_]+$/.test(role.code)) {
      alert('Role code must contain only uppercase letters and underscores');
      return;
    }

    try {
      setSaving(true);

      let savedRole;
      if (isCreateMode) {
        // Create new role
        const createRes = await roleManagementAPI.createRole({
          name: role.name,
          code: role.code,
          description: role.description,
          hierarchy_level: role.hierarchy_level
        });
        savedRole = createRes.data.role;
      } else {
        // Update existing role
        const updateRes = await roleManagementAPI.updateRole(roleUuid, {
          name: role.name,
          description: role.description,
          hierarchy_level: role.hierarchy_level
        });
        savedRole = updateRes.data.role;
      }

      // Update permissions
      const permissionUuids = Array.from(selectedPermissions);
      await roleManagementAPI.replaceRolePermissions(
        isCreateMode ? savedRole.uuid : roleUuid,
        { permissionUuids }
      );

      alert('Role saved successfully');
      navigate('/admin/roles');
    } catch (err) {
      console.error('Error saving role:', err);
      alert(`Failed to save role: ${err.message}`);
    } finally {
      setSaving(false);
    }
  };

  const togglePermission = (permUuid) => {
    const newSelected = new Set(selectedPermissions);
    if (newSelected.has(permUuid)) {
      newSelected.delete(permUuid);
    } else {
      newSelected.add(permUuid);
    }
    setSelectedPermissions(newSelected);
  };

  const toggleResource = (resourceName) => {
    const newExpanded = new Set(expandedResources);
    if (newExpanded.has(resourceName)) {
      newExpanded.delete(resourceName);
    } else {
      newExpanded.add(resourceName);
    }
    setExpandedResources(newExpanded);
  };

  const selectAllInResource = (resource) => {
    const newSelected = new Set(selectedPermissions);
    const allSelected = resource.permissions.every(p => newSelected.has(p.uuid));
    
    resource.permissions.forEach(perm => {
      if (allSelected) {
        newSelected.delete(perm.uuid);
      } else {
        newSelected.add(perm.uuid);
      }
    });
    
    setSelectedPermissions(newSelected);
  };

  if (loading) {
    return (
      <div style={{ fontFamily: 'Poppins, sans-serif', padding: '100px 0', textAlign: 'center', color: C.textMuted }}>
        <div style={{ fontSize: '0.95rem' }}>Loading...</div>
      </div>
    );
  }

  return (
    <div style={{ fontFamily: 'Poppins, sans-serif', padding: '0 0 40px', maxWidth: 1200, margin: '0 auto' }}>
      {/* Header */}
      <div style={{ 
        background: C.headerBg, 
        borderRadius: 14, 
        padding: '22px 26px', 
        marginBottom: 24, 
        boxShadow: '0 4px 20px rgba(0,0,0,0.18)',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: 16
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <Shield size={28} color="#E8F0EE" />
          <div>
            <h1 style={{ margin: 0, fontSize: '1.35rem', fontWeight: 700, color: '#E8F0EE' }}>
              {isCreateMode ? 'Create New Role' : `Edit Role: ${role.name}`}
            </h1>
            <p style={{ margin: '4px 0 0', fontSize: '0.8rem', color: 'rgba(232,240,238,0.65)' }}>
              Configure role details and assign permissions
            </p>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <button
            onClick={() => navigate('/admin/roles')}
            disabled={saving}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              padding: '10px 18px',
              background: 'rgba(255,255,255,0.1)',
              color: '#fff',
              border: '1px solid rgba(255,255,255,0.2)',
              borderRadius: 8,
              fontSize: '0.9rem',
              fontWeight: 600,
              cursor: saving ? 'not-allowed' : 'pointer',
              fontFamily: 'Poppins, sans-serif',
              opacity: saving ? 0.5 : 1
            }}
          >
            <X size={18} /> Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              padding: '10px 20px',
              background: C.primary,
              color: '#fff',
              border: 'none',
              borderRadius: 8,
              fontSize: '0.9rem',
              fontWeight: 600,
              cursor: saving ? 'not-allowed' : 'pointer',
              fontFamily: 'Poppins, sans-serif',
              opacity: saving ? 0.5 : 1
            }}
          >
            <Save size={18} /> {saving ? 'Saving...' : 'Save Role'}
          </button>
        </div>
      </div>

      {/* Role Details Form */}
      <div style={{ 
        background: C.card, 
        border: `1px solid ${C.cardBorder}`, 
        borderRadius: 12, 
        padding: '24px',
        marginBottom: 20,
        boxShadow: C.shadow
      }}>
        <h2 style={{ margin: '0 0 20px', fontSize: '1.1rem', fontWeight: 700, color: C.textMain }}>
          Role Details
        </h2>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, marginBottom: 20 }}>
          <div>
            <label style={{ display: 'block', marginBottom: 6, fontSize: '0.85rem', fontWeight: 600, color: C.textSub }}>
              Role Name <span style={{ color: '#DC2626' }}>*</span>
            </label>
            <input
              type="text"
              value={role.name}
              onChange={(e) => setRole({ ...role, name: e.target.value })}
              placeholder="e.g., HR Manager"
              style={{
                width: '100%',
                padding: '10px 14px',
                border: `1px solid ${C.border}`,
                borderRadius: 8,
                fontSize: '0.9rem',
                fontFamily: 'Poppins, sans-serif',
                background: '#fff'
              }}
            />
          </div>

          <div>
            <label style={{ display: 'block', marginBottom: 6, fontSize: '0.85rem', fontWeight: 600, color: C.textSub }}>
              Role Code <span style={{ color: '#DC2626' }}>*</span>
            </label>
            <input
              type="text"
              value={role.code}
              onChange={(e) => setRole({ ...role, code: e.target.value.toUpperCase() })}
              placeholder="e.g., HR_MANAGER"
              disabled={!isCreateMode && role.is_system_role}
              style={{
                width: '100%',
                padding: '10px 14px',
                border: `1px solid ${C.border}`,
                borderRadius: 8,
                fontSize: '0.9rem',
                fontFamily: 'monospace',
                background: (!isCreateMode && role.is_system_role) ? '#f5f5f5' : '#fff',
                cursor: (!isCreateMode && role.is_system_role) ? 'not-allowed' : 'text'
              }}
            />
            <p style={{ margin: '4px 0 0', fontSize: '0.75rem', color: C.textMuted }}>
              Only uppercase letters and underscores allowed
            </p>
          </div>
        </div>

        <div style={{ marginBottom: 20 }}>
          <label style={{ display: 'block', marginBottom: 6, fontSize: '0.85rem', fontWeight: 600, color: C.textSub }}>
            Description
          </label>
          <textarea
            value={role.description || ''}
            onChange={(e) => setRole({ ...role, description: e.target.value })}
            placeholder="Brief description of this role's purpose and responsibilities"
            rows={3}
            style={{
              width: '100%',
              padding: '10px 14px',
              border: `1px solid ${C.border}`,
              borderRadius: 8,
              fontSize: '0.9rem',
              fontFamily: 'Poppins, sans-serif',
              background: '#fff',
              resize: 'vertical'
            }}
          />
        </div>

        <div>
          <label style={{ display: 'block', marginBottom: 6, fontSize: '0.85rem', fontWeight: 600, color: C.textSub }}>
            Hierarchy Level: {role.hierarchy_level}
          </label>
          <input
            type="range"
            min="1"
            max="100"
            value={role.hierarchy_level}
            onChange={(e) => setRole({ ...role, hierarchy_level: parseInt(e.target.value) })}
            style={{ width: '100%' }}
          />
          <p style={{ margin: '4px 0 0', fontSize: '0.75rem', color: C.textMuted }}>
            Higher levels can manage lower levels. System admin typically has level 100.
          </p>
        </div>
      </div>

      {/* Permissions Section */}
      <div style={{ 
        background: C.card, 
        border: `1px solid ${C.cardBorder}`, 
        borderRadius: 12, 
        padding: '24px',
        boxShadow: C.shadow
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <h2 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 700, color: C.textMain }}>
            Permissions ({selectedPermissions.size} selected)
          </h2>
        </div>

        {allPermissions.length === 0 ? (
          <div>
            <p style={{ color: C.textMuted, textAlign: 'center', padding: '40px 0' }}>
              No permissions available
            </p>
            <p style={{ color: C.textMuted, textAlign: 'center', fontSize: '0.8rem' }}>
              Debug: Loaded {allPermissions.length} resources
            </p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {allPermissions.map(resource => {
              const isExpanded = expandedResources.has(resource.name);
              const allSelected = resource.permissions.every(p => selectedPermissions.has(p.uuid));
              const someSelected = resource.permissions.some(p => selectedPermissions.has(p.uuid));
              
              return (
                <div 
                  key={resource.name}
                  style={{
                    border: `1px solid ${C.border}`,
                    borderRadius: 10,
                    overflow: 'hidden',
                    background: '#fff'
                  }}
                >
                  {/* Resource Header */}
                  <div style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    padding: '14px 18px',
                    background: someSelected ? 'rgba(15,118,110,0.05)' : '#f9fafb',
                    cursor: 'pointer',
                    borderBottom: isExpanded ? `1px solid ${C.border}` : 'none'
                  }}
                  onClick={() => toggleResource(resource.name)}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <span style={{ 
                        fontSize: '1.2rem',
                        transition: 'transform 0.2s',
                        transform: isExpanded ? 'rotate(90deg)' : 'rotate(0deg)'
                      }}>
                        ▶
                      </span>
                      <h3 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 700, color: C.textMain }}>
                        {resource.name}
                      </h3>
                      <span style={{ 
                        fontSize: '0.75rem', 
                        color: C.textMuted,
                        background: 'rgba(0,0,0,0.05)',
                        padding: '2px 8px',
                        borderRadius: 4
                      }}>
                        {resource.permissions.filter(p => selectedPermissions.has(p.uuid)).length} / {resource.permissions.length}
                      </span>
                    </div>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        selectAllInResource(resource);
                      }}
                      style={{
                        padding: '6px 14px',
                        fontSize: '0.8rem',
                        fontWeight: 600,
                        color: allSelected ? '#DC2626' : C.primary,
                        background: allSelected ? 'rgba(220,38,38,0.08)' : 'rgba(15,118,110,0.08)',
                        border: 'none',
                        borderRadius: 6,
                        cursor: 'pointer',
                        fontFamily: 'Poppins, sans-serif'
                      }}
                    >
                      {allSelected ? 'Deselect All' : 'Select All'}
                    </button>
                  </div>

                  {/* Permissions Grid */}
                  {isExpanded && (
                    <div style={{ 
                      padding: '16px',
                      display: 'grid',
                      gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
                      gap: 10
                    }}>
                      {resource.permissions.map(permission => {
                        const isSelected = selectedPermissions.has(permission.uuid);
                        return (
                          <div
                            key={permission.uuid}
                            onClick={() => togglePermission(permission.uuid)}
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              gap: 10,
                              padding: '10px 12px',
                              border: `2px solid ${isSelected ? C.primary : C.border}`,
                              borderRadius: 8,
                              cursor: 'pointer',
                              background: isSelected ? 'rgba(15,118,110,0.05)' : '#fff',
                              transition: 'all 0.2s ease'
                            }}
                          >
                            <div style={{
                              width: 20,
                              height: 20,
                              borderRadius: 4,
                              border: `2px solid ${isSelected ? C.primary : C.border}`,
                              background: isSelected ? C.primary : '#fff',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              flexShrink: 0
                            }}>
                              {isSelected && <Check size={14} color="#fff" />}
                            </div>
                            <span style={{ 
                              fontSize: '0.85rem', 
                              fontWeight: isSelected ? 600 : 400,
                              color: isSelected ? C.textMain : C.textSub 
                            }}>
                              {permission.action}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
