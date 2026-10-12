import React, { useState, useEffect, useCallback } from "react";
import { useAuth } from "../context/AuthContext";
import { EmployeeDashboardApi } from "../api/employeeDashboardApi";
import { useResponsive } from "../hooks/useResponsive";
import {
  Users, User, Briefcase, Clock, Calendar, CalendarDays,
  CheckCircle, XCircle, AlertCircle, Bell, MapPin,
  Activity, FileText, Eye, ChevronRight,
} from "lucide-react";

/* ─── theme tokens ─── */
const BRAND   = "#0F766E";
const DARK    = "#1e3a37";
const CARD_BG = "#EEF1F0";
const BORDER  = "rgba(0,80,60,0.12)";
const TEXT    = "#1A2E2B";
const MUTED   = "#2A5C54";

/* ─── helpers ─── */
const fmtDate = (d) => {
  if (!d) return "—";
  try { return new Date(d).toLocaleDateString("en-GB", { day:"2-digit", month:"short", year:"numeric" }); }
  catch { return d; }
};
const calcDuration = (hireDate) => {
  if (!hireDate) return "—";
  const start = new Date(hireDate), now = new Date();
  let years = now.getFullYear() - start.getFullYear();
  let months = now.getMonth() - start.getMonth();
  if (months < 0) { years--; months += 12; }
  const parts = [];
  if (years  > 0) parts.push(`${years} yr${years !== 1 ? "s" : ""}`);
  if (months > 0) parts.push(`${months} mo`);
  return parts.length ? parts.join(" ") : "< 1 month";
};
const upcomingHolidays = (holidays) => {
  const today = new Date(); today.setHours(0,0,0,0);
  return (holidays||[]).filter(h=>{
    const d=new Date(h.gregorianDate||h.holidayDate||"");
    return d>=today;
  }).sort((a,b)=>new Date(a.gregorianDate||a.holidayDate)-new Date(b.gregorianDate||b.holidayDate)).slice(0,5);
};
const daysUntil = (d) => {
  const diff = Math.round((new Date(d)-new Date())/86400000);
  if (diff===0) return "Today"; if (diff===1) return "Tomorrow";
  return `in ${diff} days`;
};

/* ─── atoms ─── */
const Sk = ({h=14,w="100%"}) => (
  <div style={{height:h,width:w,borderRadius:4,background:"linear-gradient(90deg,#d4dbd9 25%,#e2e8e7 50%,#d4dbd9 75%)",backgroundSize:"200% 100%",animation:"skshimmer 1.3s infinite"}}/>
);
const Card = ({title,icon:Icon,children,style={}}) => (
  <div style={{background:"linear-gradient(145deg, #FFFFFF 0%, #F5F8F7 100%)",borderRadius:16,border:`1px solid ${BORDER}`,boxShadow:"0 4px 20px -2px rgba(0,50,40,0.06), 0 2px 6px -1px rgba(0,0,0,0.03)",overflow:"hidden",...style}}>
    {title&&<div style={{background:DARK,padding:"12px 18px",display:"flex",alignItems:"center",gap:8}}>
      {Icon&&<Icon size={16} color="rgba(255,255,255,0.85)"/>}
      <span style={{fontSize:13,fontWeight:700,color:"#fff",fontFamily:"Poppins,sans-serif"}}>{title}</span>
    </div>}
    <div style={{padding:18}}>{children}</div>
  </div>
);
const InfoRow = ({label,value,loading}) => (
  <div style={{display:"flex",gap:12,padding:"8px 0",borderBottom:`1px solid ${BORDER}`}}>
    <span style={{fontSize:12,color:MUTED,fontWeight:500,minWidth:130,flexShrink:0}}>{label}</span>
    {loading?<Sk h={12} w={120}/>:<span style={{fontSize:13,color:TEXT,fontWeight:600}}>{value||"—"}</span>}
  </div>
);
const KpiBox = ({label,value,color,bg,icon:Icon,loading}) => (
  <div style={{
    flex:1,
    background: "linear-gradient(145deg, #FFFFFF 0%, #F5F8F7 100%)",
    borderRadius:16,
    border:`1px solid ${BORDER}`,
    padding:"18px 20px",
    display:"flex",
    flexDirection:"column",
    gap:10,
    boxShadow:"0 4px 18px -2px rgba(0,50,40,0.05), 0 2px 6px -1px rgba(0,0,0,0.03)",
    transition:"transform 0.2s cubic-bezier(0.16, 1, 0.3, 1), box-shadow 0.2s ease",
  }}
  onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-3px)'; e.currentTarget.style.boxShadow = '0 12px 28px -4px rgba(0,50,40,0.12)'; }}
  onMouseLeave={e => { e.currentTarget.style.transform = 'none'; e.currentTarget.style.boxShadow = '0 4px 18px -2px rgba(0,50,40,0.05), 0 2px 6px -1px rgba(0,0,0,0.03)'; }}
  >
    <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
      <div style={{width:38,height:38,borderRadius:11,background:`${color}18`,border:`1px solid ${color}30`,display:"flex",alignItems:"center",justifyContent:"center"}}>
        <Icon size={19} color={color}/>
      </div>
    </div>
    {loading?<Sk h={28} w={60}/>:<div style={{fontSize:28,fontWeight:800,color:color||TEXT,fontFamily:"Poppins,sans-serif",letterSpacing:"-0.02em"}}>{value??0}</div>}
    <div style={{fontSize:11,fontWeight:700,color:MUTED,textTransform:"uppercase",letterSpacing:"0.04em"}}>{label}</div>
  </div>
);

/* ══ Main component ══ */
const DeptHeadDashboardPage = () => {
  const { isMobile, isTablet, r } = useResponsive();
  const { user } = useAuth();
  const empUuid  = user?.employee_uuid;

  const [myProfile,  setMyProfile]  = useState(null);
  const [deptStats,  setDeptStats]  = useState(null);
  const [deptEmps,   setDeptEmps]   = useState([]);
  const [pendingReqs,setPendingReqs]= useState([]);
  const [holidays,   setHolidays]   = useState([]);
  const [balance,    setBalance]    = useState(null);
  const [loading,    setLoading]    = useState(true);
  const [error,      setError]      = useState("");

  // Early return if no employee UUID
  if (!empUuid) {
    return (
      <div style={{fontFamily:"Poppins,sans-serif", padding:20}}>
        <Card>
          <div style={{ padding:40, textAlign:'center' }}>
            <AlertCircle size={48} color="#DC2626" style={{ margin:'0 auto 16px' }} />
            <h3 style={{ margin:0, fontSize:'1.2rem', color:TEXT }}>Employee Profile Not Found</h3>
            <p style={{ margin:'12px 0 0', color:MUTED, fontSize:'0.9rem' }}>
              Your employee profile is not properly configured. Please contact your administrator.
            </p>
          </div>
        </Card>
      </div>
    );
  }

  const load = useCallback(async () => {
    if (!empUuid) {
      setError("Employee UUID is missing. Please log in again.");
      setLoading(false);
      return;
    }
    setLoading(true); setError("");
    const year = new Date().getFullYear();

    try {
      const results = await Promise.allSettled([
        EmployeeDashboardApi.getEmployee(empUuid),       // 0 my profile
        EmployeeDashboardApi.getDeptStats(),              // 1 dept overview
        EmployeeDashboardApi.getDeptEmployees(),          // 2 dept members
        EmployeeDashboardApi.getDeptPending(),            // 3 pending leave
        EmployeeDashboardApi.getHolidays(year),          // 4 holidays
        EmployeeDashboardApi.getLeaveBalance(empUuid),   // 5 my balance
      ]);

      let hasCriticalError = false;
      const permissionErrors = [];

      if (results[0].status==="fulfilled") {
        const e = results[0].value?.data||{};
        setMyProfile({ ...e, _deptName:e.department_name||"", _positionTitle:e.position_title||"" });
      } else {
        console.error("Failed to load profile:", results[0].reason);
        setError(`Could not load your profile: ${results[0].reason?.message || "Unknown error"}`);
        hasCriticalError = true;
      }

      if (results[1].status==="fulfilled") {
        setDeptStats(results[1].value?.data);
      } else {
        console.error("Failed to load dept stats:", results[1].reason);
        if (results[1].reason?.message?.includes("permission")) {
          permissionErrors.push("Dashboard statistics (requires 'Dashboard' occupation)");
        }
      }

      if (results[2].status==="fulfilled") {
        setDeptEmps(results[2].value?.data||[]);
      } else {
        console.error("Failed to load dept employees:", results[2].reason);
        if (results[2].reason?.message?.includes("permission")) {
          permissionErrors.push("Department employees list (requires 'Employees - Overview' occupation)");
        }
      }

      if (results[3].status==="fulfilled") {
        setPendingReqs(results[3].value?.data||[]);
      } else {
        console.error("Failed to load pending requests:", results[3].reason);
        if (results[3].reason?.message?.includes("permission")) {
          permissionErrors.push("Pending leave requests (requires 'Leave - Manage Requests' occupation)");
        }
      }

      if (results[4].status==="fulfilled") {
        setHolidays(results[4].value?.data||[]);
      } else {
        console.error("Failed to load holidays:", results[4].reason);
      }

      if (results[5].status==="fulfilled") {
        setBalance(results[5].value?.data);
      } else {
        console.error("Failed to load leave balance:", results[5].reason);
      }

      // Set permission error message if needed
      if (permissionErrors.length > 0 && !hasCriticalError) {
        setError(
          `Some features are unavailable due to missing permissions:\n\n${permissionErrors.map(e => `• ${e}`).join('\n')}\n\nPlease contact your administrator to assign the required occupations.`
        );
      }
    } catch (err) {
      console.error("Unexpected error loading dashboard:", err);
      setError(`Failed to load dashboard: ${err.message}`);
    } finally {
      setLoading(false);
    }
  }, [empUuid]);

  useEffect(()=>{ load(); },[load]);

  const upcoming = upcomingHolidays(holidays);
  const fullName = myProfile
    ? [myProfile.title,myProfile.first_name,myProfile.middle_name,myProfile.last_name].filter(Boolean).join(" ")
    : "—";

  return (
    <div style={{fontFamily:"Poppins,sans-serif"}}>
      <style>{`@keyframes skshimmer{0%{background-position:200% 0}100%{background-position:-200% 0}}`}</style>

      {/* Header */}
      <div style={{background:DARK,borderRadius:12,padding:"18px 24px",color:"#fff",marginBottom:20,display:"flex",justifyContent:"space-between",alignItems:"center",boxShadow:"0 8px 24px rgba(0,0,0,0.12)"}}>
        <div>
          <h1 style={{margin:0,fontSize:22,fontWeight:700,color:"#fff"}}>Department Head Dashboard</h1>
          <p style={{margin:"3px 0 0",fontSize:12,color:"rgba(255,255,255,0.65)"}}>
            {deptStats?.department_name || "Your Department"} — Welcome, {(() => {
              const name = myProfile?.first_name || user?.username?.split(/[\s.]+/)[0] || "—";
              return name === "—" ? name : name.charAt(0).toUpperCase() + name.slice(1).toLowerCase();
            })()}
          </p>
        </div>
        <button onClick={load} style={{background:"rgba(255,255,255,0.12)",border:"1px solid rgba(255,255,255,0.25)",color:"#fff",padding:"8px 16px",borderRadius:8,fontSize:12,fontWeight:600,cursor:"pointer"}}>
          ↻ Refresh
        </button>
      </div>

      {error && (
        <div style={{padding:"12px 16px",borderRadius:8,marginBottom:16,background:"#fef2f2",border:"1px solid #fca5a5",color:"#991b1b",fontSize:13,display:"flex",alignItems:"flex-start",gap:8}}>
          <AlertCircle size={15} style={{flexShrink:0,marginTop:2}}/> 
          <div style={{whiteSpace:"pre-line",lineHeight:1.5}}>{error}</div>
        </div>
      )}

      {/* ── KPI Row ── */}
      <div style={{display:"flex",gap:12,marginBottom:20,flexWrap:"wrap"}}>
        <KpiBox label="Total Employees" value={deptStats?.total_employees}  color="#0F766E" icon={Users}        loading={loading}/>
        <KpiBox label="Present Today"   value={deptStats?.present_today}    color="#166534" icon={CheckCircle}  loading={loading}/>
        <KpiBox label="On Leave Today"  value={deptStats?.on_leave_today}   color="#1e40af" icon={CalendarDays} loading={loading}/>
        <KpiBox label="Absent Today"    value={deptStats?.absent_today}     color="#991b1b" icon={XCircle}      loading={loading}/>
        <KpiBox label="Pending Requests"value={deptStats?.pending_requests} color="#92400e" icon={AlertCircle} loading={loading}/>
      </div>

      {/* ── 3-column layout — stacks on tablet/mobile ── */}
      <div style={{display:"grid", gridTemplateColumns: isMobile ? "1fr" : isTablet ? "1fr" : "260px 1fr 280px", gap:r(16,14,12), alignItems:"start"}}>

        {/* LEFT — My Profile */}
        <div style={{display:"flex",flexDirection:"column",gap:14}}>
          <div style={{background:CARD_BG,borderRadius:12,border:`1px solid ${BORDER}`,padding:20,textAlign:"center"}}>
            <div style={{width:80,height:80,borderRadius:"50%",background:`linear-gradient(135deg,${DARK},${BRAND})`,display:"flex",alignItems:"center",justifyContent:"center",margin:"0 auto 12px",boxShadow:"0 4px 16px rgba(0,80,60,0.25)"}}>
              <User size={32} color="rgba(255,255,255,0.9)"/>
            </div>
            {loading?<><Sk h={16} w={140}/><div style={{marginTop:6}}/><Sk h={12} w={100}/></>:(
              <>
                <div style={{fontSize:15,fontWeight:700,color:TEXT,fontFamily:"Poppins,sans-serif"}}>{fullName}</div>
                <div style={{fontSize:11,color:MUTED,marginTop:3}}>{myProfile?._positionTitle||"—"}</div>
                <div style={{fontSize:10,color:MUTED,marginTop:1}}>{myProfile?._deptName||"—"}</div>
              </>
            )}
            <div style={{marginTop:10,background:DARK,color:"#fff",borderRadius:20,padding:"5px 14px",fontSize:11,fontWeight:600,display:"inline-block"}}>
              {loading?"…":`Head for: ${calcDuration(myProfile?.hire_date)}`}
            </div>
          </div>

          <Card title="My Profile" icon={User}>
            <InfoRow label="Mesob ID"     value={myProfile?.mesob_id}               loading={loading}/>
            <InfoRow label="Department"   value={myProfile?._deptName}              loading={loading}/>
            <InfoRow label="Position"     value={myProfile?._positionTitle}         loading={loading}/>
            <InfoRow label="Date Joined"  value={fmtDate(myProfile?.hire_date)}     loading={loading}/>
            <InfoRow label="Status"       value={myProfile?.status}                 loading={loading}/>
          </Card>

          <Card title="My Leave Balance" icon={CalendarDays}>
            {loading?<Sk h={80}/>:!balance?(
              <p style={{fontSize:12,color:MUTED,textAlign:"center",padding:"12px 0"}}>No balance data.</p>
            ):(
              <div style={{display:"flex",flexDirection:"column",gap:7}}>
                {[["Entitled",balance.entitledDays,"#166534","#dcfce7"],["Remaining",balance.remainingDays,BRAND,"#f0fdf4"],["Used",balance.usedDays,"#9a3412","#fff7ed"]].map(([l,v,tc,bg])=>(
                  <div key={l} style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"7px 10px",background:bg,borderRadius:8}}>
                    <span style={{fontSize:12,color:tc,fontWeight:500}}>{l}</span>
                    <span style={{fontSize:15,fontWeight:800,color:tc,fontFamily:"Poppins,sans-serif"}}>{v??"—"}</span>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>

        {/* CENTER — Dept employees + pending requests */}
        <div style={{display:"flex",flexDirection:"column",gap:14}}>
          <Card title={`Department Employees (${deptEmps.length})`} icon={Users}>
            {loading?<Sk h={120}/>:deptEmps.length===0?(
              <p style={{fontSize:12,color:MUTED,textAlign:"center",padding:"24px 0"}}>No employees found.</p>
            ):(
              <div style={{overflowX:"auto"}}>
                <table style={{width:"100%",borderCollapse:"collapse"}}>
                  <thead>
                    <tr style={{background:"#f9fafb"}}>
                      {["ID","Name","Position","Status"].map(h=>(
                        <th key={h} style={{padding:"8px 12px",textAlign:"left",fontSize:10,fontWeight:700,color:MUTED,textTransform:"uppercase",borderBottom:`1px solid ${BORDER}`}}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {deptEmps.map((e,i)=>(
                      <tr key={e.uuid} style={{borderBottom:`1px solid #f3f4f6`,background:i%2===0?"#fff":"#fafafa"}}>
                        <td style={{padding:"9px 12px",fontSize:11,color:MUTED,fontFamily:"monospace"}}>{e.mesob_id}</td>
                        <td style={{padding:"9px 12px",fontSize:13,fontWeight:600,color:TEXT}}>{[e.title,e.first_name,e.last_name].filter(Boolean).join(" ")}</td>
                        <td style={{padding:"9px 12px",fontSize:12,color:MUTED}}>{e.position_title||"—"}</td>
                        <td style={{padding:"9px 12px"}}>
                          <span style={{fontSize:10,fontWeight:700,color:"#166534",background:"#dcfce7",padding:"2px 8px",borderRadius:20}}>{e.status}</span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Card>

          <Card title={`Pending Leave Requests (${pendingReqs.length})`} icon={AlertCircle}>
            {loading?<Sk h={100}/>:pendingReqs.length===0?(
              <p style={{fontSize:12,color:MUTED,textAlign:"center",padding:"24px 0"}}>No pending requests.</p>
            ):(
              <div style={{display:"flex",flexDirection:"column",gap:8}}>
                {pendingReqs.map((r,i)=>{
                  const sc={PENDING:"#92400e",PENDING_DEPARTMENT:"#1e40af"};
                  const sb={PENDING:"#fef9c3",PENDING_DEPARTMENT:"#eff6ff"};
                  const c=sc[r.status]||"#374151", bg=sb[r.status]||"#f9fafb";
                  return (
                    <div key={r.uuid||i} style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"10px 14px",background:"#fff",borderRadius:8,border:`1px solid ${BORDER}`}}>
                      <div>
                        <div style={{fontSize:13,fontWeight:600,color:TEXT}}>{r.full_name||"Employee"}</div>
                        <div style={{fontSize:11,color:MUTED,marginTop:2}}>{r.leaveType} · {fmtDate(r.startDate)} – {fmtDate(r.endDate)} · {r.total_days} day{r.total_days!==1?"s":""}</div>
                        {r.reason&&<div style={{fontSize:11,color:MUTED,marginTop:1,fontStyle:"italic"}}>"{r.reason}"</div>}
                      </div>
                      <span style={{fontSize:10,fontWeight:700,color:c,background:bg,padding:"3px 10px",borderRadius:12,whiteSpace:"nowrap",border:`1px solid ${c}30`}}>
                        {r.status?.replace("_"," ")}
                      </span>
                    </div>
                  );
                })}
                <p style={{fontSize:11,color:MUTED,margin:"4px 0 0",textAlign:"right"}}>
                  Use the <strong>Leave</strong> menu to approve or reject requests.
                </p>
              </div>
            )}
          </Card>
        </div>

        {/* RIGHT — Holidays + Quick Actions */}
        <div style={{display:"flex",flexDirection:"column",gap:14}}>
          <Card title="Notice Board" icon={Bell}>
            <div style={{minHeight:56,display:"flex",alignItems:"center",justifyContent:"center"}}>
              <p style={{fontSize:12,color:MUTED,textAlign:"center",margin:0}}>No notices at this time.</p>
            </div>
          </Card>

          <Card title="Upcoming Holidays" icon={MapPin}>
            {loading?<Sk h={100}/>:upcoming.length===0?(
              <p style={{fontSize:12,color:MUTED,textAlign:"center",padding:"12px 0",margin:0}}>No upcoming holidays.</p>
            ):(
              <div style={{display:"flex",flexDirection:"column",gap:8}}>
                {upcoming.map(h=>{
                  const ds=h.gregorianDate||h.holidayDate||"";
                  return (
                    <div key={h.uuid} style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"9px 12px",background:"#fff",borderRadius:8,border:`1px solid ${BORDER}`}}>
                      <div>
                        <div style={{fontSize:12,fontWeight:600,color:TEXT}}>{h.name||h.holidayName}</div>
                        <div style={{fontSize:11,color:MUTED,marginTop:2}}>{fmtDate(ds)}</div>
                      </div>
                      <span style={{fontSize:10,fontWeight:700,color:BRAND,background:"#f0fdf4",padding:"3px 8px",borderRadius:12,border:"1px solid rgba(15,118,110,0.2)",whiteSpace:"nowrap"}}>
                        {daysUntil(ds)}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </Card>

          <Card title="Quick Actions" icon={Activity}>
            <div style={{display:"flex",flexDirection:"column",gap:8}}>
              {[
                {label:"Review Leave Requests", icon:CalendarDays, to:"/leave",   color:BRAND},
                {label:"View Department Attendance", icon:Clock,   to:"/attendance", color:"#0369a1"},
                {label:"Request HR Letter",    icon:FileText,      to:"/letters", color:"#7c3aed"},
                {label:"View Holidays",        icon:MapPin,        to:"/holidays",color:"#166534"},
              ].map(({label,icon:Icon,to,color})=>(
                <a key={to} href={to} style={{display:"flex",alignItems:"center",gap:10,padding:"10px 14px",background:"#fff",borderRadius:8,border:`1px solid ${BORDER}`,textDecoration:"none",transition:"box-shadow 0.15s"}}
                  onMouseEnter={e=>e.currentTarget.style.boxShadow="0 2px 8px rgba(0,0,0,0.08)"}
                  onMouseLeave={e=>e.currentTarget.style.boxShadow="none"}
                >
                  <div style={{width:30,height:30,borderRadius:8,background:`${color}15`,display:"flex",alignItems:"center",justifyContent:"center"}}>
                    <Icon size={15} color={color}/>
                  </div>
                  <span style={{fontSize:13,fontWeight:500,color:TEXT,flex:1}}>{label}</span>
                  <ChevronRight size={14} color={MUTED}/>
                </a>
              ))}
            </div>
          </Card>
        </div>

      </div>
    </div>
  );
};

export default DeptHeadDashboardPage;
