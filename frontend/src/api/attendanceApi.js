const API_BASE =
  (typeof import.meta !== 'undefined' && import.meta.env?.VITE_API_BASE) ||
  'http://localhost:5000/api';

async function request(path, options = {}) {
  const headers = { 'Content-Type': 'application/json', ...(options.headers || {}) };
  const token = localStorage.getItem('authToken');
  if (token) headers['Authorization'] = `Bearer ${token}`;
  const res = await fetch(`${API_BASE}${path}`, { headers, ...options });
  const payload = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(payload.message || payload.error || 'Request failed');
  return payload;
}

const q = (params) => {
  const s = new URLSearchParams(Object.fromEntries(Object.entries(params).filter(([, v]) => v != null && v !== '')));
  return s.toString() ? '?' + s.toString() : '';
};

export const AttendanceApi = {
  // Analytics
  getOverviewSummary:  (p = {}) => request(`/attendance/analytics/summary${q(p)}`),
  getTrend:            (p = {}) => request(`/attendance/analytics/trend${q(p)}`),
  getDepartmentStats:  (p = {}) => request(`/attendance/analytics/departments${q(p)}`),
  getTopEmployees:     (p = {}) => request(`/attendance/analytics/top-employees${q(p)}`),
  getRecentCorrections:(p = {}) => request(`/attendance/analytics/corrections${q(p)}`),

  // Admin CRUD
  getAllAttendance: (p = {}) => request(`/attendance/admin/all${q(p)}`),
  logAttendance:   (body)    => request('/attendance/log',  { method: 'POST', body: JSON.stringify(body) }),
  createAttendance:(body)    => request('/attendance',      { method: 'POST', body: JSON.stringify(body) }),
  correctAttendance:(uuid, status) => request(`/attendance/${encodeURIComponent(uuid)}/correct`, { method: 'PATCH', body: JSON.stringify({ status }) }),
  deleteAttendance:(uuid)    => request(`/attendance/${encodeURIComponent(uuid)}`, { method: 'DELETE' }),

  // Self-Service Punch (All authenticated users)
  selfPunch:        (body)   => request('/attendance/self-punch', { method: 'POST', body: JSON.stringify(body) }),
  getTodayPunch:    ()       => request('/attendance/self-punch/today'),

  // Per-employee
  getTodayStatus:       (uuid)       => request(`/attendance/${encodeURIComponent(uuid)}/today-status`),
  getEmployeeAttendance:(uuid, p = {}) => request(`/attendance/${encodeURIComponent(uuid)}${q(p)}`),
  getEmployeeSummary:   (uuid, p = {}) => request(`/attendance/${encodeURIComponent(uuid)}/summary${q(p)}`),
};
