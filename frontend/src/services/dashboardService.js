import api from './api';

export const dashboardService = {
  // Employee stats — GET /api/employees
  getEmployees: (params = {}) => api.get('/employees', { params }),

  // Departments — GET /api/departments
  getDepartments: () => api.get('/departments'),

  // Attendance — GET /api/attendance/admin/all
  getAllAttendance: (params = {}) => api.get('/attendance/admin/all', { params }),

  // Attendance analytics — trend over a date range
  getAttendanceTrend: (startDate, endDate) =>
    api.get('/attendance/analytics/trend', { params: { startDate, endDate } }),

  // Attendance analytics — today's summary counts
  getAttendanceSummary: (startDate, endDate) =>
    api.get('/attendance/analytics/summary', { params: { startDate, endDate } }),

  // Pending leave requests — GET /api/requests/pending
  getPendingRequests: () => api.get('/requests/pending'),

  // All leave requests (admin) — GET /api/requests/admin/all
  getAdminRequests: (params = {}) => api.get('/requests/admin/all', { params }),

  // Upcoming holidays — GET /api/holidays/range
  getUpcomingHolidays: (startDate, endDate) =>
    api.get('/holidays/range', { params: { startDate, endDate } }),

  // Audit logs — GET /api/logs
  getLogs: (params = {}) => api.get('/logs', { params }),

  // Leave balances for a specific employee
  getLeaveBalance: (uuid) => api.get(`/leave/balances/${uuid}`),

  // Aggregated leave balance for all employees (dashboard)
  getAggregatedLeaveBalance: () => api.get('/leave/balances/aggregated'),

  // Leave policies
  getPolicies: () => api.get('/admin/policies'),
};
