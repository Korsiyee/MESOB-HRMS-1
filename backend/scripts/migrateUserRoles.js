#!/usr/bin/env node

/**
 * Migrate User Roles
 * 
 * Maps existing user role ENUM values to new role_uuid system
 */

require('dotenv').config();
const { db } = require('../src/config/db');

async function migrateUserRoles() {
  console.log('═══════════════════════════════════════════════════════════');
  console.log('Migrating User Roles to UUID System');
  console.log('═══════════════════════════════════════════════════════════\n');

  try {
    const connection = db.promise();

    // Get role mappings
    console.log('📋 Fetching role UUIDs...\n');
    const [roles] = await connection.query('SELECT uuid, code, name FROM Roles');
    
    const roleMap = {};
    roles.forEach(role => {
      roleMap[role.code] = role.uuid;
      console.log(`  ${role.name.padEnd(20)} → ${role.uuid}`);
    });

    console.log('\n📊 Checking existing users...\n');
    
    // Check if users have the old role column
    const [columns] = await connection.query(`
      SELECT COLUMN_NAME 
      FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_SCHEMA = DATABASE() 
        AND TABLE_NAME = 'Users' 
        AND COLUMN_NAME = 'role'
    `);

    if (columns.length === 0) {
      console.log('  ℹ️  Old "role" column not found. Users may already be migrated.');
      
      // Check how many users have role_uuid
      const [withUuid] = await connection.query('SELECT COUNT(*) as count FROM Users WHERE role_uuid IS NOT NULL');
      const [total] = await connection.query('SELECT COUNT(*) as count FROM Users');
      
      console.log(`  Total users: ${total[0].count}`);
      console.log(`  Users with role_uuid: ${withUuid[0].count}`);
      
      if (withUuid[0].count === total[0].count) {
        console.log('\n✅ All users already have role_uuid assigned!');
        return;
      }
    }

    // Get count of users per role
    const [userCounts] = await connection.query(`
      SELECT role, COUNT(*) as count 
      FROM Users 
      WHERE role IS NOT NULL 
      GROUP BY role
    `);

    console.log('  Current user distribution:');
    userCounts.forEach(row => {
      console.log(`    • ${row.role}: ${row.count} users`);
    });

    console.log('\n🔄 Migrating users...\n');

    let totalMigrated = 0;

    for (const [roleCode, roleUuid] of Object.entries(roleMap)) {
      const [result] = await connection.query(
        'UPDATE Users SET role_uuid = ? WHERE role = ? AND role_uuid IS NULL',
        [roleUuid, roleCode]
      );

      if (result.affectedRows > 0) {
        console.log(`  ✓ Migrated ${result.affectedRows} users from ${roleCode}`);
        totalMigrated += result.affectedRows;
      }
    }

    console.log(`\n✅ Migration complete! ${totalMigrated} users migrated.\n`);

    // Verify migration
    console.log('🔍 Verifying migration...\n');
    
    const [afterCounts] = await connection.query(`
      SELECT 
        r.name as role_name,
        r.code as role_code,
        COUNT(u.uuid) as user_count
      FROM Roles r
      LEFT JOIN Users u ON r.uuid = u.role_uuid
      GROUP BY r.uuid, r.name, r.code
      ORDER BY r.hierarchy_level DESC
    `);

    console.log('  Users per role:');
    afterCounts.forEach(row => {
      console.log(`    • ${row.role_name.padEnd(20)}: ${row.user_count} users`);
    });

    // Check for users without role_uuid
    const [unmapped] = await connection.query('SELECT COUNT(*) as count FROM Users WHERE role_uuid IS NULL');
    
    if (unmapped[0].count > 0) {
      console.log(`\n  ⚠️  Warning: ${unmapped[0].count} users still have no role_uuid assigned.`);
      console.log('  These users may have invalid or NULL role values.');
      
      const [unmappedUsers] = await connection.query(`
        SELECT uuid, username, role 
        FROM Users 
        WHERE role_uuid IS NULL 
        LIMIT 10
      `);
      
      console.log('\n  Sample unmapped users:');
      unmappedUsers.forEach(u => {
        console.log(`    • ${u.username} (role: ${u.role || 'NULL'})`);
      });
    }

    console.log('\n═══════════════════════════════════════════════════════════');
    console.log('✅ User Role Migration Complete!');
    console.log('═══════════════════════════════════════════════════════════\n');

  } catch (error) {
    console.error('\n❌ Migration failed:', error.message);
    console.error(error);
    process.exit(1);
  }
}

migrateUserRoles();
