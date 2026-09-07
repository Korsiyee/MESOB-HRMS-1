/**
 * Database Setup Wizard
 * Interactive script for first-time database setup
 */

const mysql = require('mysql2/promise');
const readline = require('readline');
const { execSync } = require('child_process');
require('dotenv').config();

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

function question(query) {
  return new Promise(resolve => rl.question(query, resolve));
}

async function checkMySQLConnection() {
  try {
    const connection = await mysql.createConnection({
      host: process.env.DB_HOST,
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD
    });
    await connection.end();
    return true;
  } catch (error) {
    return false;
  }
}

async function checkDatabaseExists() {
  try {
    const connection = await mysql.createConnection({
      host: process.env.DB_HOST,
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      database: process.env.DB_NAME
    });
    await connection.end();
    return true;
  } catch (error) {
    return false;
  }
}

async function getTableCount() {
  try {
    const connection = await mysql.createConnection({
      host: process.env.DB_HOST,
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      database: process.env.DB_NAME
    });
    
    const [result] = await connection.query(
      `SELECT COUNT(*) as count FROM INFORMATION_SCHEMA.TABLES 
       WHERE TABLE_SCHEMA = ?`,
      [process.env.DB_NAME]
    );
    
    await connection.end();
    return result[0].count;
  } catch (error) {
    return 0;
  }
}

function runCommand(command) {
  console.log(`\n🔄 Running: ${command}\n`);
  try {
    execSync(command, { stdio: 'inherit' });
    return true;
  } catch (error) {
    console.error(`\n❌ Command failed: ${error.message}\n`);
    return false;
  }
}

async function main() {
  console.log('\n' + '='.repeat(70));
  console.log('🚀 HRMS LEAVE SERVICE - DATABASE SETUP WIZARD');
  console.log('='.repeat(70) + '\n');
  
  // Check environment configuration
  console.log('📋 Checking environment configuration...\n');
  
  const config = {
    DB_HOST: process.env.DB_HOST,
    DB_USER: process.env.DB_USER,
    DB_PASSWORD: process.env.DB_PASSWORD ? '***' : '(empty)',
    DB_NAME: process.env.DB_NAME
  };
  
  console.log('Current configuration:');
  Object.entries(config).forEach(([key, value]) => {
    console.log(`  ${key}: ${value}`);
  });
  console.log('');
  
  if (!process.env.DB_HOST || !process.env.DB_USER || !process.env.DB_NAME) {
    console.log('❌ Missing required environment variables!');
    console.log('\n💡 Please create a .env file with:');
    console.log('   DB_HOST=localhost');
    console.log('   DB_USER=root');
    console.log('   DB_PASSWORD=your_password');
    console.log('   DB_NAME=hrms_leave_db\n');
    rl.close();
    process.exit(1);
  }
  
  // Check MySQL connection
  console.log('🔄 Testing MySQL connection...\n');
  const canConnect = await checkMySQLConnection();
  
  if (!canConnect) {
    console.log('❌ Cannot connect to MySQL server!');
    console.log('\n💡 Please check:');
    console.log('   1. MySQL is running');
    console.log('   2. Host, username, and password are correct');
    console.log('   3. User has necessary permissions\n');
    rl.close();
    process.exit(1);
  }
  
  console.log('✅ MySQL connection successful!\n');
  
  // Check database status
  console.log('🔄 Checking database status...\n');
  const dbExists = await checkDatabaseExists();
  
  if (dbExists) {
    const tableCount = await getTableCount();
    console.log(`✅ Database '${process.env.DB_NAME}' exists with ${tableCount} tables\n`);
    
    if (tableCount > 0) {
      console.log('⚠️  Database already contains tables!\n');
      console.log('Options:');
      console.log('  1. Keep existing database and run migrations only');
      console.log('  2. Reset database (⚠️  WARNING: Deletes all data!)');
      console.log('  3. Exit without changes\n');
      
      const choice = await question('Enter your choice (1-3): ');
      console.log('');
      
      switch (choice.trim()) {
        case '1':
          console.log('📋 Running migrations on existing database...');
          if (runCommand('node scripts/migrate.js')) {
            console.log('\n✅ Migrations completed!');
            console.log('💡 Run "npm run db:verify" to check database health\n');
          }
          break;
          
        case '2':
          console.log('⚠️  You are about to DELETE ALL DATA!');
          const confirm = await question('Type "YES" to confirm: ');
          if (confirm === 'YES') {
            console.log('\n🔄 Resetting database...');
            if (runCommand('node scripts/dbClean.js') && 
                runCommand('node scripts/dbInit.js') &&
                runCommand('node scripts/migrate.js')) {
              console.log('\n✅ Database reset complete!');
              console.log('💡 Default admin credentials: admin / admin123\n');
            }
          } else {
            console.log('\n❌ Reset cancelled\n');
          }
          break;
          
        case '3':
          console.log('👋 Exiting without changes\n');
          break;
          
        default:
          console.log('❌ Invalid choice\n');
      }
    } else {
      console.log('🔄 Database is empty. Initializing...');
      if (runCommand('node scripts/dbInit.js') &&
          runCommand('node scripts/migrate.js')) {
        console.log('\n✅ Database initialized successfully!');
        console.log('\n📊 Running verification...');
        runCommand('node scripts/dbVerify.js');
        console.log('\n💡 Default admin credentials: admin / admin123');
        console.log('💡 Start the application with: npm start\n');
      }
    }
  } else {
    console.log(`⚠️  Database '${process.env.DB_NAME}' does not exist\n`);
    console.log('🔄 Creating and initializing database...\n');
    
    if (runCommand('node scripts/dbInit.js') &&
        runCommand('node scripts/migrate.js')) {
      console.log('\n✅ Database created and initialized successfully!');
      console.log('\n📊 Running verification...');
      runCommand('node scripts/dbVerify.js');
      console.log('\n💡 Default admin credentials: admin / admin123');
      console.log('💡 Start the application with: npm start\n');
    }
  }
  
  console.log('='.repeat(70));
  console.log('🎉 Setup wizard complete!');
  console.log('='.repeat(70) + '\n');
  
  rl.close();
}

// Run wizard
main().catch(error => {
  console.error('\n❌ Wizard failed:', error.message);
  rl.close();
  process.exit(1);
});
