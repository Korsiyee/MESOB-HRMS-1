require('dotenv').config();
const mysql = require('mysql2/promise');

async function testDB() {
  try {
    console.log('Connecting to database...');
    const connection = await mysql.createConnection({
      host: process.env.DB_HOST,
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      database: process.env.DB_NAME
    });
    
    console.log('Connected!');
    
    const [tables] = await connection.execute(`
      SELECT TABLE_NAME FROM INFORMATION_SCHEMA.TABLES 
      WHERE TABLE_SCHEMA = ? AND TABLE_NAME IN ('Modules', 'Scopes', 'Roles', 'RoleModules')
      ORDER BY TABLE_NAME
    `, [process.env.DB_NAME]);
    
    console.log('\nNew tables found:');
    tables.forEach(row => console.log('  -', row.TABLE_NAME));
    
    if (tables.length > 0) {
      const [modules] = await connection.execute('SELECT COUNT(*) as count FROM Modules');
      const [scopes] = await connection.execute('SELECT COUNT(*) as count FROM Scopes');
      const [roles] = await connection.execute('SELECT COUNT(*) as count FROM Roles');
      
      console.log('\nData counts:');
      console.log('  - Modules:', modules[0].count);
      console.log('  - Scopes:', scopes[0].count);
      console.log('  - Roles:', roles[0].count);
    } else {
      console.log('\n❌ Tables not found! Running setup...');
    }
    
    await connection.end();
    process.exit(0);
  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  }
}

testDB();
