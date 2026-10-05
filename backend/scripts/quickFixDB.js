#!/usr/bin/env node
/**
 * Quick Database Fixes
 */

const mysql = require('mysql2/promise');
const { v4: uuidv4 } = require('uuid');

require('dotenv').config();

const DB_HOST = process.env.DB_HOST;
const DB_USER = process.env.DB_USER;
const DB_PASSWORD = process.env.DB_PASSWORD || '';
const DB_NAME = process.env.DB_NAME;

async function main() {
  console.log('🔧 Quick Database Fix\n');
  
  const connection = await mysql.createConnection({
    host: DB_HOST,
    user: DB_USER,
    password: DB_PASSWORD,
    database: DB_NAME,
  });

  try {
    // Fix 1: Add is_active column to UserScopeOverrides
    console.log('1. Fixing UserScopeOverrides table...');
    try {
      await connection.query(`
        ALTER TABLE UserScopeOverrides
        ADD COLUMN is_active BOOLEAN NOT NULL DEFAULT TRUE AFTER scope_configuration
      `);
      console.log('   ✅ Added is_active column\n');
    } catch (err) {
      if (err.code === 'ER_DUP_FIELDNAME') {
        console.log('   ✓ Column already exists\n');
      } else {
        console.log('   ⚠️  Error:', err.message, '\n');
      }
    }

    // Fix 2: Create Occupations table
    console.log('2. Creating Occupations table...');
    try {
      await connection.query(`
        CREATE TABLE IF NOT EXISTS Occupations (
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
      console.log('   ✅ Table created\n');
      
      // Add default occupations
      const occupations = [
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
      
      for (const occ of occupations) {
        try {
          await connection.query(
            `INSERT INTO Occupations (uuid, code, name, category, display_order) 
             VALUES (?, ?, ?, ?, 0)`,
            [uuidv4(), occ.code, occ.name, occ.category]
          );
        } catch (err) {
          if (err.code !== 'ER_DUP_ENTRY') {
            console.log(`   ⚠️  Error adding ${occ.code}:`, err.message);
          }
        }
      }
      console.log('   ✅ Added default occupations\n');
      
    } catch (err) {
      console.log('   ⚠️  Error:', err.message, '\n');
    }

    // Fix 3: Add occupation_uuid to Employees
    console.log('3. Updating Employees table...');
    try {
      await connection.query(`
        ALTER TABLE Employees
        ADD COLUMN occupation_uuid VARCHAR(36) AFTER level_uuid
      `);
      await connection.query(`
        ALTER TABLE Employees
        ADD INDEX idx_employees_occupation (occupation_uuid)
      `);
      console.log('   ✅ Added occupation_uuid column\n');
    } catch (err) {
      if (err.code === 'ER_DUP_FIELDNAME') {
        console.log('   ✓ Column already exists\n');
      } else {
        console.log('   ⚠️  Error:', err.message, '\n');
      }
    }

    // Fix 4: Give SUPER_ADMIN all permissions
    console.log('4. Fixing SUPER_ADMIN permissions...');
    try {
      const [admin] = await connection.query(`
        SELECT uuid FROM Users WHERE username = 'admin' LIMIT 1
      `);
      
      if (admin.length > 0) {
        const [role] = await connection.query(`
          SELECT uuid FROM Roles WHERE code = 'SUPER_ADMIN' LIMIT 1
        `);
        
        if (role.length > 0) {
          await connection.query(`
            UPDATE Users SET role_uuid = ? WHERE uuid = ?
          `, [role[0].uuid, admin[0].uuid]);
          
          // Assign all permissions
          await connection.query(`
            INSERT IGNORE INTO RolePermissions (uuid, role_uuid, permission_uuid)
            SELECT UUID(), ?, p.uuid
            FROM Permissions p
          `, [role[0].uuid]);
          
          // Assign ALL scope
          const [scope] = await connection.query(`
            SELECT uuid FROM DataScopes WHERE code = 'ALL' LIMIT 1
          `);
          
          if (scope.length > 0) {
            await connection.query(`
              INSERT IGNORE INTO RolePermissionScopes (uuid, role_uuid, permission_uuid, data_scope_uuid)
              SELECT UUID(), rp.role_uuid, rp.permission_uuid, ?
              FROM RolePermissions rp
              WHERE rp.role_uuid = ?
            `, [scope[0].uuid, role[0].uuid]);
          }
          
          console.log('   ✅ SUPER_ADMIN configured\n');
        }
      }
    } catch (err) {
      console.log('   ⚠️  Error:', err.message, '\n');
    }

    console.log('✅ All fixes completed!\n');
    
  } catch (error) {
    console.error('❌ Fatal error:', error);
    process.exit(1);
  } finally {
    await connection.end();
  }
}

main().then(() => {
  console.log('Done!');
  process.exit(0);
}).catch(err => {
  console.error('Failed:', err);
  process.exit(1);
});
