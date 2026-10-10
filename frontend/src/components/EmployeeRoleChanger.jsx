import React, { useState, useEffect } from 'react';
import { Shield, AlertCircle, CheckCircle } from 'lucide-react';
import { getAllRoles } from '../api/roleManagement';
import { apiRequest } from '../utils/apiClient';
import { useAuth } from '../context/AuthContext';

const EmployeeRoleChanger = ({ employeeUuid, currentRole, onRoleChanged }) => {
  const { user } = useAuth();
  const [roles, setRoles] = useState([]);
  const [selectedRoleUuid, setSelectedRoleUuid] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Check if current user can change roles (HR_ADMIN or SUPER_ADMIN)
  const canChangeRoles = user?.role?.name === 'HR_ADMIN' || user?.role?.name === 'SUPER_ADMIN';

  useEffect(() => {
    if (canChangeRoles) {
      loadRoles();
    }
  }, [canChangeRoles]);

  const loadRoles = async () => {
    try {
      const response = await getAllRoles();
      setRoles(response.data?.roles || []);
    } catch (err) {
      console.error('Failed to load roles:', err);
    }
  };

  const handleRoleChange = async () => {
    if (!selectedRoleUuid) {
      setError('Please select a role');
      return;
    }

    setLoading(true);
    setError('');
    setSuccess('');

    try {
      await apiRequest(`/employees/${employeeUuid}/role`, {
        method: 'PATCH',
        body: JSON.stringify({ role_uuid: selectedRoleUuid })
      });

      const newRole = roles.find(r => r.uuid === selectedRoleUuid);
      setSuccess(`Role updated to ${newRole?.name || 'selected role'}. User must re-login for changes to take effect.`);
      setSelectedRoleUuid('');
      
      if (onRoleChanged) {
        onRoleChanged(newRole);
      }
    } catch (err) {
      setError(err.message || 'Failed to update role');
    } finally {
      setLoading(false);
    }
  };

  if (!canChangeRoles) {
    return null;
  }

  return (
    <div style={{
      background: '#EEF1F0',
      borderRadius: 12,
      border: '1px solid rgba(0,80,60,0.09)',
      boxShadow: '0 2px 12px rgba(0,60,45,0.07)',
      padding: '20px 24px',
      marginBottom: 16,
    }}>
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        marginBottom: 16,
      }}>
        <Shield size={18} color="#0F766E" />
        <span style={{
          fontSize: '0.9rem',
          fontWeight: 700,
          color: '#1A2E2B',
        }}>Change User Role</span>
      </div>

      <div style={{ marginBottom: 12 }}>
        <p style={{
          fontSize: '0.8rem',
          color: '#2E6058',
          margin: '0 0 8px',
        }}>
          Current Role: <strong>{currentRole?.name || 'None'}</strong>
        </p>
        <p style={{
          fontSize: '0.75rem',
          color: '#6B7280',
          margin: '0 0 12px',
          fontStyle: 'italic',
        }}>
          Changing the role will update the user's system access permissions.
        </p>
      </div>

      <div style={{
        display: 'flex',
        gap: 12,
        alignItems: 'flex-end',
      }}>
        <div style={{ flex: 1 }}>
          <label style={{
            display: 'block',
            fontSize: '0.75rem',
            fontWeight: 600,
            color: '#1E4A42',
            marginBottom: 6,
          }}>
            New Role
          </label>
          <select
            value={selectedRoleUuid}
            onChange={(e) => setSelectedRoleUuid(e.target.value)}
            disabled={loading}
            style={{
              width: '100%',
              padding: '10px 14px',
              border: '1px solid rgba(0,80,60,0.12)',
              borderRadius: 8,
              fontSize: '0.82rem',
              color: '#1A2E2B',
              background: '#EEF1F0',
              outline: 'none',
              cursor: loading ? 'not-allowed' : 'pointer',
            }}
          >
            <option value="">Select New Role</option>
            {roles.map(role => (
              <option key={role.uuid} value={role.uuid}>
                {role.name}
              </option>
            ))}
          </select>
        </div>

        <button
          onClick={handleRoleChange}
          disabled={loading || !selectedRoleUuid}
          style={{
            background: loading || !selectedRoleUuid ? '#8AADA6' : '#0F766E',
            color: '#fff',
            border: 'none',
            borderRadius: 8,
            padding: '10px 20px',
            fontSize: '0.82rem',
            fontWeight: 600,
            cursor: loading || !selectedRoleUuid ? 'not-allowed' : 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            transition: 'background 0.15s',
          }}
          onMouseEnter={(e) => {
            if (!loading && selectedRoleUuid) {
              e.currentTarget.style.background = '#14B8A6';
            }
          }}
          onMouseLeave={(e) => {
            if (!loading && selectedRoleUuid) {
              e.currentTarget.style.background = '#0F766E';
            }
          }}
        >
          {loading ? 'Updating...' : 'Update Role'}
        </button>
      </div>

      {error && (
        <div style={{
          marginTop: 12,
          padding: '10px 14px',
          borderRadius: 8,
          background: '#FEE2E2',
          border: '1px solid #FCA5A5',
          display: 'flex',
          alignItems: 'center',
          gap: 8,
        }}>
          <AlertCircle size={16} color="#DC2626" />
          <span style={{ fontSize: '0.8rem', color: '#991B1B' }}>{error}</span>
        </div>
      )}

      {success && (
        <div style={{
          marginTop: 12,
          padding: '10px 14px',
          borderRadius: 8,
          background: '#DCFCE7',
          border: '1px solid #86EFAC',
          display: 'flex',
          alignItems: 'center',
          gap: 8,
        }}>
          <CheckCircle size={16} color="#16A34A" />
          <span style={{ fontSize: '0.8rem', color: '#166534' }}>{success}</span>
        </div>
      )}
    </div>
  );
};

export default EmployeeRoleChanger;
