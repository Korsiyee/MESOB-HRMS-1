/**
 * Reset admin password to 'admin123'
 */

const mysql = require('mysql2/promise');
const bcrypt = require('bcryptjs');
require('dotenv').config();

async function resetAdminPassword() {
  let connection;
  
  try {
    console.log('Connecting to database...');
    connection = await mysql.createConnection({
      host: process.env.DB_HOST,
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      database: process.env.DB_NAME
    });
    
    console.log('Connected to database');
    
    // Check if admin user exists
    const [users] = await connection.query(
      'SELECT uuid, username, is_active FROM Users WHERE username = ?',
      ['admin']
    );
    
    if (users.length === 0) {
      console.log('❌ Admin user not found!');
      console.log('Run seed.sql first to create users.');
      return;
    }
    
    const admin = users[0];
    console.log(`\nFound user: ${admin.username}`);
    console.log(`UUID: ${admin.uuid}`);
    console.log(`Active: ${admin.is_active}`);
    
    // Generate new password hash
    console.log('\nGenerating password hash for: admin123');
    const newPassword = 'admin123';
    const passwordHash = await bcrypt.hash(newPassword, 10);
    
    console.log('Generated hash:', passwordHash);
    
    // Verify the hash works
    const testVerify = await bcrypt.compare(newPassword, passwordHash);
    console.log('Hash verification:', testVerify ? '✅ PASS' : '❌ FAIL');
    
    if (!testVerify) {
      console.log('❌ Generated hash is invalid! Aborting.');
      return;
    }
    
    // Update the password
    console.log('\nUpdating admin password...');
    await connection.query(
      'UPDATE Users SET password_hash = ?, must_change_password = 0, is_active = 1 WHERE username = ?',
      [passwordHash, 'admin']
    );
    
    console.log('✅ Admin password updated successfully!');
    console.log('\nYou can now login with:');
    console.log('  Username: admin');
    console.log('  Password: admin123');
    
    // Verify the update
    const [updated] = await connection.query(
      'SELECT password_hash FROM Users WHERE username = ?',
      ['admin']
    );
    
    if (updated.length > 0) {
      const dbHash = updated[0].password_hash;
      const finalTest = await bcrypt.compare(newPassword, dbHash);
      console.log('\nFinal verification from database:', finalTest ? '✅ PASS' : '❌ FAIL');
      
      if (!finalTest) {
        console.log('❌ Something went wrong! Hash in database does not match.');
        console.log('Database hash:', dbHash.substring(0, 50) + '...');
      }
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error);
  } finally {
    if (connection) {
      await connection.end();
      console.log('\nDatabase connection closed.');
    }
  }
}

resetAdminPassword();
