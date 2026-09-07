import React from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';

const card = {
  background: '#EEF1F0', borderRadius: 16,
  border: '1px solid rgba(0,80,60,0.07)', padding: 22,
  boxShadow: '0 2px 12px rgba(0,60,45,0.07), 0 1px 3px rgba(0,0,0,0.04)',
};
const SHADES = ['#0F766E','#14B8A6','#0D9488','#2DD4BF','#059669','#10B981','#0F766E','#14B8A6'];

const Tip = ({ active, payload }) => {
  if (!active || !payload?.length) return null;
  return (
    <div style={{ background: '#EEF1F0', border: '1px solid rgba(0,80,60,0.1)', borderRadius: 10, padding: '8px 12px', boxShadow: '0 8px 24px rgba(0,60,45,0.12)' }}>
      <p style={{ margin: 0, fontSize: '0.75rem', fontWeight: 600, color: '#1A2E2B' }}>{payload[0]?.payload?.name}</p>
      <p style={{ margin: '2px 0 0', fontSize: '0.8rem', fontWeight: 700, color: '#0F766E' }}>{payload[0]?.value} employees</p>
    </div>
  );
};

const Skeleton = () => (
  <div style={{ height: 220, borderRadius: 8, background: 'rgba(0,80,60,0.05)', animation: 'pulse 1.5s ease-in-out infinite' }} />
);

const DepartmentChart = ({ data = [], loading }) => (
  <div style={card}>
    <div style={{ marginBottom: 18 }}>
      <h3 style={{ margin: 0, fontSize: '0.9rem', fontWeight: 700, color: '#1A2E2B' }}>Department Distribution</h3>
      <p style={{ margin: '3px 0 0', fontSize: '0.73rem', color: '#2E6058' }}>Employees per department</p>
    </div>
    {loading ? <Skeleton /> : (
      <ResponsiveContainer width="100%" height={220}>
        <BarChart data={data} layout="vertical" margin={{ top: 0, right: 16, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,80,60,0.06)" horizontal={false} />
          <XAxis type="number" tick={{ fontSize: 11, fill: '#2E6058', fontFamily: 'Poppins' }} axisLine={false} tickLine={false} />
          <YAxis type="category" dataKey="name" width={120} tick={{ fontSize: 11, fill: '#1A3530', fontFamily: 'Poppins' }} axisLine={false} tickLine={false} />
          <Tooltip content={<Tip />} cursor={{ fill: 'rgba(15,118,110,0.05)' }} />
          <Bar dataKey="count" radius={[0, 6, 6, 0]} maxBarSize={16}>
            {data.map((_, i) => <Cell key={i} fill={SHADES[i % SHADES.length]} />)}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    )}
  </div>
);

export default DepartmentChart;
