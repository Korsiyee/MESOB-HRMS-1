import React, { useState, useEffect, useCallback } from "react";
import { useAuth } from "../context/AuthContext";
import { EmployeeDashboardApi } from "../api/employeeDashboardApi";
import LetterBadge from "../components/LetterBadge";
import Avatar from "../components/common/Avatar";
import { useResponsive } from "../hooks/useResponsive";
import {
  User, Briefcase, Calendar, Clock, CheckCircle,
  AlertCircle, Bell, Star, MapPin, Phone, Mail,
  CreditCard, Building, CalendarDays, Activity,
} from "lucide-react";

/* ─── brand / theme tokens (match system) ─── */
const BRAND   = "#0F766E";
const DARK    = "#1e3a37";
const BG      = "#C5CECC";
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
  const start = new Date(hireDate);
  const now   = new Date();
  let years  = now.getFullYear() - start.getFullYear();
  let months = now.getMonth()    - start.getMonth();
  if (months < 0) { years--; months += 12; }
  const parts = [];
  if (years  > 0) parts.push(`${years} yr${years  !== 1 ? "s" : ""}`);
  if (months > 0) parts.push(`${months} mo`);
  return parts.length ? parts.join(" ") : "< 1 month";
};

const upcomingHolidays = (holidays) => {
  const today = new Date();
  today.setHours(0,0,0,0);
  return (holidays || [])
    .filter(h => {
      const d = new Date(h.gregorianDate || h.holidayDate || h.date || "");
      return d >= today;
    })
    .sort((a,b) => new Date(a.gregorianDate||a.holidayDate||a.date) - new Date(b.gregorianDate||b.holidayDate||b.date))
    .slice(0, 5);
};

const daysUntil = (dateStr) => {
  const d = new Date(dateStr);
  d.setHours(0,0,0,0);
  const today = new Date(); today.setHours(0,0,0,0);
  const diff = Math.round((d - today) / 86400000);
  if (diff === 0) return "Today";
  if (diff === 1) return "Tomorrow";
  return `in ${diff} days`;
};

/* ─── skeleton ─── */
const Sk = ({ h=14, w="100%", r=4 }) => (
  <div style={{ height:h, width:w, borderRadius:r, background:"linear-gradient(90deg,#d4dbd9 25%,#e2e8e7 50%,#d4dbd9 75%)", backgroundSize:"200% 100%", animation:"skshimmer 1.3s infinite" }} />
);

/* ─── section card ─── */
const Card = ({ title, icon: Icon, children, style={} }) => (
  <div style={{ background:CARD_BG, borderRadius:12, border:`1px solid ${BORDER}`, overflow:"hidden", ...style }}>
    {title && (
      <div style={{ background:DARK, padding:"10px 16px", display:"flex", alignItems:"center", gap:8 }}>
        {Icon && <Icon size={15} color="rgba(255,255,255,0.8)"/>}
        <span style={{ fontSize:13, fontWeight:700, color:"#fff", fontFamily:"Poppins,sans-serif" }}>{title}</span>
      </div>
    )}
    <div style={{ padding:16 }}>{children}</div>
  </div>
);

/* ─── info row ─── */
const InfoRow = ({ label, value, loading }) => (
  <div style={{ display:"flex", gap:12, padding:"7px 0", borderBottom:`1px solid ${BORDER}` }}>
    <span style={{ fontSize:12, color:MUTED, fontWeight:500, minWidth:130, flexShrink:0 }}>{label}</span>
    {loading ? <Sk h={12} w={120}/> : <span style={{ fontSize:13, color:TEXT, fontWeight:500 }}>{value||"—"}</span>}
  </div>
);

/* ─── stat box ─── */
const StatBox = ({ label, value, sub, color="#0F766E", loading }) => (
  <div style={{ flex:1, background:"#fff", borderRadius:10, border:`1px solid ${BORDER}`, padding:"12px 14px", textAlign:"center" }}>
    {loading ? <Sk h={24} w={40} r={6}/> : <div style={{ fontSize:22, fontWeight:800, color, fontFamily:"Poppins,sans-serif" }}>{value??0}</div>}
    <div style={{ fontSize:10, fontWeight:700, color:MUTED, textTransform:"uppercase", marginTop:3 }}>{label}</div>
    {sub && <div style={{ fontSize:10, color:"#6b7280", marginTop:1 }}>{sub}</div>}
  </div>
);

/* ══════════════════════════════════════════════════════════
   LEFT PANEL
══════════════════════════════════════════════════════════ */
const LeftPanel = ({ emp, balance, attSummary, leaveReqs, loading }) => {
  const fullName = emp ? [emp.title, emp.first_name, emp.middle_name, emp.last_name].filter(Boolean).join(" ") : "—";
  const thisMonth = attSummary?.summary?.PRESENT ?? 0;
  const totalDays = Object.values(attSummary?.summary || {}).reduce((a,b) => a+b, 0);

  return (
    <div style={{ display:"flex", flexDirection:"column", gap:14 }}>
      {/* Profile card */}
      <div style={{ background:CARD_BG, borderRadius:12, border:`1px solid ${BORDER}`, padding:20, textAlign:"center" }}>
        {/* Avatar */}
        <div style={{ display: "flex", justifyContent: "center", marginBottom: 12 }}>
          <Avatar
            imageUrl={emp?.profile_photo_url}
            name={fullName}
            size={88}
            borderColor="rgba(255,255,255,0.5)"
            borderWidth="3px"
            style={{ boxShadow: "0 4px 16px rgba(0,80,60,0.25)" }}
          />
        </div>

        {loading ? <><Sk h={18} w={140} r={4}/><div style={{marginTop:6}}/><Sk h={13} w={100} r={4}/></> : (
          <>
            <div style={{ fontSize:16, fontWeight:700, color:TEXT, fontFamily:"Poppins,sans-serif" }}>{fullName}</div>
            <div style={{ fontSize:12, color:MUTED, marginTop:3 }}>{emp?._positionTitle || "—"}</div>
            <div style={{ fontSize:11, color:MUTED, marginTop:1 }}>{emp?._deptName || "—"}</div>
          </>
        )}

        {/* Duration badge */}
        <div style={{ marginTop:10, background:DARK, color:"#fff", borderRadius:20, padding:"5px 14px", fontSize:11, fontWeight:600, display:"inline-block" }}>
          {loading ? "…" : `At work for: ${calcDuration(emp?.hire_date)}`}
        </div>
      </div>

      {/* Quick stats */}
      <div style={{ display:"flex", gap:8 }}>
        <StatBox label="Attendance" value={`${thisMonth}/${totalDays||"—"}`} sub="This month" color={BRAND} loading={loading}/>
        <StatBox label="Leave Days" value={balance?.remainingDays ?? "—"} sub="Remaining" color="#0369a1" loading={loading}/>
        <StatBox label="Requests" value={leaveReqs?.length ?? 0} sub="Total" color="#7c3aed" loading={loading}/>
      </div>

      {/* Leave breakdown */}
      <Card title="Leave Balance" icon={CalendarDays}>
        {loading ? <Sk h={80}/> : !balance ? (
          <p style={{ fontSize:12, color:MUTED, textAlign:"center", padding:"12px 0" }}>No balance data found.</p>
        ) : (
          <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
            {[
              ["Entitled",       balance.entitledDays,  "#166534", "#dcfce7"],
              ["Carried Forward",balance.carriedForward,"#1e40af", "#eff6ff"],
              ["Used",           balance.usedDays,      "#9a3412", "#fff7ed"],
              ["Remaining",      balance.remainingDays, BRAND,     "#f0fdf4"],
            ].map(([lbl, val, tc, bg]) => (
              <div key={lbl} style={{ display:"flex", justifyContent:"space-between", alignItems:"center", padding:"8px 12px", background:bg, borderRadius:8, border:`1px solid ${BORDER}` }}>
                <span style={{ fontSize:12, fontWeight:500, color:tc }}>{lbl}</span>
                <span style={{ fontSize:16, fontWeight:800, color:tc, fontFamily:"Poppins,sans-serif" }}>{val ?? "—"}</span>
              </div>
            ))}
          </div>
        )}
      </Card>

      {/* Attendance breakdown */}
      <Card title="Attendance Summary" icon={Clock}>
        {loading ? <Sk h={100}/> : (
          <div style={{ display:"flex", flexWrap:"wrap", gap:6 }}>
            {[["Present","#166534","#dcfce7","PRESENT"],["Late","#9a3412","#fff7ed","LATE"],["Absent","#991b1b","#fee2e2","ABSENT"],["Leave","#1e40af","#eff6ff","LEAVE"]].map(([lbl,tc,bg,key])=>(
              <div key={key} style={{ flex:"1 1 45%", background:bg, borderRadius:8, padding:"8px 10px", textAlign:"center" }}>
                <div style={{ fontSize:18, fontWeight:800, color:tc }}>{attSummary?.summary?.[key]??0}</div>
                <div style={{ fontSize:10, fontWeight:600, color:tc, textTransform:"uppercase" }}>{lbl}</div>
              </div>
            ))}
          </div>
        )}
      </Card>

      {/* Letter Badge */}
      <LetterBadge />
    </div>
  );
};

/* ══════════════════════════════════════════════════════════
   CENTER PANEL
══════════════════════════════════════════════════════════ */
const CenterPanel = ({ emp, loading }) => {
  const fullName = emp
    ? [emp.title, emp.first_name, emp.middle_name, emp.last_name].filter(Boolean).join(" ")
    : "—";

  return (
    <div style={{ display:"flex", flexDirection:"column", gap:14 }}>
      {/* Personal Information */}
      <Card title="Personal Details" icon={User}>
        <InfoRow label="Full Name"    value={fullName}                        loading={loading}/>
        <InfoRow label="Mother Name"  value={emp?.mother_name}                loading={loading}/>
        <InfoRow label="Gender"       value={emp?.gender}                     loading={loading}/>
        <InfoRow label="Date of Birth"value={fmtDate(emp?.date_of_birth)}     loading={loading}/>
        <InfoRow label="Nationality"  value={emp?.nationality}                loading={loading}/>
        <InfoRow label="TIN Number"   value={emp?.tin_number}                 loading={loading}/>
        {emp?.addresses?.[0] && (
          <InfoRow label="Address" value={[emp.addresses[0].kebele, emp.addresses[0].woreda, emp.addresses[0].region].filter(Boolean).join(", ")} loading={loading}/>
        )}
        {emp?.addresses?.[0]?.phone_primary && (
          <InfoRow label="Phone" value={emp.addresses[0].phone_primary} loading={loading}/>
        )}
        {emp?.addresses?.[0]?.email && (
          <InfoRow label="Email" value={emp.addresses[0].email} loading={loading}/>
        )}
      </Card>

      {/* Employment Information */}
      <Card title="Employment Details" icon={Briefcase}>
        <InfoRow label="Mesob ID"      value={emp?.mesob_id}                  loading={loading}/>
        <InfoRow label="Department"    value={emp?._deptName}                 loading={loading}/>
        <InfoRow label="Position"      value={emp?._positionTitle}            loading={loading}/>
        <InfoRow label="Date Joined"   value={fmtDate(emp?.hire_date)}        loading={loading}/>
        <InfoRow label="Duration"      value={calcDuration(emp?.hire_date)}   loading={loading}/>
        <InfoRow label="Status"        value={emp?.status}                    loading={loading}/>
        <InfoRow label="Nationality"   value={emp?.nationality}               loading={loading}/>
      </Card>

      {/* Bank Information */}
      <Card title="Bank Information" icon={CreditCard}>
        <InfoRow label="Bank Name"     value={emp?.bank_name}                 loading={loading}/>
        <InfoRow label="Account Number"value={emp?.bank_account_number ? `•••• ${String(emp.bank_account_number).slice(-4)}` : "—"} loading={loading}/>
        <InfoRow label="Pension Code"  value={emp?.pension_code}              loading={loading}/>
      </Card>
    </div>
  );
};

/* ══════════════════════════════════════════════════════════
   RIGHT PANEL
══════════════════════════════════════════════════════════ */
const RightPanel = ({ holidays, leaveReqs, attLogs, loading }) => {
  const upcoming = upcomingHolidays(holidays);

  const recentActivity = [
    ...(attLogs || []).slice(0, 3).map(l => ({
      type:"attendance", text:`Check-in recorded`,
      date: l.date ? fmtDate(l.date) : "—", icon:Clock, color:"#166534", bg:"#dcfce7",
    })),
    ...(leaveReqs || []).slice(0, 3).map(r => ({
      type:"leave", text:`${r.leaveType||"Leave"} request — ${r.status}`,
      date: fmtDate(r.startDate), icon:Calendar, color:"#1e40af", bg:"#eff6ff",
    })),
  ].sort((a,b) => new Date(b.date) - new Date(a.date)).slice(0, 5);

  return (
    <div style={{ display:"flex", flexDirection:"column", gap:14 }}>
      {/* Notice Board */}
      <Card title="Notice Board" icon={Bell}>
        {loading ? <Sk h={60}/> : (
          <div style={{ minHeight:60, display:"flex", alignItems:"center", justifyContent:"center" }}>
            <p style={{ fontSize:12, color:MUTED, textAlign:"center", margin:0 }}>No notices at this time.</p>
          </div>
        )}
      </Card>

      {/* Upcoming Holidays */}
      <Card title="Upcoming Holidays" icon={MapPin}>
        {loading ? <Sk h={100}/> : upcoming.length === 0 ? (
          <p style={{ fontSize:12, color:MUTED, textAlign:"center", padding:"12px 0", margin:0 }}>No upcoming holidays.</p>
        ) : (
          <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
            {upcoming.map(h => {
              const dateStr = h.gregorianDate || h.holidayDate || h.date || "";
              return (
                <div key={h.uuid} style={{ display:"flex", justifyContent:"space-between", alignItems:"center", padding:"9px 12px", background:"#fff", borderRadius:8, border:`1px solid ${BORDER}` }}>
                  <div>
                    <div style={{ fontSize:12, fontWeight:600, color:TEXT }}>{h.name || h.holidayName}</div>
                    <div style={{ fontSize:11, color:MUTED, marginTop:2 }}>{fmtDate(dateStr)}</div>
                  </div>
                  <span style={{ fontSize:10, fontWeight:700, color:BRAND, background:"#f0fdf4", padding:"3px 8px", borderRadius:12, border:`1px solid rgba(15,118,110,0.2)`, whiteSpace:"nowrap" }}>
                    {daysUntil(dateStr)}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </Card>

      {/* Recent Activity */}
      <Card title="Recent Activity" icon={Activity}>
        {loading ? <Sk h={120}/> : recentActivity.length === 0 ? (
          <p style={{ fontSize:12, color:MUTED, textAlign:"center", padding:"12px 0", margin:0 }}>No recent activity.</p>
        ) : (
          <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
            {recentActivity.map((a, i) => {
              const Icon = a.icon;
              return (
                <div key={i} style={{ display:"flex", alignItems:"flex-start", gap:10, padding:"8px 0", borderBottom: i < recentActivity.length-1 ? `1px solid ${BORDER}` : "none" }}>
                  <div style={{ width:28, height:28, borderRadius:8, background:a.bg, display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0, marginTop:1 }}>
                    <Icon size={14} color={a.color}/>
                  </div>
                  <div style={{ flex:1, minWidth:0 }}>
                    <div style={{ fontSize:12, fontWeight:500, color:TEXT, lineHeight:1.4 }}>{a.text}</div>
                    <div style={{ fontSize:10, color:MUTED, marginTop:2 }}>{a.date}</div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </Card>

      {/* Leave Requests */}
      <Card title="My Leave Requests" icon={CalendarDays}>
        {loading ? <Sk h={80}/> : !leaveReqs?.length ? (
          <p style={{ fontSize:12, color:MUTED, textAlign:"center", padding:"12px 0", margin:0 }}>No leave requests found.</p>
        ) : (
          <div style={{ display:"flex", flexDirection:"column", gap:6 }}>
            {leaveReqs.slice(0,4).map((r,i) => {
              const SC = { APPROVED:"#166534", PENDING:"#92400e", REJECTED:"#991b1b", PENDING_DEPARTMENT:"#1e40af" };
              const SB = { APPROVED:"#dcfce7", PENDING:"#fef9c3", REJECTED:"#fee2e2", PENDING_DEPARTMENT:"#eff6ff" };
              const c  = SC[r.status] || "#374151";
              const bg = SB[r.status] || "#f9fafb";
              return (
                <div key={r.uuid||i} style={{ display:"flex", justifyContent:"space-between", alignItems:"center", padding:"8px 10px", background:"#fff", borderRadius:8, border:`1px solid ${BORDER}` }}>
                  <div>
                    <div style={{ fontSize:12, fontWeight:600, color:TEXT }}>{r.leaveType||"Leave"}</div>
                    <div style={{ fontSize:10, color:MUTED, marginTop:1 }}>{fmtDate(r.startDate)} → {fmtDate(r.endDate)}</div>
                  </div>
                  <span style={{ fontSize:10, fontWeight:700, color:c, background:bg, padding:"3px 9px", borderRadius:12, whiteSpace:"nowrap" }}>
                    {r.status?.replace("_"," ")}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </Card>
    </div>
  );
};

/* ══════════════════════════════════════════════════════════
   ROOT PAGE
══════════════════════════════════════════════════════════ */
const EmployeeDashboardPage = () => {
  const { user } = useAuth();
  const empUuid = user?.employee_uuid;
  const { isMobile, isTablet, r } = useResponsive();

  const [emp,       setEmp]       = useState(null);
  const [balance,   setBalance]   = useState(null);
  const [attSum,    setAttSum]    = useState(null);
  const [attLogs,   setAttLogs]   = useState([]);
  const [leaveReqs, setLeaveReqs] = useState([]);
  const [holidays,  setHolidays]  = useState([]);
  const [loading,   setLoading]   = useState(true);
  const [error,     setError]     = useState("");

  const load = useCallback(async () => {
    if (!empUuid) return;
    setLoading(true);
    setError("");

    const year = new Date().getFullYear();
    const now  = new Date();
    const monthStart = `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,"0")}-01`;
    const monthEnd   = now.toISOString().slice(0,10);

    const results = await Promise.allSettled([
      EmployeeDashboardApi.getEmployee(empUuid),
      EmployeeDashboardApi.getLeaveBalance(empUuid),
      EmployeeDashboardApi.getAttendanceSummary(empUuid, { startDate:monthStart, endDate:monthEnd }),
      EmployeeDashboardApi.getAttendanceLogs(empUuid, { startDate:monthStart, endDate:monthEnd, limit:10 }),
      EmployeeDashboardApi.getLeaveRequests(empUuid),
      EmployeeDashboardApi.getHolidays(year),
    ]);

    const [empR, balR, attSumR, attLogR, leaveR, holR] = results;

    if (empR.status === "fulfilled") {
      const e = empR.value?.data || {};
      // Enrich with dept/position from embedded data if available
      setEmp({
        ...e,
        _deptName:      e.department_name || e.department?.name || "",
        _positionTitle: e.position_title  || e.position?.title  || "",
      });
    } else {
      setError("Could not load your employee profile.");
    }

    if (balR.status    === "fulfilled") setBalance(balR.value?.data);
    if (attSumR.status === "fulfilled") setAttSum(attSumR.value?.data);
    if (attLogR.status === "fulfilled") setAttLogs(attLogR.value?.data || []);
    if (leaveR.status  === "fulfilled") setLeaveReqs(leaveR.value?.data || []);
    if (holR.status    === "fulfilled") setHolidays(holR.value?.data || []);

    setLoading(false);
  }, [empUuid]);

  useEffect(() => { load(); }, [load]);

  return (
    <div style={{ fontFamily:"Poppins,sans-serif" }}>
      <style>{`@keyframes skshimmer{0%{background-position:200% 0}100%{background-position:-200% 0}}`}</style>

      {/* Page header */}
      <div style={{ background:DARK, borderRadius:12, padding: r("18px 24px","16px 20px","14px 16px"), color:"#fff", marginBottom:20, display:"flex", justifyContent:"space-between", alignItems:"center", boxShadow:"0 8px 24px rgba(0,0,0,0.12)", flexWrap:"wrap", gap:10 }}>
        <div>
          <h1 style={{ margin:0, fontSize:22, fontWeight:700, color:"#fff" }}>My Dashboard</h1>
          <p style={{ margin:"3px 0 0", fontSize:12, color:"rgba(255,255,255,0.65)" }}>
            Welcome back, {emp?.first_name || user?.username || "—"}
          </p>
        </div>
        <button onClick={load} style={{ background:"rgba(255,255,255,0.12)", border:"1px solid rgba(255,255,255,0.25)", color:"#fff", padding:"8px 16px", borderRadius:8, fontSize:12, fontWeight:600, cursor:"pointer" }}>
          ↻ Refresh
        </button>
      </div>

      {error && (
        <div style={{ padding:"12px 16px", borderRadius:8, marginBottom:16, background:"#fef2f2", border:"1px solid #fca5a5", color:"#991b1b", fontSize:13, display:"flex", alignItems:"center", gap:8 }}>
          <AlertCircle size={15}/> {error}
        </div>
      )}

      {/* 3-column layout — stacks on tablet/mobile */}
      <div style={{
        display: "grid",
        gridTemplateColumns: isMobile ? "1fr" : isTablet ? "1fr" : "260px 1fr 280px",
        gap: r(16, 14, 12),
        alignItems: "start",
      }}>
        <LeftPanel   emp={emp} balance={balance} attSummary={attSum} leaveReqs={leaveReqs} loading={loading}/>
        <CenterPanel emp={emp} loading={loading}/>
        {/* Hide right panel on mobile to avoid clutter — content is accessible via scroll */}
        {!isMobile && (
          <RightPanel holidays={holidays} leaveReqs={leaveReqs} attLogs={attLogs} loading={loading}/>
        )}
      </div>
    </div>
  );
};

export default EmployeeDashboardPage;
