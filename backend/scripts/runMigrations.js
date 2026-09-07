/**
 * Migration Runner Script
 * 
 * Executes all pending database migrations in order.
 * Usage: node scripts/runMigrations.js
 */

const fs = require('fs');
const path = require('path');
const db = require('../src/config/db');

const MIGRATIONS_DIR = path.join(__dirname, '../../database/migrations');

async function runMigrations() {
  console.log('═══════════════════════════════════════════════════════════');
  console.log('RBAC Migration Runner');
  console.log('═══════════════════════════════════════════════════════════\n');
  
  try {
    // Get all migration files
    const files = fs.readdirSync(MIGRATIONS_DIR)
      .filter(f => f.endsWith('.sql'))
      .filter(f => /^00[3-9]_/.test(f)) // RBAC migrations 003-009
      .sort();
    
    if (files.length === 0) {
      console.log('✅ No RBAC migrations to run.\n');
      process.exit(0);
    }
    
    console.log(`Found ${files.length} RBAC migration(s):\n`);
    files.forEach((f, i) => console.log(`  ${i + 1}. ${f}`));
    console.log('');
    
    // Execute each migration
    for (const file of files) {
      console.log(`⏳ Running migration: ${file}`);
      
      const filePath = path.join(MIGRATIONS_DIR, file);
      const sql = fs.readFileSync(filePath, 'utf8');
      
      // Split by semicolon and execute each statement
      const statements = sql
        .split(';')
        .map(s => s.trim())
        .filter(s => s.length > 0 && !s.startsWith('--'));
      
      for (const statement of statements) {
        await db.promise().query(statement);
      }
      
      console.log(`✅ Completed: ${file}\n`);
    }
    
    console.log('═══════════════════════════════════════════════════════════');
    console.log('✅ All RBAC migrations completed successfully!');
    console.log('═══════════════════════════════════════════════════════════\n');
    
    process.exit(0);
  } catch (error) {
    console.error('\n❌ Migration failed:');
    console.error(error);
    process.exit(1);
  }
}

// Run migrations
runMigrations();
