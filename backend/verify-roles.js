require('dotenv').config();
const mysql = require('mysql2/promise');

async function verify() {
  const conn = await mysql.createConnection({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME
  });
  
  console.log('\n=== Current Users and Their Roles ===\n');
  
  const [users] = await conn.execute(`
    SELECT u.username, r.code as role_code, r.name as role_name, r.hierarchy_level
    FROM Users u
    LEFT JOIN Roles r ON u.role_uuid = r.uuid
    ORDER BY u.username
  `);
  
  users.forEach(u => {
    const role = u.role_code || 'NO_ROLE';
    const name = u.role_name || 'No role assigned';
    const level = u.hierarchy_level || 0;
    console.log(`${u.username.padEnd(20)} | ${role.padEnd(20)} | Level ${level} | ${name}`);
  });
  
  console.log('\n=== All Available Roles ===\n');
  
  const [roles] = await conn.execute(`
    SELECT code, name, hierarchy_level
    FROM Roles
    ORDER BY hierarchy_level DESC
  `);
  
  roles.forEach(r => {
    console.log(`${r.code.padEnd(20)} | Level ${r.hierarchy_level.toString().padEnd(3)} | ${r.name}`);
  });
  
  await conn.end();
}

verify().then(() => process.exit(0)).catch(err => {
  console.error('Error:', err.message);
  process.exit(1);
});
