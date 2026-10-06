#!/usr/bin/env node
/**
 * Fix Admin Role - Set to SUPER_ADMIN
 */

const mysql = require('mysql2/promise');
require('dotenv').config();

async function fixAdminRole() {
  console.log('🔧 Fixing admin user role...\n');

  const connection = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'mesob',
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME || 'mesob_hrms'
  });

  try {
    // Get SUPER_ADMIN role UUID
    const [roles] = await connection.execute(
      "SELECT uuid, code, name FROM Roles WHERE code = 'SUPER_ADMIN'"
    );

    if (roles.length === 0) {
      console.log('❌ SUPER_ADMIN role not found in database');
      console.log('   Run: node scripts/setupModulePermissions.js');
      await connection.end();
      return;
    }

    const superAdminRole = roles[0];
    console.log(`✅ Found SUPER_ADMIN role: ${superAdminRole.name} (${superAdminRole.uuid})`);

    // Check current admin user
    const [users] = await connection.execute(
      `SELECT u.uuid, u.username, u.role_uuid, r.code as current_role
       FROM Users u
       LEFT JOIN Roles r ON u.role_uuid = r.uuid
       WHERE u.username = 'admin'`
    );

    if (users.length === 0) {
      console.log('❌ Admin user not found');
      await connection.end();
      return;
    }

    const adminUser = users[0];
    console.log(`\n📋 Current admin user:`);
    console.log(`   Username: ${adminUser.username}`);
    console.log(`   Current role: ${adminUser.current_role || 'NO ROLE'}`);

    if (adminUser.role_uuid === superAdminRole.uuid) {
      console.log('\n✅ Admin user already has SUPER_ADMIN role - no change needed');
    } else {
      console.log(`\n🔄 Updating admin role to SUPER_ADMIN...`);
      
      await connection.execute(
        'UPDATE Users SET role_uuid = ? WHERE username = ?',
        [superAdminRole.uuid, 'admin']
      );

      console.log('✅ Admin user updated successfully!');
      console.log(`   Old role: ${adminUser.current_role || 'NO ROLE'}`);
      console.log(`   New role: SUPER_ADMIN`);
    }

    // Show all roles for reference
    console.log('\n📊 Available roles in system:');
    const [allRoles] = await connection.execute(
      'SELECT code, name, hierarchy_level FROM Roles ORDER BY hierarchy_level DESC'
    );
    allRoles.forEach(r => {
      console.log(`   ${r.code.padEnd(20)} | ${r.name.padEnd(30)} | Level ${r.hierarchy_level}`);
    });

  } catch (error) {
    console.error('❌ Error:', error.message);
    throw error;
  } finally {
    await connection.end();
  }

  console.log('\n✅ Done! Admin user should now have full access.');
  console.log('   Please refresh the frontend to see changes.');
}

fixAdminRole().catch(err => {
  console.error('Failed:', err);
  process.exit(1);
});
