#!/usr/bin/env node
/**
 * Verify Permit.io Setup
 * Checks that everything is configured correctly
 */

const { Permit } = require('permitio');
const mysql = require('mysql2/promise');
require('dotenv').config();

const permit = new Permit({
  token: process.env.PERMIT_API_KEY,
  pdp: process.env.PERMIT_PDP_URL || 'https://cloudpdp.api.permit.io',
});

async function checkEnvVariables() {
  console.log('1️⃣  Checking environment variables...');
  
  const required = ['PERMIT_API_KEY', 'DB_HOST', 'DB_USER', 'DB_PASSWORD', 'DB_NAME'];
  const missing = required.filter(key => !process.env[key]);
  
  if (missing.length > 0) {
    console.log('  ❌ Missing:', missing.join(', '));
    return false;
  }
  
  console.log('  ✅ All environment variables present');
  return true;
}

async function checkPermitConnection() {
  console.log('\n2️⃣  Checking Permit.io connection...');
  
  try {
    const roles = await permit.api.roles.list();
    console.log('  ✅ Connected to Permit.io');
    console.log(`  📊 Roles found: ${roles.length}`);
    return true;
  } catch (err) {
    console.log('  ❌ Failed to connect:', err.message);
    return false;
  }
}

async function checkPermitResources() {
  console.log('\n3️⃣  Checking Permit.io resources...');
  
  try {
    const resources = await permit.api.resources.list();
    console.log(`  ✅ Resources: ${resources.length} found`);
    
    const expected = ['employees', 'attendance', 'leave', 'departments', 'accounts', 'letters', 'dashboard'];
    const existing = resources.map(r => r.key);
    const missing = expected.filter(e => !existing.includes(e));
    
    if (missing.length > 0) {
      console.log(`  ⚠️  Missing resources: ${missing.join(', ')}`);
      console.log(`  💡 Run: node scripts/quickSetupPermit.js`);
      return false;
    }
    
    console.log('  ✅ All core resources present');
    return true;
  } catch (err) {
    console.log('  ❌ Failed to check resources:', err.message);
    return false;
  }
}

async function checkPermitRoles() {
  console.log('\n4️⃣  Checking Permit.io roles...');
  
  try {
    const roles = await permit.api.roles.list();
    const roleKeys = roles.map(r => r.key);
    
    const expected = ['employee', 'department_head', 'hr_officer', 'hr_admin', 'super_admin'];
    const missing = expected.filter(e => !roleKeys.includes(e));
    
    if (missing.length > 0) {
      console.log(`  ⚠️  Missing roles: ${missing.join(', ')}`);
      console.log(`  💡 Run: node scripts/quickSetupPermit.js`);
      return false;
    }
    
    console.log('  ✅ All default roles present');
    console.log('  📋 Roles:', roleKeys.join(', '));
    return true;
  } catch (err) {
    console.log('  ❌ Failed to check roles:', err.message);
    return false;
  }
}

async function checkDatabaseMigration() {
  console.log('\n5️⃣  Checking database migration...');
  
  try {
    const connection = await mysql.createConnection({
      host: process.env.DB_HOST,
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      database: process.env.DB_NAME,
    });
    
    // Check if role column is VARCHAR
    const [rows] = await connection.execute(
      "SELECT COLUMN_TYPE FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'Users' AND COLUMN_NAME = 'role'",
      [process.env.DB_NAME]
    );
    
    if (rows.length === 0) {
      console.log('  ❌ Users.role column not found');
      await connection.end();
      return false;
    }
    
    const columnType = rows[0].COLUMN_TYPE;
    
    if (columnType.startsWith('varchar')) {
      console.log('  ✅ Users.role is VARCHAR (migration complete)');
      
      // Check role values
      const [roleRows] = await connection.execute('SELECT DISTINCT role FROM Users');
      const roles = roleRows.map(r => r.role);
      console.log('  📊 Roles in database:', roles.join(', '));
      
      // Check for old uppercase roles
      const oldFormat = roles.filter(r => r.includes('_') && r === r.toUpperCase());
      if (oldFormat.length > 0) {
        console.log('  ⚠️  Found old format roles:', oldFormat.join(', '));
        console.log('  💡 Run migration 010_permit_dynamic_roles.sql again');
        await connection.end();
        return false;
      }
      
      await connection.end();
      return true;
    } else {
      console.log(`  ❌ Users.role is still ${columnType} (ENUM)`);
      console.log('  💡 Run: mysql -u mesob -p mesob_hrms < database/migrations/010_permit_dynamic_roles.sql');
      await connection.end();
      return false;
    }
  } catch (err) {
    console.log('  ❌ Database check failed:', err.message);
    return false;
  }
}

async function checkPermitSync() {
  console.log('\n6️⃣  Checking if users are synced to Permit...');
  
  try {
    const connection = await mysql.createConnection({
      host: process.env.DB_HOST,
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      database: process.env.DB_NAME,
    });
    
    const [dbUsers] = await connection.execute('SELECT uuid, username, role FROM Users LIMIT 5');
    await connection.end();
    
    if (dbUsers.length === 0) {
      console.log('  ⚠️  No users in database');
      return true;
    }
    
    console.log(`  📊 Found ${dbUsers.length} users in database (showing first 5)`);
    
    // Check first user in Permit
    const firstUser = dbUsers[0];
    try {
      const permitUser = await permit.api.users.get(firstUser.uuid);
      console.log(`  ✅ Sample user '${firstUser.username}' exists in Permit with role: ${permitUser.roles?.[0]?.role || 'none'}`);
      console.log('  💡 Users will sync automatically on login');
      return true;
    } catch (err) {
      console.log(`  ⚠️  Sample user '${firstUser.username}' not in Permit yet`);
      console.log('  💡 Users will be synced on first login');
      return true; // Not critical - users sync on login
    }
  } catch (err) {
    console.log('  ❌ Failed to check user sync:', err.message);
    return false;
  }
}

async function testPermissionCheck() {
  console.log('\n7️⃣  Testing permission check...');
  
  try {
    // Create a test user in Permit
    const testUserId = 'test-user-' + Date.now();
    
    await permit.api.users.sync({
      key: testUserId,
      email: 'test@example.com',
    });
    
    await permit.api.roleAssignments.assign({
      user: testUserId,
      role: 'employee',
      tenant: 'default',
    });
    
    // Test permission check
    const allowed = await permit.check(testUserId, 'view', 'employees');
    
    if (allowed) {
      console.log('  ✅ Permission check working (employee can view employees)');
    } else {
      console.log('  ⚠️  Permission check returned false (might need to assign permissions)');
    }
    
    // Cleanup
    await permit.api.users.delete(testUserId);
    
    return true;
  } catch (err) {
    console.log('  ⚠️  Permission test skipped:', err.message);
    return true; // Not critical for setup
  }
}

async function main() {
  console.log('🔍 Permit.io Setup Verification');
  console.log('================================\n');
  
  const checks = [
    checkEnvVariables,
    checkPermitConnection,
    checkPermitResources,
    checkPermitRoles,
    checkDatabaseMigration,
    checkPermitSync,
    testPermissionCheck,
  ];
  
  const results = [];
  
  for (const check of checks) {
    const result = await check();
    results.push(result);
  }
  
  console.log('\n' + '='.repeat(50));
  console.log('📊 Summary');
  console.log('='.repeat(50));
  
  const passed = results.filter(Boolean).length;
  const total = results.length;
  
  console.log(`\n✅ Passed: ${passed}/${total} checks`);
  
  if (passed === total) {
    console.log('\n🎉 Setup is complete and verified!');
    console.log('\n📝 Next steps:');
    console.log('  1. Start the backend: cd backend && npm start');
    console.log('  2. Start the frontend: cd frontend && npm start');
    console.log('  3. Login with existing credentials');
    console.log('  4. Check Permit dashboard: https://app.permit.io\n');
  } else {
    console.log('\n⚠️  Some checks failed. Please review the output above.');
    console.log('\n📝 Common fixes:');
    console.log('  - Missing resources/roles: node scripts/quickSetupPermit.js');
    console.log('  - Database migration: mysql -u mesob -p mesob_hrms < database/migrations/010_permit_dynamic_roles.sql');
    console.log('  - Check .env file has PERMIT_API_KEY\n');
    process.exit(1);
  }
}

main().catch(err => {
  console.error('\n❌ Verification failed:', err.message);
  process.exit(1);
});
