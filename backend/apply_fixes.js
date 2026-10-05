const mysql = require('mysql2/promise');
require('dotenv').config();

async function applyFixes() {
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME
  });

  console.log('Starting database fixes...');

  try {
    // Fix 1: Add id to Roles
    await connection.execute(`
      ALTER TABLE Roles ADD COLUMN id INT AUTO_INCREMENT PRIMARY KEY FIRST
    `).catch(() => console.log('Roles.id already exists'));

    // Fix 2: Add is_active to Permissions  
    await connection.execute(`
      ALTER TABLE Permissions ADD COLUMN is_active BOOLEAN NOT NULL DEFAULT TRUE AFTER action
    `).catch(() => console.log('Permissions.is_active already exists'));

    // Fix 3: Add uuid to AuthorizationAuditLogs
    await connection.execute(`
      ALTER TABLE AuthorizationAuditLogs ADD COLUMN uuid VARCHAR(36) UNIQUE FIRST
    `).catch(() => console.log('AuthorizationAuditLogs.uuid already exists'));

    // Fix 4: Add role_id to Users
    await connection.execute(`
      ALTER TABLE Users ADD COLUMN role_id INT AFTER role_uuid
    `).catch(() => console.log('Users.role_id already exists'));

    // Update data
    await connection.execute(`
      UPDATE AuthorizationAuditLogs SET uuid = UUID() WHERE uuid IS NULL OR uuid = ''
    `);

    await connection.execute(`
      UPDATE Users u
      JOIN Roles r ON u.role_uuid = r.uuid
      SET u.role_id = r.id
      WHERE u.role_uuid IS NOT NULL
    `);

    await connection.execute(`
      UPDATE EmployeeAddresses ea
      JOIN Employees e ON ea.employee_uuid = e.uuid
      JOIN Users u ON e.uuid = u.employee_uuid
      SET ea.email = 'admin@mesobhrms.org'
      WHERE u.username = 'admin' AND ea.address_type = 'CURRENT'
    `);

    console.log('All fixes applied successfully!');
    
  } finally {
    await connection.end();
  }
}

applyFixes().catch(console.error);