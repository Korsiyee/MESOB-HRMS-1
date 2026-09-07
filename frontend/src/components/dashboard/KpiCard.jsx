import React from 'react';
import { TrendingUp, TrendingDown } from 'lucide-react';

const COLORS = {
  teal:    { iconBg: 'rgba(15,118,110,0.1)',  iconColor: '#0F766E', val: '#0F766E', border: 'rgba(15,118,110,0.15)' },
  amber:   { iconBg: 'rgba(234,88,12,0.1)',   iconColor: '#EA580C', val: '#C2410C', border: 'rgba(234,88,12,0.15)'  },
  emerald: { iconBg: 'rgba(5,150,105,0.1)',   iconColor: '#059669', val: '#047857', border: 'rgba(5,150,105,0.15)'  },
  blue:    { iconBg: 'rgba(37,99,235,0.1)',   iconColor: '#2563EB', val: '#1D4ED8', border: 'rgba(37,99,235,0.15)'  },
};

const Skeleton = () => (
  <div style={{
    height: 140, borderRadius: 16,
    background: 'rgba(0,80,60,0.05)',
    animation: 'pulse 1.5s ease-in-out infinite',
  }} />
);

const KpiCard = ({ icon: Icon, label, value, sub, trend, trendUp, color = 'teal', loading, extra }) => {
  if (loading) return <Skeleton />;
  const c = COLORS[color] || COLORS.teal;

  return (
    <div style={{
      background: '#EEF1F0',
      borderRadius: 16,
      border: `1px solid ${c.border}`,
      padding: '22px',
      boxShadow: '0 2px 12px rgba(0,60,45,0.07), 0 1px 3px rgba(0,0,0,0.04)',
      transition: 'transform 0.18s, box-shadow 0.18s',
      cursor: 'default', position: 'relative', overflow: 'hidden',
    }}
      onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-3px)'; e.currentTarget.style.boxShadow = '0 10px 32px rgba(0,60,45,0.12), 0 2px 8px rgba(0,0,0,0.06)'; }}
      onMouseLeave={e => { e.currentTarget.style.transform = 'none'; e.currentTarget.style.boxShadow = '0 2px 12px rgba(0,60,45,0.07), 0 1px 3px rgba(0,0,0,0.04)'; }}
    >
      {/* Subtle corner accent */}
      <div style={{
        position: 'absolute', top: -16, right: -16,
        width: 72, height: 72, borderRadius: '50%',
        background: c.iconBg, filter: 'blur(16px)', pointerEvents: 'none',
      }} />

      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', position: 'relative' }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <p style={{ margin: 0, fontSize: '0.68rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: 1.2, color: '#2E6058' }}>
            {label}
          </p>
          <p style={{ margin: '8px 0 0', fontSize: '2rem', fontWeight: 700, lineHeight: 1, color: c.val, fontFamily: 'Poppins, sans-serif' }}>
            {value ?? '—'}
          </p>
          {sub && <p style={{ margin: '6px 0 0', fontSize: '0.73rem', color: '#2E6058' }}>{sub}</p>}
          {trend && (
            <div style={{
              display: 'inline-flex', alignItems: 'center', gap: 4,
              marginTop: 10, padding: '3px 9px', borderRadius: 99,
              background: trendUp ? 'rgba(5,150,105,0.1)' : 'rgba(220,38,38,0.08)',
              color: trendUp ? '#059669' : '#DC2626',
              fontSize: '0.68rem', fontWeight: 600,
            }}>
              {trendUp ? <TrendingUp size={11} /> : <TrendingDown size={11} />}
              {trend}
            </div>
          )}
        </div>

        <div style={{
          width: 46, height: 46, borderRadius: 14, flexShrink: 0,
          background: c.iconBg,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          color: c.iconColor,
          boxShadow: `0 0 0 6px ${c.iconBg}`,
        }}>
          <Icon size={21} />
        </div>
      </div>

      {extra && <div style={{ marginTop: 14, position: 'relative' }}>{extra}</div>}
    </div>
  );
};

export default KpiCard;
