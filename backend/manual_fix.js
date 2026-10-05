const mysql = require('mysql2/promise');
require('dotenv').config();

async function manualFix() {
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME
  });

  console.log('MANUAL DATABASE FIXES');
  console.log('====================');
  
  try {
    // First, let's check the current Roles table structure
    console.log('\n1. Checking Roles table structure...');
    const [rolesCols] = await connection.execute('SHOW COLUMNS FROM Roles');
    console.log('Current Roles columns:');
    rolesCols.forEach(col => console.log(`   ${col.Field} (${col.Type})`));
    
    // Check if id column exists
    const hasId = rolesCols.some(col => col.Field === 'id');
    console.log(`   Has id column: ${hasId}`);
    
    if (!hasId) {
      console.log('\n   Adding id column to Roles...');
      await connection.execute('ALTER TABLE Roles ADD COLUMN id INT AUTO_INCREMENT PRIMARY KEY FIRST');
      console.log('   ✅ Added id column');
    }
    
    // Check AuthorizationAuditLogs structure
    console.log('\n2. Checking AuthorizationAuditLogs structure...');
    const [auditCols] = await connection.execute('SHOW COLUMNS FROM AuthorizationAuditLogs');
    console.log('Current AuthorizationAuditLogs columns:');
    auditCols.forEach(col => console.log(`   ${col.Field} (${col.Type})`));
    
    const hasAction = auditCols.some(col => col.Field === 'action');
    const hasActionType = auditCols.some(col => col.Field === 'action_type');
    
    if (!hasAction && hasActionType) {
      console.log('\n   Adding action column...');
      await connection.execute('ALTER TABLE AuthorizationAuditLogs ADD COLUMN action VARCHAR(100) DEFAULT "AUTHORIZATION_CHECK"');
      console.log('   ✅ Added action column with default value');
    }
    
    // Add other missing columns
    console.log('\n3. Adding other missing columns...');
    
    // Permissions is_active
    try {
      await connection.execute('ALTER TABLE Permissions ADD COLUMN is_active BOOLEAN NOT NULL DEFAULT TRUE');
      console.log('   ✅ Added is_active to Permissions');
    } catch (e) {
      console.log('   ℹ️  Permissions.is_active already exists');
    }
    
    // Users role_id
    try {
      await connection.execute('ALTER TABLE Users ADD COLUMN role_id INT AFTER role_uuid');
      console.log('   ✅ Added role_id to Users');
    } catch (e) {
      console.log('   ℹ️  Users.role_id already exists');
    }
    
    // Update role_id references
    console.log('\n4. Updating role references...');
    const [updateResult] = await connection.execute(`
      UPDATE Users u
      JOIN Roles r ON u.role_uuid = r.uuid
      SET u.role_id = r.id
      WHERE u.role_uuid IS NOT NULL AND r.id IS NOT NULL
    `);
    console.log(`   ✅ Updated ${updateResult.changedRows} role references`);
    
    console.log('\n5. Final verification...');
    const [finalRoles] = await connection.execute('SELECT COUNT(*) as count FROM Roles WHERE id IS NOT NULL');
    console.log(`   Roles with id: ${finalRoles[0].count}`);
    
    console.log('\n🎉 Manual fixes completed!');
    
  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await connection.end();
  }
}

manualFix();