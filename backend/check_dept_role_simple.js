require('dotenv').config();
const mysql = require('mysql2/promise');

async function check() {
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME
  });

  console.log('\n=== CHECKING DEPT HEAD ROLE ASSIGNMENT ===\n');
  
  // Check all users and their roles
  const [users] = await connection.execute(`
    SELECT 
      u.username,
      u.role_uuid,
      r.code as role_code,
      r.name as role_name
    FROM Users u
    INNER JOIN Roles r ON u.role_uuid = r.uuid
    WHERE u.is_active = 1
    ORDER BY r.code, u.username
  `);

  console.log('All Active Users and Their Roles:');
  console.log('='.repeat(60));
  users.forEach(u => {
    console.log(`Username: ${u.username.padEnd(20)} | Role Code: ${u.role_code.padEnd(15)} | Role Name: ${u.role_name}`);
  });

  await connection.end();
}

check().catch(err => {
  console.error('Error:', err.message);
  process.exit(1);
});
