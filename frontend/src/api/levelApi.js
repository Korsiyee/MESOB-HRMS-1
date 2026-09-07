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

export const LevelApi = {
  /**
   * List all levels
   * @param {Object} options - Query parameters
   * @param {boolean} options.includeInactive - Include inactive levels
   * @param {boolean} options.includeCurrentVersion - Include current version data
   */
  list(options = {}) {
    const params = new URLSearchParams();
    if (options.includeInactive) params.append('include_inactive', 'true');
    if (options.includeCurrentVersion) params.append('include_current_version', 'true');
    
    const queryString = params.toString();
    const url = `/levels${queryString ? `?${queryString}` : ''}`;
    return request(url);
  },

  /**
   * Get a single level by UUID
   * @param {string} uuid - Level UUID
   * @param {Object} options - Query parameters
   */
  get(uuid, options = {}) {
    const params = new URLSearchParams();
    if (options.includeVersions !== false) params.append('include_versions', 'true');
    if (options.includeEmployees) params.append('include_employees', 'true');
    
    const queryString = params.toString();
    const url = `/levels/${uuid}${queryString ? `?${queryString}` : ''}`;
    return request(url);
  },

  /**
   * Create a new level
   * @param {Object} data - Level data
   */
  create(data) {
    return request('/levels', { method: 'POST', body: JSON.stringify(data) });
  },

  /**
   * Update a level
   * @param {string} uuid - Level UUID
   * @param {Object} data - Updated level data
   */
  update(uuid, data) {
    return request(`/levels/${encodeURIComponent(uuid)}`, { method: 'PATCH', body: JSON.stringify(data) });
  },

  /**
   * Delete a level
   * @param {string} uuid - Level UUID
   */
  delete(uuid) {
    return request(`/levels/${encodeURIComponent(uuid)}`, { method: 'DELETE' });
  },

  /**
   * Create a new version for a level (salary revision)
   * @param {string} uuid - Level UUID
   * @param {Object} data - Version data
   */
  createVersion(uuid, data) {
    return request(`/levels/${encodeURIComponent(uuid)}/versions`, { method: 'POST', body: JSON.stringify(data) });
  },

  /**
   * Get current level version for a specific date
   * @param {string} uuid - Level UUID
   * @param {string} date - Date in YYYY-MM-DD format (optional, defaults to today)
   */
  getVersion(uuid, date = null) {
    const url = `/levels/${encodeURIComponent(uuid)}/version${date ? `?date=${date}` : ''}`;
    return request(url);
  },
};
