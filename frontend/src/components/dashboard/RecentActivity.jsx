import React from 'react';
import { ArrowRight, Activity, Clock, Shield } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const cardStyle = {
  background: 'linear-gradient(145deg, #FFFFFF 0%, #F5F8F7 100%)',
  borderRadius: 18,
  border: '1px solid rgba(0, 80, 60, 0.1)',
  padding: '22px 24px',
  boxShadow: '0 4px 20px -2px rgba(0, 50, 40, 0.06), 0 2px 6px -1px rgba(0, 0, 0, 0.03)',
  position: 'relative',
  overflow: 'hidden',
};

const ACTION_STYLES = {
  NEW_EMPLOYEE: {
    bg: 'rgba(15, 118, 110, 0.1)',
    color: '#0F766E',
    border: 'rgba(15, 118, 110, 0.2)',
  },
  LEAVE_REQUEST: {
    bg: 'rgba(37, 99, 235, 0.1)',
    color: '#2563EB',
    border: 'rgba(37, 99, 235, 0.2)',
  },
  STATUS_CHANGED: {
    bg: 'rgba(124, 58, 237, 0.1)',
    color: '#7C3AED',
    border: 'rgba(124, 58, 237, 0.2)',
  },
  DEPARTMENT_TRANSFER: {
    bg: 'rgba(234, 88, 12, 0.1)',
    color: '#EA580C',
    border: 'rgba(234, 88, 12, 0.2)',
  },
  REJECT: {
    bg: 'rgba(220, 38, 38, 0.1)',
    color: '#DC2626',
    border: 'rgba(220, 38, 38, 0.2)',
  },
  DEFAULT: {
    bg: 'rgba(0, 80, 60, 0.08)',
    color: '#1A3530',
    border: 'rgba(0, 80, 60, 0.15)',
  },
};

const getActionStyle = (action = '') => {
  const a = action.toUpperCase();
  for (const [key, style] of Object.entries(ACTION_STYLES)) {
    if (a.includes(key)) return style;
  }
  return ACTION_STYLES.DEFAULT;
};

const formatTime = (ts) => {
  if (!ts) return '—';
  const d = new Date(ts);
  if (isNaN(d)) return ts;
  const diff = Math.floor((Date.now() - d) / 1000);
  if (diff < 60) return 'Just now';
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) {
    return d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
  }
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
};

const initials = (name = '') =>
  name
    .split(' ')
    .filter(Boolean)
    .map((w) => w[0])
    .join('')
    .toUpperCase()
    .slice(0, 2) || '?';

const Skeleton = () => (
  <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
    {[1, 2, 3, 4].map((i) => (
      <div
        key={i}
        style={{
          height: 52,
          borderRadius: 12,
          background: 'linear-gradient(90deg, rgba(238,241,240,0.8) 0%, rgba(255,255,255,0.9) 50%, rgba(238,241,240,0.8) 100%)',
          backgroundSize: '200% 100%',
          animation: 'skshimmer 1.4s infinite ease-in-out',
          border: '1px solid rgba(0, 80, 60, 0.06)',
        }}
      />
    ))}
  </div>
);

const RecentActivity = ({ data = [], loading }) => {
  const navigate = useNavigate();

  return (
    <div style={cardStyle}>
      {/* Header */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: 18,
          flexWrap: 'wrap',
          gap: 12,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div
            style={{
              width: 40,
              height: 40,
              borderRadius: 12,
              background: 'rgba(37, 99, 235, 0.1)',
              border: '1px solid rgba(37, 99, 235, 0.2)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#2563EB',
            }}
          >
            <Activity size={19} />
          </div>
          <div>
            <h3
              style={{
                margin: 0,
                fontSize: '0.95rem',
                fontWeight: 700,
                color: '#1A2E2B',
                fontFamily: 'Poppins, sans-serif',
                letterSpacing: '-0.01em',
              }}
            >
              Recent Employee Activity
            </h3>
            <p style={{ margin: '2px 0 0', fontSize: '0.73rem', color: '#2E6058', fontWeight: 500 }}>
              Live audit trail and personnel changes
            </p>
          </div>
        </div>

        <button
          onClick={() => navigate('/logs')}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 6,
            fontSize: '0.74rem',
            fontWeight: 700,
            color: '#0F766E',
            background: 'rgba(15, 118, 110, 0.08)',
            border: '1px solid rgba(15, 118, 110, 0.16)',
            padding: '5px 12px',
            borderRadius: 99,
            cursor: 'pointer',
            transition: 'all 0.18s ease',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = '#0F766E';
            e.currentTarget.style.color = '#FFFFFF';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = 'rgba(15, 118, 110, 0.08)';
            e.currentTarget.style.color = '#0F766E';
          }}
        >
          View all logs <ArrowRight size={13} />
        </button>
      </div>

      {loading ? (
        <Skeleton />
      ) : data.length === 0 ? (
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            padding: '36px 0',
            color: '#2E6058',
          }}
        >
          <div
            style={{
              width: 48,
              height: 48,
              borderRadius: '50%',
              background: 'rgba(0, 80, 60, 0.05)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: 10,
            }}
          >
            <Shield size={22} color="#0F766E" />
          </div>
          <p style={{ margin: 0, fontSize: '0.82rem', fontWeight: 600, color: '#1A2E2B' }}>
            No recent activity recorded
          </p>
          <p style={{ margin: '3px 0 0', fontSize: '0.72rem', color: '#2E6058' }}>
            System events will appear here automatically
          </p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {data.map((log, i) => {
            const actor = log.actorName || log.actor_name || log.actorUuid || 'System';
            const entity = log.entityName || log.entity_name || log.entityUuid || 'Personnel';
            const action = (log.action || '').replace(/_/g, ' ');
            const aStyle = getActionStyle(log.action || '');

            return (
              <div
                key={log.uuid || i}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '10px 12px',
                  borderRadius: 12,
                  background: 'rgba(0, 80, 60, 0.02)',
                  border: '1px solid rgba(0, 80, 60, 0.05)',
                  transition: 'transform 0.18s ease, background 0.18s ease, border-color 0.18s ease',
                  cursor: 'default',
                  gap: 12,
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = 'translateX(4px)';
                  e.currentTarget.style.background = 'rgba(15, 118, 110, 0.06)';
                  e.currentTarget.style.borderColor = 'rgba(15, 118, 110, 0.16)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = 'none';
                  e.currentTarget.style.background = 'rgba(0, 80, 60, 0.02)';
                  e.currentTarget.style.borderColor = 'rgba(0, 80, 60, 0.05)';
                }}
              >
                {/* Left: Avatar + Details */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0, flex: 1 }}>
                  <div
                    style={{
                      width: 36,
                      height: 36,
                      borderRadius: 10,
                      flexShrink: 0,
                      background: 'linear-gradient(135deg, #0F766E 0%, #14B8A6 100%)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '0.72rem',
                      fontWeight: 800,
                      color: '#FFFFFF',
                      boxShadow: '0 3px 8px rgba(15, 118, 110, 0.25)',
                    }}
                  >
                    {initials(entity)}
                  </div>

                  <div style={{ minWidth: 0, flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                      <span
                        style={{
                          fontSize: '0.8rem',
                          fontWeight: 700,
                          color: '#1A2E2B',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                        }}
                      >
                        {entity}
                      </span>

                      <span
                        style={{
                          display: 'inline-block',
                          padding: '2px 8px',
                          borderRadius: 99,
                          background: aStyle.bg,
                          color: aStyle.color,
                          border: `1px solid ${aStyle.border}`,
                          fontSize: '0.67rem',
                          fontWeight: 700,
                          textTransform: 'capitalize',
                        }}
                      >
                        {action || 'Event'}
                      </span>
                    </div>

                    <p style={{ margin: '2px 0 0', fontSize: '0.68rem', color: '#2A5C54' }}>
                      By <strong style={{ color: '#1A2E2B' }}>{actor}</strong>
                      {log.entityType ? ` • ${log.entityType}` : ''}
                    </p>
                  </div>
                </div>

                {/* Right: Timestamp */}
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 5,
                    fontSize: '0.7rem',
                    color: '#2E6058',
                    flexShrink: 0,
                    fontWeight: 500,
                  }}
                >
                  <Clock size={12} opacity={0.7} />
                  <span>{formatTime(log.createdAt || log.timestamp)}</span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default RecentActivity;
