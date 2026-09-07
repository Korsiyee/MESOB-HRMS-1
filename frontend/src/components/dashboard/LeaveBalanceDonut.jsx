import React from 'react';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts';

const card = {
  background: '#EEF1F0', borderRadius: 16,
  border: '1px solid rgba(0,80,60,0.07)', padding: 22,
  boxShadow: '0 2px 12px rgba(0,60,45,0.07), 0 1px 3px rgba(0,0,0,0.04)',
};
const COLORS = ['#0F766E', '#14B8A6', '#2DD4BF'];

const Skeleton = () => (
  <div style={{ height: 140, borderRadius: 8, background: 'rgba(0,80,60,0.05)', animation: 'pulse 1.5s ease-in-out infinite' }} />
);

const LeaveBalanceDonut = ({ balance = {}, loading }) => {
  if (loading) return <div style={card}><Skeleton /></div>;
  const { entitled = 0, used = 0, remaining = 0 } = balance;
  const data = [
    { name: 'Used Days',      value: used },
    { name: 'Remaining Days', value: remaining },
    { name: 'Other',          value: Math.max(0, entitled - used - remaining) },
  ].filter(d => d.value > 0);

  return (
    <div style={card}>
      <div style={{ marginBottom: 14 }}>
        <h3 style={{ margin: 0, fontSize: '0.9rem', fontWeight: 700, color: '#1A2E2B' }}>Leave Balance Summary</h3>
        <p style={{ margin: '3px 0 0', fontSize: '0.73rem', color: '#2E6058' }}>All Active Employees</p>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
        <div style={{ width: 110, height: 110, flexShrink: 0 }}>
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie data={data} cx="50%" cy="50%" innerRadius={32} outerRadius={50} paddingAngle={3} dataKey="value" strokeWidth={0}>
                {data.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
              </Pie>
              <Tooltip
                formatter={v => v.toLocaleString()}
                contentStyle={{ background: '#EEF1F0', border: '1px solid rgba(0,80,60,0.1)', borderRadius: 8, color: '#1A2E2B', fontSize: '0.75rem' }}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 11 }}>
          {[
            { label: 'Entitled Days', value: entitled,  color: '#0F766E' },
            { label: 'Used Days',     value: used,      color: '#14B8A6' },
            { label: 'Remaining',     value: remaining, color: '#2DD4BF' },
          ].map(({ label, value, color }) => (
            <div key={label} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ width: 9, height: 9, borderRadius: '50%', background: color, flexShrink: 0 }} />
                <span style={{ fontSize: '0.73rem', color: '#1A3530' }}>{label}</span>
              </div>
              <span style={{ fontSize: '0.8rem', fontWeight: 700, color: '#1A2E2B' }}>{value.toLocaleString()}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default LeaveBalanceDonut;
