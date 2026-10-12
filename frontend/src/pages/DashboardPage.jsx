import React, { useState } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { usePermission } from '../hooks/usePermission';
import {
  Users,
  CalendarOff,
  Clock,
  AlertCircle,
  RefreshCw,
  Sparkles,
  CheckCircle2,
  Calendar as CalendarIcon,
} from 'lucide-react';
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

const MiniSparkline = ({ color = '#0F766E' }) => (
  <svg width="96" height="32" viewBox="0 0 96 32" fill="none">
    <defs>
      <linearGradient id="miniSparkGrad" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stopColor={color} stopOpacity={0.28} />
        <stop offset="100%" stopColor={color} stopOpacity={0.0} />
      </linearGradient>
    </defs>
    <path
      d="M0,26 Q16,22 26,24 T52,12 T74,16 T96,6 L96,32 L0,32 Z"
      fill="url(#miniSparkGrad)"
    />
    <path
      d="M0,26 Q16,22 26,24 T52,12 T74,16 T96,6"
      stroke={color}
      strokeWidth="2.2"
      strokeLinecap="round"
      strokeLinejoin="round"
      fill="none"
    />
    <circle cx="94" cy="7" r="3" fill={color} />
  </svg>
);

const DonutRing = ({ pct = 80 }) => {
  const r = 16;
  const c = 2 * Math.PI * r;
  const clamped = Math.min(100, Math.max(0, pct));
  const strokeDash = `${(clamped / 100) * c} ${c}`;

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
      <svg width="42" height="42" viewBox="0 0 42 42">
        <circle cx="21" cy="21" r={r} fill="none" stroke="rgba(5, 150, 105, 0.12)" strokeWidth="4" />
        <circle
          cx="21"
          cy="21"
          r={r}
          fill="none"
          stroke="#059669"
          strokeWidth="4"
          strokeDasharray={strokeDash}
          strokeLinecap="round"
          transform="rotate(-90 21 21)"
        />
        <text
          x="21"
          y="25"
          textAnchor="middle"
          fontSize="10"
          fontWeight="800"
          fill="#047857"
          fontFamily="Poppins"
        >
          {pct}%
        </text>
      </svg>
    </div>
  );
};

const LeaveRatioBar = ({ pct = 0 }) => (
  <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: 4 }}>
    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.67rem', color: '#B45309', fontWeight: 600 }}>
      <span>Leave Share</span>
      <span>{pct}%</span>
    </div>
    <div style={{ height: 5, borderRadius: 99, background: 'rgba(234, 88, 12, 0.12)', width: '100%', overflow: 'hidden' }}>
      <div
        style={{
          width: `${Math.min(100, Math.max(0, pct))}%`,
          height: '100%',
          background: '#EA580C',
          borderRadius: 99,
          transition: 'width 0.4s ease',
        }}
      />
    </div>
  </div>
);

const ApprovalsBadge = ({ count = 0 }) => (
  <div
    style={{
      display: 'inline-flex',
      alignItems: 'center',
      gap: 5,
      padding: '3px 8px',
      borderRadius: 99,
      background: count > 0 ? 'rgba(37, 99, 235, 0.1)' : 'rgba(5, 150, 105, 0.1)',
      border: `1px solid ${count > 0 ? 'rgba(37, 99, 235, 0.2)' : 'rgba(5, 150, 105, 0.2)'}`,
      fontSize: '0.68rem',
      fontWeight: 700,
      color: count > 0 ? '#1D4ED8' : '#047857',
    }}
  >
    <span
      style={{
        width: 6,
        height: 6,
        borderRadius: '50%',
        background: count > 0 ? '#2563EB' : '#059669',
        boxShadow: `0 0 6px ${count > 0 ? '#2563EB' : '#059669'}`,
      }}
    />
    <span>{count > 0 ? `${count} Action Required` : 'All Approved'}</span>
  </div>
);

const DashboardPage = () => {
  const { user } = useAuth();
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Hook calls must be unconditional
  const { allowed: canViewOrgStats } = usePermission('dashboard', 'view_organization');
  const { allowed: canViewDeptStats } = usePermission('dashboard', 'view_department');
  const {
    stats,
    departments,
    attendanceData,
    recentActivity,
    upcomingHolidays,
    leaveBalance,
    loading,
    error,
    refetch,
  } = useDashboard();
  const { isMobile, isTablet, r } = useResponsive();

  const handleManualRefresh = async () => {
    setIsRefreshing(true);
    try {
      await refetch();
    } finally {
      setTimeout(() => setIsRefreshing(false), 500);
    }
  };

  // Role / Dashboard branching
  const dashboard = user?.dashboard || localStorage.getItem('userDashboard');
  const roleCode = user?.role?.code || (typeof user?.role === 'string' ? user?.role : null);

  // Employee has no access to main Home module - redirect strictly to personal space
  if (roleCode === 'EMPLOYEE' || dashboard === 'employee') {
    return <Navigate to="/my-dashboard" replace />;
  }

  // Department Head sees department-level analytics
  if (roleCode === 'DEPT_HEAD' || roleCode === 'DEPARTMENT_HEAD' || roleCode === 'MANAGER' || dashboard === 'department') {
    return <DeptHeadDashboardPage />;
  }

  const isAdminRole = roleCode === 'SUPER_ADMIN' || roleCode === 'HR_ADMIN' || roleCode === 'HR_OFFICER' || dashboard === 'admin';
  if (!isAdminRole) {
    if (!canViewOrgStats && canViewDeptStats) return <DeptHeadDashboardPage />;
    return <Navigate to="/my-dashboard" replace />;
  }

  const attendancePct =
    stats.totalEmployees > 0
      ? Math.round((stats.presentToday / stats.totalEmployees) * 100)
      : 80;

  const leavePct =
    stats.totalEmployees > 0
      ? Number(((stats.onLeaveToday / stats.totalEmployees) * 100).toFixed(1))
      : 0;

  const currentHour = new Date().getHours();
  const greeting =
    currentHour < 12
      ? 'Good morning'
      : currentHour < 17
      ? 'Good afternoon'
      : 'Good evening';

  const userName = (() => {
    const name = user?.first_name || user?.username?.split(/[\s.]+/)[0] || 'Administrator';
    return name.charAt(0).toUpperCase() + name.slice(1).toLowerCase();
  })();

  const todayFormatted = new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24, paddingBottom: 24 }}>
      {/* ── Executive Hero Banner ── */}
      <div
        style={{
          background: 'linear-gradient(135deg, #0c1e1c 0%, #152d2a 60%, #1e3a37 100%)',
          borderRadius: 20,
          padding: r('24px 28px', '20px 24px', '16px 20px'),
          boxShadow: '0 8px 28px -4px rgba(0, 40, 30, 0.28), inset 0 1px 0 rgba(255, 255, 255, 0.1)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: 16,
          position: 'relative',
          overflow: 'hidden',
          border: '1px solid rgba(255, 255, 255, 0.08)',
        }}
      >
        {/* Ambient mesh accents */}
        <div
          style={{
            position: 'absolute',
            top: -40,
            right: 80,
            width: 180,
            height: 180,
            borderRadius: '50%',
            background: 'radial-gradient(circle, rgba(20, 184, 166, 0.25) 0%, transparent 70%)',
            pointerEvents: 'none',
          }}
        />
        <div
          style={{
            position: 'absolute',
            bottom: -30,
            left: 200,
            width: 140,
            height: 140,
            borderRadius: '50%',
            background: 'radial-gradient(circle, rgba(15, 118, 110, 0.2) 0%, transparent 70%)',
            pointerEvents: 'none',
          }}
        />

        {/* Left: Greeting & Subtitle */}
        <div style={{ position: 'relative', zIndex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
            <span
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 5,
                background: 'rgba(20, 184, 166, 0.18)',
                border: '1px solid rgba(20, 184, 166, 0.35)',
                color: '#2DD4BF',
                padding: '3px 9px',
                borderRadius: 99,
                fontSize: '0.68rem',
                fontWeight: 700,
                letterSpacing: '0.04em',
                textTransform: 'uppercase',
              }}
            >
              <Sparkles size={11} />
              HR Command Center
            </span>
            <span
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 5,
                color: 'rgba(232, 240, 238, 0.65)',
                fontSize: '0.72rem',
                fontWeight: 500,
              }}
            >
              • {user?.role?.name || user?.role?.code || (typeof user?.role === 'string' ? user?.role : 'Admin')}
            </span>
          </div>

          <h1
            style={{
              margin: 0,
              fontSize: r('1.5rem', '1.3rem', '1.15rem'),
              fontWeight: 800,
              color: '#FFFFFF',
              fontFamily: 'Poppins, sans-serif',
              letterSpacing: '-0.02em',
            }}
          >
            {greeting}, {userName}
          </h1>
          <p
            style={{
              margin: '4px 0 0',
              fontSize: '0.78rem',
              color: 'rgba(232, 240, 238, 0.72)',
              fontWeight: 400,
            }}
          >
            Here is your real-time workforce analytics and organizational overview.
          </p>
        </div>

        {/* Right: Date Badge & Refresh Action */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 12,
            position: 'relative',
            zIndex: 1,
            flexWrap: 'wrap',
          }}
        >
          {/* Live Date Pill */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              background: 'rgba(255, 255, 255, 0.08)',
              border: '1px solid rgba(255, 255, 255, 0.14)',
              padding: '7px 14px',
              borderRadius: 12,
              backdropFilter: 'blur(8px)',
              color: '#E8F0EE',
              fontSize: '0.76rem',
              fontWeight: 600,
            }}
          >
            <CalendarIcon size={14} color="#2DD4BF" />
            <span>{todayFormatted}</span>
          </div>

          {/* Refresh Button */}
          <button
            onClick={handleManualRefresh}
            disabled={loading || isRefreshing}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 7,
              background: 'rgba(20, 184, 166, 0.2)',
              border: '1px solid rgba(20, 184, 166, 0.35)',
              padding: '7px 14px',
              borderRadius: 12,
              color: '#FFFFFF',
              fontSize: '0.76rem',
              fontWeight: 700,
              cursor: loading || isRefreshing ? 'not-allowed' : 'pointer',
              transition: 'all 0.2s ease',
              backdropFilter: 'blur(8px)',
            }}
            onMouseEnter={(e) => {
              if (!loading && !isRefreshing) {
                e.currentTarget.style.background = 'rgba(20, 184, 166, 0.35)';
                e.currentTarget.style.transform = 'translateY(-1px)';
              }
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'rgba(20, 184, 166, 0.2)';
              e.currentTarget.style.transform = 'none';
            }}
          >
            <RefreshCw
              size={13}
              style={{
                animation: loading || isRefreshing ? 'spin 1s linear infinite' : 'none',
              }}
            />
            <span>{loading || isRefreshing ? 'Syncing...' : 'Sync Data'}</span>
          </button>
        </div>
      </div>

      {/* Error banner */}
      {error && (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 12,
            padding: '14px 18px',
            borderRadius: 14,
            border: '1px solid #FDE68A',
            background: 'linear-gradient(135deg, #FFFBEB 0%, #FEF3C7 100%)',
            fontSize: 13,
            color: '#92400E',
            boxShadow: '0 4px 12px rgba(217, 119, 6, 0.08)',
          }}
        >
          <AlertCircle size={18} style={{ flexShrink: 0, color: '#D97706' }} />
          <span style={{ flex: 1, fontWeight: 500 }}>{error}</span>
          <button
            onClick={refetch}
            style={{
              fontSize: 12,
              fontWeight: 700,
              color: '#0F766E',
              background: '#FFFFFF',
              border: '1px solid rgba(15, 118, 110, 0.2)',
              borderRadius: 8,
              padding: '4px 10px',
              cursor: 'pointer',
            }}
          >
            Retry Connection
          </button>
        </div>
      )}

      {/* ── KPI Cards Grid ── */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: isMobile
            ? '1fr'
            : isTablet
            ? 'repeat(2, 1fr)'
            : 'repeat(auto-fit, minmax(230px, 1fr))',
          gap: r(18, 14, 12),
        }}
      >
        <KpiCard
          icon={Users}
          label="Total Employees"
          value={loading ? null : stats.totalEmployees.toLocaleString()}
          sub={
            loading
              ? null
              : stats.newThisMonth > 0
              ? `+${stats.newThisMonth} hired this month`
              : 'Workforce active headcount'
          }
          color="teal"
          loading={loading}
          extra={<MiniSparkline color="#0F766E" />}
        />

        <KpiCard
          icon={CalendarOff}
          label="On Leave Today"
          value={loading ? null : stats.onLeaveToday}
          sub={`${leavePct}% of total staff on scheduled leave`}
          color="amber"
          loading={loading}
          extra={<LeaveRatioBar pct={leavePct} />}
        />

        <KpiCard
          icon={Clock}
          label="Present Today"
          value={loading ? null : stats.presentToday}
          sub={`${attendancePct}% overall attendance`}
          color="emerald"
          loading={loading}
          extra={<DonutRing pct={attendancePct} />}
        />

        <KpiCard
          icon={AlertCircle}
          label="Pending Approvals"
          value={loading ? null : stats.pendingApprovals}
          sub="Leave requests awaiting supervisor review"
          color="blue"
          loading={loading}
          extra={<ApprovalsBadge count={stats.pendingApprovals} />}
        />
      </div>

      {/* ── Main Analytical Grid ── */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: isMobile || isTablet ? '1fr' : 'minmax(0, 1.4fr) minmax(340px, 1fr)',
          gap: 22,
        }}
      >
        {/* Left Column — Attendance + Recent Activity + Holidays */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 22, minWidth: 0 }}>
          <AttendanceChart data={attendanceData} loading={loading} />
          <RecentActivity data={recentActivity} loading={loading} />
          <HolidayStrip holidays={upcomingHolidays} loading={loading} />
        </div>

        {/* Right Column — Department + Leave Balance + Quick Actions */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 22, minWidth: 0 }}>
          <DepartmentChart data={departments} loading={loading} />
          <LeaveBalanceDonut balance={leaveBalance} loading={loading} />
          <QuickActions />
        </div>
      </div>
    </div>
  );
};

export default DashboardPage;
