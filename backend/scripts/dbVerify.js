/**
 * Database Verification Script
 * Checks database integrity and reports on schema status
 */

const mysql = require('mysql2/promise');
require('dotenv').config();

const DB_HOST = process.env.DB_HOST;
const DB_USER = process.env.DB_USER;
const DB_PASSWORD = process.env.DB_PASSWORD || '';
const DB_NAME = process.env.DB_NAME;

// Expected tables in the database (lowercase for MySQL compatibility)
const EXPECTED_TABLES = [
  'leavepolicies',
  'holidays',
  'departments',
  'positions',
  'occupations',
  'employees',
  'mesobidsequence',
  'employeeaddresses',
  'employeeiddocuments',
  'employeeregistrationdrafts',
  'employeefaceimages',
  'employeeoccupations',
  'users',
  'shiftdefinitions',
  'employeeshifts',
  'attendancelogs',
  'attendancesummary',
  'networksettings',
  'employeeleavebalances',
  'leaverequests',
  'leaverequestdocuments',
  'leavepostponements',
  'lettertemplates',
  'issuedletters',
  'letterrequests',
  'notifications',
  'auditlogs',
  '_migrations'
];

async function verifyDatabase() {
  let connection;
  
  try {
    console.log('\n' + '='.repeat(70));
    console.log('🔍 DATABASE VERIFICATION');
    console.log('='.repeat(70));
    console.log(`Database: ${DB_NAME}`);
    console.log(`Host: ${DB_HOST}`);
    console.log('='.repeat(70) + '\n');
    
    // Connect to database
    console.log('🔄 Connecting to database...');
    connection = await mysql.createConnection({
      host: DB_HOST,
      user: DB_USER,
      password: DB_PASSWORD,
      database: DB_NAME
    });
    console.log('✅ Connected to database\n');
    
    // Check if database exists and get table count
    const [dbInfo] = await connection.query(
      `SELECT COUNT(*) as table_count 
       FROM INFORMATION_SCHEMA.TABLES 
       WHERE TABLE_SCHEMA = ? AND TABLE_TYPE = 'BASE TABLE'`,
      [DB_NAME]
    );
    
    const tableCount = dbInfo[0].table_count;
    
    if (tableCount === 0) {
      console.log('❌ Database is empty!');
      console.log('💡 Run "npm run db:init" to initialize the database\n');
      process.exit(1);
    }
    
    console.log(`📊 Total tables found: ${tableCount}`);
    console.log(`📋 Expected tables: ${EXPECTED_TABLES.length}\n`);
    
    // Get all existing tables
    const [existingTables] = await connection.query(
      `SELECT TABLE_NAME, TABLE_ROWS, 
              ROUND((DATA_LENGTH + INDEX_LENGTH) / 1024 / 1024, 2) AS size_mb
       FROM INFORMATION_SCHEMA.TABLES 
       WHERE TABLE_SCHEMA = ? 
       AND TABLE_TYPE = 'BASE TABLE'
       ORDER BY TABLE_NAME`,
      [DB_NAME]
    );
    
    const existingTableNames = existingTables.map(t => t.TABLE_NAME);
    
    // Check for missing tables
    const missingTables = EXPECTED_TABLES.filter(
      t => !existingTableNames.includes(t)
    );
    
    // Check for unexpected tables
    const unexpectedTables = existingTableNames.filter(
      t => !EXPECTED_TABLES.includes(t)
    );
    
    // Report on table status
    if (missingTables.length === 0 && unexpectedTables.length === 0) {
      console.log('✅ All expected tables present\n');
    } else {
      if (missingTables.length > 0) {
        console.log(`⚠️  Missing tables (${missingTables.length}):`);
        missingTables.forEach(t => console.log(`   ❌ ${t}`));
        console.log('');
      }
      
      if (unexpectedTables.length > 0) {
        console.log(`⚠️  Unexpected tables (${unexpectedTables.length}):`);
        unexpectedTables.forEach(t => console.log(`   ⚠️  ${t}`));
        console.log('');
      }
    }
    
    // Check key tables for data
    console.log('📊 DATA SUMMARY:\n');
    
    const keyTables = [
      { name: 'users', critical: true },
      { name: 'employees', critical: true },
      { name: 'departments', critical: true },
      { name: 'positions', critical: false },
      { name: 'occupations', critical: true },
      { name: 'leavepolicies', critical: true },
      { name: 'leaverequests', critical: false },
      { name: 'attendancelogs', critical: false },
      { name: '_migrations', critical: false }
    ];
    
    for (const { name, critical } of keyTables) {
      const table = existingTables.find(t => t.TABLE_NAME === name);
      if (table) {
        const rowCount = table.TABLE_ROWS || 0;
        const icon = rowCount > 0 ? '✅' : (critical ? '⚠️ ' : '  ');
        const status = rowCount > 0 ? '' : (critical ? ' (EMPTY - CRITICAL!)' : ' (empty)');
        console.log(`${icon} ${name}: ${rowCount} rows${status}`);
      } else {
        console.log(`❌ ${name}: MISSING!`);
      }
    }
    
    // Check migrations
    console.log('\n📋 MIGRATIONS:\n');
    try {
      const [migrations] = await connection.query(
        'SELECT filename, executed_at FROM _migrations ORDER BY executed_at DESC LIMIT 10'
      );
      
      if (migrations.length === 0) {
        console.log('  No migrations executed yet');
        console.log('  💡 Run "npm run db:migrate" if you have migration files');
      } else {
        console.log(`  Total migrations executed: ${migrations.length}`);
        console.log('\n  Recent migrations:');
        migrations.slice(0, 5).forEach(m => {
          console.log(`    • ${m.filename} (${m.executed_at.toISOString().split('T')[0]})`);
        });
      }
    } catch (err) {
      console.log('  ⚠️  Migration tracking table not found or empty');
    }
    
    // Check for foreign key issues
    console.log('\n🔗 FOREIGN KEY CONSTRAINTS:\n');
    const [fkInfo] = await connection.query(
      `SELECT COUNT(*) as fk_count 
       FROM INFORMATION_SCHEMA.KEY_COLUMN_USAGE 
       WHERE REFERENCED_TABLE_SCHEMA = ? 
       AND REFERENCED_TABLE_NAME IS NOT NULL`,
      [DB_NAME]
    );
    console.log(`  Total foreign key constraints: ${fkInfo[0].fk_count}`);
    
    // Check for indexes
    const [indexInfo] = await connection.query(
      `SELECT COUNT(DISTINCT INDEX_NAME) as index_count 
       FROM INFORMATION_SCHEMA.STATISTICS 
       WHERE TABLE_SCHEMA = ?`,
      [DB_NAME]
    );
    console.log(`  Total indexes: ${indexInfo[0].index_count}`);
    
    // Final verdict
    console.log('\n' + '='.repeat(70));
    
    if (missingTables.length === 0) {
      console.log('✅ DATABASE STATUS: HEALTHY');
      console.log('='.repeat(70));
      console.log('\n💡 Database is properly initialized and ready to use\n');
    } else {
      console.log('⚠️  DATABASE STATUS: INCOMPLETE');
      console.log('='.repeat(70));
      console.log('\n💡 Recommended actions:');
      console.log('   1. Run "npm run db:reset" for a fresh setup');
      console.log('   2. Or run "npm run db:migrate" to apply missing changes\n');
      process.exit(1);
    }
    
  } catch (error) {
    console.error('\n❌ Verification failed:', error.message);
    
    if (error.code === 'ER_BAD_DB_ERROR') {
      console.log('\n💡 Database does not exist. Run "npm run db:init" to create it\n');
    } else if (error.code === 'ECONNREFUSED') {
      console.log('\n💡 Cannot connect to MySQL. Check if MySQL is running and credentials are correct\n');
    }
    
    process.exit(1);
  } finally {
    if (connection) {
      await connection.end();
      console.log('🔌 Database connection closed\n');
    }
  }
}

// Run verification
verifyDatabase();
