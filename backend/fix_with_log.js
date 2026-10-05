const mysql = require('mysql2/promise');
const fs = require('fs');
require('dotenv').config();

async function fixWithLog() {
  const log = [];
  
  function logMessage(msg) {
    log.push(msg);
    console.log(msg);
  }
  
  try {
    logMessage('FORCE FIXING DATABASE - ' + new Date().toISOString());
    logMessage('================================================');
    
    const connection = await mysql.createConnection({
      host: process.env.DB_HOST,
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      database: process.env.DB_NAME
    });

    logMessage('Connected to database: ' + process.env.DB_NAME);
    
    // Check current Roles structure
    const [rolesCols] = await connection.execute('SHOW COLUMNS FROM Roles');
    logMessage('Current Roles columns: ' + rolesCols.map(c => c.Field).join(', '));
    
    const hasId = rolesCols.some(c => c.Field === 'id');
    logMessage('Roles has id column: ' + hasId);
    
    if (!hasId) {
      logMessage('Adding id column to Roles...');
      await connection.execute('ALTER TABLE Roles ADD COLUMN id INT AUTO_INCREMENT PRIMARY KEY FIRST');
      logMessage('✅ Added id column to Roles');
    }
    
    // Check AuthorizationAuditLogs
    const [auditCols] = await connection.execute('SHOW COLUMNS FROM AuthorizationAuditLogs');
    logMessage('AuthorizationAuditLogs columns: ' + auditCols.map(c => c.Field).join(', '));
    
    const hasAction = auditCols.some(c => c.Field === 'action');
    if (!hasAction) {
      logMessage('Adding action column...');
      await connection.execute('ALTER TABLE AuthorizationAuditLogs ADD COLUMN action VARCHAR(100) DEFAULT "AUTH_CHECK"');
      logMessage('✅ Added action column');
    }
    
    // Add other columns
    try {
      await connection.execute('ALTER TABLE Permissions ADD COLUMN is_active BOOLEAN NOT NULL DEFAULT TRUE');
      logMessage('✅ Added is_active to Permissions');
    } catch (e) {
      logMessage('Permissions.is_active: ' + e.message);
    }
    
    try {
      await connection.execute('ALTER TABLE Users ADD COLUMN role_id INT AFTER role_uuid');
      logMessage('✅ Added role_id to Users');
    } catch (e) {
      logMessage('Users.role_id: ' + e.message);
    }
    
    // Update role references
    const [updateResult] = await connection.execute(`
      UPDATE Users u
      JOIN Roles r ON u.role_uuid = r.uuid
      SET u.role_id = r.id
      WHERE u.role_uuid IS NOT NULL
    `);
    logMessage('Updated ' + updateResult.changedRows + ' role references');
    
    // Test the query
    try {
      const [testResult] = await connection.execute(`
        SELECT r.id, r.uuid, r.code FROM Roles r WHERE r.is_active = TRUE LIMIT 1
      `);
      logMessage('✅ Test query passed! Results: ' + testResult.length);
    } catch (e) {
      logMessage('❌ Test query failed: ' + e.message);
    }
    
    await connection.end();
    logMessage('Fix completed successfully!');
    
  } catch (error) {
    logMessage('ERROR: ' + error.message);
  }
  
  // Write log to file
  fs.writeFileSync('/tmp/db_fix_log.txt', log.join('\n'));
}

fixWithLog();