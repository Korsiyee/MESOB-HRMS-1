import React from 'react';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts';
import { CalendarOff } from 'lucide-react';

const cardStyle = {
  background: 'linear-gradient(145deg, #FFFFFF 0%, #F5F8F7 100%)',
  borderRadius: 18,
  border: '1px solid rgba(0, 80, 60, 0.1)',
  padding: '22px 24px',
  boxShadow: '0 4px 20px -2px rgba(0, 50, 40, 0.06), 0 2px 6px -1px rgba(0, 0, 0, 0.03)',
  position: 'relative',
  overflow: 'hidden',
};

const COLORS = ['#EA580C', '#0F766E', '#14B8A6'];

const Skeleton = () => (
  <div
    style={{
      height: 190,
      borderRadius: 14,
      background: 'linear-gradient(90deg, rgba(238,241,240,0.8) 0%, rgba(255,255,255,0.9) 50%, rgba(238,241,240,0.8) 100%)',
      backgroundSize: '200% 100%',
      animation: 'skshimmer 1.4s infinite ease-in-out',
      border: '1px solid rgba(0, 80, 60, 0.08)',
    }}
  />
);

const LeaveBalanceDonut = ({ balance = {}, loading }) => {
  if (loading) {
    return (
      <div style={cardStyle}>
        <Skeleton />
      </div>
    );
  }

  const { entitled = 0, used = 0, remaining = 0 } = balance;
  const usedPct = entitled > 0 ? Math.round((used / entitled) * 100) : 0;
  const remPct = entitled > 0 ? Math.round((remaining / entitled) * 100) : 0;

  const data = [
    { name: 'Used Days', value: used, color: '#EA580C' },
    { name: 'Remaining Days', value: remaining, color: '#0F766E' },
    { name: 'Other', value: Math.max(0, entitled - used - remaining), color: '#CBD5E1' },
  ].filter((d) => d.value > 0);

  const stats = [
    { label: 'Entitled Days', value: entitled, color: '#0F766E', pct: 100 },
    { label: 'Used Days', value: used, color: '#EA580C', pct: usedPct },
    { label: 'Remaining', value: remaining, color: '#14B8A6', pct: remPct },
  ];

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
          gap: 10,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div
            style={{
              width: 40,
              height: 40,
              borderRadius: 12,
              background: 'rgba(234, 88, 12, 0.1)',
              border: '1px solid rgba(234, 88, 12, 0.2)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#EA580C',
            }}
          >
            <CalendarOff size={19} />
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
              Leave Balance
            </h3>
            <p style={{ margin: '2px 0 0', fontSize: '0.73rem', color: '#2E6058', fontWeight: 500 }}>
              Company-wide leave utilization
            </p>
          </div>
        </div>

        {entitled > 0 && (
          <span
            style={{
              fontSize: '0.7rem',
              fontWeight: 700,
              color: '#EA580C',
              background: 'rgba(234, 88, 12, 0.08)',
              border: '1px solid rgba(234, 88, 12, 0.18)',
              padding: '4px 10px',
              borderRadius: 99,
            }}
          >
            {usedPct}% Consumed
          </span>
        )}
      </div>

      {/* Content: Chart + Breakdown */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
        {/* Donut Chart with center label */}
        <div style={{ width: 124, height: 124, flexShrink: 0, position: 'relative' }}>
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={data.length ? data : [{ name: 'None', value: 1 }]}
                cx="50%"
                cy="50%"
                innerRadius={36}
                outerRadius={56}
                paddingAngle={data.length ? 4 : 0}
                dataKey="value"
                strokeWidth={0}
              >
                {data.length ? (
                  data.map((item, i) => (
                    <Cell key={i} fill={item.color || COLORS[i % COLORS.length]} />
                  ))
                ) : (
                  <Cell fill="#E2E8F0" />
                )}
              </Pie>
              <Tooltip
                formatter={(v) => v.toLocaleString()}
                contentStyle={{
                  background: 'rgba(255, 255, 255, 0.95)',
                  backdropFilter: 'blur(8px)',
                  border: '1px solid rgba(15, 118, 110, 0.2)',
                  borderRadius: 10,
                  fontSize: '0.75rem',
                  boxShadow: '0 8px 24px rgba(0, 60, 45, 0.14)',
                }}
              />
            </PieChart>
          </ResponsiveContainer>

          {/* Center text in donut hole */}
          <div
            style={{
              position: 'absolute',
              inset: 0,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              pointerEvents: 'none',
            }}
          >
            <span
              style={{
                fontSize: '1rem',
                fontWeight: 800,
                color: '#1A2E2B',
                fontFamily: 'Poppins, sans-serif',
                lineHeight: 1,
              }}
            >
              {remPct}%
            </span>
            <span style={{ fontSize: '0.62rem', fontWeight: 600, color: '#2A5C54', textTransform: 'uppercase' }}>
              Avail
            </span>
          </div>
        </div>

        {/* Detailed Stats List */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 10 }}>
          {stats.map(({ label, value, color, pct }) => (
            <div key={label} style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                  <span
                    style={{
                      width: 8,
                      height: 8,
                      borderRadius: '50%',
                      background: color,
                      boxShadow: `0 0 5px ${color}`,
                      flexShrink: 0,
                    }}
                  />
                  <span style={{ fontSize: '0.74rem', color: '#1A3530', fontWeight: 500 }}>
                    {label}
                  </span>
                </div>
                <span style={{ fontSize: '0.82rem', fontWeight: 700, color: '#1A2E2B' }}>
                  {value.toLocaleString()}
                </span>
              </div>

              {/* Mini progress bar track */}
              <div
                style={{
                  width: '100%',
                  height: 4,
                  borderRadius: 99,
                  background: 'rgba(0, 80, 60, 0.08)',
                  overflow: 'hidden',
                }}
              >
                <div
                  style={{
                    width: `${Math.min(100, Math.max(0, pct))}%`,
                    height: '100%',
                    background: color,
                    borderRadius: 99,
                    transition: 'width 0.4s ease',
                  }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default LeaveBalanceDonut;
