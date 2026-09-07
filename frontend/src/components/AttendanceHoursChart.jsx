import React, { useMemo } from 'react';
import { BarChart3 } from 'lucide-react';

const C = {
  card: '#EEF1F0',
  border: 'rgba(0,80,60,0.09)',
  primary: '#0F766E',
  textMain: '#1A2E2B',
  textSub: '#1E4A42',
  textMuted: '#2E6058',
};

/**
 * AttendanceHoursChart Component
 * Simple bar chart visualization for worked hours, overtime, and missing hours
 */
const AttendanceHoursChart = ({ records = [] }) => {
  const chartData = useMemo(() => {
    // Group by week for better visualization
    const weeklyData = {};
    
    records.forEach(record => {
      if (!record.date) return;
      
      // Get week number
      const date = new Date(record.date);
      const weekStart = new Date(date);
      weekStart.setDate(date.getDate() - date.getDay()); // Start of week (Sunday)
      const weekKey = weekStart.toISOString().slice(0, 10);
      
      if (!weeklyData[weekKey]) {
        weeklyData[weekKey] = {
          weekStart: weekKey,
          workedHours: 0,
          overtimeHours: 0,
          missingHours: 0,
          count: 0,
        };
      }
      
      if (record.worked_hours != null) {
        weeklyData[weekKey].workedHours += parseFloat(record.worked_hours) || 0;
        weeklyData[weekKey].count++;
      }
      if (record.overtime_hours != null) {
        weeklyData[weekKey].overtimeHours += parseFloat(record.overtime_hours) || 0;
      }
      if (record.missing_hours != null) {
        weeklyData[weekKey].missingHours += parseFloat(record.missing_hours) || 0;
      }
    });
    
    // Convert to array and sort by date
    return Object.values(weeklyData)
      .sort((a, b) => a.weekStart.localeCompare(b.weekStart))
      .slice(-8); // Last 8 weeks
  }, [records]);

  if (chartData.length === 0) {
    return (
      <div style={{ 
        background: C.card, 
        borderRadius: 14, 
        border: `1px solid ${C.border}`, 
        padding: 40, 
        textAlign: 'center' 
      }}>
        <BarChart3 size={40} color={C.textMuted} style={{ margin: '0 auto 12px' }} />
        <p style={{ margin: 0, fontSize: '0.85rem', color: C.textMuted }}>
          No data available for chart visualization
        </p>
      </div>
    );
  }

  // Calculate max value for scaling
  const maxValue = Math.max(
    ...chartData.map(d => d.workedHours + d.overtimeHours)
  );

  return (
    <div style={{ 
      background: C.card, 
      borderRadius: 14, 
      border: `1px solid ${C.border}`, 
      padding: '20px 24px',
      boxShadow: '0 2px 12px rgba(0,60,45,0.07)',
    }}>
      <div style={{ marginBottom: 20, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h3 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 700, color: C.textMain, fontFamily: 'Poppins, sans-serif' }}>
            Weekly Hours Trend
          </h3>
          <p style={{ margin: '4px 0 0', fontSize: '0.72rem', color: C.textMuted }}>
            Worked hours, overtime, and missing hours per week
          </p>
        </div>
        
        {/* Legend */}
        <div style={{ display: 'flex', gap: 16, fontSize: '0.7rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <div style={{ width: 12, height: 12, borderRadius: 3, background: '#0F766E' }} />
            <span style={{ color: C.textSub }}>Worked</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <div style={{ width: 12, height: 12, borderRadius: 3, background: '#059669' }} />
            <span style={{ color: C.textSub }}>Overtime</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <div style={{ width: 12, height: 12, borderRadius: 3, background: '#DC2626' }} />
            <span style={{ color: C.textSub }}>Missing</span>
          </div>
        </div>
      </div>

      {/* Chart */}
      <div style={{ display: 'flex', alignItems: 'flex-end', gap: 12, height: 200, paddingTop: 10 }}>
        {chartData.map((week, index) => {
          const workedPercent = (week.workedHours / (maxValue || 1)) * 100;
          const overtimePercent = (week.overtimeHours / (maxValue || 1)) * 100;
          const missingPercent = (week.missingHours / (maxValue || 1)) * 100;
          
          const weekDate = new Date(week.weekStart);
          const weekLabel = `${weekDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`;
          
          return (
            <div key={index} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
              {/* Bar */}
              <div style={{ width: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'flex-end', height: 180, position: 'relative' }}>
                {/* Worked Hours */}
                {week.workedHours > 0 && (
                  <div
                    style={{
                      width: '60%',
                      margin: '0 auto',
                      height: `${workedPercent}%`,
                      background: '#0F766E',
                      borderRadius: '6px 6px 0 0',
                      position: 'relative',
                      transition: 'all 0.3s',
                    }}
                    title={`Worked: ${week.workedHours.toFixed(1)}h`}
                  >
                    <div style={{ 
                      position: 'absolute', 
                      top: -20, 
                      left: '50%', 
                      transform: 'translateX(-50%)', 
                      fontSize: '0.7rem', 
                      fontWeight: 600, 
                      color: C.textMain,
                      whiteSpace: 'nowrap',
                    }}>
                      {week.workedHours.toFixed(1)}h
                    </div>
                  </div>
                )}
                
                {/* Overtime (stacked on top) */}
                {week.overtimeHours > 0 && (
                  <div
                    style={{
                      width: '60%',
                      margin: '0 auto',
                      height: `${overtimePercent}%`,
                      background: '#059669',
                      borderRadius: '6px 6px 0 0',
                      marginTop: -2,
                    }}
                    title={`Overtime: ${week.overtimeHours.toFixed(1)}h`}
                  />
                )}
                
                {/* Missing Hours (separate bar) */}
                {week.missingHours > 0 && (
                  <div style={{ position: 'absolute', right: 0, bottom: 0, width: '35%', height: `${missingPercent}%`, background: '#DC2626', borderRadius: '6px 6px 0 0', opacity: 0.7 }} title={`Missing: ${week.missingHours.toFixed(1)}h`} />
                )}
              </div>
              
              {/* Label */}
              <div style={{ fontSize: '0.68rem', color: C.textMuted, fontWeight: 600, textAlign: 'center' }}>
                {weekLabel}
              </div>
            </div>
          );
        })}
      </div>

      {/* Summary */}
      <div style={{ marginTop: 20, paddingTop: 16, borderTop: `1px solid ${C.border}`, display: 'flex', justifyContent: 'space-around', fontSize: '0.75rem' }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontWeight: 700, fontSize: '1rem', color: C.textMain }}>
            {chartData.reduce((sum, w) => sum + w.workedHours, 0).toFixed(1)}h
          </div>
          <div style={{ color: C.textMuted }}>Total Worked</div>
        </div>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontWeight: 700, fontSize: '1rem', color: '#059669' }}>
            {chartData.reduce((sum, w) => sum + w.overtimeHours, 0).toFixed(1)}h
          </div>
          <div style={{ color: C.textMuted }}>Total Overtime</div>
        </div>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontWeight: 700, fontSize: '1rem', color: '#DC2626' }}>
            {chartData.reduce((sum, w) => sum + w.missingHours, 0).toFixed(1)}h
          </div>
          <div style={{ color: C.textMuted }}>Total Missing</div>
        </div>
      </div>
    </div>
  );
};

export default AttendanceHoursChart;
