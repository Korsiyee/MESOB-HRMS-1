import React from 'react';
import { useAuth } from '../context/AuthContext';
import { usePermission } from '../hooks/usePermission';
import { Users, CalendarOff, Clock, AlertCircle } from 'lucide-react';
import KpiCard from '../components/dashboard/KpiCard';
import AttendanceChart from '../components/dashboard/AttendanceChart';
import DepartmentChart from '../components/dashboard/DepartmentChart';
import LeaveBalanceDonut from '../components/dashboard/LeaveBalanceDonut';
import RecentActivity from '../components/dashboard/RecentActivity';
import QuickActions from '../components/dashboard/QuickActions';
import HolidayStrip from '../components/dashboard/HolidayStrip';
import { useDashboard } from '../hooks/useDashboard';
import { useResponsive } from '../hooks/useResponsive';
import EmployeeDashboardPage from './EmployeeDashboardPage';
import DeptHeadDashboardPage from './DeptHeadDashboardPage';

const MiniSparkline = ({ color = '#14B8A6' }) => (
  <svg width="80" height="28" viewBox="0 0 80 28" fill="none" style={{ opacity: 0.7 }}>
    <polyline points="0,22 13,18 26,20 39,10 52,14 65,6 80,10"
      stroke={color} strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

const DonutRing = ({ pct = 80 }) => {
  const r = 18, c = 2 * Math.PI * r;
  return (
    <svg width="48" height="48" viewBox="0 0 48 48">
      <circle cx="24" cy="24" r={r} fill="none" stroke="#E5E7EB" strokeWidth="5" />
      <circle cx="24" cy="24" r={r} fill="none" stroke="#14B8A6" strokeWidth="5"
        strokeDasharray={`${(pct / 100) * c} ${c}`}
        strokeLinecap="round" transform="rotate(-90 24 24)" />
      <text x="24" y="28" textAnchor="middle" fontSize="10" fontWeight="700" fill="#0F766E">{pct}%</text>
    </svg>
  );
};

const DashboardPage = () => {
  const { user } = useAuth();
  
  // Primary: Use dashboard value from static RBAC (provided at login)
  const dashboard = user?.dashboard || localStorage.getItem('userDashboard');
  
  // Route based on dashboard value from backend
  if (dashboard === 'employee') {
    return <EmployeeDashboardPage />;
  }
  
  if (dashboard === 'department') {
    return <DeptHeadDashboardPage />;
  }
  
  // dashboard === 'hr' or default for HR_OFFICER, HR_ADMIN, SUPER_ADMIN
  // Fallback to permission-based routing for backward compatibility
  const canViewOrgStats = usePermission('dashboard', 'view_organization');
  const canViewDeptStats = usePermission('dashboard', 'view_department');

  // If no org-wide view, check for department view
  if (!canViewOrgStats && canViewDeptStats) {
    return <DeptHeadDashboardPage />;
  }

  // If neither org nor dept view, show employee dashboard
  if (!canViewOrgStats && !canViewDeptStats) {
    return <EmployeeDashboardPage />;
  }

  // Admin / HR with dashboard.view_organization → analytics dashboard
  const { stats, departments, attendanceData, recentActivity, upcomingHolidays, leaveBalance, loading, error, refetch } = useDashboard();

  const attendancePct = stats.totalEmployees > 0
    ? Math.round((stats.presentToday / stats.totalEmployees) * 100)
    : 80;

  const { isMobile, isTablet, r } = useResponsive();

  // Palette for consistency
  const C = {
    headerBg: "linear-gradient(135deg, #0c1e1c 0%, #1e3a37 100%)",
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>

      {/* ── Page Header ── */}
      <div style={{
        background: C.headerBg, borderRadius: 14,
        padding: r("20px 24px", "16px 20px", "14px 16px"),
        display: "flex", alignItems: "center", justifyContent: "space-between",
        marginBottom: 20, boxShadow: "0 4px 20px rgba(0,0,0,0.18)", flexWrap: "wrap", gap: 8,
      }}>
        <div>
          <h1 style={{ margin: 0, fontSize: r("1.2rem","1.1rem","1rem"), fontWeight: 700, color: "#E8F0EE" }}>
            Dashboard
          </h1>
          <p style={{ margin: "3px 0 0", fontSize: "0.75rem", color: "rgba(232,240,238,0.6)" }}>
            Overview of system metrics and activities
          </p>
        </div>
      </div>

      {/* Error banner */}
      {error && (
        <div style={{
          display: 'flex', alignItems: 'center', gap: 10,
          padding: '12px 16px', borderRadius: 12,
          border: '1px solid #FDE68A', background: '#FFFBEB',
          fontSize: 13, color: '#92400E',
        }}>
          <AlertCircle size={15} style={{ flexShrink: 0 }} />
          <span style={{ flex: 1 }}>{error}</span>
          <button onClick={refetch} style={{ fontSize: 12, fontWeight: 600, color: '#0F766E', background: 'none', border: 'none', cursor: 'pointer', textDecoration: 'underline' }}>
            Retry
          </button>
        </div>
      )}

      {/* ── KPI Cards — already auto-fit, works on all screens ── */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: isMobile ? 'repeat(2, 1fr)' : 'repeat(auto-fit, minmax(220px, 1fr))',
        gap: r(16, 12, 10),
      }}>
        <KpiCard icon={Users}       label="Total Employees"   value={loading ? null : stats.totalEmployees.toLocaleString()} sub={loading ? null : stats.newThisMonth > 0 ? `+${stats.newThisMonth} hired this month` : 'No new hires this month'} color="teal"    loading={loading} extra={<MiniSparkline color="#14B8A6" />} />
        <KpiCard icon={CalendarOff} label="On Leave Today"    value={loading ? null : stats.onLeaveToday}                    sub={`${stats.totalEmployees > 0 ? ((stats.onLeaveToday / stats.totalEmployees) * 100).toFixed(1) : 0}% of total`}                                  color="amber"   loading={loading} />
        <KpiCard icon={Clock}       label="Present Today"     value={loading ? null : stats.presentToday}                    sub={`${attendancePct}% attendance`}                                                                                                                 color="emerald" loading={loading} extra={<DonutRing pct={attendancePct} />} />
        <KpiCard icon={AlertCircle} label="Pending Approvals" value={loading ? null : stats.pendingApprovals}                sub="Leave requests awaiting"                                                                                                                        color="blue"    loading={loading} />
      </div>

      {/* ── Main grid — stacks on tablet/mobile ── */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: (isMobile || isTablet) ? '1fr' : 'minmax(0, 1fr) 360px',
        gap: 20,
      }}>
        {/* Left — Attendance + Recent Activity + Holidays */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20, minWidth: 0 }}>
          <AttendanceChart data={attendanceData} loading={loading} />
          <RecentActivity  data={recentActivity}  loading={loading} />
          <HolidayStrip    holidays={upcomingHolidays} loading={loading} />
        </div>

        {/* Right — Department + Leave Balance + Quick Actions */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20, minWidth: 0 }}>
          <DepartmentChart   data={departments}    loading={loading} />
          <LeaveBalanceDonut balance={leaveBalance} loading={loading} />
          <QuickActions />
        </div>
      </div>
    </div>
  );
};

export default DashboardPage;
