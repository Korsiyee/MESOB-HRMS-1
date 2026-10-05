const bcrypt = require('bcryptjs');

(async () => {
  const password = 'admin123';
  const hash = await bcrypt.hash(password, 10);
  
  console.log('\n===========================================');
  console.log('Password Hash Generator');
  console.log('===========================================');
  console.log('Password:', password);
  console.log('Hash:', hash);
  console.log('===========================================\n');
  
  // Verify
  const valid = await bcrypt.compare(password, hash);
  console.log('Verification Test:', valid ? '✅ PASS' : '❌ FAIL');
  console.log('\nCopy this hash to seed.sql:\n');
  console.log(hash);
  console.log('\n');
})();
