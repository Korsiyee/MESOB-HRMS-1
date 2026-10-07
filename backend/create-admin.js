const bcrypt = require('bcryptjs');
const mysql = require('mysql2/promise');
require('dotenv').config();

async function createAdminUser() {
    console.log('Creating new admin user...\n');
    
    // Create connection
    const connection = await mysql.createConnection({
        host: process.env.DB_HOST,
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        database: process.env.DB_NAME
    });

    try {
        // Username and password
        const username = 'admin';
        const password = 'admin123';
        
        console.log('Username:', username);
        console.log('Password:', password);
        console.log('');
        
        // Hash the password
        const salt = await bcrypt.genSalt(10);
        const passwordHash = await bcrypt.hash(password, salt);
        
        console.log('Password hash:', passwordHash);
        console.log('');
        
        // Check if admin user exists
        const [existing] = await connection.execute(
            'SELECT uuid, username FROM Users WHERE username = ?',
            [username]
        );
        
        if (existing.length > 0) {
            console.log('Admin user already exists. Updating password...');
            
            // Update existing user
            await connection.execute(
                'UPDATE Users SET password_hash = ?, is_active = 1 WHERE username = ?',
                [passwordHash, username]
            );
            
            console.log('✅ Admin password updated successfully!');
        } else {
            console.log('Creating new admin user...');
            
            // Get the first employee to link
            const [employees] = await connection.execute(
                'SELECT uuid FROM Employees LIMIT 1'
            );
            
            const employeeUuid = employees.length > 0 ? employees[0].uuid : null;
            
            // Insert new admin user
            await connection.execute(
                `INSERT INTO Users (uuid, employee_uuid, username, password_hash, role, is_active) 
                 VALUES (?, ?, ?, ?, ?, ?)`,
                ['user-new-admin', employeeUuid, username, passwordHash, 'SUPER_ADMIN', 1]
            );
            
            console.log('✅ Admin user created successfully!');
        }
        
        console.log('');
        console.log('================================================');
        console.log('LOGIN CREDENTIALS:');
        console.log('================================================');
        console.log('Username: admin');
        console.log('Password: admin123');
        console.log('================================================');
        console.log('');
        console.log('You can now login at: http://localhost:5173');
        
    } catch (error) {
        console.error('❌ Error:', error.message);
        throw error;
    } finally {
        await connection.end();
    }
}

createAdminUser().catch(err => {
    console.error('Failed:', err);
    process.exit(1);
});
