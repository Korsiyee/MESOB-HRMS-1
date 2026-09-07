/**
 * Run Level Migration with multipleStatements enabled
 */

require('dotenv').config();
const mysql = require('mysql2/promise');
const fs = require('fs');
const path = require('path');

async function runLevelMigration() {
  console.log('\n═══════════════════════════════════════════════════════════');
  console.log('RUNNING LEVEL MIGRATION');
  console.log('═══════════════════════════════════════════════════════════\n');
  
  let connection;
  
  try {
    // Create connection with multipleStatements enabled
    connection = await mysql.createConnection({
      host: process.env.DB_HOST,
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      database: process.env.DB_NAME,
      multipleStatements: true
    });
    
    console.log('✅ Connected to database\n');
    
    // Read migration file
    const migrationPath = path.join(__dirname, '../../database/migrations/006_create_levels.sql');
    const sql = fs.readFileSync(migrationPath, 'utf8');
    
    console.log('📝 Executing migration SQL...\n');
    
    // Execute all SQL at once
    await connection.query(sql);
    
    console.log('✅ Migration executed\n');
    
    // Verify tables
    console.log('═══════════════════════════════════════════════════════════');
    console.log('VERIFYING TABLES');
    console.log('═══════════════════════════════════════════════════════════\n');
    
    const [tables] = await connection.query('SHOW TABLES');
    const existingTables = tables.map(row => Object.values(row)[0].toLowerCase());
    
    const requiredTables = ['levels', 'levelversions', 'levelallowances', 'employeelevelhistory'];
    let allExist = true;
    
    for (const table of requiredTables) {
      const exists = existingTables.includes(table);
      console.log(`${exists ? '✅' : '❌'} ${table}`);
      if (!exists) allExist = false;
    }
    
    // Check Employees.level_uuid
    const [columns] = await connection.query(
      `SELECT COLUMN_NAME FROM information_schema.columns 
       WHERE table_schema = DATABASE() AND table_name = 'Employees' AND COLUMN_NAME = 'level_uuid'`
    );
    console.log(`${columns.length > 0 ? '✅' : '❌'} Employees.level_uuid`);
    
    //  Count data
    if (allExist) {
      const [levelCount] = await connection.query('SELECT COUNT(*) as count FROM Levels');
      console.log(`\n📊 Levels seeded: ${levelCount[0].count}`);
      
      const [versionCount] = await connection.query('SELECT COUNT(*) as count FROM LevelVersions');
      console.log(`📊 Versions created: ${versionCount[0].count}`);
      
      // Show sample data
      console.log('\n📋 Sample Levels:');
      const [levels] = await connection.query('SELECT name, sort_order, is_active FROM Levels ORDER BY sort_order LIMIT 5');
      console.table(levels);
    }
    
    console.log('\n═══════════════════════════════════════════════════════════');
    if (allExist && columns.length > 0) {
      console.log('✅ LEVEL MODULE CREATED SUCCESSFULLY!');
      console.log('═══════════════════════════════════════════════════════════');
      console.log('\n📝 Next Steps:');
      console.log('   1. Test the Level API: node scripts/verifyLevels.js');
      console.log('   2. Implement frontend (see FRONTEND_IMPLEMENTATION_GUIDE.md)');
      console.log('   3. Add RBAC permissions: Levels - Overview, Levels - Manage\n');
      await connection.end();
      process.exit(0);
    } else {
      console.log('⚠️  SOME COMPONENTS ARE MISSING');
      console.log('═══════════════════════════════════════════════════════════\n');
      await connection.end();
      process.exit(1);
    }
  } catch (error) {
    console.error('\n❌ Error:', error.message);
    console.error('\nStack:', error.stack);
    if (connection) await connection.end();
    process.exit(1);
  }
}

runLevelMigration();
