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

  const response = await fetch(`${API_BASE}${path}`, {
    headers,
    ...options,
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok)
    throw new Error(payload.message || payload.error || "Request failed");
  return payload;
}

export const EmployeeApi = {
  /* ── Employees ── */
  list: (params = {}) => {
    const q = new URLSearchParams();
    if (params.status) q.set("status", params.status);
    if (params.department_uuid) q.set("department_uuid", params.department_uuid);
    if (params.position_uuid) q.set("position_uuid", params.position_uuid);
    if (params.search) q.set("search", params.search);
    if (params.page) q.set("page", params.page);
    if (params.pageSize) q.set("pageSize", params.pageSize);
    const qs = q.toString();
    return request(`/employees${qs ? `?${qs}` : ""}`);
  },

  get: (uuid, signed = false) =>
    request(`/employees/${encodeURIComponent(uuid)}${signed ? "?signed=true" : ""}`),

  create: (body) =>
    request("/employees", { method: "POST", body: JSON.stringify(body) }),

  update: (uuid, body) =>
    request(`/employees/${encodeURIComponent(uuid)}`, {
      method: "PATCH",
      body: JSON.stringify(body),
    }),

  updateStatus: (uuid, status) =>
    request(`/employees/${encodeURIComponent(uuid)}/status`, {
      method: "PATCH",
      body: JSON.stringify({ status }),
    }),

  uploadPhoto: (uuid, file) => {
    const fd = new FormData();
    fd.append("photo", file);
    return request(`/employees/${encodeURIComponent(uuid)}/photo`, {
      method: "POST",
      body: fd,
    });
  },

  /* ── Documents ── */
  listDocuments: (uuid, signed = false) =>
    request(
      `/employees/${encodeURIComponent(uuid)}/documents${signed ? "?signed=true" : ""}`,
    ),

  addDocument: (uuid, files, metadata) => {
    const fd = new FormData();
    for (const f of files) fd.append("documents", f);
    if (metadata.doc_type) fd.append("doc_type", metadata.doc_type);
    if (metadata.id_number) fd.append("id_number", metadata.id_number);
    if (metadata.issue_date) fd.append("issue_date", metadata.issue_date);
    if (metadata.valid_until) fd.append("valid_until", metadata.valid_until);
    return request(`/employees/${encodeURIComponent(uuid)}/documents`, {
      method: "POST",
      body: fd,
    });
  },

  removeDocument: (uuid, docUuid) =>
    request(
      `/employees/${encodeURIComponent(uuid)}/documents/${encodeURIComponent(docUuid)}`,
      { method: "DELETE" },
    ),

  /* ── Draft ── */
  saveDraft: (uuid, stepCompleted, draftJson) =>
    request("/employees/draft", {
      method: "POST",
      body: JSON.stringify({ uuid, stepCompleted, draftJson }),
    }),

  getDraft: (uuid) => request(`/employees/draft/${encodeURIComponent(uuid)}`),

  /* ── Departments / Positions (for dropdowns) ── */
  listDepartments: () => request("/departments"),
  listPositions: (departmentUuid) =>
    request(
      `/positions${departmentUuid ? `?department_uuid=${encodeURIComponent(departmentUuid)}` : ""}`,
    ),
  
  /* ── Shift ── */
  getShift: (uuid) => request(`/employees/${encodeURIComponent(uuid)}/shift`),
  
  /* ── Search for Attendance ── */
  searchForAttendance: (query) => {
    const q = new URLSearchParams();
    if (query) q.set("q", query);
    return request(`/employees/search/attendance?${q.toString()}`);
  },
};
