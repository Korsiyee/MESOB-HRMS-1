/**
 * Script to increase refresh_token column size
 */

require('dotenv').config();
const { db } = require('../src/config/db');

async function fixRefreshTokenColumn() {
  console.log('Fixing refresh_token column size...\n');
  
  try {
    const promisePool = db.promise();
    
    // Check current column definition
    const [columns] = await promisePool.query('DESCRIBE Users');
    const refreshTokenCol = columns.find(col => col.Field === 'refresh_token');
    
    console.log('Current refresh_token column:');
    console.log(`  Type: ${refreshTokenCol.Type}`);
    console.log(`  Null: ${refreshTokenCol.Null}`);
    console.log('');
    
    // Increase column size to TEXT (65,535 bytes) to handle large JWT tokens
    console.log('⏳ Increasing refresh_token column size to TEXT...');
    await promisePool.query(`
      ALTER TABLE Users
      MODIFY COLUMN refresh_token TEXT
    `);
    
    console.log('✅ Successfully updated refresh_token column!\n');
    
    // Verify the change
    const [newColumns] = await promisePool.query('DESCRIBE Users');
    const newRefreshTokenCol = newColumns.find(col => col.Field === 'refresh_token');
    
    console.log('Updated refresh_token column:');
    console.log(`  Type: ${newRefreshTokenCol.Type}`);
    console.log(`  Null: ${newRefreshTokenCol.Null}`);
    console.log('');
    
    console.log('✅ Migration completed successfully!\n');
    process.exit(0);
  } catch (error) {
    console.error('\n❌ Error:', error.message);
    process.exit(1);
  }
}

fixRefreshTokenColumn();
