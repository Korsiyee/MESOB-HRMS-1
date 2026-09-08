# Database Migration Guide

This document explains all database migrations required to set up the Mesob HRMS system from scratch.

## Quick Setup (Recommended)

For a fresh installation, run all migrations in order:

```bash
npm run db:init              # Create base schema + seed data
npm run db:migrate:all       # Run all additional migrations
```

Or manually step by step:

```bash
npm run db:init              # Step 1: Base schema (28 tables) + seed data
npm run db:migrate:users     # Step 2: Add Users table columns
npm run db:migrate:rbac      # Step 3: Add RBAC permission tables
npm run db:migrate:levels    # Step 4: Add Levels module tables
npm run db:migrate:attendance # Step 5: Add Attendance enhancements
```

## What Each Migration Does

### 1. Base Schema (`npm run db:init`)

**Script:** `scripts/dbInit.js`  
**Source:** `database/schema.sql` + `database/seed.sql`  
**Creates:** 28 tables (Employees, Users, Departments, Positions, Occupations, etc.)  
**Seeds:** 25 employees, 8 users, 38 departments, 138 positions, 6 leave policies, 18 holidays

**Default Admin Credentials:**
- Username: `admin`
- Password: `admin123`
- Role: `SUPER_ADMIN`

---

### 2. Users Table Extensions (`npm run db:migrate:users`)

**Script:** `scripts/migrateUsers.js`  
**What it adds:**

| Column | Type | Purpose |
|---|---|---|
| `permissions_version` | INT NOT NULL DEFAULT 1 | Tracks permission changes for JWT invalidation |
| `last_activity` | DATETIME NULL | Tracks user activity for session timeout |
| `refresh_token` | TEXT NULL (expanded from VARCHAR(512)) | Stores JWT refresh tokens with embedded occupations/scopes |

**Why needed:** The auth service uses fine-grained permission tracking and embeds occupation lists in JWTs, making refresh tokens larger than 512 bytes.

---

### 3. RBAC Permission System (`npm run db:migrate:rbac`)

**Scripts:** `scripts/migrateRBAC.js` + `scripts/migrateRBACColumns.js`  
**What it adds:**

#### New Tables

| Table | Purpose |
|---|---|
| `RoleOccupations` | Maps roles (SUPER_ADMIN, HR_ADMIN, etc.) to default occupations |
| `OccupationDelegations` | Temporary time-bounded permission delegations between users |
| `UserPermissionOverrides` | Per-user ALLOW/DENY permission overrides |
| `UserScopes` | Data access scopes per user (department-level, etc.) |

#### New Columns

| Table | Column | Type | Purpose |
|---|---|---|---|
| `EmployeeOccupations` | `expires_at` | DATETIME NULL | Expiry for temporary direct assignments |
| `EmployeeOccupations` | `assigned_reason` | TEXT NULL | Reason for assignment (audit trail) |
| `RoleOccupations` | `assigned_at` | DATETIME | When the role-occupation mapping was created |
| `RoleOccupations` | `assigned_reason` | TEXT NULL | Reason for mapping |

#### Default Seeded Data

- **35 role-occupation mappings** defining default permissions for SUPER_ADMIN, HR_ADMIN, HR_OFFICER, DEPARTMENT_HEAD, EMPLOYEE

**Permission Resolution Formula:**
```
EffectiveOccupations = 
  (RoleOccupations ∪ DirectOccupations ∪ ActiveDelegations ∪ ALLOWOverrides) 
  − (ExpiredOccupations ∪ DENYOverrides)
```

---

### 4. Levels Module (`npm run db:migrate:levels`)

**Script:** `scripts/migrateLevels.js`  
**Source:** `database/migrations/006_create_levels.sql`  
**What it adds:**

| Table | Purpose |
|---|---|
| `Levels` | Master organizational levels (Level 1-12) |
| `LevelVersions` | Versioned salary information per level (supports salary history) |
| `LevelAllowances` | Allowances per level version (transport, housing, etc.) |
| `EmployeeLevelHistory` | Historical record of employee level changes |

Also adds `Employees.level_uuid VARCHAR(36)` column linking employees to their assigned level.

**Seeded Data:**
- 12 organizational levels (Level 1 through Level 12)
- 12 initial level versions with placeholder salaries (Level * 5000.00)

---

### 5. Attendance Enhancements (`npm run db:migrate:attendance`)

**Script:** `scripts/migrateAttendanceEnhancements.js`  
**What it adds:**

#### AttendanceLogs columns

| Column | Type | Purpose |
|---|---|---|
| `state` | ENUM('PENDING','CHECKED_IN','CHECKED_OUT','CALCULATED') | Tracks attendance lifecycle state |

#### AttendanceSummary columns

| Column | Type | Purpose |
|---|---|---|
| `worked_hours` | DECIMAL(5,2) NULL | Total hours worked (check_out - check_in - break) |
| `overtime_hours` | DECIMAL(5,2) NULL | Hours worked beyond shift duration |
| `missing_hours` | DECIMAL(5,2) NULL | Hours missing from expected shift (undertime) |
| `late_minutes` | INT NULL | Minutes late compared to shift start time |
| `break_duration_minutes` | INT NULL | Break duration snapshot at calculation time |

#### ShiftDefinitions columns

| Column | Type | Purpose |
|---|---|---|
| `grace_period_minutes` | INT NOT NULL DEFAULT 15 | Grace period before marking employee as late |
| `break_duration_minutes` | INT NOT NULL DEFAULT 0 | Break duration to deduct from worked hours |

**Why needed:** The attendance analytics and reporting services calculate and track worked hours, overtime, undertime, and lateness based on actual check-in/check-out times vs shift definitions.

---

## Troubleshooting

### Error: "Unknown column 'Users.permissions_version'"
**Cause:** The migration wasn't run, or the server has a cached connection from before migration.  
**Fix:** 
1. Run `npm run db:migrate:users`
2. Restart the server (if using `nodemon`, type `rs` or Ctrl+C and restart)

### Error: "Table 'mesob_hrms.Levels' doesn't exist"
**Cause:** Levels migration wasn't run.  
**Fix:**
1. Run `npm run db:migrate:levels`
2. Restart the server

### Error: "Table 'mesob_hrms.RoleOccupations' doesn't exist"
**Cause:** RBAC migration wasn't run.  
**Fix:**
1. Run `npm run db:migrate:rbac`
2. Restart the server

### All Users Have Wrong Password
**Cause:** The seed file has a bcrypt hash that doesn't match `admin123`.  
**Fix:** Run this once to reset all user passwords:

```bash
node -e "
const bcrypt = require('bcryptjs');
const mysql = require('mysql2/promise');
require('dotenv').config();
(async () => {
  const hash = await bcrypt.hash('admin123', 10);
  const mc = await mysql.createConnection({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME,
  });
  await mc.query('UPDATE Users SET password_hash = ?', [hash]);
  console.log('All user passwords reset to: admin123');
  await mc.end();
})();
"
```

---

## Complete Database Structure

After all migrations, your database will have **36 tables**:

### Core Employee Management (18 tables)
- Employees, MesobIdSequence, EmployeeAddresses, EmployeeIDDocuments
- EmployeeRegistrationDrafts, EmployeeFaceImages, EmployeeOccupations
- Departments, Positions, Occupations
- Users
- Levels, LevelVersions, LevelAllowances, EmployeeLevelHistory

### Leave Management (6 tables)
- leavePolicies, Holidays, employeeLeaveBalances
- leaveRequests, leaveRequestDocuments, leavePostponements

### Attendance (5 tables)
- ShiftDefinitions, EmployeeShifts
- AttendanceLogs, AttendanceSummary
- NetworkSettings

### Letters (3 tables)
- LetterTemplates, IssuedLetters, LetterRequests

### RBAC/Permissions (4 tables)
- RoleOccupations, OccupationDelegations
- UserPermissionOverrides, UserScopes

### Audit & Notifications (3 tables)
- AuditLogs, Notifications, _migrations

---

## MinIO Storage Structure

The system uses a single MinIO bucket: **`mesob-hrms`**

### Folder Structure

```
mesob-hrms/
├── employee-photos/           # Profile photos
│   └── {mesob_id}/{timestamp}-{uuid}.ext
├── employee-documents/        # ID documents
│   └── {mesob_id}/{timestamp}-{uuid}.ext
├── face-images/               # Face recognition (7 per employee)
│   └── {employee_uuid}/{timestamp}-{uuid}.ext
├── leave-documents/           # Leave request attachments
│   └── {employee_uuid}/{leave_request_uuid}/{doc_uuid}-{filename}
├── letter-templates/          # HR-uploaded PDF templates
│   └── {template_uuid}/{filename}
├── letter-requests/           # Generated letter PDFs
│   └── {request_uuid}/generated.pdf
└── organization/              # Logo & org assets
    └── logo/{timestamp}_{filename}
```

---

## Verification

After running all migrations, verify the setup:

```bash
node -e "
const mysql = require('mysql2/promise');
require('dotenv').config();
(async () => {
  const mc = await mysql.createConnection({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME,
  });
  const [tables] = await mc.query('SHOW TABLES');
  console.log('Total tables:', tables.length);
  
  const counts = {
    Employees: 0, Users: 0, Departments: 0, Positions: 0,
    Levels: 0, RoleOccupations: 0, Holidays: 0, Occupations: 0
  };
  
  for (const table in counts) {
    const [[row]] = await mc.query(\`SELECT COUNT(*) AS n FROM \\\`\${table}\\\`\`);
    counts[table] = row.n;
  }
  
  console.log('Row counts:', counts);
  await mc.end();
})();
"
```

Expected output:
```
Total tables: 36
Row counts: {
  Employees: 25,
  Users: 8,
  Departments: 38,
  Positions: 138,
  Levels: 12,
  RoleOccupations: 35,
  Holidays: 18,
  Occupations: 19
}
```

---

## npm Scripts Reference

| Command | Purpose |
|---|---|
| `npm run db:init` | Initialize base schema + seed data |
| `npm run db:clean` | Drop all tables (destructive!) |
| `npm run db:reset` | Clean + Init (fresh start) |
| `npm run db:migrate:users` | Add Users table extensions |
| `npm run db:migrate:rbac` | Add RBAC permission system |
| `npm run db:migrate:levels` | Add Levels module |
| `npm run db:migrate:all` | Run all migrations in order |
| `npm run db:verify` | Verify database structure |
