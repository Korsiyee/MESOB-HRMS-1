const mysql = require('mysql2');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

async function verifySchema() {
  let pool;
  let output = [];
  
  const log = (message) => {
    output.push(message);
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
    log('');
    log('='.repeat(80));
    log('DATABASE SCHEMA VERIFICATION');
    log('='.repeat(80));
    log('');

    // Get all tables
    const [tables] = await promisePool.query('SHOW TABLES');
    const tableNames = tables.map(row => Object.values(row)[0]);

    log(`Total tables found: ${tableNames.length}`);
    log('');

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

    log('REQUIRED PERMISSION-BASED RBAC TABLES:');
    log('-'.repeat(80));
    
    for (const table of requiredTables) {
      const exists = tableNames.includes(table);
      const status = exists ? '✓ EXISTS' : '✗ MISSING';
      log(`  ${status.padEnd(15)} ${table}`);
      
      if (exists) {
        // Get table structure
        const [columns] = await promisePool.query(`DESCRIBE ${table}`);
        log(`                    Columns: ${columns.map(c => c.Field).join(', ')}`);
        
        // Get row count
        const [count] = await promisePool.query(`SELECT COUNT(*) as count FROM ${table}`);
        log(`                    Rows: ${count[0].count}`);
      }
      log('');
    }

    log('');
    log('OBSOLETE TABLES (should be documented but not dropped):');
    log('-'.repeat(80));
    
    for (const table of obsoleteTables) {
      const exists = tableNames.includes(table);
      if (exists) {
        log(`  ⚠ FOUND         ${table}`);
        
        // Get row count
        const [count] = await promisePool.query(`SELECT COUNT(*) as count FROM ${table}`);
        log(`                    Rows: ${count[0].count}`);
        
        // Get table structure
        const [columns] = await promisePool.query(`DESCRIBE ${table}`);
        log(`                    Columns: ${columns.map(c => c.Field).join(', ')}`);
      } else {
        log(`  ✓ NOT FOUND     ${table}`);
      }
      log('');
    }

    log('');
    log('ALL TABLES IN DATABASE:');
    log('-'.repeat(80));
    tableNames.sort().forEach((table, index) => {
      log(`  ${(index + 1).toString().padStart(3)}. ${table}`);
    });

    log('');
    log('='.repeat(80));
    log('VERIFICATION SUMMARY');
    log('='.repeat(80));
    log('');

    const missingRequired = requiredTables.filter(t => !tableNames.includes(t));
    const foundObsolete = obsoleteTables.filter(t => tableNames.includes(t));

    if (missingRequired.length === 0) {
      log('✓ All required Permission-based RBAC tables exist');
    } else {
      log(`✗ Missing required tables: ${missingRequired.join(', ')}`);
    }

    if (foundObsolete.length > 0) {
      log(`⚠ Found ${foundObsolete.length} obsolete table(s): ${foundObsolete.join(', ')}`);
      log('  These should be documented but NOT dropped (may contain legacy data)');
    } else {
      log('✓ No obsolete tables found');
    }

    log('');
    
    // Write output to file
    const outputPath = path.join(__dirname, '..', 'DATABASE_SCHEMA_VERIFICATION.md');
    const outputContent = '# Database Schema Verification Report\n\n```\n' + output.join('\n') + '\n```\n';
    fs.writeFileSync(outputPath, outputContent);
    
    // Also print to console
    output.forEach(line => console.log(line));
    
    console.log('\nReport written to:', outputPath);

  } catch (error) {
    const errMsg = 'Error verifying schema: ' + error.message;
    log(errMsg);
    console.error(errMsg);
    
    if (error.code === 'ER_ACCESS_DENIED_ERROR') {
      const accessMsg = 'Database access denied. Check credentials in .env file.';
      log(accessMsg);
      console.error(accessMsg);
    } else if (error.code === 'ECONNREFUSED') {
      const connMsg = 'Cannot connect to database. Is MySQL running?';
      log(connMsg);
      console.error(connMsg);
    }
    
    // Write error to file
    const outputPath = path.join(__dirname, '..', 'DATABASE_SCHEMA_VERIFICATION.md');
    const outputContent = '# Database Schema Verification Report\n\n```\n' + output.join('\n') + '\n```\n';
    fs.writeFileSync(outputPath, outputContent);
    
    process.exit(1);
  } finally {
    if (pool) {
      await pool.end();
    }
  }
}

verifySchema();
