const mysql = require('mysql2/promise');
require('dotenv').config();

async function diagnose() {
  const conn = await mysql.createConnection({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME
  });
  
  console.log('\n=== DIAGNOSIS: Admin User Permissions ===\n');
  
  // 1. Check admin user and role
  console.log('1. Admin User Info:');
  const [adminUser] = await conn.execute(`
    SELECT u.uuid, u.username, u.role_uuid, r.code as role_code, r.name as role_name
    FROM Users u
    LEFT JOIN Roles r ON u.role_uuid = r.uuid
    WHERE u.username = 'admin'
  `);
  
  if (adminUser.length === 0) {
    console.log('   ❌ Admin user not found!');
    await conn.end();
    return;
  }
  
  const admin = adminUser[0];
  console.log(`   Username: ${admin.username}`);
  console.log(`   User UUID: ${admin.uuid}`);
  console.log(`   Role UUID: ${admin.role_uuid || 'NULL'}`);
  console.log(`   Role Code: ${admin.role_code || 'NULL'}`);
  console.log(`   Role Name: ${admin.role_name || 'NULL'}\n`);
  
  if (!admin.role_uuid) {
    console.log('   ❌ Admin has no role assigned!\n');
    await conn.end();
    return;
  }
  
  // 2. Check what modules this role has access to
  console.log('2. Role Module Permissions:');
  const [roleModules] = await conn.execute(`
    SELECT m.code as module_code, m.name as module_name, s.code as scope_code, s.name as scope_name
    FROM RoleModules rm
    INNER JOIN Modules m ON rm.module_uuid = m.uuid
    INNER JOIN Scopes s ON rm.scope_uuid = s.uuid
    WHERE rm.role_uuid = ?
    ORDER BY m.code
  `, [admin.role_uuid]);
  
  if (roleModules.length === 0) {
    console.log('   ❌ No modules assigned to this role!\n');
  } else {
    console.log(`   ✅ Found ${roleModules.length} module permissions:\n`);
    roleModules.forEach(rm => {
      console.log(`   - ${rm.module_code.padEnd(20)} | ${rm.module_name.padEnd(30)} | Scope: ${rm.scope_code}`);
    });
    console.log('');
  }
  
  // 3. Check all modules in system
  console.log('3. All Modules in System:');
  const [allModules] = await conn.execute('SELECT code, name FROM Modules ORDER BY code');
  allModules.forEach(m => {
    const hasAccess = roleModules.some(rm => rm.module_code === m.code);
    console.log(`   ${hasAccess ? '✅' : '❌'} ${m.code.padEnd(20)} | ${m.name}`);
  });
  console.log('');
  
  // 4. Test the actual query that frontend uses
  console.log('4. Testing Frontend Query (getUserPermissions):');
  const [frontendQuery] = await conn.execute(`
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
    WHERE u.uuid = ? AND r.is_active = TRUE AND (m.is_active = TRUE OR m.is_active IS NULL)
  `, [admin.uuid]);
  
  console.log(`   Query returned ${frontendQuery.length} rows`);
  if (frontendQuery.length === 0) {
    console.log('   ❌ Query returned no results!\n');
  } else {
    console.log('   ✅ Modules found:\n');
    const uniqueModules = [...new Set(frontendQuery.filter(r => r.module_code).map(r => r.module_code))];
    uniqueModules.forEach(code => {
      console.log(`   - ${code}`);
    });
    console.log('');
  }
  
  await conn.end();
  
  // Summary
  console.log('=== SUMMARY ===\n');
  if (roleModules.length === 0) {
    console.log('❌ PROBLEM: Admin role has NO module permissions assigned!');
    console.log('   Solution: Run the module permission setup script\n');
    console.log('   Commands:');
    console.log('   cd backend');
    console.log('   node scripts/setupModulePermissions.js\n');
  } else if (frontendQuery.length === 0) {
    console.log('❌ PROBLEM: Frontend query returns no results!');
    console.log('   This might be a JOIN issue or role is not active\n');
  } else {
    console.log('✅ Backend has module permissions correctly set up');
    console.log('   The issue might be in frontend permission checking logic\n');
  }
}

diagnose().catch(err => {
  console.error('Error:', err.message);
  console.error(err);
  process.exit(1);
});
