import React, { useState, useEffect, useCallback } from 'react';
import { AttendanceApi } from '../api/attendanceApi';
import { useAuth } from '../context/AuthContext';
import { Calendar, Clock, TrendingUp, CheckCircle, XCircle, AlertCircle, UserCheck } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import SelfPunchModal from '../components/SelfPunchModal';

/* ── Minimal Palette for Employee View ── */
const C = {
  card: '#EEF1F0', border: 'rgba(0,80,60,0.09)',
  shadow: '0 2px 12px rgba(0,60,45,0.07), 0 1px 3px rgba(0,0,0,0.04)',
  primary: '#0F766E', primaryHov: '#14B8A6',
  textMain: '#1A2E2B', textSub: '#1E4A42', textMuted: '#2E6058',
  headerBg: 'linear-gradient(135deg, #0c1e1c 0%, #1e3a37 100%)',
};

const STATUS_STYLES = {
  PRESENT:  { bg:'rgba(5,150,105,0.12)',  color:'#059669', icon: CheckCircle },
  ABSENT:   { bg:'rgba(220,38,38,0.1)',   color:'#DC2626', icon: XCircle },
  LATE:     { bg:'rgba(245,158,11,0.12)', color:'#B45309', icon: Clock },
  HALF_DAY: { bg:'rgba(37,99,235,0.12)',  color:'#1D4ED8', icon: AlertCircle },
  LEAVE:    { bg:'rgba(124,58,237,0.12)', color:'#7C3AED', icon: Calendar },
  HOLIDAY:  { bg:'rgba(15,118,110,0.12)', color:'#0F766E', icon: Calendar },
  WEEKEND:  { bg:'rgba(0,80,60,0.08)',    color:C.textMuted, icon: Calendar },
};

const StatusBadge = ({ status }) => {
  const s = STATUS_STYLES[status] || STATUS_STYLES.ABSENT;
  const Icon = s.icon;
  return (
    <div style={{ display:'inline-flex', alignItems:'center', gap:6, padding:'5px 12px', borderRadius:99, fontSize:'0.72rem', fontWeight:700, background:s.bg, color:s.color }}>
      <Icon size={13}/>
      <span>{status}</span>
    </div>
  );
};

const Card = ({ children, style = {} }) => (
  <div style={{ background: C.card, borderRadius: 14, border: `1px solid ${C.border}`, boxShadow: C.shadow, padding: 22, ...style }}>
    {children}
  </div>
);

const StatCard = ({ icon: Icon, label, value, subtext, color }) => (
  <Card style={{ display:'flex', alignItems:'center', gap:16 }}>
    <div style={{ width:52, height:52, borderRadius:12, background:`${color}15`, display:'flex', alignItems:'center', justifyContent:'center', color, flexShrink:0 }}>
      <Icon size={24}/>
    </div>
    <div style={{ flex:1 }}>
      <p style={{ margin:0, fontSize:'0.7rem', fontWeight:600, textTransform:'uppercase', letterSpacing:'0.05em', color:C.textMuted }}>{label}</p>
      <p style={{ margin:'4px 0 0', fontSize:'1.8rem', fontWeight:700, color:C.textMain, lineHeight:1 }}>{value}</p>
      {subtext && <p style={{ margin:'2px 0 0', fontSize:'0.72rem', color:C.textMuted }}>{subtext}</p>}
    </div>
  </Card>
);

const EmployeeAttendancePage = () => {
  const { user } = useAuth();
  const employeeUuid = user?.employee_uuid;
  
  const [records, setRecords] = useState([]);
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [range, setRange] = useState('30'); // days
  const [showSelfPunch, setShowSelfPunch] = useState(false);
  const [notice, setNotice] = useState({ type: '', message: '' });

  const load = useCallback(async () => {
    if (!employeeUuid) return;
    setLoading(true);
    
    const endDate = new Date().toISOString().slice(0, 10);
    const startDate = new Date(Date.now() - Number(range) * 86400000).toISOString().slice(0, 10);
    
    try {
      // Fetch attendance summary (includes both records and stats)
      const summaryRes = await AttendanceApi.getEmployeeSummary(employeeUuid, { startDate, endDate });
      
      if (summaryRes?.data) {
        const data = summaryRes.data;
        
        // Set records from the response
        setRecords(data.records || []);
        
        // Set summary stats
        setSummary({
          totalDays: data.total_days || 0,
          presentDays: data.present_count || 0,
          absentDays: data.absent_count || 0,
          lateDays: data.late_count || 0,
          halfDays: data.half_day_count || 0,
          leaveDays: data.leave_count || 0,
          attendanceRate: data.attendance_rate || 0,
        });
      }
    } catch (err) {
      console.error('Failed to load attendance:', err);
    } finally {
      setLoading(false);
    }
  }, [employeeUuid, range]);

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

  // Prepare chart data
  const chartData = [
    { name: 'Present', value: summary?.presentDays || 0, color: '#059669' },
    { name: 'Late', value: summary?.lateDays || 0, color: '#B45309' },
    { name: 'Half Day', value: summary?.halfDays || 0, color: '#1D4ED8' },
    { name: 'Absent', value: summary?.absentDays || 0, color: '#DC2626' },
    { name: 'Leave', value: summary?.leaveDays || 0, color: '#7C3AED' },
  ].filter(d => d.value > 0);

  return (
    <div style={{ fontFamily:'Poppins,sans-serif', display:'flex', flexDirection:'column', gap:20 }}>
      
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
          <span>{notice.message}</span>
          <button 
            onClick={() => setNotice({ type: '', message: '' })} 
            style={{ background:'none', border:'none', cursor:'pointer', color:'inherit', display:'flex' }}
          >
            <XCircle size={15}/>
          </button>
        </div>
      )}

      {/* Header */}
      <div style={{ background:C.headerBg, borderRadius:14, padding:'22px 28px', boxShadow:'0 4px 20px rgba(0,0,0,0.18)' }}>
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
          <div>
            <h1 style={{ margin:0, fontSize:'1.3rem', fontWeight:700, color:'#E8F0EE' }}>My Attendance</h1>
            <p style={{ margin:'4px 0 0', fontSize:'0.8rem', color:'rgba(232,240,238,0.7)' }}>View your personal attendance history and statistics</p>
          </div>
          <div style={{ display:'flex', alignItems:'center', gap:12 }}>
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
            <div style={{ display:'flex', alignItems:'center', gap:8, borderLeft:'1px solid rgba(255,255,255,0.2)', paddingLeft:12 }}>
              <span style={{ fontSize:'0.75rem', color:'rgba(232,240,238,0.7)' }}>Show:</span>
              {['7','30','90'].map(d => (
                <button key={d} onClick={() => setRange(d)} style={{
                  padding:'7px 16px', borderRadius:8, border:'none', cursor:'pointer',
                  background: range === d ? '#E8F0EE' : 'rgba(255,255,255,0.1)',
                  color: range === d ? C.primary : '#E8F0EE',
                  fontSize:'0.76rem', fontWeight:600, fontFamily:'Poppins,sans-serif',
                  transition:'all 0.15s',
                }}>{d} days</button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Summary Stats */}
      {loading ? (
        <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit, minmax(200px, 1fr))', gap:14 }}>
          {[1,2,3,4].map(i => (
            <Card key={i} style={{ height:100 }}>
              <div style={{ height:'100%', borderRadius:8, background:'rgba(0,80,60,0.06)', animation:'pulse 1.5s ease-in-out infinite' }}>
                <style>{`@keyframes pulse{0%,100%{opacity:1}50%{opacity:.45}}`}</style>
              </div>
            </Card>
          ))}
        </div>
      ) : (
        <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit, minmax(200px, 1fr))', gap:14 }}>
          <StatCard 
            icon={Calendar} 
            label="Total Working Days" 
            value={summary?.totalDays || 0}
            subtext={`Last ${range} days`}
            color="#0F766E"
          />
          <StatCard 
            icon={CheckCircle} 
            label="Present Days" 
            value={summary?.presentDays || 0}
            subtext={`${summary?.totalDays ? Math.round((summary.presentDays / summary.totalDays) * 100) : 0}% of total`}
            color="#059669"
          />
          <StatCard 
            icon={XCircle} 
            label="Absent Days" 
            value={summary?.absentDays || 0}
            subtext={`${summary?.lateDays || 0} late arrivals`}
            color="#DC2626"
          />
          <StatCard 
            icon={TrendingUp} 
            label="Attendance Rate" 
            value={`${summary?.attendanceRate || 0}%`}
            subtext={summary?.attendanceRate >= 95 ? 'Excellent!' : summary?.attendanceRate >= 85 ? 'Good' : 'Needs improvement'}
            color="#2563EB"
          />
        </div>
      )}

      {/* Visual Chart + Recent Records */}
      <div style={{ display:'grid', gridTemplateColumns:'380px 1fr', gap:18 }}>
        
        {/* Chart */}
        <Card>
          <h3 style={{ margin:'0 0 16px', fontSize:'0.9rem', fontWeight:700, color:C.textMain }}>Breakdown</h3>
          {loading ? (
            <div style={{ height:240, borderRadius:8, background:'rgba(0,80,60,0.06)', animation:'pulse 1.5s ease-in-out infinite' }} />
          ) : chartData.length === 0 ? (
            <p style={{ textAlign:'center', color:C.textMuted, padding:'60px 0', fontSize:'0.82rem' }}>No data for selected period</p>
          ) : (
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={chartData} margin={{ top:10, right:10, left:-10, bottom:0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,80,60,0.06)" vertical={false} />
                <XAxis dataKey="name" tick={{ fontSize:11, fill:C.textMuted }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize:11, fill:C.textMuted }} axisLine={false} tickLine={false} />
                <Tooltip 
                  contentStyle={{ background:C.card, border:`1px solid ${C.border}`, borderRadius:8, fontSize:'0.75rem' }}
                  formatter={(v) => [`${v} days`, '']}
                />
                <Bar dataKey="value" radius={[8,8,0,0]} maxBarSize={50}>
                  {chartData.map((entry, i) => <Cell key={`cell-${i}`} fill={entry.color} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </Card>

        {/* Recent Records Table */}
        <Card>
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:16 }}>
            <h3 style={{ margin:0, fontSize:'0.9rem', fontWeight:700, color:C.textMain }}>Recent Attendance</h3>
            <span style={{ fontSize:'0.72rem', color:C.textMuted }}>{records.length} records</span>
          </div>
          
          {loading ? (
            <div style={{ height:240, borderRadius:8, background:'rgba(0,80,60,0.06)', animation:'pulse 1.5s ease-in-out infinite' }} />
          ) : records.length === 0 ? (
            <p style={{ textAlign:'center', color:C.textMuted, padding:'60px 0', fontSize:'0.82rem' }}>No attendance records found</p>
          ) : (
            <div style={{ maxHeight:380, overflowY:'auto', marginTop:8 }}>
              <table style={{ width:'100%', borderCollapse:'collapse' }}>
                <thead style={{ position:'sticky', top:0, background:C.card, zIndex:1 }}>
                  <tr>
                    <th style={{ padding:'10px 12px', textAlign:'left', fontSize:'0.68rem', color:C.textMuted, textTransform:'uppercase', letterSpacing:'0.05em', fontWeight:700, borderBottom:`1px solid ${C.border}` }}>Date</th>
                    <th style={{ padding:'10px 12px', textAlign:'left', fontSize:'0.68rem', color:C.textMuted, textTransform:'uppercase', letterSpacing:'0.05em', fontWeight:700, borderBottom:`1px solid ${C.border}` }}>Status</th>
                    <th style={{ padding:'10px 12px', textAlign:'left', fontSize:'0.68rem', color:C.textMuted, textTransform:'uppercase', letterSpacing:'0.05em', fontWeight:700, borderBottom:`1px solid ${C.border}` }}>Check In</th>
                    <th style={{ padding:'10px 12px', textAlign:'left', fontSize:'0.68rem', color:C.textMuted, textTransform:'uppercase', letterSpacing:'0.05em', fontWeight:700, borderBottom:`1px solid ${C.border}` }}>Check Out</th>
                    <th style={{ padding:'10px 12px', textAlign:'left', fontSize:'0.68rem', color:C.textMuted, textTransform:'uppercase', letterSpacing:'0.05em', fontWeight:700, borderBottom:`1px solid ${C.border}` }}>Worked</th>
                    <th style={{ padding:'10px 12px', textAlign:'left', fontSize:'0.68rem', color:C.textMuted, textTransform:'uppercase', letterSpacing:'0.05em', fontWeight:700, borderBottom:`1px solid ${C.border}` }}>Overtime</th>
                    <th style={{ padding:'10px 12px', textAlign:'left', fontSize:'0.68rem', color:C.textMuted, textTransform:'uppercase', letterSpacing:'0.05em', fontWeight:700, borderBottom:`1px solid ${C.border}` }}>Missing</th>
                    <th style={{ padding:'10px 12px', textAlign:'left', fontSize:'0.68rem', color:C.textMuted, textTransform:'uppercase', letterSpacing:'0.05em', fontWeight:700, borderBottom:`1px solid ${C.border}` }}>Shift</th>
                  </tr>
                </thead>
                <tbody>
                  {records.slice(0, 50).map((r, i) => (
                    <tr key={r.uuid || i} style={{ background: i % 2 === 0 ? 'transparent' : 'rgba(0,80,60,0.02)' }}>
                      <td style={{ padding:'12px', fontSize:'0.78rem', color:C.textSub, borderBottom:`1px solid rgba(0,80,60,0.05)` }}>
                        {new Date(r.date).toLocaleDateString('en-US', { month:'short', day:'numeric', year:'numeric' })}
                      </td>
                      <td style={{ padding:'12px', borderBottom:`1px solid rgba(0,80,60,0.05)` }}>
                        <StatusBadge status={r.status} />
                      </td>
                      <td style={{ padding:'12px', fontSize:'0.76rem', color:C.textSub, borderBottom:`1px solid rgba(0,80,60,0.05)` }}>
                        {r.check_in ? new Date(r.check_in).toLocaleTimeString('en-US', { hour:'2-digit', minute:'2-digit' }) : '—'}
                      </td>
                      <td style={{ padding:'12px', fontSize:'0.76rem', color:C.textSub, borderBottom:`1px solid rgba(0,80,60,0.05)` }}>
                        {r.check_out ? new Date(r.check_out).toLocaleTimeString('en-US', { hour:'2-digit', minute:'2-digit' }) : '—'}
                      </td>
                      <td style={{ padding:'12px', fontSize:'0.76rem', fontWeight:600, borderBottom:`1px solid rgba(0,80,60,0.05)`, color: r.worked_hours !== null && r.worked_hours !== undefined ? C.textMain : C.textMuted }}>
                        {r.worked_hours !== null && r.worked_hours !== undefined ? `${r.worked_hours}h` : '—'}
                      </td>
                      <td style={{ padding:'12px', fontSize:'0.76rem', fontWeight:600, borderBottom:`1px solid rgba(0,80,60,0.05)` }}>
                        {r.overtime_hours !== null && r.overtime_hours !== undefined && r.overtime_hours > 0 ? (
                          <span style={{ color:'#059669', background:'rgba(5,150,105,0.1)', padding:'3px 8px', borderRadius:4, display:'inline-block' }}>
                            +{r.overtime_hours}h
                          </span>
                        ) : <span style={{ color:C.textMuted }}>—</span>}
                      </td>
                      <td style={{ padding:'12px', fontSize:'0.76rem', fontWeight:600, borderBottom:`1px solid rgba(0,80,60,0.05)` }}>
                        {r.missing_hours !== null && r.missing_hours !== undefined && r.missing_hours > 0 ? (
                          <span style={{ color:'#DC2626', background:'rgba(220,38,38,0.08)', padding:'3px 8px', borderRadius:4, display:'inline-block' }}>
                            -{r.missing_hours}h
                          </span>
                        ) : <span style={{ color:C.textMuted }}>—</span>}
                      </td>
                      <td style={{ padding:'12px', fontSize:'0.74rem', color:C.textMuted, borderBottom:`1px solid rgba(0,80,60,0.05)` }}>
                        {r.shift_name || '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
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

export default EmployeeAttendancePage;
