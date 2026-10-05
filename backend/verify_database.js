/**
 * Database Verification Script
 * Verifies that all required tables exist with correct columns
 */

require('dotenv').config();
const mysql = require('mysql2/promise');

const DB_HOST = process.env.DB_HOST;
const DB_USER = process.env.DB_USER;
const DB_PASSWORD = process.env.DB_PASSWORD || '';
const DB_NAME = process.env.DB_NAME;

const REQUIRED_TABLES = [
  'leavePolicies',
  'Holidays',
  'Departments',
  'Positions',
  'Occupations',
  'Employees',
  'EmployeeAddresses',
  'EmployeeIDDocuments',
  'EmployeeFaceImages',
  'EmployeeOccupations',
  'Users',
  'ShiftDefinitions',
  'EmployeeShifts',
  'AttendanceLogs',
  'AttendanceSummary',
  'NetworkSettings',
  'employeeLeaveBalances',
  'leaveRequests',
  'leaveRequestDocuments',
  'leavePostponements',
  'LetterTemplates',
  'IssuedLetters',
  'LetterRequests',
  'Notifications',
  'AuditLogs',
  '_migrations'
];

const CRITICAL_COLUMNS = {
  'leaveRequests': ['rejectionReason', 'supportingDocument', 'dayPattern', 'dailyPlanJson', 'total_days'],
  'Holidays': ['isActive', 'source', 'description'],
  'EmployeeIDDocuments': ['original_name', 'mime_type', 'file_size', 'created_at', 'updated_at'],
  'IssuedLetters': ['generated_content', 'name', 'type'],
  'employeeLeaveBalances': ['entitledDays', 'carriedForwardDays', 'usedDays', 'remainingDays'],
  'leavePostponements': ['postponedDays']
};

async function verifyDatabase() {
  let connection;
  
  try {
    console.log('\n' + '='.repeat(70));
    console.log('🔍 DATABASE VERIFICATION');
    console.log('='.repeat(70));
    console.log(`Database: ${DB_NAME}`);
    console.log(`Host: ${DB_HOST}`);
    console.log('='.repeat(70) + '\n');
    
    connection = await mysql.createConnection({
      host: DB_HOST,
      user: DB_USER,
      password: DB_PASSWORD,
      database: DB_NAME
    });
    
    console.log('✅ Connected to database\n');
    
    // Check if all required tables exist
    console.log('📋 Checking required tables...\n');
    
    const [tables] = await connection.query(
      `SELECT TABLE_NAME, TABLE_TYPE 
       FROM INFORMATION_SCHEMA.TABLES 
       WHERE TABLE_SCHEMA = ? 
       ORDER BY TABLE_NAME`,
      [DB_NAME]
    );
    
    const existingTables = new Set(tables.map(t => t.TABLE_NAME));
    const existingViews = new Set(
      tables.filter(t => t.TABLE_TYPE === 'VIEW').map(t => t.TABLE_NAME)
    );
    
    let missingTables = [];
    let incorrectViews = [];
    
    for (const tableName of REQUIRED_TABLES) {
      if (!existingTables.has(tableName)) {
        missingTables.push(tableName);
        console.log(`  ❌ Missing: ${tableName}`);
      } else if (existingViews.has(tableName)) {
        incorrectViews.push(tableName);
        console.log(`  ⚠️  INCORRECT: ${tableName} is a VIEW (should be BASE TABLE)`);
      } else {
        console.log(`  ✅ ${tableName}`);
      }
    }
    
    if (missingTables.length === 0 && incorrectViews.length === 0) {
      console.log('\n✅ All required tables exist and are BASE TABLES\n');
    } else {
      if (missingTables.length > 0) {
        console.log(`\n❌ Missing ${missingTables.length} table(s)\n`);
      }
      if (incorrectViews.length > 0) {
        console.log(`\n❌ ${incorrectViews.length} table(s) incorrectly created as VIEWs\n`);
      }
    }
    
    // Check critical columns
    console.log('📋 Checking critical columns...\n');
    
    let missingColumns = [];
    
    for (const [tableName, columns] of Object.entries(CRITICAL_COLUMNS)) {
      if (!existingTables.has(tableName)) {
        console.log(`  ⚠️  Skipping ${tableName} (table doesn't exist)`);
        continue;
      }
      
      const [tableColumns] = await connection.query(
        `SELECT COLUMN_NAME, DATA_TYPE 
         FROM INFORMATION_SCHEMA.COLUMNS 
         WHERE TABLE_SCHEMA = ? AND TABLE_NAME = ?`,
        [DB_NAME, tableName]
      );
      
      const existingColumns = new Set(tableColumns.map(c => c.COLUMN_NAME));
      
      console.log(`  Table: ${tableName}`);
      for (const columnName of columns) {
        if (existingColumns.has(columnName)) {
          const colInfo = tableColumns.find(c => c.COLUMN_NAME === columnName);
          console.log(`    ✅ ${columnName} (${colInfo.DATA_TYPE})`);
        } else {
          missingColumns.push(`${tableName}.${columnName}`);
          console.log(`    ❌ ${columnName} (MISSING)`);
        }
      }
    }
    
    if (missingColumns.length === 0) {
      console.log('\n✅ All critical columns exist\n');
    } else {
      console.log(`\n❌ Missing ${missingColumns.length} critical column(s)\n`);
    }
    
    // Check for data
    console.log('📋 Checking seed data...\n');
    
    const dataChecks = [
      { table: 'leavePolicies', expected: 6 },
      { table: 'Departments', expected: 38 },
      { table: 'Positions', expected: 100 },
      { table: 'Employees', expected: 25 },
      { table: 'Users', expected: 8 },
      { table: 'Holidays', expected: 10 }
    ];
    
    for (const check of dataChecks) {
      if (!existingTables.has(check.table)) {
        console.log(`  ⚠️  ${check.table}: table doesn't exist`);
        continue;
      }
      
      const [rows] = await connection.query(
        `SELECT COUNT(*) as count FROM ${check.table}`
      );
      const count = rows[0].count;
      
      if (count >= check.expected) {
        console.log(`  ✅ ${check.table}: ${count} rows (expected >= ${check.expected})`);
      } else {
        console.log(`  ⚠️  ${check.table}: ${count} rows (expected >= ${check.expected})`);
      }
    }
    
    // Summary
    console.log('\n' + '='.repeat(70));
    console.log('📊 VERIFICATION SUMMARY');
    console.log('='.repeat(70));
    console.log(`Total tables: ${existingTables.size}`);
    console.log(`Required tables: ${REQUIRED_TABLES.length}`);
    console.log(`Missing tables: ${missingTables.length}`);
    console.log(`Incorrect VIEWs: ${incorrectViews.length}`);
    console.log(`Missing columns: ${missingColumns.length}`);
    console.log('='.repeat(70));
    
    if (missingTables.length === 0 && incorrectViews.length === 0 && missingColumns.length === 0) {
      console.log('\n✅ DATABASE VERIFICATION PASSED!\n');
      console.log('The database is correctly configured and ready to use.\n');
      process.exit(0);
    } else {
      console.log('\n❌ DATABASE VERIFICATION FAILED!\n');
      console.log('Please run: npm run db:reset or ./database/reset-dev.sh\n');
      process.exit(1);
    }
    
  } catch (error) {
    console.error('\n❌ Verification failed:', error.message);
    process.exit(1);
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

verifyDatabase();
