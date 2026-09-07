import React from 'react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

const card = {
  background: '#EEF1F0', borderRadius: 16,
  border: '1px solid rgba(0,80,60,0.07)',
  padding: 22,
  boxShadow: '0 2px 12px rgba(0,60,45,0.07), 0 1px 3px rgba(0,0,0,0.04)',
};

const Skeleton = () => (
  <div style={{ height: 220, borderRadius: 8, background: 'rgba(0,80,60,0.05)', animation: 'pulse 1.5s ease-in-out infinite' }} />
);

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div style={{
      background: '#EEF1F0', border: '1px solid rgba(0,80,60,0.1)',
      borderRadius: 10, padding: '10px 14px',
      boxShadow: '0 8px 24px rgba(0,60,45,0.12)',
    }}>
      <p style={{ margin: '0 0 6px', fontSize: '0.7rem', fontWeight: 600, color: '#2E6058' }}>{label}</p>
      {payload.map(p => (
        <div key={p.name} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: '0.8rem', fontWeight: 600 }}>
          <span style={{ width: 8, height: 8, borderRadius: '50%', background: p.color, flexShrink: 0 }} />
          <span style={{ color: '#1A3530' }}>{p.name}:</span>
          <span style={{ color: p.color }}>{p.value}</span>
        </div>
      ))}
    </div>
  );
};

const AttendanceChart = ({ data = [], loading }) => (
  <div style={card}>
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 18 }}>
      <div>
        <h3 style={{ margin: 0, fontSize: '0.9rem', fontWeight: 700, color: '#1A2E2B' }}>Attendance Overview</h3>
        <p style={{ margin: '3px 0 0', fontSize: '0.73rem', color: '#2E6058' }}>Last 7 Days</p>
      </div>
      <div style={{ display: 'flex', gap: 18 }}>
        {[['#0F766E','Present'],['#CBD5E1','Absent']].map(([color, label]) => (
          <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.73rem', color: '#1A3530' }}>
            <span style={{ width: 10, height: 10, borderRadius: '50%', background: color }} />
            {label}
          </div>
        ))}
      </div>
    </div>

    {loading ? <Skeleton /> : (
      <ResponsiveContainer width="100%" height={220}>
        <AreaChart data={data} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
          <defs>
            <linearGradient id="gP" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%"  stopColor="#0F766E" stopOpacity={0.2} />
              <stop offset="95%" stopColor="#0F766E" stopOpacity={0.01} />
            </linearGradient>
            <linearGradient id="gA" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%"  stopColor="#94A3B8" stopOpacity={0.15} />
              <stop offset="95%" stopColor="#94A3B8" stopOpacity={0.01} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,80,60,0.06)" vertical={false} />
          <XAxis dataKey="date" tick={{ fontSize: 11, fill: '#2E6058', fontFamily: 'Poppins' }} axisLine={false} tickLine={false} />
          <YAxis tick={{ fontSize: 11, fill: '#2E6058', fontFamily: 'Poppins' }} axisLine={false} tickLine={false} />
          <Tooltip content={<CustomTooltip />} />
          <Area type="monotone" dataKey="Present" stroke="#0F766E" strokeWidth={2.5} fill="url(#gP)" dot={false} activeDot={{ r: 5, fill: '#0F766E', strokeWidth: 0 }} />
          <Area type="monotone" dataKey="Absent"  stroke="#94A3B8" strokeWidth={1.5} fill="url(#gA)" dot={false} activeDot={{ r: 4, fill: '#94A3B8', strokeWidth: 0 }} />
        </AreaChart>
      </ResponsiveContainer>
    )}
  </div>
);

export default AttendanceChart;
