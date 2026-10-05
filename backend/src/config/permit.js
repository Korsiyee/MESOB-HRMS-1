/**
 * Permit.io Configuration
 * 
 * This module initializes and exports the Permit client for authorization.
 * Replaces the custom RBAC system with Permit.io's policy engine.
 * 
 * Features:
 * - Resource-based authorization (employees, attendance, leave, etc.)
 * - Role-based access control (RBAC)
 * - Attribute-based access control (ABAC) for scoping
 * - Centralized policy management via Permit UI
 * 
 * Configuration:
 * - PERMIT_API_KEY: Secret API key from Permit.io dashboard
 * - PERMIT_PDP_URL: Policy Decision Point URL (cloud or local)
 * - PERMIT_ENV: Environment name (production, staging, development)
 */

const { Permit } = require('permitio');
const { requireEnv, getEnv } = require('./env');

// Permit configuration
const PERMIT_API_KEY = requireEnv('PERMIT_API_KEY');
const PERMIT_PDP_URL = getEnv('PERMIT_PDP_URL', 'https://cloudpdp.api.permit.io');
const PERMIT_ENV = getEnv('PERMIT_ENV', 'production');

// Initialize Permit client
const permit = new Permit({
  // The Permit API Key
  token: PERMIT_API_KEY,
  
  // The PDP (Policy Decision Point) URL
  // Use local PDP for better performance: http://localhost:7766
  // Use cloud PDP for simplicity: https://cloudpdp.api.permit.io
  pdp: PERMIT_PDP_URL,
  
  // Optional: Set default tenant
  // All HRMS authorization happens in single tenant for now
  // Can be extended to multi-tenant in future
  multiTenancy: false,
  
  // Log level for debugging
  log: {
    level: getEnv('PERMIT_LOG_LEVEL', 'info'),
  },
  
  // Timeout for authorization checks (milliseconds)
  timeout: parseInt(getEnv('PERMIT_TIMEOUT', '5000'), 10),
});

/**
 * Health check for Permit connection
 * @returns {Promise<boolean>} True if Permit is accessible
 */
async function checkPermitHealth() {
  try {
    // Try to fetch user (just to verify connection)
    await permit.api.users.list({ page: 1, perPage: 1 });
    return true;
  } catch (error) {
    console.error('[Permit] Health check failed:', error.message);
    return false;
  }
}

/**
 * Get Permit environment info
 * @returns {Object} Environment configuration
 */
function getPermitInfo() {
  return {
    pdpUrl: PERMIT_PDP_URL,
    environment: PERMIT_ENV,
    configured: !!PERMIT_API_KEY,
  };
}

// Log initialization
console.log('[Permit] Initialized with:', {
  pdpUrl: PERMIT_PDP_URL,
  environment: PERMIT_ENV,
  timeout: parseInt(getEnv('PERMIT_TIMEOUT', '5000'), 10),
});

module.exports = {
  permit,
  checkPermitHealth,
  getPermitInfo,
  PERMIT_ENV,
};
