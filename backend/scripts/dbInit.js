/**
 * Database Initialization Script
 * Creates all tables and initial data from schema.sql and seed.sql
 * Last Updated: 2026-06-24
 */

const mysql = require('mysql2/promise');
const fs = require('fs').promises;
const path = require('path');
require('dotenv').config();

const DB_HOST = process.env.DB_HOST;
const DB_USER = process.env.DB_USER;
const DB_PASSWORD = process.env.DB_PASSWORD || '';
const DB_NAME = process.env.DB_NAME;

async function initDatabase() {
  let connection;
  
  try {
    console.log('\n' + '='.repeat(70));
    console.log('🚀 DATABASE INITIALIZATION');
    console.log('='.repeat(70));
    console.log(`Database: ${DB_NAME}`);
    console.log(`Host: ${DB_HOST}`);
    console.log('='.repeat(70) + '\n');
    
    console.log('🔄 Connecting to MySQL server...');
    
    // First connect without database to create it if needed
    connection = await mysql.createConnection({
      host: DB_HOST,
      user: DB_USER,
      password: DB_PASSWORD,
      multipleStatements: true
    });
    
    console.log('✅ Connected to MySQL server');
    
    // Create database if it doesn't exist
    console.log(`\n🔄 Creating database '${DB_NAME}' if it doesn't exist...`);
    await connection.query(`CREATE DATABASE IF NOT EXISTS \`${DB_NAME}\``);
    await connection.query(`USE \`${DB_NAME}\``);
    console.log(`✅ Database '${DB_NAME}' ready`);
    
    // Check if database already has tables
    const [existingTables] = await connection.query(
      `SELECT COUNT(*) as count FROM INFORMATION_SCHEMA.TABLES 
       WHERE TABLE_SCHEMA = ? AND TABLE_TYPE = 'BASE TABLE'`,
      [DB_NAME]
    );
    
    const tableCount = existingTables[0].count;
    
    if (tableCount > 0) {
      console.log(`\n⚠️  Database already contains ${tableCount} tables`);
      console.log('💡 If you want to reset the database, run: npm run db:reset');
      console.log('💡 To apply new migrations only, run: npm run db:migrate\n');
    }
    
    // Run schema.sql
    const schemaPath = path.join(__dirname, '../../database/schema.sql');
    console.log('🔄 Running schema.sql...');
    
    try {
      const schema = await fs.readFile(schemaPath, 'utf8');
      
      // Split statements by semicolon and execute one by one to handle errors gracefully
      const statements = schema
        .split(';')
        .map(s => s.trim())
        .filter(s => s.length > 0 && !s.startsWith('--'));
      
      let created = 0;
      let skipped = 0;
      
      for (const statement of statements) {
        try {
          await connection.query(statement);
          if (statement.toUpperCase().includes('CREATE TABLE')) {
            created++;
          }
        } catch (err) {
          // Ignore "already exists" errors
          if (err.code === 'ER_TABLE_EXISTS_ERROR' || err.errno === 1050) {
            skipped++;
          } else if (err.code === 'ER_DUP_KEYNAME' || err.errno === 1061) {
            // Ignore "duplicate key name" errors for indexes
            skipped++;
          } else {
            // Log other errors but continue
            console.log(`⚠️  Warning: ${err.message}`);
          }
        }
      }
      
      console.log(`✅ Schema applied: ${created} tables created, ${skipped} already existed`);
    } catch (err) {
      console.error('❌ Error running schema.sql:', err.message);
      throw err;
    }
    
    // Run seed.sql (if exists)
    const seedPath = path.join(__dirname, '../../database/seed.sql');
    console.log('\n🔄 Running seed.sql...');
    
    try {
      const seed = await fs.readFile(seedPath, 'utf8');
      await connection.query(seed);
      console.log('✅ Seed data inserted successfully');
    } catch (err) {
      if (err.code === 'ENOENT') {
        console.log('⚠️  No seed.sql file found, skipping seed data');
      } else if (err.code === 'ER_DUP_ENTRY') {
        console.log('✅ Seed data already exists (skipping duplicates)');
      } else {
        console.error('⚠️  Error running seed.sql:', err.message);
        console.log('💡 You may need to run db:clean first if seed data conflicts exist');
      }
    }
    
    // Display table summary
    const [tables] = await connection.query(
      `SELECT TABLE_NAME, TABLE_ROWS 
       FROM INFORMATION_SCHEMA.TABLES 
       WHERE TABLE_SCHEMA = ? 
       AND TABLE_TYPE = 'BASE TABLE' 
       ORDER BY TABLE_NAME`,
      [DB_NAME]
    );
    
    console.log('\n' + '='.repeat(70));
    console.log('📊 DATABASE SUMMARY');
    console.log('='.repeat(70));
    console.log(`Total Tables: ${tables.length}`);
    console.log('\nKey Tables:');
    
    const keyTables = ['Employees', 'Users', 'Departments', 'leaveRequests', 'AttendanceLogs'];
    keyTables.forEach(tableName => {
      const table = tables.find(t => t.TABLE_NAME === tableName);
      if (table) {
        console.log(`  • ${tableName}: ${table.TABLE_ROWS || 0} rows`);
      }
    });
    
    console.log('\n' + '='.repeat(70));
    console.log('✅ Database initialization completed successfully!');
    console.log('='.repeat(70));
    console.log('\n💡 Next steps:');
    console.log('   • Run "npm run db:migrate" to apply any pending migrations');
    console.log('   • Run "npm start" to start the application');
    console.log('   • Default admin credentials: username=admin, password=admin123\n');
    
  } catch (error) {
    console.error('\n❌ Database initialization failed:', error.message);
    console.error('Error details:', error);
    process.exit(1);
  } finally {
    if (connection) {
      await connection.end();
      console.log('🔌 Database connection closed\n');
    }
  }
}

// Run initialization
initDatabase();
