import React, { useState, useEffect, useCallback } from 'react';
import { AttendanceApi } from '../api/attendanceApi';
import { useAuth } from '../context/AuthContext';
import { Users, Search, RefreshCw, Calendar, CheckCircle, XCircle, Clock, AlertCircle, TrendingUp } from 'lucide-react';
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from 'recharts';
import PrettyDatePicker from '../components/PrettyDatePicker';

/* ── Department Head View Palette ── */
const C = {
  card: '#EEF1F0', border: 'rgba(0,80,60,0.09)',
  shadow: '0 2px 12px rgba(0,60,45,0.07), 0 1px 3px rgba(0,0,0,0.04)',
  primary: '#0F766E', primaryHov: '#14B8A6',
  textMain: '#1A2E2B', textSub: '#1E4A42', textMuted: '#2E6058',
  headerBg: 'linear-gradient(135deg, #0c1e1c 0%, #1e3a37 100%)',
};

const STATUS_STYLES = {
  PRESENT:  { bg:'rgba(5,150,105,0.12)',  color:'#059669' },
  ABSENT:   { bg:'rgba(220,38,38,0.1)',   color:'#DC2626' },
  LATE:     { bg:'rgba(245,158,11,0.12)', color:'#B45309' },
  HALF_DAY: { bg:'rgba(37,99,235,0.12)',  color:'#1D4ED8' },
  LEAVE:    { bg:'rgba(124,58,237,0.12)', color:'#7C3AED' },
  HOLIDAY:  { bg:'rgba(15,118,110,0.12)', color:'#0F766E' },
  WEEKEND:  { bg:'rgba(0,80,60,0.08)',    color:C.textMuted },
};

const COLORS = {
  PRESENT: '#059669',
  LATE: '#B45309',
  HALF_DAY: '#1D4ED8',
  ABSENT: '#DC2626',
  LEAVE: '#7C3AED',
};

const StatusBadge = ({ status }) => {
  const s = STATUS_STYLES[status] || STATUS_STYLES.ABSENT;
  return <span style={{ padding:'4px 10px', borderRadius:99, fontSize:'0.7rem', fontWeight:700, background:s.bg, color:s.color }}>{status}</span>;
};

const Card = ({ children, style = {} }) => (
  <div style={{ background: C.card, borderRadius: 14, border: `1px solid ${C.border}`, boxShadow: C.shadow, padding: 22, ...style }}>
    {children}
  </div>
);

const StatCard = ({ icon: Icon, label, value, color }) => (
  <Card style={{ display:'flex', alignItems:'center', gap:14 }}>
    <div style={{ width:48, height:48, borderRadius:12, background:`${color}15`, display:'flex', alignItems:'center', justifyContent:'center', color, flexShrink:0 }}>
      <Icon size={22}/>
    </div>
    <div>
      <p style={{ margin:0, fontSize:'0.68rem', fontWeight:600, textTransform:'uppercase', letterSpacing:'0.05em', color:C.textMuted }}>{label}</p>
      <p style={{ margin:'4px 0 0', fontSize:'1.7rem', fontWeight:700, color:C.textMain, lineHeight:1 }}>{value}</p>
    </div>
  </Card>
);

const fieldStyle = { 
  width:'100%', padding:'9px 13px', borderRadius:8, border:`1px solid ${C.border}`, 
  background:C.card, fontSize:'0.82rem', color:C.textMain, outline:'none', 
  fontFamily:'Poppins,sans-serif', boxSizing:'border-box', transition:'border 0.2s' 
};
const labelStyle = { 
  display:'block', fontSize:'0.72rem', fontWeight:600, color:C.textSub, 
  marginBottom:5, textTransform:'uppercase', letterSpacing:'0.05em' 
};

const DeptHeadAttendancePage = () => {
  const { user } = useAuth();
  const departmentUuid = user?.department_uuid;
  
  const [records, setRecords] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({ 
    search: '', 
    status: '', 
    startDate: '', 
    endDate: '', 
    page: 1, 
    pageSize: 20 
  });
  const [meta, setMeta] = useState({ total: 0, totalPages: 1 });

  // Early return if no department UUID
  if (!departmentUuid) {
    return (
      <div style={{ fontFamily:'Poppins,sans-serif', padding:20 }}>
        <Card>
          <div style={{ padding:40, textAlign:'center' }}>
            <AlertCircle size={48} color="#DC2626" style={{ margin:'0 auto 16px' }} />
            <h3 style={{ margin:0, fontSize:'1.2rem', color:C.textMain }}>Department Not Found</h3>
            <p style={{ margin:'12px 0 0', color:C.textMuted, fontSize:'0.9rem' }}>
              You are not assigned to a department. Please contact your administrator.
            </p>
          </div>
        </Card>
      </div>
    );
  }

  const load = useCallback(async () => {
    if (!departmentUuid) {
      console.error("Department UUID is missing");
      setLoading(false);
      return;
    }
    setLoading(true);
    
    try {
      // Fetch attendance records for department
      const params = {
        departmentUuid,
        search: filters.search,
        status: filters.status,
        startDate: filters.startDate,
        endDate: filters.endDate,
        page: filters.page,
        pageSize: filters.pageSize,
      };
      
      const res = await AttendanceApi.getAllAttendance(params);
      setRecords(res?.data || []);
      setMeta({ 
        total: res?.meta?.total || 0, 
        totalPages: res?.meta?.totalPages || 1 
      });
      
      // Calculate department stats
      const data = res?.data || [];
      const statusCounts = data.reduce((acc, r) => {
        acc[r.status] = (acc[r.status] || 0) + 1;
        return acc;
      }, {});
      
      const total = data.length;
      const present = statusCounts.PRESENT || 0;
      const late = statusCounts.LATE || 0;
      const halfDay = statusCounts.HALF_DAY || 0;
      const absent = statusCounts.ABSENT || 0;
      const leave = statusCounts.LEAVE || 0;
      const worked = present + late + halfDay;
      
      setStats({
        total,
        present,
        late,
        halfDay,
        absent,
        leave,
        attendanceRate: total > 0 ? ((worked / total) * 100).toFixed(1) : '0.0',
      });
      
    } catch (err) {
      console.error('Failed to load department attendance:', err);
      // Show user-friendly error
      alert(`Failed to load attendance: ${err.message || 'Please try again'}`);
    } finally {
      setLoading(false);
    }
  }, [departmentUuid, filters]);

  useEffect(() => { load(); }, [load]);

  // Prepare pie chart data
  const pieData = stats ? [
    { name: 'Present', value: stats.present, color: COLORS.PRESENT },
    { name: 'Late', value: stats.late, color: COLORS.LATE },
    { name: 'Half Day', value: stats.halfDay, color: COLORS.HALF_DAY },
    { name: 'Absent', value: stats.absent, color: COLORS.ABSENT },
    { name: 'Leave', value: stats.leave, color: COLORS.LEAVE },
  ].filter(d => d.value > 0) : [];

  return (
    <div style={{ fontFamily:'Poppins,sans-serif', display:'flex', flexDirection:'column', gap:20 }}>
      
      {/* Header */}
      <div style={{ background:C.headerBg, borderRadius:14, padding:'22px 28px', boxShadow:'0 4px 20px rgba(0,0,0,0.18)' }}>
        <h1 style={{ margin:0, fontSize:'1.3rem', fontWeight:700, color:'#E8F0EE' }}>Department Attendance</h1>
        <p style={{ margin:'4px 0 0', fontSize:'0.8rem', color:'rgba(232,240,238,0.7)' }}>View and monitor attendance for your department team members</p>
      </div>

      {/* Summary Stats */}
      {loading ? (
        <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit, minmax(180px, 1fr))', gap:14 }}>
          {[1,2,3,4,5].map(i => (
            <Card key={i} style={{ height:90 }}>
              <div style={{ height:'100%', borderRadius:8, background:'rgba(0,80,60,0.06)', animation:'pulse 1.5s ease-in-out infinite' }}>
                <style>{`@keyframes pulse{0%,100%{opacity:1}50%{opacity:.45}}`}</style>
              </div>
            </Card>
          ))}
        </div>
      ) : (
        <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit, minmax(180px, 1fr))', gap:14 }}>
          <StatCard icon={Users} label="Total Records" value={stats?.total || 0} color="#0F766E" />
          <StatCard icon={CheckCircle} label="Present" value={stats?.present || 0} color="#059669" />
          <StatCard icon={Clock} label="Late" value={stats?.late || 0} color="#B45309" />
          <StatCard icon={XCircle} label="Absent" value={stats?.absent || 0} color="#DC2626" />
          <StatCard icon={TrendingUp} label="Att. Rate" value={`${stats?.attendanceRate || 0}%`} color="#2563EB" />
        </div>
      )}

      {/* Filters & Chart */}
      <div style={{ display:'grid', gridTemplateColumns:'1fr 340px', gap:18 }}>
        
        {/* Filters */}
        <Card>
          <h3 style={{ margin:'0 0 16px', fontSize:'0.9rem', fontWeight:700, color:C.textMain }}>Filter Records</h3>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }}>
            {/* Search */}
            <div>
              <label style={labelStyle}>Search Employee</label>
              <div style={{ position:'relative' }}>
                <Search size={13} style={{ position:'absolute', left:11, top:'50%', transform:'translateY(-50%)', color:C.textMuted }}/>
                <input 
                  value={filters.search} 
                  onChange={e=>setFilters(p=>({...p,search:e.target.value,page:1}))} 
                  placeholder="Name or UUID…"
                  style={{ ...fieldStyle, paddingLeft:32 }}
                  onFocus={e=>e.target.style.borderColor=C.primary} 
                  onBlur={e=>e.target.style.borderColor=C.border}
                />
              </div>
            </div>
            
            {/* Status */}
            <div>
              <label style={labelStyle}>Status</label>
              <select 
                value={filters.status} 
                onChange={e=>setFilters(p=>({...p,status:e.target.value,page:1}))} 
                style={{ ...fieldStyle, cursor:'pointer' }}
              >
                <option value="">All Statuses</option>
                {Object.keys(STATUS_STYLES).map(s=><option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            
            {/* Date range */}
            <div>
              <label style={labelStyle}>Start Date</label>
              <PrettyDatePicker value={filters.startDate} onChange={v=>setFilters(p=>({...p,startDate:v,page:1}))}/>
            </div>
            <div>
              <label style={labelStyle}>End Date</label>
              <PrettyDatePicker value={filters.endDate} onChange={v=>setFilters(p=>({...p,endDate:v,page:1}))}/>
            </div>
          </div>
          
          <button 
            onClick={load} 
            style={{ 
              marginTop:16, width:'100%', background:C.primary, color:'#fff', border:'none', 
              borderRadius:8, padding:'10px', fontSize:'0.8rem', fontWeight:600, 
              cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', 
              gap:8, fontFamily:'Poppins,sans-serif', transition:'background 0.15s' 
            }}
            onMouseEnter={e=>e.currentTarget.style.background=C.primaryHov}
            onMouseLeave={e=>e.currentTarget.style.background=C.primary}
          >
            <RefreshCw size={15}/> Refresh Data
          </button>
        </Card>

        {/* Pie Chart */}
        <Card>
          <h3 style={{ margin:'0 0 16px', fontSize:'0.9rem', fontWeight:700, color:C.textMain }}>Status Distribution</h3>
          {loading ? (
            <div style={{ height:200, borderRadius:8, background:'rgba(0,80,60,0.06)', animation:'pulse 1.5s ease-in-out infinite' }} />
          ) : pieData.length === 0 ? (
            <p style={{ textAlign:'center', color:C.textMuted, padding:'60px 0', fontSize:'0.82rem' }}>No data available</p>
          ) : (
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie
                  data={pieData}
                  cx="50%"
                  cy="50%"
                  innerRadius={50}
                  outerRadius={80}
                  paddingAngle={2}
                  dataKey="value"
                  label={({name, value}) => `${name}: ${value}`}
                  labelLine={false}
                >
                  {pieData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip 
                  contentStyle={{ background:C.card, border:`1px solid ${C.border}`, borderRadius:8, fontSize:'0.75rem' }}
                />
              </PieChart>
            </ResponsiveContainer>
          )}
        </Card>
      </div>

      {/* Records Grouped by Employee */}
      <Card style={{ padding:0, overflow:'hidden' }}>
        <div style={{ padding:'14px 20px', borderBottom:`1px solid ${C.border}`, display:'flex', alignItems:'center', justifyContent:'space-between' }}>
          <span style={{ fontSize:'0.8rem', fontWeight:600, color:C.textSub }}>
            {meta.total.toLocaleString()} attendance records
          </span>
          <div style={{ display:'flex', gap:6 }}>
            <button 
              onClick={()=>setFilters(p=>({...p,page:Math.max(1,p.page-1)}))} 
              disabled={filters.page<=1}
              style={{ 
                padding:'5px 12px', borderRadius:7, border:`1px solid ${C.border}`, 
                background:'transparent', color:C.textSub, fontSize:'0.75rem', 
                cursor:filters.page<=1?'not-allowed':'pointer', 
                opacity:filters.page<=1?0.5:1 
              }}
            >← Prev</button>
            <span style={{ padding:'5px 12px', fontSize:'0.75rem', color:C.textMuted }}>
              Page {filters.page} of {meta.totalPages}
            </span>
            <button 
              onClick={()=>setFilters(p=>({...p,page:Math.min(meta.totalPages,p.page+1)}))} 
              disabled={filters.page>=meta.totalPages}
              style={{ 
                padding:'5px 12px', borderRadius:7, border:`1px solid ${C.border}`, 
                background:'transparent', color:C.textSub, fontSize:'0.75rem', 
                cursor:filters.page>=meta.totalPages?'not-allowed':'pointer', 
                opacity:filters.page>=meta.totalPages?0.5:1 
              }}
            >Next →</button>
          </div>
        </div>
        
        {loading ? (
          <div style={{ padding:48, textAlign:'center', color:C.textMuted, fontSize:'0.82rem' }}>
            Loading records…
          </div>
        ) : records.length === 0 ? (
          <div style={{ padding:48, textAlign:'center', color:C.textMuted, fontSize:'0.82rem' }}>
            No attendance records found for your department.
          </div>
        ) : (
          <div style={{ padding:20 }}>
            {/* Group records by employee */}
            {(() => {
              const grouped = records.reduce((acc, record) => {
                const key = record.employee_uuid;
                if (!acc[key]) {
                  acc[key] = {
                    employee_uuid: record.employee_uuid,
                    full_name: record.full_name || record.employee_name,
                    records: []
                  };
                }
                acc[key].records.push(record);
                return acc;
              }, {});
              
              return Object.values(grouped).map((group, groupIndex) => (
                <div key={group.employee_uuid} style={{ 
                  marginBottom: groupIndex < Object.values(grouped).length - 1 ? 24 : 0,
                  borderBottom: groupIndex < Object.values(grouped).length - 1 ? `2px solid ${C.border}` : 'none',
                  paddingBottom: groupIndex < Object.values(grouped).length - 1 ? 20 : 0
                }}>
                  {/* Employee Header */}
                  <div style={{ 
                    display:'flex', alignItems:'center', gap:12, marginBottom:12,
                    padding:'10px 14px', background:'rgba(15,118,110,0.08)', 
                    borderRadius:10, border:`1px solid rgba(15,118,110,0.15)`
                  }}>
                    <div style={{ 
                      width:36, height:36, borderRadius:'50%', 
                      background:'linear-gradient(135deg, #14B8A6, #0F766E)', 
                      display:'flex', alignItems:'center', justifyContent:'center',
                      fontSize:'0.85rem', fontWeight:700, color:'white', flexShrink:0
                    }}>
                      {(group.full_name || 'E').charAt(0).toUpperCase()}
                    </div>
                    <div style={{ flex:1 }}>
                      <p style={{ margin:0, fontSize:'0.9rem', fontWeight:700, color:C.textMain }}>
                        {group.full_name || 'Unknown Employee'}
                      </p>
                      <p style={{ margin:'2px 0 0', fontSize:'0.72rem', color:C.textMuted }}>
                        {group.employee_uuid} • {group.records.length} record{group.records.length !== 1 ? 's' : ''}
                      </p>
                    </div>
                  </div>

                  {/* Attendance Records for this Employee */}
                  <table style={{ width:'100%', borderCollapse:'collapse' }}>
                    <thead>
                      <tr>
                        {['Date', 'Status', 'Shift', 'Check In', 'Check Out'].map((h) => (
                          <th key={h} style={{ 
                            padding:'8px 12px', textAlign:'left', fontSize:'0.66rem', 
                            color:C.textMuted, textTransform:'uppercase', letterSpacing:'0.05em', 
                            fontWeight:600, background:'rgba(0,80,60,0.03)', 
                            borderBottom:`1px solid rgba(0,80,60,0.08)`, fontFamily:'Poppins,sans-serif' 
                          }}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {group.records.map((r, i) => (
                        <tr key={r.uuid || i} style={{ 
                          background: i % 2 === 0 ? 'transparent' : 'rgba(0,80,60,0.015)' 
                        }}>
                          <td style={{ 
                            padding:'10px 12px', fontSize:'0.76rem', color:C.textSub, 
                            borderBottom:`1px solid rgba(0,80,60,0.04)` 
                          }}>
                            {new Date(r.date).toLocaleDateString('en-US', { 
                              month:'short', day:'numeric', year:'numeric' 
                            })}
                          </td>
                          <td style={{ 
                            padding:'10px 12px', borderBottom:`1px solid rgba(0,80,60,0.04)` 
                          }}>
                            <StatusBadge status={r.status} />
                          </td>
                          <td style={{ 
                            padding:'10px 12px', fontSize:'0.74rem', color:C.textMuted, 
                            borderBottom:`1px solid rgba(0,80,60,0.04)` 
                          }}>
                            {r.shift_name || r.shift_uuid || '—'}
                          </td>
                          <td style={{ 
                            padding:'10px 12px', fontSize:'0.75rem', color:C.textSub, 
                            borderBottom:`1px solid rgba(0,80,60,0.04)` 
                          }}>
                            {r.check_in ? new Date(r.check_in).toLocaleTimeString('en-US', { 
                              hour:'2-digit', minute:'2-digit' 
                            }) : '—'}
                          </td>
                          <td style={{ 
                            padding:'10px 12px', fontSize:'0.75rem', color:C.textSub, 
                            borderBottom:`1px solid rgba(0,80,60,0.04)` 
                          }}>
                            {r.check_out ? new Date(r.check_out).toLocaleTimeString('en-US', { 
                              hour:'2-digit', minute:'2-digit' 
                            }) : '—'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ));
            })()}
          </div>
        )}
      </Card>
    </div>
  );
};

export default DeptHeadAttendancePage;
