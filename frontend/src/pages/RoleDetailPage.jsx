import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Shield, Edit2, Users, FileText } from 'lucide-react';
import { PermissionGuard } from '../components/PermissionGuard';
import roleManagementAPI from '../api/roleManagement';
import { groupPermissionsByResource, formatPermissionName } from '../utils/permissions';

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

export default function RoleDetailPage() {
  const { roleUuid } = useParams();
  const navigate = useNavigate();
  const [role, setRole] = useState(null);
  const [permissions, setPermissions] = useState([]);
  const [users, setUsers] = useState([]);
  const [auditLogs, setAuditLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('permissions');

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

  if (loading) {
    return (
      <div style={{ fontFamily: 'Poppins, sans-serif', padding: '100px 0', textAlign: 'center', color: C.textMuted }}>
        <div style={{ fontSize: '0.95rem' }}>Loading role details...</div>
      </div>
    );
  }

  if (!role) {
    return (
      <div style={{ fontFamily: 'Poppins, sans-serif', padding: '60px 20px', textAlign: 'center' }}>
        <p style={{ color: C.textMuted }}>Role not found</p>
      </div>
    );
  }

  const groupedPermissions = groupPermissionsByResource(permissions);

  return (
    <div style={{ fontFamily: 'Poppins, sans-serif', padding: '0 0 40px' }}>
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
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
              <h1 style={{ margin: 0, fontSize: '1.35rem', fontWeight: 700, color: '#E8F0EE' }}>
                {role.name}
              </h1>
              {role.is_system_role && (
                <span style={{
                  padding: '4px 10px',
                  fontSize: '0.75rem',
                  fontWeight: 700,
                  background: 'rgba(147,51,234,0.2)',
                  color: '#E9D5FF',
                  borderRadius: 6
                }}>
                  System Role
                </span>
              )}
              {!role.is_active && (
                <span style={{
                  padding: '4px 10px',
                  fontSize: '0.75rem',
                  fontWeight: 700,
                  background: 'rgba(156,163,175,0.2)',
                  color: '#D1D5DB',
                  borderRadius: 6
                }}>
                  Inactive
                </span>
              )}
            </div>
            <p style={{ margin: '4px 0 0', fontSize: '0.8rem', color: 'rgba(232,240,238,0.65)', fontFamily: 'monospace' }}>
              {role.code}
            </p>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <button
            onClick={() => navigate('/admin/roles')}
            style={{
              padding: '10px 18px',
              background: 'rgba(255,255,255,0.1)',
              color: '#fff',
              border: '1px solid rgba(255,255,255,0.2)',
              borderRadius: 8,
              fontSize: '0.9rem',
              fontWeight: 600,
              cursor: 'pointer',
              fontFamily: 'Poppins, sans-serif'
            }}
          >
            ← Back
          </button>
          <PermissionGuard permissions="Roles.Update">
            <button
              onClick={() => navigate(`/admin/roles/${roleUuid}/edit`)}
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
                cursor: 'pointer',
                fontFamily: 'Poppins, sans-serif'
              }}
            >
              <Edit2 size={18} /> Edit Role
            </button>
          </PermissionGuard>
        </div>
      </div>

      {/* Stats Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16, marginBottom: 24 }}>
        <div style={{
          background: C.card,
          border: `1px solid ${C.cardBorder}`,
          borderRadius: 12,
          padding: '20px',
          boxShadow: C.shadow
        }}>
          <p style={{ margin: '0 0 8px', fontSize: '0.85rem', color: C.textMuted, fontWeight: 600 }}>Hierarchy Level</p>
          <p style={{ margin: 0, fontSize: '1.6rem', fontWeight: 700, color: C.textMain }}>{role.hierarchy_level}</p>
        </div>
        <div style={{
          background: C.card,
          border: `1px solid ${C.cardBorder}`,
          borderRadius: 12,
          padding: '20px',
          boxShadow: C.shadow
        }}>
          <p style={{ margin: '0 0 8px', fontSize: '0.85rem', color: C.textMuted, fontWeight: 600 }}>Permissions</p>
          <p style={{ margin: 0, fontSize: '1.6rem', fontWeight: 700, color: C.textMain }}>{permissions.length}</p>
        </div>
        <div style={{
          background: C.card,
          border: `1px solid ${C.cardBorder}`,
          borderRadius: 12,
          padding: '20px',
          boxShadow: C.shadow
        }}>
          <p style={{ margin: '0 0 8px', fontSize: '0.85rem', color: C.textMuted, fontWeight: 600 }}>Assigned Users</p>
          <p style={{ margin: 0, fontSize: '1.6rem', fontWeight: 700, color: C.textMain }}>{users.length}</p>
        </div>
        <div style={{
          background: C.card,
          border: `1px solid ${C.cardBorder}`,
          borderRadius: 12,
          padding: '20px',
          boxShadow: C.shadow
        }}>
          <p style={{ margin: '0 0 8px', fontSize: '0.85rem', color: C.textMuted, fontWeight: 600 }}>Status</p>
          <p style={{ margin: 0, fontSize: '1.6rem', fontWeight: 700, color: role.is_active ? '#059669' : '#6B7280' }}>
            {role.is_active ? 'Active' : 'Inactive'}
          </p>
        </div>
      </div>

      {role.description && (
        <div style={{
          background: C.card,
          border: `1px solid ${C.cardBorder}`,
          borderRadius: 12,
          padding: '20px',
          marginBottom: 24,
          boxShadow: C.shadow
        }}>
          <p style={{ margin: '0 0 10px', fontSize: '0.85rem', fontWeight: 600, color: C.textMuted }}>Description</p>
          <p style={{ margin: 0, fontSize: '0.95rem', color: C.textSub, lineHeight: 1.6 }}>{role.description}</p>
        </div>
      )}

      {/* Tabs */}
      <div style={{ marginBottom: 20 }}>
        <div style={{ display: 'flex', gap: 6, background: C.card, borderRadius: 10, padding: 8, border: `1px solid ${C.cardBorder}` }}>
          {[
            { key: 'permissions', label: `Permissions (${permissions.length})`, icon: Shield },
            { key: 'users', label: `Users (${users.length})`, icon: Users },
            { key: 'audit', label: 'Audit Log', icon: FileText }
          ].map(tab => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                style={{
                  flex: 1,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 8,
                  padding: '12px 16px',
                  border: 'none',
                  borderRadius: 8,
                  background: activeTab === tab.key ? C.primary : 'transparent',
                  color: activeTab === tab.key ? '#fff' : C.textSub,
                  fontSize: '0.9rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                  fontFamily: 'Poppins, sans-serif',
                  transition: 'all 0.2s ease'
                }}
              >
                <Icon size={18} />
                {tab.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Tab Content */}
      <div style={{ background: C.card, border: `1px solid ${C.cardBorder}`, borderRadius: 12, padding: '24px', boxShadow: C.shadow }}>
        {activeTab === 'permissions' && (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 700, color: C.textMain }}>Role Permissions</h3>
              <PermissionGuard permissions="Roles.AssignPermissions">
                <button
                  onClick={() => navigate(`/admin/roles/${roleUuid}/edit`)}
                  style={{
                    padding: '8px 16px',
                    background: C.primary,
                    color: '#fff',
                    border: 'none',
                    borderRadius: 7,
                    fontSize: '0.85rem',
                    fontWeight: 600,
                    cursor: 'pointer',
                    fontFamily: 'Poppins, sans-serif'
                  }}
                >
                  Edit Permissions
                </button>
              </PermissionGuard>
            </div>
            {permissions.length === 0 ? (
              <p style={{ color: C.textMuted, textAlign: 'center', padding: '40px 0' }}>No permissions assigned</p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                {Object.entries(groupedPermissions).map(([resource, perms]) => (
                  <div key={resource}>
                    <h4 style={{ margin: '0 0 12px', fontSize: '1rem', fontWeight: 700, color: C.textMain, paddingBottom: 8, borderBottom: `2px solid ${C.border}` }}>
                      {resource} <span style={{ fontSize: '0.85rem', fontWeight: 400, color: C.textMuted }}>({perms.length})</span>
                    </h4>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: 10 }}>
                      {perms.map(perm => (
                        <div
                          key={perm.uuid}
                          style={{
                            padding: '10px 14px',
                            background: '#fff',
                            border: `1px solid ${C.border}`,
                            borderRadius: 8,
                            fontSize: '0.85rem',
                            color: C.textSub,
                            fontWeight: 500
                          }}
                        >
                          {formatPermissionName(perm.action)}
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
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 700, color: C.textMain }}>Assigned Users</h3>
            </div>
            {users.length === 0 ? (
              <p style={{ color: C.textMuted, textAlign: 'center', padding: '40px 0' }}>No users assigned to this role</p>
            ) : (
              <div style={{ overflow: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ background: 'rgba(0,0,0,0.02)', borderBottom: `2px solid ${C.border}` }}>
                      <th style={{ padding: '12px', textAlign: 'left', fontSize: '0.8rem', fontWeight: 700, color: C.textMuted }}>NAME</th>
                      <th style={{ padding: '12px', textAlign: 'left', fontSize: '0.8rem', fontWeight: 700, color: C.textMuted }}>EMAIL</th>
                      <th style={{ padding: '12px', textAlign: 'left', fontSize: '0.8rem', fontWeight: 700, color: C.textMuted }}>EMPLOYEE ID</th>
                      <th style={{ padding: '12px', textAlign: 'left', fontSize: '0.8rem', fontWeight: 700, color: C.textMuted }}>STATUS</th>
                    </tr>
                  </thead>
                  <tbody>
                    {users.map(user => (
                      <tr key={user.uuid} style={{ borderBottom: `1px solid ${C.border}` }}>
                        <td style={{ padding: '14px 12px', fontSize: '0.9rem', fontWeight: 600, color: C.textMain }}>
                          {user.full_name || user.username}
                        </td>
                        <td style={{ padding: '14px 12px', fontSize: '0.85rem', color: C.textSub }}>
                          {user.email}
                        </td>
                        <td style={{ padding: '14px 12px', fontSize: '0.85rem', color: C.textSub }}>
                          {user.employee_id || '-'}
                        </td>
                        <td style={{ padding: '14px 12px' }}>
                          <span style={{
                            padding: '4px 10px',
                            fontSize: '0.75rem',
                            fontWeight: 700,
                            background: user.is_active ? 'rgba(5,150,105,0.12)' : 'rgba(107,114,128,0.12)',
                            color: user.is_active ? '#059669' : '#6B7280',
                            borderRadius: 6
                          }}>
                            {user.is_active ? 'Active' : 'Inactive'}
                          </span>
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
            <h3 style={{ margin: '0 0 20px', fontSize: '1.1rem', fontWeight: 700, color: C.textMain }}>Audit Log</h3>
            {auditLogs.length === 0 ? (
              <p style={{ color: C.textMuted, textAlign: 'center', padding: '40px 0' }}>No audit logs available</p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {auditLogs.map(log => (
                  <div
                    key={log.id}
                    style={{
                      padding: '16px',
                      border: `1px solid ${C.border}`,
                      borderRadius: 10,
                      background: '#fff'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
                      <span style={{ fontSize: '0.9rem', fontWeight: 700, color: C.textMain }}>{log.action}</span>
                      <span style={{
                        padding: '2px 8px',
                        fontSize: '0.7rem',
                        fontWeight: 600,
                        background: 'rgba(0,0,0,0.05)',
                        color: C.textMuted,
                        borderRadius: 4
                      }}>
                        {log.resource_type}
                      </span>
                    </div>
                    {log.description && (
                      <p style={{ margin: '0 0 10px', fontSize: '0.85rem', color: C.textSub }}>{log.description}</p>
                    )}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12, fontSize: '0.75rem', color: C.textMuted }}>
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
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
