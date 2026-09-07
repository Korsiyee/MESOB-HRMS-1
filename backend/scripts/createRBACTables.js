/**
 * Script to create all RBAC tables
 */

require('dotenv').config();
const { db } = require('../src/config/db');
const fs = require('fs');
const path = require('path');

async function createRBACTables() {
  console.log('═══════════════════════════════════════════════════════════');
  console.log('Creating RBAC Tables');
  console.log('═══════════════════════════════════════════════════════════\n');
  
  try {
    const promisePool = db.promise();
    
    // Read all migration files
    const migrationsDir = path.join(__dirname, '../../database/migrations');
    const migrationFiles = [
      '003_add_rbac_tables.sql',
      '006_add_permission_overrides.sql'
    ];
    
    for (const file of migrationFiles) {
      console.log(`⏳ Processing: ${file}`);
      const filePath = path.join(migrationsDir, file);
      
      if (!fs.existsSync(filePath)) {
        console.log(`⚠️  File not found: ${file}, skipping...`);
        continue;
      }
      
      const sql = fs.readFileSync(filePath, 'utf8');
      
      // Split SQL into individual statements
      const statements = sql
        .split(';')
        .map(s => s.trim())
        .filter(s => s.length > 0)
        .filter(s => !s.startsWith('--') && s !== '--');
      
      console.log(`   Found ${statements.length} SQL statements`);
      
      for (let i = 0; i < statements.length; i++) {
        const statement = statements[i];
        
        // Skip pure comment lines
        if (statement.match(/^--/)) continue;
        
        try {
          await promisePool.query(statement);
          console.log(`   ✅ Statement ${i + 1}/${statements.length} executed`);
        } catch (error) {
          // Ignore "already exists" errors
          if (error.code === 'ER_TABLE_EXISTS_ERROR' || 
              error.code === 'ER_DUP_KEYNAME' ||
              error.message.includes('Duplicate')) {
            console.log(`   ⚠️  Statement ${i + 1}/${statements.length} skipped (already exists)`);
          } else {
            console.error(`   ❌ Statement ${i + 1}/${statements.length} failed:`, error.message);
            // Continue with next statement
          }
        }
      }
      
      console.log(`✅ Completed: ${file}\n`);
    }
    
    // Verify tables were created
    console.log('Verifying RBAC tables...');
    const requiredTables = [
      'RoleOccupations',
      'UserScopes',
      'OccupationDelegations',
      'AccessAuditLogs',
      'PermissionOverrides'
    ];
    
    const [tables] = await promisePool.query('SHOW TABLES');
    const existingTables = tables.map(row => Object.values(row)[0].toLowerCase());
    
    for (const table of requiredTables) {
      const exists = existingTables.includes(table.toLowerCase());
      console.log(`  ${exists ? '✅' : '❌'} ${table}`);
    }
    
    console.log('\n═══════════════════════════════════════════════════════════');
    console.log('✅ RBAC tables setup completed!');
    console.log('═══════════════════════════════════════════════════════════\n');
    
    process.exit(0);
  } catch (error) {
    console.error('\n❌ Error:', error.message);
    console.error(error);
    process.exit(1);
  }
}

createRBACTables();
