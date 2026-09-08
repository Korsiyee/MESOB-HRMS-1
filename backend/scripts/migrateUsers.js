/**
 * Migration: add columns missing from Users table that the application code requires
 *  - permissions_version INT NOT NULL DEFAULT 1
 *  - last_activity DATETIME NULL
 */

const mysql = require('mysql2/promise');
require('dotenv').config();

(async () => {
  const mc = await mysql.createConnection({
    host:     process.env.DB_HOST,
    user:     process.env.DB_USER,
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME,
  });

  const [cols] = await mc.query('DESCRIBE Users');
  const colNames = new Set(cols.map(c => c.Field));
  console.log('Current Users columns:', [...colNames].join(', '));

  if (!colNames.has('permissions_version')) {
    await mc.query(
      'ALTER TABLE Users ADD COLUMN permissions_version INT NOT NULL DEFAULT 1 AFTER token_version'
    );
    await mc.query(
      'CREATE INDEX idx_users_permissions_version ON Users (permissions_version)'
    ).catch(() => {}); // ignore if index already exists
    console.log('✓ Added: permissions_version');
  } else {
    console.log('· Already present: permissions_version');
  }

  if (!colNames.has('last_activity')) {
    await mc.query(
      'ALTER TABLE Users ADD COLUMN last_activity DATETIME NULL AFTER last_login'
    );
    console.log('✓ Added: last_activity');
  } else {
    console.log('· Already present: last_activity');
  }

  // refresh_token needs to be TEXT (not VARCHAR(512)) because JWT refresh tokens
  // now embed occupations + scopes making them exceed 512 bytes
  const [rtCol] = await mc.query(
    `SELECT DATA_TYPE FROM INFORMATION_SCHEMA.COLUMNS
     WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'Users' AND COLUMN_NAME = 'refresh_token'`
  );
  if (rtCol[0] && rtCol[0].DATA_TYPE === 'varchar') {
    await mc.query('ALTER TABLE Users MODIFY COLUMN refresh_token TEXT NULL');
    console.log('✓ Expanded: refresh_token VARCHAR(512) → TEXT');
  } else {
    console.log('· Already TEXT: refresh_token');
  }

  const [final] = await mc.query('DESCRIBE Users');
  console.log('\nFinal Users columns:');
  final.forEach(c => console.log(' ', c.Field, '-', c.Type, c.Null === 'NO' ? 'NOT NULL' : 'NULL'));

  await mc.end();
  console.log('\nMigration complete.');
})().catch(e => {
  console.error('Migration failed:', e.message);
  process.exit(1);
});
