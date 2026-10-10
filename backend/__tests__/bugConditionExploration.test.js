/**
 * Bug Condition Exploration Test: Duplicate RBAC APIs Causing 404 and Schema Errors
 * 
 * **Property 1: Bug Condition** - Duplicate RBAC APIs exist and conflict
 * 
 * CRITICAL: This test MUST FAIL on unfixed code - failure confirms the bug exists
 * DO NOT attempt to fix the test or the code when it fails
 * 
 * This test encodes the EXPECTED behavior (unified API). When run on unfixed code,
 * it will FAIL, demonstrating that duplicate APIs exist. After implementing the fix,
 * this same test will PASS, confirming the expected behavior is satisfied.
 * 
 * **Validates: Requirements 1.1, 1.2, 1.3, 1.5, 2.1, 2.2, 2.3**
 */

const fs = require('fs');
const path = require('path');

describe('Bug Condition Exploration: Duplicate RBAC APIs', () => {
  const backendRoot = path.join(__dirname, '..');
  const frontendRoot = path.join(__dirname, '../../frontend');
  
  describe('Backend Duplication Detection', () => {
    test('Should have ONLY unified role-management controller (not duplicates)', () => {
      // Expected: Only roleManagementController.js exists
      const roleManagementController = path.join(backendRoot, 'src/controllers/roleManagementController.js');
      
      // Bug condition: These duplicate controllers should NOT exist
      const rbacController = path.join(backendRoot, 'src/controllers/rbacController.js');
      const moduleRoleController = path.join(backendRoot, 'src/controllers/moduleRoleController.js');
      
      // Assert unified controller exists
      expect(fs.existsSync(roleManagementController)).toBe(true);
      
      // Assert duplicates DO NOT exist (will FAIL on unfixed code, proving bug)
      expect(fs.existsSync(rbacController)).toBe(false);
      expect(fs.existsSync(moduleRoleController)).toBe(false);
    });

    test('Should have ONLY unified role-management routes (not duplicates)', () => {
      // Expected: Only roleManagementRoutes.js exists
      const roleManagementRoutes = path.join(backendRoot, 'src/routes/roleManagementRoutes.js');
      
      // Bug condition: These duplicate route files should NOT exist
      const rbacRoutes = path.join(backendRoot, 'src/routes/rbacRoutes.js');
      const moduleRoleRoutes = path.join(backendRoot, 'src/routes/moduleRoleRoutes.js');
      
      // Assert unified routes exist
      expect(fs.existsSync(roleManagementRoutes)).toBe(true);
      
      // Assert duplicates DO NOT exist (will FAIL on unfixed code, proving bug)
      expect(fs.existsSync(rbacRoutes)).toBe(false);
      expect(fs.existsSync(moduleRoleRoutes)).toBe(false);
    });

    test('Should register ONLY /api/role-management/* routes in app.js', () => {
      const appJsPath = path.join(backendRoot, 'src/app.js');
      const appJsContent = fs.readFileSync(appJsPath, 'utf8');
      
      // Expected: Unified route registration exists
      expect(appJsContent).toContain('app.use("/api/role-management", roleManagementRoutes)');
      
      // Bug condition: Duplicate route registrations should NOT exist (will FAIL on unfixed code)
      expect(appJsContent).not.toContain('app.use("/api/rbac", rbacRoutes)');
      expect(appJsContent).not.toContain('app.use("/api/module-roles", moduleRoleRoutes)');
      
      // Also check that duplicate imports don't exist
      expect(appJsContent).not.toContain('require("./routes/rbacRoutes")');
      expect(appJsContent).not.toContain('require("./routes/moduleRoleRoutes")');
    });
  });

  describe('Frontend Duplication Detection', () => {
    test('Should have ONLY ONE RoleManagementPage component (not duplicates)', () => {
      // Expected: Only one RoleManagementPage in /pages/RoleManagementPage.jsx
      const unifiedRolePage = path.join(frontendRoot, 'src/pages/RoleManagementPage.jsx');
      
      // Bug condition: Duplicate page should NOT exist
      const duplicateRolePage = path.join(frontendRoot, 'src/pages/rbac/RoleManagementPage.jsx');
      
      // Assert unified page exists
      expect(fs.existsSync(unifiedRolePage)).toBe(true);
      
      // Assert duplicate does NOT exist (will FAIL on unfixed code, proving bug)
      expect(fs.existsSync(duplicateRolePage)).toBe(false);
    });

    test('Should have ONLY /admin/roles route (not duplicate /rbac/roles)', () => {
      const appRouterPath = path.join(frontendRoot, 'src/routes/AppRouter.jsx');
      const appRouterContent = fs.readFileSync(appRouterPath, 'utf8');
      
      // Expected: Unified route exists
      expect(appRouterContent).toContain('path="admin/roles"');
      
      // Bug condition: Duplicate route should NOT exist (will FAIL on unfixed code)
      expect(appRouterContent).not.toContain('path="rbac/roles"');
    });
  });

  describe('API Endpoint Behavior (Expected After Fix)', () => {
    test('Documentation: Expected unified API structure', () => {
      // This is a documentation test that describes expected behavior
      const expectedUnifiedAPI = {
        baseURL: '/api/role-management',
        endpoints: [
          'GET /api/role-management/roles',
          'GET /api/role-management/roles/:uuid',
          'POST /api/role-management/roles',
          'PUT /api/role-management/roles/:uuid',
          'DELETE /api/role-management/roles/:uuid',
          'GET /api/role-management/permissions',
          'GET /api/role-management/scopes',
          'PUT /api/role-management/roles/:uuid/permissions'
        ]
      };
      
      // This test documents the expected behavior
      expect(expectedUnifiedAPI.baseURL).toBe('/api/role-management');
      expect(expectedUnifiedAPI.endpoints.length).toBeGreaterThan(0);
    });

    test('Documentation: Deprecated APIs that should NOT exist', () => {
      // These are the duplicate/conflicting APIs that caused the bug
      const deprecatedAPIs = [
        '/api/module-role/*',  // Old module-based RBAC
        '/api/rbac/*',         // Old occupation-based RBAC
        '/api/module-roles/*'  // Another duplicate
      ];
      
      // After fix, these should all be removed
      deprecatedAPIs.forEach(api => {
        expect(api).toMatch(/\/(module-role|rbac|module-roles)\//);
      });
    });
  });
});
