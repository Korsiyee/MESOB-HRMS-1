require('dotenv').config();
const mysql = require('mysql2/promise');

async function fixAdminRole() {
  let connection;
  try {
    connection = await mysql.createConnection({
      host: process.env.DB_HOST,
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      database: process.env.DB_NAME
    });

    // Get SUPER_ADMIN role
    const [roles] = await connection.execute('SELECT uuid FROM Roles WHERE code = ?', ['SUPER_ADMIN']);
    const superAdminUuid = roles[0].uuid;
    console.log('SUPER_ADMIN UUID:', superAdminUuid);

    // Find admin users
    const [users] = await connection.execute('SELECT uuid, username FROM Users WHERE username LIKE ? OR username = ?', ['%admin%', 'admin']);
    console.log('\nAdmin users found:', users.length);

    // Update each admin user
    for (const user of users) {
      await connection.execute('UPDATE Users SET role_uuid = ? WHERE uuid = ?', [superAdminUuid, user.uuid]);
      console.log('✓ Fixed:', user.username);
    }

    console.log('\n✅ Done!');
    await connection.end();
    process.exit(0);
  } catch (error) {
    console.error('Error:', error.message);
    if (connection) await connection.end();
    process.exit(1);
  }
}

fixAdminRole();
