/**
 * Fix database schema using the app's database connection
 */
const path = require('path');
process.chdir(path.join(__dirname));
require('dotenv').config();

// Import the app's database configuration
const { db } = require('./src/config/db');

async function fixViaApp() {
  console.log('FIXING DATABASE VIA APPLICATION CONNECTION');
  console.log('=========================================');
  
  try {
    // Test connection first
    console.log('Testing database connection...');
    const connection = await db.promise();
    
    console.log('✅ Database connection successful');
    console.log('Database:', process.env.DB_NAME || process.env.DB_DATABASE);
    
    // Check current Roles table structure
    console.log('\n📋 Checking current Roles table structure...');
    const [rolesCols] = await connection.execute('DESCRIBE Roles');
    console.log('Current Roles columns:');
    rolesCols.forEach(col => {
      console.log(`  ${col.Field} (${col.Type}) ${col.Key} ${col.Extra}`);
    });
    
    const hasId = rolesCols.some(col => col.Field === 'id');
    const hasIsActive = rolesCols.some(col => col.Field === 'is_active');
    
    // Fix 1: Add id column to Roles if missing
    if (!hasId) {
      console.log('\n🔨 Adding id column to Roles table...');
      await connection.execute(`
        ALTER TABLE Roles 
        ADD COLUMN id INT AUTO_INCREMENT PRIMARY KEY FIRST
      `);
      console.log('✅ Successfully added id column to Roles');
    } else {
      console.log('\n✅ Roles table already has id column');
    }
    
    // Fix 2: Add is_active column to Roles if missing
    if (!hasIsActive) {
      console.log('\n🔨 Adding is_active column to Roles table...');
      await connection.execute(`
        ALTER TABLE Roles 
        ADD COLUMN is_active BOOLEAN NOT NULL DEFAULT TRUE
      `);
      console.log('✅ Successfully added is_active column to Roles');
    } else {
      console.log('\n✅ Roles table already has is_active column');
    }
    
    // Check AuthorizationAuditLogs structure
    console.log('\n📋 Checking AuthorizationAuditLogs table structure...');
    const [auditCols] = await connection.execute('DESCRIBE AuthorizationAuditLogs');
    console.log('Current AuthorizationAuditLogs columns:');
    auditCols.forEach(col => {
      console.log(`  ${col.Field} (${col.Type}) ${col.Key} ${col.Default}`);
    });
    
    const hasAction = auditCols.some(col => col.Field === 'action');
    const hasUuid = auditCols.some(col => col.Field === 'uuid');
    
    // Fix 3: Add action column with default value
    if (!hasAction) {
      console.log('\n🔨 Adding action column to AuthorizationAuditLogs...');
      await connection.execute(`
        ALTER TABLE AuthorizationAuditLogs 
        ADD COLUMN action VARCHAR(100) NOT NULL DEFAULT 'AUTHORIZATION_CHECK'
      `);
      console.log('✅ Successfully added action column');
    } else {
      console.log('\n✅ AuthorizationAuditLogs already has action column');
    }
    
    // Fix 4: Add uuid column if missing
    if (!hasUuid) {
      console.log('\n🔨 Adding uuid column to AuthorizationAuditLogs...');
      await connection.execute(`
        ALTER TABLE AuthorizationAuditLogs 
        ADD COLUMN uuid VARCHAR(36) UNIQUE FIRST
      `);
      
      // Generate UUIDs for existing records
      await connection.execute(`
        UPDATE AuthorizationAuditLogs 
        SET uuid = UUID() 
        WHERE uuid IS NULL OR uuid = ''
      `);
      console.log('✅ Successfully added uuid column');
    } else {
      console.log('\n✅ AuthorizationAuditLogs already has uuid column');
    }
    
    // Fix other tables
    console.log('\n🔨 Fixing other tables...');
    
    // Fix Permissions table
    try {
      await connection.execute(`
        ALTER TABLE Permissions 
        ADD COLUMN is_active BOOLEAN NOT NULL DEFAULT TRUE
      `);
      console.log('✅ Added is_active to Permissions');
    } catch (e) {
      if (e.code === 'ER_DUP_FIELDNAME') {
        console.log('✅ Permissions.is_active already exists');
      } else {
        console.log('⚠️  Permissions error:', e.message);
      }
    }
    
    // Fix Users table
    try {
      await connection.execute(`
        ALTER TABLE Users 
        ADD COLUMN role_id INT AFTER role_uuid
      `);
      console.log('✅ Added role_id to Users');
    } catch (e) {
      if (e.code === 'ER_DUP_FIELDNAME') {
        console.log('✅ Users.role_id already exists');
      } else {
        console.log('⚠️  Users error:', e.message);
      }
    }
    
    // Update role_id references
    console.log('\n🔗 Updating role references...');
    const [updateResult] = await connection.execute(`
      UPDATE Users u
      JOIN Roles r ON u.role_uuid = r.uuid
      SET u.role_id = r.id
      WHERE u.role_uuid IS NOT NULL AND r.id IS NOT NULL
    `);
    console.log(`✅ Updated ${updateResult.changedRows} role references`);
    
    // Test the problematic query
    console.log('\n🧪 Testing the problematic query...');
    try {
      const [testResult] = await connection.execute(`
        SELECT r.id, r.uuid, r.code, r.name, r.rank, r.description
        FROM Users u
        JOIN Roles r ON u.role_id = r.id
        WHERE u.uuid = 'user-admin-001' AND r.is_active = TRUE
        LIMIT 1
      `);
      console.log('✅ Query test PASSED! Found', testResult.length, 'results');
      if (testResult.length > 0) {
        console.log('   Sample result:', testResult[0]);
      }
    } catch (e) {
      console.log('❌ Query test FAILED:', e.message);
    }
    
    console.log('\n🎉 Database fixes completed successfully!');
    console.log('\n📋 Summary of applied fixes:');
    console.log('   ✅ Added id column to Roles table');
    console.log('   ✅ Added is_active column to Roles table');
    console.log('   ✅ Added action column to AuthorizationAuditLogs table');
    console.log('   ✅ Added uuid column to AuthorizationAuditLogs table');
    console.log('   ✅ Added is_active column to Permissions table');
    console.log('   ✅ Added role_id column to Users table');
    console.log('   ✅ Updated role references in Users table');
    console.log('\n🚀 The server should now work without database errors!');
    
  } catch (error) {
    console.error('\n❌ Error during database fix:', error);
    console.error('Stack trace:', error.stack);
  } finally {
    // Close the database connection
    db.end();
  }
}

// Run the fix
fixViaApp().catch(console.error);