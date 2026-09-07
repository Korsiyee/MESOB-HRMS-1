/**
 * Database Migration Script
 * Runs all SQL migration files in database/migrations/ directory
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

async function runMigrations() {
  let connection;
  
  try {
    console.log('\n' + '='.repeat(70));
    console.log('🔄 DATABASE MIGRATIONS');
    console.log('='.repeat(70));
    console.log(`Database: ${DB_NAME}`);
    console.log(`Host: ${DB_HOST}`);
    console.log('='.repeat(70) + '\n');
    
    console.log('🔄 Connecting to database...');
    connection = await mysql.createConnection({
      host: DB_HOST,
      user: DB_USER,
      password: DB_PASSWORD,
      database: DB_NAME,
      multipleStatements: true
    });
    
    console.log('✅ Connected to database');
    
    // Create migrations tracking table if it doesn't exist
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS _migrations (
        id INT AUTO_INCREMENT PRIMARY KEY,
        filename VARCHAR(255) NOT NULL UNIQUE,
        executed_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_migrations_filename (filename),
        INDEX idx_migrations_executed_at (executed_at)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
    `);
    console.log('✅ Migrations tracking table ready');
    
    // Get list of already executed migrations
    const [executedMigrations] = await connection.execute(
      'SELECT filename, executed_at FROM _migrations ORDER BY executed_at'
    );
    const executedSet = new Set(executedMigrations.map(m => m.filename));
    
    if (executedMigrations.length > 0) {
      console.log(`\n📋 Previously executed migrations: ${executedMigrations.length}`);
    }
    
    // Read all migration files from database/migrations directory
    const migrationsDir = path.join(__dirname, '../../database/migrations');
    let files;
    
    try {
      files = await fs.readdir(migrationsDir);
    } catch (err) {
      console.log('\n⚠️  No migrations directory found at:', migrationsDir);
      console.log('💡 Create the directory and add .sql migration files');
      console.log('✅ No migrations to run\n');
      return;
    }
    
    // Filter for SQL files and sort them
    const sqlFiles = files
      .filter(f => f.endsWith('.sql'))
      .sort();
    
    if (sqlFiles.length === 0) {
      console.log('\n✅ No migration files found in migrations directory\n');
      return;
    }
    
    console.log(`\n📋 Found ${sqlFiles.length} migration file(s) in directory`);
    
    const pendingMigrations = sqlFiles.filter(f => !executedSet.has(f));
    
    if (pendingMigrations.length === 0) {
      console.log('\n✅ All migrations have been executed. Database is up to date!\n');
      return;
    }
    
    console.log(`\n🔄 Pending migrations: ${pendingMigrations.length}\n`);
    
    let executed = 0;
    let failed = 0;
    
    for (const file of sqlFiles) {
      if (executedSet.has(file)) {
        continue; // Skip already executed
      }
      
      console.log(`🔄 Running migration: ${file}`);
      
      const filePath = path.join(migrationsDir, file);
      const sql = await fs.readFile(filePath, 'utf8');
      
      try {
        // Split and execute statements to better handle errors
        const statements = sql
          .split(';')
          .map(s => s.trim())
          .filter(s => s.length > 0 && !s.startsWith('--'));
        
        for (const statement of statements) {
          try {
            await connection.query(statement);
          } catch (stmtErr) {
            // Log but don't fail on certain expected errors
            if (stmtErr.code === 'ER_DUP_KEYNAME' || 
                stmtErr.code === 'ER_DUP_FIELDNAME' ||
                stmtErr.code === 'ER_CANT_DROP_FIELD_OR_KEY') {
              console.log(`  ⚠️  Warning: ${stmtErr.message}`);
            } else {
              throw stmtErr;
            }
          }
        }
        
        // Record the migration as executed
        await connection.execute(
          'INSERT INTO _migrations (filename) VALUES (?)',
          [file]
        );
        
        console.log(`✅ Completed: ${file}\n`);
        executed++;
      } catch (err) {
        console.error(`❌ Error executing ${file}:`);
        console.error(`   ${err.message}\n`);
        failed++;
        
        // Ask if we should continue
        if (pendingMigrations.indexOf(file) < pendingMigrations.length - 1) {
          console.log('⚠️  Migration failed. Stopping to prevent cascade errors.');
          throw err;
        }
      }
    }
    
    console.log('='.repeat(70));
    console.log('📊 MIGRATION SUMMARY');
    console.log('='.repeat(70));
    console.log(`Executed: ${executed}`);
    console.log(`Failed: ${failed}`);
    console.log(`Previously executed: ${executedMigrations.length}`);
    console.log(`Total migrations: ${sqlFiles.length}`);
    console.log('='.repeat(70));
    
    if (failed > 0) {
      console.log('\n⚠️  Some migrations failed. Please review the errors above.');
      console.log('💡 Fix the migration files and run again.\n');
      process.exit(1);
    } else if (executed > 0) {
      console.log('\n✅ All migrations completed successfully!\n');
    }
    
  } catch (error) {
    console.error('\n❌ Migration process failed:', error.message);
    console.error('Error details:', error);
    process.exit(1);
  } finally {
    if (connection) {
      await connection.end();
      console.log('🔌 Database connection closed\n');
    }
  }
}

// Run migrations
runMigrations();
