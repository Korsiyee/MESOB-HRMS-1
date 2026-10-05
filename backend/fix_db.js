const mysql = require('mysql2/promise');
const path = require('path');
require('dotenv').config();

const config = {
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || process.env.DB_DATABASE || 'mesob_hrms'
};

async function fixDatabase() {
  let connection;
  
  try {
    console.log('Connecting to database...');
    connection = await mysql.createConnection(config);
    console.log('Connected successfully');
    
    console.log('Adding id column to Roles table...');
    await connection.execute(`
      ALTER TABLE Roles 
      ADD COLUMN id INT AUTO_INCREMENT PRIMARY KEY FIRST
    `).catch(err => {
      if (err.code !== 'ER_DUP_FIELDNAME') throw err;
      console.log('id column already exists in Roles');
    });
    
    console.log('Adding is_active column to Permissions table...');
    await connection.execute(`
      ALTER TABLE Permissions 
      ADD COLUMN is_active BOOLEAN NOT NULL DEFAULT TRUE AFTER action
    `).catch(err => {
      if (err.code !== 'ER_DUP_FIELDNAME') throw err;
      console.log('is_active column already exists in Permissions');
    });
    
    console.log('Adding uuid column to AuthorizationAuditLogs table...');
    await connection.execute(`
      ALTER TABLE AuthorizationAuditLogs 
      ADD COLUMN uuid VARCHAR(36) UNIQUE FIRST
    `).catch(err => {
      if (err.code !== 'ER_DUP_FIELDNAME') throw err;
      console.log('uuid column already exists in AuthorizationAuditLogs');
    });
    
    console.log('Adding role_id column to Users table...');
    await connection.execute(`
      ALTER TABLE Users 
      ADD COLUMN role_id INT AFTER role_uuid
    `).catch(err => {
      if (err.code !== 'ER_DUP_FIELDNAME') throw err;
      console.log('role_id column already exists in Users');
    });
    
    console.log('Updating role_id references...');
    await connection.execute(`
      UPDATE Users u
      JOIN Roles r ON u.role_uuid = r.uuid
      SET u.role_id = r.id
      WHERE u.role_uuid IS NOT NULL
    `);
    
    console.log('Updating admin email...');
    await connection.execute(`
      UPDATE EmployeeAddresses ea
      JOIN Employees e ON ea.employee_uuid = e.uuid
      JOIN Users u ON e.uuid = u.employee_uuid
      SET ea.email = 'admin@mesobhrms.org'
      WHERE u.username = 'admin' AND ea.address_type = 'CURRENT'
    `);
    
    console.log('All fixes completed successfully!');
    
  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

fixDatabase();