import React, { useState, useEffect, useCallback } from 'react';
import { AttendanceApi } from '../api/attendanceApi';
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Cell, PieChart, Pie, Legend,
} from 'recharts';
import { Users, CheckCircle, XCircle, Clock, TrendingUp, Building2, Star, AlertCircle, Calendar, BarChart3, TrendingDown } from 'lucide-react';
import AttendanceStatsCards from '../components/AttendanceStatsCards';
import AttendanceHoursChart from '../components/AttendanceHoursChart';

/* ── Palette ── */
const C = {
  card: '#EEF1F0', border: 'rgba(0,80,60,0.09)',
  shadow: '0 2px 12px rgba(0,60,45,0.07), 0 1px 3px rgba(0,0,0,0.04)',
  primary: '#0F766E', primaryHov: '#14B8A6', textMain: '#1A2E2B', textSub: '#1E4A42', textMuted: '#2E6058',
  headerBg: 'linear-gradient(135deg, #0c1e1c 0%, #1e3a37 100%)',
  success: '#059669', error: '#DC2626', warning: '#F59E0B', info: '#2563EB',
};

const Card = ({ children, style = {} }) => (
  <div style={{ background: C.card, borderRadius: 14, border: `1px solid ${C.border}`, boxShadow: C.shadow, ...style }}>
    {children}
  </div>
);

const Skeleton = ({ h = 80 }) => (
  <div style={{ height: h, borderRadius: 10, background: 'rgba(0,80,60,0.06)', animation: 'pulse 1.5s ease-in-out infinite' }}>
    <style>{`@keyframes pulse{0%,100%{opacity:1}50%{opacity:.45}}`}</style>
  </div>
);

const StatCard = ({ icon: Icon, label, value, color, loading, trend, subtitle }) => (
  <Card style={{ padding: 20 }}>
    {loading ? <Skeleton /> : (
      <>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
          <div>
            <p style={{ margin: 0, fontSize: '0.68rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: 1, color: C.textMuted }}>{label}</p>
            <p style={{ margin: '6px 0 0', fontSize: '1.9rem', fontWeight: 700, color, fontFamily: 'Poppins,sans-serif', lineHeight: 1 }}>{value ?? '—'}</p>
            {subtitle && <p style={{ margin: '4px 0 0', fontSize: '0.7rem', color: C.textMuted }}>{subtitle}</p>}
          </div>
          <div style={{ width: 44, height: 44, borderRadius: 12, background: `${color}18`, display: 'flex', alignItems: 'center', justifyContent: 'center', color }}>
            <Icon size={20} />
          </div>
        </div>
        {trend && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 8 }}>
            <TrendingUp size={12} color={trend > 0 ? C.success : C.error} />
            <span style={{ fontSize: '0.7rem', fontWeight: 600, color: trend > 0 ? C.success : C.error }}>
              {trend > 0 ? '+' : ''}{trend}% from last period
            </span>
          </div>
        )}
      </>
    )}
  </Card>
);

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 10, padding: '10px 14px', boxShadow: C.shadow }}>
      <p style={{ margin: '0 0 6px', fontSize: '0.7rem', fontWeight: 600, color: C.textMuted }}>{label}</p>
      {payload.map(p => (
        <div key={p.name} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: '0.8rem', fontWeight: 600 }}>
          <span style={{ width: 8, height: 8, borderRadius: '50%', background: p.color }} />
          <span style={{ color: C.textSub }}>{p.name}:</span>
          <span style={{ color: p.color }}>{p.value}</span>
        </div>
      ))}
    </div>
  );
};

const DEPT_COLORS = ['#0F766E','#14B8A6','#2DD4BF','#0D9488','#059669','#10B981','#34D399','#6EE7B7'];

const STATUS_COLORS = {
  PRESENT: '#059669',
  ABSENT: '#DC2626',
  LATE: '#F59E0B',
  HALF_DAY: '#8B5CF6',
  LEAVE: '#2563EB',
};

const AttendanceOverviewPage = () => {
  const [summary,     setSummary]     = useState(null);
  const [trend,       setTrend]       = useState([]);
  const [deptStats,   setDeptStats]   = useState([]);
  const [topEmps,     setTopEmps]     = useState([]);
  const [corrections, setCorrections] = useState([]);
  const [loading,     setLoading]     = useState(true);
  const [error,       setError]       = useState('');
  const [range,       setRange]       = useState('7');
  const [allRecords, setAllRecords] = useState([]);
  const [stats, setStats] = useState(null);

  const load = useCallback(async () => {
    setLoading(true); setError('');
    const end   = new Date().toISOString().slice(0, 10);
    const start = new Date(Date.now() - Number(range) * 86400000).toISOString().slice(0, 10);
    try {
      const [s, t, d, top, cor, allRec] = await Promise.allSettled([
        AttendanceApi.getOverviewSummary({ startDate: start, endDate: end }),
        AttendanceApi.getTrend({ startDate: start, endDate: end, groupBy: 'day' }),
        AttendanceApi.getDepartmentStats({ startDate: start, endDate: end }),
        AttendanceApi.getTopEmployees({ startDate: start, endDate: end, limit: 5 }),
        AttendanceApi.getRecentCorrections({ limit: 6 }),
        AttendanceApi.getAllAttendance({ startDate: start, endDate: end, page: 1, pageSize: 10000 }),
      ]);
      if (s.status === 'fulfilled') {
        const raw = s.value?.data || {};
        const present   = raw.PRESENT?.count  || 0;
        const absent    = raw.ABSENT?.count   || 0;
        const late      = raw.LATE?.count     || 0;
        const halfDay   = raw.HALF_DAY?.count || 0;
        const leave     = raw.LEAVE?.count    || 0;
        const total     = raw.total           || 0;
        const worked    = present + late + halfDay;
        setSummary({
          totalRecords:   total,
          present,
          absent,
          late,
          halfDay,
          leave,
          attendanceRate: total > 0 ? ((worked / total) * 100).toFixed(1) : '0.0',
        });
      }
      if (t.status === 'fulfilled')   setTrend(t.value?.data || []);
      if (d.status === 'fulfilled') {
        const raw = d.value?.data || [];
        setDeptStats(raw.map(r => ({
          ...r,
          department:     r.department || r.dept_name || '',
          attendanceRate: parseFloat(r.present_pct) || 0,
        })));
      }
      if (top.status === 'fulfilled') {
        const raw = top.value?.data || [];
        setTopEmps(raw.map(r => ({
          ...r,
          attendanceRate: r.present_days ?? '—',
        })));
      }
      if (cor.status === 'fulfilled') setCorrections(cor.value?.data || []);
      
      if (allRec.status === 'fulfilled') {
        const records = allRec.value?.data || [];
        setAllRecords(records);
        
        if (records.length > 0) {
          const totalWorkedHours = records.reduce((sum, r) => sum + (parseFloat(r.worked_hours) || 0), 0);
          const totalOvertimeHours = records.reduce((sum, r) => sum + (parseFloat(r.overtime_hours) || 0), 0);
          const totalMissingHours = records.reduce((sum, r) => sum + (parseFloat(r.missing_hours) || 0), 0);
          const lateCount = records.filter(r => (parseFloat(r.late_minutes) || 0) > 0).length;

          setStats({
            totalWorkedHours,
            totalOvertimeHours,
            totalMissingHours,
            lateCount,
          });
        } else {
          setStats(null);
        }
      }
    } catch (e) { setError(e.message || 'Failed to load attendance data'); }
    finally { setLoading(false); }
  }, [range]);

  useEffect(() => { load(); }, [load]);

  const pct = (n, d) => d > 0 ? Math.round((n / d) * 100) : 0;

  // Prepare status distribution for pie chart
  const statusDistribution = summary ? [
    { name: 'Present', value: summary.present, color: STATUS_COLORS.PRESENT },
    { name: 'Absent', value: summary.absent, color: STATUS_COLORS.ABSENT },
    { name: 'Late', value: summary.late, color: STATUS_COLORS.LATE },
    { name: 'Half Day', value: summary.halfDay, color: STATUS_COLORS.HALF_DAY },
    { name: 'Leave', value: summary.leave, color: STATUS_COLORS.LEAVE },
  ].filter(item => item.value > 0) : [];

  return (
    <div style={{ fontFamily: 'Poppins,sans-serif', display: 'flex', flexDirection: 'column', gap: 22 }}>

      {/* Header */}
      <div style={{ background: C.headerBg, borderRadius: 14, padding: '22px 28px', boxShadow: '0 4px 20px rgba(0,0,0,0.2)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 16 }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
              <BarChart3 size={24} color="#14B8A6" />
              <h1 style={{ margin: 0, fontSize: '1.3rem', fontWeight: 800, color: '#E8F0EE' }}>Attendance Analytics</h1>
            </div>
            <p style={{ margin: '3px 0 0', fontSize: '0.76rem', color: 'rgba(232,240,238,0.6)' }}>
              Comprehensive insights and analytics across all employees
            </p>
          </div>
          {/* Date Range Filter */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'rgba(0,0,0,0.2)', borderRadius: 10, padding: 6 }}>
            <Calendar size={16} color="rgba(232,240,238,0.7)" />
            <span style={{ fontSize: '0.75rem', color: 'rgba(232,240,238,0.7)', marginRight: 4 }}>Period:</span>
            {['7','14','30','90'].map(d => (
              <button key={d} onClick={() => setRange(d)} style={{
                padding: '6px 14px', borderRadius: 7, border: 'none', cursor: 'pointer',
                background: range === d ? 'rgba(232,240,238,0.95)' : 'transparent',
                color: range === d ? C.primary : 'rgba(232,240,238,0.8)',
                fontSize: '0.75rem', fontWeight: 600, fontFamily: 'Poppins,sans-serif',
                transition: 'all 0.2s',
              }}
              onMouseEnter={e => { if(range !== d) e.currentTarget.style.background = 'rgba(255,255,255,0.1)'; }}
              onMouseLeave={e => { if(range !== d) e.currentTarget.style.background = 'transparent'; }}
              >{d}d</button>
            ))}
          </div>
        </div>
      </div>

      {error && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '12px 18px', borderRadius: 10, background: 'rgba(220,38,38,0.08)', border: '1px solid rgba(220,38,38,0.2)', color: '#DC2626', fontSize: '0.82rem', fontWeight: 500 }}>
          <AlertCircle size={16} /> {error}
          <button onClick={load} style={{ marginLeft: 'auto', background: 'none', border: 'none', cursor: 'pointer', color: '#DC2626', fontWeight: 600, fontSize: '0.75rem', textDecoration: 'underline' }}>Retry</button>
        </div>
      )}

      {/* Primary KPI Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 16 }}>
        <StatCard 
          icon={Users} 
          label="Total Attendance Records" 
          value={summary?.totalRecords?.toLocaleString()} 
          color={C.primary} 
          loading={loading}
          subtitle={`Last ${range} days`}
        />
        <StatCard 
          icon={CheckCircle} 
          label="Present" 
          value={summary?.present?.toLocaleString()} 
          color={C.success} 
          loading={loading}
          subtitle={`${pct(summary?.present, summary?.totalRecords)}% of total`}
        />
        <StatCard 
          icon={XCircle} 
          label="Absent" 
          value={summary?.absent?.toLocaleString()} 
          color={C.error} 
          loading={loading}
          subtitle={`${pct(summary?.absent, summary?.totalRecords)}% of total`}
        />
        <StatCard 
          icon={Clock} 
          label="Late Arrivals" 
          value={summary?.late?.toLocaleString()} 
          color={C.warning} 
          loading={loading}
          subtitle={`${pct(summary?.late, summary?.totalRecords)}% of total`}
        />
        <StatCard 
          icon={TrendingUp} 
          label="Overall Attendance Rate" 
          value={summary?.attendanceRate != null ? `${summary.attendanceRate}%` : '—'} 
          color={C.info} 
          loading={loading}
          subtitle="Present + Late + Half Day"
        />
      </div>

      {/* Hours Analytics */}
      {!loading && stats && <AttendanceStatsCards stats={stats} />}
      {!loading && allRecords.length > 0 && <AttendanceHoursChart records={allRecords} />}

      {/* Trend chart + Status Distribution */}
      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 2fr) minmax(0, 1fr)', gap: 18 }}>

        {/* Trend area chart */}
        <Card style={{ padding: 24 }}>
          <div style={{ marginBottom: 18 }}>
            <h3 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 700, color: C.textMain }}>Attendance Trend Over Time</h3>
            <p style={{ margin: '4px 0 0', fontSize: '0.73rem', color: C.textMuted }}>Daily breakdown showing present vs absent patterns</p>
          </div>
          {loading ? <Skeleton h={260} /> : trend.length === 0 ? (
            <div style={{ textAlign: 'center', color: C.textMuted, padding: '60px 0', fontSize: '0.82rem' }}>
              <BarChart3 size={32} color={C.textMuted} style={{ margin: '0 auto 12px', opacity: 0.3 }} />
              <p style={{ margin: 0 }}>No trend data available for the selected period</p>
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={260}>
              <AreaChart data={trend} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="gP" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%"  stopColor={C.success} stopOpacity={0.3} />
                    <stop offset="95%" stopColor={C.success} stopOpacity={0.01} />
                  </linearGradient>
                  <linearGradient id="gA" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%"  stopColor={C.error} stopOpacity={0.2} />
                    <stop offset="95%" stopColor={C.error} stopOpacity={0.01} />
                  </linearGradient>
                  <linearGradient id="gL" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%"  stopColor={C.warning} stopOpacity={0.2} />
                    <stop offset="95%" stopColor={C.warning} stopOpacity={0.01} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,80,60,0.08)" vertical={false} />
                <XAxis dataKey="date" tick={{ fontSize: 11, fill: C.textMuted }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: C.textMuted }} axisLine={false} tickLine={false} />
                <Tooltip content={<CustomTooltip />} />
                <Area type="monotone" dataKey="present" name="Present" stroke={C.success} strokeWidth={2.5} fill="url(#gP)" dot={false} activeDot={{ r: 5, fill: C.success, strokeWidth: 0 }} />
                <Area type="monotone" dataKey="late" name="Late" stroke={C.warning} strokeWidth={2} fill="url(#gL)" dot={false} activeDot={{ r: 4, fill: C.warning, strokeWidth: 0 }} />
                <Area type="monotone" dataKey="absent" name="Absent" stroke={C.error} strokeWidth={1.5} fill="url(#gA)" dot={false} activeDot={{ r: 4, fill: C.error, strokeWidth: 0 }} />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </Card>

        {/* Status Distribution Pie Chart */}
        <Card style={{ padding: 24 }}>
          <div style={{ marginBottom: 18 }}>
            <h3 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 700, color: C.textMain }}>Status Distribution</h3>
            <p style={{ margin: '4px 0 0', fontSize: '0.73rem', color: C.textMuted }}>Breakdown by attendance status</p>
          </div>
          {loading ? <Skeleton h={260} /> : statusDistribution.length === 0 ? (
            <div style={{ textAlign: 'center', color: C.textMuted, padding: '60px 0', fontSize: '0.82rem' }}>
              <p style={{ margin: 0 }}>No status data available</p>
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={260}>
              <PieChart>
                <Pie
                  data={statusDistribution}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {statusDistribution.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend 
                  verticalAlign="bottom" 
                  height={36}
                  formatter={(value, entry) => `${value}: ${entry.payload.value}`}
                />
              </PieChart>
            </ResponsiveContainer>
          )}
        </Card>
      </div>

      {/* Department stats bar chart */}
      <Card style={{ padding: 24 }}>
        <div style={{ marginBottom: 18 }}>
          <h3 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 700, color: C.textMain }}>Department-wise Attendance Comparison</h3>
          <p style={{ margin: '4px 0 0', fontSize: '0.73rem', color: C.textMuted }}>Attendance rate by department for the selected period</p>
        </div>
        {loading ? <Skeleton h={280} /> : deptStats.length === 0 ? (
          <div style={{ textAlign: 'center', color: C.textMuted, padding: '60px 0', fontSize: '0.82rem' }}>
            <Building2 size={32} color={C.textMuted} style={{ margin: '0 auto 12px', opacity: 0.3 }} />
            <p style={{ margin: 0 }}>No department attendance data available</p>
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={deptStats.slice(0, 10)} layout="vertical" margin={{ top: 0, right: 20, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,80,60,0.08)" horizontal={false} />
              <XAxis type="number" tick={{ fontSize: 11, fill: C.textMuted }} axisLine={false} tickLine={false} domain={[0, 100]} unit="%" />
              <YAxis type="category" dataKey="department" width={140} tick={{ fontSize: 11, fill: C.textSub }} axisLine={false} tickLine={false} />
              <Tooltip formatter={(v) => `${v}%`} contentStyle={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 8, fontSize: '0.75rem' }} />
              <Bar dataKey="attendanceRate" name="Attendance Rate" radius={[0, 8, 8, 0]} maxBarSize={18}>
                {deptStats.slice(0, 10).map((_, i) => <Cell key={i} fill={DEPT_COLORS[i % DEPT_COLORS.length]} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        )}
      </Card>

      {/* Top employees + Recent corrections */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 18 }}>

        {/* Top employees */}
        <Card style={{ padding: 24 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 18 }}>
            <div style={{ width: 36, height: 36, borderRadius: 10, background: 'linear-gradient(135deg,#F59E0B,#D97706)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Star size={18} color="white" />
            </div>
            <div style={{ flex: 1 }}>
              <h3 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 700, color: C.textMain }}>Top Performers</h3>
              <p style={{ margin: '2px 0 0', fontSize: '0.7rem', color: C.textMuted }}>Employees with highest attendance</p>
            </div>
          </div>
          {loading ? <Skeleton h={200} /> : topEmps.length === 0 ? (
            <p style={{ textAlign: 'center', color: C.textMuted, padding: '40px 0', fontSize: '0.82rem' }}>No performance data available</p>
          ) : topEmps.map((emp, i) => (
            <div key={emp.employee_uuid || i} style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '12px 0', borderBottom: i < topEmps.length - 1 ? `1px solid rgba(0,80,60,0.08)` : 'none' }}>
              <div style={{ width: 32, height: 32, borderRadius: '50%', background: i === 0 ? 'linear-gradient(135deg,#F59E0B,#D97706)' : 'linear-gradient(135deg,#14B8A6,#0F766E)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.72rem', fontWeight: 700, color: 'white', flexShrink: 0 }}>
                {i === 0 ? <Star size={14} /> : (i + 1)}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{ margin: 0, fontSize: '0.82rem', fontWeight: 600, color: C.textMain, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {emp.full_name || emp.employee_uuid}
                </p>
                <p style={{ margin: '2px 0 0', fontSize: '0.7rem', color: C.textMuted }}>{emp.department || 'No Department'}</p>
              </div>
              <div style={{ textAlign: 'right', flexShrink: 0 }}>
                <p style={{ margin: 0, fontSize: '0.9rem', fontWeight: 700, color: C.success }}>{emp.attendanceRate ?? '—'}</p>
                <p style={{ margin: '2px 0 0', fontSize: '0.65rem', color: C.textMuted }}>days</p>
              </div>
            </div>
          ))}
        </Card>

        {/* Recent corrections */}
        <Card style={{ padding: 24 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 18 }}>
            <div style={{ width: 36, height: 36, borderRadius: 10, background: 'rgba(245,158,11,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <AlertCircle size={18} color={C.warning} />
            </div>
            <div style={{ flex: 1 }}>
              <h3 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 700, color: C.textMain }}>Recent Corrections</h3>
              <p style={{ margin: '2px 0 0', fontSize: '0.7rem', color: C.textMuted }}>Latest attendance adjustments</p>
            </div>
          </div>
          {loading ? <Skeleton h={200} /> : corrections.length === 0 ? (
            <p style={{ textAlign: 'center', color: C.textMuted, padding: '40px 0', fontSize: '0.82rem' }}>No recent corrections</p>
          ) : corrections.map((c, i) => (
            <div key={c.uuid || i} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 0', borderBottom: i < corrections.length - 1 ? `1px solid rgba(0,80,60,0.08)` : 'none' }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{ margin: 0, fontSize: '0.82rem', fontWeight: 600, color: C.textMain, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {c.full_name || c.employee_uuid}
                </p>
                <p style={{ margin: '3px 0 0', fontSize: '0.7rem', color: C.textMuted }}>
                  {c.date} • by {c.corrected_by_name || 'Admin'}
                </p>
              </div>
              <span style={{ fontSize: '0.7rem', fontWeight: 700, padding: '4px 10px', borderRadius: 6, background: STATUS_COLORS[c.status] ? `${STATUS_COLORS[c.status]}15` : 'rgba(100,116,139,0.1)', color: STATUS_COLORS[c.status] || '#64748B', flexShrink: 0 }}>
                {c.status}
              </span>
            </div>
          ))}
        </Card>
      </div>
    </div>
  );
};

export default AttendanceOverviewPage;
