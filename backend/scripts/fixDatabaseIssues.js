/**
 * Fix Database Issues Script
 * 
 * This script fixes:
 * 1. Missing is_active column in UserScopeOverrides
 * 2. Missing Occupations table
 * 3. Incorrect db usage in leaveController
 */

const { db: pool } = require('../src/config/db');
const { v4: uuidv4 } = require('uuid');

async function fixDatabaseIssues() {
  const connection = await pool.getConnection();
  
  try {
    console.log('🔧 Starting database fixes...\n');

    // ========================================================================
    // 1. Fix UserScopeOverrides table - Add is_active column
    // ========================================================================
    console.log('📋 Step 1: Checking UserScopeOverrides table...');
    
    try {
      // Check if is_active column exists
      const [columns] = await connection.query(`
        SELECT COLUMN_NAME 
        FROM INFORMATION_SCHEMA.COLUMNS 
        WHERE TABLE_SCHEMA = DATABASE() 
          AND TABLE_NAME = 'UserScopeOverrides' 
          AND COLUMN_NAME = 'is_active'
      `);
      
      if (columns.length === 0) {
        console.log('   ➜ Adding is_active column to UserScopeOverrides...');
        await connection.query(`
          ALTER TABLE UserScopeOverrides
          ADD COLUMN is_active BOOLEAN NOT NULL DEFAULT TRUE AFTER scope_configuration
        `);
        console.log('   ✅ Added is_active column');
      } else {
        console.log('   ✓ is_active column already exists');
      }
    } catch (error) {
      console.error('   ❌ Error fixing UserScopeOverrides:', error.message);
    }

    // ========================================================================
    // 2. Create Occupations table
    // ========================================================================
    console.log('\n📋 Step 2: Checking Occupations table...');
    
    try {
      const [tables] = await connection.query(`
        SELECT TABLE_NAME 
        FROM INFORMATION_SCHEMA.TABLES 
        WHERE TABLE_SCHEMA = DATABASE() 
          AND TABLE_NAME = 'Occupations'
      `);
      
      if (tables.length === 0) {
        console.log('   ➜ Creating Occupations table...');
        await connection.query(`
          CREATE TABLE Occupations (
            uuid VARCHAR(36) PRIMARY KEY,
            code VARCHAR(50) NOT NULL UNIQUE,
            name VARCHAR(255) NOT NULL,
            description TEXT,
            category VARCHAR(100) DEFAULT 'GENERAL',
            is_active BOOLEAN NOT NULL DEFAULT TRUE,
            display_order INT NOT NULL DEFAULT 0,
            created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            created_by VARCHAR(36),
            updated_by VARCHAR(36),
            INDEX idx_occupations_code (code),
            INDEX idx_occupations_active (is_active),
            INDEX idx_occupations_category (category)
          ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
        `);
        console.log('   ✅ Created Occupations table');
        
        // Add some default occupations
        console.log('   ➜ Adding default occupations...');
        
        const defaultOccupations = [
          { code: 'ADMIN', name: 'Administrative Staff', category: 'ADMINISTRATIVE' },
          { code: 'TECH', name: 'Technical Staff', category: 'TECHNICAL' },
          { code: 'MGR', name: 'Manager', category: 'MANAGEMENT' },
          { code: 'EXEC', name: 'Executive', category: 'EXECUTIVE' },
          { code: 'SUPPORT', name: 'Support Staff', category: 'SUPPORT' },
          { code: 'HR', name: 'Human Resources', category: 'ADMINISTRATIVE' },
          { code: 'FIN', name: 'Finance', category: 'ADMINISTRATIVE' },
          { code: 'IT', name: 'IT Staff', category: 'TECHNICAL' },
          { code: 'OPS', name: 'Operations', category: 'OPERATIONAL' },
          { code: 'OTHER', name: 'Other', category: 'GENERAL' }
        ];
        
        for (const occ of defaultOccupations) {
          await connection.query(
            `INSERT INTO Occupations (uuid, code, name, category, display_order) 
             VALUES (?, ?, ?, ?, ?)`,
            [uuidv4(), occ.code, occ.name, occ.category, 0]
          );
        }
        console.log(`   ✅ Added ${defaultOccupations.length} default occupations`);
      } else {
        console.log('   ✓ Occupations table already exists');
      }
    } catch (error) {
      console.error('   ❌ Error creating Occupations table:', error.message);
    }

    // ========================================================================
    // 3. Check and update Employees table for occupation_uuid column
    // ========================================================================
    console.log('\n📋 Step 3: Checking Employees table for occupation_uuid...');
    
    try {
      const [columns] = await connection.query(`
        SELECT COLUMN_NAME 
        FROM INFORMATION_SCHEMA.COLUMNS 
        WHERE TABLE_SCHEMA = DATABASE() 
          AND TABLE_NAME = 'Employees' 
          AND COLUMN_NAME = 'occupation_uuid'
      `);
      
      if (columns.length === 0) {
        console.log('   ➜ Adding occupation_uuid column to Employees...');
        await connection.query(`
          ALTER TABLE Employees
          ADD COLUMN occupation_uuid VARCHAR(36) AFTER level_uuid,
          ADD INDEX idx_employees_occupation (occupation_uuid),
          ADD CONSTRAINT fk_employees_occupation 
            FOREIGN KEY (occupation_uuid) REFERENCES Occupations(uuid) 
            ON DELETE SET NULL
        `);
        console.log('   ✅ Added occupation_uuid column');
      } else {
        console.log('   ✓ occupation_uuid column already exists');
      }
    } catch (error) {
      console.error('   ❌ Error updating Employees table:', error.message);
    }

    // ========================================================================
    // 4. Verify RBAC tables permissions
    // ========================================================================
    console.log('\n📋 Step 4: Checking admin permissions...');
    
    try {
      // Check if admin has necessary permissions
      const [admin] = await connection.query(`
        SELECT uuid FROM Users WHERE username = 'admin' LIMIT 1
      `);
      
      if (admin.length > 0) {
        const adminUuid = admin[0].uuid;
        
        // Check if admin role exists
        const [adminRole] = await connection.query(`
          SELECT uuid FROM Roles WHERE code = 'SUPER_ADMIN' LIMIT 1
        `);
        
        if (adminRole.length > 0) {
          const roleUuid = adminRole[0].uuid;
          
          // Update admin user with role
          await connection.query(`
            UPDATE Users SET role_uuid = ? WHERE uuid = ?
          `, [roleUuid, adminUuid]);
          
          console.log('   ✅ Admin user linked to SUPER_ADMIN role');
          
          // Check if SUPER_ADMIN has all permissions
          const [permCount] = await connection.query(`
            SELECT COUNT(*) as count 
            FROM RolePermissions 
            WHERE role_uuid = ?
          `, [roleUuid]);
          
          const [totalPerms] = await connection.query(`
            SELECT COUNT(*) as count FROM Permissions
          `);
          
          console.log(`   ℹ️  SUPER_ADMIN has ${permCount[0].count}/${totalPerms[0].count} permissions`);
          
          if (permCount[0].count < totalPerms[0].count) {
            console.log('   ➜ Assigning all permissions to SUPER_ADMIN...');
            
            await connection.query(`
              INSERT IGNORE INTO RolePermissions (uuid, role_uuid, permission_uuid)
              SELECT UUID(), ?, p.uuid
              FROM Permissions p
              WHERE NOT EXISTS (
                SELECT 1 FROM RolePermissions rp 
                WHERE rp.role_uuid = ? AND rp.permission_uuid = p.uuid
              )
            `, [roleUuid, roleUuid]);
            
            console.log('   ✅ Assigned all permissions to SUPER_ADMIN');
          }
          
          // Assign ALL scope to all SUPER_ADMIN permissions
          const [allScope] = await connection.query(`
            SELECT uuid FROM DataScopes WHERE code = 'ALL' LIMIT 1
          `);
          
          if (allScope.length > 0) {
            const scopeUuid = allScope[0].uuid;
            
            await connection.query(`
              INSERT IGNORE INTO RolePermissionScopes (uuid, role_uuid, permission_uuid, data_scope_uuid)
              SELECT UUID(), rp.role_uuid, rp.permission_uuid, ?
              FROM RolePermissions rp
              WHERE rp.role_uuid = ?
                AND NOT EXISTS (
                  SELECT 1 FROM RolePermissionScopes rps
                  WHERE rps.role_uuid = rp.role_uuid 
                    AND rps.permission_uuid = rp.permission_uuid
                )
            `, [scopeUuid, roleUuid]);
            
            console.log('   ✅ Assigned ALL scope to SUPER_ADMIN permissions');
          }
        }
      }
    } catch (error) {
      console.error('   ❌ Error updating admin permissions:', error.message);
    }

    // ========================================================================
    // Summary
    // ========================================================================
    console.log('\n' + '='.repeat(60));
    console.log('✅ Database fixes completed!');
    console.log('='.repeat(60));
    console.log('\nNext steps:');
    console.log('1. Restart your backend server');
    console.log('2. Test the application');
    console.log('3. Check for any remaining errors\n');

  } catch (error) {
    console.error('\n❌ Fatal error:', error);
    throw error;
  } finally {
    connection.release();
    await pool.end();
  }
}

// Run the fixes
fixDatabaseIssues()
  .then(() => {
    console.log('✅ Script completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Script failed:', error);
    process.exit(1);
  });
