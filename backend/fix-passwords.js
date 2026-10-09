const mysql = require('mysql2/promise');
const bcrypt = require('bcryptjs');
require('dotenv').config();

const passwords = {
  'admin': 'admin123',
  'superadmin': 'super123',
  'hradmin': 'hr123',
  'depthead': 'dept123',
  'hrofficer': 'officer123',
  'employee': 'emp123'
};

async function fixPasswords() {
  let connection;
  
  try {
    connection = await mysql.createConnection({
      host: process.env.DB_HOST || 'localhost',
      user: process.env.DB_USER || 'mesob',
      password: process.env.DB_PASSWORD || 'mesob',
      database: process.env.DB_NAME || 'mesob_hrms'
    });

    console.log('Connected to database');
    console.log('\nFixing user passwords with bcrypt hashes...\n');

    for (const [username, plainPassword] of Object.entries(passwords)) {
      const hashedPassword = bcrypt.hashSync(plainPassword, 10);
      
      const [result] = await connection.execute(
        'UPDATE Users SET password_hash = ? WHERE username = ?',
        [hashedPassword, username]
      );

      if (result.affectedRows > 0) {
        console.log(`✓ Updated ${username} with password: ${plainPassword}`);
      } else {
        console.log(`✗ User ${username} not found in database`);
      }
    }

    console.log('\n✅ Password update complete!');
    console.log('\nYou can now login with:');
    console.log('Username: admin');
    console.log('Password: admin123');

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

fixPasswords();
