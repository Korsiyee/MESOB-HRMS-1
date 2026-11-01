const fs = require('fs');
const path = require('path');
const { db } = require('../src/config/db');

/**
 * Auto-initialize database for Render deployment
 * Converts MySQL schema/seed to PostgreSQL and executes
 */
async function autoInitDatabase() {
  console.log('🚀 Starting automatic database initialization...');
  
  const promisePool = db.promise();
  
  try {
    // Check if database is already initialized
    const [tables] = await promisePool.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' AND table_name = 'Users'
    `);
    
    if (tables && tables.length > 0) {
      console.log('✅ Database already initialized. Skipping auto-init.');
      return true;
    }
    
    console.log('📋 Database is empty. Starting initialization...');
    
    // Read schema and seed files
    const schemaPath = path.join(__dirname, '../../database/schema.sql');
    const seedPath = path.join(__dirname, '../../database/seed.sql');
    
    if (!fs.existsSync(schemaPath) || !fs.existsSync(seedPath)) {
      console.log('⚠️  Schema/seed files not found. Skipping auto-init.');
      return false;
    }
    
    let schema = fs.readFileSync(schemaPath, 'utf8');
    let seed = fs.readFileSync(seedPath, 'utf8');
    
    // Convert MySQL syntax to PostgreSQL
    schema = convertToPostgreSQL(schema);
    seed = convertToPostgreSQL(seed);
    
    console.log('📝 Creating tables...');
    
    // Execute schema (split by statement)
    const schemaStatements = splitSQLStatements(schema);
    for (const statement of schemaStatements) {
      if (statement.trim()) {
        try {
          await promisePool.query(statement);
        } catch (err) {
          console.error('Schema error:', err.message);
        }
      }
    }
    
    console.log('📝 Inserting seed data...');
    
    // Execute seed data
    const seedStatements = splitSQLStatements(seed);
    for (const statement of seedStatements) {
      if (statement.trim()) {
        try {
          await promisePool.query(statement);
        } catch (err) {
          console.error('Seed error:', err.message);
        }
      }
    }
    
    console.log('✅ Database initialization completed successfully!');
    console.log('👤 Default admin user: abebe.tadesse / mesob2024');
    
    return true;
  } catch (error) {
    console.error('❌ Database initialization failed:', error);
    return false;
  }
}

/**
 * Convert MySQL SQL to PostgreSQL compatible SQL
 */
function convertToPostgreSQL(sql) {
  let converted = sql;
  
  // Remove MySQL-specific commands
  converted = converted.replace(/SET.*?;/gi, '');
  converted = converted.replace(/DROP TABLE IF EXISTS/gi, 'DROP TABLE IF EXISTS');
  
  // Convert AUTO_INCREMENT to SERIAL
  converted = converted.replace(/INT AUTO_INCREMENT/gi, 'SERIAL');
  converted = converted.replace(/BIGINT AUTO_INCREMENT/gi, 'BIGSERIAL');
  
  // Convert DATETIME to TIMESTAMP
  converted = converted.replace(/DATETIME/gi, 'TIMESTAMP');
  
  // Convert TINYINT(1) to BOOLEAN
  converted = converted.replace(/TINYINT\(1\)/gi, 'BOOLEAN');
  
  // Convert TEXT types
  converted = converted.replace(/LONGTEXT/gi, 'TEXT');
  converted = converted.replace(/MEDIUMTEXT/gi, 'TEXT');
  
  // Remove COLLATE clauses
  converted = converted.replace(/COLLATE [a-z0-9_]+/gi, '');
  
  // Remove ENGINE and CHARSET
  converted = converted.replace(/ENGINE=\w+/gi, '');
  converted = converted.replace(/DEFAULT CHARSET=\w+/gi, '');
  converted = converted.replace(/COLLATE=\w+/gi, '');
  
  // Remove backticks (MySQL quotes)
  converted = converted.replace(/`/g, '"');
  
  // Convert UUID() function to gen_random_uuid()
  // But first, we need to enable the extension
  converted = 'CREATE EXTENSION IF NOT EXISTS "pgcrypto";\n\n' + converted;
  converted = converted.replace(/UUID\(\)/gi, 'gen_random_uuid()');
  
  // Convert NOW() with specific format to CURRENT_TIMESTAMP
  converted = converted.replace(/NOW\(\)/gi, 'CURRENT_TIMESTAMP');
  
  // Convert UNSIGNED to nothing (PostgreSQL doesn't have UNSIGNED)
  converted = converted.replace(/UNSIGNED/gi, '');
  
  // Fix UNIQUE KEY syntax
  converted = converted.replace(/UNIQUE KEY "([^"]+)" \("([^"]+)"\)/gi, 'CONSTRAINT "$1" UNIQUE ("$2")');
  converted = converted.replace(/UNIQUE KEY ([a-z0-9_]+) \(([^)]+)\)/gi, 'CONSTRAINT $1 UNIQUE ($2)');
  
  // Fix FOREIGN KEY syntax
  converted = converted.replace(/FOREIGN KEY \("([^"]+)"\) REFERENCES "([^"]+)" \("([^"]+)"\)/gi, 
    'CONSTRAINT fk_$1 FOREIGN KEY ("$1") REFERENCES "$2" ("$3")');
  
  // Convert DEFAULT 0/1 for booleans
  converted = converted.replace(/DEFAULT 1/gi, 'DEFAULT TRUE');
  converted = converted.replace(/DEFAULT 0/gi, 'DEFAULT FALSE');
  
  return converted;
}

/**
 * Split SQL file into individual statements
 */
function splitSQLStatements(sql) {
  // Remove comments
  sql = sql.replace(/--.*$/gm, '');
  sql = sql.replace(/\/\*[\s\S]*?\*\//g, '');
  
  // Split by semicolon, but not inside quotes
  const statements = [];
  let current = '';
  let inString = false;
  let stringChar = '';
  
  for (let i = 0; i < sql.length; i++) {
    const char = sql[i];
    
    if ((char === "'" || char === '"') && (i === 0 || sql[i-1] !== '\\')) {
      if (!inString) {
        inString = true;
        stringChar = char;
      } else if (char === stringChar) {
        inString = false;
      }
    }
    
    if (char === ';' && !inString) {
      if (current.trim()) {
        statements.push(current.trim());
      }
      current = '';
    } else {
      current += char;
    }
  }
  
  if (current.trim()) {
    statements.push(current.trim());
  }
  
  return statements;
}

module.exports = { autoInitDatabase };
