import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Shield, Plus, Eye, Edit2, Power, Trash2, Lock } from 'lucide-react';
import { PermissionGuard } from '../components/PermissionGuard';
import { usePermissions } from '../hooks/usePermissions';
import roleManagementAPI from '../api/roleManagement';

// Design tokens matching the HRMS color scheme
const C = {
  card: '#EEF1F0',
  cardBorder: 'rgba(0,80,60,0.09)',
  shadow: '0 2px 12px rgba(0,60,45,0.07)',
  shadowHover: '0 8px 28px rgba(0,60,45,0.14), 0 2px 6px rgba(0,0,0,0.07)',
  primary: '#0F766E',
  primaryHov: '#14B8A6',
  textMain: '#1A2E2B',
  textSub: '#1E4A42',
  textMuted: '#2E6058',
  border: 'rgba(0,80,60,0.12)',
  headerBg: 'linear-gradient(135deg, #0c1e1c 0%, #1e3a37 100%)',
};

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
      <div style={{ 
        fontFamily: 'Poppins, sans-serif', 
        padding: '100px 0', 
        textAlign: 'center',
        color: C.textMuted 
      }}>
        <div style={{ fontSize: '0.95rem' }}>Loading roles...</div>
      </div>
    );
  }

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
            <h1 style={{ 
              margin: 0, 
              fontSize: '1.35rem', 
              fontWeight: 700, 
              color: '#E8F0EE' 
            }}>
              Role Management
            </h1>
            <p style={{ 
              margin: '4px 0 0', 
              fontSize: '0.8rem', 
              color: 'rgba(232,240,238,0.65)' 
            }}>
              Manage roles, permissions, and data access scopes
            </p>
          </div>
        </div>
        <PermissionGuard permissions="Roles.Create">
          <button
            onClick={handleCreateRole}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              padding: '11px 20px',
              background: C.primary,
              color: '#fff',
              border: 'none',
              borderRadius: 8,
              fontSize: '0.9rem',
              fontWeight: 600,
              cursor: 'pointer',
              fontFamily: 'Poppins, sans-serif',
              transition: 'all 0.2s ease',
            }}
            onMouseOver={(e) => e.currentTarget.style.background = C.primaryHov}
            onMouseOut={(e) => e.currentTarget.style.background = C.primary}
          >
            <Plus size={18} /> Create Role
          </button>
        </PermissionGuard>
      </div>

      {/* Filter Tabs */}
      <div style={{ 
        background: C.card, 
        borderRadius: 12, 
        border: `1px solid ${C.cardBorder}`, 
        boxShadow: C.shadow, 
        padding: '8px', 
        marginBottom: 20,
        display: 'flex',
        gap: 6
      }}>
        {[
          { key: 'all', label: 'All Roles' },
          { key: 'system', label: 'System Roles' },
          { key: 'custom', label: 'Custom Roles' }
        ].map(tab => (
          <button
            key={tab.key}
            onClick={() => setFilter(tab.key)}
            style={{
              flex: 1,
              padding: '10px 16px',
              border: 'none',
              borderRadius: 8,
              background: filter === tab.key ? C.primary : 'transparent',
              color: filter === tab.key ? '#fff' : C.textSub,
              fontSize: '0.85rem',
              fontWeight: 600,
              cursor: 'pointer',
              fontFamily: 'Poppins, sans-serif',
              transition: 'all 0.2s ease',
            }}
            onMouseOver={(e) => {
              if (filter !== tab.key) {
                e.currentTarget.style.background = 'rgba(15,118,110,0.08)';
              }
            }}
            onMouseOut={(e) => {
              if (filter !== tab.key) {
                e.currentTarget.style.background = 'transparent';
              }
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Error Message */}
      {error && (
        <div style={{ 
          background: '#fef2f2', 
          border: '1px solid #fca5a5', 
          borderRadius: 10, 
          padding: '14px 18px', 
          marginBottom: 20 
        }}>
          <p style={{ 
            margin: 0, 
            fontSize: '0.85rem', 
            color: '#b91c1c', 
            fontWeight: 500 
          }}>
            {error}
          </p>
        </div>
      )}

      {/* Roles Grid */}
      {roles.length === 0 ? (
        <div style={{ 
          background: C.card, 
          borderRadius: 12, 
          border: `1px solid ${C.cardBorder}`, 
          boxShadow: C.shadow, 
          padding: '60px 20px', 
          textAlign: 'center' 
        }}>
          <p style={{ 
            margin: 0, 
            color: C.textMuted, 
            fontSize: '0.9rem', 
            fontStyle: 'italic' 
          }}>
            No roles found
          </p>
        </div>
      ) : (
        <div style={{ 
          display: 'grid', 
          gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', 
          gap: 18 
        }}>
          {roles.map(role => (
            <div
              key={role.uuid}
              style={{
                background: C.card,
                border: `1px solid ${C.cardBorder}`,
                borderRadius: 12,
                padding: '20px',
                boxShadow: C.shadow,
                transition: 'all 0.3s ease',
                opacity: role.is_active ? 1 : 0.6,
                cursor: 'pointer'
              }}
              onMouseOver={(e) => {
                e.currentTarget.style.boxShadow = C.shadowHover;
                e.currentTarget.style.transform = 'translateY(-2px)';
              }}
              onMouseOut={(e) => {
                e.currentTarget.style.boxShadow = C.shadow;
                e.currentTarget.style.transform = 'translateY(0)';
              }}
            >
              {/* Role Header */}
              <div style={{ 
                display: 'flex', 
                justifyContent: 'space-between', 
                alignItems: 'start', 
                marginBottom: 14 
              }}>
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                    <h3 style={{ 
                      margin: 0, 
                      fontSize: '1.05rem', 
                      fontWeight: 700, 
                      color: C.textMain 
                    }}>
                      {role.name}
                    </h3>
                    {role.is_system_role && (
                      <span style={{
                        padding: '3px 8px',
                        fontSize: '0.7rem',
                        fontWeight: 700,
                        background: 'rgba(147,51,234,0.12)',
                        color: '#7C3AED',
                        borderRadius: 6,
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 4
                      }}>
                        <Lock size={11} /> System
                      </span>
                    )}
                    {!role.is_active && (
                      <span style={{
                        padding: '3px 8px',
                        fontSize: '0.7rem',
                        fontWeight: 700,
                        background: 'rgba(107,114,128,0.12)',
                        color: '#6B7280',
                        borderRadius: 6
                      }}>
                        Inactive
                      </span>
                    )}
                  </div>
                  <p style={{ 
                    margin: '4px 0 0', 
                    fontSize: '0.72rem', 
                    color: C.textMuted, 
                    fontFamily: 'monospace' 
                  }}>
                    {role.code}
                  </p>
                </div>
                <div style={{ 
                  fontSize: '0.7rem', 
                  fontWeight: 600, 
                  color: C.textMuted,
                  background: 'rgba(15,118,110,0.08)',
                  padding: '4px 10px',
                  borderRadius: 6
                }}>
                  Level {role.hierarchy_level}
                </div>
              </div>

              {/* Description */}
              {role.description && (
                <p style={{ 
                  margin: '0 0 16px', 
                  fontSize: '0.82rem', 
                  color: C.textSub,
                  lineHeight: 1.5,
                  display: '-webkit-box',
                  WebkitLineClamp: 2,
                  WebkitBoxOrient: 'vertical',
                  overflow: 'hidden'
                }}>
                  {role.description}
                </p>
              )}

              {/* Actions */}
              <div style={{ 
                display: 'flex', 
                gap: 6, 
                paddingTop: 14, 
                borderTop: `1px solid ${C.border}`,
                flexWrap: 'wrap'
              }}>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleViewRole(role.uuid);
                  }}
                  style={{
                    flex: 1,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 6,
                    padding: '8px 12px',
                    fontSize: '0.8rem',
                    fontWeight: 600,
                    color: C.primary,
                    background: 'rgba(15,118,110,0.08)',
                    border: 'none',
                    borderRadius: 7,
                    cursor: 'pointer',
                    fontFamily: 'Poppins, sans-serif',
                    transition: 'all 0.2s ease',
                    minWidth: '100px'
                  }}
                  onMouseOver={(e) => {
                    e.currentTarget.style.background = 'rgba(15,118,110,0.15)';
                  }}
                  onMouseOut={(e) => {
                    e.currentTarget.style.background = 'rgba(15,118,110,0.08)';
                  }}
                >
                  <Eye size={15} /> View Details
                </button>
                
                <PermissionGuard permissions="Roles.Update">
                  {!role.is_system_role && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleEditRole(role.uuid);
                      }}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: 5,
                        padding: '8px 12px',
                        fontSize: '0.8rem',
                        fontWeight: 600,
                        color: C.textSub,
                        background: 'rgba(0,0,0,0.04)',
                        border: 'none',
                        borderRadius: 7,
                        cursor: 'pointer',
                        fontFamily: 'Poppins, sans-serif',
                        transition: 'all 0.2s ease'
                      }}
                      onMouseOver={(e) => {
                        e.currentTarget.style.background = 'rgba(0,0,0,0.08)';
                      }}
                      onMouseOut={(e) => {
                        e.currentTarget.style.background = 'rgba(0,0,0,0.04)';
                      }}
                      title="Edit Role"
                    >
                      <Edit2 size={14} />
                    </button>
                  )}
                </PermissionGuard>

                <PermissionGuard permissions="Roles.Update">
                  {!role.is_system_role && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleToggleStatus(role);
                      }}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: 5,
                        padding: '8px 12px',
                        fontSize: '0.8rem',
                        fontWeight: 600,
                        color: role.is_active ? '#EA580C' : '#059669',
                        background: role.is_active ? 'rgba(234,88,12,0.08)' : 'rgba(5,150,105,0.08)',
                        border: 'none',
                        borderRadius: 7,
                        cursor: 'pointer',
                        fontFamily: 'Poppins, sans-serif',
                        transition: 'all 0.2s ease'
                      }}
                      onMouseOver={(e) => {
                        e.currentTarget.style.background = role.is_active 
                          ? 'rgba(234,88,12,0.15)' 
                          : 'rgba(5,150,105,0.15)';
                      }}
                      onMouseOut={(e) => {
                        e.currentTarget.style.background = role.is_active 
                          ? 'rgba(234,88,12,0.08)' 
                          : 'rgba(5,150,105,0.08)';
                      }}
                      title={role.is_active ? 'Deactivate' : 'Activate'}
                    >
                      <Power size={14} />
                    </button>
                  )}
                </PermissionGuard>

                <PermissionGuard permissions="Roles.Delete">
                  {role.can_be_deleted && !role.is_system_role && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteRole(role);
                      }}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: 5,
                        padding: '8px 12px',
                        fontSize: '0.8rem',
                        fontWeight: 600,
                        color: '#DC2626',
                        background: 'rgba(220,38,38,0.08)',
                        border: 'none',
                        borderRadius: 7,
                        cursor: 'pointer',
                        fontFamily: 'Poppins, sans-serif',
                        transition: 'all 0.2s ease'
                      }}
                      onMouseOver={(e) => {
                        e.currentTarget.style.background = 'rgba(220,38,38,0.15)';
                      }}
                      onMouseOut={(e) => {
                        e.currentTarget.style.background = 'rgba(220,38,38,0.08)';
                      }}
                      title="Delete Role"
                    >
                      <Trash2 size={14} />
                    </button>
                  )}
                </PermissionGuard>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Info Box */}
      <div style={{ 
        marginTop: 24, 
        padding: '18px 20px', 
        background: '#f0f9ff', 
        border: '1px solid #bae6fd', 
        borderRadius: 12 
      }}>
        <h4 style={{ 
          margin: '0 0 10px', 
          fontSize: '0.9rem', 
          fontWeight: 700, 
          color: '#0c4a6e' 
        }}>
          About Roles
        </h4>
        <ul style={{ 
          margin: 0, 
          padding: '0 0 0 20px', 
          fontSize: '0.8rem', 
          color: '#0c4a6e', 
          lineHeight: 1.7 
        }}>
          <li><strong>System Roles</strong> cannot be deleted or have their core attributes changed</li>
          <li><strong>Custom Roles</strong> can be created, edited, and deleted by authorized users</li>
          <li><strong>Hierarchy Level</strong> determines which roles can manage other roles</li>
          <li>Users must re-login after role changes to see updated permissions</li>
        </ul>
      </div>
    </div>
  );
}
