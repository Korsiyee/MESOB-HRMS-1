#!/usr/bin/env node

/**
 * RBAC Migration Verification Script
 * Checks that the migration was applied correctly
 */

const { db } = require('../src/config/db');

const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  cyan: '\x1b[36m',
};

async function verify() {
  console.log(`\n${colors.cyan}═══════════════════════════════════════════════════`);
  console.log(`RBAC Migration Verification`);
  console.log(`═══════════════════════════════════════════════════${colors.reset}\n`);

  const pool = db.promise();

  try {
    // Check Roles table
    console.log(`${colors.cyan}▶ Roles Table${colors.reset}`);
    const [roles] = await pool.execute('SELECT id, code, name, rank FROM Roles ORDER BY rank DESC');
    console.log(`  ${colors.green}✓${colors.reset} Found ${roles.length} roles:`);
    roles.forEach(role => {
      console.log(`    - ${role.code.padEnd(20)} (rank: ${role.rank}) - ${role.name}`);
    });

    // Check Permissions table
    console.log(`\n${colors.cyan}▶ Permissions Table${colors.reset}`);
    const [permissions] = await pool.execute('SELECT COUNT(*) as count FROM Permissions');
    console.log(`  ${colors.green}✓${colors.reset} Found ${permissions[0].count} permissions`);

    // Show sample permissions by resource
    const [permsByResource] = await pool.execute(`
      SELECT resource, COUNT(*) as count 
      FROM Permissions 
      GROUP BY resource 
      ORDER BY resource
    `);
    console.log(`  Permissions by resource:`);
    permsByResource.forEach(row => {
      console.log(`    - ${row.resource.padEnd(20)}: ${row.count} permissions`);
    });

    // Check RolePermissions table
    console.log(`\n${colors.cyan}▶ RolePermissions Table${colors.reset}`);
    const [rolePerms] = await pool.execute(`
      SELECT r.code, COUNT(*) as perm_count 
      FROM RolePermissions rp
      JOIN Roles r ON r.id = rp.role_id
      GROUP BY r.code
      ORDER BY r.rank DESC
    `);
    console.log(`  ${colors.green}✓${colors.reset} Role-permission mappings:`);
    rolePerms.forEach(row => {
      console.log(`    - ${row.code.padEnd(20)}: ${row.perm_count} permissions`);
    });

    // Check Users table columns
    console.log(`\n${colors.cyan}▶ Users Table Updates${colors.reset}`);
    const [roleIdCol] = await pool.execute(`SHOW COLUMNS FROM Users LIKE 'role_id'`);
    const [versCol] = await pool.execute(`SHOW COLUMNS FROM Users LIKE 'permissions_version'`);
    const [activityCol] = await pool.execute(`SHOW COLUMNS FROM Users LIKE 'last_activity'`);
    
    if (roleIdCol.length > 0) {
      console.log(`  ${colors.green}✓${colors.reset} role_id column exists`);
    } else {
      console.log(`  ${colors.red}✗${colors.reset} role_id column missing`);
    }
    
    if (versCol.length > 0) {
      console.log(`  ${colors.green}✓${colors.reset} permissions_version column exists`);
    } else {
      console.log(`  ${colors.red}✗${colors.reset} permissions_version column missing`);
    }
    
    if (activityCol.length > 0) {
      console.log(`  ${colors.green}✓${colors.reset} last_activity column exists`);
    } else {
      console.log(`  ${colors.red}✗${colors.reset} last_activity column missing`);
    }

    // Check if any users have role_id set
    const [userRoles] = await pool.execute(`
      SELECT COUNT(*) as count FROM Users WHERE role_id IS NOT NULL
    `);
    console.log(`  ${colors.green}✓${colors.reset} Users with role_id: ${userRoles[0].count}`);

    console.log(`\n${colors.green}═══════════════════════════════════════════════════`);
    console.log(`✓ Migration Verification Complete!`);
    console.log(`═══════════════════════════════════════════════════${colors.reset}\n`);

  } catch (error) {
    console.error(`\n${colors.red}✗ Verification failed:${colors.reset}`, error.message);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

verify();
