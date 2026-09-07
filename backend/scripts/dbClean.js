/**
 * Database Clean Script
 * Drops all tables and resets the database to a clean state
 * WARNING: This will delete ALL data in the database!
 */

const mysql = require('mysql2/promise');
const readline = require('readline');
require('dotenv').config();

const DB_HOST = process.env.DB_HOST;
const DB_USER = process.env.DB_USER;
const DB_PASSWORD = process.env.DB_PASSWORD || '';
const DB_NAME = process.env.DB_NAME;

// Prompt for confirmation
function askConfirmation(question) {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });

  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      rl.close();
      resolve(answer.toLowerCase() === 'yes');
    });
  });
}

async function cleanDatabase() {
  let connection;
  
  try {
    console.log('\n' + '='.repeat(70));
    console.log('⚠️  DATABASE CLEAN SCRIPT');
    console.log('='.repeat(70));
    console.log(`Database: ${DB_NAME}`);
    console.log(`Host: ${DB_HOST}`);
    console.log('\n⚠️  WARNING: This will DROP ALL TABLES and DELETE ALL DATA!');
    console.log('='.repeat(70) + '\n');
    
    // Ask for confirmation
    const confirmed = await askConfirmation('Type "yes" to continue: ');
    
    if (!confirmed) {
      console.log('❌ Operation cancelled by user');
      process.exit(0);
    }
    
    console.log('\n🔄 Connecting to MySQL server...');
    
    connection = await mysql.createConnection({
      host: DB_HOST,
      user: DB_USER,
      password: DB_PASSWORD,
      database: DB_NAME,
      multipleStatements: true
    });
    
    console.log('✅ Connected to database');
    
    // Disable foreign key checks
    console.log('\n🔄 Disabling foreign key checks...');
    await connection.query('SET FOREIGN_KEY_CHECKS = 0');
    console.log('✅ Foreign key checks disabled');
    
    // Get all tables
    console.log('\n🔄 Fetching all tables...');
    const [tables] = await connection.query(
      `SELECT TABLE_NAME 
       FROM INFORMATION_SCHEMA.TABLES 
       WHERE TABLE_SCHEMA = ? 
       AND TABLE_TYPE = 'BASE TABLE'`,
      [DB_NAME]
    );
    
    if (tables.length === 0) {
      console.log('✅ No tables found (database is already clean)');
    } else {
      console.log(`📋 Found ${tables.length} tables to drop:\n`);
      
      // Drop each table
      for (const table of tables) {
        const tableName = table.TABLE_NAME;
        console.log(`  🗑️  Dropping table: ${tableName}`);
        await connection.query(`DROP TABLE IF EXISTS \`${tableName}\``);
      }
      
      console.log(`\n✅ Successfully dropped ${tables.length} tables`);
    }
    
    // Re-enable foreign key checks
    console.log('\n🔄 Re-enabling foreign key checks...');
    await connection.query('SET FOREIGN_KEY_CHECKS = 1');
    console.log('✅ Foreign key checks re-enabled');
    
    console.log('\n' + '='.repeat(70));
    console.log('✅ Database cleaned successfully!');
    console.log('='.repeat(70));
    console.log('\n💡 Next steps:');
    console.log('   1. Run "npm run db:init" to create schema');
    console.log('   2. Run "npm run db:migrate" to apply migrations (if any)');
    console.log('   3. Database will be ready to use\n');
    
  } catch (error) {
    console.error('\n❌ Database clean failed:', error.message);
    console.error('Error details:', error);
    process.exit(1);
  } finally {
    if (connection) {
      await connection.end();
      console.log('🔌 Database connection closed\n');
    }
  }
}

// Run clean
cleanDatabase();
