import { updateGlobalActivity } from '../context/AuthContext';

const LOCAL_API_BASE = "http://localhost:5000/api";

// Support multiple environment variable formats for different build tools
const API_BASE =
  (typeof import.meta !== "undefined" &&
    import.meta.env &&
    (import.meta.env.VITE_API_URL || import.meta.env.VITE_API_BASE)) ||
  (typeof process !== "undefined" &&
    process.env &&
    (process.env.REACT_APP_API_URL || process.env.REACT_APP_API_BASE)) ||
  LOCAL_API_BASE;

console.log('[API Client] Using API base URL:', API_BASE);

let isRefreshing = false;
let refreshSubscribers = [];

// Subscribe to token refresh completion
function subscribeTokenRefresh(callback) {
  refreshSubscribers.push(callback);
}

// Notify all subscribers when token is refreshed
function onTokenRefreshed(token) {
  refreshSubscribers.forEach(callback => callback(token));
  refreshSubscribers = [];
}

// Terminal error codes that require immediate logout (no retry)
const TERMINAL_ERROR_CODES = [
  'TOKEN_REVOKED',          // Session terminated by admin/security action
  'ACCOUNT_DEACTIVATED',    // Account disabled by admin
  'INACTIVE_SESSION',       // Logged out due to 1 hour inactivity
  'INVALID_TOKEN',          // Malformed or invalid token
  'UNAUTHORIZED',           // Generic unauthorized (user not found, etc)
];

// Error messages for user feedback
const ERROR_MESSAGES = {
  TOKEN_REVOKED: 'Your session has been terminated by an administrator. Please log in again.',
  ACCOUNT_DEACTIVATED: 'Your account has been deactivated. Please contact support.',
  INACTIVE_SESSION: 'You have been logged out due to inactivity.',
  TOKEN_EXPIRED: 'Your session has expired. Please log in again.',
  INVALID_TOKEN: 'Your session is invalid. Please log in again.',
  UNAUTHORIZED: 'Your session is invalid. Please log in again.',
};

// Force logout and redirect to login
function forceLogout(errorCode = 'SESSION_EXPIRED') {
  console.log(`Force logout triggered: ${errorCode}`);
  
  // Clear all auth data
  localStorage.removeItem("authToken");
  localStorage.removeItem("refreshToken");
  localStorage.removeItem("user");
  
  // Store logout reason for display on login page
  sessionStorage.setItem('logoutReason', errorCode);
  sessionStorage.setItem('logoutMessage', ERROR_MESSAGES[errorCode] || 'Your session has expired. Please log in again.');
  
  // Broadcast logout to other tabs
  try {
    localStorage.setItem('logout_event', Date.now().toString());
  } catch (err) {
    console.error('Failed to broadcast logout:', err);
  }
  
  // Reset refresh state
  isRefreshing = false;
  refreshSubscribers = [];
  
  // Force redirect to login
  if (window.location.pathname !== '/login') {
    window.location.href = '/login';
  }
  
  throw new Error(`Session expired: ${errorCode}`);
}

// Refresh the access token
async function refreshAccessToken() {
  const refreshToken = localStorage.getItem("refreshToken");
  if (!refreshToken) {
    console.error('No refresh token available');
    forceLogout('NO_REFRESH_TOKEN');
  }

  try {
    const response = await fetch(`${API_BASE}/auth/refresh`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ refreshToken }),
    });

    // Handle non-OK responses
    if (!response.ok) {
      let errorPayload;
      try {
        errorPayload = await response.json();
      } catch (err) {
        errorPayload = {};
      }

      const errorCode = errorPayload.error || 'REFRESH_FAILED';
      console.error(`Token refresh failed: ${errorCode}`);
      
      // If refresh token is revoked or expired, force logout
      if (TERMINAL_ERROR_CODES.includes(errorCode) || errorCode === 'TOKEN_EXPIRED') {
        forceLogout(errorCode);
      }
      
      // Generic refresh failure
      forceLogout('REFRESH_FAILED');
    }

    const payload = await response.json();
    
    if (payload.data?.accessToken) {
      localStorage.setItem("authToken", payload.data.accessToken);
      
      // Update refresh token if provided
      if (payload.data?.refreshToken) {
        localStorage.setItem("refreshToken", payload.data.refreshToken);
      }
      
      return payload.data.accessToken;
    } else {
      console.error('Invalid refresh response structure');
      forceLogout('INVALID_REFRESH_RESPONSE');
    }
  } catch (error) {
    console.error('Token refresh error:', error);
    forceLogout('REFRESH_ERROR');
  }
}

// Main request function with automatic token refresh
export async function apiRequest(path, options = {}) {
  // Track API calls as user activity to prevent idle logout during active use
  // This ensures that users making API requests are considered "active"
  updateGlobalActivity();

  const headers = {
    "Content-Type": "application/json",
    ...(options.headers || {}),
  };

  const token = localStorage.getItem("authToken");
  console.log(`[apiRequest] ${path} - Token exists:`, !!token, 'Length:', token?.length || 0);
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
    console.log(`[apiRequest] ${path} - Authorization header added`);
  } else {
    console.warn(`[apiRequest] ${path} - NO TOKEN FOUND IN LOCALSTORAGE`);
  }

  // Extract headers from options to prevent overwriting our merged headers object
  // This ensures Authorization header is preserved even when options.headers exists
  const { headers: _, ...fetchOptions } = options;
  
  let response = await fetch(`${API_BASE}${path}`, {
    headers,
    ...fetchOptions,
  });

  // Handle 401 Unauthorized
  if (response.status === 401 && !options.skipRefresh) {
    let errorPayload;
    try {
      errorPayload = await response.json();
    } catch (err) {
      errorPayload = {};
    }
    
    // Check error code from backend
    const errorCode = errorPayload.error;
    console.log(`401 Error: ${errorCode}`);
    
    // Terminal errors - force logout immediately (no retry)
    if (TERMINAL_ERROR_CODES.includes(errorCode)) {
      forceLogout(errorCode);
    }

    // TOKEN_EXPIRED - Try to refresh the token
    if (errorCode === 'TOKEN_EXPIRED') {
      // If already refreshing, wait for completion
      if (isRefreshing) {
        try {
          const newToken = await new Promise((resolve, reject) => {
            subscribeTokenRefresh((token) => {
              resolve(token);
            });
            
            // Timeout after 10 seconds
            setTimeout(() => {
              reject(new Error('Token refresh timeout'));
            }, 10000);
          });

          // Retry with new token
          headers["Authorization"] = `Bearer ${newToken}`;
          response = await fetch(`${API_BASE}${path}`, {
            headers,
            ...fetchOptions,
          });
        } catch (err) {
          console.error('Token refresh wait error:', err);
          forceLogout('REFRESH_TIMEOUT');
        }
      } else {
        // Start token refresh
        isRefreshing = true;
        try {
          const newToken = await refreshAccessToken();
          isRefreshing = false;
          onTokenRefreshed(newToken);

          // Retry the original request with new token
          headers["Authorization"] = `Bearer ${newToken}`;
          response = await fetch(`${API_BASE}${path}`, {
            headers,
            ...fetchOptions,
          });
        } catch (error) {
          isRefreshing = false;
          refreshSubscribers = []; // Clear subscribers on failure
          throw error; // Will be caught and handled by forceLogout
        }
      }
    } else {
      // Unknown 401 error - force logout
      forceLogout(errorCode || 'UNAUTHORIZED');
    }
  }

  // Parse response
  let payload;
  try {
    payload = await response.json();
  } catch (err) {
    payload = {};
  }

  // Handle non-OK responses (non-401 errors)
  if (!response.ok) {
    const errorMessage = payload.message || payload.error || `Request failed with status ${response.status}`;
    const error = new Error(errorMessage);
    error.status = response.status;
    error.code = payload.error;
    throw error;
  }

  return payload;
}

export { API_BASE };
