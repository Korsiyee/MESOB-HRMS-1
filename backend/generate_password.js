const bcrypt = require('bcryptjs');

async function generateHash() {
  const password = 'Password123!';
  const hash = await bcrypt.hash(password, 10);
  console.log('Password:', password);
  console.log('Hash:', hash);
  console.log('\nSQL UPDATE command:');
  console.log(`UPDATE Users SET password_hash = '${hash}' WHERE username IN ('admin', 'abebe.tadesse', 'samuel.hagos');`);
}

generateHash();
