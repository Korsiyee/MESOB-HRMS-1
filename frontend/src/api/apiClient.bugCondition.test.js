/**
 * Bug Condition Exploration Test - Authentication Token Propagation
 * 
 * **CRITICAL**: This test is EXPECTED TO FAIL on unfixed code
 * 
 * This test demonstrates the bug where Authorization headers with JWT tokens
 * are lost when API calls are made through axios-compatible wrapper methods.
 * 
 * Property 1: Bug Condition - Authorization Header Propagation
 * For ANY authenticated API request made through wrapper methods (get, post, put, patch, delete)
 * where a valid JWT token exists in localStorage, the Authorization header SHALL:
 * - Be retrieved from localStorage
 * - Be added as "Bearer {token}" format
 * - Be present in the final fetch request sent to the backend
 * - Result in successful authentication (not 401 Unauthorized)
 * 
 * **Validates: Requirements 2.1, 2.2, 2.3, 2.4, 2.5**
 * 
 * Expected counterexamples on UNFIXED code:
 * - Backend logs show "Authorization header: undefined"
 * - Backend returns 401 Unauthorized with error "UNAUTHORIZED"
 * - Frontend triggers forceLogout() immediately after successful login
 * - Token exists in localStorage but never reaches backend
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import apiClient from './apiClient';

// Mock the AuthContext before importing anything else that uses it
vi.mock('../context/AuthContext', () => ({
  updateGlobalActivity: vi.fn()
}));

describe('Bug Condition: Authorization Header Propagation Through Wrapper Methods', () => {
  const MOCK_TOKEN = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiIxMjM0NSIsImVtYWlsIjoidGVzdEB0ZXN0LmNvbSIsImlhdCI6MTYwMDAwMDAwMH0.test_signature';
  const MOCK_REFRESH_TOKEN = 'mock_refresh_token';
  
  let fetchSpy;
  let localStorageMock;
  let consoleLogSpy;
  let consoleWarnSpy;

  beforeEach(() => {
    // Mock localStorage
    localStorageMock = {
      authToken: null,
      refreshToken: null,
      user: null,
      storage: {},
      getItem(key) {
        return this.storage[key] || null;
      },
      setItem(key, value) {
        this.storage[key] = value;
      },
      removeItem(key) {
        delete this.storage[key];
      },
      clear() {
        this.storage = {};
      }
    };

    // Set up authenticated state with valid token
    localStorageMock.setItem('authToken', MOCK_TOKEN);
    localStorageMock.setItem('refreshToken', MOCK_REFRESH_TOKEN);
    localStorageMock.setItem('user', JSON.stringify({ 
      userId: '12345', 
      email: 'test@test.com' 
    }));

    global.localStorage = localStorageMock;

    // Mock sessionStorage
    global.sessionStorage = {
      storage: {},
      getItem(key) { return this.storage[key] || null; },
      setItem(key, value) { this.storage[key] = value; },
      removeItem(key) { delete this.storage[key]; },
      clear() { this.storage = {}; }
    };

    // Spy on console methods to capture logging
    consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

    // Mock fetch to simulate backend responses
    fetchSpy = vi.spyOn(global, 'fetch').mockImplementation(async (url, options) => {
      // Extract Authorization header from the request
      const authHeader = options?.headers?.Authorization || options?.headers?.authorization;
      
      // Log what the "backend" receives (simulating backend logs)
      console.log('[BACKEND SIMULATION] Received request to:', url);
      console.log('[BACKEND SIMULATION] Authorization header:', authHeader);
      console.log('[BACKEND SIMULATION] All headers:', options?.headers);
      
      // Simulate backend behavior: reject requests without valid Authorization header
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        console.log('[BACKEND SIMULATION] NO TOKEN extracted from header - returning 401');
        return {
          ok: false,
          status: 401,
          json: async () => ({ 
            error: 'UNAUTHORIZED',
            message: 'Your session is invalid. Please log in again.'
          })
        };
      }

      // Simulate successful authentication
      console.log('[BACKEND SIMULATION] Token verified - returning 200');
      return {
        ok: true,
        status: 200,
        json: async () => ({ 
          data: { success: true, message: 'Authenticated successfully' }
        })
      };
    });

    // Mock window.location for forceLogout redirect testing
    delete window.location;
    window.location = { href: '', pathname: '/dashboard' };
  });

  afterEach(() => {
    vi.restoreAllMocks();
    consoleLogSpy.mockRestore();
    consoleWarnSpy.mockRestore();
  });

  /**
   * Test GET requests through wrapper method
   * 
   * EXPECTED TO FAIL on unfixed code:
   * - Authorization header should be present but will be undefined/missing
   * - Backend simulation will return 401 Unauthorized
   */
  it('should propagate Authorization header for GET requests', async () => {
    console.log('\n=== Testing GET Request ===');
    console.log('Token in localStorage:', localStorageMock.getItem('authToken'));
    
    try {
      const result = await apiClient.get('/employees/search', { 
        params: { searchTerm: 'John' } 
      });
      
      console.log('GET request result:', result);
      
      // Verify fetch was called
      expect(fetchSpy).toHaveBeenCalled();
      
      // Verify the Authorization header was passed to fetch
      const fetchCall = fetchSpy.mock.calls[0];
      const fetchUrl = fetchCall[0];
      const fetchOptions = fetchCall[1];
      
      console.log('[TEST] Fetch called with URL:', fetchUrl);
      console.log('[TEST] Fetch options:', fetchOptions);
      console.log('[TEST] Fetch headers:', fetchOptions?.headers);
      
      // ASSERTION: Authorization header SHOULD be present
      expect(fetchOptions.headers).toBeDefined();
      expect(fetchOptions.headers.Authorization).toBeDefined();
      expect(fetchOptions.headers.Authorization).toBe(`Bearer ${MOCK_TOKEN}`);
      
      // ASSERTION: Request SHOULD succeed (not 401)
      expect(result.data).toBeDefined();
      expect(result.data.success).toBe(true);
      
    } catch (error) {
      console.error('[TEST] GET request failed:', error);
      console.error('[TEST] This failure demonstrates the bug!');
      throw error;
    }
  });

  /**
   * Test POST requests through wrapper method
   * 
   * EXPECTED TO FAIL on unfixed code:
   * - Authorization header should be present but will be undefined/missing
   */
  it('should propagate Authorization header for POST requests', async () => {
    console.log('\n=== Testing POST Request ===');
    console.log('Token in localStorage:', localStorageMock.getItem('authToken'));
    
    try {
      const result = await apiClient.post('/auth/check-permission', {
        resource: 'employees',
        action: 'read'
      });
      
      console.log('POST request result:', result);
      
      // Verify fetch was called
      expect(fetchSpy).toHaveBeenCalled();
      
      // Verify the Authorization header
      const fetchCall = fetchSpy.mock.calls[0];
      const fetchOptions = fetchCall[1];
      
      console.log('[TEST] POST Fetch headers:', fetchOptions?.headers);
      
      // ASSERTION: Authorization header SHOULD be present
      expect(fetchOptions.headers).toBeDefined();
      expect(fetchOptions.headers.Authorization).toBeDefined();
      expect(fetchOptions.headers.Authorization).toBe(`Bearer ${MOCK_TOKEN}`);
      
      // ASSERTION: Request SHOULD succeed
      expect(result.data).toBeDefined();
      expect(result.data.success).toBe(true);
      
    } catch (error) {
      console.error('[TEST] POST request failed:', error);
      console.error('[TEST] This failure demonstrates the bug!');
      throw error;
    }
  });

  /**
   * Test PUT requests through wrapper method
   * 
   * EXPECTED TO FAIL on unfixed code
   */
  it('should propagate Authorization header for PUT requests', async () => {
    console.log('\n=== Testing PUT Request ===');
    console.log('Token in localStorage:', localStorageMock.getItem('authToken'));
    
    try {
      const result = await apiClient.put('/attendance/123', {
        status: 'approved'
      });
      
      console.log('PUT request result:', result);
      
      // Verify the Authorization header
      const fetchCall = fetchSpy.mock.calls[0];
      const fetchOptions = fetchCall[1];
      
      console.log('[TEST] PUT Fetch headers:', fetchOptions?.headers);
      
      // ASSERTION: Authorization header SHOULD be present
      expect(fetchOptions.headers).toBeDefined();
      expect(fetchOptions.headers.Authorization).toBeDefined();
      expect(fetchOptions.headers.Authorization).toBe(`Bearer ${MOCK_TOKEN}`);
      
      // ASSERTION: Request SHOULD succeed
      expect(result.data).toBeDefined();
      expect(result.data.success).toBe(true);
      
    } catch (error) {
      console.error('[TEST] PUT request failed:', error);
      console.error('[TEST] This failure demonstrates the bug!');
      throw error;
    }
  });

  /**
   * Test PATCH requests through wrapper method
   * 
   * EXPECTED TO FAIL on unfixed code
   */
  it('should propagate Authorization header for PATCH requests', async () => {
    console.log('\n=== Testing PATCH Request ===');
    console.log('Token in localStorage:', localStorageMock.getItem('authToken'));
    
    try {
      const result = await apiClient.patch('/employees/123', {
        name: 'Updated Name'
      });
      
      console.log('PATCH request result:', result);
      
      // Verify the Authorization header
      const fetchCall = fetchSpy.mock.calls[0];
      const fetchOptions = fetchCall[1];
      
      console.log('[TEST] PATCH Fetch headers:', fetchOptions?.headers);
      
      // ASSERTION: Authorization header SHOULD be present
      expect(fetchOptions.headers).toBeDefined();
      expect(fetchOptions.headers.Authorization).toBeDefined();
      expect(fetchOptions.headers.Authorization).toBe(`Bearer ${MOCK_TOKEN}`);
      
      // ASSERTION: Request SHOULD succeed
      expect(result.data).toBeDefined();
      expect(result.data.success).toBe(true);
      
    } catch (error) {
      console.error('[TEST] PATCH request failed:', error);
      console.error('[TEST] This failure demonstrates the bug!');
      throw error;
    }
  });

  /**
   * Test DELETE requests through wrapper method
   * 
   * EXPECTED TO FAIL on unfixed code
   */
  it('should propagate Authorization header for DELETE requests', async () => {
    console.log('\n=== Testing DELETE Request ===');
    console.log('Token in localStorage:', localStorageMock.getItem('authToken'));
    
    try {
      const result = await apiClient.delete('/employees/123');
      
      console.log('DELETE request result:', result);
      
      // Verify the Authorization header
      const fetchCall = fetchSpy.mock.calls[0];
      const fetchOptions = fetchCall[1];
      
      console.log('[TEST] DELETE Fetch headers:', fetchOptions?.headers);
      
      // ASSERTION: Authorization header SHOULD be present
      expect(fetchOptions.headers).toBeDefined();
      expect(fetchOptions.headers.Authorization).toBeDefined();
      expect(fetchOptions.headers.Authorization).toBe(`Bearer ${MOCK_TOKEN}`);
      
      // ASSERTION: Request SHOULD succeed
      expect(result.data).toBeDefined();
      expect(result.data.success).toBe(true);
      
    } catch (error) {
      console.error('[TEST] DELETE request failed:', error);
      console.error('[TEST] This failure demonstrates the bug!');
      throw error;
    }
  });

  /**
   * Test custom headers alongside Authorization header
   * 
   * This verifies that when custom headers are provided, BOTH the custom headers
   * AND the Authorization header should be present in the final request.
   * 
   * EXPECTED TO FAIL on unfixed code:
   * - Custom headers may be present, but Authorization header will be missing
   */
  it('should propagate both Authorization and custom headers for GET requests', async () => {
    console.log('\n=== Testing GET with Custom Headers ===');
    console.log('Token in localStorage:', localStorageMock.getItem('authToken'));
    
    try {
      const result = await apiClient.get('/employees/search', {
        params: { searchTerm: 'John' },
        headers: { 'X-Custom-Header': 'custom-value' }
      });
      
      console.log('GET with custom headers result:', result);
      
      // Verify the headers
      const fetchCall = fetchSpy.mock.calls[0];
      const fetchOptions = fetchCall[1];
      
      console.log('[TEST] Fetch headers with custom:', fetchOptions?.headers);
      
      // ASSERTION: Both Authorization and custom headers SHOULD be present
      expect(fetchOptions.headers).toBeDefined();
      expect(fetchOptions.headers.Authorization).toBeDefined();
      expect(fetchOptions.headers.Authorization).toBe(`Bearer ${MOCK_TOKEN}`);
      expect(fetchOptions.headers['X-Custom-Header']).toBe('custom-value');
      
      // ASSERTION: Request SHOULD succeed
      expect(result.data).toBeDefined();
      expect(result.data.success).toBe(true);
      
    } catch (error) {
      console.error('[TEST] GET with custom headers failed:', error);
      console.error('[TEST] This failure demonstrates the bug!');
      throw error;
    }
  });

  /**
   * Baseline test: Direct apiRequest() call should work
   * 
   * This test verifies that direct calls to apiRequest() (bypassing wrapper methods)
   * DO correctly include the Authorization header. This helps isolate the bug to
   * the wrapper layer.
   * 
   * EXPECTED TO PASS even on unfixed code (confirms bug is in wrapper layer)
   */
  it('BASELINE: Direct apiRequest() call should include Authorization header', async () => {
    console.log('\n=== Testing Direct apiRequest() Call (Baseline) ===');
    console.log('Token in localStorage:', localStorageMock.getItem('authToken'));
    
    const { apiRequest } = await import('../utils/apiClient');
    
    try {
      const result = await apiRequest('/employees/search', { method: 'GET' });
      
      console.log('Direct apiRequest result:', result);
      
      // Verify the Authorization header
      const fetchCall = fetchSpy.mock.calls[0];
      const fetchOptions = fetchCall[1];
      
      console.log('[TEST] Direct call fetch headers:', fetchOptions?.headers);
      
      // ASSERTION: Authorization header SHOULD be present for direct calls
      expect(fetchOptions.headers).toBeDefined();
      expect(fetchOptions.headers.Authorization).toBeDefined();
      expect(fetchOptions.headers.Authorization).toBe(`Bearer ${MOCK_TOKEN}`);
      
      // ASSERTION: Request SHOULD succeed
      expect(result.data).toBeDefined();
      expect(result.data.success).toBe(true);
      
      console.log('[TEST] ✓ Direct apiRequest() works correctly - bug is isolated to wrapper methods');
      
    } catch (error) {
      console.error('[TEST] Direct apiRequest failed:', error);
      console.error('[TEST] Unexpected! Direct calls should work.');
      throw error;
    }
  });
});
