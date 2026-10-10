/**
 * Debug script to check SUPER_ADMIN module access
 */

require('dotenv').config();
const mysql = require('mysql2/promise');

async function debugSuperAdminModules() {
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME
  });

  console.log('\n=== DEBUGGING SUPER_ADMIN MODULE ACCESS ===\n');

  try {
    // 1. Check if SUPER_ADMIN role exists
    const [roles] = await connection.execute(
      'SELECT uuid, code, name, hierarchy_level FROM Roles WHERE code = ?',
      ['SUPER_ADMIN']
    );
    
    if (roles.length === 0) {
      console.log('❌ SUPER_ADMIN role NOT FOUND in database!');
      return;
    }
    
    const superAdminRole = roles[0];
    console.log('✅ SUPER_ADMIN Role Found:');
    console.log(`   UUID: ${superAdminRole.uuid}`);
    console.log(`   Name: ${superAdminRole.name}`);
    console.log(`   Hierarchy: ${superAdminRole.hierarchy_level}\n`);

    // 2. Check all modules in database
    const [allModules] = await connection.execute(
      'SELECT uuid, code, name, category FROM Modules WHERE is_active = 1 ORDER BY display_order'
    );
    
    console.log(`📊 Total Active Modules in Database: ${allModules.length}`);
    console.log('   Modules:');
    allModules.forEach(m => {
      console.log(`   - ${m.code} (${m.category}): ${m.name}`);
    });
    console.log();

    // 3. Check RoleModules mapping for SUPER_ADMIN
    const [roleModules] = await connection.execute(`
      SELECT m.code, m.name, m.category
      FROM RoleModules rm
      JOIN Modules m ON rm.module_uuid = m.uuid
      WHERE rm.role_uuid = ?
      ORDER BY m.display_order
    `, [superAdminRole.uuid]);

    console.log(`🔗 Modules Assigned to SUPER_ADMIN in RoleModules: ${roleModules.length}`);
    console.log('   Assigned Modules:');
    roleModules.forEach(m => {
      console.log(`   - ${m.code} (${m.category}): ${m.name}`);
    });
    console.log();

    // 4. Check for missing modules
    const assignedCodes = new Set(roleModules.map(m => m.code));
    const missingModules = allModules.filter(m => !assignedCodes.has(m.code));
    
    if (missingModules.length > 0) {
      console.log(`⚠️  MISSING MODULES for SUPER_ADMIN: ${missingModules.length}`);
      console.log('   Not Assigned:');
      missingModules.forEach(m => {
        console.log(`   - ${m.code} (${m.category}): ${m.name}`);
      });
      console.log();
    } else {
      console.log('✅ All modules are assigned to SUPER_ADMIN\n');
    }

    // 5. Check static mapping vs database
    const { getModulesForRole } = require('./src/config/roleModuleMapping');
    const staticModules = getModulesForRole('SUPER_ADMIN');
    
    console.log(`📋 Static Configuration (roleModuleMapping.js): ${staticModules.length} modules`);
    console.log('   Static Modules:');
    staticModules.forEach(code => {
      console.log(`   - ${code}`);
    });
    console.log();

    // 6. Compare static vs database
    const staticSet = new Set(staticModules);
    const dbSet = new Set(allModules.map(m => m.code));
    
    const inStaticNotInDb = staticModules.filter(code => !dbSet.has(code));
    const inDbNotInStatic = allModules.map(m => m.code).filter(code => !staticSet.has(code));
    
    if (inStaticNotInDb.length > 0) {
      console.log(`⚠️  Modules in static config but NOT in database: ${inStaticNotInDb.length}`);
      inStaticNotInDb.forEach(code => {
        console.log(`   - ${code}`);
      });
      console.log();
    }
    
    if (inDbNotInStatic.length > 0) {
      console.log(`⚠️  Modules in database but NOT in static config: ${inDbNotInStatic.length}`);
      inDbNotInStatic.forEach(code => {
        console.log(`   - ${code}`);
      });
      console.log();
    }

    // 7. Check a sample SUPER_ADMIN user
    const [users] = await connection.execute(`
      SELECT u.uuid, u.username, u.first_name, u.last_name, r.code as role_code
      FROM Users u
      JOIN Roles r ON u.role_uuid = r.uuid
      WHERE r.code = 'SUPER_ADMIN'
      LIMIT 1
    `);

    if (users.length > 0) {
      const user = users[0];
      console.log(`👤 Sample SUPER_ADMIN User:`);
      console.log(`   Username: ${user.username}`);
      console.log(`   Name: ${user.first_name} ${user.last_name}`);
      console.log(`   UUID: ${user.uuid}`);
      console.log(`   Role: ${user.role_code}\n`);
    } else {
      console.log('⚠️  No SUPER_ADMIN users found in database\n');
    }

    // 8. Summary
    console.log('=== DIAGNOSIS ===');
    if (missingModules.length > 0) {
      console.log('❌ PROBLEM: SUPER_ADMIN role is missing module assignments in RoleModules table');
      console.log('   Solution: Re-run the migration script or manually insert missing RoleModules entries');
    } else if (inDbNotInStatic.length > 0) {
      console.log('⚠️  WARNING: Database has modules not in static config');
      console.log('   Solution: Add missing module codes to roleModuleMapping.js SUPER_ADMIN array');
    } else if (inStaticNotInDb.length > 0) {
      console.log('⚠️  WARNING: Static config references modules not in database');
      console.log('   Solution: Ensure database has all required modules');
    } else {
      console.log('✅ Configuration looks correct');
      console.log('   If SUPER_ADMIN still can\'t see modules, check:');
      console.log('   - Frontend localStorage for cached modules');
      console.log('   - Backend API response for /auth/login');
      console.log('   - Browser console for errors');
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await connection.end();
  }
}

debugSuperAdminModules().catch(console.error);
