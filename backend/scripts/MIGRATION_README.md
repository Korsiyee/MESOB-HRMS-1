# RBAC Migration Scripts

Node.js scripts to run database migrations without requiring MySQL CLI tools.

## Available Scripts

### 1. Run RBAC Migration
Applies the complete RBAC refactor migration to your database.

```bash
node scripts/runRBACMigration.js
```

**What it does:**
- Creates new tables: Roles, Permissions, RolePermissions
- Adds new columns to Users table (role_id, permissions_version, last_activity)
- Seeds 5 system roles with hierarchy
- Seeds 66 permissions across all resources
- Creates role-permission mappings
- Verifies migration success

**Output:**
```
▶ RBAC Migration Runner
ℹ Reading migration file...
ℹ Found 150+ SQL statements to execute

▶ Executing Migration
  [1/150] CREATE TABLE IF NOT EXISTS Roles... OK
  [2/150] CREATE TABLE IF NOT EXISTS Permissions... OK
  ...

▶ Migration Summary
ℹ Total statements: 150
✓ Successful: 148
⚠ Errors: 2 (expected - tables already exist)

▶ Verifying Migration
✓ Roles table: OK
✓ Permissions table: OK
✓ RolePermissions table: OK
✓ Users.role_id column: OK
✓ Users.permissions_version column: OK

▶ Migration Complete!
✓ RBAC migration has been applied successfully
```

### 2. Verify Migration
Checks that the migration was applied correctly and shows current state.

```bash
node scripts/verifyRBACMigration.js
```

**Output:**
```
═══════════════════════════════════════════════════
RBAC Migration Verification
═══════════════════════════════════════════════════

▶ Roles Table
  ✓ Found 5 roles:
    - SUPER_ADMIN          (rank: 50) - Super Administrator
    - ADMIN                (rank: 40) - Administrator
    - HR_MANAGER           (rank: 30) - HR Manager
    - DEPT_HEAD            (rank: 20) - Department Head
    - EMPLOYEE             (rank: 10) - Employee

▶ Permissions Table
  ✓ Found 66 permissions
  Permissions by resource:
    - Accounts            : 5 permissions
    - Attendance          : 6 permissions
    - Departments         : 5 permissions
    - Employees           : 6 permissions
    - Leave               : 7 permissions
    - Letters             : 6 permissions
    - Shifts              : 6 permissions
    ...

▶ RolePermissions Table
  ✓ Role-permission mappings:
    - SUPER_ADMIN          : 66 permissions
    - ADMIN                : 60 permissions
    - HR_MANAGER           : 45 permissions
    - DEPT_HEAD            : 15 permissions
    - EMPLOYEE             : 5 permissions

▶ Users Table Updates
  ✓ role_id column exists
  ✓ permissions_version column exists
  ✓ last_activity column exists
  ✓ Users with role_id: 10

═══════════════════════════════════════════════════
✓ Migration Verification Complete!
═══════════════════════════════════════════════════
```

## Troubleshooting

### Migration fails with "Table already exists"
This is normal if you've run the migration before. The script uses `CREATE TABLE IF NOT EXISTS` so it's safe to run multiple times.

### Connection refused
Make sure your database is running and the `.env` file has correct credentials:
```env
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=your_password
DB_NAME=hrms_db
```

### Permission denied
The scripts need read access to the migration SQL file. Check file permissions:
```bash
ls -la ../../database/migrations/100_rbac_refactor.sql
```

### Verification shows 0 roles
The migration didn't complete. Check the error output from `runRBACMigration.js` and look for SQL errors.

## Manual Rollback (if needed)

If you need to undo the migration:

```sql
-- Drop new tables
DROP TABLE IF EXISTS RolePermissions;
DROP TABLE IF EXISTS Permissions;
DROP TABLE IF EXISTS Roles;

-- Remove new columns from Users
ALTER TABLE Users DROP COLUMN IF EXISTS role_id;
ALTER TABLE Users DROP COLUMN IF EXISTS permissions_version;
ALTER TABLE Users DROP COLUMN IF EXISTS last_activity;
```

## Related Files

- Migration SQL: `../../database/migrations/100_rbac_refactor.sql`
- Documentation: `../../FINAL_DEPLOYMENT_CHECKLIST.md`
- Backend config: `../src/config/db.js`
