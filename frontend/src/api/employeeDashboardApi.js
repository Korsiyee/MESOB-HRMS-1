const API_BASE =
  (typeof import.meta !== "undefined" && import.meta.env?.VITE_API_BASE) || "/api";

async function request(path, options = {}) {
  const headers = { "Content-Type": "application/json", ...(options.headers || {}) };
  const token = localStorage.getItem("authToken");
  if (token) headers["Authorization"] = `Bearer ${token}`;
  const res = await fetch(`${API_BASE}${path}`, { headers, ...options });
  const payload = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(payload.message || "Request failed");
  return payload;
}

const qs = (p) => {
  const pairs = Object.entries(p || {}).filter(([, v]) => v != null && v !== "");
  return pairs.length ? "?" + new URLSearchParams(pairs).toString() : "";
};

export const EmployeeDashboardApi = {
  getEmployee:       (uuid) => request(`/employees/${encodeURIComponent(uuid)}/dashboard`),
  getLeaveBalance:   (uuid) => request(`/leave/balances/${encodeURIComponent(uuid)}`),
  getAttendanceSummary: (uuid, p) =>
    request(`/attendance/${encodeURIComponent(uuid)}/summary${qs(p)}`),
  getAttendanceLogs: (uuid, p) =>
    request(`/attendance/${encodeURIComponent(uuid)}${qs(p)}`),
  getLeaveRequests:  (uuid) =>
    request(`/requests/employee/${encodeURIComponent(uuid)}`),
  getHolidays:       (year) => request(`/holidays/year/${year}`),

  // Department Head
  getDeptStats:      ()     => request("/employees/dept-head/stats"),
  getDeptEmployees:  ()     => request("/employees/dept-head/employees"),
  getDeptPending:    ()     => request("/requests/pending"),
};
