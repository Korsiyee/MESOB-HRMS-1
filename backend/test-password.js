const bcrypt = require('bcryptjs');

const hash = '$2a$10$8KT6Y60nPSyPXKxTlHfUju9Um0hnMheRIOxmQZFaT5nDW7rs4KpYC';

const passwords = ['admin123', 'password', '123456', 'admin', 'Admin123', 'password123'];

console.log('Testing common passwords against the hash...\n');

passwords.forEach(pwd => {
    const match = bcrypt.compareSync(pwd, hash);
    console.log(`Password "${pwd}": ${match ? '✓ MATCH!' : '✗ no match'}`);
});
