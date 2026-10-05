const mysql = require('mysql2/promise');
require('dotenv').config();

async function forceFix() {
  console.log('FORCE FIXING DATABASE ISSUES');
  console.log('============================');
  
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME
  });

  try {
    console.log('Connected to database:', process.env.DB_NAME);
    
    // Execute fixes one by one with error handling
    const fixes = [
      {
        name: 'Add id to Roles',
        sql: 'ALTER TABLE Roles ADD COLUMN id INT AUTO_INCREMENT PRIMARY KEY FIRST'
      },
      {
        name: 'Add is_active to Roles',
        sql: 'ALTER TABLE Roles ADD COLUMN is_active BOOLEAN NOT NULL DEFAULT TRUE'
      },
      {
        name: 'Add is_active to Permissions', 
        sql: 'ALTER TABLE Permissions ADD COLUMN is_active BOOLEAN NOT NULL DEFAULT TRUE'
      },
      {
        name: 'Add action to AuthorizationAuditLogs',
        sql: 'ALTER TABLE AuthorizationAuditLogs ADD COLUMN action VARCHAR(100) DEFAULT "AUTHORIZATION_CHECK"'
      },
      {
        name: 'Add role_id to Users',
        sql: 'ALTER TABLE Users ADD COLUMN role_id INT AFTER role_uuid'
      }
    ];
    
    for (const fix of fixes) {
      try {
        await connection.execute(fix.sql);
        console.log('✅', fix.name);
      } catch (e) {
        if (e.code === 'ER_DUP_FIELDNAME') {
          console.log('ℹ️ ', fix.name, '- already exists');
        } else {
          console.log('❌', fix.name, '- error:', e.message);
        }
      }
    }
    
    // Update role references
    console.log('\nUpdating role references...');
    const [result] = await connection.execute(`
      UPDATE Users u
      JOIN Roles r ON u.role_uuid = r.uuid
      SET u.role_id = r.id
      WHERE u.role_uuid IS NOT NULL
    `);
    console.log('✅ Updated', result.changedRows, 'role references');
    
    // Test the failing query
    console.log('\nTesting the failing query...');
    try {
      const [testResult] = await connection.execute(`
        SELECT r.id, r.uuid, r.code, r.name
        FROM Roles r 
        WHERE r.is_active = TRUE
        LIMIT 1
      `);
      console.log('✅ Query test passed! Found', testResult.length, 'roles');
    } catch (e) {
      console.log('❌ Query test failed:', e.message);
    }
    
    console.log('\n🎉 Force fix completed!');
    
  } catch (error) {
    console.log('❌ Connection error:', error.message);
  } finally {
    await connection.end();
  }
}

forceFix().catch(console.error);