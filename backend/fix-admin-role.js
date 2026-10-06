require('dotenv').config();
const mysql = require('mysql2/promise');

async function fixAdminRole() {
  let connection;
  try {
    console.log('Fixing admin roles...\n');
    
    connection = await mysql.createConnection({
      host: process.env.DB_HOST,
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      database: process.env.DB_NAME
    });

    // Get SUPER_ADMIN role UUID
    const [roles] = await connection.execute(
      'SELECT uuid, code FROM Roles WHERE code = ?',
      ['SUPER_ADMIN']
    );

    if (roles.length === 0) {
      console.log('❌ SUPER_ADMIN role not found!');
      process.exit(1);
    }

    const superAdminUuid = roles[0].uuid;
    console.log(`✓ Found SUPER_ADMIN role: ${superAdminUuid}`);

    // Find admin users (look for admin/administrator in username or employee_id)
    const [users] = await connection.execute(
      "SELECT u.uuid, u.username, u.employee_id, r.code as current_role FROM Users u LEFT JOIN Roles r ON u.role_uuid = r.uuid WHERE u.username LIKE ? OR u.employee_id LIKE ? OR u.username = ?",
      ['%admin%', '%ADMIN%', 'admin']
    );

    console.log(`\nFound ${users.length} admin users:\n`);
    
    for (const user of users) {
      console.log(`  ${user.username} (${user.employee_id})`);
      
      // Update to SUPER_ADMIN
      await connection.execute(
        'UPDATE Users SET role_uuid = ? WHERE uuid = ?',
        [superAdminUuid, user.uuid]
      );
      
      console.log(`  ✓ Updated to SUPER_ADMIN\n`);
    }

    console.log('✅ Admin roles fixed!');
    await connection.end();
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error.message);
    if (connection) await connection.end();
    process.exit(1);
  }
}

fixAdminRole();
