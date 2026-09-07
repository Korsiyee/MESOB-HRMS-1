const API_BASE =
  (typeof import.meta !== 'undefined' && import.meta.env?.VITE_API_BASE) ||
  'http://localhost:5000/api';

async function request(path, options = {}) {
  const headers = { 'Content-Type':'application/json', ...(options.headers||{}) };
  const token = localStorage.getItem('authToken');
  if (token) headers['Authorization'] = `Bearer ${token}`;
  const res = await fetch(`${API_BASE}${path}`, { headers, ...options });
  const payload = await res.json().catch(()=>({}));
  if (!res.ok) throw new Error(payload.message||payload.error||'Request failed');
  return payload;
}

export const ShiftApi = {
  list:         ()              => request('/shifts'),
  get:          (uuid)          => request(`/shifts/${encodeURIComponent(uuid)}`),
  create:       (body)          => request('/shifts',{method:'POST',body:JSON.stringify(body)}),
  update:       (uuid,body)     => request(`/shifts/${encodeURIComponent(uuid)}`,{method:'PATCH',body:JSON.stringify(body)}),
  delete:       (uuid)          => request(`/shifts/${encodeURIComponent(uuid)}`,{method:'DELETE'}),
  assign:       (uuid,body)     => request(`/shifts/${encodeURIComponent(uuid)}/assign`,{method:'POST',body:JSON.stringify(body)}),
  getEmployees: (uuid)          => request(`/shifts/${encodeURIComponent(uuid)}/employees`),
  detectGaps:   (employeeUuid)  => request(`/shifts/gaps${employeeUuid?`?employee_uuid=${employeeUuid}`:''}`),
  getHistory:   (employeeUuid)  => request(`/shifts/employee/${encodeURIComponent(employeeUuid)}/history`),
};
