/**
 * Fix AccessAuditLogs.resource_uuid column size
 * The column was VARCHAR(36) expecting UUIDs, but it's used for endpoint URLs
 */

const { db } = require('../src/config/db');

async function fixColumn() {
  console.log('Fixing AccessAuditLogs.resource_uuid column size...\n');
  
  try {
    const promisePool = db.promise();
    
    // Check current column size
    const [columns] = await promisePool.query(
      "SELECT COLUMN_TYPE FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'AccessAuditLogs' AND COLUMN_NAME = 'resource_uuid'"
    );
    
    console.log('Current column type:', columns[0]?.COLUMN_TYPE || 'NOT FOUND');
    
    // Alter column to VARCHAR(255) to accommodate full endpoint URLs
    console.log('\nAltering column to VARCHAR(255)...');
    await promisePool.query(
      'ALTER TABLE AccessAuditLogs MODIFY COLUMN resource_uuid VARCHAR(255)'
    );
    
    console.log('✅ Column updated successfully!');
    
    // Verify
    const [newColumns] = await promisePool.query(
      "SELECT COLUMN_TYPE FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'AccessAuditLogs' AND COLUMN_NAME = 'resource_uuid'"
    );
    
    console.log('New column type:', newColumns[0]?.COLUMN_TYPE);
    console.log('\n✅ Fix completed successfully!');
    
    process.exit(0);
  } catch (error) {
    console.error('\n❌ Error:', error.message);
    console.error(error);
    process.exit(1);
  }
}

fixColumn();
