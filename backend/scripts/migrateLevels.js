/**
 * Migration: Create Levels module tables
 * Reads and executes database/migrations/006_create_levels.sql
 */

const mysql = require('mysql2/promise');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

(async () => {
  const mc = await mysql.createConnection({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME,
    multipleStatements: true,
  });

  const sqlPath = path.resolve(__dirname, '../../database/migrations/006_create_levels.sql');
  const sql = fs.readFileSync(sqlPath, 'utf8');
  
  // Strip comment lines (lines starting with --)
  const cleanSql = sql.split('\n')
    .filter(line => !line.trim().startsWith('--'))
    .join('\n');
  
  console.log('Executing Level migration from:', sqlPath);
  await mc.query(cleanSql);
  console.log('✓ Migration executed');

  // Verify tables
  const [[lCount]] = await mc.query('SELECT COUNT(*) AS n FROM Levels');
  const [[vCount]] = await mc.query('SELECT COUNT(*) AS n FROM LevelVersions');
  const [[aCount]] = await mc.query('SELECT COUNT(*) AS n FROM LevelAllowances');
  const [[hCount]] = await mc.query('SELECT COUNT(*) AS n FROM EmployeeLevelHistory');
  
  console.log('\nTable row counts:');
  console.log(' Levels:', lCount.n);
  console.log(' LevelVersions:', vCount.n);
  console.log(' LevelAllowances:', aCount.n);
  console.log(' EmployeeLevelHistory:', hCount.n);

  // Check Employees.level_uuid column
  const [[col]] = await mc.query(
    `SELECT COUNT(*) AS n FROM INFORMATION_SCHEMA.COLUMNS
     WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'Employees' AND COLUMN_NAME = 'level_uuid'`
  );
  console.log(' Employees.level_uuid:', col.n > 0 ? 'EXISTS' : 'MISSING');

  await mc.end();
  console.log('\n✓ Level migration complete');
})().catch(e => {
  console.error('Migration failed:', e.message);
  process.exit(1);
});
