require('dotenv').config();
const mysql = require('mysql2/promise');

async function main() {
  const conn = await mysql.createConnection({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME
  });
  
  try {
    // Get all roles
    console.log('\n=== Available Roles ===\n');
    const [roles] = await conn.execute('SELECT uuid, code, name, hierarchy_level FROM Roles ORDER BY hierarchy_level DESC');
    roles.forEach(r => {
      console.log(`${r.code.padEnd(25)} | Level ${String(r.hierarchy_level).padEnd(3)} | ${r.name}`);
      console.log(`  UUID: ${r.uuid}`);
    });
    
    // Get SUPER_ADMIN role
    const superAdminRole = roles.find(r => r.code === 'SUPER_ADMIN');
    if (!superAdminRole) {
      console.log('\n❌ SUPER_ADMIN role not found!');
      await conn.end();
      return;
    }
    
    console.log('\n=== Current Users ===\n');
    const [users] = await conn.execute(`
      SELECT u.uuid, u.username, u.role_uuid, r.code as role_code, r.name as role_name, r.hierarchy_level
      FROM Users u
      LEFT JOIN Roles r ON u.role_uuid = r.uuid
      ORDER BY u.username
    `);
    
    users.forEach(u => {
      console.log(`${u.username.padEnd(20)} | ${(u.role_code || 'NO_ROLE').padEnd(25)} | ${u.role_name || 'No role assigned'}`);
    });
    
    // Fix admin user
    const adminUser = users.find(u => u.username === 'admin');
    if (adminUser) {
      if (adminUser.role_uuid !== superAdminRole.uuid) {
        console.log(`\n🔧 Fixing admin user role...`);
        console.log(`   Current role: ${adminUser.role_code || 'NULL'}`);
        console.log(`   Setting to: SUPER_ADMIN`);
        
        await conn.execute('UPDATE Users SET role_uuid = ? WHERE uuid = ?', [superAdminRole.uuid, adminUser.uuid]);
        console.log('✅ Admin role updated!');
      } else {
        console.log('\n✅ Admin already has SUPER_ADMIN role');
      }
    } else {
      console.log('\n⚠️  Admin user not found');
    }
    
    // Show final state
    console.log('\n=== After Fix ===\n');
    const [finalUsers] = await conn.execute(`
      SELECT u.username, r.code as role_code, r.name as role_name
      FROM Users u
      LEFT JOIN Roles r ON u.role_uuid = r.uuid
      WHERE u.username = 'admin'
    `);
    
    if (finalUsers.length > 0) {
      const u = finalUsers[0];
      console.log(`${u.username.padEnd(20)} | ${u.role_code.padEnd(25)} | ${u.role_name}`);
    }
    
  } finally {
    await conn.end();
  }
}

main().catch(err => {
  console.error('Error:', err.message);
  process.exit(1);
});
