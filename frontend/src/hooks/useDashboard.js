import { useState, useEffect, useCallback } from 'react';
import { dashboardService } from '../services/dashboardService';

const today = new Date();
const todayStr = today.toISOString().slice(0, 10);
const in60Days = new Date(today.getTime() + 60 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);

// Last 7 days range for the attendance trend chart
const last7Start = new Date(today);
last7Start.setDate(last7Start.getDate() - 6);
const last7StartStr = last7Start.toISOString().slice(0, 10);

// Previous month start/end for employee delta calculation
const prevMonthEnd = new Date(today.getFullYear(), today.getMonth(), 0);
const prevMonthStart = new Date(today.getFullYear(), today.getMonth() - 1, 1);
const prevMonthEndStr = prevMonthEnd.toISOString().slice(0, 10);

export const useDashboard = () => {
  const [stats, setStats] = useState({
    totalEmployees: 0,
    onLeaveToday: 0,
    presentToday: 0,
    pendingApprovals: 0,
    newThisMonth: 0,
  });
  const [departments, setDepartments] = useState([]);
  const [attendanceData, setAttendanceData] = useState([]);
  const [recentActivity, setRecentActivity] = useState([]);
  const [upcomingHolidays, setUpcomingHolidays] = useState([]);
  const [leaveBalance, setLeaveBalance] = useState({ entitled: 0, used: 0, remaining: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchAll = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const results = await Promise.allSettled([
        dashboardService.getEmployees({ limit: 1000 }),           // 0 — full employee list
        dashboardService.getDepartments(),                         // 1 — departments
        dashboardService.getPendingRequests(),                     // 2 — pending leave count
        dashboardService.getAdminRequests({ limit: 1000 }),       // 3 — all requests (on-leave calc)
        dashboardService.getUpcomingHolidays(todayStr, in60Days), // 4 — holidays
        dashboardService.getLogs({ limit: 10 }),                  // 5 — recent audit logs
        dashboardService.getAttendanceTrend(last7StartStr, todayStr), // 6 — real trend data
        dashboardService.getAttendanceSummary(todayStr, todayStr), // 7 — today's summary
        dashboardService.getAggregatedLeaveBalance(),             // 8 — aggregated leave balance
      ]);

      const [empRes, deptRes, pendingRes, adminReqRes, holidayRes, logsRes, trendRes, summaryRes, balanceRes] = results;

      // ── Employees ──
      const employees = empRes.status === 'fulfilled' ? (empRes.value.data?.data || []) : [];
      const totalEmployees = employees.length;

      // New this month: hired in the current calendar month
      const monthStart = new Date(today.getFullYear(), today.getMonth(), 1).toISOString().slice(0, 10);
      const newThisMonth = employees.filter((e) => {
        const hd = e.hire_date?.slice(0, 10);
        return hd && hd >= monthStart && hd <= todayStr;
      }).length;

      // ── Pending approvals ──
      const pendingList = pendingRes.status === 'fulfilled' ? (pendingRes.value.data?.data || []) : [];
      const pendingApprovals = pendingList.length;

      // ── On leave today (from approved leave requests) ──
      const allRequests = adminReqRes.status === 'fulfilled' ? (adminReqRes.value.data?.data || []) : [];
      const onLeaveToday = allRequests.filter((r) => {
        if (r.status !== 'APPROVED') return false;
        const start = r.startDate?.slice(0, 10);
        const end = r.endDate?.slice(0, 10);
        return start && end && todayStr >= start && todayStr <= end;
      }).length;

      // ── Present today (from analytics summary) ──
      let presentToday = 0;
      if (summaryRes.status === 'fulfilled') {
        const s = summaryRes.value.data?.data || {};
        presentToday = (s?.PRESENT?.count || 0) + (s?.LATE?.count || 0) + (s?.HALF_DAY?.count || 0);
      } else if (totalEmployees > 0) {
        // Fallback: estimate from known on-leave count (no random)
        presentToday = Math.max(0, totalEmployees - onLeaveToday);
      }

      setStats({ totalEmployees, onLeaveToday, presentToday, pendingApprovals, newThisMonth });

      // ── Departments ──
      // listEmployees returns department_name as a flat column (not dept.name)
      const deptMap = {};
      employees.forEach((emp) => {
        const name = emp.department_name || emp.department?.name || emp.departmentName || null;
        if (name) deptMap[name] = (deptMap[name] || 0) + 1;
      });
      const deptData = Object.entries(deptMap)
        .map(([name, count]) => ({ name, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 8);
      setDepartments(deptData);

      // ── Attendance chart — use real trend data from analytics endpoint ──
      if (trendRes.status === 'fulfilled') {
        const trendRows = trendRes.value.data?.data || [];

        // Build a map from the real data
        const trendMap = {};
        trendRows.forEach((r) => { trendMap[r.date] = r; });

        // Fill all 7 days (show 0 for days with no data — never use random)
        const last7 = Array.from({ length: 7 }, (_, i) => {
          const d = new Date(today);
          d.setDate(d.getDate() - (6 - i));
          return d.toISOString().slice(0, 10);
        });

        const chartData = last7.map((date) => {
          const row = trendMap[date];
          const label = new Date(date).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
          return {
            date: label,
            Present: row ? Number(row.present) : 0,
            Absent: row ? Number(row.absent) : 0,
          };
        });
        setAttendanceData(chartData);
      } else {
        // Analytics endpoint failed — show empty chart (real zeros, no fake data)
        const last7 = Array.from({ length: 7 }, (_, i) => {
          const d = new Date(today);
          d.setDate(d.getDate() - (6 - i));
          return d.toISOString().slice(0, 10);
        });
        setAttendanceData(last7.map((date) => ({
          date: new Date(date).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' }),
          Present: 0,
          Absent: 0,
        })));
      }

      // ── Recent activity ──
      let logs = [];
      if (logsRes.status === 'fulfilled') {
        const response = logsRes.value.data;
        const rawLogs = response?.data?.logs || [];
        
        // Transform logs to match component expectations
        logs = rawLogs.map(log => ({
          ...log,
          actorName: log.actor_name || log.actorName,
          entityName: log.entity_name || log.entityName || log.entity_uuid || log.entityUuid,
          createdAt: log.created_at || log.createdAt,
          entityType: log.entity_type || log.entityType,
        }));
      }
      setRecentActivity(logs.slice(0, 6));

      // ── Upcoming holidays ──
      const holidays = holidayRes.status === 'fulfilled' ? (holidayRes.value.data?.data || []) : [];
      setUpcomingHolidays(holidays.filter((h) => h.is_active !== false).slice(0, 10));

      // ── Leave balance summary — use aggregated data from backend ──
      if (balanceRes.status === 'fulfilled') {
        const balanceData = balanceRes.value.data?.data || {};
        setLeaveBalance({
          entitled: balanceData.entitled || 0,
          used: balanceData.used || 0,
          remaining: balanceData.remaining || 0,
        });
      } else {
        // Fallback: compute from requests if aggregated endpoint fails
        const approvedRequests = allRequests.filter((r) => r.status === 'APPROVED');
        const usedDays = Math.round(approvedRequests.reduce((s, r) => s + Number(r.total_days || 0), 0));
        const totalDays = Math.round(allRequests.reduce((s, r) => s + Number(r.total_days || 0), 0));
        const entitled = totalDays || usedDays;
        setLeaveBalance({
          entitled,
          used: usedDays,
          remaining: Math.max(0, entitled - usedDays),
        });
      }

    } catch (err) {
      setError(err.message || 'Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  return { stats, departments, attendanceData, recentActivity, upcomingHolidays, leaveBalance, loading, error, refetch: fetchAll };
};
