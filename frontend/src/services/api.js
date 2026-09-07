import axios from 'axios';

const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:5000/api';

const api = axios.create({
  baseURL: API_BASE,
  timeout: 15000,
  headers: { 'Content-Type': 'application/json' },
});

let isRefreshing = false;
let failedQueue = [];

const processQueue = (error, token = null) => {
  failedQueue.forEach(prom => {
    if (error) {
      prom.reject(error);
    } else {
      prom.resolve(token);
    }
  });
  failedQueue = [];
};

const forceLogout = () => {
  // Clear all auth data
  localStorage.removeItem('authToken');
  localStorage.removeItem('refreshToken');
  localStorage.removeItem('user');
  sessionStorage.clear();
  
  // Broadcast logout event
  try {
    localStorage.setItem('logout_event', Date.now().toString());
  } catch (err) {
    console.error('Failed to broadcast logout:', err);
  }
  
  // Redirect to login
  if (window.location.pathname !== '/login') {
    window.location.href = '/login';
  }
};

// Request interceptor — attach JWT
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('authToken');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor — handle 401 and token refresh
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    // If error is not 401 or request has already been retried, reject immediately
    if (error.response?.status !== 401) {
      return Promise.reject(error);
    }

    if (originalRequest._retry) {
      // Already retried, force logout
      forceLogout();
      return Promise.reject(error);
    }

    // Check error type from response
    const errorCode = error.response?.data?.error;
    
    // Force logout for these error types (don't try to refresh)
    if (errorCode === 'INACTIVE_SESSION' || errorCode === 'TOKEN_EXPIRED' || errorCode === 'INVALID_TOKEN') {
      forceLogout();
      return Promise.reject(error);
    }

    // Mark request as retried
    originalRequest._retry = true;

    if (isRefreshing) {
      // Another request is already refreshing the token, wait for it
      return new Promise((resolve, reject) => {
        failedQueue.push({ resolve, reject });
      })
        .then(token => {
          originalRequest.headers.Authorization = `Bearer ${token}`;
          return api(originalRequest);
        })
        .catch(err => {
          return Promise.reject(err);
        });
    }

    // Start token refresh
    isRefreshing = true;

    return new Promise((resolve, reject) => {
      const refreshToken = localStorage.getItem('refreshToken');
      
      if (!refreshToken) {
        isRefreshing = false;
        processQueue(new Error('No refresh token'), null);
        forceLogout();
        reject(error);
        return;
      }

      axios
        .post(`${API_BASE}/auth/refresh`, { refreshToken })
        .then(response => {
          const newAccessToken = response.data?.data?.accessToken;
          const newRefreshToken = response.data?.data?.refreshToken;

          if (!newAccessToken) {
            throw new Error('Invalid refresh response');
          }

          // Store new tokens
          localStorage.setItem('authToken', newAccessToken);
          if (newRefreshToken) {
            localStorage.setItem('refreshToken', newRefreshToken);
          }

          // Update default header
          api.defaults.headers.common.Authorization = `Bearer ${newAccessToken}`;
          originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;

          processQueue(null, newAccessToken);
          resolve(api(originalRequest));
        })
        .catch(err => {
          processQueue(err, null);
          forceLogout();
          reject(err);
        })
        .finally(() => {
          isRefreshing = false;
        });
    });
  }
);

export default api;
