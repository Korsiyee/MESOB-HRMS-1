require('dotenv').config();
const mysql = require('mysql2/promise');
const bcrypt = require('bcrypt');
const { v4: uuidv4 } = require('uuid');

async function createTestUsers() {
  const conn = await mysql.createConnection({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME
  });
  
  try {
    // Get all roles
    const [roles] = await conn.execute('SELECT uuid, code, name FROM Roles');
    const roleMap = {};
    roles.forEach(r => roleMap[r.code] = r.uuid);
    
    console.log('\n=== Creating Test Users ===\n');
    
    // Define test users with simple passwords
    const testUsers = [
      { username: 'superadmin', password: 'super123', role: 'SUPER_ADMIN', email: 'superadmin@test.com' },
      { username: 'hradmin', password: 'hr123', role: 'HR_ADMIN', email: 'hradmin@test.com' },
      { username: 'depthead', password: 'dept123', role: 'DEPARTMENT_HEAD', email: 'depthead@test.com' },
      { username: 'hrofficer', password: 'officer123', role: 'HR_OFFICER', email: 'officer@test.com' },
      { username: 'employee', password: 'emp123', role: 'EMPLOYEE', email: 'employee@test.com' }
    ];
    
    for (const user of testUsers) {
      try {
        // Check if user exists
        const [existing] = await conn.execute('SELECT uuid FROM Users WHERE username = ?', [user.username]);
        
        if (existing.length > 0) {
          // Update existing user
          const hashedPassword = await bcrypt.hash(user.password, 10);
          await conn.execute(
            'UPDATE Users SET password = ?, role_uuid = ?, email = ? WHERE username = ?',
            [hashedPassword, roleMap[user.role], user.email, user.username]
          );
          console.log(`✅ Updated: ${user.username.padEnd(15)} | Role: ${user.role.padEnd(20)} | Password: ${user.password}`);
        } else {
          // Create new user
          const uuid = uuidv4();
          const hashedPassword = await bcrypt.hash(user.password, 10);
          await conn.execute(
            'INSERT INTO Users (uuid, username, password, email, role_uuid, is_active) VALUES (?, ?, ?, ?, ?, TRUE)',
            [uuid, user.username, hashedPassword, user.email, roleMap[user.role]]
          );
          console.log(`✨ Created: ${user.username.padEnd(15)} | Role: ${user.role.padEnd(20)} | Password: ${user.password}`);
        }
      } catch (err) {
        console.log(`❌ Failed: ${user.username} - ${err.message}`);
      }
    }
    
    // Also fix admin user
    console.log('\n=== Fixing Admin User ===\n');
    const adminPassword = await bcrypt.hash('admin123', 10);
    await conn.execute(
      'UPDATE Users SET password = ?, role_uuid = ? WHERE username = ?',
      [adminPassword, roleMap['SUPER_ADMIN'], 'admin']
    );
    console.log(`✅ Updated: admin           | Role: SUPER_ADMIN         | Password: admin123`);
    
    // Show all users
    console.log('\n=== All Users Summary ===\n');
    const [allUsers] = await conn.execute(`
      SELECT u.username, r.code as role_code, u.email, u.is_active
      FROM Users u
      LEFT JOIN Roles r ON u.role_uuid = r.uuid
      ORDER BY r.hierarchy_level DESC, u.username
    `);
    
    console.log('Username         | Role                     | Email                    | Active');
    console.log('-'.repeat(85));
    allUsers.forEach(u => {
      console.log(`${u.username.padEnd(16)} | ${(u.role_code || 'NO_ROLE').padEnd(24)} | ${(u.email || '').padEnd(24)} | ${u.is_active ? 'Yes' : 'No'}`);
    });
    
    console.log('\n=== Test Credentials ===\n');
    console.log('Username         | Password     | Role');
    console.log('-'.repeat(60));
    console.log('admin            | admin123     | SUPER_ADMIN');
    console.log('superadmin       | super123     | SUPER_ADMIN');
    console.log('hradmin          | hr123        | HR_ADMIN');
    console.log('depthead         | dept123      | DEPARTMENT_HEAD');
    console.log('hrofficer        | officer123   | HR_OFFICER');
    console.log('employee         | emp123       | EMPLOYEE');
    console.log('');
    
  } finally {
    await conn.end();
  }
}

createTestUsers().catch(err => {
  console.error('Error:', err.message);
  process.exit(1);
});
