/**
 * RBAC API Service
 * Handles all RBAC-related API calls
 * 
 * UPDATED: Now uses unified /role-management endpoints
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
   * UPDATED: Now uses /role-management/permissions
   */
  listOccupations: () => request('/role-management/permissions'),
  
  // ═══════════════════════════════════════════════════════════════
  // USER LIST FOR RBAC UI
  // ═══════════════════════════════════════════════════════════════
  
  /**
   * List all users with employee information for RBAC management
   * Query params: search?, role?, has_account? ('true' | 'false' | 'all')
   * 
   * NOTE: This endpoint needs to be implemented in roleManagementController
   * or we should use the employeeApi instead for user lists
   * For now, keeping the old endpoint path but it may need adjustment
   */
  listUsers: (filters = {}) => {
    const params = new URLSearchParams();
    Object.entries(filters).forEach(([key, value]) => {
      if (value) params.append(key, value);
    });
    // TODO: Verify if this endpoint exists in role-management or use employee API
    return request(`/rbac/users?${params.toString()}`);
  },
  
  // ═══════════════════════════════════════════════════════════════
  // USER PERMISSIONS & EFFECTIVE ACCESS
  // ═══════════════════════════════════════════════════════════════
  
  /**
   * Get complete effective access breakdown for a user
   * Shows: role occupations, direct assignments
   * UPDATED: Now uses /role-management/users/:userUuid/effective-permissions
   */
  getEffectiveAccess: (userUuid) =>
    request(`/role-management/users/${encodeURIComponent(userUuid)}/effective-permissions`),
  
  /**
   * Get user's occupations (simplified view)
   * UPDATED: Now uses /role-management/users/:userUuid/effective-permissions
   */
  getUserOccupations: (userUuid) =>
    request(`/role-management/users/${encodeURIComponent(userUuid)}/effective-permissions`),
  
  /**
   * Assign occupation directly to a user
   * Body: { occupation_uuid, expires_at?, assigned_reason? }
   * 
   * UPDATED: Now uses /role-management/users/:userUuid/overrides/permissions
   * NOTE: API signature may need adjustment - occupation_uuid -> permission_uuid
   */
  assignOccupationToUser: (userUuid, data) =>
    request(`/role-management/users/${encodeURIComponent(userUuid)}/overrides/permissions`, {
      method: 'POST',
      body: JSON.stringify({
        permission_uuid: data.occupation_uuid || data.permission_uuid,
        expires_at: data.expires_at,
        reason: data.assigned_reason
      }),
    }),
  
  /**
   * Remove occupation from a user
   * Body: { reason? }
   * 
   * UPDATED: Now uses /role-management/overrides/permissions/:overrideUuid
   * NOTE: This requires the override UUID, not occupation UUID
   */
  removeOccupationFromUser: (userUuid, occupationUuid, reason) =>
    request(
      `/role-management/overrides/permissions/${encodeURIComponent(occupationUuid)}`,
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
   * UPDATED: Now uses /role-management/roles/:roleUuid/permissions
   * NOTE: role parameter should be role UUID, not role code
   */
  getRoleOccupations: (roleUuid) =>
    request(`/role-management/roles/${encodeURIComponent(roleUuid)}/permissions`),
  
  /**
   * Assign occupation to a role (SUPER_ADMIN only)
   * Body: { occupation_uuid, assigned_reason? }
   * 
   * UPDATED: Now uses /role-management/roles/:roleUuid/permissions
   * NOTE: API signature adjusted - occupation_uuid -> permission_uuid
   */
  assignOccupationToRole: (roleUuid, data) =>
    request(`/role-management/roles/${encodeURIComponent(roleUuid)}/permissions`, {
      method: 'POST',
      body: JSON.stringify({
        permission_uuid: data.occupation_uuid || data.permission_uuid,
        data_scope: data.data_scope || 'ALL',
        reason: data.assigned_reason
      }),
    }),
  
  /**
   * Remove occupation from a role (SUPER_ADMIN only)
   * UPDATED: Now uses /role-management/roles/:roleUuid/permissions/:permissionUuid
   */
  removeOccupationFromRole: (roleUuid, permissionUuid) =>
    request(
      `/role-management/roles/${encodeURIComponent(roleUuid)}/permissions/${encodeURIComponent(permissionUuid)}`,
      { method: 'DELETE' }
    ),
};
