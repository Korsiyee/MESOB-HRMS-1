const mysql = require('mysql2/promise');
require('dotenv').config();

async function fixTokenColumn() {
    console.log('Fixing refresh_token column size...\n');
    
    const connection = await mysql.createConnection({
        host: process.env.DB_HOST,
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        database: process.env.DB_NAME
    });

    try {
        // Check current column size
        const [columns] = await connection.execute(
            `SELECT COLUMN_NAME, COLUMN_TYPE, CHARACTER_MAXIMUM_LENGTH 
             FROM INFORMATION_SCHEMA.COLUMNS 
             WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'Users' AND COLUMN_NAME = 'refresh_token'`,
            [process.env.DB_NAME]
        );
        
        if (columns.length > 0) {
            console.log('Current column info:');
            console.log('  Type:', columns[0].COLUMN_TYPE);
            console.log('  Max Length:', columns[0].CHARACTER_MAXIMUM_LENGTH);
            console.log('');
        }
        
        // Alter the column to TEXT (supports up to 65,535 characters)
        console.log('Altering refresh_token column to TEXT...');
        await connection.execute(
            'ALTER TABLE Users MODIFY COLUMN refresh_token TEXT'
        );
        
        console.log('✅ Column altered successfully!');
        console.log('');
        
        // Verify the change
        const [newColumns] = await connection.execute(
            `SELECT COLUMN_NAME, COLUMN_TYPE, CHARACTER_MAXIMUM_LENGTH 
             FROM INFORMATION_SCHEMA.COLUMNS 
             WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'Users' AND COLUMN_NAME = 'refresh_token'`,
            [process.env.DB_NAME]
        );
        
        if (newColumns.length > 0) {
            console.log('New column info:');
            console.log('  Type:', newColumns[0].COLUMN_TYPE);
            console.log('  Max Length:', newColumns[0].CHARACTER_MAXIMUM_LENGTH);
        }
        
        console.log('');
        console.log('✅ Refresh token column fixed! You can now login.');
        
    } catch (error) {
        console.error('❌ Error:', error.message);
        throw error;
    } finally {
        await connection.end();
    }
}

fixTokenColumn().catch(err => {
    console.error('Failed:', err);
    process.exit(1);
});
