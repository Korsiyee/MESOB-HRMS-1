/**
 * Preservation Property Tests
 * Spec: role-management-table-name-fix
 * 
 * This test suite verifies that queries NOT involving RolePermissions or
 * RolePermissionScopes tables continue to work unchanged after the fix.
 * 
 * **IMPORTANT**: These tests should PASS both before and after the fix,
 * confirming no regressions occurred.
 * 
 * **Validates: Requirements 3.1, 3.2, 3.3, 3.4, 3.5, 3.6, 3.7, 3.8**
 */

const mysql = require('mysql2/promise');
require('dotenv').config();

describe('Preservation Property Tests - Non-Affected Queries', () => {
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

  describe('Preservation: Users table queries unchanged', () => {
    test('should query Users table successfully', async () => {
      const query = `
        SELECT uuid, username, role, is_active, created_at
        FROM Users
        LIMIT 5
      `;

      const [rows] = await connection.execute(query);
      expect(rows).toBeDefined();
      expect(Array.isArray(rows)).toBe(true);
      // No SQL errors expected
    });

    test('should query Users with JOIN to Roles successfully', async () => {
      const query = `
        SELECT u.uuid, u.username, r.name as role_name, r.code as role_code
        FROM Users u
        LEFT JOIN Roles r ON u.role_uuid = r.uuid
        LIMIT 5
      `;

      const [rows] = await connection.execute(query);
      expect(rows).toBeDefined();
      expect(Array.isArray(rows)).toBe(true);
    });
  });

  describe('Preservation: Roles table queries unchanged', () => {
    test('should query Roles table successfully', async () => {
      const query = `
        SELECT uuid, code, name, description, is_active, created_at
        FROM Roles
        LIMIT 10
      `;

      const [rows] = await connection.execute(query);
      expect(rows).toBeDefined();
      expect(Array.isArray(rows)).toBe(true);
    });

    test('should query Roles with system role filtering', async () => {
      const query = `
        SELECT uuid, code, name
        FROM Roles
        WHERE is_system_role = TRUE
      `;

      const [rows] = await connection.execute(query);
      expect(rows).toBeDefined();
      expect(Array.isArray(rows)).toBe(true);
    });
  });

  describe('Preservation: Permissions table queries unchanged', () => {
    test('should query Permissions table successfully', async () => {
      const query = `
        SELECT uuid, code, name, action, description, is_active
        FROM Permissions
        LIMIT 10
      `;

      const [rows] = await connection.execute(query);
      expect(rows).toBeDefined();
      expect(Array.isArray(rows)).toBe(true);
    });

    test('should query Permissions with Resources JOIN', async () => {
      const query = `
        SELECT p.uuid, p.code, p.name, r.name as resource_name, r.code as resource_code
        FROM Permissions p
        INNER JOIN Resources r ON p.resource_uuid = r.uuid
        LIMIT 10
      `;

      const [rows] = await connection.execute(query);
      expect(rows).toBeDefined();
      expect(Array.isArray(rows)).toBe(true);
    });
  });

  describe('Preservation: DataScopes table queries unchanged', () => {
    test('should query DataScopes table successfully', async () => {
      const query = `
        SELECT uuid, code, name, scope_type, description
        FROM DataScopes
        LIMIT 10
      `;

      const [rows] = await connection.execute(query);
      expect(rows).toBeDefined();
      expect(Array.isArray(rows)).toBe(true);
    });
  });

  describe('Preservation: Resources table queries unchanged', () => {
    test('should query Resources table successfully', async () => {
      const query = `
        SELECT uuid, code, name, description, display_order
        FROM Resources
        ORDER BY display_order
        LIMIT 10
      `;

      const [rows] = await connection.execute(query);
      expect(rows).toBeDefined();
      expect(Array.isArray(rows)).toBe(true);
    });
  });

  describe('Preservation: Employees table queries unchanged', () => {
    test('should query Employees table successfully', async () => {
      const query = `
        SELECT uuid, employee_id, first_name, middle_name, last_name, 
               mesob_id, status, created_at, updated_at
        FROM Employees
        LIMIT 5
      `;

      const [rows] = await connection.execute(query);
      expect(rows).toBeDefined();
      expect(Array.isArray(rows)).toBe(true);
    });

    test('should query Employees with Position and Department JOINs', async () => {
      const query = `
        SELECT e.uuid, e.first_name, e.last_name,
               p.title as position_title,
               d.name as department_name
        FROM Employees e
        LEFT JOIN Positions p ON e.position_uuid = p.uuid
        LEFT JOIN Departments d ON p.department_uuid = d.uuid
        LIMIT 5
      `;

      const [rows] = await connection.execute(query);
      expect(rows).toBeDefined();
      expect(Array.isArray(rows)).toBe(true);
    });
  });

  describe('Preservation: Departments table queries unchanged', () => {
    test('should query Departments table successfully', async () => {
      const query = `
        SELECT uuid, code, name, description, is_active, created_at
        FROM Departments
        LIMIT 10
      `;

      const [rows] = await connection.execute(query);
      expect(rows).toBeDefined();
      expect(Array.isArray(rows)).toBe(true);
    });
  });

  describe('Preservation: Positions table queries unchanged', () => {
    test('should query Positions table successfully', async () => {
      const query = `
        SELECT uuid, title, description, department_uuid, created_at
        FROM Positions
        LIMIT 10
      `;

      const [rows] = await connection.execute(query);
      expect(rows).toBeDefined();
      expect(Array.isArray(rows)).toBe(true);
    });
  });

  describe('Preservation: Complex multi-table queries without affected tables', () => {
    test('should execute complex Users-Roles-Employees-Departments query', async () => {
      const query = `
        SELECT u.uuid, u.username, u.is_active,
               r.name as role_name,
               e.first_name, e.last_name, e.employee_id,
               d.name as department_name
        FROM Users u
        LEFT JOIN Roles r ON u.role_uuid = r.uuid
        LEFT JOIN Employees e ON u.employee_uuid = e.uuid
        LEFT JOIN Positions p ON e.position_uuid = p.uuid
        LEFT JOIN Departments d ON p.department_uuid = d.uuid
        LIMIT 5
      `;

      const [rows] = await connection.execute(query);
      expect(rows).toBeDefined();
      expect(Array.isArray(rows)).toBe(true);
    });

    test('should execute Permissions-Resources query without role assignments', async () => {
      const query = `
        SELECT p.uuid, p.code, p.name, p.action,
               r.name as resource_name, r.code as resource_code
        FROM Permissions p
        INNER JOIN Resources r ON p.resource_uuid = r.uuid
        WHERE p.is_active = TRUE
        ORDER BY r.display_order, p.display_order
        LIMIT 20
      `;

      const [rows] = await connection.execute(query);
      expect(rows).toBeDefined();
      expect(Array.isArray(rows)).toBe(true);
    });
  });

  describe('Preservation: Other authorization tables unchanged', () => {
    test('should query PermissionOverrides table if exists', async () => {
      // Check if table exists first
      const [tables] = await connection.execute(`
        SHOW TABLES LIKE 'PermissionOverrides'
      `);

      if (tables.length > 0) {
        const query = `
          SELECT uuid, user_uuid, permission_uuid, override_type, granted_by
          FROM PermissionOverrides
          LIMIT 5
        `;

        const [rows] = await connection.execute(query);
        expect(rows).toBeDefined();
        expect(Array.isArray(rows)).toBe(true);
      } else {
        // If table doesn't exist, test passes trivially
        expect(true).toBe(true);
      }
    });

    test('should query AuthorizationLogs table if exists', async () => {
      // Check if table exists first
      const [tables] = await connection.execute(`
        SHOW TABLES LIKE 'AuthorizationLogs'
      `);

      if (tables.length > 0) {
        const query = `
          SELECT uuid, actor_user_uuid, action_type, resource_type, created_at
          FROM AuthorizationLogs
          LIMIT 5
        `;

        const [rows] = await connection.execute(query);
        expect(rows).toBeDefined();
        expect(Array.isArray(rows)).toBe(true);
      } else {
        // If table doesn't exist, test passes trivially
        expect(true).toBe(true);
      }
    });
  });

  describe('Preservation: Table existence verification', () => {
    test('should verify all major tables still exist', async () => {
      const expectedTables = [
        'Users',
        'Roles',
        'Permissions',
        'DataScopes',
        'Resources',
        'Employees',
        'Departments',
        'Positions'
      ];

      for (const tableName of expectedTables) {
        const [tables] = await connection.execute(`
          SHOW TABLES LIKE ?
        `, [tableName]);

        expect(tables.length).toBeGreaterThan(0);
      }
    });

    test('should verify fixed table names exist', async () => {
      // Verify the correct table names exist after fix
      const [rolePermsTables] = await connection.execute(`
        SHOW TABLES LIKE 'Role_Permissions'
      `);
      expect(rolePermsTables.length).toBeGreaterThan(0);

      const [roleScopesTables] = await connection.execute(`
        SHOW TABLES LIKE 'Role_Permission_Scopes'
      `);
      expect(roleScopesTables.length).toBeGreaterThan(0);
    });
  });

  describe('Preservation: Data integrity checks', () => {
    test('should verify Users data structure unchanged', async () => {
      const query = `
        SELECT uuid, username, employee_uuid, role_uuid, role, is_active
        FROM Users
        LIMIT 1
      `;

      const [rows] = await connection.execute(query);
      if (rows.length > 0) {
        const user = rows[0];
        
        // Verify expected fields exist
        expect(user).toHaveProperty('uuid');
        expect(user).toHaveProperty('username');
        expect(user).toHaveProperty('is_active');
        
        // Field types should be as expected
        expect(typeof user.uuid).toBe('string');
        expect(typeof user.username).toBe('string');
        expect(typeof user.is_active).toBe('number');
      }
    });

    test('should verify Roles data structure unchanged', async () => {
      const query = `
        SELECT uuid, code, name, description, is_active, can_be_deleted
        FROM Roles
        LIMIT 1
      `;

      const [rows] = await connection.execute(query);
      if (rows.length > 0) {
        const role = rows[0];
        
        // Verify expected fields exist
        expect(role).toHaveProperty('uuid');
        expect(role).toHaveProperty('code');
        expect(role).toHaveProperty('name');
        expect(role).toHaveProperty('is_active');
        
        // Field types should be as expected
        expect(typeof role.uuid).toBe('string');
        expect(typeof role.code).toBe('string');
        expect(typeof role.name).toBe('string');
      }
    });

    test('should verify Permissions data structure unchanged', async () => {
      const query = `
        SELECT uuid, code, name, action, resource_uuid, is_active
        FROM Permissions
        LIMIT 1
      `;

      const [rows] = await connection.execute(query);
      if (rows.length > 0) {
        const permission = rows[0];
        
        // Verify expected fields exist
        expect(permission).toHaveProperty('uuid');
        expect(permission).toHaveProperty('code');
        expect(permission).toHaveProperty('name');
        expect(permission).toHaveProperty('action');
        
        // Field types should be as expected
        expect(typeof permission.uuid).toBe('string');
        expect(typeof permission.code).toBe('string');
      }
    });
  });
});
