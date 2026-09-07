/**
 * Script to add permissions_version column to Users table
 */

require('dotenv').config();
const { db } = require('../src/config/db');

async function addPermissionsVersionColumn() {
  console.log('Checking Users table schema...\n');
  
  try {
    const promisePool = db.promise();
    
    // Check current schema
    const [columns] = await promisePool.query('DESCRIBE Users');
    console.log('Current Users table columns:');
    columns.forEach(col => console.log(`  - ${col.Field} (${col.Type})`));
    
    // Check if permissions_version already exists
    const hasColumn = columns.some(col => col.Field === 'permissions_version');
    
    if (hasColumn) {
      console.log('\n✅ permissions_version column already exists!');
      process.exit(0);
    }
    
    console.log('\n⏳ Adding permissions_version column...');
    
    // Add the column
    await promisePool.query(`
      ALTER TABLE Users
      ADD COLUMN permissions_version INT NOT NULL DEFAULT 1 AFTER token_version
    `);
    
    console.log('✅ Successfully added permissions_version column!');
    
    // Add index
    console.log('⏳ Adding index...');
    await promisePool.query(`
      CREATE INDEX idx_users_permissions_version ON Users (permissions_version)
    `);
    
    console.log('✅ Successfully added index!');
    
    // Verify
    const [newColumns] = await promisePool.query('DESCRIBE Users');
    console.log('\n✅ Updated Users table columns:');
    newColumns.forEach(col => console.log(`  - ${col.Field} (${col.Type})`));
    
    console.log('\n✅ Migration completed successfully!\n');
    process.exit(0);
  } catch (error) {
    console.error('\n❌ Error:', error.message);
    process.exit(1);
  }
}

addPermissionsVersionColumn();
