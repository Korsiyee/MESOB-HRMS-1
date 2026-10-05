import { apiRequest } from "../utils/apiClient";

export const AuthApi = {
  login: async (username, password) => {
    const response = await apiRequest("/auth/login", {
      method: "POST",
      body: JSON.stringify({ username, password }),
      skipRefresh: true, // Don't try to refresh on login endpoint
    });
    
    // Store tokens if login successful
    console.log('[AuthApi.login] Response data:', { 
      hasAccessToken: !!response.data?.accessToken,
      hasRefreshToken: !!response.data?.refreshToken,
      hasUser: !!response.data?.user 
    });
    
    if (response.data?.accessToken) {
      localStorage.setItem("authToken", response.data.accessToken);
      console.log('[AuthApi.login] ✅ Access token stored, length:', response.data.accessToken.length);
    } else {
      console.error('[AuthApi.login] ❌ NO ACCESS TOKEN in response!');
    }
    
    if (response.data?.refreshToken) {
      localStorage.setItem("refreshToken", response.data.refreshToken);
      console.log('[AuthApi.login] ✅ Refresh token stored');
    }
    
    if (response.data?.user) {
      localStorage.setItem("user", JSON.stringify(response.data.user));
      console.log('[AuthApi.login] ✅ User stored');
    }
    
    return response;
  },

  logout: async () => {
    try {
      await apiRequest("/auth/logout", {
        method: "POST",
        skipRefresh: true, // Don't try to refresh on logout endpoint
      });
    } finally {
      // Clear local storage regardless of API response
      localStorage.removeItem("authToken");
      localStorage.removeItem("refreshToken");
      localStorage.removeItem("user");
    }
  },

  getCurrentUser: () => apiRequest("/auth/me"),

  refreshToken: async () => {
    const refreshToken = localStorage.getItem("refreshToken");
    if (!refreshToken) {
      throw new Error("No refresh token available");
    }

    const response = await apiRequest("/auth/refresh", {
      method: "POST",
      body: JSON.stringify({ refreshToken }),
      skipRefresh: true, // Don't try to refresh on refresh endpoint
    });

    if (response.data?.accessToken) {
      localStorage.setItem("authToken", response.data.accessToken);
    }
    if (response.data?.refreshToken) {
      localStorage.setItem("refreshToken", response.data.refreshToken);
    }

    return response;
  },

  changePassword: async (oldPassword, newPassword) => {
    const response = await apiRequest("/auth/change-password", {
      method: "PATCH",
      body: JSON.stringify({ oldPassword, newPassword }),
    });
    
    // After successful password change, user will be logged out
    // Clear local storage and redirect
    localStorage.removeItem("authToken");
    localStorage.removeItem("refreshToken");
    localStorage.removeItem("user");
    
    // Set message for login page
    sessionStorage.setItem('logoutReason', 'PASSWORD_CHANGED');
    sessionStorage.setItem('logoutMessage', 'Password changed successfully. Please log in with your new password.');
    
    return response;
  },

  isAuthenticated: () => {
    return !!localStorage.getItem("authToken");
  },

  getStoredUser: () => {
    const userStr = localStorage.getItem("user");
    return userStr ? JSON.parse(userStr) : null;
  },
};
