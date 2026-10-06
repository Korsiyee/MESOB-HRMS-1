#!/usr/bin/env node

/**
 * Verify Module Permission System Setup
 * 
 * Checks that all tables are created and seeded correctly
 */

require('dotenv').config();
const mysql = require('mysql2/promise');

async function verifySetup() {
  let connection;
  
  try {
    console.log('═══════════════════════════════════════════════════════════');
    console.log('Verifying Module Permission System Setup');
    console.log('═══════════════════════════════════════════════════════════\n');
    
    connection = await mysql.createConnection({
      host: process.env.DB_HOST || 'localhost',
      user: process.env.DB_USER || 'mesob',
      password: process.env.DB_PASSWORD || 'mesob_password',
      database: process.env.DB_NAME || 'mesob_hrms',
    });

    console.log('✅ Connected to database\n');

    // Check tables exist
    console.log('📋 Checking tables...\n');
    
    const tables = ['Modules', 'Scopes', 'Roles', 'RoleModules', 'Users'];
    for (const table of tables) {
      const [rows] = await connection.query(
        `SELECT TABLE_NAME FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ?`,
        [table]
      );
      
      if (rows.length > 0) {
        const [count] = await connection.query(`SELECT COUNT(*) as count FROM ${table}`);
        console.log(`  ✅ ${table.padEnd(15)} (${count[0].count} rows)`);
      } else {
        console.log(`  ❌ ${table.padEnd(15)} (NOT FOUND)`);
      }
    }

    // Check data
    console.log('\n📊 Data Summary:\n');
    
    const [scopes] = await connection.query('SELECT code, name, level FROM Scopes ORDER BY level DESC');
    console.log('  Scopes:');
    scopes.forEach(s => console.log(`    • ${s.name.padEnd(20)} (${s.code}, level ${s.level})`));
    
    const [modules] = await connection.query('SELECT code, name FROM Modules ORDER BY display_order');
    console.log('\n  Modules:');
    modules.forEach(m => console.log(`    • ${m.name.padEnd(20)} (${m.code})`));
    
    const [roles] = await connection.query(`
      SELECT 
        r.code, 
        r.name, 
        r.hierarchy_level,
        s.code as default_scope,
        COUNT(rm.uuid) as module_count
      FROM Roles r
      LEFT JOIN Scopes s ON r.default_scope_uuid = s.uuid
      LEFT JOIN RoleModules rm ON r.uuid = rm.role_uuid
      GROUP BY r.uuid, r.code, r.name, r.hierarchy_level, s.code
      ORDER BY r.hierarchy_level DESC
    `);
    console.log('\n  Roles:');
    roles.forEach(r => {
      console.log(`    • ${r.name.padEnd(20)} (${r.code}, level ${r.hierarchy_level}, ${r.module_count} modules, ${r.default_scope || 'no'} scope)`);
    });

    // Check role-module assignments
    console.log('\n📋 Role-Module Assignments:\n');
    
    for (const role of roles) {
      const [assignments] = await connection.query(`
        SELECT 
          m.code as module_code,
          m.name as module_name,
          s.code as scope_code
        FROM RoleModules rm
        INNER JOIN Modules m ON rm.module_uuid = m.uuid
        INNER JOIN Scopes s ON rm.scope_uuid = s.uuid
        INNER JOIN Roles r ON rm.role_uuid = r.uuid
        WHERE r.code = ?
        ORDER BY m.display_order
      `, [role.code]);
      
      console.log(`  ${role.name}:`);
      if (assignments.length === 0) {
        console.log(`    (no modules assigned)`);
      } else {
        assignments.forEach(a => {
          console.log(`    • ${a.module_name.padEnd(20)} → ${a.scope_code} scope`);
        });
      }
      console.log('');
    }

    // Check Users table
    const [usersWithRole] = await connection.query('SELECT COUNT(*) as count FROM Users WHERE role_uuid IS NOT NULL');
    const [totalUsers] = await connection.query('SELECT COUNT(*) as count FROM Users');
    
    console.log('👥 Users:\n');
    console.log(`  Total users: ${totalUsers[0].count}`);
    console.log(`  Users with role_uuid: ${usersWithRole[0].count}`);
    
    if (usersWithRole[0].count === 0 && totalUsers[0].count > 0) {
      console.log('\n  ⚠️  Warning: Users exist but none have role_uuid assigned.');
      console.log('  You may need to run a migration to assign role_uuid based on old role column.');
    }

    console.log('\n═══════════════════════════════════════════════════════════');
    console.log('✅ Setup Verification Complete!');
    console.log('═══════════════════════════════════════════════════════════\n');

  } catch (error) {
    console.error('\n❌ Verification failed:', error.message);
    console.error(error);
    process.exit(1);
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

verifySetup();
