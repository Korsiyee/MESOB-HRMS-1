/**
 * Verify Level Module Implementation
 */

require('dotenv').config();
const { db } = require('../src/config/db');

async function verifyLevels() {
  console.log('\n═══════════════════════════════════════════════════════════');
  console.log('LEVEL MODULE VERIFICATION');
  console.log('═══════════════════════════════════════════════════════════\n');
  
  try {
    const promisePool = db.promise();
    
    // 1. Check tables exist
    console.log('1. Checking if Level tables exist...');
    const [tables] = await promisePool.query('SHOW TABLES');
    const existingTables = tables.map(row => Object.values(row)[0].toLowerCase());
    
    const requiredTables = ['levels', 'levelversions', 'levelallowances', 'employeelevelhistory'];
    let allTablesExist = true;
    
    for (const table of requiredTables) {
      const exists = existingTables.includes(table);
      console.log(`   ${exists ? '✅' : '❌'} ${table}`);
      if (!exists) allTablesExist = false;
    }
    
    if (!allTablesExist) {
      console.log('\n❌ Some tables are missing. Run migration first.\n');
      process.exit(1);
    }
    
    // 2. Check Employees table has level_uuid column
    console.log('\n2. Checking Employees table for level_uuid column...');
    const [columns] = await promisePool.query(
      `SELECT COLUMN_NAME FROM information_schema.columns 
       WHERE table_schema = DATABASE() AND table_name = 'Employees' AND COLUMN_NAME = 'level_uuid'`
    );
    
    if (columns.length > 0) {
      console.log('   ✅ level_uuid column exists in Employees table');
    } else {
      console.log('   ❌ level_uuid column missing from Employees table');
    }
    
    // 3. Count seeded levels
    console.log('\n3. Checking seeded levels...');
    const [levelCount] = await promisePool.query('SELECT COUNT(*) as count FROM Levels');
    console.log(`   📊 Total levels: ${levelCount[0].count}`);
    
    // 4. List levels
    console.log('\n4. Listing all levels:');
    const [levels] = await promisePool.query(
      'SELECT name, sort_order, is_active FROM Levels ORDER BY sort_order'
    );
    console.table(levels);
    
    // 5. Check level versions
    console.log('5. Checking level versions...');
    const [versionCount] = await promisePool.query('SELECT COUNT(*) as count FROM LevelVersions');
    console.log(`   📊 Total versions: ${versionCount[0].count}`);
    
    const [versions] = await promisePool.query(`
      SELECT l.name, lv.base_salary, lv.effective_from, lv.version_number 
      FROM Levels l 
      JOIN LevelVersions lv ON lv.level_uuid = l.uuid 
      ORDER BY l.sort_order 
      LIMIT 5
    `);
    console.log('\n   Sample versions:');
    console.table(versions);
    
    // 6. Check employees with levels
    console.log('6. Checking employees assigned to levels...');
    const [empCount] = await promisePool.query(
      'SELECT COUNT(*) as count FROM Employees WHERE level_uuid IS NOT NULL'
    );
    console.log(`   📊 Employees with level assigned: ${empCount[0].count}`);
    
    // 7. Test query: Levels with employee counts
    console.log('\n7. Testing complex query (Levels with employee counts)...');
    const [levelStats] = await promisePool.query(`
      SELECT 
        l.name,
        l.sort_order,
        COUNT(DISTINCT e.uuid) AS employee_count,
        lv.base_salary AS current_base_salary
      FROM Levels l
      LEFT JOIN Employees e ON e.level_uuid = l.uuid AND e.status = 'ACTIVE'
      LEFT JOIN LevelVersions lv ON lv.level_uuid = l.uuid
        AND lv.effective_from <= CURDATE()
        AND (lv.effective_to IS NULL OR lv.effective_to >= CURDATE())
      GROUP BY l.uuid, l.name, l.sort_order, lv.base_salary
      ORDER BY l.sort_order
      LIMIT 5
    `);
    console.table(levelStats);
    
    console.log('\n═══════════════════════════════════════════════════════════');
    console.log('✅ LEVEL MODULE VERIFICATION COMPLETE');
    console.log('═══════════════════════════════════════════════════════════');
    console.log('\n📋 Summary:');
    console.log(`   • Tables created: ${allTablesExist ? 'Yes' : 'No'}`);
    console.log(`   • Levels seeded: ${levelCount[0].count}`);
    console.log(`   • Versions created: ${versionCount[0].count}`);
    console.log(`   • Employees assigned: ${empCount[0].count}`);
    console.log('\n✅ Backend implementation is ready!');
    console.log('📝 Next: Implement frontend (see FRONTEND_IMPLEMENTATION_GUIDE.md)\n');
    
    process.exit(0);
  } catch (error) {
    console.error('\n❌ Error:', error.message);
    console.error(error);
    process.exit(1);
  }
}

verifyLevels();
