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

export const PolicyApi = {
  list:   ()                => request('/admin/policies'),
  get:    (leaveType)       => request(`/admin/policies/${encodeURIComponent(leaveType)}`),
  create: (body)            => request('/admin/policies', {method:'POST',body:JSON.stringify(body)}),
  update: (leaveType, body) => request(`/admin/policies/${encodeURIComponent(leaveType)}`,{method:'PATCH',body:JSON.stringify(body)}),
  delete: (leaveType)       => request(`/admin/policies/${encodeURIComponent(leaveType)}`,{method:'DELETE'}),
};
