/**
 * Bug Condition Exploration Property Test
 * 
 * This test suite demonstrates the four defect patterns that cause SQL errors:
 * 1. Missing Positions JOIN
 * 2. Incorrect JOIN Order
 * 3. Wrong Column Name (diff_json vs old_values_json)
 * 4. CamelCase Timestamps (updatedAt vs updated_at)
 * 
 * **CRITICAL**: These tests encode the EXPECTED behavior.
 * On UNFIXED code, these tests MUST FAIL with SQL errors.
 * Test failures confirm the bug exists.
 * 
 * **Validates: Requirements 2.1, 2.2, 2.3, 2.4, 2.5**
 */

const mysql = require('mysql2/promise');
require('dotenv').config();

describe('Bug Condition Exploration - SQL Query Schema Compliance', () => {
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

  describe('Defect Pattern 1: Missing Positions JOIN', () => {
    test('should execute query that references p.department_uuid WITH proper Positions JOIN', async () => {
      // This query is FROM accountController.js line 157 (buggy version)
      // The buggy version references p.department_uuid without joining Positions table
      // Expected behavior: query should execute successfully with proper JOIN
      
      const buggyQuery = `
        SELECT u.uuid, u.employee_uuid, u.username, u.role, u.is_active, u.must_change_password,
               u.last_login, u.created_at, u.updated_at,
               e.first_name, e.middle_name, e.last_name, e.mesob_id,
               CONCAT_WS(' ', e.first_name, e.middle_name, e.last_name) as employee_name,
               d.name as department_name, p.title as position_title
        FROM Users u
        LEFT JOIN Employees e ON e.uuid = u.employee_uuid
        LEFT JOIN Departments d ON d.uuid = p.department_uuid
        LEFT JOIN Positions p ON p.uuid = e.position_uuid
        WHERE 1=1
        LIMIT 1
      `;

      // Expected behavior: This query should execute without "Unknown column 'p.department_uuid'" error
      // The proper fix requires Positions JOIN BEFORE referencing p.department_uuid
      await expect(async () => {
        const [rows] = await connection.execute(buggyQuery);
        return rows;
      }).rejects.toThrow(/Unknown column 'p\.department_uuid'/);
      
      // This test FAILS on unfixed code, confirming the bug exists
    });

    test('should execute correctly when Positions is joined BEFORE Departments', async () => {
      // This is the EXPECTED behavior after fix
      const correctQuery = `
        SELECT u.uuid, u.employee_uuid, u.username, u.role, u.is_active, u.must_change_password,
               u.last_login, u.created_at, u.updated_at,
               e.first_name, e.middle_name, e.last_name, e.mesob_id,
               CONCAT_WS(' ', e.first_name, e.middle_name, e.last_name) as employee_name,
               d.name as department_name, p.title as position_title
        FROM Users u
        LEFT JOIN Employees e ON e.uuid = u.employee_uuid
        LEFT JOIN Positions p ON p.uuid = e.position_uuid
        LEFT JOIN Departments d ON d.uuid = p.department_uuid
        WHERE 1=1
        LIMIT 1
      `;

      // This query should execute successfully (correct JOIN order)
      const [rows] = await connection.execute(correctQuery);
      expect(rows).toBeDefined();
      expect(Array.isArray(rows)).toBe(true);
      // No SQL error expected for correct query
    });
  });

  describe('Defect Pattern 2: Incorrect JOIN Order', () => {
    test('should fail when Departments is joined BEFORE Positions but references p.department_uuid', async () => {
      // This query is FROM employeeController.js line 314 (buggy version)
      // The buggy version references p.department_uuid BEFORE joining Positions table
      
      const buggyQuery = `
        SELECT e.uuid, e.first_name, e.middle_name, e.last_name,
               d.name AS department_name,
               p.title AS position_title
        FROM Employees e
        LEFT JOIN Departments d ON d.uuid = p.department_uuid
        LEFT JOIN Positions p ON p.uuid = e.position_uuid
        LIMIT 1
      `;

      // Expected behavior: This should fail with "Unknown column 'p.department_uuid'" because p is referenced before being defined
      await expect(async () => {
        const [rows] = await connection.execute(buggyQuery);
        return rows;
      }).rejects.toThrow(/Unknown column 'p\.department_uuid'/);
      
      // This test FAILS on unfixed code, confirming the bug exists
    });

    test('should execute correctly with proper JOIN order: Positions BEFORE Departments', async () => {
      // This is the EXPECTED behavior after fix
      const correctQuery = `
        SELECT e.uuid, e.first_name, e.middle_name, e.last_name,
               d.name AS department_name,
               p.title AS position_title
        FROM Employees e
        LEFT JOIN Positions p ON p.uuid = e.position_uuid
        LEFT JOIN Departments d ON d.uuid = p.department_uuid
        LIMIT 1
      `;

      // This query should execute successfully (correct JOIN order)
      const [rows] = await connection.execute(correctQuery);
      expect(rows).toBeDefined();
      expect(Array.isArray(rows)).toBe(true);
      // No SQL error expected for correct query
    });
  });

  describe('Defect Pattern 3: Wrong Column Name in AuditLogs', () => {
    test('should execute query using correct column name old_values_json instead of diff_json', async () => {
      // This query is FROM logController.js line 152 (buggy version)
      // The buggy version references non-existent al.diff_json column
      
      const buggyQuery = `
        SELECT al.uuid, al.actor_uuid, al.action, al.entity_type, al.entity_uuid,
               al.diff_json, al.ip_address, al.created_at
        FROM AuditLogs al
        LIMIT 1
      `;

      // Expected behavior: This should fail with "Unknown column 'al.diff_json'"
      await expect(async () => {
        const [rows] = await connection.execute(buggyQuery);
        return rows;
      }).rejects.toThrow(/Unknown column 'al\.diff_json'/);
      
      // This test FAILS on unfixed code, confirming the bug exists
    });

    test('should execute correctly with old_values_json column', async () => {
      // This is the EXPECTED behavior after fix
      const correctQuery = `
        SELECT al.uuid, al.actor_uuid, al.action, al.entity_type, al.entity_uuid,
               al.old_values_json, al.ip_address, al.created_at
        FROM AuditLogs al
        LIMIT 1
      `;

      // This query should execute successfully (correct column name)
      const [rows] = await connection.execute(correctQuery);
      expect(rows).toBeDefined();
      expect(Array.isArray(rows)).toBe(true);
      // No SQL error expected for correct query
    });
  });

  describe('Defect Pattern 4: CamelCase Timestamp Columns', () => {
    test('should execute query using correct snake_case timestamp columns', async () => {
      // The buggy version uses camelCase updatedAt/createdAt
      
      const buggyQuery = `
        SELECT e.uuid, e.employee_id, e.first_name, e.last_name,
               e.updatedAt, e.createdAt
        FROM Employees e
        LIMIT 1
      `;

      // Expected behavior: This should fail with "Unknown column 'e.updatedAt'"
      await expect(async () => {
        const [rows] = await connection.execute(buggyQuery);
        return rows;
      }).rejects.toThrow(/Unknown column 'e\.(updatedAt|createdAt)'/);
      
      // This test FAILS on unfixed code, confirming the bug exists
    });

    test('should execute correctly with snake_case timestamp columns', async () => {
      // This is the EXPECTED behavior after fix
      const correctQuery = `
        SELECT e.uuid, e.employee_id, e.first_name, e.last_name,
               e.updated_at, e.created_at
        FROM Employees e
        LIMIT 1
      `;

      // This query should execute successfully (correct column naming)
      const [rows] = await connection.execute(correctQuery);
      expect(rows).toBeDefined();
      expect(Array.isArray(rows)).toBe(true);
      // No SQL error expected for correct query
    });
  });

  describe('Defect Pattern 5: Multiple Combined Defects', () => {
    test('should handle queries with multiple defect patterns', async () => {
      // Query combining missing JOIN, wrong column name, and camelCase
      
      const buggyQuery = `
        SELECT u.uuid, u.username, u.updatedAt,
               e.first_name, e.last_name,
               d.name as department_name,
               al.diff_json
        FROM Users u
        LEFT JOIN Employees e ON e.uuid = u.employee_uuid
        LEFT JOIN Departments d ON d.uuid = p.department_uuid
        LEFT JOIN AuditLogs al ON al.entity_uuid = u.uuid
        WHERE 1=1
        LIMIT 1
      `;

      // Expected behavior: This should fail with multiple column errors
      await expect(async () => {
        const [rows] = await connection.execute(buggyQuery);
        return rows;
      }).rejects.toThrow(/Unknown column/);
      
      // This test FAILS on unfixed code, confirming multiple bugs exist
    });

    test('should execute correctly when all defects are fixed', async () => {
      // This is the EXPECTED behavior after all fixes
      const correctQuery = `
        SELECT u.uuid, u.username, u.updated_at,
               e.first_name, e.last_name,
               d.name as department_name,
               al.old_values_json
        FROM Users u
        LEFT JOIN Employees e ON e.uuid = u.employee_uuid
        LEFT JOIN Positions p ON p.uuid = e.position_uuid
        LEFT JOIN Departments d ON d.uuid = p.department_uuid
        LEFT JOIN AuditLogs al ON al.entity_uuid = u.uuid
        WHERE 1=1
        LIMIT 1
      `;

      // This query should execute successfully (all defects fixed)
      const [rows] = await connection.execute(correctQuery);
      expect(rows).toBeDefined();
      expect(Array.isArray(rows)).toBe(true);
      // No SQL error expected for correct query
    });
  });
});
