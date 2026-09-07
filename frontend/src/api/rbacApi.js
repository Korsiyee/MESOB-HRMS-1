/**
 * RBAC API Service
 * Handles all RBAC-related API calls
 */

const API_BASE =
  (typeof import.meta !== 'undefined' && import.meta.env?.VITE_API_BASE) ||
  'http://localhost:5000/api';

async function request(path, options = {}) {
  const headers = { 'Content-Type': 'application/json', ...(options.headers || {}) };
  const token = localStorage.getItem('authToken');
  if (token) headers['Authorization'] = `Bearer ${token}`;
  
  const res = await fetch(`${API_BASE}${path}`, { headers, ...options });
  const payload = await res.json().catch(() => ({}));
  
  if (!res.ok) {
    throw new Error(payload.message || payload.error || 'Request failed');
  }
  
  return payload;
}

export const RbacApi = {
  // ═══════════════════════════════════════════════════════════════
  // OCCUPATION/PERMISSION LIST
  // ═══════════════════════════════════════════════════════════════
  
  /**
   * List all available occupations (permissions)
   */
  listOccupations: () => request('/rbac/occupations'),
  
  // ═══════════════════════════════════════════════════════════════
  // USER LIST FOR RBAC UI
  // ═══════════════════════════════════════════════════════════════
  
  /**
   * List all users with employee information for RBAC management
   * Query params: search?, role?, has_account? ('true' | 'false' | 'all')
   */
  listUsers: (filters = {}) => {
    const params = new URLSearchParams();
    Object.entries(filters).forEach(([key, value]) => {
      if (value) params.append(key, value);
    });
    return request(`/rbac/users?${params.toString()}`);
  },
  
  // ═══════════════════════════════════════════════════════════════
  // USER PERMISSIONS & EFFECTIVE ACCESS
  // ═══════════════════════════════════════════════════════════════
  
  /**
   * Get complete effective access breakdown for a user
   * Shows: role occupations, direct assignments
   */
  getEffectiveAccess: (userUuid) =>
    request(`/rbac/users/${encodeURIComponent(userUuid)}/effective-access`),
  
  /**
   * Get user's occupations (simplified view)
   */
  getUserOccupations: (userUuid) =>
    request(`/rbac/users/${encodeURIComponent(userUuid)}/occupations`),
  
  /**
   * Assign occupation directly to a user
   * Body: { occupation_uuid, expires_at?, assigned_reason? }
   */
  assignOccupationToUser: (userUuid, data) =>
    request(`/rbac/users/${encodeURIComponent(userUuid)}/occupations`, {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  
  /**
   * Remove occupation from a user
   * Body: { reason? }
   */
  removeOccupationFromUser: (userUuid, occupationUuid, reason) =>
    request(
      `/rbac/users/${encodeURIComponent(userUuid)}/occupations/${encodeURIComponent(occupationUuid)}`,
      {
        method: 'DELETE',
        body: JSON.stringify({ reason }),
      }
    ),

  // ═══════════════════════════════════════════════════════════════
  // ROLE MANAGEMENT
  // ═══════════════════════════════════════════════════════════════
  
  /**
   * Get all occupations assigned to a role
   */
  getRoleOccupations: (role) =>
    request(`/rbac/roles/${encodeURIComponent(role)}/occupations`),
  
  /**
   * Assign occupation to a role (SUPER_ADMIN only)
   * Body: { occupation_uuid, assigned_reason? }
   */
  assignOccupationToRole: (role, data) =>
    request(`/rbac/roles/${encodeURIComponent(role)}/occupations`, {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  
  /**
   * Remove occupation from a role (SUPER_ADMIN only)
   */
  removeOccupationFromRole: (role, occupationUuid) =>
    request(
      `/rbac/roles/${encodeURIComponent(role)}/occupations/${encodeURIComponent(occupationUuid)}`,
      { method: 'DELETE' }
    ),
};
