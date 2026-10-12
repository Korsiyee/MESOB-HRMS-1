import React from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { Building2 } from 'lucide-react';

const cardStyle = {
  background: 'linear-gradient(145deg, #FFFFFF 0%, #F5F8F7 100%)',
  borderRadius: 18,
  border: '1px solid rgba(0, 80, 60, 0.1)',
  padding: '22px 24px',
  boxShadow: '0 4px 20px -2px rgba(0, 50, 40, 0.06), 0 2px 6px -1px rgba(0, 0, 0, 0.03)',
  position: 'relative',
  overflow: 'hidden',
};

const SHADES = [
  '#0F766E',
  '#14B8A6',
  '#0D9488',
  '#2DD4BF',
  '#059669',
  '#10B981',
  '#047857',
  '#34D399',
];

const Skeleton = () => (
  <div
    style={{
      height: 230,
      borderRadius: 14,
      background: 'linear-gradient(90deg, rgba(238,241,240,0.8) 0%, rgba(255,255,255,0.9) 50%, rgba(238,241,240,0.8) 100%)',
      backgroundSize: '200% 100%',
      animation: 'skshimmer 1.4s infinite ease-in-out',
      border: '1px solid rgba(0, 80, 60, 0.08)',
    }}
  />
);

const CustomTip = ({ active, payload, totalEmployees }) => {
  if (!active || !payload?.length) return null;
  const dept = payload[0]?.payload;
  const count = dept?.count || 0;
  const pct = totalEmployees > 0 ? Math.round((count / totalEmployees) * 100) : 0;

  return (
    <div
      style={{
        background: 'rgba(255, 255, 255, 0.95)',
        backdropFilter: 'blur(8px)',
        border: '1px solid rgba(15, 118, 110, 0.2)',
        borderRadius: 12,
        padding: '10px 14px',
        boxShadow: '0 10px 28px -4px rgba(0, 60, 45, 0.18)',
        minWidth: 150,
      }}
    >
      <p style={{ margin: 0, fontSize: '0.75rem', fontWeight: 700, color: '#1A2E2B' }}>
        {dept?.name}
      </p>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 4 }}>
        <span style={{ fontSize: '0.8rem', fontWeight: 700, color: '#0F766E' }}>
          {count} {count === 1 ? 'employee' : 'employees'}
        </span>
        {totalEmployees > 0 && (
          <span
            style={{
              fontSize: '0.68rem',
              fontWeight: 700,
              color: '#047857',
              background: 'rgba(5, 150, 105, 0.1)',
              padding: '2px 6px',
              borderRadius: 6,
            }}
          >
            {pct}%
          </span>
        )}
      </div>
    </div>
  );
};

const DepartmentChart = ({ data = [], loading }) => {
  const totalEmployees = data.reduce((acc, curr) => acc + (Number(curr.count) || 0), 0);

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
              background: 'rgba(20, 184, 166, 0.12)',
              border: '1px solid rgba(20, 184, 166, 0.2)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#0F766E',
            }}
          >
            <Building2 size={19} />
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
              Department Distribution
            </h3>
            <p style={{ margin: '2px 0 0', fontSize: '0.73rem', color: '#2E6058', fontWeight: 500 }}>
              Staff allocations by department
            </p>
          </div>
        </div>

        {data.length > 0 && (
          <span
            style={{
              fontSize: '0.7rem',
              fontWeight: 700,
              color: '#0F766E',
              background: 'rgba(15, 118, 110, 0.08)',
              border: '1px solid rgba(15, 118, 110, 0.16)',
              padding: '4px 10px',
              borderRadius: 99,
            }}
          >
            {data.length} Departments
          </span>
        )}
      </div>

      {loading ? (
        <Skeleton />
      ) : data.length === 0 ? (
        <div style={{ padding: '40px 0', textAlign: 'center', color: '#2E6058' }}>
          <p style={{ margin: 0, fontSize: '0.8rem' }}>No department data available</p>
        </div>
      ) : (
        <div style={{ width: '100%', height: 230 }}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={data}
              layout="vertical"
              margin={{ top: 4, right: 16, left: 10, bottom: 0 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(0, 80, 60, 0.06)" horizontal={false} />
              <XAxis
                type="number"
                tick={{ fontSize: 11, fill: '#2E6058', fontFamily: 'Poppins' }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                type="category"
                dataKey="name"
                width={110}
                tick={{ fontSize: 11, fill: '#1A3530', fontFamily: 'Poppins', fontWeight: 500 }}
                axisLine={false}
                tickLine={false}
              />
              <Tooltip
                content={<CustomTip totalEmployees={totalEmployees} />}
                cursor={{ fill: 'rgba(15, 118, 110, 0.05)' }}
              />
              <Bar dataKey="count" radius={[0, 8, 8, 0]} maxBarSize={18}>
                {data.map((_, i) => (
                  <Cell key={i} fill={SHADES[i % SHADES.length]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
};

export default DepartmentChart;
