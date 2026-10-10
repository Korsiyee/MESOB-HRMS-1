/**
 * Database Connection and Schema Check Script
 * Verifies database connectivity and RBAC table existence
 */

const mysql = require('mysql2/promise');
require('dotenv').config();

async function checkDatabase() {
  let connection;
  
  try {
    console.log('🔍 Connecting to database...');
    console.log(`   Host: ${process.env.DB_HOST}`);
    console.log(`   User: ${process.env.DB_USER}`);
    console.log(`   Database: ${process.env.DB_NAME}`);
    
    connection = await mysql.createConnection({
      host: process.env.DB_HOST,
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      database: process.env.DB_NAME
    });
    
    console.log('✅ Database connection successful!\n');
    
    // Check for RBAC tables
    console.log('📋 Checking RBAC Tables...\n');
    
    const tables = [
      'Resources',
      'Permissions',
      'Role_Permissions',
      'RolePermissions',
      'DataScopes',
      'Role_Permission_Scopes',
      'RolePermissionScopes',
      'Roles'
    ];
    
    const results = {};
    
    for (const table of tables) {
      try {
        const [rows] = await connection.execute(
          `SELECT COUNT(*) as count FROM ${table}`
        );
        results[table] = { exists: true, count: rows[0].count };
        console.log(`   ✅ ${table.padEnd(25)} - EXISTS (${rows[0].count} rows)`);
      } catch (err) {
        results[table] = { exists: false, error: err.message };
        console.log(`   ❌ ${table.padEnd(25)} - NOT FOUND`);
      }
    }
    
    console.log('\n📊 Summary:');
    console.log('━'.repeat(60));
    
    // Check critical tables
    const critical = ['Resources', 'Permissions', 'DataScopes', 'Roles'];
    const criticalMissing = critical.filter(t => !results[t]?.exists);
    
    if (criticalMissing.length > 0) {
      console.log('⚠️  CRITICAL: Missing essential tables:', criticalMissing.join(', '));
      console.log('   Action: Run database/ADD_RBAC_TABLES.sql');
    } else {
      console.log('✅ All critical tables exist');
    }
    
    // Check naming inconsistency
    const hasUnderscore = results['Role_Permissions']?.exists;
    const hasNoUnderscore = results['RolePermissions']?.exists;
    
    console.log('\n🔍 Table Naming Check:');
    if (hasUnderscore && !hasNoUnderscore) {
      console.log('   ✅ Role_Permissions (with underscore) - CORRECT');
    } else if (!hasUnderscore && hasNoUnderscore) {
      console.log('   ⚠️  RolePermissions (no underscore) - NEEDS FIX');
      console.log('   Action: Run database/FIX_ROLE_PERMISSIONS_NOW.sql');
    } else if (hasUnderscore && hasNoUnderscore) {
      console.log('   ⚠️  BOTH tables exist - duplicate detected');
    } else {
      console.log('   ❌ NEITHER table exists - run ADD_RBAC_TABLES.sql');
    }
    
    // Check data seeding
    if (results['Resources']?.exists) {
      const [resources] = await connection.execute('SELECT COUNT(*) as count FROM Resources');
      const [permissions] = await connection.execute('SELECT COUNT(*) as count FROM Permissions');
      const [scopes] = await connection.execute('SELECT COUNT(*) as count FROM DataScopes');
      
      console.log('\n📦 Seed Data Status:');
      console.log(`   Resources: ${resources[0].count} (expected: ~10)`);
      console.log(`   Permissions: ${permissions[0].count} (expected: ~33)`);
      console.log(`   DataScopes: ${scopes[0].count} (expected: 4)`);
      
      if (resources[0].count < 5 || permissions[0].count < 20 || scopes[0].count < 3) {
        console.log('   ⚠️  Low data counts - may need seeding');
      }
    }
    
    console.log('\n' + '━'.repeat(60));
    
  } catch (err) {
    console.error('❌ Database connection failed:');
    console.error('   Error:', err.message);
    console.error('\n   Troubleshooting:');
    console.error('   1. Check if MySQL/MariaDB is running');
    console.error('   2. Verify credentials in backend/.env');
    console.error('   3. Ensure database "mesob_hrms" exists');
    process.exit(1);
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

checkDatabase().catch(console.error);
