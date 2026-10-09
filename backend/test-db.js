const mysql = require('mysql2/promise');
require('dotenv').config();

(async () => {
  try {
    console.log('Connecting to database...');
    const connection = await mysql.createConnection({
      host: process.env.DB_HOST,
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      database: process.env.DB_NAME
    });
    
    console.log('✓ Connected successfully\n');
    console.log('Checking critical tables for employee module...\n');
    
    const criticalTables = [
      'Employees',
      'EmployeeAddresses', 
      'EmployeeIDDocuments',
      'EmployeeRegistrationDrafts',
      'Departments',
      'Positions',
      'Levels',
      'Occupations',
      'Notifications'
    ];
    
    for (const table of criticalTables) {
      try {
        const [rows] = await connection.query(`SHOW TABLES LIKE '${table}'`);
        const exists = rows.length > 0;
        console.log((exists ? '✓' : '✗') + ' ' + table + (exists ? '' : ' (MISSING)'));
      } catch (err) {
        console.log('✗ ' + table + ' (ERROR: ' + err.message + ')');
      }
    }
    
    console.log('\nAll tables in database:');
    const [allTables] = await connection.query('SHOW TABLES');
    allTables.forEach((t, i) => console.log((i+1) + '. ' + Object.values(t)[0]));
    
    await connection.end();
  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  }
})();
