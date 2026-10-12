/**
 * Attendance Analytics Service
 * Provides aggregated data for the Attendance Overview Dashboard.
 */
const { executeQuery } = require("../utils/dbQuery");

/* ─── helpers ─── */
function defaultDateRange() {
  const end = new Date();
  const start = new Date();
  start.setDate(start.getDate() - 29);
  return {
    startDate: start.toISOString().slice(0, 10),
    endDate: end.toISOString().slice(0, 10),
  };
}

function pct(part, total) {
  if (!total) return "0.0";
  return ((part / total) * 100).toFixed(1);
}

/* ─── 1. Summary counts ─── */
async function getOverviewSummary({ startDate, endDate, departmentUuid } = {}) {
  const { startDate: sd, endDate: ed } = {
    ...defaultDateRange(),
    ...(startDate ? { startDate } : {}),
    ...(endDate ? { endDate } : {}),
  };

  const params = [sd, ed];
  let joinClause = "";
  let whereClause = "WHERE a.date BETWEEN ? AND ?";

  if (departmentUuid) {
    joinClause = `INNER JOIN Employees e ON e.uuid = a.employee_uuid
                  LEFT JOIN Positions p ON p.uuid = e.position_uuid`;
    whereClause += " AND (e.department_uuid = ? OR p.department_uuid = ?)";
    params.push(departmentUuid, departmentUuid);
  }

  const [rows] = await executeQuery(
    `SELECT a.status, COUNT(*) AS cnt
     FROM AttendanceSummary a
     ${joinClause}
     ${whereClause}
     GROUP BY a.status`,
    params
  );

  const counts = {
    PRESENT: 0, ABSENT: 0, LATE: 0,
    HALF_DAY: 0, LEAVE: 0, HOLIDAY: 0, WEEKEND: 0,
  };
  rows.forEach((r) => { if (counts[r.status] !== undefined) counts[r.status] = Number(r.cnt); });

  const total = Object.values(counts).reduce((a, b) => a + b, 0);
  const result = {};
  for (const [k, v] of Object.entries(counts)) {
    result[k] = { count: v, pct: pct(v, total) };
  }
  result.total = total;
  return result;
}

/* ─── 2. Trend data (daily present vs absent) ─── */
async function getAttendanceTrend({ startDate, endDate, groupBy = "day", departmentUuid } = {}) {
  const { startDate: sd, endDate: ed } = {
    ...defaultDateRange(),
    ...(startDate ? { startDate } : {}),
    ...(endDate ? { endDate } : {}),
  };

  const params = [sd, ed];
  let joinClause = "";
  let whereClause = "WHERE a.date BETWEEN ? AND ?";

  if (departmentUuid) {
    joinClause = `INNER JOIN Employees e ON e.uuid = a.employee_uuid
                  LEFT JOIN Positions p ON p.uuid = e.position_uuid`;
    whereClause += " AND (e.department_uuid = ? OR p.department_uuid = ?)";
    params.push(departmentUuid, departmentUuid);
  }

  const [rows] = await executeQuery(
    `SELECT
       DATE_FORMAT(a.date, '%Y-%m-%d') AS day,
       SUM(a.status IN ('PRESENT','LATE','HALF_DAY')) AS present,
       SUM(a.status = 'ABSENT') AS absent
     FROM AttendanceSummary a
     ${joinClause}
     ${whereClause}
     GROUP BY day
     ORDER BY day ASC`,
    params
  );

  return rows.map((r) => ({
    date: r.day,
    present: Number(r.present),
    absent: Number(r.absent),
  }));
}

/* ─── 3. Department-wise present % ─── */
async function getDepartmentStats({ startDate, endDate, departmentUuid } = {}) {
  const { startDate: sd, endDate: ed } = {
    ...defaultDateRange(),
    ...(startDate ? { startDate } : {}),
    ...(endDate ? { endDate } : {}),
  };

  const params = [sd, ed];
  let whereClause = "WHERE a.date BETWEEN ? AND ?";
  if (departmentUuid) {
    whereClause += " AND (d.uuid = ? OR e.department_uuid = ?)";
    params.push(departmentUuid, departmentUuid);
  }

  const [rows] = await executeQuery(
    `SELECT
       d.uuid AS dept_uuid,
       d.name AS dept_name,
       COUNT(a.uuid) AS total,
       SUM(a.status IN ('PRESENT','LATE','HALF_DAY')) AS present_count
     FROM AttendanceSummary a
     INNER JOIN Employees e ON e.uuid = a.employee_uuid
     INNER JOIN Departments d ON d.uuid = e.department_uuid
     ${whereClause}
     GROUP BY d.uuid, d.name
     ORDER BY present_count DESC
     LIMIT 10`,
    params
  );

  return rows.map((r) => ({
    dept_uuid: r.dept_uuid,
    department: r.dept_name,
    total: Number(r.total),
    present_count: Number(r.present_count),
    present_pct: pct(r.present_count, r.total),
  }));
}

/* ─── 4. Top employees by present days ─── */
async function getTopEmployees({ startDate, endDate, limit = 10, departmentUuid } = {}) {
  const { startDate: sd, endDate: ed } = {
    ...defaultDateRange(),
    ...(startDate ? { startDate } : {}),
    ...(endDate ? { endDate } : {}),
  };
  const safeLimit = Math.max(1, Math.min(100, parseInt(limit, 10) || 10));

  const params = [sd, ed];
  let whereClause = "WHERE a.date BETWEEN ? AND ?";
  if (departmentUuid) {
    whereClause += " AND (e.department_uuid = ? OR p.department_uuid = ?)";
    params.push(departmentUuid, departmentUuid);
  }

  const [rows] = await executeQuery(
    `SELECT
       e.uuid, e.mesob_id,
       CONCAT(e.first_name, ' ', e.last_name) AS full_name,
       d.name AS department,
       SUM(a.status IN ('PRESENT','LATE','HALF_DAY')) AS present_days
     FROM AttendanceSummary a
     INNER JOIN Employees e ON e.uuid = a.employee_uuid
     LEFT JOIN Positions p ON p.uuid = e.position_uuid
     LEFT JOIN Departments d ON d.uuid = COALESCE(e.department_uuid, p.department_uuid)
     ${whereClause}
     GROUP BY e.uuid, e.mesob_id, full_name, d.name
     ORDER BY present_days DESC
     LIMIT ${safeLimit}`,
    params
  );

  return rows.map((r) => ({
    employee_uuid: r.uuid,
    mesob_id: r.mesob_id,
    full_name: r.full_name,
    department: r.department || "—",
    present_days: Number(r.present_days),
  }));
}

/* ─── 5. Recent corrections ─── */
async function getRecentCorrections({ limit = 10, departmentUuid } = {}) {
  const safeLimit = Math.max(1, Math.min(100, parseInt(limit, 10) || 10));

  const params = [];
  let whereClause = "WHERE a.corrected_by_uuid IS NOT NULL";
  if (departmentUuid) {
    whereClause += " AND (e.department_uuid = ? OR p.department_uuid = ?)";
    params.push(departmentUuid, departmentUuid);
  }

  const [rows] = await executeQuery(
    `SELECT
       a.uuid, a.date, a.status AS new_status,
       CONCAT(e.first_name, ' ', e.last_name) AS employee_name,
       e.mesob_id,
       CONCAT(c.first_name, ' ', c.last_name) AS corrected_by_name,
       a.updated_at
     FROM AttendanceSummary a
     INNER JOIN Employees e ON e.uuid = a.employee_uuid
     LEFT JOIN Positions p ON p.uuid = e.position_uuid
     LEFT JOIN Employees c ON c.uuid = a.corrected_by_uuid
     ${whereClause}
     ORDER BY a.updated_at DESC
     LIMIT ${safeLimit}`,
    params
  );

  return rows.map((r) => ({
    uuid: r.uuid,
    date: r.date,
    full_name: r.employee_name,
    mesob_id: r.mesob_id,
    status: r.new_status,
    corrected_by_name: r.corrected_by_name || "Admin",
    corrected_at: r.updated_at,
  }));
}

/* ─── 6. Full admin records with pagination ─── */
async function getAttendanceRecords({
  departmentUuid, positionUuid, status, startDate, endDate,
  search, page = 1, pageSize = 10,
} = {}) {
  const { startDate: sd, endDate: ed } = {
    ...defaultDateRange(),
    ...(startDate ? { startDate } : {}),
    ...(endDate ? { endDate } : {}),
  };

  const params = [sd, ed];
  let where = "WHERE a.date BETWEEN ? AND ?";

  if (departmentUuid) { where += " AND (e.department_uuid = ? OR p.department_uuid = ?)"; params.push(departmentUuid, departmentUuid); }
  if (positionUuid) { where += " AND e.position_uuid = ?"; params.push(positionUuid); }
  if (status) { where += " AND a.status = ?"; params.push(status); }
  if (search) {
    where += " AND (e.first_name LIKE ? OR e.last_name LIKE ? OR e.mesob_id LIKE ?)";
    const like = `%${search}%`;
    params.push(like, like, like);
  }

  const safePage = Math.max(1, parseInt(page, 10) || 1);
  const safePageSize = Math.max(1, Math.min(200, parseInt(pageSize, 10) || 10));
  const offset = (safePage - 1) * safePageSize;

  const [countRows] = await executeQuery(
    `SELECT COUNT(*) AS total
     FROM AttendanceSummary a
     INNER JOIN Employees e ON e.uuid = a.employee_uuid
     LEFT JOIN Positions p ON p.uuid = e.position_uuid
     LEFT JOIN Departments d ON d.uuid = p.department_uuid
     ${where}`,
    params
  );
  const total = Number(countRows[0]?.total || 0);

  const [rows] = await executeQuery(
    `SELECT
       a.uuid, a.date, a.status,
       a.worked_hours, a.overtime_hours, a.missing_hours, a.late_minutes,
       e.uuid AS employee_uuid, e.mesob_id,
       CONCAT(e.first_name, ' ', e.last_name) AS full_name,
       d.name AS department,
       p.title AS position_title,
       s.name AS shift_name,
       l.check_in, l.check_out,
       CONCAT(c.first_name, ' ', c.last_name) AS corrected_by_name,
       a.updated_at AS corrected_at
     FROM AttendanceSummary a
     INNER JOIN Employees e ON e.uuid = a.employee_uuid
     LEFT JOIN Positions p ON p.uuid = e.position_uuid
     LEFT JOIN Departments d ON d.uuid = p.department_uuid
     LEFT JOIN ShiftDefinitions s ON s.uuid = a.shift_uuid
     LEFT JOIN AttendanceLogs l ON l.employee_uuid = a.employee_uuid AND l.date = a.date
     LEFT JOIN Employees c ON c.uuid = a.corrected_by_uuid
     ${where}
     ORDER BY a.date DESC, e.last_name ASC
     LIMIT ${safePageSize} OFFSET ${offset}`,
    params
  );

  return {
    records: rows,
    total,
    page: safePage,
    pageSize: safePageSize,
    totalPages: Math.ceil(total / safePageSize),
  };
}

module.exports = {
  getOverviewSummary,
  getAttendanceTrend,
  getDepartmentStats,
  getTopEmployees,
  getRecentCorrections,
  getAttendanceRecords,
};
