require('dotenv').config();
const mysql = require('mysql2/promise');

async function checkLetterRequests() {
  let connection;
  try {
    connection = await mysql.createConnection({
      host: 'localhost',
      user: 'root',
      password: process.env.DB_PASSWORD,
      database: 'hrms_leave_service'
    });

    console.log('Checking LetterRequests table...\n');
    
    // Check if table exists
    const [tables] = await connection.query(`SHOW TABLES LIKE 'LetterRequests'`);
    
    if (tables.length === 0) {
      console.log('❌ LetterRequests table does NOT exist\n');
      
      // Check for similar tables
      const [allTables] = await connection.query('SHOW TABLES');
      console.log('Letter-related tables:');
      allTables
        .map(t => Object.values(t)[0])
        .filter(name => name.toLowerCase().includes('letter'))
        .forEach(name => console.log('  -', name));
    } else {
      console.log('✅ LetterRequests table exists\n');
      
      // Show columns
      const [cols] = await connection.query('DESCRIBE LetterRequests');
      console.log('Columns:');
      cols.forEach(c => console.log(`  - ${c.Field}: ${c.Type}`));
      
      // Count rows
      const [count] = await connection.query('SELECT COUNT(*) as count FROM LetterRequests');
      console.log(`\nTotal rows: ${count[0].count}`);
    }
    
    await connection.end();
    process.exit(0);
  } catch (error) {
    console.error('Error:', error.message);
    if (connection) await connection.end();
    process.exit(1);
  }
}

checkLetterRequests();
