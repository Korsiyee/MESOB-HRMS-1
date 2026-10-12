import React from 'react';
import { TrendingUp, TrendingDown } from 'lucide-react';

const COLORS = {
  teal: {
    iconBg: 'rgba(15, 118, 110, 0.12)',
    iconColor: '#0F766E',
    val: '#0F766E',
    border: 'rgba(15, 118, 110, 0.16)',
    glow: 'rgba(20, 184, 166, 0.16)',
    accentGrad: 'linear-gradient(135deg, #0F766E, #14B8A6)',
  },
  amber: {
    iconBg: 'rgba(234, 88, 12, 0.12)',
    iconColor: '#EA580C',
    val: '#C2410C',
    border: 'rgba(234, 88, 12, 0.16)',
    glow: 'rgba(245, 158, 11, 0.16)',
    accentGrad: 'linear-gradient(135deg, #EA580C, #F59E0B)',
  },
  emerald: {
    iconBg: 'rgba(5, 150, 105, 0.12)',
    iconColor: '#059669',
    val: '#047857',
    border: 'rgba(5, 150, 105, 0.16)',
    glow: 'rgba(16, 185, 129, 0.16)',
    accentGrad: 'linear-gradient(135deg, #059669, #10B981)',
  },
  blue: {
    iconBg: 'rgba(37, 99, 235, 0.12)',
    iconColor: '#2563EB',
    val: '#1D4ED8',
    border: 'rgba(37, 99, 235, 0.16)',
    glow: 'rgba(59, 130, 246, 0.16)',
    accentGrad: 'linear-gradient(135deg, #2563EB, #3B82F6)',
  },
  purple: {
    iconBg: 'rgba(124, 58, 237, 0.12)',
    iconColor: '#7C3AED',
    val: '#6D28D9',
    border: 'rgba(124, 58, 237, 0.16)',
    glow: 'rgba(139, 92, 246, 0.16)',
    accentGrad: 'linear-gradient(135deg, #7C3AED, #A855F7)',
  },
};

const Skeleton = () => (
  <div
    style={{
      height: 154,
      borderRadius: 18,
      background: 'linear-gradient(90deg, rgba(238,241,240,0.8) 0%, rgba(255,255,255,0.9) 50%, rgba(238,241,240,0.8) 100%)',
      backgroundSize: '200% 100%',
      animation: 'skshimmer 1.4s infinite ease-in-out',
      border: '1px solid rgba(0, 80, 60, 0.08)',
    }}
  />
);

const KpiCard = ({
  icon: Icon,
  label,
  value,
  sub,
  trend,
  trendUp,
  color = 'teal',
  loading,
  extra,
  onClick,
}) => {
  if (loading) return <Skeleton />;
  const c = COLORS[color] || COLORS.teal;

  return (
    <div
      onClick={onClick}
      style={{
        background: 'linear-gradient(145deg, #FFFFFF 0%, #F5F8F7 100%)',
        borderRadius: 18,
        border: `1px solid ${c.border}`,
        padding: '20px 22px',
        boxShadow: '0 4px 20px -2px rgba(0, 50, 40, 0.06), 0 2px 6px -1px rgba(0, 0, 0, 0.03)',
        transition: 'transform 0.22s cubic-bezier(0.16, 1, 0.3, 1), box-shadow 0.22s cubic-bezier(0.16, 1, 0.3, 1), border-color 0.22s',
        cursor: onClick ? 'pointer' : 'default',
        position: 'relative',
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        minHeight: 154,
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.transform = 'translateY(-4px)';
        e.currentTarget.style.boxShadow = `0 16px 32px -4px ${c.glow}, 0 4px 12px -2px rgba(0, 0, 0, 0.05)`;
        e.currentTarget.style.borderColor = c.iconColor;
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.transform = 'none';
        e.currentTarget.style.boxShadow = '0 4px 20px -2px rgba(0, 50, 40, 0.06), 0 2px 6px -1px rgba(0, 0, 0, 0.03)';
        e.currentTarget.style.borderColor = c.border;
      }}
    >
      {/* Ambient background glow & subtle decorative corner ring */}
      <div
        style={{
          position: 'absolute',
          top: -24,
          right: -24,
          width: 96,
          height: 96,
          borderRadius: '50%',
          background: c.glow,
          filter: 'blur(24px)',
          pointerEvents: 'none',
        }}
      />

      {/* Top Header Row */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', position: 'relative' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span
            style={{
              width: 7,
              height: 7,
              borderRadius: '50%',
              background: c.iconColor,
              boxShadow: `0 0 6px ${c.iconColor}`,
            }}
          />
          <span
            style={{
              fontSize: '0.68rem',
              fontWeight: 700,
              textTransform: 'uppercase',
              letterSpacing: '0.08em',
              color: '#2A5C54',
              fontFamily: 'Poppins, sans-serif',
            }}
          >
            {label}
          </span>
        </div>

        {Icon && (
          <div
            style={{
              width: 42,
              height: 42,
              borderRadius: 12,
              flexShrink: 0,
              background: c.iconBg,
              border: `1px solid ${c.border}`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: c.iconColor,
              boxShadow: `0 4px 10px -2px ${c.glow}`,
              transition: 'transform 0.2s',
            }}
          >
            <Icon size={20} strokeWidth={2.2} />
          </div>
        )}
      </div>

      {/* Value and Subtitle Row */}
      <div style={{ margin: '10px 0 6px', position: 'relative' }}>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, flexWrap: 'wrap' }}>
          <span
            style={{
              fontSize: '2.15rem',
              fontWeight: 800,
              lineHeight: 1.05,
              color: '#1A2E2B',
              fontFamily: 'Poppins, sans-serif',
              letterSpacing: '-0.03em',
            }}
          >
            {value ?? '—'}
          </span>

          {trend && (
            <div
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 4,
                padding: '3px 8px',
                borderRadius: 99,
                background: trendUp ? 'rgba(5,150,105,0.1)' : 'rgba(220,38,38,0.08)',
                color: trendUp ? '#059669' : '#DC2626',
                border: `1px solid ${trendUp ? 'rgba(5,150,105,0.2)' : 'rgba(220,38,38,0.2)'}`,
                fontSize: '0.68rem',
                fontWeight: 700,
              }}
            >
              {trendUp ? <TrendingUp size={11} /> : <TrendingDown size={11} />}
              {trend}
            </div>
          )}
        </div>

        {sub && (
          <p
            style={{
              margin: '5px 0 0',
              fontSize: '0.73rem',
              fontWeight: 500,
              color: '#2E6058',
              lineHeight: 1.3,
            }}
          >
            {sub}
          </p>
        )}
      </div>

      {/* Footer / Extra Visual Slot */}
      {extra && (
        <div
          style={{
            marginTop: 6,
            position: 'relative',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'flex-start',
          }}
        >
          {extra}
        </div>
      )}
    </div>
  );
};

export default KpiCard;
