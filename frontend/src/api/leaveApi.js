const API_BASE =
  (typeof import.meta !== "undefined" &&
    import.meta.env &&
    import.meta.env.VITE_API_BASE) ||
  "http://localhost:5000/api";

async function request(path, options = {}) {
  const isFormData =
    typeof FormData !== "undefined" && options.body instanceof FormData;
  const headers = { ...(options.headers || {}) };
  if (!isFormData) headers["Content-Type"] = "application/json";
  const token = localStorage.getItem("authToken");
  if (token) headers["Authorization"] = `Bearer ${token}`;
  const response = await fetch(`${API_BASE}${path}`, { headers, ...options });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(payload.message || payload.error || "Request failed");
  }
  return payload;
}

const buildRequestFormData = ({
  employee_uuid,
  leaveType,
  startDate,
  numberOfDays,
  reason,
  dailyPlan = [],
  documents = [],
}) => {
  const fd = new FormData();
  fd.append("employee_uuid", employee_uuid);
  fd.append("leaveType", leaveType);
  fd.append("startDate", startDate);
  fd.append("numberOfDays", String(numberOfDays));
  fd.append("reason", reason);
  fd.append("dailyPlan", JSON.stringify(dailyPlan));
  for (const file of documents) fd.append("documents", file);
  return fd;
};

export const LeaveApi = {
  /* ── Balances ── */
  getBalance: (uuid) =>
    request(`/leave/balances/${encodeURIComponent(uuid)}`),
  rebuildBalance: (uuid) =>
    request(`/leave/balances/${encodeURIComponent(uuid)}/rebuild`, { method: "POST" }),
  rebuildAll: () =>
    request("/leave/balances/rebuild-all", { method: "POST" }),

  /* ── Leave requests ── */
  previewDates: ({ startDate, numberOfDays, leaveType, employee_uuid }) =>
    request(
      `/requests/preview?startDate=${encodeURIComponent(startDate)}&numberOfDays=${encodeURIComponent(numberOfDays)}&leaveType=${encodeURIComponent(leaveType)}&personInfoUuid=${encodeURIComponent(employee_uuid || "")}`
    ),

  submitRequest: (body) =>
    request("/requests", {
      method: "POST",
      body:
        Array.isArray(body?.documents) && body.documents.length > 0
          ? buildRequestFormData(body)
          : JSON.stringify(body),
    }),

  getEmployeeRequests: (uuid, status = "") =>
    request(
      `/requests/employee/${encodeURIComponent(uuid)}${status ? `?status=${encodeURIComponent(status)}&` : "?"}_=${Date.now()}`
    ),

  getAdminRequests: (budgetYear = "") =>
    request(
      `/requests/admin/all${budgetYear ? `?budgetYear=${encodeURIComponent(budgetYear)}&` : "?"}_=${Date.now()}`
    ),

  getPendingRequests: () =>
    request(`/requests/pending?_=${Date.now()}`),

  updateRequest: (uuid, body) =>
    request(`/requests/${encodeURIComponent(uuid)}`, {
      method: "PATCH",
      body: JSON.stringify(body),
    }),

  shortenApprovedRequest: ({ uuid, newEndDate }) =>
    request(`/requests/${encodeURIComponent(uuid)}/shorten`, {
      method: "PATCH",
      body: JSON.stringify({ newEndDate }),
    }),

  decideRequest: ({ uuid, decision, department_head_id, rejectionReason, approvedDays }) =>
    request(`/requests/${encodeURIComponent(uuid)}/department-decision`, {
      method: "PATCH",
      body: JSON.stringify({ decision, department_head_id, rejectionReason, approvedDays }),
    }),

  cancelRequest: (uuid) =>
    request(`/requests/${encodeURIComponent(uuid)}/cancel`, {
      method: "PATCH",
    }),

  /* ── Request documents ── */
  getRequestDocuments: (uuid) =>
    request(`/requests/${encodeURIComponent(uuid)}/documents`),

  addRequestDocuments: (uuid, documents) => {
    const fd = new FormData();
    for (const file of documents || []) fd.append("documents", file);
    return request(`/requests/${encodeURIComponent(uuid)}/documents`, { method: "POST", body: fd });
  },

  replaceRequestDocument: (uuid, documentUuid, document) => {
    const fd = new FormData();
    fd.append("document", document);
    return request(
      `/requests/${encodeURIComponent(uuid)}/documents/${encodeURIComponent(documentUuid)}`,
      { method: "PUT", body: fd }
    );
  },

  deleteRequestDocument: (uuid, documentUuid) =>
    request(
      `/requests/${encodeURIComponent(uuid)}/documents/${encodeURIComponent(documentUuid)}`,
      { method: "DELETE" }
    ),

  getRequestDocumentContentUrl: (uuid, documentUuid) =>
    `${API_BASE}/requests/${encodeURIComponent(uuid)}/documents/${encodeURIComponent(documentUuid)}/content`,

  /* ── Policies ── */
  getPolicies: () => request("/admin/policies"),
  getPolicy:   (leaveType) => request(`/admin/policies/${encodeURIComponent(leaveType)}`),
  createPolicy: (body) =>
    request("/admin/policies", {
      method: "POST",
      body: JSON.stringify(body),
    }),
  updatePolicy: ({ leaveType, ...fields }) =>
    request(`/admin/policies/${encodeURIComponent(leaveType)}`, {
      method: "PATCH",
      body: JSON.stringify(fields),
    }),
  deletePolicy: (leaveType) =>
    request(`/admin/policies/${encodeURIComponent(leaveType)}`, {
      method: "DELETE",
    }),

  /* ── Holidays ── */
  getHolidaysByYear: (year) =>
    request(`/holidays/year/${encodeURIComponent(year)}`),
  getHolidaysInRange: ({ startDate, endDate }) =>
    request(`/holidays/range?startDate=${encodeURIComponent(startDate)}&endDate=${encodeURIComponent(endDate)}`),
  createHoliday: (body) =>
    request("/holidays", { method: "POST", body: JSON.stringify(body) }),
  updateHoliday: (uuid, body) =>
    request(`/holidays/item/${encodeURIComponent(uuid)}`, { method: "PATCH", body: JSON.stringify(body) }),
  deleteHoliday: (uuid) =>
    request(`/holidays/item/${encodeURIComponent(uuid)}`, { method: "DELETE" }),

  /* ── Sync ── */
  syncEmployee: (body, headers = {}) =>
    request("/sync", { method: "POST", headers, body: JSON.stringify(body) }),
};
