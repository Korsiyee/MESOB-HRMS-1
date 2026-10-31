const bcrypt = require('bcryptjs');
const mysql = require('mysql2/promise');

async function fixAllPasswords() {
  try {
    // Generate hash for 'mesob2024'
    const password = 'mesob2024';
    const hash = await bcrypt.hash(password, 10);
    
    console.log('Generated hash for mesob2024:', hash);
    
    // Connect to database
    const connection = await mysql.createConnection({
      host: 'localhost',
      user: 'root',
      password: '',
      database: 'mesob_hrms'
    });
    
    // Update all user passwords
    const [result] = await connection.execute(
      'UPDATE Users SET password_hash = ? WHERE user_type = "EMPLOYEE"',
      [hash]
    );
    
    console.log(`✓ Updated ${result.affectedRows} user passwords`);
    
    // Verify the updates
    const [users] = await connection.execute(`
      SELECT 
        u.username,
        r.name as role_name,
        u.password_hash
      FROM Users u
      JOIN Roles r ON u.role_uuid = r.uuid
      WHERE u.user_type = 'EMPLOYEE'
      ORDER BY r.hierarchy_level DESC
    `);
    
    console.log('\nVerifying passwords:');
    for (const user of users) {
      const isValid = await bcrypt.compare(password, user.password_hash);
      console.log(`  ${user.username} (${user.role_name}):`, isValid ? '✓ OK' : '✗ FAILED');
    }
    
    await connection.end();
    
  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  }
}

fixAllPasswords();
