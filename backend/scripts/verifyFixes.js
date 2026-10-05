#!/usr/bin/env node
const mysql = require('mysql2/promise');
require('dotenv').config();

async function verify() {
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME,
  });

  console.log('🔍 Verifying database fixes...\n');

  try {
    // Check UserScopeOverrides.is_active
    const [cols1] = await connection.query(`
      SELECT COLUMN_NAME 
      FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_SCHEMA = DATABASE() 
        AND TABLE_NAME = 'UserScopeOverrides' 
        AND COLUMN_NAME = 'is_active'
    `);
    console.log('1. UserScopeOverrides.is_active:', cols1.length > 0 ? '✅ EXISTS' : '❌ MISSING');

    // Check Occupations table
    const [tables] = await connection.query(`
      SELECT TABLE_NAME 
      FROM INFORMATION_SCHEMA.TABLES 
      WHERE TABLE_SCHEMA = DATABASE() 
        AND TABLE_NAME = 'Occupations'
    `);
    console.log('2. Occupations table:', tables.length > 0 ? '✅ EXISTS' : '❌ MISSING');
    
    if (tables.length > 0) {
      const [count] = await connection.query(`SELECT COUNT(*) as count FROM Occupations`);
      console.log('   → Occupations count:', count[0].count);
    }

    // Check Employees.occupation_uuid
    const [cols2] = await connection.query(`
      SELECT COLUMN_NAME 
      FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_SCHEMA = DATABASE() 
        AND TABLE_NAME = 'Employees' 
        AND COLUMN_NAME = 'occupation_uuid'
    `);
    console.log('3. Employees.occupation_uuid:', cols2.length > 0 ? '✅ EXISTS' : '❌ MISSING');

    // Check admin permissions
    const [admin] = await connection.query(`
      SELECT u.username, u.role_uuid, r.name as role_name
      FROM Users u
      LEFT JOIN Roles r ON u.role_uuid = r.uuid
      WHERE u.username = 'admin'
    `);
    
    if (admin.length > 0) {
      console.log('4. Admin user role:', admin[0].role_name || '❌ NOT ASSIGNED');
      
      if (admin[0].role_uuid) {
        const [permCount] = await connection.query(`
          SELECT COUNT(*) as count 
          FROM RolePermissions 
          WHERE role_uuid = ?
        `, [admin[0].role_uuid]);
        console.log('   → Role permissions count:', permCount[0].count);
        
        const [scopeCount] = await connection.query(`
          SELECT COUNT(*) as count 
          FROM RolePermissionScopes 
          WHERE role_uuid = ?
        `, [admin[0].role_uuid]);
        console.log('   → Role permission scopes count:', scopeCount[0].count);
      }
    } else {
      console.log('4. Admin user: ❌ NOT FOUND');
    }

    console.log('\n✅ Verification complete!\n');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await connection.end();
  }
}

verify();
