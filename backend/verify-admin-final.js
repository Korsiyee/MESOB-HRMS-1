const mysql = require('mysql2/promise');
require('dotenv').config();

(async () => {
  const c = await mysql.createConnection({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME
  });
  
  const [users] = await c.execute(`
    SELECT u.username, r.code, r.name, r.hierarchy_level
    FROM Users u
    LEFT JOIN Roles r ON u.role_uuid = r.uuid
    WHERE u.username IN ('admin', 'superadmin', 'hradmin', 'depthead', 'hrofficer', 'employee')
    ORDER BY r.hierarchy_level DESC
  `);
  
  console.log('\nUsername         | Role                  | Level | Full Name');
  console.log('─'.repeat(75));
  users.forEach(u => {
    console.log(`${u.username.padEnd(16)} | ${(u.code || 'NO_ROLE').padEnd(21)} | ${String(u.hierarchy_level || 0).padEnd(5)} | ${u.name || 'N/A'}`);
  });
  console.log('');
  
  await c.end();
})();
