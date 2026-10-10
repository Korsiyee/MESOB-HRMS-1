const mysql = require('mysql2');
const fs = require('fs');
require('dotenv').config();

async function verifySchema() {
  let pool;
  let output = '';
  
  const log = (message) => {
    output += message + '\n';
    console.log(message);
  };
  
  try {
    // Create connection pool to database
    pool = mysql.createPool({
      host: process.env.DB_HOST || 'localhost',
      user: process.env.DB_USER || 'mesob',
      password: process.env.DB_PASSWORD || 'mesob_password',
      database: process.env.DB_NAME || 'mesob_hrms',
      waitForConnections: true,
      connectionLimit: 10,
      queueLimit: 0
    });

    const promisePool = pool.promise();
    
    // Test connection
    await promisePool.query('SELECT 1');
    
    log('✓ Connected to database: ' + (process.env.DB_NAME || 'mesob_hrms'));
    log('\n' + '='.repeat(80));
    log('DATABASE SCHEMA VERIFICATION');
    log('='.repeat(80) + '\n');

    // Get all tables
    const [tables] = await promisePool.query('SHOW TABLES');
    const tableNames = tables.map(row => Object.values(row)[0]);

    log(`Total tables found: ${tableNames.length}\n`);

    // Required Permission-based RBAC tables
    const requiredTables = [
      'Resources',
      'Permissions',
      'Role_Permissions',
      'DataScopes',
      'Role_Permission_Scopes',
      'Roles'
    ];

    // Obsolete tables to document
    const obsoleteTables = [
      'Modules',
      'RoleModules',
      'Occupations',
      'RoleOccupations'
    ];

    console.log('REQUIRED PERMISSION-BASED RBAC TABLES:');
    console.log('-'.repeat(80));
    
    for (const table of requiredTables) {
      const exists = tableNames.includes(table);
      const status = exists ? '✓ EXISTS' : '✗ MISSING';
      console.log(`  ${status.padEnd(15)} ${table}`);
      
      if (exists) {
        // Get table structure
        const [columns] = await promisePool.query(`DESCRIBE ${table}`);
        console.log(`                    Columns: ${columns.map(c => c.Field).join(', ')}`);
        
        // Get row count
        const [count] = await promisePool.query(`SELECT COUNT(*) as count FROM ${table}`);
        console.log(`                    Rows: ${count[0].count}`);
      }
      console.log();
    }

    console.log('\nOBSOLETE TABLES (should be documented but not dropped):');
    console.log('-'.repeat(80));
    
    for (const table of obsoleteTables) {
      const exists = tableNames.includes(table);
      if (exists) {
        console.log(`  ⚠ FOUND         ${table}`);
        
        // Get row count
        const [count] = await promisePool.query(`SELECT COUNT(*) as count FROM ${table}`);
        console.log(`                    Rows: ${count[0].count}`);
        
        // Get table structure
        const [columns] = await promisePool.query(`DESCRIBE ${table}`);
        console.log(`                    Columns: ${columns.map(c => c.Field).join(', ')}`);
      } else {
        console.log(`  ✓ NOT FOUND     ${table}`);
      }
      console.log();
    }

    console.log('\nALL TABLES IN DATABASE:');
    console.log('-'.repeat(80));
    tableNames.sort().forEach((table, index) => {
      console.log(`  ${(index + 1).toString().padStart(3)}. ${table}`);
    });

    console.log('\n' + '='.repeat(80));
    console.log('VERIFICATION SUMMARY');
    console.log('='.repeat(80) + '\n');

    const missingRequired = requiredTables.filter(t => !tableNames.includes(t));
    const foundObsolete = obsoleteTables.filter(t => tableNames.includes(t));

    if (missingRequired.length === 0) {
      console.log('✓ All required Permission-based RBAC tables exist');
    } else {
      console.log(`✗ Missing required tables: ${missingRequired.join(', ')}`);
    }

    if (foundObsolete.length > 0) {
      console.log(`⚠ Found ${foundObsolete.length} obsolete table(s): ${foundObsolete.join(', ')}`);
      console.log('  These should be documented but NOT dropped (may contain legacy data)');
    } else {
      console.log('✓ No obsolete tables found');
    }

    console.log('\n');

  } catch (error) {
    console.error('Error verifying schema:', error.message);
    if (error.code === 'ER_ACCESS_DENIED_ERROR') {
      console.error('Database access denied. Check credentials in .env file.');
    } else if (error.code === 'ECONNREFUSED') {
      console.error('Cannot connect to database. Is MySQL running?');
    }
    process.exit(1);
  } finally {
    if (pool) {
      await pool.end();
    }
  }
}

verifySchema();
