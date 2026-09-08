/**
 * Migration: Add missing columns to RBAC tables
 *   - RoleOccupations.assigned_at      DATETIME (controller reads this)
 *   - RoleOccupations.assigned_reason  TEXT NULL (controller reads this)
 *   - EmployeeOccupations.assigned_reason TEXT NULL (controller inserts this)
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

  async function columnExists(table, column) {
    const [[row]] = await mc.query(
      `SELECT COUNT(*) AS n FROM INFORMATION_SCHEMA.COLUMNS
       WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ? AND COLUMN_NAME = ?`,
      [table, column]
    );
    return row.n > 0;
  }

  console.log('Running RBAC column migration...\n');

  // RoleOccupations.assigned_at — the table already has created_at but controller
  // selects ro.assigned_at, so add it as an alias-equivalent column
  if (!(await columnExists('RoleOccupations', 'assigned_at'))) {
    await mc.query(
      `ALTER TABLE RoleOccupations ADD COLUMN assigned_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP AFTER occupation_uuid`
    );
    console.log('✓ Added: RoleOccupations.assigned_at');
  } else {
    console.log('· Already present: RoleOccupations.assigned_at');
  }

  // RoleOccupations.assigned_reason
  if (!(await columnExists('RoleOccupations', 'assigned_reason'))) {
    await mc.query(
      `ALTER TABLE RoleOccupations ADD COLUMN assigned_reason TEXT NULL AFTER assigned_at`
    );
    console.log('✓ Added: RoleOccupations.assigned_reason');
  } else {
    console.log('· Already present: RoleOccupations.assigned_reason');
  }

  // EmployeeOccupations.assigned_reason
  if (!(await columnExists('EmployeeOccupations', 'assigned_reason'))) {
    await mc.query(
      `ALTER TABLE EmployeeOccupations ADD COLUMN assigned_reason TEXT NULL AFTER expires_at`
    );
    console.log('✓ Added: EmployeeOccupations.assigned_reason');
  } else {
    console.log('· Already present: EmployeeOccupations.assigned_reason');
  }

  await mc.end();
  console.log('\nColumn migration complete.');
})().catch(e => {
  console.error('Migration failed:', e.message);
  process.exit(1);
});
