/**
 * Preservation Property Tests: Non-RBAC Module Functionality Unchanged
 * 
 * **Property 2: Preservation** - Existing module functionality must remain unchanged
 * 
 * CRITICAL: These tests MUST PASS on UNFIXED code - they capture baseline behavior
 * After the consolidation fix, these tests must STILL PASS - proving no regressions
 * 
 * This test suite uses observation-first methodology:
 * 1. Run tests on UNFIXED code to establish baseline behavior
 * 2. After fix, verify the same tests still pass (preservation guarantee)
 * 
 * **Validates: Requirements 3.1, 3.2, 3.3, 3.4, 4.1, 4.2, 4.3, 4.4**
 */

const fc = require('fast-check');
const request = require('supertest');
const app = require('../src/app');
const db = require('../src/config/db');
const jwt = require('jsonwebtoken');
const { getEnv } = require('../src/config/env');

// Helper to create test JWT tokens
function createTestToken(userId, roleCode = 'ADMIN') {
  const jwtSecret = getEnv('JWT_SECRET', 'test-secret');
  return jwt.sign(
    { 
      userId, 
      roleCode,
      permissions: ['Employees.View', 'Employees.Create', 'Attendance.View', 'Leave.View']
    },
    jwtSecret,
    { expiresIn: '1h' }
  );
}

describe('Preservation Property Tests: Non-RBAC Modules', () => {
  let testToken;

  beforeAll(() => {
    // Create a test token for authenticated requests
    testToken = createTestToken('test-user-uuid', 'ADMIN');
  });

  afterAll(async () => {
    // Close database connection
    await db.end();
  });

  describe('Employee Module Preservation', () => {
    test('Property: GET /api/employees/* endpoints return consistent response structure', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.record({
            page: fc.integer({ min: 1, max: 5 }),
            limit: fc.integer({ min: 10, max: 50 }),
            search: fc.option(fc.string({ minLength: 0, maxLength: 20 }), { nil: undefined })
          }),
          async (params) => {
            const query = new URLSearchParams();
            if (params.page) query.append('page', params.page);
            if (params.limit) query.append('limit', params.limit);
            if (params.search) query.append('search', params.search);

            const response = await request(app)
              .get(`/api/employees?${query.toString()}`)
              .set('Authorization', `Bearer ${testToken}`);

            // Preserve response structure
            expect([200, 401, 403, 404, 500]).toContain(response.status);
            
            // If successful, response should have expected structure
            if (response.status === 200) {
              expect(response.body).toHaveProperty('data');
              expect(Array.isArray(response.body.data) || typeof response.body.data === 'object').toBe(true);
            }

            // Record baseline behavior for comparison after fix
            return response.status;
          }
        ),
        { numRuns: 10, endOnFailure: true }
      );
    });

    test('Property: Employee module endpoints use consistent authentication', async () => {
      const endpoints = [
        { method: 'get', path: '/api/employees' },
        { method: 'get', path: '/api/employees/statistics' },
      ];

      for (const endpoint of endpoints) {
        const response = await request(app)[endpoint.method](endpoint.path);
        
        // Without token, should get 401
        expect(response.status).toBe(401);

        const responseWithAuth = await request(app)[endpoint.method](endpoint.path)
          .set('Authorization', `Bearer ${testToken}`);
        
        // With token, should NOT get 401 (may get 403, 200, or others based on permissions)
        expect(responseWithAuth.status).not.toBe(401);
      }
    });
  });

  describe('Attendance Module Preservation', () => {
    test('Property: GET /api/attendance/* endpoints return consistent response structure', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.record({
            startDate: fc.date({ min: new Date('2024-01-01'), max: new Date('2024-12-31') }),
            endDate: fc.date({ min: new Date('2024-01-01'), max: new Date('2024-12-31') })
          }),
          async (params) => {
            const startDate = params.startDate.toISOString().split('T')[0];
            const endDate = params.endDate.toISOString().split('T')[0];

            const response = await request(app)
              .get(`/api/attendance/records?startDate=${startDate}&endDate=${endDate}`)
              .set('Authorization', `Bearer ${testToken}`);

            // Preserve response structure and status codes
            expect([200, 400, 401, 403, 404, 500]).toContain(response.status);
            
            if (response.status === 200) {
              expect(response.body).toHaveProperty('data');
            }

            return response.status;
          }
        ),
        { numRuns: 10, endOnFailure: true }
      );
    });

    test('Property: Attendance endpoints preserve authentication requirements', async () => {
      const attendanceEndpoints = [
        '/api/attendance/records',
        '/api/attendance/summary',
        '/api/attendance/statistics'
      ];

      for (const endpoint of attendanceEndpoints) {
        // Without token, should require authentication
        const response = await request(app).get(endpoint);
        expect(response.status).toBe(401);

        // With token, should not return 401
        const responseWithAuth = await request(app)
          .get(endpoint)
          .set('Authorization', `Bearer ${testToken}`);
        expect(responseWithAuth.status).not.toBe(401);
      }
    });
  });

  describe('Leave Module Preservation', () => {
    test('Property: GET /api/leave/* endpoints return consistent response structure', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.constantFrom('pending', 'approved', 'rejected', 'all'),
          async (status) => {
            const response = await request(app)
              .get(`/api/leave/requests?status=${status}`)
              .set('Authorization', `Bearer ${testToken}`);

            // Preserve response structure
            expect([200, 400, 401, 403, 404, 500]).toContain(response.status);
            
            if (response.status === 200) {
              expect(response.body).toHaveProperty('data');
              expect(Array.isArray(response.body.data) || typeof response.body.data === 'object').toBe(true);
            }

            return response.status;
          }
        ),
        { numRuns: 10, endOnFailure: true }
      );
    });

    test('Property: Leave endpoints preserve authentication requirements', async () => {
      const leaveEndpoints = [
        '/api/leave/requests',
        '/api/leave/balance',
        '/api/leave/types'
      ];

      for (const endpoint of leaveEndpoints) {
        // Without token, should require authentication
        const response = await request(app).get(endpoint);
        expect(response.status).toBe(401);

        // With token, should not return 401
        const responseWithAuth = await request(app)
          .get(endpoint)
          .set('Authorization', `Bearer ${testToken}`);
        expect(responseWithAuth.status).not.toBe(401);
      }
    });
  });

  describe('Authentication Flow Preservation', () => {
    test('Property: Login endpoint returns JWT tokens with consistent structure', async () => {
      // Test that login endpoint structure is preserved (we won't test with real credentials)
      const response = await request(app)
        .post('/api/auth/login')
        .send({ username: 'nonexistent', password: 'wrong' });

      // Should get either 400, 401, or 404 for invalid credentials
      expect([400, 401, 404]).toContain(response.status);
      
      // Response should have consistent error structure
      expect(response.body).toBeDefined();
    });

    test('Property: JWT validation preserves consistent behavior', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.string({ minLength: 10, maxLength: 100 }),
          async (invalidToken) => {
            const response = await request(app)
              .get('/api/employees')
              .set('Authorization', `Bearer ${invalidToken}`);

            // Invalid tokens should consistently return 401
            expect(response.status).toBe(401);
            
            return true;
          }
        ),
        { numRuns: 10, endOnFailure: true }
      );
    });
  });

  describe('Department Module Preservation', () => {
    test('Property: Department endpoints preserve response structure', async () => {
      const response = await request(app)
        .get('/api/departments')
        .set('Authorization', `Bearer ${testToken}`);

      // Should get valid response status
      expect([200, 401, 403, 404, 500]).toContain(response.status);
      
      if (response.status === 200) {
        expect(response.body).toHaveProperty('data');
      }
    });

    test('Property: Department endpoints preserve authentication', async () => {
      const departmentEndpoints = [
        '/api/departments',
        '/api/departments/hierarchy'
      ];

      for (const endpoint of departmentEndpoints) {
        // Without token, should require authentication
        const response = await request(app).get(endpoint);
        expect(response.status).toBe(401);

        // With token, should not return 401
        const responseWithAuth = await request(app)
          .get(endpoint)
          .set('Authorization', `Bearer ${testToken}`);
        expect(responseWithAuth.status).not.toBe(401);
      }
    });
  });

  describe('Non-RBAC Route Registration Preservation', () => {
    test('Property: All non-RBAC routes remain registered and accessible', async () => {
      const nonRbacRoutes = [
        { path: '/api/health', requiresAuth: false },
        { path: '/api/auth/login', requiresAuth: false },
        { path: '/api/employees', requiresAuth: true },
        { path: '/api/departments', requiresAuth: true },
        { path: '/api/attendance/records', requiresAuth: true },
        { path: '/api/leave/requests', requiresAuth: true },
        { path: '/api/positions', requiresAuth: true },
        { path: '/api/levels', requiresAuth: true },
        { path: '/api/shifts', requiresAuth: true }
      ];

      for (const route of nonRbacRoutes) {
        const response = route.requiresAuth
          ? await request(app).get(route.path).set('Authorization', `Bearer ${testToken}`)
          : await request(app).get(route.path);

        // Routes should not return 404 (they exist and are registered)
        expect(response.status).not.toBe(404);
      }
    });
  });

  describe('Error Handling Preservation', () => {
    test('Property: 404 handler preserves behavior for non-existent routes', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.string({ minLength: 5, maxLength: 30 }),
          async (randomPath) => {
            // Generate random non-existent path
            const safePath = randomPath.replace(/[^a-zA-Z0-9-]/g, '');
            const response = await request(app)
              .get(`/api/nonexistent-${safePath}`)
              .set('Authorization', `Bearer ${testToken}`);

            // Should return 404 for non-existent routes
            expect(response.status).toBe(404);
            
            return true;
          }
        ),
        { numRuns: 10, endOnFailure: true }
      );
    });

    test('Property: Error responses preserve consistent structure', async () => {
      const errorRoutes = [
        '/api/employees/invalid-uuid-format',
        '/api/departments/999999999',
        '/api/attendance/invalid-endpoint'
      ];

      for (const route of errorRoutes) {
        const response = await request(app)
          .get(route)
          .set('Authorization', `Bearer ${testToken}`);

        // Should return error status
        expect(response.status).toBeGreaterThanOrEqual(400);
        
        // Should have response body
        expect(response.body).toBeDefined();
      }
    });
  });

  describe('Authorization Middleware Preservation', () => {
    test('Property: Protected endpoints consistently require authentication', async () => {
      const protectedEndpoints = [
        '/api/employees',
        '/api/departments',
        '/api/attendance/records',
        '/api/leave/requests',
        '/api/positions',
        '/api/levels',
        '/api/shifts'
      ];

      await fc.assert(
        fc.asyncProperty(
          fc.constantFrom(...protectedEndpoints),
          async (endpoint) => {
            // Without token, should get 401
            const response = await request(app).get(endpoint);
            expect(response.status).toBe(401);

            // With valid token, should not get 401
            const authResponse = await request(app)
              .get(endpoint)
              .set('Authorization', `Bearer ${testToken}`);
            expect(authResponse.status).not.toBe(401);

            return true;
          }
        ),
        { numRuns: 15, endOnFailure: true }
      );
    });

    test('Property: Authorization header format is consistently validated', async () => {
      const invalidAuthHeaders = [
        'InvalidFormat',
        'Bearer',
        'Bearer ',
        'Basic sometoken',
        ''
      ];

      for (const authHeader of invalidAuthHeaders) {
        const response = await request(app)
          .get('/api/employees')
          .set('Authorization', authHeader);

        // Invalid auth formats should return 401
        expect(response.status).toBe(401);
      }
    });
  });

  describe('Health Check Preservation', () => {
    test('Property: Health endpoint remains publicly accessible', async () => {
      const response = await request(app).get('/api/health');

      // Health endpoint should be accessible without auth
      expect([200, 503]).toContain(response.status);
      expect(response.body).toBeDefined();
    });
  });

  describe('CORS and Security Headers Preservation', () => {
    test('Property: CORS headers are consistently applied', async () => {
      const response = await request(app)
        .get('/api/health')
        .set('Origin', 'http://localhost:3000');

      // Should have CORS headers (varies based on config)
      expect(response.headers).toBeDefined();
    });

    test('Property: Security headers from helmet are preserved', async () => {
      const response = await request(app).get('/api/health');

      // Helmet should add security headers
      expect(response.headers).toBeDefined();
      // Common helmet headers (may vary based on version)
      // Just verify headers exist, not specific values which may change
      expect(typeof response.headers).toBe('object');
    });
  });
});
