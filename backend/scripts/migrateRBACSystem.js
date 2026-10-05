/**
 * RBAC System Migration Script
 * 
 * Executes the complete RBAC database migration:
 * - Creates all RBAC tables (Roles, Permissions, Resources, etc.)
 * - Seeds system roles and permissions
 * - Migrates existing users to new role system
 * - Sets up data scopes
 * 
 * Run: npm run db:migrate:rbac-system
 */

const mysql = require('mysql2/promise');
const fs = require('fs').promises;
const path = require('path');
require('dotenv').config();

async function migrateRBACSystem() {
  let connection;
  
  try {
    console.log('====================================');
    console.log('RBAC System Migration');
    console.log('====================================\n');

    // Create database connection
    connection = await mysql.createConnection({
      host: process.env.DB_HOST,
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD || '',
      database: process.env.DB_NAME,
      multipleStatements: true,
    });

    console.log('✓ Connected to database');

    // Check if migration already ran
    const [existingRoles] = await connection.query(
      `SELECT COUNT(*) as count FROM INFORMATION_SCHEMA.TABLES 
       WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'Roles'`
    );

    if (existingRoles[0].count > 0) {
      console.log('\n⚠️  RBAC tables already exist.');
      console.log('   If you want to re-run the migration, first drop the tables or reset the database.\n');
      
      const answer = await new Promise((resolve) => {
        const readline = require('readline').createInterface({
          input: process.stdin,
          output: process.stdout
        });
        
        readline.question('Do you want to continue anyway? This will attempt to add data without dropping tables (y/n): ', (ans) => {
          readline.close();
          resolve(ans.toLowerCase());
        });
      });
      
      if (answer !== 'y' && answer !== 'yes') {
        console.log('Migration cancelled.');
        return;
      }
    }

    // Read migration SQL file
    const sqlFilePath = path.join(__dirname, '../database/migrations/007_create_rbac_system.sql');
    console.log(`\n📄 Reading migration file: ${sqlFilePath}`);
    
    const migrationSQL = await fs.readFile(sqlFilePath, 'utf8');
    console.log('✓ Migration file loaded');

    // Execute migration
    console.log('\n🔄 Executing RBAC migration...\n');
    
    const statements = migrationSQL
      .split(';')
      .map(s => s.trim())
      .filter(s => s.length > 0 && !s.startsWith('--') && !s.startsWith('/*'));

    let successCount = 0;
    let skipCount = 0;
    
    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i];
      
      try {
        await connection.query(statement);
        successCount++;
        
        // Show progress for every 10 statements
        if ((i + 1) % 10 === 0) {
          process.stdout.write(`   Executed ${i + 1}/${statements.length} statements...\r`);
        }
      } catch (error) {
        // Skip duplicate key or already exists errors
        if (error.code === 'ER_DUP_ENTRY' || 
            error.code === 'ER_TABLE_EXISTS_ERROR' ||
            error.code === 'ER_DUP_KEYNAME') {
          skipCount++;
        } else {
          console.error(`\n❌ Error executing statement ${i + 1}:`, error.message);
          console.error('Statement:', statement.substring(0, 100) + '...');
          throw error;
        }
      }
    }

    console.log(`\n✓ Migration executed successfully`);
    console.log(`   - ${successCount} statements executed`);
    if (skipCount > 0) {
      console.log(`   - ${skipCount} statements skipped (already exist)`);
    }

    // Verify migration
    console.log('\n🔍 Verifying migration...\n');

    const verificationQueries = [
      { name: 'Roles', query: 'SELECT COUNT(*) as count FROM Roles' },
      { name: 'Resources', query: 'SELECT COUNT(*) as count FROM Resources' },
      { name: 'Permissions', query: 'SELECT COUNT(*) as count FROM Permissions' },
      { name: 'RolePermissions', query: 'SELECT COUNT(*) as count FROM RolePermissions' },
      { name: 'DataScopes', query: 'SELECT COUNT(*) as count FROM DataScopes' },
      { name: 'RolePermissionScopes', query: 'SELECT COUNT(*) as count FROM RolePermissionScopes' },
      { name: 'Users with roles', query: 'SELECT COUNT(*) as count FROM Users WHERE role_uuid IS NOT NULL' },
    ];

    const results = {};
    for (const { name, query } of verificationQueries) {
      try {
        const [rows] = await connection.query(query);
        results[name] = rows[0].count;
        console.log(`   ✓ ${name}: ${rows[0].count}`);
      } catch (error) {
        console.log(`   ✗ ${name}: Error - ${error.message}`);
        results[name] = 'ERROR';
      }
    }

    // Display summary
    console.log('\n====================================');
    console.log('Migration Summary');
    console.log('====================================');
    console.log(`Roles created:              ${results['Roles']}`);
    console.log(`Resources created:          ${results['Resources']}`);
    console.log(`Permissions created:        ${results['Permissions']}`);
    console.log(`Role permissions assigned:  ${results['RolePermissions']}`);
    console.log(`Data scopes created:        ${results['DataScopes']}`);
    console.log(`Scope assignments:          ${results['RolePermissionScopes']}`);
    console.log(`Users migrated:             ${results['Users with roles']}`);
    console.log('====================================\n');

    // Show system roles
    console.log('📋 System Roles:\n');
    const [roles] = await connection.query(`
      SELECT code, name, hierarchy_level, is_active 
      FROM Roles 
      WHERE is_system_role = TRUE 
      ORDER BY hierarchy_level DESC
    `);
    
    roles.forEach(role => {
      console.log(`   ${role.code.padEnd(20)} - ${role.name} (Level: ${role.hierarchy_level})`);
    });

    console.log('\n✅ RBAC System migration completed successfully!');
    console.log('\n📝 Next steps:');
    console.log('   1. Restart the backend server to load new permissions');
    console.log('   2. Test role-based access with different user accounts');
    console.log('   3. Use the Role Management UI to create custom roles\n');

  } catch (error) {
    console.error('\n❌ Migration failed:', error.message);
    console.error(error);
    process.exit(1);
  } finally {
    if (connection) {
      await connection.end();
      console.log('✓ Database connection closed\n');
    }
  }
}

// Run migration
if (require.main === module) {
  migrateRBACSystem()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error('Fatal error:', error);
      process.exit(1);
    });
}

module.exports = { migrateRBACSystem };
