const mysql = require('mysql2/promise');
require('dotenv').config();

async function verifyDatabase() {
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME
  });

  try {
    console.log('DATABASE VERIFICATION');
    console.log('===================');
    
    // Test the exact query that was failing
    console.log('\nTesting failing query...');
    try {
      const [result] = await connection.execute(`
        SELECT r.id, r.uuid, r.code, r.name
        FROM Roles r 
        WHERE r.is_active = TRUE
        LIMIT 1
      `);
      console.log(`✅ Roles query works! Found ${result.length} roles with id column`);
      if (result.length > 0) {
        console.log(`   First role: id=${result[0].id}, code=${result[0].code}`);
      }
    } catch (e) {
      console.log(`❌ Roles query failed: ${e.message}`);
    }
    
    // Test AuthorizationAuditLogs
    console.log('\nTesting AuthorizationAuditLogs...');
    try {
      const [result] = await connection.execute(`
        INSERT INTO AuthorizationAuditLogs 
        (uuid, actor_user_uuid, action_type, resource_type, reason, ip_address, user_agent, created_at)
        VALUES (UUID(), 'test-user', 'TEST', 'TEST_RESOURCE', 'test', '127.0.0.1', 'test-agent', NOW())
      `);
      console.log('✅ AuthorizationAuditLogs insert works!');
      
      // Clean up test record
      await connection.execute('DELETE FROM AuthorizationAuditLogs WHERE action_type = "TEST"');
    } catch (e) {
      console.log(`❌ AuthorizationAuditLogs insert failed: ${e.message}`);
    }
    
  } finally {
    await connection.end();
  }
}

verifyDatabase();