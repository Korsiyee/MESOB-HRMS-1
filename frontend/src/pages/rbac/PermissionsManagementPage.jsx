import React, { useState, useEffect } from 'react';
import { Search, Shield, Plus } from 'lucide-react';
import { RbacApi } from '../../api/rbacApi';
import { EmployeeApi } from '../../api/employeeApi';
import EffectiveAccessCard from '../../components/rbac/EffectiveAccessCard';

const C = {
  card: '#EEF1F0',
  cardBorder: 'rgba(0,80,60,0.09)',
  shadow: '0 2px 12px rgba(0,60,45,0.07)',
  primary: '#0F766E',
  primaryHov: '#14B8A6',
  success: '#10B981',
  warning: '#F59E0B',
  danger: '#EF4444',
  textMain: '#1A2E2B',
  textSub: '#1E4A42',
  textMuted: '#2E6058',
  border: 'rgba(0,80,60,0.12)',
  headerBg: 'linear-gradient(135deg, #0c1e1c 0%, #1e3a37 100%)',
};

const PermissionsManagementPage = () => {
  const [employees, setEmployees] = useState([]);
  const [occupations, setOccupations] = useState([]);
  const [selectedEmployee, setSelectedEmployee] = useState(null);
  const [effectiveData, setEffectiveData] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Assignment form state
  const [selectedOccupations, setSelectedOccupations] = useState([]);
  const [expiresAt, setExpiresAt] = useState('');
  const [assignReason, setAssignReason] = useState('');

  useEffect(() => {
    loadInitialData();
  }, []);

  const loadInitialData = async () => {
    try {
      // Use the new RBAC-specific endpoints
      const [usersData, occsData] = await Promise.all([
        RbacApi.listUsers({ has_account: 'true' }), // Only users with accounts
        RbacApi.listOccupations(), // Use RBAC API to list permissions/occupations
      ]);

      const userList = usersData?.data?.users || [];
      const occupationList = occsData?.data?.occupations || occsData?.data || [];

      setEmployees(Array.isArray(userList) ? userList : []);
      setOccupations(Array.isArray(occupationList) ? occupationList : []);
    } catch (err) {
      setError(err.message || 'Failed to load data');
    }
  };

  const loadEffectiveAccess = async (employee) => {
    if (!employee?.user_uuid) {
      setError('Employee does not have a linked user account');
      return;
    }

    setLoading(true);
    setError('');
    try {
      const response = await RbacApi.getEffectiveAccess(employee.user_uuid);
      setEffectiveData(response.data);
    } catch (err) {
      setError(err.message || 'Failed to load effective access');
      setEffectiveData(null);
    } finally {
      setLoading(false);
    }
  };

  const handleSelectEmployee = (employee) => {
    setSelectedEmployee(employee);
    setEffectiveData(null);
    setError('');
    setSuccess('');
    setSelectedOccupations([]);
    setExpiresAt('');
    setAssignReason('');
    loadEffectiveAccess(employee);
  };

  const handleAssignOccupations = async () => {
    if (!selectedEmployee?.user_uuid) {
      setError('No employee selected');
      return;
    }

    if (selectedOccupations.length === 0) {
      setError('Please select at least one occupation');
      return;
    }

    setLoading(true);
    setError('');
    setSuccess('');

    try {
      for (const occUuid of selectedOccupations) {
        await RbacApi.assignOccupationToUser(selectedEmployee.user_uuid, {
          occupation_uuid: occUuid,
          expires_at: expiresAt || null,
          assigned_reason: assignReason || 'Direct assignment via Permissions Management',
        });
      }

      setSuccess(`Assigned ${selectedOccupations.length} occupation(s) successfully. User must re-login.`);
      setSelectedOccupations([]);
      setExpiresAt('');
      setAssignReason('');

      // Reload effective access
      await loadEffectiveAccess(selectedEmployee);
    } catch (err) {
      setError(err.message || 'Failed to assign occupations');
    } finally {
      setLoading(false);
    }
  };

  const handleRemoveDirectAssignment = async (occupationUuid, occupationName) => {
    if (!selectedEmployee?.user_uuid) {
      setError('No employee selected');
      return;
    }

    const confirmed = window.confirm(
      `Remove "${occupationName}" from ${selectedEmployee.first_name} ${selectedEmployee.last_name}?\n\nUser must re-login for this to take effect.`
    );
    
    if (!confirmed) return;

    setLoading(true);
    setError('');
    setSuccess('');

    try {
      await RbacApi.removeOccupationFromUser(
        selectedEmployee.user_uuid,
        occupationUuid,
        'Removed via Permissions Management'
      );

      setSuccess('Direct assignment removed successfully. User must re-login.');
      
      // Reload effective access
      await loadEffectiveAccess(selectedEmployee);
    } catch (err) {
      setError(err.message || 'Failed to remove occupation');
    } finally {
      setLoading(false);
    }
  };

  const filteredEmployees = employees.filter(emp => {
    const fullName = `${emp.first_name || ''} ${emp.middle_name || ''} ${emp.last_name || ''}`.toLowerCase();
    const mesobId = emp.mesob_id?.toLowerCase() || '';
    const username = emp.username?.toLowerCase() || '';
    const search = searchTerm.toLowerCase();
    return fullName.includes(search) || mesobId.includes(search) || username.includes(search);
  });

  const toggleOccupation = (occUuid) => {
    setSelectedOccupations(prev =>
      prev.includes(occUuid)
        ? prev.filter(id => id !== occUuid)
        : [...prev, occUuid]
    );
  };

  return (
    <div style={{ fontFamily: 'Poppins, sans-serif', padding: '0 0 40px' }}>
      {/* Header */}
      <div style={{
        background: C.headerBg,
        borderRadius: 14,
        padding: '20px 24px',
        marginBottom: 20,
        boxShadow: '0 4px 20px rgba(0,0,0,0.18)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <Shield size={24} color="#E8F0EE" />
          <div>
            <h1 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 700, color: '#E8F0EE' }}>
              Permissions Management
            </h1>
            <p style={{ margin: '3px 0 0', fontSize: '0.72rem', color: 'rgba(232,240,238,0.6)' }}>
              Manage user occupations and effective access
            </p>
          </div>
        </div>
      </div>

      {/* Success/Error Messages */}
      {success && (
        <div style={{
          background: '#f0fdf4',
          border: '1px solid #86efac',
          color: '#166534',
          padding: '12px 16px',
          borderRadius: 8,
          marginBottom: 16,
          fontSize: '0.85rem',
        }}>
          ✓ {success}
        </div>
      )}

      {error && (
        <div style={{
          background: '#fef2f2',
          border: '1px solid #fca5a5',
          color: '#b91c1c',
          padding: '12px 16px',
          borderRadius: 8,
          marginBottom: 16,
          fontSize: '0.85rem',
        }}>
          {error}
        </div>
      )}

      {/* Info Notice */}
      <div style={{
        background: '#eff6ff',
        border: '1px solid #bfdbfe',
        color: '#1e40af',
        padding: '12px 16px',
        borderRadius: 8,
        marginBottom: 16,
        fontSize: '0.8rem',
      }}>
        ℹ️ Only employees with user accounts are shown here. To create a user account for an employee, use the Accounts management page.
      </div>

      {/* User Search & Selection */}
      <div style={{
        background: C.card,
        borderRadius: 12,
        border: `1px solid ${C.cardBorder}`,
        boxShadow: C.shadow,
        padding: '20px',
        marginBottom: 20,
      }}>
        <h3 style={{
          margin: '0 0 16px',
          fontSize: '0.95rem',
          fontWeight: 700,
          color: C.textMain,
        }}>
          Select User
        </h3>

        <div style={{ position: 'relative', marginBottom: 16 }}>
          <Search size={18} style={{
            position: 'absolute',
            left: 12,
            top: '50%',
            transform: 'translateY(-50%)',
            color: C.textMuted,
          }} />
          <input
            type="text"
            placeholder="Search by name, Mesob ID, or username..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={{
              width: '100%',
              border: `1px solid ${C.border}`,
              borderRadius: 8,
              padding: '10px 12px 10px 42px',
              fontSize: '0.85rem',
              color: C.textMain,
              background: '#fff',
              outline: 'none',
              fontFamily: 'Poppins, sans-serif',
              boxSizing: 'border-box',
            }}
          />
        </div>

        <div style={{
          maxHeight: '200px',
          overflowY: 'auto',
          border: `1px solid ${C.border}`,
          borderRadius: 8,
        }}>
          {filteredEmployees.map((emp) => (
            <div
              key={emp.user_uuid}
              onClick={() => handleSelectEmployee(emp)}
              style={{
                padding: '12px 16px',
                borderBottom: `1px solid ${C.border}`,
                cursor: 'pointer',
                background: selectedEmployee?.user_uuid === emp.user_uuid ? 'rgba(15,118,110,0.1)' : '#fff',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
              }}
            >
              <div>
                <div style={{ fontSize: '0.85rem', fontWeight: 600, color: C.textMain }}>
                  {emp.first_name} {emp.last_name}
                </div>
                <div style={{ fontSize: '0.72rem', color: C.textMuted }}>
                  {emp.mesob_id} • {emp.username} {emp.user_role && `• ${emp.user_role}`}
                </div>
              </div>
              {selectedEmployee?.user_uuid === emp.user_uuid && (
                <div style={{
                  width: 20,
                  height: 20,
                  borderRadius: '50%',
                  background: C.primary,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#fff',
                  fontSize: '0.7rem',
                }}>
                  ✓
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Effective Access Breakdown */}
      {selectedEmployee && (
        <>
          <EffectiveAccessCard
            effectiveData={effectiveData}
            compact={false}
            onRefresh={() => loadEffectiveAccess(selectedEmployee)}
            onRemoveDirectAssignment={handleRemoveDirectAssignment}
          />

          {/* Assign Occupation Form */}
          <div style={{
            background: C.card,
            borderRadius: 12,
            border: `1px solid ${C.cardBorder}`,
            boxShadow: C.shadow,
            padding: '20px',
            marginTop: 20,
          }}>
            <h3 style={{
              margin: '0 0 16px',
              fontSize: '0.95rem',
              fontWeight: 700,
              color: C.textMain,
              display: 'flex',
              alignItems: 'center',
              gap: 8,
            }}>
              <Plus size={18} color={C.primary} />
              Assign New Occupation
            </h3>

            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))',
              gap: 10,
              marginBottom: 16,
              maxHeight: '300px',
              overflowY: 'auto',
            }}>
              {occupations.map((occ) => (
                <div
                  key={occ.uuid}
                  onClick={() => toggleOccupation(occ.uuid)}
                  style={{
                    padding: '10px 12px',
                    border: `2px solid ${selectedOccupations.includes(occ.uuid) ? C.primary : C.border}`,
                    borderRadius: 8,
                    background: selectedOccupations.includes(occ.uuid) ? 'rgba(15,118,110,0.05)' : '#fff',
                    cursor: 'pointer',
                    fontSize: '0.8rem',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                  }}
                >
                  <div style={{
                    minWidth: 18,
                    height: 18,
                    borderRadius: 4,
                    border: `2px solid ${selectedOccupations.includes(occ.uuid) ? C.primary : C.border}`,
                    background: selectedOccupations.includes(occ.uuid) ? C.primary : '#fff',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#fff',
                    fontSize: '0.7rem',
                  }}>
                    {selectedOccupations.includes(occ.uuid) && '✓'}
                  </div>
                  <span style={{ fontWeight: 500 }}>{occ.name}</span>
                </div>
              ))}
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 16 }}>
              <div>
                <label style={{
                  display: 'block',
                  fontSize: '0.8rem',
                  fontWeight: 600,
                  color: C.textSub,
                  marginBottom: 6,
                }}>
                  Expires At (optional)
                </label>
                <input
                  type="date"
                  value={expiresAt}
                  onChange={(e) => setExpiresAt(e.target.value)}
                  min={new Date().toISOString().split('T')[0]}
                  style={{
                    width: '100%',
                    border: `1px solid ${C.border}`,
                    borderRadius: 8,
                    padding: '10px 12px',
                    fontSize: '0.85rem',
                    color: C.textMain,
                    background: '#fff',
                    outline: 'none',
                    fontFamily: 'Poppins, sans-serif',
                    boxSizing: 'border-box',
                  }}
                />
              </div>
              <div>
                <label style={{
                  display: 'block',
                  fontSize: '0.8rem',
                  fontWeight: 600,
                  color: C.textSub,
                  marginBottom: 6,
                }}>
                  Reason
                </label>
                <input
                  type="text"
                  value={assignReason}
                  onChange={(e) => setAssignReason(e.target.value)}
                  placeholder="Why is this being assigned?"
                  style={{
                    width: '100%',
                    border: `1px solid ${C.border}`,
                    borderRadius: 8,
                    padding: '10px 12px',
                    fontSize: '0.85rem',
                    color: C.textMain,
                    background: '#fff',
                    outline: 'none',
                    fontFamily: 'Poppins, sans-serif',
                    boxSizing: 'border-box',
                  }}
                />
              </div>
            </div>

            <button
              onClick={handleAssignOccupations}
              disabled={loading || selectedOccupations.length === 0}
              style={{
                background: (loading || selectedOccupations.length === 0) ? '#9ca3af' : C.primary,
                color: '#fff',
                border: 'none',
                borderRadius: 8,
                padding: '10px 20px',
                fontSize: '0.85rem',
                fontWeight: 600,
                cursor: (loading || selectedOccupations.length === 0) ? 'not-allowed' : 'pointer',
                fontFamily: 'Poppins, sans-serif',
                display: 'flex',
                alignItems: 'center',
                gap: 8,
              }}
            >
              <Plus size={16} />
              Assign Occupations ({selectedOccupations.length})
            </button>
          </div>
        </>
      )}
    </div>
  );
};

export default PermissionsManagementPage;
