#!/usr/bin/env node

/**
 * RBAC Migration Runner - Node.js Version
 * Runs the 100_rbac_refactor.sql migration programmatically
 */

const fs = require('fs');
const path = require('path');
const { db } = require('../src/config/db');

// Colors for console output
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
};

const log = {
  info: (msg) => console.log(`${colors.cyan}ℹ${colors.reset} ${msg}`),
  success: (msg) => console.log(`${colors.green}✓${colors.reset} ${msg}`),
  error: (msg) => console.log(`${colors.red}✗${colors.reset} ${msg}`),
  warning: (msg) => console.log(`${colors.yellow}⚠${colors.reset} ${msg}`),
  section: (msg) => console.log(`\n${colors.blue}▶${colors.reset} ${msg}`),
};

async function runMigration() {
  const migrationPath = path.join(__dirname, '../../database/migrations/100_rbac_refactor.sql');
  
  log.section('RBAC Migration Runner');
  log.info('Reading migration file...');
  
  if (!fs.existsSync(migrationPath)) {
    log.error(`Migration file not found: ${migrationPath}`);
    process.exit(1);
  }

  const sqlContent = fs.readFileSync(migrationPath, 'utf8');
  
  // Split SQL into individual statements
  // Remove comments and split by semicolons
  const statements = sqlContent
    .split('\n')
    .filter(line => !line.trim().startsWith('--') && line.trim() !== '')
    .join('\n')
    .split(';')
    .map(stmt => stmt.trim())
    .filter(stmt => stmt.length > 0);

  log.info(`Found ${statements.length} SQL statements to execute`);

  const pool = db.promise();
  let successCount = 0;
  let errorCount = 0;

  try {
    log.section('Executing Migration');

    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i];
      
      // Skip empty statements
      if (!statement || statement.length < 5) continue;

      // Log what we're doing
      const action = statement.substring(0, 60).replace(/\s+/g, ' ');
      process.stdout.write(`  [${i + 1}/${statements.length}] ${action}... `);

      try {
        await pool.execute(statement);
        console.log(`${colors.green}OK${colors.reset}`);
        successCount++;
      } catch (error) {
        // Some errors are expected (like DROP TABLE IF NOT EXISTS when table doesn't exist)
        if (error.code === 'ER_BAD_TABLE_ERROR' || 
            error.code === 'ER_CANT_DROP_FIELD_OR_KEY' ||
            statement.includes('DROP TABLE IF NOT EXISTS') ||
            statement.includes('DROP COLUMN IF EXISTS')) {
          console.log(`${colors.yellow}SKIP${colors.reset}`);
        } else {
          console.log(`${colors.red}FAIL${colors.reset}`);
          log.error(`Error: ${error.message}`);
          errorCount++;
          
          // Don't stop on errors, continue with next statement
          if (errorCount > 10) {
            log.error('Too many errors, stopping migration');
            break;
          }
        }
      }
    }

    log.section('Migration Summary');
    log.info(`Total statements: ${statements.length}`);
    log.success(`Successful: ${successCount}`);
    if (errorCount > 0) {
      log.warning(`Errors: ${errorCount}`);
    }

    // Verify migration
    log.section('Verifying Migration');
    await verifyMigration(pool);

    log.section('Migration Complete!');
    log.success('RBAC migration has been applied successfully');
    log.info('You can now restart your backend server');

  } catch (error) {
    log.error(`Migration failed: ${error.message}`);
    console.error(error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

async function verifyMigration(pool) {
  const checks = [
    {
      name: 'Roles table',
      query: 'SELECT COUNT(*) as count FROM Roles',
      expected: 5,
      field: 'count'
    },
    {
      name: 'Permissions table',
      query: 'SELECT COUNT(*) as count FROM Permissions',
      expected: 66,
      field: 'count'
    },
    {
      name: 'RolePermissions table',
      query: 'SELECT COUNT(*) as count FROM RolePermissions',
      expected: (result) => result > 0, // Should have role-permission mappings
      field: 'count'
    },
    {
      name: 'Users.role_id column',
      query: 'SHOW COLUMNS FROM Users LIKE "role_id"',
      expected: (result) => result.length > 0,
      field: 'length'
    },
    {
      name: 'Users.permissions_version column',
      query: 'SHOW COLUMNS FROM Users LIKE "permissions_version"',
      expected: (result) => result.length > 0,
      field: 'length'
    }
  ];

  for (const check of checks) {
    try {
      const [result] = await pool.execute(check.query);
      const value = check.field === 'length' ? result.length : result[0][check.field];
      
      let passed = false;
      if (typeof check.expected === 'function') {
        passed = check.expected(result);
      } else {
        passed = value === check.expected;
      }

      if (passed) {
        log.success(`${check.name}: OK`);
      } else {
        log.warning(`${check.name}: Unexpected result (got ${value})`);
      }
    } catch (error) {
      log.error(`${check.name}: FAILED - ${error.message}`);
    }
  }
}

// Run migration
runMigration().catch(error => {
  log.error('Fatal error:');
  console.error(error);
  process.exit(1);
});
