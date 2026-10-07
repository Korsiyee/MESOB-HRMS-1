#!/usr/bin/env node
require('dotenv').config();
const mysql = require('mysql2/promise');

async function fixCollation() {
  let connection;
  
  try {
    console.log('Fixing database collation mismatch...\n');
    
    connection = await mysql.createConnection({
      host: process.env.DB_HOST || 'localhost',
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD,
      database: process.env.DB_NAME || 'hrms_leave_service'
    });

    // Disable foreign key checks
    await connection.execute('SET FOREIGN_KEY_CHECKS = 0');
    console.log('✓ Foreign key checks disabled\n');

    // Fix Users table
    console.log('Fixing Users table...');
    await connection.execute('ALTER TABLE Users CONVERT TO CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci');
    console.log('✓ Users table collation fixed');

    // Fix Roles table
    console.log('Fixing Roles table...');
    await connection.execute('ALTER TABLE Roles CONVERT TO CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci');
    console.log('✓ Roles table collation fixed');

    // Fix Modules table
    console.log('Fixing Modules table...');
    await connection.execute('ALTER TABLE Modules CONVERT TO CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci');
    console.log('✓ Modules table collation fixed');

    // Fix RoleModules table
    console.log('Fixing RoleModules table...');
    await connection.execute('ALTER TABLE RoleModules CONVERT TO CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci');
    console.log('✓ RoleModules table collation fixed');

    // Fix Scopes table
    console.log('Fixing Scopes table...');
    await connection.execute('ALTER TABLE Scopes CONVERT TO CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci');
    console.log('✓ Scopes table collation fixed');

    // Fix Employees table (referenced by Users)
    console.log('Fixing Employees table...');
    await connection.execute('ALTER TABLE Employees CONVERT TO CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci');
    console.log('✓ Employees table collation fixed');

    // Re-enable foreign key checks
    await connection.execute('SET FOREIGN_KEY_CHECKS = 1');
    console.log('\n✓ Foreign key checks re-enabled');

    console.log('\n✅ All collations fixed to utf8mb4_unicode_ci');
    console.log('\nPlease restart the backend server now!');
    
    await connection.end();
    process.exit(0);
    
  } catch (error) {
    console.error('\n❌ Error:', error.message);
    
    if (connection) {
      try {
        await connection.execute('SET FOREIGN_KEY_CHECKS = 1');
      } catch (e) {
        // Ignore
      }
      await connection.end();
    }
    
    process.exit(1);
  }
}

fixCollation();
