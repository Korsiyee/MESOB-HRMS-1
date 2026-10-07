#!/usr/bin/env node
require('dotenv').config();
const mysql = require('mysql2/promise');
const { v4: uuidv4 } = require('uuid');

async function addAdminModule() {
  let connection;
  
  try {
    console.log('Adding ADMIN module to the system...\n');
    
    connection = await mysql.createConnection({
      host: process.env.DB_HOST || 'localhost',
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD,
      database: process.env.DB_NAME || 'hrms_leave_service'
    });

    // Check if ADMIN module already exists
    const [existing] = await connection.query('SELECT uuid FROM Modules WHERE code = ?', ['ADMIN']);
    
    let adminUuid;
    if (existing.length > 0) {
      adminUuid = existing[0].uuid;
      console.log('✓ ADMIN module already exists');
    } else {
      // Insert ADMIN module
      adminUuid = uuidv4();
      await connection.execute(
        'INSERT INTO Modules (uuid, code, name, description, icon, display_order) VALUES (?, ?, ?, ?, ?, ?)',
        [adminUuid, 'ADMIN', 'Administration', 'System administration (accounts, roles, audit logs)', 'Shield', 8]
      );
      console.log('✓ ADMIN module created');
    }

    // Get SUPER_ADMIN and HR_ADMIN roles
    const [roles] = await connection.query('SELECT uuid, code FROM Roles WHERE code IN (?, ?)', ['SUPER_ADMIN', 'HR_ADMIN']);
    
    // Get ORGANIZATION scope
    const [scopes] = await connection.query('SELECT uuid FROM Scopes WHERE code = ?', ['ORGANIZATION']);
    const orgScopeUuid = scopes[0].uuid;

    // Assign ADMIN module to SUPER_ADMIN and HR_ADMIN
    for (const role of roles) {
      // Check if already assigned
      const [existingAssignment] = await connection.query(
        'SELECT uuid FROM RoleModules WHERE role_uuid = ? AND module_uuid = ?',
        [role.uuid, adminUuid]
      );
      
      if (existingAssignment.length === 0) {
        await connection.execute(
          'INSERT INTO RoleModules (uuid, role_uuid, module_uuid, scope_uuid) VALUES (?, ?, ?, ?)',
          [uuidv4(), role.uuid, adminUuid, orgScopeUuid]
        );
        console.log(`✓ Added ADMIN module to ${role.code}`);
      } else {
        console.log(`✓ ${role.code} already has ADMIN module`);
      }
    }

    console.log('\n✅ ADMIN module setup complete!\n');
    process.exit(0);
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

addAdminModule();
