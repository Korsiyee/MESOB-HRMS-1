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

export const AccountApi = {
  listAccounts:  ()           => request('/accounts'),
  getAccount:    (uuid)       => request(`/accounts/${encodeURIComponent(uuid)}`),
  createAccount: (body)       => request('/accounts', { method:'POST', body:JSON.stringify(body) }),
  changeRole:    (uuid, role) => request(`/accounts/${encodeURIComponent(uuid)}/role`,   { method:'PATCH', body:JSON.stringify({ role }) }),
  changeStatus:  (uuid, status) => request(`/accounts/${encodeURIComponent(uuid)}/status`, { method:'PATCH', body:JSON.stringify({ status }) }),
  resetPassword: (uuid, newPassword) => request(`/accounts/${encodeURIComponent(uuid)}/reset-password`, { method:'PATCH', body:JSON.stringify({ new_password: newPassword }) }),
};
