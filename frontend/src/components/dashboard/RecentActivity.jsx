import React from 'react';
import { ArrowRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const card = {
  background: '#EEF1F0', borderRadius: 16,
  border: '1px solid rgba(0,80,60,0.07)', padding: 22,
  boxShadow: '0 2px 12px rgba(0,60,45,0.07), 0 1px 3px rgba(0,0,0,0.04)',
};

const ACTION_STYLES = {
  'NEW_EMPLOYEE':        { bg: 'rgba(15,118,110,0.1)',  color: '#0F766E' },
  'LEAVE_REQUEST':       { bg: 'rgba(37,99,235,0.1)',   color: '#2563EB' },
  'STATUS_CHANGED':      { bg: 'rgba(124,58,237,0.1)',  color: '#7C3AED' },
  'DEPARTMENT_TRANSFER': { bg: 'rgba(234,88,12,0.1)',   color: '#EA580C' },
  'REJECT':              { bg: 'rgba(220,38,38,0.08)',  color: '#DC2626' },
};

const getActionStyle = (action = '') => {
  const a = action.toUpperCase();
  for (const [key, style] of Object.entries(ACTION_STYLES)) {
    if (a.includes(key)) return style;
  }
  return { bg: 'rgba(0,80,60,0.07)', color: '#1A3530' };
};

const formatTime = ts => {
  if (!ts) return '—';
  const d = new Date(ts);
  if (isNaN(d)) return ts;
  const diff = Math.floor((Date.now() - d) / 1000);
  if (diff < 60)    return 'Just now';
  if (diff < 3600)  return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `Today ${d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}`;
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
};

const initials = (name = '') => name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2) || '?';

const Skeleton = () => (
  <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
    {[1,2,3,4].map(i => (
      <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <div style={{ width: 36, height: 36, borderRadius: '50%', background: 'rgba(0,80,60,0.07)', flexShrink: 0, animation: 'pulse 1.5s ease-in-out infinite' }} />
        <div style={{ flex: 1 }}>
          <div style={{ height: 11, width: '55%', borderRadius: 4, background: 'rgba(0,80,60,0.07)', marginBottom: 6, animation: 'pulse 1.5s ease-in-out infinite' }} />
          <div style={{ height: 9, width: '35%', borderRadius: 4, background: 'rgba(0,80,60,0.05)', animation: 'pulse 1.5s ease-in-out infinite' }} />
        </div>
      </div>
    ))}
  </div>
);

const RecentActivity = ({ data = [], loading }) => {
  const navigate = useNavigate();
  return (
    <div style={card}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 18 }}>
        <div>
          <h3 style={{ margin: 0, fontSize: '0.9rem', fontWeight: 700, color: '#1A2E2B' }}>Recent Employee Activity</h3>
          <p style={{ margin: '3px 0 0', fontSize: '0.73rem', color: '#2E6058' }}>Latest system events</p>
        </div>
      </div>

      {loading ? <Skeleton /> : data.length === 0 ? (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '32px 0', color: '#2E6058' }}>
          <span style={{ fontSize: 32, marginBottom: 8 }}>📋</span>
          <p style={{ margin: 0, fontSize: '0.8rem' }}>No recent activity</p>
        </div>
      ) : (
        <>
          <div style={{ display: 'grid', gridTemplateColumns: '2fr 2fr 1.2fr 1.5fr', gap: 8, padding: '0 8px 10px', borderBottom: '1px solid rgba(0,80,60,0.07)', marginBottom: 4 }}>
            {['Employee','Action','Date','By'].map(h => (
              <span key={h} style={{ fontSize: '0.65rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: 1.2, color: '#2E6058' }}>{h}</span>
            ))}
          </div>
          {data.map((log, i) => {
            const actor  = log.actorName  || log.actor_name  || log.actorUuid  || 'System';
            const entity = log.entityName || log.entity_name || log.entityUuid || '—';
            const action = (log.action || '').replace(/_/g, ' ');
            const aStyle = getActionStyle(log.action || '');
            return (
              <div key={log.uuid || i} style={{
                display: 'grid', gridTemplateColumns: '2fr 2fr 1.2fr 1.5fr',
                gap: 8, padding: '10px 8px', borderRadius: 10, alignItems: 'center',
                transition: 'background 0.12s',
              }}
                onMouseEnter={e => e.currentTarget.style.background = '#C5CECC'}
                onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0 }}>
                  <div style={{
                    width: 32, height: 32, borderRadius: '50%', flexShrink: 0,
                    background: 'linear-gradient(135deg, #14B8A6, #0F766E)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: '0.65rem', fontWeight: 700, color: 'white',
                    boxShadow: '0 2px 6px rgba(15,118,110,0.3)',
                  }}>
                    {initials(entity)}
                  </div>
                  <div style={{ minWidth: 0 }}>
                    <p style={{ margin: 0, fontSize: '0.75rem', fontWeight: 600, color: '#1A2E2B', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{entity}</p>
                    <p style={{ margin: 0, fontSize: '0.65rem', color: '#2E6058' }}>{log.entityType || ''}</p>
                  </div>
                </div>
                <span style={{
                  display: 'inline-block', padding: '3px 9px', borderRadius: 99,
                  background: aStyle.bg, color: aStyle.color,
                  fontSize: '0.7rem', fontWeight: 600, textTransform: 'capitalize',
                  overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                }}>
                  {action || '—'}
                </span>
                <span style={{ fontSize: '0.7rem', color: '#2E6058' }}>{formatTime(log.createdAt || log.timestamp)}</span>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, minWidth: 0 }}>
                  <div style={{
                    width: 24, height: 24, borderRadius: '50%', flexShrink: 0,
                    background: 'rgba(0,80,60,0.1)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: '0.6rem', fontWeight: 700, color: '#1A3530',
                  }}>
                    {initials(actor)}
                  </div>
                  <span style={{ fontSize: '0.7rem', color: '#1A3530', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{actor}</span>
                </div>
              </div>
            );
          })}
        </>
      )}

      <button onClick={() => navigate('/logs')} style={{
        marginTop: 14, display: 'flex', alignItems: 'center', gap: 6,
        fontSize: '0.75rem', fontWeight: 600, color: '#0F766E',
        background: 'none', border: 'none', cursor: 'pointer', padding: 0,
        fontFamily: 'Poppins, sans-serif',
      }}>
        View all activity <ArrowRight size={13} />
      </button>
    </div>
  );
};

export default RecentActivity;
