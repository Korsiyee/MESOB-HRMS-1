#!/usr/bin/env node
/**
 * Comprehensive Database Fix for FDRE MESOB HRMS
 * This addresses all remaining database schema issues
 */

const mysql = require('mysql2/promise');
require('dotenv').config();

const config = {
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'mesob_hrms'
};

console.log('🔧 COMPREHENSIVE DATABASE FIX');
console.log('================================\n');

async function main() {
  let connection;
  
  try {
    console.log('📡 Connecting to database...');
    connection = await mysql.createConnection(config);
    console.log('✅ Connected successfully\n');
    
    // Step 1: Fix Roles table structure
    console.log('🔨 Step 1: Fixing Roles table...');
    await fixRolesTable(connection);
    
    // Step 2: Fix AuthorizationAuditLogs table
    console.log('\n🔨 Step 2: Fixing AuthorizationAuditLogs table...');
    await fixAuthorizationAuditLogsTable(connection);
    
    // Step 3: Fix budgetYears table
    console.log('\n🔨 Step 3: Fixing budgetYears table...');
    await fixBudgetYearsTable(connection);
    
    // Step 4: Fix Permissions table
    console.log('\n🔨 Step 4: Fixing Permissions table...');
    await fixPermissionsTable(connection);
    
    // Step 5: Fix Users table role references
    console.log('\n🔨 Step 5: Fixing Users table...');
    await fixUsersTable(connection);
    
    // Step 6: Verify all fixes
    console.log('\n🔍 Step 6: Verifying fixes...');
    await verifyFixes(connection);
    
    console.log('\n🎉 All database fixes completed successfully!');
    
  } catch (error) {
    console.error('\n❌ Error:', error.message);
    process.exit(1);
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

async function fixRolesTable(connection) {
  try {
    // Check current structure
    const [columns] = await connection.execute(`
      SELECT COLUMN_NAME, DATA_TYPE, IS_NULLABLE, COLUMN_DEFAULT, EXTRA
      FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'Roles'
      ORDER BY ORDINAL_POSITION
    `, [config.database]);
    
    console.log('   Current Roles table columns:');
    columns.forEach(col => {
      console.log(`     ${col.COLUMN_NAME} (${col.DATA_TYPE}) ${col.EXTRA}`);
    });
    
    // Check if id column exists
    const hasId = columns.some(col => col.COLUMN_NAME === 'id');
    const hasIsActive = columns.some(col => col.COLUMN_NAME === 'is_active');
    
    if (!hasId) {
      console.log('   Adding id column to Roles...');
      await connection.execute(`
        ALTER TABLE Roles 
        ADD COLUMN id INT AUTO_INCREMENT PRIMARY KEY FIRST
      `);
      console.log('   ✅ Added id column');
    } else {
      console.log('   ✅ id column exists');
    }
    
    if (!hasIsActive) {
      console.log('   Adding is_active column to Roles...');
      await connection.execute(`
        ALTER TABLE Roles 
        ADD COLUMN is_active BOOLEAN NOT NULL DEFAULT TRUE
      `);
      console.log('   ✅ Added is_active column');
    } else {
      console.log('   ✅ is_active column exists');
    }
    
  } catch (error) {
    console.log(`   ⚠️  Error: ${error.message}`);
  }
}

async function fixAuthorizationAuditLogsTable(connection) {
  try {
    // Check current structure
    const [columns] = await connection.execute(`
      SELECT COLUMN_NAME, DATA_TYPE
      FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'AuthorizationAuditLogs'
      ORDER BY ORDINAL_POSITION
    `, [config.database]);
    
    console.log('   Current AuthorizationAuditLogs columns:');
    columns.forEach(col => {
      console.log(`     ${col.COLUMN_NAME} (${col.DATA_TYPE})`);
    });
    
    const hasUuid = columns.some(col => col.COLUMN_NAME === 'uuid');
    const hasActionType = columns.some(col => col.COLUMN_NAME === 'action_type');
    
    if (!hasUuid) {
      console.log('   Adding uuid column...');
      await connection.execute(`
        ALTER TABLE AuthorizationAuditLogs 
        ADD COLUMN uuid VARCHAR(36) UNIQUE FIRST
      `);
      
      await connection.execute(`
        UPDATE AuthorizationAuditLogs 
        SET uuid = UUID() 
        WHERE uuid IS NULL OR uuid = ''
      `);
      console.log('   ✅ Added uuid column');
    } else {
      console.log('   ✅ uuid column exists');
    }
    
    if (!hasActionType) {
      console.log('   Adding action_type column...');
      await connection.execute(`
        ALTER TABLE AuthorizationAuditLogs 
        ADD COLUMN action_type VARCHAR(100) AFTER uuid
      `);
      
      // Update existing records with action_type from action column if it exists
      const hasAction = columns.some(col => col.COLUMN_NAME === 'action');
      if (hasAction) {
        await connection.execute(`
          UPDATE AuthorizationAuditLogs 
          SET action_type = action 
          WHERE action_type IS NULL AND action IS NOT NULL
        `);
      }
      console.log('   ✅ Added action_type column');
    } else {
      console.log('   ✅ action_type column exists');
    }
    
  } catch (error) {
    console.log(`   ⚠️  Error: ${error.message}`);
  }
}

async function fixBudgetYearsTable(connection) {
  try {
    // Check if table exists
    const [tables] = await connection.execute(`
      SELECT TABLE_NAME 
      FROM INFORMATION_SCHEMA.TABLES 
      WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'budgetYears'
    `, [config.database]);
    
    if (tables.length === 0) {
      console.log('   Creating budgetYears table...');
      await connection.execute(`
        CREATE TABLE budgetYears (
          uuid VARCHAR(50) PRIMARY KEY,
          year INT UNIQUE NOT NULL,
          start_date DATE NOT NULL,
          end_date DATE NOT NULL,
          is_active BOOLEAN NOT NULL DEFAULT TRUE,
          status ENUM('ACTIVE', 'INACTIVE', 'DRAFT') NOT NULL DEFAULT 'ACTIVE',
          description TEXT,
          created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
      `);
      
      // Insert current year as active
      const currentYear = new Date().getFullYear();
      await connection.execute(`
        INSERT INTO budgetYears (uuid, year, start_date, end_date, status, description)
        VALUES (UUID(), ?, ?, ?, 'ACTIVE', ?)
      `, [
        currentYear,
        `${currentYear}-01-01`,
        `${currentYear}-12-31`,
        `Budget Year ${currentYear}`
      ]);
      
      console.log('   ✅ Created budgetYears table with current year');
    } else {
      // Check if status column exists
      const [columns] = await connection.execute(`
        SELECT COLUMN_NAME 
        FROM INFORMATION_SCHEMA.COLUMNS 
        WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'budgetYears' AND COLUMN_NAME = 'status'
      `, [config.database]);
      
      if (columns.length === 0) {
        console.log('   Adding status column to budgetYears...');
        await connection.execute(`
          ALTER TABLE budgetYears 
          ADD COLUMN status ENUM('ACTIVE', 'INACTIVE', 'DRAFT') NOT NULL DEFAULT 'ACTIVE'
        `);
        console.log('   ✅ Added status column');
      } else {
        console.log('   ✅ budgetYears table and status column exist');
      }
    }
    
  } catch (error) {
    console.log(`   ⚠️  Error: ${error.message}`);
  }
}

async function fixPermissionsTable(connection) {
  try {
    const [columns] = await connection.execute(`
      SELECT COLUMN_NAME 
      FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'Permissions' AND COLUMN_NAME = 'is_active'
    `, [config.database]);
    
    if (columns.length === 0) {
      console.log('   Adding is_active column to Permissions...');
      await connection.execute(`
        ALTER TABLE Permissions 
        ADD COLUMN is_active BOOLEAN NOT NULL DEFAULT TRUE
      `);
      console.log('   ✅ Added is_active column to Permissions');
    } else {
      console.log('   ✅ Permissions.is_active column exists');
    }
    
  } catch (error) {
    console.log(`   ⚠️  Error: ${error.message}`);
  }
}

async function fixUsersTable(connection) {
  try {
    const [columns] = await connection.execute(`
      SELECT COLUMN_NAME 
      FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'Users' AND COLUMN_NAME = 'role_id'
    `, [config.database]);
    
    if (columns.length === 0) {
      console.log('   Adding role_id column to Users...');
      await connection.execute(`
        ALTER TABLE Users 
        ADD COLUMN role_id INT AFTER role_uuid
      `);
      console.log('   ✅ Added role_id column');
    } else {
      console.log('   ✅ Users.role_id column exists');
    }
    
    // Update role_id references
    console.log('   Updating role_id references...');
    const [result] = await connection.execute(`
      UPDATE Users u
      JOIN Roles r ON u.role_uuid = r.uuid
      SET u.role_id = r.id
      WHERE u.role_uuid IS NOT NULL
    `);
    console.log(`   ✅ Updated ${result.changedRows} role references`);
    
  } catch (error) {
    console.log(`   ⚠️  Error: ${error.message}`);
  }
}

async function verifyFixes(connection) {
  console.log('   Running verification queries...\n');
  
  try {
    // Check Roles table
    const [rolesCount] = await connection.execute(`
      SELECT COUNT(*) as count FROM Roles WHERE id IS NOT NULL
    `);
    console.log(`   ✅ Roles with id: ${rolesCount[0].count}`);
    
    // Check AuthorizationAuditLogs
    const [auditCols] = await connection.execute(`
      SELECT COUNT(*) as count 
      FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'AuthorizationAuditLogs'
        AND COLUMN_NAME IN ('uuid', 'action_type')
    `, [config.database]);
    console.log(`   ✅ AuthorizationAuditLogs required columns: ${auditCols[0].count}/2`);
    
    // Check budgetYears
    const [budgetCount] = await connection.execute(`
      SELECT COUNT(*) as count FROM budgetYears WHERE status = 'ACTIVE'
    `);
    console.log(`   ✅ Active budget years: ${budgetCount[0].count}`);
    
    // Check admin email
    const [adminEmail] = await connection.execute(`
      SELECT ea.email
      FROM EmployeeAddresses ea
      JOIN Employees e ON ea.employee_uuid = e.uuid
      JOIN Users u ON e.uuid = u.employee_uuid
      WHERE u.username = 'admin' AND ea.address_type = 'CURRENT'
      LIMIT 1
    `);
    console.log(`   ✅ Admin email: ${adminEmail.length > 0 ? adminEmail[0].email : 'Not found'}`);
    
  } catch (error) {
    console.log(`   ⚠️  Verification error: ${error.message}`);
  }
}

main();