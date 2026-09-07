/**
 * Authentication utility functions
 * Provides helper functions for managing authentication state
 */

import { AuthApi } from '../api/authApi';

/**
 * Check if user is authenticated
 * @returns {boolean}
 */
export const isAuthenticated = () => {
  return AuthApi.isAuthenticated();
};

/**
 * Get current user from localStorage
 * @returns {Object|null} User object or null
 */
export const getCurrentUser = () => {
  return AuthApi.getStoredUser();
};

/**
 * Get user role
 * @returns {string|null} User role or null
 */
export const getUserRole = () => {
  const user = getCurrentUser();
  return user?.role || null;
};

/**
 * Check if user has a specific role
 * @param {string} role - Role to check
 * @returns {boolean}
 */
export const hasRole = (role) => {
  const userRole = getUserRole();
  return userRole === role;
};

/**
 * Check if user has any of the specified roles
 * @param {string[]} roles - Array of roles to check
 * @returns {boolean}
 */
export const hasAnyRole = (roles) => {
  const userRole = getUserRole();
  return roles.includes(userRole);
};

/**
 * Get auth token
 * @returns {string|null}
 */
export const getAuthToken = () => {
  return localStorage.getItem('authToken');
};

/**
 * Get refresh token
 * @returns {string|null}
 */
export const getRefreshToken = () => {
  return localStorage.getItem('refreshToken');
};

/**
 * Clear all auth data
 */
export const clearAuthData = () => {
  localStorage.removeItem('authToken');
  localStorage.removeItem('refreshToken');
  localStorage.removeItem('user');
};

/**
 * Redirect to login page
 */
export const redirectToLogin = () => {
  clearAuthData();
  window.location.href = '/login';
};

/**
 * Handle authentication error
 * Clears auth data and redirects to login
 * @param {Error} error - Error object
 */
export const handleAuthError = (error) => {
  console.error('Authentication error:', error);
  redirectToLogin();
};

/**
 * Setup axios/fetch interceptor for automatic token refresh
 * Call this once when app initializes
 */
export const setupAuthInterceptor = () => {
  // Store original fetch
  const originalFetch = window.fetch;

  // Override fetch
  window.fetch = async (...args) => {
    const [url, config] = args;

    // Add auth token to requests
    const token = getAuthToken();
    if (token && config?.headers) {
      config.headers['Authorization'] = `Bearer ${token}`;
    }

    try {
      const response = await originalFetch(url, config);

      // Handle 401 Unauthorized
      if (response.status === 401) {
        // Try to refresh token
        try {
          await AuthApi.refreshToken();
          // Retry original request with new token
          const newToken = getAuthToken();
          if (newToken && config?.headers) {
            config.headers['Authorization'] = `Bearer ${newToken}`;
          }
          return await originalFetch(url, config);
        } catch (refreshError) {
          // Refresh failed, redirect to login
          handleAuthError(refreshError);
          throw refreshError;
        }
      }

      return response;
    } catch (error) {
      throw error;
    }
  };
};

/**
 * Format user display name
 * @param {Object} user - User object
 * @returns {string}
 */
export const getUserDisplayName = (user = null) => {
  const currentUser = user || getCurrentUser();
  if (!currentUser) return 'Guest';
  
  return currentUser.full_name || 
         currentUser.username || 
         currentUser.email || 
         'User';
};

/**
 * Check if token is expired (basic check)
 * Note: This is a simple check. For production, decode JWT and check exp claim
 * @returns {boolean}
 */
export const isTokenExpired = () => {
  const token = getAuthToken();
  if (!token) return true;

  try {
    // Basic JWT decode (payload is base64 encoded)
    const payload = JSON.parse(atob(token.split('.')[1]));
    const exp = payload.exp * 1000; // Convert to milliseconds
    return Date.now() >= exp;
  } catch (error) {
    console.error('Error checking token expiration:', error);
    return true;
  }
};

/**
 * Get time until token expires (in milliseconds)
 * @returns {number} Milliseconds until expiration, or 0 if expired/invalid
 */
export const getTokenTimeRemaining = () => {
  const token = getAuthToken();
  if (!token) return 0;

  try {
    const payload = JSON.parse(atob(token.split('.')[1]));
    const exp = payload.exp * 1000;
    const remaining = exp - Date.now();
    return remaining > 0 ? remaining : 0;
  } catch (error) {
    console.error('Error getting token time remaining:', error);
    return 0;
  }
};

/**
 * Schedule token refresh before expiration
 * @param {number} minutesBefore - Minutes before expiration to refresh (default: 5)
 */
export const scheduleTokenRefresh = (minutesBefore = 5) => {
  const timeRemaining = getTokenTimeRemaining();
  const refreshTime = timeRemaining - (minutesBefore * 60 * 1000);

  if (refreshTime > 0) {
    setTimeout(async () => {
      try {
        await AuthApi.refreshToken();
        console.log('Token refreshed successfully');
        // Schedule next refresh
        scheduleTokenRefresh(minutesBefore);
      } catch (error) {
        console.error('Token refresh failed:', error);
        handleAuthError(error);
      }
    }, refreshTime);
  }
};

export default {
  isAuthenticated,
  getCurrentUser,
  getUserRole,
  hasRole,
  hasAnyRole,
  getAuthToken,
  getRefreshToken,
  clearAuthData,
  redirectToLogin,
  handleAuthError,
  setupAuthInterceptor,
  getUserDisplayName,
  isTokenExpired,
  getTokenTimeRemaining,
  scheduleTokenRefresh,
};
