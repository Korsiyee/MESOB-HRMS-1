/**
 * Debug Helper Utilities
 * Use these functions during development to diagnose issues
 */

/**
 * Log API errors with context
 */
export const logApiError = (context, error) => {
  console.group(`🚨 API Error: ${context}`);
  console.error('Error Message:', error.message || 'Unknown error');
  console.error('Error Object:', error);
  if (error.response) {
    console.error('Response Status:', error.response.status);
    console.error('Response Data:', error.response.data);
  }
  if (error.stack) {
    console.error('Stack Trace:', error.stack);
  }
  console.groupEnd();
};

/**
 * Log user data for debugging auth issues
 */
export const logUserData = (user) => {
  console.group('👤 User Data');
  console.log('Username:', user?.username || 'N/A');
  console.log('Role:', user?.role || 'N/A');
  console.log('Employee UUID:', user?.employee_uuid || 'MISSING ⚠️');
  console.log('Department UUID:', user?.department_uuid || 'MISSING ⚠️');
  console.log('Occupations:', user?.occupations?.length || 0);
  console.log('Full User Object:', user);
  console.groupEnd();
};

/**
 * Log component lifecycle
 */
export const logLifecycle = (componentName, event, data = {}) => {
  const timestamp = new Date().toISOString().split('T')[1].slice(0, 12);
  console.log(`⏱️ [${timestamp}] ${componentName} - ${event}`, data);
};

/**
 * Check if required fields exist
 */
export const validateRequiredFields = (data, fields) => {
  const missing = [];
  fields.forEach(field => {
    if (!data || data[field] === null || data[field] === undefined) {
      missing.push(field);
    }
  });
  
  if (missing.length > 0) {
    console.warn('⚠️ Missing required fields:', missing);
    return { valid: false, missing };
  }
  
  return { valid: true, missing: [] };
};

/**
 * Format API response for debugging
 */
export const logApiResponse = (endpoint, response) => {
  console.group(`✅ API Response: ${endpoint}`);
  console.log('Status:', response.status || 'Unknown');
  console.log('Data:', response.data || response);
  if (response.meta) {
    console.log('Meta:', response.meta);
  }
  console.groupEnd();
};

/**
 * Performance timer
 */
export const createTimer = (label) => {
  const start = performance.now();
  return {
    end: () => {
      const duration = (performance.now() - start).toFixed(2);
      console.log(`⏱️ ${label}: ${duration}ms`);
      return duration;
    }
  };
};

/**
 * Local storage debugger
 */
export const debugStorage = () => {
  console.group('💾 Local Storage Contents');
  console.log('Auth Token:', localStorage.getItem('authToken') ? '✅ Present' : '❌ Missing');
  console.log('Refresh Token:', localStorage.getItem('refreshToken') ? '✅ Present' : '❌ Missing');
  
  const user = localStorage.getItem('user');
  if (user) {
    try {
      const parsed = JSON.parse(user);
      console.log('User Data:', parsed);
    } catch {
      console.error('User data is malformed');
    }
  } else {
    console.log('User Data: ❌ Missing');
  }
  console.groupEnd();
};

/**
 * Network status checker
 */
export const checkNetworkStatus = () => {
  const online = navigator.onLine;
  console.log(`🌐 Network Status: ${online ? '✅ Online' : '❌ Offline'}`);
  return online;
};

/**
 * Enable all debugging
 */
export const enableDebugMode = () => {
  window.__DEBUG_MODE__ = true;
  console.log('🔍 Debug Mode Enabled');
  console.log('Available debug functions:');
  console.log('  - window.debugStorage()');
  console.log('  - window.checkNetwork()');
  console.log('  - window.logUser()');
  
  window.debugStorage = debugStorage;
  window.checkNetwork = checkNetworkStatus;
  window.logUser = () => {
    const stored = localStorage.getItem('user');
    if (stored) {
      logUserData(JSON.parse(stored));
    } else {
      console.warn('No user data found');
    }
  };
};

/**
 * Disable debugging
 */
export const disableDebugMode = () => {
  window.__DEBUG_MODE__ = false;
  delete window.debugStorage;
  delete window.checkNetwork;
  delete window.logUser;
  console.log('🔕 Debug Mode Disabled');
};

// Auto-enable in development
if (import.meta.env.DEV) {
  enableDebugMode();
}
