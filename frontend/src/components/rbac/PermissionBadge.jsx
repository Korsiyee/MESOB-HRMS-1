import React from 'react';
import { Shield, ShieldAlert, ShieldCheck, User, Pin, Repeat, AlertTriangle, Clock } from 'lucide-react';

const C = {
  primary: '#0F766E',
  success: '#10B981',
  warning: '#F59E0B',
  danger: '#EF4444',
  textMain: '#1A2E2B',
  textMuted: '#2E6058',
};

/**
 * PermissionBadge Component
 * Displays occupation with status indicator
 * 
 * Props:
 * - occupationName: String - occupation name
 * - effect: 'ALLOW' | 'DENY' | 'INHERITED' - permission effect
 * - expiresAt: Date string (optional) - expiration date
 * - source: 'role' | 'direct' | 'delegated' | 'override' - permission source
 * - compact: Boolean - show compact version
 */
const PermissionBadge = ({ 
  occupationName, 
  effect = 'INHERITED', 
  expiresAt = null,
  source = 'direct',
  compact = false 
}) => {
  // Determine badge color
  const getBadgeColor = () => {
    if (effect === 'DENY') return C.danger;
    if (expiresAt && isExpiringSoon(expiresAt)) return C.warning;
    if (effect === 'ALLOW') return C.success;
    return C.primary;
  };

  // Check if expiring within 7 days
  const isExpiringSoon = (date) => {
    if (!date) return false;
    const exp = new Date(date);
    const now = new Date();
    const daysUntilExpiry = (exp - now) / (1000 * 60 * 60 * 24);
    return daysUntilExpiry > 0 && daysUntilExpiry <= 7;
  };

  // Get source icon
  const getSourceIcon = () => {
    switch (source) {
      case 'role': return <User size={14} />;
      case 'direct': return <Pin size={14} />;
      case 'delegated': return <Repeat size={14} />;
      case 'override': return <AlertTriangle size={14} />;
      default: return <ShieldCheck size={14} />;
    }
  };

  // Get effect icon
  const getEffectIcon = () => {
    if (effect === 'DENY') return <ShieldAlert size={14} />;
    if (expiresAt) return <Clock size={14} />;
    return <ShieldCheck size={14} />;
  };

  const badgeColor = getBadgeColor();

  if (compact) {
    return (
      <span style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 4,
        padding: '4px 10px',
        borderRadius: 6,
        background: `${badgeColor}15`,
        border: `1px solid ${badgeColor}40`,
        color: badgeColor,
        fontSize: '0.75rem',
        fontWeight: 600,
        fontFamily: 'Poppins, sans-serif',
      }}>
        {getEffectIcon()}
        {occupationName}
      </span>
    );
  }

  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      gap: 8,
      padding: '8px 12px',
      borderRadius: 8,
      background: `${badgeColor}10`,
      border: `1.5px solid ${badgeColor}40`,
      fontFamily: 'Poppins, sans-serif',
    }}>
      {/* Source Icon */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        width: 24,
        height: 24,
        borderRadius: 4,
        background: `${badgeColor}20`,
        color: badgeColor,
      }}>
        {getSourceIcon()}
      </div>

      {/* Occupation Name */}
      <div style={{ flex: 1 }}>
        <div style={{
          fontSize: '0.85rem',
          fontWeight: 600,
          color: C.textMain,
        }}>
          {occupationName}
        </div>
        {expiresAt && (
          <div style={{
            fontSize: '0.7rem',
            color: isExpiringSoon(expiresAt) ? C.warning : C.textMuted,
            marginTop: 2,
          }}>
            Expires: {new Date(expiresAt).toLocaleDateString()}
            {isExpiringSoon(expiresAt) && ' ⚠️'}
          </div>
        )}
      </div>

      {/* Effect Badge */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: 4,
        padding: '4px 8px',
        borderRadius: 4,
        background: badgeColor,
        color: '#fff',
        fontSize: '0.7rem',
        fontWeight: 600,
      }}>
        {getEffectIcon()}
        {effect}
      </div>
    </div>
  );
};

export default PermissionBadge;
