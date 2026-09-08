/**
 * Migration: RBAC / Permission System Tables
 *
 * Creates tables required by permissionService.js that are absent from schema.sql:
 *   - RoleOccupations          role → occupation mappings (default permissions per role)
 *   - OccupationDelegations    time-bounded permission delegations between users
 *   - UserPermissionOverrides  per-user ALLOW/DENY overrides
 *   - UserScopes               data-access scopes per user
 *
 * Also adds missing column:
 *   - EmployeeOccupations.expires_at  DATETIME NULL (expiry for direct assignments)
 */

const mysql = require('mysql2/promise');
require('dotenv').config();

(async () => {
  const mc = await mysql.createConnection({
    host:               process.env.DB_HOST,
    user:               process.env.DB_USER,
    password:           process.env.DB_PASSWORD || '',
    database:           process.env.DB_NAME,
    multipleStatements: true,
  });

  console.log('Running RBAC migration...\n');

  // ── Helper ───────────────────────────────────────────────────────────────
  async function tableExists(name) {
    const [[row]] = await mc.query(
      `SELECT COUNT(*) AS n FROM INFORMATION_SCHEMA.TABLES
       WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ?`,
      [name]
    );
    return row.n > 0;
  }

  async function columnExists(table, column) {
    const [[row]] = await mc.query(
      `SELECT COUNT(*) AS n FROM INFORMATION_SCHEMA.COLUMNS
       WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ? AND COLUMN_NAME = ?`,
      [table, column]
    );
    return row.n > 0;
  }

  // ── 1. RoleOccupations ──────────────────────────────────────────────────
  if (!(await tableExists('RoleOccupations'))) {
    await mc.query(`
      CREATE TABLE RoleOccupations (
        uuid          VARCHAR(36) PRIMARY KEY,
        role          ENUM('EMPLOYEE','DEPARTMENT_HEAD','HR_OFFICER','HR_ADMIN','SUPER_ADMIN') NOT NULL,
        occupation_uuid VARCHAR(36) NOT NULL,
        created_at    DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        UNIQUE KEY uq_role_occupation (role, occupation_uuid),
        INDEX idx_role_occupations_role (role),
        FOREIGN KEY (occupation_uuid) REFERENCES Occupations(uuid) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
    `);
    console.log('✓ Created table: RoleOccupations');

    // Seed default role → occupation mappings
    // SUPER_ADMIN is dynamically resolved (all occupations) — no rows needed
    // HR_ADMIN: full access except raw audit
    // HR_OFFICER: employee + leave management
    // DEPARTMENT_HEAD: attendance, leave requests for their dept
    // EMPLOYEE: dashboard + own leave + own account
    const defaults = [
      // HR_ADMIN
      ['HR_ADMIN', 'occ-001'], // Dashboard
      ['HR_ADMIN', 'occ-002'], // Employees - Overview
      ['HR_ADMIN', 'occ-003'], // Employees - Registration
      ['HR_ADMIN', 'occ-004'], // Departments - Overview
      ['HR_ADMIN', 'occ-005'], // Departments - Manage
      ['HR_ADMIN', 'occ-006'], // Positions - Overview
      ['HR_ADMIN', 'occ-007'], // Positions - Manage
      ['HR_ADMIN', 'occ-008'], // Attendance - Overview
      ['HR_ADMIN', 'occ-009'], // Attendance - Manage
      ['HR_ADMIN', 'occ-010'], // Leave - Manage Requests
      ['HR_ADMIN', 'occ-011'], // Leave - My Leave
      ['HR_ADMIN', 'occ-012'], // Shifts - Overview
      ['HR_ADMIN', 'occ-013'], // Shifts - Add
      ['HR_ADMIN', 'occ-014'], // Letters
      ['HR_ADMIN', 'occ-015'], // Accounts
      ['HR_ADMIN', 'occ-016'], // Audit Logs
      ['HR_ADMIN', 'occ-017'], // Leave Policies
      ['HR_ADMIN', 'occ-018'], // Holidays
      ['HR_ADMIN', 'occ-019'], // My Account
      // HR_OFFICER
      ['HR_OFFICER', 'occ-001'], // Dashboard
      ['HR_OFFICER', 'occ-002'], // Employees - Overview
      ['HR_OFFICER', 'occ-008'], // Attendance - Overview
      ['HR_OFFICER', 'occ-010'], // Leave - Manage Requests
      ['HR_OFFICER', 'occ-011'], // Leave - My Leave
      ['HR_OFFICER', 'occ-014'], // Letters
      ['HR_OFFICER', 'occ-019'], // My Account
      // DEPARTMENT_HEAD
      ['DEPARTMENT_HEAD', 'occ-001'], // Dashboard
      ['DEPARTMENT_HEAD', 'occ-002'], // Employees - Overview
      ['DEPARTMENT_HEAD', 'occ-008'], // Attendance - Overview
      ['DEPARTMENT_HEAD', 'occ-010'], // Leave - Manage Requests
      ['DEPARTMENT_HEAD', 'occ-011'], // Leave - My Leave
      ['DEPARTMENT_HEAD', 'occ-019'], // My Account
      // EMPLOYEE
      ['EMPLOYEE', 'occ-001'], // Dashboard
      ['EMPLOYEE', 'occ-011'], // Leave - My Leave
      ['EMPLOYEE', 'occ-019'], // My Account
    ];

    const { v4: uuidv4 } = require('uuid');
    for (const [role, occUuid] of defaults) {
      await mc.query(
        `INSERT IGNORE INTO RoleOccupations (uuid, role, occupation_uuid) VALUES (?, ?, ?)`,
        [uuidv4(), role, occUuid]
      );
    }
    console.log(`  → Seeded ${defaults.length} default role-occupation mappings`);
  } else {
    console.log('· Already exists: RoleOccupations');
  }

  // ── 2. OccupationDelegations ────────────────────────────────────────────
  if (!(await tableExists('OccupationDelegations'))) {
    await mc.query(`
      CREATE TABLE OccupationDelegations (
        uuid                  VARCHAR(36) PRIMARY KEY,
        delegator_user_uuid   VARCHAR(36) NOT NULL,
        delegatee_user_uuid   VARCHAR(36) NOT NULL,
        occupation_uuid       VARCHAR(36) NOT NULL,
        start_date            DATETIME NOT NULL,
        end_date              DATETIME NOT NULL,
        revoked_at            DATETIME NULL,
        revoked_by            VARCHAR(36) NULL,
        reason                TEXT NULL,
        created_at            DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_delegations_delegatee (delegatee_user_uuid),
        INDEX idx_delegations_delegator (delegator_user_uuid),
        INDEX idx_delegations_active    (delegatee_user_uuid, revoked_at, start_date, end_date),
        FOREIGN KEY (delegator_user_uuid) REFERENCES Users(uuid) ON DELETE CASCADE,
        FOREIGN KEY (delegatee_user_uuid) REFERENCES Users(uuid) ON DELETE CASCADE,
        FOREIGN KEY (occupation_uuid)     REFERENCES Occupations(uuid) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
    `);
    console.log('✓ Created table: OccupationDelegations');
  } else {
    console.log('· Already exists: OccupationDelegations');
  }

  // ── 3. UserPermissionOverrides ──────────────────────────────────────────
  if (!(await tableExists('UserPermissionOverrides'))) {
    await mc.query(`
      CREATE TABLE UserPermissionOverrides (
        uuid            VARCHAR(36) PRIMARY KEY,
        user_uuid       VARCHAR(36) NOT NULL,
        occupation_uuid VARCHAR(36) NOT NULL,
        effect          ENUM('ALLOW','DENY') NOT NULL,
        reason          TEXT NULL,
        created_by      VARCHAR(36) NULL,
        created_at      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        UNIQUE KEY uq_user_occupation_override (user_uuid, occupation_uuid),
        INDEX idx_overrides_user (user_uuid),
        FOREIGN KEY (user_uuid)       REFERENCES Users(uuid) ON DELETE CASCADE,
        FOREIGN KEY (occupation_uuid) REFERENCES Occupations(uuid) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
    `);
    console.log('✓ Created table: UserPermissionOverrides');
  } else {
    console.log('· Already exists: UserPermissionOverrides');
  }

  // ── 4. UserScopes ───────────────────────────────────────────────────────
  if (!(await tableExists('UserScopes'))) {
    await mc.query(`
      CREATE TABLE UserScopes (
        uuid         VARCHAR(36) PRIMARY KEY,
        user_uuid    VARCHAR(36) NOT NULL,
        scope_type   VARCHAR(100) NOT NULL,
        scope_value  VARCHAR(255) NOT NULL,
        created_at   DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_user_scopes_user (user_uuid),
        FOREIGN KEY (user_uuid) REFERENCES Users(uuid) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
    `);
    console.log('✓ Created table: UserScopes');
  } else {
    console.log('· Already exists: UserScopes');
  }

  // ── 5. EmployeeOccupations.expires_at ───────────────────────────────────
  if (!(await columnExists('EmployeeOccupations', 'expires_at'))) {
    await mc.query(
      `ALTER TABLE EmployeeOccupations ADD COLUMN expires_at DATETIME NULL AFTER assigned_by`
    );
    console.log('✓ Added column: EmployeeOccupations.expires_at');
  } else {
    console.log('· Already present: EmployeeOccupations.expires_at');
  }

  await mc.end();
  console.log('\nRBAC migration complete.');
})().catch(e => {
  console.error('Migration failed:', e.message);
  process.exit(1);
});
