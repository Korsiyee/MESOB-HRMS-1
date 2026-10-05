const mysql = require('mysql2/promise');
require('dotenv').config();

const config = {
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_DATABASE || 'mesob_hrms'
};

async function checkDatabase() {
  let connection;
  
  try {
    connection = await mysql.createConnection(config);
    
    // Check Roles table structure
    const [rolesCols] = await connection.execute(`
      SHOW COLUMNS FROM Roles
    `);
    console.log('Roles table columns:');
    rolesCols.forEach(col => console.log(`  - ${col.Field} (${col.Type})`));
    
    // Check Permissions table structure  
    const [permCols] = await connection.execute(`
      SHOW COLUMNS FROM Permissions
    `);
    console.log('\nPermissions table columns:');
    permCols.forEach(col => console.log(`  - ${col.Field} (${col.Type})`));
    
    // Check admin user email
    const [adminEmail] = await connection.execute(`
      SELECT ea.email
      FROM EmployeeAddresses ea
      JOIN Employees e ON ea.employee_uuid = e.uuid
      JOIN Users u ON e.uuid = u.employee_uuid
      WHERE u.username = 'admin' AND ea.address_type = 'CURRENT'
      LIMIT 1
    `);
    
    console.log('\nAdmin user email:');
    if (adminEmail.length > 0) {
      console.log(`  Current: ${adminEmail[0].email}`);
    } else {
      console.log('  No email found for admin user');
    }
    
  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

checkDatabase();