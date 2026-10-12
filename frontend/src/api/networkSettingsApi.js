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

export const NetworkSettingsApi = {
  list:   ()           => request('/network-settings'),
  get:    (uuid)       => request(`/network-settings/${encodeURIComponent(uuid)}`),
  create: (body)       => request('/network-settings', {method:'POST', body:JSON.stringify(body)}),
  update: (uuid, body) => request(`/network-settings/${encodeURIComponent(uuid)}`, {method:'PATCH', body:JSON.stringify(body)}),
  toggle: (uuid)       => request(`/network-settings/${encodeURIComponent(uuid)}/toggle`, {method:'PATCH'}),
  delete: (uuid)       => request(`/network-settings/${encodeURIComponent(uuid)}`, {method:'DELETE'}),
};
