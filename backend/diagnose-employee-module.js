#!/usr/bin/env node

/**
 * Employee Module Diagnostic Tool
 * Checks database tables, connections, and basic functionality
 */

const mysql = require('mysql2/promise');
require('dotenv').config();

async function diagnose() {
  console.log('='.repeat(70));
  console.log('EMPLOYEE MODULE DIAGNOSTIC TOOL');
  console.log('='.repeat(70));
  console.log();

  try {
    // Step 1: Test database connection
    console.log('1. Testing database connection...');
    const connection = await mysql.createConnection({
      host: process.env.DB_HOST,
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      database: process.env.DB_NAME
    });
    console.log('   ✓ Database connection successful');
    console.log(`   Database: ${process.env.DB_NAME}`);
    console.log();

    // Step 2: Check critical tables
    console.log('2. Checking critical tables...');
    const criticalTables = [
      'Employees',
      'EmployeeAddresses',
      'EmployeeIDDocuments',
      'EmployeeFaceImages',
      'EmployeeRegistrationDrafts',
      'Departments',
      'Positions',
      'Levels',
      'Occupations',
      'Notifications',
      'Users'
    ];

    let missingTables = [];
    for (const table of criticalTables) {
      const [rows] = await connection.query(`SHOW TABLES LIKE '${table}'`);
      const exists = rows.length > 0;
      console.log(`   ${exists ? '✓' : '✗'} ${table}`);
      if (!exists) missingTables.push(table);
    }
    console.log();

    if (missingTables.length > 0) {
      console.log('   ⚠ WARNING: Missing tables detected!');
      console.log('   Missing:', missingTables.join(', '));
      console.log('   Run the full schema.sql to create missing tables.');
      console.log();
    }

    // Step 3: Check Employees table structure
    console.log('3. Checking Employees table structure...');
    const [employeeColumns] = await connection.query(`
      SELECT COLUMN_NAME, DATA_TYPE, IS_NULLABLE, COLUMN_KEY
      FROM information_schema.COLUMNS
      WHERE TABLE_SCHEMA = '${process.env.DB_NAME}'
      AND TABLE_NAME = 'Employees'
      ORDER BY ORDINAL_POSITION
    `);
    
    const requiredColumns = [
      'uuid', 'mesob_id', 'first_name', 'middle_name', 'last_name',
      'mother_name', 'gender', 'date_of_birth', 'hire_date', 'status',
      'department_uuid', 'position_uuid'
    ];
    
    const existingColumns = employeeColumns.map(c => c.COLUMN_NAME);
    const missingColumns = requiredColumns.filter(c => !existingColumns.includes(c));
    
    if (missingColumns.length === 0) {
      console.log('   ✓ All required columns exist');
    } else {
      console.log('   ✗ Missing columns:', missingColumns.join(', '));
    }
    console.log();

    // Step 4: Check EmployeeAddresses table
    console.log('4. Checking EmployeeAddresses table structure...');
    const [addressColumns] = await connection.query(`
      SELECT COLUMN_NAME
      FROM information_schema.COLUMNS
      WHERE TABLE_SCHEMA = '${process.env.DB_NAME}'
      AND TABLE_NAME = 'EmployeeAddresses'
    `);
    
    if (addressColumns.length > 0) {
      console.log(`   ✓ EmployeeAddresses has ${addressColumns.length} columns`);
    } else {
      console.log('   ✗ EmployeeAddresses table is missing or empty');
    }
    console.log();

    // Step 5: Count records
    console.log('5. Checking data counts...');
    const [employeeCount] = await connection.query('SELECT COUNT(*) as count FROM Employees');
    const [deptCount] = await connection.query('SELECT COUNT(*) as count FROM Departments');
    const [userCount] = await connection.query('SELECT COUNT(*) as count FROM Users');
    
    console.log(`   Employees: ${employeeCount[0].count}`);
    console.log(`   Departments: ${deptCount[0].count}`);
    console.log(`   Users: ${userCount[0].count}`);
    console.log();

    // Step 6: Test basic query
    console.log('6. Testing employee profile query...');
    try {
      const [testEmployee] = await connection.query(`
        SELECT e.uuid, e.mesob_id, e.first_name, e.middle_name, e.last_name,
               d.name AS department_name
        FROM Employees e
        LEFT JOIN Departments d ON d.uuid = e.department_uuid
        LIMIT 1
      `);
      
      if (testEmployee.length > 0) {
        console.log('   ✓ Query successful');
        console.log(`   Sample: ${testEmployee[0].first_name} ${testEmployee[0].last_name} (${testEmployee[0].mesob_id})`);
      } else {
        console.log('   ⚠ No employees found in database');
      }
    } catch (error) {
      console.log('   ✗ Query failed:', error.message);
    }
    console.log();

    // Step 7: Test EmployeeAddresses join
    console.log('7. Testing EmployeeAddresses join...');
    try {
      const [testJoin] = await connection.query(`
        SELECT e.uuid, e.first_name, a.email
        FROM Employees e
        LEFT JOIN EmployeeAddresses a ON e.uuid = a.employee_uuid AND a.address_type = 'CURRENT'
        LIMIT 1
      `);
      console.log('   ✓ EmployeeAddresses join successful');
    } catch (error) {
      console.log('   ✗ Join failed:', error.message);
    }
    console.log();

    await connection.end();

    console.log('='.repeat(70));
    console.log('DIAGNOSIS COMPLETE');
    console.log('='.repeat(70));
    console.log();
    
    if (missingTables.length === 0) {
      console.log('✓ All critical tables exist');
      console.log('✓ Employee module should work correctly');
      console.log();
      console.log('If issues persist, check:');
      console.log('  1. Browser console for frontend errors');
      console.log('  2. Network tab for API response errors');
      console.log('  3. Backend logs for detailed error messages');
    } else {
      console.log('⚠ ACTION REQUIRED:');
      console.log('  Missing tables detected. Run:');
      console.log('  mysql -u mesob -pmesob_password mesob_hrms < database/schema.sql');
    }
    console.log();

  } catch (error) {
    console.error();
    console.error('✗ DIAGNOSTIC FAILED');
    console.error('Error:', error.message);
    console.error();
    console.error('Check your database connection settings in .env file');
    process.exit(1);
  }
}

diagnose();
