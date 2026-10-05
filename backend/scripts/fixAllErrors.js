#!/usr/bin/env node
/**
 * Complete Database Fix - All Remaining Errors
 */

const mysql = require('mysql2/promise');
const { v4: uuidv4 } = require('uuid');

require('dotenv').config();

const DB_HOST = process.env.DB_HOST;
const DB_USER = process.env.DB_USER;
const DB_PASSWORD = process.env.DB_PASSWORD || '';
const DB_NAME = process.env.DB_NAME;

async function main() {
  console.log('🔧 Comprehensive Database Fix\n');
  
  const connection = await mysql.createConnection({
    host: DB_HOST,
    user: DB_USER,
    password: DB_PASSWORD,
    database: DB_NAME,
    multipleStatements: true
  });

  try {
    // ========================================================================
    // FIX 1: UserScopeOverrides - Add missing scope_configuration column
    // ========================================================================
    console.log('1. Fixing UserScopeOverrides table...');
    try {
      // Check if scope_configuration exists
      const [cols] = await connection.query(`
        SELECT COLUMN_NAME 
        FROM INFORMATION_SCHEMA.COLUMNS 
        WHERE TABLE_SCHEMA = DATABASE() 
          AND TABLE_NAME = 'UserScopeOverrides' 
          AND COLUMN_NAME = 'scope_configuration'
      `);
      
      if (cols.length === 0) {
        console.log('   ➜ Adding scope_configuration column...');
        await connection.query(`
          ALTER TABLE UserScopeOverrides
          ADD COLUMN scope_configuration JSON AFTER data_scope_uuid
        `);
        console.log('   ✅ Added scope_configuration column');
      } else {
        console.log('   ✓ scope_configuration already exists');
      }
    } catch (err) {
      console.log('   ⚠️  Error:', err.message);
    }

    // Ensure is_active column exists too
    try {
      const [cols] = await connection.query(`
        SELECT COLUMN_NAME 
        FROM INFORMATION_SCHEMA.COLUMNS 
        WHERE TABLE_SCHEMA = DATABASE() 
          AND TABLE_NAME = 'UserScopeOverrides' 
          AND COLUMN_NAME = 'is_active'
      `);
      
      if (cols.length === 0) {
        console.log('   ➜ Adding is_active column...');
        await connection.query(`
          ALTER TABLE UserScopeOverrides
          ADD COLUMN is_active BOOLEAN NOT NULL DEFAULT TRUE AFTER expires_at
        `);
        console.log('   ✅ Added is_active column');
      }
    } catch (err) {
      console.log('   ⚠️  Error:', err.message);
    }

    // ========================================================================
    // FIX 2: Occupations table - Fix collation mismatch
    // ========================================================================
    console.log('\n2. Fixing Occupations table collation...');
    try {
      // Get the collation of Employees.uuid
      const [empColl] = await connection.query(`
        SELECT COLLATION_NAME
        FROM INFORMATION_SCHEMA.COLUMNS
        WHERE TABLE_SCHEMA = DATABASE()
          AND TABLE_NAME = 'Employees'
          AND COLUMN_NAME = 'uuid'
      `);
      
      const targetCollation = empColl[0]?.COLLATION_NAME || 'utf8mb4_unicode_ci';
      console.log(`   ℹ️  Target collation: ${targetCollation}`);
      
      // Check if Occupations table exists
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
            uuid VARCHAR(36) PRIMARY KEY COLLATE ${targetCollation},
            code VARCHAR(50) NOT NULL UNIQUE COLLATE ${targetCollation},
            name VARCHAR(255) NOT NULL COLLATE ${targetCollation},
            description TEXT COLLATE ${targetCollation},
            category VARCHAR(100) DEFAULT 'GENERAL' COLLATE ${targetCollation},
            is_active BOOLEAN NOT NULL DEFAULT TRUE,
            display_order INT NOT NULL DEFAULT 0,
            created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            created_by VARCHAR(36),
            updated_by VARCHAR(36),
            INDEX idx_occupations_code (code),
            INDEX idx_occupations_active (is_active),
            INDEX idx_occupations_category (category)
          ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=${targetCollation}
        `);
        console.log('   ✅ Created Occupations table with correct collation');
        
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
          await connection.query(
            `INSERT INTO Occupations (uuid, code, name, category) VALUES (?, ?, ?, ?)`,
            [uuidv4(), occ.code, occ.name, occ.category]
          );
        }
        console.log('   ✅ Added default occupations');
      } else {
        // Fix existing table collation
        console.log('   ➜ Fixing existing Occupations table collation...');
        await connection.query(`
          ALTER TABLE Occupations 
          CONVERT TO CHARACTER SET utf8mb4 COLLATE ${targetCollation}
        `);
        console.log('   ✅ Fixed Occupations table collation');
      }
      
      // Ensure Employees.occupation_uuid exists
      const [empOccCol] = await connection.query(`
        SELECT COLUMN_NAME 
        FROM INFORMATION_SCHEMA.COLUMNS 
        WHERE TABLE_SCHEMA = DATABASE() 
          AND TABLE_NAME = 'Employees' 
          AND COLUMN_NAME = 'occupation_uuid'
      `);
      
      if (empOccCol.length === 0) {
        console.log('   ➜ Adding occupation_uuid to Employees...');
        await connection.query(`
          ALTER TABLE Employees
          ADD COLUMN occupation_uuid VARCHAR(36) COLLATE ${targetCollation} AFTER level_uuid,
          ADD INDEX idx_employees_occupation (occupation_uuid)
        `);
        console.log('   ✅ Added occupation_uuid column');
      }
      
    } catch (err) {
      console.log('   ⚠️  Error:', err.message);
    }

    // ========================================================================
    // FIX 3: Create budgetYears table
    // ========================================================================
    console.log('\n3. Creating budgetYears table...');
    try {
      await connection.query(`
        CREATE TABLE IF NOT EXISTS budgetYears (
          uuid VARCHAR(36) PRIMARY KEY,
          year INT NOT NULL UNIQUE,
          status ENUM('ACTIVE', 'INACTIVE', 'DRAFT') NOT NULL DEFAULT 'DRAFT',
          start_date DATE NOT NULL,
          end_date DATE NOT NULL,
          description TEXT,
          created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
          created_by VARCHAR(36),
          updated_by VARCHAR(36),
          INDEX idx_budget_year (year),
          INDEX idx_budget_status (status)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
      `);
      console.log('   ✅ Created budgetYears table');
      
      // Add current year if no active budget year exists
      const [existing] = await connection.query(`
        SELECT COUNT(*) as count FROM budgetYears WHERE status = 'ACTIVE'
      `);
      
      if (existing[0].count === 0) {
        const currentYear = new Date().getFullYear();
        const startDate = `${currentYear}-01-01`;
        const endDate = `${currentYear}-12-31`;
        
        await connection.query(`
          INSERT INTO budgetYears (uuid, year, status, start_date, end_date, description)
          VALUES (?, ?, 'ACTIVE', ?, ?, ?)
        `, [uuidv4(), currentYear, startDate, endDate, `Budget Year ${currentYear}`]);
        
        console.log(`   ✅ Added active budget year ${currentYear}`);
      }
    } catch (err) {
      console.log('   ⚠️  Error:', err.message);
    }

    // ========================================================================
    // FIX 4: Ensure employeeLeaveBalances table exists
    // ========================================================================
    console.log('\n4. Checking employeeLeaveBalances table...');
    try {
      await connection.query(`
        CREATE TABLE IF NOT EXISTS employeeLeaveBalances (
          uuid VARCHAR(36) PRIMARY KEY,
          employee_uuid VARCHAR(36) NOT NULL,
          year INT NOT NULL,
          entitledDays DECIMAL(5,2) NOT NULL DEFAULT 0,
          usedDays DECIMAL(5,2) NOT NULL DEFAULT 0,
          remainingDays DECIMAL(5,2) NOT NULL DEFAULT 0,
          carriedForwardDays DECIMAL(5,2) NOT NULL DEFAULT 0,
          created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
          UNIQUE KEY uq_employee_year (employee_uuid, year),
          INDEX idx_employee (employee_uuid),
          INDEX idx_year (year),
          FOREIGN KEY (employee_uuid) REFERENCES Employees(uuid) ON DELETE CASCADE
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
      `);
      console.log('   ✅ employeeLeaveBalances table ensured');
    } catch (err) {
      console.log('   ⚠️  Error:', err.message);
    }

    // ========================================================================
    // Verification
    // ========================================================================
    console.log('\n' + '='.repeat(60));
    console.log('VERIFICATION');
    console.log('='.repeat(60));
    
    // Check UserScopeOverrides columns
    const [usoCheck] = await connection.query(`
      SELECT COLUMN_NAME 
      FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_SCHEMA = DATABASE() 
        AND TABLE_NAME = 'UserScopeOverrides' 
        AND COLUMN_NAME IN ('scope_configuration', 'is_active')
      ORDER BY COLUMN_NAME
    `);
    console.log('\nUserScopeOverrides columns:', usoCheck.map(c => c.COLUMN_NAME).join(', ') || 'MISSING');
    
    // Check Occupations table and collation
    const [occCheck] = await connection.query(`
      SELECT TABLE_COLLATION 
      FROM INFORMATION_SCHEMA.TABLES 
      WHERE TABLE_SCHEMA = DATABASE() 
        AND TABLE_NAME = 'Occupations'
    `);
    console.log('Occupations table collation:', occCheck[0]?.TABLE_COLLATION || 'TABLE MISSING');
    
    // Check budgetYears table
    const [budCheck] = await connection.query(`
      SELECT COUNT(*) as count FROM budgetYears
    `);
    console.log('budgetYears record count:', budCheck[0].count);
    
    console.log('\n✅ All fixes completed!\n');
    
  } catch (error) {
    console.error('\n❌ Fatal error:', error);
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
