import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { apiRequest } from '../utils/apiClient';

const AuthContext = createContext(null);

const INACTIVITY_TIMEOUT = 60 * 60 * 1000; // 1 hour in milliseconds
const WARNING_BEFORE_LOGOUT = 60 * 1000; // Show warning 60 seconds before logout
const TOKEN_REFRESH_INTERVAL = 14 * 60 * 1000; // Refresh token every 14 minutes (JWT expires in 15 minutes)
const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:5000/api';
const AUTH_CHANNEL_NAME = 'auth_channel';

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [showWarning, setShowWarning] = useState(false);
  const [warningCountdown, setWarningCountdown] = useState(60);
  
  const lastActivityRef = useRef(Date.now());
  const inactivityTimerRef = useRef(null);
  const warningTimerRef = useRef(null);
  const refreshTimerRef = useRef(null);
  const countdownIntervalRef = useRef(null);
  const broadcastChannelRef = useRef(null);

  // Update last activity timestamp
  const updateActivity = useCallback(() => {
    lastActivityRef.current = Date.now();
    
    // Hide warning if user becomes active again
    if (showWarning) {
      setShowWarning(false);
      setWarningCountdown(60);
      if (countdownIntervalRef.current) {
        clearInterval(countdownIntervalRef.current);
        countdownIntervalRef.current = null;
      }
    }
  }, [showWarning]);

  // Clear all auth data
  const clearAuthData = useCallback(() => {
    localStorage.removeItem('authToken');
    localStorage.removeItem('refreshToken');
    localStorage.removeItem('user');
    localStorage.removeItem('userRole');
    localStorage.removeItem('userDashboard');
    localStorage.removeItem('userModules');
    sessionStorage.clear(); // Clear all session storage
    setUser(null);
    setIsAuthenticated(false);
    setShowWarning(false);
    setWarningCountdown(60);
  }, []);

  // Clear all timers
  const clearAllTimers = useCallback(() => {
    if (inactivityTimerRef.current) {
      clearInterval(inactivityTimerRef.current);
      inactivityTimerRef.current = null;
    }
    if (warningTimerRef.current) {
      clearTimeout(warningTimerRef.current);
      warningTimerRef.current = null;
    }
    if (refreshTimerRef.current) {
      clearInterval(refreshTimerRef.current);
      refreshTimerRef.current = null;
    }
    if (countdownIntervalRef.current) {
      clearInterval(countdownIntervalRef.current);
      countdownIntervalRef.current = null;
    }
  }, []);

  // Logout function
  const logout = useCallback(async (reason = 'manual', skipBroadcast = false) => {
    try {
      const token = localStorage.getItem('authToken');
      if (token && reason === 'manual') {
        // Best effort - don't wait for response
        apiRequest('/auth/logout', {
          method: 'POST',
          skipRefresh: true,
        }).catch(() => {});
      }
    } catch (err) {
      console.error('Logout API call failed:', err);
    } finally {
      clearAllTimers();
      clearAuthData();

      // Broadcast logout to other tabs
      if (!skipBroadcast && broadcastChannelRef.current) {
        try {
          broadcastChannelRef.current.postMessage({ type: 'LOGOUT', reason });
        } catch (err) {
          console.error('Failed to broadcast logout:', err);
        }
      }

      // Force redirect to login page
      if (window.location.pathname !== '/login') {
        window.location.href = '/login';
      }
    }
  }, [clearAllTimers, clearAuthData]);

  // Show warning modal before logout
  const showLogoutWarning = useCallback(() => {
    setShowWarning(true);
    setWarningCountdown(60);

    // Start countdown
    countdownIntervalRef.current = setInterval(() => {
      setWarningCountdown((prev) => {
        if (prev <= 1) {
          if (countdownIntervalRef.current) {
            clearInterval(countdownIntervalRef.current);
            countdownIntervalRef.current = null;
          }
          logout('inactivity');
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  }, [logout]);

  // Refresh access token using refresh token
  const refreshAccessToken = useCallback(async () => {
    try {
      const refreshToken = localStorage.getItem('refreshToken');
      if (!refreshToken) {
        await logout('token_missing');
        return false;
      }

      const response = await apiRequest('/auth/refresh', {
        method: 'POST',
        body: JSON.stringify({ refreshToken }),
        skipRefresh: true,
      });

      const { data } = response;
      localStorage.setItem('authToken', data.accessToken);
      if (data.refreshToken) {
        localStorage.setItem('refreshToken', data.refreshToken);
      }
      
      return true;
    } catch (error) {
      console.error('Token refresh failed:', error);
      await logout('refresh_error');
      return false;
    }
  }, [logout]);

  // Check for inactivity
  const checkInactivity = useCallback(() => {
    const now = Date.now();
    const inactiveDuration = now - lastActivityRef.current;
    
    // Show warning 60 seconds before logout
    if (inactiveDuration >= INACTIVITY_TIMEOUT - WARNING_BEFORE_LOGOUT && !showWarning) {
      showLogoutWarning();
    }
  }, [showWarning, showLogoutWarning]);

  // Fetch fresh user data from backend (includes occupations)
  const fetchCurrentUser = useCallback(async () => {
    try {
      const token = localStorage.getItem('authToken');
      if (!token) return null;

      const response = await apiRequest('/auth/me', {
        method: 'GET',
        skipRefresh: true,
      });

      const { data } = response;
      return data;
    } catch (error) {
      console.error('Failed to fetch current user:', error);
      return null;
    }
  }, []);

  // Login function
  const login = useCallback(async (userData, permissions = null, additionalData = {}) => {
    // Fetch fresh user data with occupations from backend
    const freshUserData = await fetchCurrentUser();
    const fullUserData = freshUserData ? { ...userData, ...freshUserData } : userData;
    
    if (permissions) {
      fullUserData.permissions = permissions;
    } else if (additionalData.modules) {
      fullUserData.permissions = {
        role: additionalData.role,
        dashboard: additionalData.dashboard,
        modules: additionalData.modules
      };
    }
    
    // Include role, dashboard, and modules from static RBAC
    if (additionalData.role) {
      fullUserData.role = additionalData.role;
      localStorage.setItem('userRole', JSON.stringify(additionalData.role));
    }
    
    if (additionalData.dashboard) {
      fullUserData.dashboard = additionalData.dashboard;
      localStorage.setItem('userDashboard', additionalData.dashboard);
    }
    
    if (additionalData.modules) {
      fullUserData.modules = additionalData.modules;
      localStorage.setItem('userModules', JSON.stringify(additionalData.modules));
    } else if (fullUserData.permissions?.modules) {
      fullUserData.modules = fullUserData.permissions.modules;
      localStorage.setItem('userModules', JSON.stringify(fullUserData.permissions.modules));
    }
    
    setUser(fullUserData);
    localStorage.setItem('user', JSON.stringify(fullUserData));
    setIsAuthenticated(true);
    lastActivityRef.current = Date.now();
    setShowWarning(false);
    setWarningCountdown(60);

    console.log('[AuthContext] Login - User data:', {
      hasPermissions: !!fullUserData.permissions,
      hasRole: !!fullUserData.role,
      dashboard: fullUserData.dashboard,
      moduleCount: fullUserData.modules?.length || 0
    });

    // Broadcast login to other tabs
    if (broadcastChannelRef.current) {
      try {
        broadcastChannelRef.current.postMessage({ type: 'LOGIN', user: fullUserData });
      } catch (err) {
        console.error('Failed to broadcast login:', err);
      }
    }

    // Start automatic token refresh interval
    if (refreshTimerRef.current) {
      clearInterval(refreshTimerRef.current);
    }
    refreshTimerRef.current = setInterval(() => {
      refreshAccessToken();
    }, TOKEN_REFRESH_INTERVAL);

    // Start inactivity check interval (check every 10 seconds)
    if (inactivityTimerRef.current) {
      clearInterval(inactivityTimerRef.current);
    }
    inactivityTimerRef.current = setInterval(() => {
      checkInactivity();
    }, 10 * 1000);
  }, [fetchCurrentUser, refreshAccessToken, checkInactivity]);

  // Continue session (after warning)
  const continueSession = useCallback(() => {
    updateActivity();
    setShowWarning(false);
    setWarningCountdown(60);
    if (countdownIntervalRef.current) {
      clearInterval(countdownIntervalRef.current);
      countdownIntervalRef.current = null;
    }
  }, [updateActivity]);

  // Refresh user data (including occupations) from backend
  const refreshUserData = useCallback(async () => {
    try {
      const freshUserData = await fetchCurrentUser();
      if (freshUserData) {
        setUser(prevUser => {
          const updatedUser = {
            ...prevUser,
            ...freshUserData,
          };
          localStorage.setItem('user', JSON.stringify(updatedUser));
          console.log('[AuthContext] User data refreshed - occupations:', freshUserData.occupations?.length || 0);
          return updatedUser;
        });
        return freshUserData;
      }
    } catch (error) {
      console.error('Failed to refresh user data:', error);
    }
    return null;
  }, [fetchCurrentUser]);

  // Setup BroadcastChannel for cross-tab synchronization
  useEffect(() => {
    // Try BroadcastChannel (modern browsers)
    if (typeof BroadcastChannel !== 'undefined') {
      try {
        broadcastChannelRef.current = new BroadcastChannel(AUTH_CHANNEL_NAME);
        
        broadcastChannelRef.current.onmessage = (event) => {
          const { type, reason, user: userData } = event.data;
          
          if (type === 'LOGOUT') {
            // Another tab logged out - sync this tab
            clearAllTimers();
            clearAuthData();
            if (window.location.pathname !== '/login') {
              window.location.href = '/login';
            }
          } else if (type === 'LOGIN' && userData) {
            // Another tab logged in - sync this tab
            setUser(userData);
            setIsAuthenticated(true);
          }
        };
      } catch (err) {
        console.warn('BroadcastChannel not supported, falling back to localStorage events');
      }
    }

    // Fallback to localStorage events for older browsers
    const handleStorageChange = (e) => {
      if (e.key === 'authToken' && !e.newValue && e.oldValue) {
        // Token was removed in another tab
        clearAllTimers();
        clearAuthData();
        if (window.location.pathname !== '/login') {
          window.location.href = '/login';
        }
      } else if (e.key === 'authToken' && e.newValue && !e.oldValue) {
        // Token was added in another tab (login)
        const stored = localStorage.getItem('user');
        if (stored) {
          try {
            const userData = JSON.parse(stored);
            setUser(userData);
            setIsAuthenticated(true);
          } catch (err) {
            console.error('Failed to parse user data:', err);
          }
        }
      }
    };

    window.addEventListener('storage', handleStorageChange);

    return () => {
      if (broadcastChannelRef.current) {
        broadcastChannelRef.current.close();
      }
      window.removeEventListener('storage', handleStorageChange);
    };
  }, [clearAllTimers, clearAuthData]);

  // Track user activity
  useEffect(() => {
    if (!isAuthenticated) return;

    const activityEvents = ['mousedown', 'mousemove', 'keydown', 'scroll', 'touchstart', 'click', 'focus'];
    
    const handleActivity = () => {
      updateActivity();
    };

    activityEvents.forEach(event => {
      window.addEventListener(event, handleActivity, { passive: true });
    });

    // Track window focus
    const handleFocus = () => {
      updateActivity();
    };
    
    window.addEventListener('focus', handleFocus);

    // Register global activity updater for API calls
    setGlobalActivityUpdater(updateActivity);

    return () => {
      activityEvents.forEach(event => {
        window.removeEventListener(event, handleActivity);
      });
      window.removeEventListener('focus', handleFocus);
      // Clear global updater on cleanup
      setGlobalActivityUpdater(null);
    };
  }, [isAuthenticated, updateActivity]);

  // Initialize auth state on mount
  useEffect(() => {
    const initAuth = async () => {
      const token = localStorage.getItem('authToken');
      const stored = localStorage.getItem('user');
      
      if (token && stored) {
        try {
          // Parse stored user data
          const storedUserData = JSON.parse(stored);
          
          // Fetch fresh user data from backend (includes occupations)
          const freshUserData = await fetchCurrentUser();
          
          if (freshUserData) {
            // Update with fresh data including occupations
            const updatedUserData = {
              ...storedUserData,
              ...freshUserData,
            };
            // Always synchronize latest modules and role permissions from backend
            if (freshUserData.modules) {
              updatedUserData.modules = freshUserData.modules;
            } else if (freshUserData.permissions?.modules) {
              updatedUserData.modules = freshUserData.permissions.modules;
            }
            if (freshUserData.role) {
              updatedUserData.role = freshUserData.role;
            }
            if (freshUserData.dashboard) {
              updatedUserData.dashboard = freshUserData.dashboard;
            }
            if (freshUserData.permissions) {
              updatedUserData.permissions = freshUserData.permissions;
            }
            
            setUser(updatedUserData);
            localStorage.setItem('user', JSON.stringify(updatedUserData));
            if (updatedUserData.modules) {
              localStorage.setItem('userModules', JSON.stringify(updatedUserData.modules));
            }
            if (updatedUserData.role) {
              localStorage.setItem('userRole', JSON.stringify(updatedUserData.role));
            }
            if (updatedUserData.dashboard) {
              localStorage.setItem('userDashboard', updatedUserData.dashboard);
            }
            
            console.log('[AuthContext] User data refreshed with latest modules and permissions:', updatedUserData.modules?.length || 0);
          } else {
            // Fallback to stored data if fetch fails
            setUser(storedUserData);
          }
          
          setIsAuthenticated(true);
          lastActivityRef.current = Date.now();

          // Start token refresh interval
          refreshTimerRef.current = setInterval(() => {
            refreshAccessToken();
          }, TOKEN_REFRESH_INTERVAL);

          // Start inactivity check
          inactivityTimerRef.current = setInterval(() => {
            checkInactivity();
          }, 10 * 1000);
        } catch (err) {
          console.error('Failed to restore auth state:', err);
          clearAuthData();
        }
      }
      
      setIsLoading(false);
    };

    initAuth();

    // Cleanup on unmount
    return () => {
      clearAllTimers();
    };
  }, [fetchCurrentUser, refreshAccessToken, checkInactivity, clearAllTimers, clearAuthData]);

  // Prevent navigation away from protected routes when not authenticated
  useEffect(() => {
    if (!isLoading && !isAuthenticated && window.location.pathname !== '/login') {
      window.location.href = '/login';
    }
  }, [isAuthenticated, isLoading]);

  return (
    <AuthContext.Provider value={{ 
      user, 
      isAuthenticated, 
      isLoading, 
      login, 
      logout,
      showWarning,
      warningCountdown,
      continueSession,
      refreshUserData,
    }}>
      {children}
      
      {/* Inactivity Warning Modal */}
      {showWarning && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.75)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 9999,
        }}>
          <div style={{
            backgroundColor: 'white',
            borderRadius: '12px',
            padding: '32px',
            maxWidth: '420px',
            width: '90%',
            boxShadow: '0 20px 60px rgba(0, 0, 0, 0.3)',
          }}>
            <div style={{
              fontSize: '48px',
              textAlign: 'center',
              marginBottom: '16px',
            }}>⚠️</div>
            <h2 style={{
              margin: '0 0 12px 0',
              fontSize: '24px',
              fontWeight: '600',
              color: '#0F766E',
              textAlign: 'center',
            }}>
              Session Expiring Soon
            </h2>
            <p style={{
              margin: '0 0 24px 0',
              fontSize: '16px',
              color: '#4B5563',
              textAlign: 'center',
              lineHeight: '1.5',
            }}>
              You will be automatically logged out in <strong>{warningCountdown}</strong> seconds due to inactivity.
            </p>
            <div style={{
              display: 'flex',
              gap: '12px',
              justifyContent: 'center',
            }}>
              <button
                onClick={continueSession}
                style={{
                  padding: '12px 32px',
                  backgroundColor: '#0F766E',
                  color: 'white',
                  border: 'none',
                  borderRadius: '8px',
                  fontSize: '16px',
                  fontWeight: '600',
                  cursor: 'pointer',
                  transition: 'background-color 0.2s',
                }}
                onMouseOver={(e) => e.target.style.backgroundColor = '#115E59'}
                onMouseOut={(e) => e.target.style.backgroundColor = '#0F766E'}
              >
                Stay Logged In
              </button>
              <button
                onClick={() => logout('manual')}
                style={{
                  padding: '12px 32px',
                  backgroundColor: '#EF4444',
                  color: 'white',
                  border: 'none',
                  borderRadius: '8px',
                  fontSize: '16px',
                  fontWeight: '600',
                  cursor: 'pointer',
                  transition: 'background-color 0.2s',
                }}
                onMouseOver={(e) => e.target.style.backgroundColor = '#DC2626'}
                onMouseOut={(e) => e.target.style.backgroundColor = '#EF4444'}
              >
                Logout Now
              </button>
            </div>
          </div>
        </div>
      )}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
};

// Export a standalone function to update activity from outside React components
// This is used by apiClient.js to track API calls as user activity
let globalUpdateActivity = null;

export const setGlobalActivityUpdater = (updater) => {
  globalUpdateActivity = updater;
};

export const updateGlobalActivity = () => {
  if (globalUpdateActivity) {
    globalUpdateActivity();
  }
};
