import React from 'react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { Clock, TrendingUp } from 'lucide-react';

const cardStyle = {
  background: 'linear-gradient(145deg, #FFFFFF 0%, #F5F8F7 100%)',
  borderRadius: 18,
  border: '1px solid rgba(0, 80, 60, 0.1)',
  padding: '22px 24px',
  boxShadow: '0 4px 20px -2px rgba(0, 50, 40, 0.06), 0 2px 6px -1px rgba(0, 0, 0, 0.03)',
  position: 'relative',
  overflow: 'hidden',
};

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

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  const present = payload.find((p) => p.dataKey === 'Present')?.value || 0;
  const absent = payload.find((p) => p.dataKey === 'Absent')?.value || 0;
  const total = present + absent;
  const rate = total > 0 ? Math.round((present / total) * 100) : 0;

  return (
    <div
      style={{
        background: 'rgba(255, 255, 255, 0.95)',
        backdropFilter: 'blur(8px)',
        border: '1px solid rgba(15, 118, 110, 0.2)',
        borderRadius: 12,
        padding: '12px 16px',
        boxShadow: '0 10px 28px -4px rgba(0, 60, 45, 0.18)',
        minWidth: 160,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
        <p style={{ margin: 0, fontSize: '0.75rem', fontWeight: 700, color: '#1A2E2B' }}>{label}</p>
        <span
          style={{
            fontSize: '0.68rem',
            fontWeight: 700,
            color: '#0F766E',
            background: 'rgba(15, 118, 110, 0.1)',
            padding: '2px 6px',
            borderRadius: 6,
          }}
        >
          {rate}%
        </span>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '0.78rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#0F766E' }} />
            <span style={{ color: '#2A5C54', fontWeight: 500 }}>Present</span>
          </div>
          <span style={{ fontWeight: 700, color: '#0F766E' }}>{present}</span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '0.78rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#94A3B8' }} />
            <span style={{ color: '#2A5C54', fontWeight: 500 }}>Absent</span>
          </div>
          <span style={{ fontWeight: 700, color: '#64748B' }}>{absent}</span>
        </div>
      </div>
    </div>
  );
};

const AttendanceChart = ({ data = [], loading }) => {
  // Compute basic metrics for header display
  const totalPresent = data.reduce((acc, curr) => acc + (Number(curr.Present) || 0), 0);
  const totalAbsent = data.reduce((acc, curr) => acc + (Number(curr.Absent) || 0), 0);
  const avgAttendance = data.length > 0 && totalPresent + totalAbsent > 0
    ? Math.round((totalPresent / (totalPresent + totalAbsent)) * 100)
    : 0;

  return (
    <div style={cardStyle}>
      {/* Header */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: 20,
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
              background: 'rgba(15, 118, 110, 0.1)',
              border: '1px solid rgba(15, 118, 110, 0.18)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#0F766E',
            }}
          >
            <Clock size={19} />
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
              Attendance Overview
            </h3>
            <p style={{ margin: '2px 0 0', fontSize: '0.73rem', color: '#2E6058', fontWeight: 500 }}>
              Last 7 Days Workforce Trajectory
            </p>
          </div>
        </div>

        {/* Legend and Rate Chip */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          {avgAttendance > 0 && (
            <div
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 5,
                background: 'rgba(15, 118, 110, 0.08)',
                border: '1px solid rgba(15, 118, 110, 0.18)',
                padding: '4px 10px',
                borderRadius: 99,
                fontSize: '0.72rem',
                fontWeight: 700,
                color: '#0F766E',
              }}
            >
              <TrendingUp size={12} />
              <span>{avgAttendance}% Avg Rate</span>
            </div>
          )}

          <div style={{ display: 'flex', gap: 12, background: 'rgba(0, 80, 60, 0.04)', padding: '4px 10px', borderRadius: 10 }}>
            {[
              ['#0F766E', 'Present'],
              ['#94A3B8', 'Absent'],
            ].map(([color, label]) => (
              <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.72rem', color: '#1A3530', fontWeight: 600 }}>
                <span style={{ width: 8, height: 8, borderRadius: '50%', background: color }} />
                {label}
              </div>
            ))}
          </div>
        </div>
      </div>

      {loading ? (
        <Skeleton />
      ) : (
        <div style={{ width: '100%', height: 230 }}>
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data} margin={{ top: 8, right: 8, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="areaPresent" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#0F766E" stopOpacity={0.25} />
                  <stop offset="50%" stopColor="#14B8A6" stopOpacity={0.1} />
                  <stop offset="95%" stopColor="#0F766E" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="areaAbsent" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#94A3B8" stopOpacity={0.18} />
                  <stop offset="95%" stopColor="#94A3B8" stopOpacity={0.01} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(0, 80, 60, 0.06)" vertical={false} />
              <XAxis
                dataKey="date"
                tick={{ fontSize: 11, fill: '#2E6058', fontFamily: 'Poppins' }}
                axisLine={{ stroke: 'rgba(0, 80, 60, 0.1)' }}
                tickLine={false}
              />
              <YAxis
                tick={{ fontSize: 11, fill: '#2E6058', fontFamily: 'Poppins' }}
                axisLine={false}
                tickLine={false}
              />
              <Tooltip content={<CustomTooltip />} />
              <Area
                type="monotone"
                dataKey="Present"
                stroke="#0F766E"
                strokeWidth={2.5}
                fill="url(#areaPresent)"
                dot={{ r: 3, fill: '#0F766E', strokeWidth: 0 }}
                activeDot={{ r: 6, fill: '#0F766E', stroke: '#FFFFFF', strokeWidth: 2 }}
              />
              <Area
                type="monotone"
                dataKey="Absent"
                stroke="#94A3B8"
                strokeWidth={1.8}
                fill="url(#areaAbsent)"
                dot={false}
                activeDot={{ r: 5, fill: '#94A3B8', stroke: '#FFFFFF', strokeWidth: 2 }}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
};

export default AttendanceChart;
