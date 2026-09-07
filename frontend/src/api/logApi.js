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

export const LogApi = {
  listLogs: (params = {}) => {
    // backend uses 'limit' not 'pageSize', rename here
    const { pageSize, ...rest } = params;
    const merged = { ...rest, ...(pageSize ? { limit: pageSize } : {}) };
    const q = new URLSearchParams(Object.fromEntries(Object.entries(merged).filter(([,v]) => v !== '' && v !== null && v !== undefined))).toString();
    return request(`/logs${q ? '?' + q : ''}`);
  },
  getLog:     (uuid) => request(`/logs/${encodeURIComponent(uuid)}`),
  getActions: ()     => request('/logs/actions'),
};
