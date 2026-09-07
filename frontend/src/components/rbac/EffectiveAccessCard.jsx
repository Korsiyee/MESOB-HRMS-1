import React, { useState } from 'react';
import { ChevronDown, ChevronUp, Shield, User, X } from 'lucide-react';
import PermissionBadge from './PermissionBadge';

const C = {
  card: '#EEF1F0',
  cardBorder: 'rgba(0,80,60,0.09)',
  shadow: '0 2px 12px rgba(0,60,45,0.07)',
  primary: '#0F766E',
  success: '#10B981',
  warning: '#F59E0B',
  danger: '#EF4444',
  textMain: '#1A2E2B',
  textSub: '#1E4A42',
  textMuted: '#2E6058',
  border: 'rgba(0,80,60,0.12)',
};

/**
 * EffectiveAccessCard Component
 * Displays complete permission breakdown for a user
 * 
 * Props:
 * - effectiveData: Object from /api/rbac/users/:uuid/effective-access
 * - compact: Boolean - show summary or full breakdown
 * - onRefresh: Function - callback to refresh data
 * - onRemoveDirectAssignment: Function - callback to remove direct assignment
 */
const EffectiveAccessCard = ({ effectiveData, compact = false, onRefresh, onRemoveDirectAssignment }) => {
  const [expandedSections, setExpandedSections] = useState({
    role: false,
    direct: false,
  });

  if (!effectiveData) {
    return (
      <div style={{
        background: C.card,
        borderRadius: 12,
        border: `1px solid ${C.cardBorder}`,
        boxShadow: C.shadow,
        padding: 20,
        fontFamily: 'Poppins, sans-serif',
        textAlign: 'center',
        color: C.textMuted,
      }}>
        No access data available
      </div>
    );
  }

  const {
    role,
    roleOccupations = [],
    directOccupations = [],
    effectiveOccupations = [],
    summary = {},
  } = effectiveData;

  const toggleSection = (section) => {
    setExpandedSections(prev => ({
      ...prev,
      [section]: !prev[section],
    }));
  };

  const SectionHeader = ({ title, count, icon: Icon, color, section }) => (
    <div
      onClick={() => toggleSection(section)}
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '12px 16px',
        borderRadius: 8,
        background: `${color}10`,
        border: `1px solid ${color}30`,
        cursor: 'pointer',
        marginBottom: 8,
        transition: 'all 0.2s',
      }}
      onMouseEnter={(e) => e.currentTarget.style.background = `${color}15`}
      onMouseLeave={(e) => e.currentTarget.style.background = `${color}10`}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <Icon size={18} color={color} />
        <span style={{
          fontSize: '0.85rem',
          fontWeight: 600,
          color: C.textMain,
        }}>
          {title}
        </span>
        <span style={{
          padding: '2px 8px',
          borderRadius: 12,
          background: color,
          color: '#fff',
          fontSize: '0.7rem',
          fontWeight: 600,
        }}>
          {count}
        </span>
      </div>
      {expandedSections[section] ? <ChevronUp size={18} color={C.textMuted} /> : <ChevronDown size={18} color={C.textMuted} />}
    </div>
  );

  if (compact) {
    return (
      <div style={{
        background: C.card,
        borderRadius: 12,
        border: `1px solid ${C.cardBorder}`,
        boxShadow: C.shadow,
        padding: 16,
        fontFamily: 'Poppins, sans-serif',
      }}>
        <div style={{
          fontSize: '0.9rem',
          fontWeight: 700,
          color: C.textMain,
          marginBottom: 12,
          display: 'flex',
          alignItems: 'center',
          gap: 8,
        }}>
          <Shield size={18} color={C.primary} />
          Effective Access Summary
        </div>
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(2, 1fr)',
          gap: 10,
          fontSize: '0.8rem',
        }}>
          <div>
            <span style={{ color: C.textMuted }}>Total:</span>{' '}
            <strong style={{ color: C.textMain }}>{effectiveOccupations.length}</strong>
          </div>
          <div>
            <span style={{ color: C.textMuted }}>From Role:</span>{' '}
            <strong style={{ color: C.textMain }}>{roleOccupations.length}</strong>
          </div>
          <div>
            <span style={{ color: C.textMuted }}>Direct:</span>{' '}
            <strong style={{ color: C.textMain }}>{directOccupations.length}</strong>
          </div>
          <div>
            <span style={{ color: C.textMuted }}>Delegated:</span>{' '}
            <strong style={{ color: C.textMain }}>{delegatedOccupations.length}</strong>
          </div>
          {overrides.denies?.length > 0 && (
            <div style={{
              gridColumn: '1 / -1',
              color: C.danger,
              fontWeight: 600,
            }}>
              ⚠️ {overrides.denies.length} DENY override(s)
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div style={{
      background: C.card,
      borderRadius: 12,
      border: `1px solid ${C.cardBorder}`,
      boxShadow: C.shadow,
      padding: 20,
      fontFamily: 'Poppins, sans-serif',
    }}>
      {/* Header */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 16,
      }}>
        <div style={{
          fontSize: '0.95rem',
          fontWeight: 700,
          color: C.textMain,
          display: 'flex',
          alignItems: 'center',
          gap: 8,
        }}>
          <Shield size={20} color={C.primary} />
          Effective Access Breakdown
        </div>
        {onRefresh && (
          <button
            onClick={onRefresh}
            style={{
              padding: '6px 12px',
              border: `1px solid ${C.border}`,
              borderRadius: 6,
              background: '#fff',
              color: C.textSub,
              fontSize: '0.75rem',
              fontWeight: 600,
              cursor: 'pointer',
              fontFamily: 'Poppins, sans-serif',
            }}
          >
            Refresh
          </button>
        )}
      </div>

      {/* Role Badge */}
      <div style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 6,
        padding: '6px 12px',
        borderRadius: 6,
        background: `${C.primary}15`,
        border: `1px solid ${C.primary}40`,
        marginBottom: 16,
        fontSize: '0.8rem',
        fontWeight: 600,
        color: C.primary,
      }}>
        <User size={14} />
        Role: {role}
      </div>

      {/* Role Occupations Section */}
      <SectionHeader
        title="From Role"
        count={roleOccupations.length}
        icon={User}
        color={C.primary}
        section="role"
      />
      {expandedSections.role && (
        <div style={{ marginBottom: 16, paddingLeft: 16 }}>
          {roleOccupations.length === 0 ? (
            <div style={{ fontSize: '0.8rem', color: C.textMuted, fontStyle: 'italic' }}>
              No role-based occupations
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {roleOccupations.map((occ, idx) => (
                <PermissionBadge
                  key={idx}
                  occupationName={occ}
                  effect="INHERITED"
                  source="role"
                  compact
                />
              ))}
            </div>
          )}
        </div>
      )}

      {/* Direct Occupations Section */}
      <SectionHeader
        title="Direct Assignments"
        count={directOccupations.length}
        icon={User}
        color={C.success}
        section="direct"
      />
      {expandedSections.direct && (
        <div style={{ marginBottom: 16, paddingLeft: 16 }}>
          {directOccupations.length === 0 ? (
            <div style={{ fontSize: '0.8rem', color: C.textMuted, fontStyle: 'italic' }}>
              No direct assignments
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {directOccupations.map((occ, idx) => (
                <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <div style={{ flex: 1 }}>
                    <PermissionBadge
                      occupationName={occ.name || occ}
                      effect="ALLOW"
                      source="direct"
                      expiresAt={occ.expires_at}
                    />
                  </div>
                  {onRemoveDirectAssignment && (
                    <button
                      onClick={() => onRemoveDirectAssignment(occ.occupation_uuid || occ.uuid, occ.name || occ)}
                      style={{
                        padding: '6px 8px',
                        border: 'none',
                        borderRadius: 6,
                        background: C.danger,
                        color: '#fff',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 4,
                        fontSize: '0.75rem',
                        fontWeight: 600,
                        fontFamily: 'Poppins, sans-serif',
                        transition: 'all 0.2s',
                      }}
                      onMouseEnter={(e) => e.currentTarget.style.opacity = '0.8'}
                      onMouseLeave={(e) => e.currentTarget.style.opacity = '1'}
                      title="Remove this direct assignment"
                    >
                      <X size={14} />
                      Remove
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Summary */}
      <div style={{
        marginTop: 16,
        paddingTop: 16,
        borderTop: `2px solid ${C.border}`,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
      }}>
        <span style={{
          fontSize: '0.9rem',
          fontWeight: 700,
          color: C.textMain,
        }}>
          Effective Total
        </span>
        <span style={{
          padding: '6px 16px',
          borderRadius: 8,
          background: C.primary,
          color: '#fff',
          fontSize: '0.9rem',
          fontWeight: 700,
        }}>
          {effectiveOccupations.length} occupations
        </span>
      </div>
    </div>
  );
};

export default EffectiveAccessCard;
