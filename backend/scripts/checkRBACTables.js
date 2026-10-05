#!/usr/bin/env node

/**
 * Quick check for RBAC tables existence
 * Usage: node scripts/checkRBACTables.js
 */

const db = require('../src/config/db');

const RBAC_TABLES = [
  'Roles',
  'Resources',
  'Permissions',
  'RolePermissions',
  'DataScopes',
  'RolePermissionScopes',
  'UserPermissionOverrides',
  'UserScopeOverrides',
  'PermissionDelegations',
  'AuthorizationAuditLogs'
];

async function checkTables() {
  console.log('\n=== RBAC Tables Status Check ===\n');

  try {
    const results = [];

    for (const table of RBAC_TABLES) {
      try {
        const [rows] = await db.query(`
          SELECT COUNT(*) as count 
          FROM information_schema.tables 
          WHERE table_schema = DATABASE() 
          AND table_name = ?
        `, [table]);

        const exists = rows[0].count > 0;

        if (exists) {
          const [[{ count }]] = await db.query(`SELECT COUNT(*) as count FROM ??`, [table]);
          results.push({ table, exists: true, count });
        } else {
          results.push({ table, exists: false, count: 0 });
        }
      } catch (err) {
        results.push({ table, exists: false, error: err.message });
      }
    }

    // Display results
    console.log('Table Status:');
    console.log('─'.repeat(60));

    let allExist = true;
    results.forEach(({ table, exists, count, error }) => {
      if (error) {
        console.log(`❌ ${table.padEnd(30)} ERROR: ${error}`);
        allExist = false;
      } else if (exists) {
        console.log(`✅ ${table.padEnd(30)} ${count.toString().padStart(6)} rows`);
      } else {
        console.log(`❌ ${table.padEnd(30)} MISSING`);
        allExist = false;
      }
    });

    console.log('─'.repeat(60));

    if (allExist) {
      console.log('\n✅ All RBAC tables exist!');
      console.log('\nTo run the full migration (recreate and seed):');
      console.log('  npm run db:migrate:rbac-system\n');
    } else {
      console.log('\n⚠️  Some RBAC tables are missing.');
      console.log('\nRun the migration to create them:');
      console.log('  npm run db:migrate:rbac-system\n');
    }

    process.exit(0);
  } catch (err) {
    console.error('\n❌ Error checking tables:', err.message);
    console.error(err.stack);
    process.exit(1);
  }
}

checkTables();
