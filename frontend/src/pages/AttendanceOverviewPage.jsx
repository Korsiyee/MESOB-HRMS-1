import React, { useState, useEffect, useCallback } from 'react';
import { AttendanceApi } from '../api/attendanceApi';
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Cell,
} from 'recharts';
import { Users, CheckCircle, XCircle, Clock, TrendingUp, Building2, Star, AlertCircle, UserCheck } from 'lucide-react';
import SelfPunchModal from '../components/SelfPunchModal';
import AttendanceStatsCards from '../components/AttendanceStatsCards';
import AttendanceHoursChart from '../components/AttendanceHoursChart';

/* ── Palette ── */
const C = {
  card: '#EEF1F0', border: 'rgba(0,80,60,0.09)',
  shadow: '0 2px 12px rgba(0,60,45,0.07), 0 1px 3px rgba(0,0,0,0.04)',
  primary: '#0F766E', textMain: '#1A2E2B', textSub: '#1E4A42', textMuted: '#2E6058',
  headerBg: 'linear-gradient(135deg, #0c1e1c 0%, #1e3a37 100%)',
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

const StatCard = ({ icon: Icon, label, value, color, loading }) => (
  <Card style={{ padding: 20 }}>
    {loading ? <Skeleton /> : (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <p style={{ margin: 0, fontSize: '0.68rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: 1, color: C.textMuted }}>{label}</p>
          <p style={{ margin: '6px 0 0', fontSize: '1.9rem', fontWeight: 700, color, fontFamily: 'Poppins,sans-serif', lineHeight: 1 }}>{value ?? '—'}</p>
        </div>
        <div style={{ width: 44, height: 44, borderRadius: 12, background: `${color}18`, display: 'flex', alignItems: 'center', justifyContent: 'center', color }}>
          <Icon size={20} />
        </div>
      </div>
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

const AttendanceOverviewPage = () => {
  const [summary,     setSummary]     = useState(null);
  const [trend,       setTrend]       = useState([]);
  const [deptStats,   setDeptStats]   = useState([]);
  const [topEmps,     setTopEmps]     = useState([]);
  const [corrections, setCorrections] = useState([]);
  const [loading,     setLoading]     = useState(true);
  const [error,       setError]       = useState('');
  const [range,       setRange]       = useState('7');
  const [showSelfPunch, setShowSelfPunch] = useState(false);
  const [notice, setNotice] = useState({ type: '', message: '' });
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
        // Backend returns { PRESENT:{count,pct}, ABSENT:{count,pct}, LATE:{count,pct}, ... , total }
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
        // Backend returns { dept_uuid, department, total, present_count, present_pct }
        // (the service already maps dept_name → department before returning)
        const raw = d.value?.data || [];
        setDeptStats(raw.map(r => ({
          ...r,
          department:     r.department || r.dept_name || '',
          attendanceRate: parseFloat(r.present_pct) || 0,
        })));
      }
      if (top.status === 'fulfilled') {
        // Backend returns { uuid, mesob_id, full_name, department, present_days }
        const raw = top.value?.data || [];
        setTopEmps(raw.map(r => ({
          ...r,
          attendanceRate: r.present_days ?? '—',
        })));
      }
      if (cor.status === 'fulfilled') setCorrections(cor.value?.data || []);
      
      // Set all records for analytics
      if (allRec.status === 'fulfilled') {
        const records = allRec.value?.data || [];
        setAllRecords(records);
        
        // Calculate stats from records
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

  const showMsg = (type, message) => { 
    setNotice({ type, message }); 
    setTimeout(() => setNotice({ type: '', message: '' }), 4500); 
  };

  const handleSelfPunchSuccess = () => {
    showMsg('success', 'Attendance recorded successfully!');
    setShowSelfPunch(false);
    load(); // Refresh attendance data
  };

  const pct = (n, d) => d > 0 ? Math.round((n / d) * 100) : 0;

  return (
    <div style={{ fontFamily: 'Poppins,sans-serif', display: 'flex', flexDirection: 'column', gap: 22 }}>

      {/* Notice Banner */}
      {notice.message && (
        <div style={{ 
          padding:'11px 16px', 
          borderRadius:10, 
          background: notice.type === 'error' ? 'rgba(220,38,38,0.08)' : 'rgba(15,118,110,0.1)', 
          border: `1px solid ${notice.type === 'error' ? 'rgba(220,38,38,0.2)' : 'rgba(15,118,110,0.2)'}`, 
          color: notice.type === 'error' ? '#DC2626' : C.primary, 
          fontSize:'0.8rem', 
          fontWeight:500, 
          display:'flex', 
          justifyContent:'space-between', 
          alignItems:'center' 
        }}>
          <div style={{ display:'flex', alignItems:'center', gap:8 }}>
            <AlertCircle size={16}/>
            <span>{notice.message}</span>
          </div>
          <button 
            onClick={() => setNotice({ type: '', message: '' })} 
            style={{ background:'none', border:'none', cursor:'pointer', color:'inherit', display:'flex', fontSize:'1.2rem', lineHeight:1, padding:0 }}
          >
            ×
          </button>
        </div>
      )}

      {/* Header */}
      <div style={{ background: C.headerBg, borderRadius: 14, padding: '20px 26px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', boxShadow: '0 4px 20px rgba(0,0,0,0.18)' }}>
        <div>
          <h1 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 700, color: '#E8F0EE' }}>Attendance Overview</h1>
          <p style={{ margin: '3px 0 0', fontSize: '0.75rem', color: 'rgba(232,240,238,0.6)' }}>Analytics and insights across all employees</p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          {/* Self Punch Button */}
          <button 
            onClick={() => setShowSelfPunch(true)} 
            style={{ 
              background:'#E8F0EE', 
              color:C.primary, 
              border:'none', 
              borderRadius:8, 
              padding:'10px 20px', 
              fontSize:'0.82rem', 
              fontWeight:600, 
              cursor:'pointer', 
              display:'inline-flex', 
              alignItems:'center', 
              gap:8, 
              fontFamily:'Poppins,sans-serif', 
              transition:'all 0.15s',
              boxShadow:'0 2px 8px rgba(0,0,0,0.1)'
            }}
            onMouseEnter={e => e.currentTarget.style.background = '#fff'}
            onMouseLeave={e => e.currentTarget.style.background = '#E8F0EE'}
          >
            <UserCheck size={16}/>
            Self Punch
          </button>

          {/* Date Range Filter */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, borderLeft:'1px solid rgba(255,255,255,0.2)', paddingLeft:12 }}>
            <span style={{ fontSize: '0.75rem', color: 'rgba(232,240,238,0.7)' }}>Range:</span>
            {['7','14','30'].map(d => (
              <button key={d} onClick={() => setRange(d)} style={{
                padding: '6px 14px', borderRadius: 8, border: 'none', cursor: 'pointer',
                background: range === d ? '#E8F0EE' : 'rgba(255,255,255,0.1)',
                color: range === d ? C.primary : '#E8F0EE',
                fontSize: '0.75rem', fontWeight: 600, fontFamily: 'Poppins,sans-serif',
                transition: 'all 0.15s',
              }}>{d}d</button>
            ))}
          </div>
        </div>
      </div>

      {error && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '11px 16px', borderRadius: 10, background: 'rgba(220,38,38,0.08)', border: '1px solid rgba(220,38,38,0.2)', color: '#DC2626', fontSize: '0.8rem' }}>
          <AlertCircle size={15} /> {error}
          <button onClick={load} style={{ marginLeft: 'auto', background: 'none', border: 'none', cursor: 'pointer', color: '#DC2626', fontWeight: 600, fontSize: '0.75rem', textDecoration: 'underline' }}>Retry</button>
        </div>
      )}

      {/* KPI row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 14 }}>
        <StatCard icon={Users}       label="Total Records"    value={summary?.totalRecords}                                    color="#0F766E" loading={loading} />
        <StatCard icon={CheckCircle} label="Present"          value={`${summary?.present ?? '—'} (${pct(summary?.present, summary?.totalRecords)}%)`} color="#059669" loading={loading} />
        <StatCard icon={XCircle}     label="Absent"           value={`${summary?.absent ?? '—'} (${pct(summary?.absent, summary?.totalRecords)}%)`}   color="#DC2626" loading={loading} />
        <StatCard icon={Clock}       label="Late"             value={`${summary?.late ?? '—'} (${pct(summary?.late, summary?.totalRecords)}%)`}        color="#F59E0B" loading={loading} />
        <StatCard icon={TrendingUp}  label="Attendance Rate"  value={summary?.attendanceRate != null ? `${summary.attendanceRate}%` : '—'}             color="#2563EB" loading={loading} />
      </div>

      {/* Analytics Components - Hours Stats and Chart */}
      {!loading && stats && <AttendanceStatsCards stats={stats} />}
      {!loading && allRecords.length > 0 && <AttendanceHoursChart records={allRecords} />}

      {/* Trend chart + Department stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0,1fr) 340px', gap: 18 }}>

        {/* Trend area chart */}
        <Card style={{ padding: 22 }}>
          <div style={{ marginBottom: 16 }}>
            <h3 style={{ margin: 0, fontSize: '0.9rem', fontWeight: 700, color: C.textMain }}>Attendance Trend</h3>
            <p style={{ margin: '3px 0 0', fontSize: '0.73rem', color: C.textMuted }}>Daily breakdown over selected range</p>
          </div>
          {loading ? <Skeleton h={220} /> : trend.length === 0 ? (
            <p style={{ textAlign: 'center', color: C.textMuted, padding: '40px 0', fontSize: '0.82rem' }}>No trend data available</p>
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <AreaChart data={trend} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="gP" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%"  stopColor="#0F766E" stopOpacity={0.2} />
                    <stop offset="95%" stopColor="#0F766E" stopOpacity={0.01} />
                  </linearGradient>
                  <linearGradient id="gA" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%"  stopColor="#DC2626" stopOpacity={0.15} />
                    <stop offset="95%" stopColor="#DC2626" stopOpacity={0.01} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,80,60,0.06)" vertical={false} />
                <XAxis dataKey="date" tick={{ fontSize: 11, fill: C.textMuted }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: C.textMuted }} axisLine={false} tickLine={false} />
                <Tooltip content={<CustomTooltip />} />
                <Area type="monotone" dataKey="present" name="Present" stroke="#0F766E" strokeWidth={2.5} fill="url(#gP)" dot={false} activeDot={{ r: 5, fill: '#0F766E', strokeWidth: 0 }} />
                <Area type="monotone" dataKey="absent"  name="Absent"  stroke="#DC2626" strokeWidth={1.5} fill="url(#gA)" dot={false} activeDot={{ r: 4, fill: '#DC2626', strokeWidth: 0 }} />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </Card>

        {/* Department stats */}
        <Card style={{ padding: 22 }}>
          <div style={{ marginBottom: 16 }}>
            <h3 style={{ margin: 0, fontSize: '0.9rem', fontWeight: 700, color: C.textMain }}>By Department</h3>
            <p style={{ margin: '3px 0 0', fontSize: '0.73rem', color: C.textMuted }}>Attendance rate per department</p>
          </div>
          {loading ? <Skeleton h={220} /> : deptStats.length === 0 ? (
            <p style={{ textAlign: 'center', color: C.textMuted, padding: '40px 0', fontSize: '0.82rem' }}>No department data</p>
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={deptStats.slice(0, 8)} layout="vertical" margin={{ top: 0, right: 16, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,80,60,0.06)" horizontal={false} />
                <XAxis type="number" tick={{ fontSize: 11, fill: C.textMuted }} axisLine={false} tickLine={false} domain={[0, 100]} unit="%" />
                <YAxis type="category" dataKey="department" width={110} tick={{ fontSize: 10, fill: C.textSub }} axisLine={false} tickLine={false} />
                <Tooltip formatter={(v) => `${v}%`} contentStyle={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 8, fontSize: '0.75rem' }} />
                <Bar dataKey="attendanceRate" name="Rate" radius={[0, 6, 6, 0]} maxBarSize={14}>
                  {deptStats.slice(0, 8).map((_, i) => <Cell key={i} fill={DEPT_COLORS[i % DEPT_COLORS.length]} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </Card>
      </div>

      {/* Top employees + Recent corrections */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 18 }}>

        {/* Top employees */}
        <Card style={{ padding: 22 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
            <Star size={16} color="#F59E0B" />
            <h3 style={{ margin: 0, fontSize: '0.9rem', fontWeight: 700, color: C.textMain }}>Top Attendance</h3>
            <span style={{ marginLeft: 'auto', fontSize: '0.7rem', color: C.textMuted }}>by present days</span>
          </div>
          {loading ? <Skeleton h={160} /> : topEmps.length === 0 ? (
            <p style={{ textAlign: 'center', color: C.textMuted, padding: '24px 0', fontSize: '0.82rem' }}>No data available</p>
          ) : topEmps.map((emp, i) => (
            <div key={emp.employee_uuid || i} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '9px 0', borderBottom: i < topEmps.length - 1 ? `1px solid rgba(0,80,60,0.07)` : 'none' }}>
              <div style={{ width: 28, height: 28, borderRadius: '50%', background: 'linear-gradient(135deg,#14B8A6,#0F766E)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.65rem', fontWeight: 700, color: 'white', flexShrink: 0 }}>
                {i + 1}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{ margin: 0, fontSize: '0.8rem', fontWeight: 600, color: C.textMain, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {emp.full_name || emp.employee_uuid}
                </p>
                <p style={{ margin: 0, fontSize: '0.7rem', color: C.textMuted }}>{emp.department || ''}</p>
              </div>
              <span style={{ fontSize: '0.82rem', fontWeight: 700, color: '#059669' }}>{emp.attendanceRate ?? '—'} days</span>
            </div>
          ))}
        </Card>

        {/* Recent corrections */}
        <Card style={{ padding: 22 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
            <AlertCircle size={16} color="#F59E0B" />
            <h3 style={{ margin: 0, fontSize: '0.9rem', fontWeight: 700, color: C.textMain }}>Recent Corrections</h3>
          </div>
          {loading ? <Skeleton h={160} /> : corrections.length === 0 ? (
            <p style={{ textAlign: 'center', color: C.textMuted, padding: '24px 0', fontSize: '0.82rem' }}>No recent corrections</p>
          ) : corrections.map((c, i) => (
            <div key={c.uuid || i} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '9px 0', borderBottom: i < corrections.length - 1 ? `1px solid rgba(0,80,60,0.07)` : 'none' }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{ margin: 0, fontSize: '0.8rem', fontWeight: 600, color: C.textMain, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {c.full_name || c.employee_uuid}
                </p>
                <p style={{ margin: 0, fontSize: '0.7rem', color: C.textMuted }}>{c.date} — corrected by {c.corrected_by_name || 'Admin'}</p>
              </div>
              <span style={{ fontSize: '0.7rem', fontWeight: 700, padding: '2px 8px', borderRadius: 99, background: 'rgba(245,158,11,0.1)', color: '#B45309' }}>{c.status}</span>
            </div>
          ))}
        </Card>
      </div>

      {/* Self Punch Modal */}
      {showSelfPunch && (
        <SelfPunchModal 
          onClose={() => setShowSelfPunch(false)} 
          onSuccess={handleSelfPunchSuccess}
        />
      )}
    </div>
  );
};

export default AttendanceOverviewPage;
