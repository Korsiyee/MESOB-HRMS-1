const mysql = require('mysql2/promise');
require('dotenv').config();

async function setup() {
  const conn = await mysql.createConnection({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME
  });
  
  try {
    console.log('\n=== Setting Up Admin Module Permissions ===\n');
    
    // Get SUPER_ADMIN role
    const [roles] = await conn.execute("SELECT uuid FROM Roles WHERE code = 'SUPER_ADMIN'");
    if (roles.length === 0) {
      console.log('❌ SUPER_ADMIN role not found!');
      await conn.end();
      return;
    }
    const superAdminUuid = roles[0].uuid;
    console.log(`✅ Found SUPER_ADMIN role: ${superAdminUuid}`);
    
    // Get ORGANIZATION scope
    const [scopes] = await conn.execute("SELECT uuid FROM Scopes WHERE code = 'ORGANIZATION'");
    if (scopes.length === 0) {
      console.log('❌ ORGANIZATION scope not found!');
      await conn.end();
      return;
    }
    const orgScopeUuid = scopes[0].uuid;
    console.log(`✅ Found ORGANIZATION scope: ${orgScopeUuid}`);
    
    // Get all modules
    const [modules] = await conn.execute('SELECT uuid, code, name FROM Modules');
    console.log(`✅ Found ${modules.length} modules\n`);
    
    // Delete existing permissions for SUPER_ADMIN
    await conn.execute('DELETE FROM RoleModules WHERE role_uuid = ?', [superAdminUuid]);
    console.log('🗑️  Cleared existing SUPER_ADMIN permissions\n');
    
    // Assign all modules to SUPER_ADMIN with ORGANIZATION scope
    console.log('📝 Assigning modules to SUPER_ADMIN:\n');
    for (const module of modules) {
      const uuid = require('uuid').v4();
      await conn.execute(
        'INSERT INTO RoleModules (uuid, role_uuid, module_uuid, scope_uuid) VALUES (?, ?, ?, ?)',
        [uuid, superAdminUuid, module.uuid, orgScopeUuid]
      );
      console.log(`   ✅ ${module.code.padEnd(20)} | ${module.name}`);
    }
    
    // Update admin user to have SUPER_ADMIN role
    console.log('\n👤 Setting admin user role:\n');
    await conn.execute('UPDATE Users SET role_uuid = ? WHERE username = ?', [superAdminUuid, 'admin']);
    console.log('   ✅ admin user → SUPER_ADMIN');
    
    // Verify
    console.log('\n🔍 Verification:\n');
    const [verify] = await conn.execute(`
      SELECT COUNT(*) as count
      FROM RoleModules
      WHERE role_uuid = ?
    `, [superAdminUuid]);
    console.log(`   ✅ SUPER_ADMIN has ${verify[0].count} module permissions assigned`);
    
    const [userVerify] = await conn.execute(`
      SELECT u.username, r.code
      FROM Users u
      INNER JOIN Roles r ON u.role_uuid = r.uuid
      WHERE u.username = 'admin'
    `);
    if (userVerify.length > 0) {
      console.log(`   ✅ admin user role: ${userVerify[0].code}\n`);
    }
    
    console.log('═══════════════════════════════════════════════════════════');
    console.log('✅ COMPLETE!');
    console.log('═══════════════════════════════════════════════════════════\n');
    console.log('Next steps:');
    console.log('1. Logout from the frontend');
    console.log('2. Login again as admin');
    console.log('3. You should now see all modules in navigation\n');
    
  } finally {
    await conn.end();
  }
}

setup().catch(err => {
  console.error('❌ Error:', err.message);
  process.exit(1);
});
