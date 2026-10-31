const bcrypt = require('bcryptjs');
const mysql = require('mysql2/promise');

async function fixPassword() {
  try {
    // Generate a proper hash for 'mesob2024'
    const password = 'mesob2024';
    const hash = await bcrypt.hash(password, 10);
    
    console.log('Generated hash:', hash);
    
    // Connect to database
    const connection = await mysql.createConnection({
      host: 'localhost',
      user: 'root',
      password: '',
      database: 'mesob_hrms'
    });
    
    // Update the password
    await connection.execute(
      'UPDATE Users SET password_hash = ? WHERE username = ?',
      [hash, 'abebe.tadesse']
    );
    
    console.log('✓ Password updated successfully!');
    
    // Verify the update
    const [rows] = await connection.execute(
      'SELECT username, is_active, password_hash FROM Users WHERE username = ?',
      ['abebe.tadesse']
    );
    
    if (rows.length > 0) {
      console.log('\nVerification:');
      console.log('Username:', rows[0].username);
      console.log('Is Active:', rows[0].is_active);
      console.log('Hash starts with:', rows[0].password_hash.substring(0, 20));
      
      // Test the password
      const isValid = await bcrypt.compare(password, rows[0].password_hash);
      console.log('Password "mesob2024" validates:', isValid ? '✓ YES' : '✗ NO');
    }
    
    await connection.end();
    
  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  }
}

fixPassword();
