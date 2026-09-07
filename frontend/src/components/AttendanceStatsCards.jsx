import React from 'react';
import { Clock, TrendingUp, TrendingDown, AlertCircle } from 'lucide-react';

const C = {
  primary: '#0F766E',
  textMain: '#1A2E2B',
  textSub: '#1E4A42',
  textMuted: '#2E6058',
};

/**
 * AttendanceStatsCards Component
 * Displays key attendance metrics in card format
 */
const AttendanceStatsCards = ({ stats }) => {
  const cards = [
    {
      icon: Clock,
      label: 'Total Worked Hours',
      value: stats?.totalWorkedHours !== null && stats?.totalWorkedHours !== undefined 
        ? `${parseFloat(stats.totalWorkedHours).toFixed(1)}h` 
        : '—',
      color: '#0F766E',
      bgColor: 'rgba(15,118,110,0.1)',
    },
    {
      icon: TrendingUp,
      label: 'Total Overtime',
      value: stats?.totalOvertimeHours !== null && stats?.totalOvertimeHours !== undefined 
        ? `${parseFloat(stats.totalOvertimeHours).toFixed(1)}h` 
        : '—',
      color: '#059669',
      bgColor: 'rgba(5,150,105,0.1)',
      highlight: parseFloat(stats?.totalOvertimeHours) > 0,
    },
    {
      icon: TrendingDown,
      label: 'Total Missing Hours',
      value: stats?.totalMissingHours !== null && stats?.totalMissingHours !== undefined 
        ? `${parseFloat(stats.totalMissingHours).toFixed(1)}h` 
        : '—',
      color: '#DC2626',
      bgColor: 'rgba(220,38,38,0.08)',
      highlight: parseFloat(stats?.totalMissingHours) > 0,
    },
    {
      icon: AlertCircle,
      label: 'Late Arrivals',
      value: stats?.lateCount !== null && stats?.lateCount !== undefined 
        ? stats.lateCount 
        : '—',
      color: '#B45309',
      bgColor: 'rgba(245,158,11,0.1)',
      highlight: stats?.lateCount > 0,
    },
  ];

  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 16 }}>
      {cards.map((card, index) => {
        const Icon = card.icon;
        return (
          <div
            key={index}
            style={{
              background: '#EEF1F0',
              borderRadius: 12,
              padding: '18px 20px',
              border: `1px solid ${card.highlight ? card.color : 'rgba(0,80,60,0.09)'}`,
              boxShadow: '0 2px 8px rgba(0,60,45,0.05)',
              transition: 'transform 0.2s, box-shadow 0.2s',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = 'translateY(-2px)';
              e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,60,45,0.12)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'translateY(0)';
              e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,60,45,0.05)';
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 10 }}>
              <div
                style={{
                  width: 42,
                  height: 42,
                  borderRadius: 10,
                  background: card.bgColor,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Icon size={20} color={card.color} strokeWidth={2.5} />
              </div>
              <div style={{ flex: 1 }}>
                <div
                  style={{
                    fontSize: '0.7rem',
                    fontWeight: 600,
                    color: C.textMuted,
                    textTransform: 'uppercase',
                    letterSpacing: '0.05em',
                    marginBottom: 2,
                  }}
                >
                  {card.label}
                </div>
                <div
                  style={{
                    fontSize: '1.5rem',
                    fontWeight: 700,
                    color: card.highlight ? card.color : C.textMain,
                    fontFamily: 'Poppins, sans-serif',
                  }}
                >
                  {card.value}
                </div>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default AttendanceStatsCards;
