/**
 * Script to check what tables exist in the database
 */

require('dotenv').config();
const { db } = require('../src/config/db');

async function checkTables() {
  console.log('Checking database tables...\n');
  
  try {
    const promisePool = db.promise();
    
    // Get all tables
    const [tables] = await promisePool.query('SHOW TABLES');
    
    console.log('Existing tables:');
    tables.forEach(row => {
      const tableName = Object.values(row)[0];
      console.log(`  - ${tableName}`);
    });
    
    console.log('\n✅ Check completed!\n');
    process.exit(0);
  } catch (error) {
    console.error('\n❌ Error:', error.message);
    process.exit(1);
  }
}

checkTables();
