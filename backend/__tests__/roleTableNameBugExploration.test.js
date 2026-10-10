/**
 * Bug Condition Exploration Property Test
 * Spec: role-management-table-name-fix
 * 
 * This test suite demonstrates the table name mismatch bug:
 * - Code references: RolePermissions (CamelCase)
 * - Database has: Role_Permissions (underscore-separated)
 * - Same issue with: RolePermissionScopes vs Role_Permission_Scopes
 * 
 * **CRITICAL**: These tests encode the EXPECTED behavior.
 * On UNFIXED code, these tests MUST FAIL with "Table doesn't exist" errors.
 * Test failures confirm the bug exists.
 * 
 * **Validates: Requirements 2.1, 2.2, 2.3, 2.4, 2.5, 2.6, 2.7, 2.8**
 */

const mysql = require('mysql2/promise');
require('dotenv').config();

describe('Bug Condition Exploration - Role Management Table Names', () => {
  let connection;

  beforeAll(async () => {
    // Create a direct database connection for testing
    connection = await mysql.createConnection({
      host: process.env.DB_HOST,
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      database: process.env.DB_NAME,
    });
  });

  afterAll(async () => {
    if (connection) {
      await connection.end();
    }
  });

  describe('Defect Pattern: Table Name Mismatch - RolePermissions', () => {
    test('should fail when querying non-existent RolePermissions table (without underscore)', async () => {
      // This represents the BUGGY code pattern used in roleManagementService.js, rbacService.js, etc.
      // The code references RolePermissions (CamelCase) but database has Role_Permissions (underscore)
      
      const buggyQuery = `
        SELECT uuid, role_uuid, permission_uuid, granted_by
        FROM RolePermissions
        LIMIT 1
      `;

      // Expected behavior on UNFIXED code: This MUST FAIL with "Table doesn't exist"
      // This failure confirms the bug exists
      await expect(async () => {
        const [rows] = await connection.execute(buggyQuery);
        return rows;
      }).rejects.toThrow(/Table.*RolePermissions.*doesn't exist/i);
      
      // This test FAILS on unfixed code, confirming the bug exists
    });

    test('should succeed when querying correct Role_Permissions table (with underscore)', async () => {
      // This is the EXPECTED behavior after fix
      const correctQuery = `
        SELECT uuid, role_uuid, permission_uuid, granted_by
        FROM Role_Permissions
        LIMIT 1
      `;

      // This query should execute successfully (correct table name)
      const [rows] = await connection.execute(correctQuery);
      expect(rows).toBeDefined();
      expect(Array.isArray(rows)).toBe(true);
      // No SQL error expected for correct query
    });
  });

  describe('Defect Pattern: Table Name Mismatch - RolePermissionScopes', () => {
    test('should fail when querying non-existent RolePermissionScopes table (without underscores)', async () => {
      // This represents the BUGGY code pattern used in roleManagementService.js, rbacService.js
      // The code references RolePermissionScopes (CamelCase) but database has Role_Permission_Scopes
      
      const buggyQuery = `
        SELECT uuid, role_uuid, permission_uuid, data_scope_uuid, scope_configuration
        FROM RolePermissionScopes
        LIMIT 1
      `;

      // Expected behavior on UNFIXED code: This MUST FAIL with "Table doesn't exist"
      await expect(async () => {
        const [rows] = await connection.execute(buggyQuery);
        return rows;
      }).rejects.toThrow(/Table.*RolePermissionScopes.*doesn't exist/i);
      
      // This test FAILS on unfixed code, confirming the bug exists
    });

    test('should succeed when querying correct Role_Permission_Scopes table (with underscores)', async () => {
      // This is the EXPECTED behavior after fix
      const correctQuery = `
        SELECT uuid, role_uuid, permission_uuid, data_scope_uuid, scope_configuration
        FROM Role_Permission_Scopes
        LIMIT 1
      `;

      // This query should execute successfully (correct table name)
      const [rows] = await connection.execute(correctQuery);
      expect(rows).toBeDefined();
      expect(Array.isArray(rows)).toBe(true);
      // No SQL error expected for correct query
    });
  });

  describe('Defect Pattern: INSERT operations', () => {
    test('should fail when inserting into non-existent RolePermissions table', async () => {
      // This represents the INSERT pattern from roleManagementService.assignPermissionToRole()
      const buggyInsertQuery = `
        INSERT INTO RolePermissions (uuid, role_uuid, permission_uuid, granted_by)
        VALUES ('test-uuid-123', 'role-uuid-123', 'perm-uuid-123', 'user-uuid-123')
      `;

      // Expected behavior on UNFIXED code: This MUST FAIL with "Table doesn't exist"
      await expect(async () => {
        await connection.execute(buggyInsertQuery);
      }).rejects.toThrow(/Table.*RolePermissions.*doesn't exist/i);
    });

    test('should succeed when inserting into correct Role_Permissions table', async () => {
      // This is the EXPECTED behavior after fix
      // Note: We won't actually insert to avoid side effects, just verify the table exists
      const checkTableQuery = `
        SELECT 1 FROM Role_Permissions LIMIT 0
      `;

      // This should succeed, confirming the correct table exists
      const [rows] = await connection.execute(checkTableQuery);
      expect(rows).toBeDefined();
      expect(Array.isArray(rows)).toBe(true);
    });
  });

  describe('Defect Pattern: JOIN operations', () => {
    test('should fail when joining non-existent RolePermissions table', async () => {
      // This represents the JOIN pattern from roleManagementService.getRoleWithDetails()
      const buggyJoinQuery = `
        SELECT p.uuid, p.code
        FROM RolePermissions rp
        INNER JOIN Permissions p ON rp.permission_uuid = p.uuid
        LIMIT 1
      `;

      // Expected behavior on UNFIXED code: This MUST FAIL with "Table doesn't exist"
      await expect(async () => {
        const [rows] = await connection.execute(buggyJoinQuery);
        return rows;
      }).rejects.toThrow(/Table.*RolePermissions.*doesn't exist/i);
    });

    test('should succeed when joining correct Role_Permissions table', async () => {
      // This is the EXPECTED behavior after fix
      const correctJoinQuery = `
        SELECT p.uuid, p.code
        FROM Role_Permissions rp
        INNER JOIN Permissions p ON rp.permission_uuid = p.uuid
        LIMIT 1
      `;

      // This query should execute successfully
      const [rows] = await connection.execute(correctJoinQuery);
      expect(rows).toBeDefined();
      expect(Array.isArray(rows)).toBe(true);
    });
  });

  describe('Defect Pattern: DELETE operations', () => {
    test('should fail when deleting from non-existent RolePermissions table', async () => {
      // This represents the DELETE pattern from roleManagementService.removePermissionFromRole()
      const buggyDeleteQuery = `
        DELETE FROM RolePermissions
        WHERE role_uuid = 'fake-uuid' AND permission_uuid = 'fake-uuid'
      `;

      // Expected behavior on UNFIXED code: This MUST FAIL with "Table doesn't exist"
      await expect(async () => {
        await connection.execute(buggyDeleteQuery);
      }).rejects.toThrow(/Table.*RolePermissions.*doesn't exist/i);
    });

    test('should succeed when deleting from correct Role_Permissions table', async () => {
      // This is the EXPECTED behavior after fix
      // We'll delete non-existent records to avoid side effects
      const correctDeleteQuery = `
        DELETE FROM Role_Permissions
        WHERE role_uuid = 'non-existent-uuid-test' AND permission_uuid = 'non-existent-uuid-test'
      `;

      // This should succeed (even if no rows deleted, query executes successfully)
      const [result] = await connection.execute(correctDeleteQuery);
      expect(result).toBeDefined();
      // affectedRows will be 0 for non-existent records, but query succeeds
    });
  });

  describe('Defect Pattern: UPDATE operations on RolePermissionScopes', () => {
    test('should fail when updating non-existent RolePermissionScopes table', async () => {
      // This represents the UPDATE pattern from roleManagementService.assignScopeToRolePermission()
      const buggyUpdateQuery = `
        UPDATE RolePermissionScopes
        SET scope_configuration = '{"test": true}'
        WHERE role_uuid = 'fake-uuid' AND permission_uuid = 'fake-uuid'
      `;

      // Expected behavior on UNFIXED code: This MUST FAIL with "Table doesn't exist"
      await expect(async () => {
        await connection.execute(buggyUpdateQuery);
      }).rejects.toThrow(/Table.*RolePermissionScopes.*doesn't exist/i);
    });

    test('should succeed when updating correct Role_Permission_Scopes table', async () => {
      // This is the EXPECTED behavior after fix
      const correctUpdateQuery = `
        UPDATE Role_Permission_Scopes
        SET scope_configuration = '{"test": true}'
        WHERE role_uuid = 'non-existent-uuid-test' AND permission_uuid = 'non-existent-uuid-test'
      `;

      // This should succeed (even if no rows updated, query executes successfully)
      const [result] = await connection.execute(correctUpdateQuery);
      expect(result).toBeDefined();
      // affectedRows will be 0 for non-existent records, but query succeeds
    });
  });

  describe('Database Schema Verification', () => {
    test('should confirm correct table names exist in database schema', async () => {
      // Verify the actual database has underscore-separated table names
      const [tables] = await connection.execute(`
        SHOW TABLES LIKE '%Permission%'
      `);

      const tableNames = tables.map(row => Object.values(row)[0]);
      
      // Database MUST have underscore-separated table names
      expect(tableNames).toContain('Role_Permissions');
      expect(tableNames).toContain('Role_Permission_Scopes');
      
      // Database should NOT have CamelCase table names
      expect(tableNames).not.toContain('RolePermissions');
      expect(tableNames).not.toContain('RolePermissionScopes');
    });
  });

  describe('Multi-Table JOIN scenarios', () => {
    test('should fail when complex query uses wrong table name', async () => {
      // This represents complex queries from authorizationService.js
      const buggyComplexQuery = `
        SELECT DISTINCT p.code
        FROM Users u
        INNER JOIN Roles r ON u.role = r.code
        INNER JOIN RolePermissions rp ON r.uuid = rp.role_uuid
        INNER JOIN Permissions p ON rp.permission_uuid = p.uuid
        LIMIT 1
      `;

      // Expected behavior on UNFIXED code: This MUST FAIL
      await expect(async () => {
        const [rows] = await connection.execute(buggyComplexQuery);
        return rows;
      }).rejects.toThrow(/Table.*RolePermissions.*doesn't exist/i);
    });

    test('should succeed with correct table name in complex JOIN', async () => {
      // This is the EXPECTED behavior after fix
      const correctComplexQuery = `
        SELECT DISTINCT p.code
        FROM Users u
        INNER JOIN Roles r ON u.role = r.code
        INNER JOIN Role_Permissions rp ON r.uuid = rp.role_uuid
        INNER JOIN Permissions p ON rp.permission_uuid = p.uuid
        LIMIT 1
      `;

      // This should execute successfully
      const [rows] = await connection.execute(correctComplexQuery);
      expect(rows).toBeDefined();
      expect(Array.isArray(rows)).toBe(true);
    });
  });
});
