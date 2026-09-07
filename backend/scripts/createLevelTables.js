/**
 * Create Level Tables - Direct Execution
 */

require('dotenv').config();
const { db } = require('../src/config/db');
const fs = require('fs');
const path = require('path');

async function createLevelTables() {
  console.log('\n═══════════════════════════════════════════════════════════');
  console.log('CREATING LEVEL TABLES');
  console.log('═══════════════════════════════════════════════════════════\n');
  
  try {
    const promisePool = db.promise();
    
    // Read the migration file
    const migrationPath = path.join(__dirname, '../../database/migrations/006_create_levels.sql');
    const sql = fs.readFileSync(migrationPath, 'utf8');
    
    // Split into individual statements
    const statements = sql
      .split(';')
      .map(s => s.trim())
      .filter(s => s.length > 0 && !s.startsWith('--') && s.toUpperCase() !== 'SELECT');
    
    console.log(`Found ${statements.length} SQL statements to execute\n`);
    
    for (let i = 0; i < statements.length; i++) {
      const stmt = statements[i];
      
      // Extract table name for logging
      let tableName = 'unknown';
      if (stmt.includes('DROP TABLE')) {
        const match = stmt.match(/DROP TABLE IF EXISTS (\w+)/i);
        tableName = match ? match[1] : 'unknown';
        console.log(`${i + 1}. Dropping table: ${tableName}`);
      } else if (stmt.includes('CREATE TABLE')) {
        const match = stmt.match(/CREATE TABLE IF NOT EXISTS (\w+)/i);
        tableName = match ? match[1] : 'unknown';
        console.log(`${i + 1}. Creating table: ${tableName}`);
      } else if (stmt.includes('ALTER TABLE')) {
        const match = stmt.match(/ALTER TABLE (\w+)/i);
        tableName = match ? match[1] : 'unknown';
        console.log(`${i + 1}. Altering table: ${tableName}`);
      } else if (stmt.includes('INSERT INTO')) {
        const match = stmt.match(/INSERT INTO (\w+)/i);
        tableName = match ? match[1] : 'unknown';
        console.log(`${i + 1}. Inserting data into: ${tableName}`);
      } else {
        console.log(`${i + 1}. Executing statement...`);
      }
      
      try {
        await promisePool.query(stmt);
        console.log(`   ✅ Success\n`);
      } catch (error) {
        if (error.code === 'ER_TABLE_EXISTS_ERROR') {
          console.log(`   ⚠️  Table already exists\n`);
        } else if (error.code === 'ER_DUP_FIELDNAME') {
          console.log(`   ⚠️  Column already exists\n`);
        } else if (error.code === 'ER_CANT_DROP_FIELD_OR_KEY') {
          console.log(`   ⚠️  Column/key doesn't exist\n`);
        } else {
          console.error(`   ❌ Error: ${error.message}\n`);
          // Continue with next statement
        }
      }
    }
    
    // Verify tables were created
    console.log('═══════════════════════════════════════════════════════════');
    console.log('VERIFYING TABLES');
    console.log('═══════════════════════════════════════════════════════════\n');
    
    const [tables] = await promisePool.query('SHOW TABLES');
    const existingTables = tables.map(row => Object.values(row)[0].toLowerCase());
    
    const requiredTables = ['levels', 'levelversions', 'levelallowances', 'employeelevelhistory'];
    let allExist = true;
    
    for (const table of requiredTables) {
      const exists = existingTables.includes(table);
      console.log(`${exists ? '✅' : '❌'} ${table}`);
      if (!exists) allExist = false;
    }
    
    // Check Employees table for level_uuid
    const [columns] = await promisePool.query(
      `SELECT COLUMN_NAME FROM information_schema.columns 
       WHERE table_schema = DATABASE() AND table_name = 'Employees' AND COLUMN_NAME = 'level_uuid'`
    );
    console.log(`${columns.length > 0 ? '✅' : '❌'} Employees.level_uuid column`);
    
    // Count levels
    const [levelCount] = await promisePool.query('SELECT COUNT(*) as count FROM Levels');
    console.log(`\n📊 Levels seeded: ${levelCount[0].count}`);
    
    const [versionCount] = await promisePool.query('SELECT COUNT(*) as count FROM LevelVersions');
    console.log(`📊 Versions created: ${versionCount[0].count}`);
    
    console.log('\n═══════════════════════════════════════════════════════════');
    if (allExist && columns.length > 0) {
      console.log('✅ ALL LEVEL TABLES CREATED SUCCESSFULLY!');
    } else {
      console.log('⚠️  SOME TABLES ARE MISSING');
    }
    console.log('═══════════════════════════════════════════════════════════\n');
    
    await promisePool.end();
    process.exit(allExist && columns.length > 0 ? 0 : 1);
  } catch (error) {
    console.error('\n❌ Fatal Error:', error.message);
    console.error(error);
    process.exit(1);
  }
}

createLevelTables();
