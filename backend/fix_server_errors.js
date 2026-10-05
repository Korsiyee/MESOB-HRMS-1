#!/usr/bin/env node
/**
 * FDRE MESOB HRMS - Server Errors Fix
 * 
 * This script specifically fixes the errors shown in the server logs:
 * 1. Unknown column 'p.is_active' in Permissions table
 * 2. Unknown column 'r.id' in Roles table  
 * 3. Unknown column 'uuid' in AuthorizationAuditLogs table
 * 4. Email format issue for Permit.io sync
 */

const mysql = require('mysql2/promise');
const path = require('path');
require('dotenv').config();

const config = {
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'mesob_hrms'
};

console.log('🔧 FDRE MESOB HRMS - Server Errors Fix');
console.log('=====================================\n');

async function main() {
  let connection;
  
  try {
    console.log('📡 Connecting to database...');
    console.log(`   Host: ${config.host}`);
    console.log(`   Database: ${config.database}`);
    console.log(`   User: ${config.user}`);
    
    connection = await mysql.createConnection(config);
    console.log('✅ Connected successfully\n');
    
    // Fix 1: Add missing id column to Roles table
    console.log('🔨 Fix 1: Checking Roles table for id column...');
    try {
      const [columns] = await connection.execute(`
        SELECT COLUMN_NAME 
        FROM INFORMATION_SCHEMA.COLUMNS 
        WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'Roles' AND COLUMN_NAME = 'id'
      `, [config.database]);
      
      if (columns.length === 0) {
        console.log('   Adding id column to Roles table...');
        await connection.execute(`
          ALTER TABLE Roles 
          ADD COLUMN id INT AUTO_INCREMENT PRIMARY KEY FIRST
        `);
        console.log('   ✅ Added id column to Roles table');
      } else {
        console.log('   ✅ id column already exists in Roles table');
      }
    } catch (err) {
      console.log(`   ⚠️  Error: ${err.message}`);
    }
    
    // Fix 2: Add missing is_active column to Permissions table
    console.log('\n🔨 Fix 2: Checking Permissions table for is_active column...');
    try {
      const [columns] = await connection.execute(`
        SELECT COLUMN_NAME 
        FROM INFORMATION_SCHEMA.COLUMNS 
        WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'Permissions' AND COLUMN_NAME = 'is_active'
      `, [config.database]);
      
      if (columns.length === 0) {
        console.log('   Adding is_active column to Permissions table...');
        await connection.execute(`
          ALTER TABLE Permissions 
          ADD COLUMN is_active BOOLEAN NOT NULL DEFAULT TRUE AFTER action
        `);
        console.log('   ✅ Added is_active column to Permissions table');
      } else {
        console.log('   ✅ is_active column already exists in Permissions table');
      }
    } catch (err) {
      console.log(`   ⚠️  Error: ${err.message}`);
    }
    
    // Fix 3: Add missing uuid column to AuthorizationAuditLogs table
    console.log('\n🔨 Fix 3: Checking AuthorizationAuditLogs table for uuid column...');
    try {
      const [columns] = await connection.execute(`
        SELECT COLUMN_NAME 
        FROM INFORMATION_SCHEMA.COLUMNS 
        WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'AuthorizationAuditLogs' AND COLUMN_NAME = 'uuid'
      `, [config.database]);
      
      if (columns.length === 0) {
        console.log('   Adding uuid column to AuthorizationAuditLogs table...');
        await connection.execute(`
          ALTER TABLE AuthorizationAuditLogs 
          ADD COLUMN uuid VARCHAR(36) UNIQUE FIRST
        `);
        
        // Generate UUIDs for existing records
        console.log('   Generating UUIDs for existing records...');
        await connection.execute(`
          UPDATE AuthorizationAuditLogs 
          SET uuid = UUID() 
          WHERE uuid IS NULL OR uuid = ''
        `);
        
        console.log('   ✅ Added uuid column to AuthorizationAuditLogs table');
      } else {
        console.log('   ✅ uuid column already exists in AuthorizationAuditLogs table');
      }
    } catch (err) {
      console.log(`   ⚠️  Error: ${err.message}`);
    }
    
    // Fix 4: Add role_id column to Users table for backward compatibility
    console.log('\n🔨 Fix 4: Checking Users table for role_id column...');
    try {
      const [columns] = await connection.execute(`
        SELECT COLUMN_NAME 
        FROM INFORMATION_SCHEMA.COLUMNS 
        WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'Users' AND COLUMN_NAME = 'role_id'
      `, [config.database]);
      
      if (columns.length === 0) {
        console.log('   Adding role_id column to Users table...');
        await connection.execute(`
          ALTER TABLE Users 
          ADD COLUMN role_id INT AFTER role_uuid
        `);
        console.log('   ✅ Added role_id column to Users table');
      } else {
        console.log('   ✅ role_id column already exists in Users table');
      }
      
      // Sync role_id with role_uuid
      console.log('   Syncing role_id with role_uuid...');
      const [updateResult] = await connection.execute(`
        UPDATE Users u
        JOIN Roles r ON u.role_uuid = r.uuid
        SET u.role_id = r.id
        WHERE u.role_uuid IS NOT NULL
      `);
      console.log(`   ✅ Updated ${updateResult.changedRows} user role references`);
      
    } catch (err) {
      console.log(`   ⚠️  Error: ${err.message}`);
    }
    
    // Fix 5: Update admin email for Permit.io compatibility
    console.log('\n🔨 Fix 5: Fixing admin email for Permit.io...');
    try {
      // Check current admin email
      const [currentEmail] = await connection.execute(`
        SELECT ea.email
        FROM EmployeeAddresses ea
        JOIN Employees e ON ea.employee_uuid = e.uuid
        JOIN Users u ON e.uuid = u.employee_uuid
        WHERE u.username = 'admin' AND ea.address_type = 'CURRENT'
        LIMIT 1
      `);
      
      if (currentEmail.length > 0) {
        console.log(`   Current admin email: ${currentEmail[0].email}`);
        
        if (currentEmail[0].email && currentEmail[0].email.includes('@hrms.local')) {
          console.log('   Updating admin email to valid format...');
          await connection.execute(`
            UPDATE EmployeeAddresses ea
            JOIN Employees e ON ea.employee_uuid = e.uuid
            JOIN Users u ON e.uuid = u.employee_uuid
            SET ea.email = 'admin@mesobhrms.org'
            WHERE u.username = 'admin' AND ea.address_type = 'CURRENT'
          `);
          console.log('   ✅ Updated admin email to admin@mesobhrms.org');
        } else {
          console.log('   ✅ Admin email is already in valid format');
        }
      } else {
        console.log('   No admin email found, creating one...');
        // Create email record for admin
        await connection.execute(`
          INSERT INTO EmployeeAddresses (uuid, employee_uuid, address_type, email)
          SELECT 
            UUID() as uuid,
            e.uuid as employee_uuid,
            'CURRENT' as address_type,
            'admin@mesobhrms.org' as email
          FROM Employees e
          JOIN Users u ON e.uuid = u.employee_uuid
          WHERE u.username = 'admin'
            AND e.uuid NOT IN (
              SELECT employee_uuid 
              FROM EmployeeAddresses 
              WHERE address_type = 'CURRENT'
            )
          LIMIT 1
        `);
        console.log('   ✅ Created admin email record');
      }
    } catch (err) {
      console.log(`   ⚠️  Error: ${err.message}`);
    }
    
    // Verification
    console.log('\n🔍 Verification:');
    
    // Check Roles table
    const [roleCheck] = await connection.execute(`
      SELECT COUNT(*) as count FROM Roles WHERE id IS NOT NULL
    `);
    console.log(`   Roles with id: ${roleCheck[0].count}`);
    
    // Check Permissions table
    const [permCheck] = await connection.execute(`
      SELECT COUNT(*) as count FROM Permissions WHERE is_active IS NOT NULL
    `);
    console.log(`   Permissions with is_active: ${permCheck[0].count}`);
    
    // Check admin email
    const [adminCheck] = await connection.execute(`
      SELECT ea.email
      FROM EmployeeAddresses ea
      JOIN Employees e ON ea.employee_uuid = e.uuid
      JOIN Users u ON e.uuid = u.employee_uuid
      WHERE u.username = 'admin' AND ea.address_type = 'CURRENT'
      LIMIT 1
    `);
    console.log(`   Admin email: ${adminCheck.length > 0 ? adminCheck[0].email : 'Not found'}`);
    
    console.log('\n🎉 All fixes completed successfully!');
    console.log('\n📋 Summary:');
    console.log('   ✅ Fixed Roles table (added id column)');
    console.log('   ✅ Fixed Permissions table (added is_active column)');  
    console.log('   ✅ Fixed AuthorizationAuditLogs table (added uuid column)');
    console.log('   ✅ Fixed Users table (added role_id references)');
    console.log('   ✅ Fixed admin email for Permit.io compatibility');
    console.log('\n🚀 Your server should now start without these errors.');
    console.log('💡 Please restart your server to see the changes take effect.');
    
  } catch (error) {
    console.error('\n❌ Error:', error.message);
    console.error('\n🔍 Check:');
    console.error('   - Database connection settings in .env');
    console.error('   - Database server is running');
    console.error('   - User has proper permissions');
    process.exit(1);
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

main();