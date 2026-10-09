const mysql = require('mysql2/promise');
const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');
require('dotenv').config();

async function createTestUsers() {
  let connection;
  
  try {
    connection = await mysql.createConnection({
      host: process.env.DB_HOST || 'localhost',
      user: process.env.DB_USER || 'mesob',
      password: process.env.DB_PASSWORD || 'mesob',
      database: process.env.DB_NAME || 'mesob_hrms'
    });

    console.log('✓ Connected to database\n');

    // Get role UUIDs
    const [roles] = await connection.execute('SELECT uuid, code FROM Roles');
    const roleMap = {};
    roles.forEach(r => roleMap[r.code] = r.uuid);

    console.log('Found roles:', Object.keys(roleMap).join(', '), '\n');

    // Test users to create
    const users = [
      { username: 'admin', password: 'admin123', role: 'SUPER_ADMIN' },
      { username: 'superadmin', password: 'super123', role: 'SUPER_ADMIN' },
      { username: 'hradmin', password: 'hr123', role: 'HR_ADMIN' },
      { username: 'depthead', password: 'dept123', role: 'DEPARTMENT_HEAD' },
      { username: 'hrofficer', password: 'officer123', role: 'HR_OFFICER' },
      { username: 'employee', password: 'emp123', role: 'EMPLOYEE' }
    ];

    console.log('Creating test users...\n');

    for (const user of users) {
      const uuid = uuidv4();
      const hashedPassword = bcrypt.hashSync(user.password, 10);
      const roleUuid = roleMap[user.role];

      if (!roleUuid) {
        console.log(`✗ Role ${user.role} not found, skipping ${user.username}`);
        continue;
      }

      // Check if user exists
      const [existing] = await connection.execute(
        'SELECT username FROM Users WHERE username = ?',
        [user.username]
      );

      if (existing.length > 0) {
        // Update existing user
        await connection.execute(
          'UPDATE Users SET password_hash = ?, role = ?, role_uuid = ?, is_active = 1 WHERE username = ?',
          [hashedPassword, user.role, roleUuid, user.username]
        );
        console.log(`✓ Updated ${user.username} (${user.role}) - Password: ${user.password}`);
      } else {
        // Create new user
        await connection.execute(
          `INSERT INTO Users (uuid, username, password_hash, role, role_uuid, is_active, created_at, updated_at) 
           VALUES (?, ?, ?, ?, ?, 1, NOW(), NOW())`,
          [uuid, user.username, hashedPassword, user.role, roleUuid]
        );
        console.log(`✓ Created ${user.username} (${user.role}) - Password: ${user.password}`);
      }
    }

    console.log('\n✅ All test users created/updated!');
    console.log('\n📋 Login Credentials:');
    console.log('==========================================');
    users.forEach(u => {
      console.log(`Username: ${u.username.padEnd(12)} Password: ${u.password}`);
    });
    console.log('==========================================\n');

  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error);
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

createTestUsers();
