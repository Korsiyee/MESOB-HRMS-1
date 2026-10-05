import React, { useState, useEffect } from 'react';
import { Shield, Lock } from 'lucide-react';
import { RbacApi } from '../../api/rbacApi';
import { useAuth } from '../../context/AuthContext';
import { usePermission } from '../../hooks/usePermission';
import PermissionBadge from '../../components/rbac/PermissionBadge';
import axios from 'axios';

const C = {
  card: '#EEF1F0', cardBorder: 'rgba(0,80,60,0.09)', shadow: '0 2px 12px rgba(0,60,45,0.07)',
  primary: '#0F766E', primaryHov: '#14B8A6', textMain: '#1A2E2B', textSub: '#1E4A42', textMuted: '#2E6058',
  border: 'rgba(0,80,60,0.12)', headerBg: 'linear-gradient(135deg, #0c1e1c 0%, #1e3a37 100%)',
};

const RoleManagementPage = () => {
  const { user } = useAuth();
  const canManageRoles = usePermission('roles', 'manage');
  const [roles, setRoles] = useState([]);
  const [selectedRole, setSelectedRole] = useState('employee');
  const [occupations, setOccupations] = useState([]);
  const [loading, setLoading] = useState(false);
  const [loadingRoles, setLoadingRoles] = useState(true);
  const [error, setError] = useState('');

  // Fetch dynamic roles from Permit
  useEffect(() => {
    const fetchRoles = async () => {
      try {
        const token = localStorage.getItem('authToken');
        const res = await axios.get('/api/permit/roles', {
          headers: { Authorization: `Bearer ${token}` }
        });
        const roleList = res.data?.roles || [];
        setRoles(roleList.map(r => ({
          value: r,
          label: r.replace(/_/g, ' ').toUpperCase(),
          desc: `${r.replace(/_/g, ' ')} role`,
          protected: ['employee', 'super_admin'].includes(r)
        })));
        if (roleList.length > 0) {
          setSelectedRole(roleList[0]);
        }
      } catch (err) {
        console.error('Failed to load roles:', err);
        setRoles([
          { value: 'employee', label: 'Employee', desc: 'Basic system user', protected: true },
          { value: 'department_head', label: 'Department Head', desc: 'Department manager', protected: true },
          { value: 'hr_officer', label: 'HR Officer', desc: 'HR operations', protected: true },
          { value: 'hr_admin', label: 'HR Admin', desc: 'HR management', protected: true },
          { value: 'super_admin', label: 'Super Admin', desc: 'Full system access', protected: true },
        ]);
        setSelectedRole('employee');
      } finally {
        setLoadingRoles(false);
      }
    };
    fetchRoles();
  }, []);

  useEffect(() => { 
    if (selectedRole) loadRoleOccupations(selectedRole); 
  }, [selectedRole]);

  const loadRoleOccupations = async (role) => {
    setLoading(true);
    setError('');
    try {
      const response = await RbacApi.getRoleOccupations(role);
      setOccupations(response.data?.occupations || []);
    } catch (err) {
      setError(err.message || 'Failed to load role occupations');
      setOccupations([]);
    } finally {
      setLoading(false);
    }
  };

  const handleRoleChange = (role) => {
    setSelectedRole(role);
  };

  const selectedRoleInfo = roles.find(r => r.value === selectedRole);

  return (
    <div style={{ fontFamily: 'Poppins, sans-serif', padding: '0 0 40px' }}>
      <div style={{ background: C.headerBg, borderRadius: 14, padding: '20px 24px', marginBottom: 20, boxShadow: '0 4px 20px rgba(0,0,0,0.18)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <Shield size={24} color="#E8F0EE" />
          <div>
            <h1 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 700, color: '#E8F0EE' }}>Role Management</h1>
            <p style={{ margin: '3px 0 0', fontSize: '0.72rem', color: 'rgba(232,240,238,0.6)' }}>View default role occupations</p>
          </div>
        </div>
      </div>

      {error && <div style={{ background: '#fef2f2', border: '1px solid #fca5a5', color: '#b91c1c', padding: '12px 16px', borderRadius: 8, marginBottom: 16, fontSize: '0.85rem' }}>{error}</div>}

      {!canManageRoles && (
        <div style={{ background: '#fffbeb', border: '1px solid #fcd34d', borderRadius: 8, padding: '12px 16px', marginBottom: 16, fontSize: '0.8rem', color: '#92400e' }}>
          ℹ️ Read-only view. You don't have permission to modify roles.
        </div>
      )}

      {/* Role Tabs */}
      <div style={{ background: C.card, borderRadius: 12, border: `1px solid ${C.cardBorder}`, boxShadow: C.shadow, padding: '20px', marginBottom: 20 }}>
        <h3 style={{ margin: '0 0 16px', fontSize: '0.95rem', fontWeight: 700, color: C.textMain }}>Select Role</h3>
        {loadingRoles ? (
          <div style={{ textAlign: 'center', padding: '20px', color: C.textMuted }}>Loading roles...</div>
        ) : (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
            {roles.map(role => (
              <button key={role.value} onClick={() => handleRoleChange(role.value)}
                style={{
                  padding: '12px 20px', border: `2px solid ${selectedRole === role.value ? C.primary : C.border}`, borderRadius: 8,
                  background: selectedRole === role.value ? 'rgba(15,118,110,0.1)' : '#fff', color: selectedRole === role.value ? C.primary : C.textSub,
                  fontSize: '0.85rem', fontWeight: 600, cursor: 'pointer', fontFamily: 'Poppins, sans-serif', display: 'flex', alignItems: 'center', gap: 8, flex: 1, minWidth: '180px', justifyContent: 'center',
                }}>
                {role.protected && <Lock size={14} />}
                <div style={{ textAlign: 'left' }}>
                  <div>{role.label}</div>
                  <div style={{ fontSize: '0.7rem', fontWeight: 400, opacity: 0.8 }}>{role.desc}</div>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Role Details */}
      <div style={{ background: C.card, borderRadius: 12, border: `1px solid ${C.cardBorder}`, boxShadow: C.shadow, padding: '20px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <h3 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 700, color: C.textMain }}>
            {selectedRoleInfo?.label} Occupations ({occupations.length})
          </h3>
          {selectedRoleInfo?.protected && (
            <span style={{ fontSize: '0.7rem', fontWeight: 700, padding: '4px 10px', borderRadius: 6, background: 'rgba(239,68,68,0.1)', color: '#DC2626', display: 'flex', alignItems: 'center', gap: 4 }}>
              <Lock size={12} /> Protected Role
            </span>
          )}
        </div>

        <div style={{ background: '#f0f9ff', border: '1px solid #bae6fd', borderRadius: 8, padding: '10px 14px', fontSize: '0.75rem', color: '#0c4a6e', marginBottom: 16 }}>
          ℹ️ All users with the <strong>{selectedRoleInfo?.label}</strong> role automatically inherit these occupations.
        </div>

        {loading && <div style={{ textAlign: 'center', padding: '40px', color: C.textMuted }}>Loading occupations...</div>}

        {!loading && occupations.length === 0 && (
          <div style={{ textAlign: 'center', padding: '40px', color: C.textMuted, fontStyle: 'italic' }}>
            No occupations assigned to this role
          </div>
        )}

        {!loading && occupations.length > 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {occupations.map((occ, idx) => (
              <PermissionBadge
                key={idx}
                occupationName={occ.occupation_name || occ.name || occ}
                effect="INHERITED"
                source="role"
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default RoleManagementPage;
