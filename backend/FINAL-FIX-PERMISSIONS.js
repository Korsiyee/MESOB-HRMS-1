const mysql = require('mysql2/promise');
const { v4: uuidv4 } = require('uuid');
require('dotenv').config();

async function finalFix() {
  const conn = await mysql.createConnection({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME
  });
  
  try {
    console.log('\n╔═══════════════════════════════════════════════════════════╗');
    console.log('║   FINAL FIX: Backend-Frontend Permission Sync           ║');
    console.log('╚═══════════════════════════════════════════════════════════╝\n');
    
    // STEP 1: Get SUPER_ADMIN role
    console.log('Step 1: Getting SUPER_ADMIN role...');
    const [roles] = await conn.execute("SELECT uuid, code FROM Roles WHERE code = 'SUPER_ADMIN'");
    if (roles.length === 0) {
      console.log('❌ SUPER_ADMIN role not found! Database not set up properly.');
      await conn.end();
      return;
    }
    const superAdminUuid = roles[0].uuid;
    console.log(`✅ SUPER_ADMIN UUID: ${superAdminUuid}\n`);
    
    // STEP 2: Get ORGANIZATION scope
    console.log('Step 2: Getting ORGANIZATION scope...');
    const [scopes] = await conn.execute("SELECT uuid, code FROM Scopes WHERE code = 'ORGANIZATION'");
    if (scopes.length === 0) {
      console.log('❌ ORGANIZATION scope not found!');
      await conn.end();
      return;
    }
    const orgScopeUuid = scopes[0].uuid;
    console.log(`✅ ORGANIZATION scope UUID: ${orgScopeUuid}\n`);
    
    // STEP 3: Get all modules
    console.log('Step 3: Checking modules in database...');
    const [modules] = await conn.execute('SELECT uuid, code, name FROM Modules WHERE is_active = TRUE');
    console.log(`✅ Found ${modules.length} active modules:`);
    modules.forEach(m => console.log(`   - ${m.code}: ${m.name}`));
    console.log('');
    
    // STEP 4: Clear existing SUPER_ADMIN permissions
    console.log('Step 4: Clearing existing SUPER_ADMIN permissions...');
    const [deleted] = await conn.execute('DELETE FROM RoleModules WHERE role_uuid = ?', [superAdminUuid]);
    console.log(`✅ Deleted ${deleted.affectedRows} existing permissions\n`);
    
    // STEP 5: Assign ALL modules to SUPER_ADMIN
    console.log('Step 5: Assigning all modules to SUPER_ADMIN...');
    for (const module of modules) {
      const uuid = uuidv4();
      await conn.execute(
        'INSERT INTO RoleModules (uuid, role_uuid, module_uuid, scope_uuid) VALUES (?, ?, ?, ?)',
        [uuid, superAdminUuid, module.uuid, orgScopeUuid]
      );
      console.log(`   ✅ ${module.code.padEnd(20)} → SUPER_ADMIN`);
    }
    console.log('');
    
    // STEP 6: Update admin user role
    console.log('Step 6: Setting admin user to SUPER_ADMIN role...');
    await conn.execute('UPDATE Users SET role_uuid = ? WHERE username = ?', [superAdminUuid, 'admin']);
    console.log('✅ Admin user updated\n');
    
    // STEP 7: Verify the complete chain
    console.log('Step 7: Verifying complete permission chain...\n');
    const [verifyChain] = await conn.execute(`
      SELECT 
        u.username,
        r.code as role_code,
        COUNT(DISTINCT m.code) as module_count,
        GROUP_CONCAT(DISTINCT m.code ORDER BY m.code) as modules
      FROM Users u
      INNER JOIN Roles r ON u.role_uuid = r.uuid
      LEFT JOIN RoleModules rm ON r.uuid = rm.role_uuid
      LEFT JOIN Modules m ON rm.module_uuid = m.uuid
      WHERE u.username = 'admin'
      GROUP BY u.username, r.code
    `);
    
    if (verifyChain.length > 0) {
      const v = verifyChain[0];
      console.log(`Username: ${v.username}`);
      console.log(`Role: ${v.role_code}`);
      console.log(`Module count: ${v.module_count}`);
      console.log(`Modules: ${v.modules || 'NONE'}\n`);
      
      if (v.module_count === modules.length) {
        console.log('✅ VERIFIED: Admin has all modules assigned!\n');
      } else {
        console.log(`❌ PROBLEM: Admin should have ${modules.length} modules but has ${v.module_count}\n`);
      }
    }
    
    // STEP 8: Test the exact query used by moduleAuthService
    console.log('Step 8: Testing moduleAuthService query...\n');
    const [serviceQuery] = await conn.execute(`
      SELECT 
        u.uuid as user_uuid,
        u.username,
        u.employee_uuid,
        e.department_uuid,
        r.uuid as role_uuid,
        r.code as role_code,
        r.name as role_name,
        r.hierarchy_level,
        ds.uuid as default_scope_uuid,
        ds.code as default_scope_code,
        ds.name as default_scope_name,
        ds.level as default_scope_level,
        m.uuid as module_uuid,
        m.code as module_code,
        m.name as module_name,
        s.uuid as scope_uuid,
        s.code as scope_code,
        s.name as scope_name,
        s.level as scope_level
      FROM Users u
      INNER JOIN Roles r ON u.role_uuid = r.uuid
      LEFT JOIN Employees e ON e.uuid = u.employee_uuid
      LEFT JOIN Scopes ds ON r.default_scope_uuid = ds.uuid
      LEFT JOIN RoleModules rm ON r.uuid = rm.role_uuid
      LEFT JOIN Modules m ON rm.module_uuid = m.uuid
      LEFT JOIN Scopes s ON rm.scope_uuid = s.uuid
      WHERE u.username = 'admin' AND r.is_active = TRUE AND (m.is_active = TRUE OR m.is_active IS NULL)
    `);
    
    const uniqueModules = [...new Set(serviceQuery.filter(r => r.module_code).map(r => r.module_code))];
    console.log(`Query returned ${serviceQuery.length} rows`);
    console.log(`Unique modules: ${uniqueModules.length}`);
    console.log(`Modules found: ${uniqueModules.join(', ')}\n`);
    
    if (uniqueModules.length === modules.length) {
      console.log('✅ Backend query will return ALL modules correctly!\n');
    } else {
      console.log(`❌ Backend query returns ${uniqueModules.length} modules, expected ${modules.length}\n`);
    }
    
    console.log('╔═══════════════════════════════════════════════════════════╗');
    console.log('║                  ✅ FIX COMPLETE!                        ║');
    console.log('╚═══════════════════════════════════════════════════════════╝\n');
    console.log('Next steps:');
    console.log('1. LOGOUT from the frontend completely');
    console.log('2. LOGIN again as admin (password: admin123)');
    console.log('3. Check navigation - should see ALL modules\n');
    console.log('If still not working, check browser console for errors.\n');
    
  } finally {
    await conn.end();
  }
}

finalFix().catch(err => {
  console.error('❌ Error:', err.message);
  console.error(err);
  process.exit(1);
});
