# Role_Permissions Table Missing - Fix Documentation

## Problem

Your application is throwing the following error:

```
Error: Table 'mesob_hrms.Role_Permissions' doesn't exist
at Object.getRoleWithDetails (/backend/src/services/roleManagementService.js:490:31)
```

This error occurs when trying to view role details in the role management interface.

## Root Cause

The database is missing the `Role_Permissions` table (with underscore). The codebase has an inconsistency:

- **Service code expects**: `Role_Permissions` (with underscore)
- **Migration script creates**: `RolePermissions` (without underscore)

The backend service queries for `Role_Permissions`, but this table was never created.

## Solution

Run the SQL fix to create the missing tables with the correct naming convention.

### Option 1: Quick Fix (Recommended)

Run the provided shell script:

```bash
./RUN_FIX.sh
```

This will:
1. Read your database credentials from `backend/.env`
2. Apply the SQL fix
3. Create the missing tables
4. Migrate any existing data

### Option 2: Manual SQL Execution

If the script doesn't work, run the SQL file directly:

```bash
mysql -u mesob -p mesob_hrms < FIX_ROLE_PERMISSIONS_NOW.sql
```

Enter your database password when prompted: `mesob_password`

### Option 3: Using Node.js Script

```bash
cd backend
node scripts/fixRolePermissionsTable.js
```

## What the Fix Does

The fix creates two tables with the correct naming convention:

1. **`Role_Permissions`** (with underscore)
   - Maps roles to their permissions
   - Includes foreign keys to `Roles` and `Permissions` tables

2. **`Role_Permission_Scopes`** (with underscores)
   - Maps role permissions to their data scopes
   - Includes foreign keys to `Roles`, `Permissions`, and `DataScopes` tables

If you already have data in the non-underscore versions (`RolePermissions`, `RolePermissionScopes`), the fix will automatically copy that data to the new tables.

## After Running the Fix

1. **Restart your backend server**
   ```bash
   cd backend
   # Stop the current server (Ctrl+C)
   # Then start it again
   npm start
   ```

2. **Verify the fix worked** by accessing the role management page again

3. **The error should be resolved** and you should be able to view role details

## Tables Created

| Table Name | Purpose |
|------------|---------|
| `Role_Permissions` | Maps which permissions are assigned to each role |
| `Role_Permission_Scopes` | Maps the data access scopes for each role-permission combination |

## Database Schema

### Role_Permissions Table

```sql
CREATE TABLE `Role_Permissions` (
  `id` INT AUTO_INCREMENT,
  `uuid` VARCHAR(36) NOT NULL,
  `role_uuid` VARCHAR(36) NOT NULL,
  `permission_uuid` VARCHAR(36) NOT NULL,
  `granted_by` VARCHAR(36) DEFAULT NULL,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_role_permissions_uuid` (`uuid`),
  UNIQUE KEY `uk_role_permission` (`role_uuid`, `permission_uuid`)
);
```

### Role_Permission_Scopes Table

```sql
CREATE TABLE `Role_Permission_Scopes` (
  `id` INT AUTO_INCREMENT,
  `uuid` VARCHAR(36) NOT NULL,
  `role_uuid` VARCHAR(36) NOT NULL,
  `permission_uuid` VARCHAR(36) NOT NULL,
  `data_scope_uuid` VARCHAR(36) NOT NULL,
  `scope_configuration` JSON DEFAULT NULL,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_role_perm_scopes_uuid` (`uuid`),
  UNIQUE KEY `uk_role_perm_scope` (`role_uuid`, `permission_uuid`)
);
```

## Verification

After applying the fix, verify the tables exist:

```bash
mysql -u mesob -p mesob_hrms -e "SHOW TABLES LIKE '%Permission%';"
```

You should see:
- `Permissions`
- `Role_Permissions` ✓
- `Role_Permission_Scopes` ✓

And possibly also:
- `RolePermissions` (old table, can be kept for backup)
- `RolePermissionScopes` (old table, can be kept for backup)

## Files Created

1. **FIX_ROLE_PERMISSIONS_NOW.sql** - The SQL script that creates the missing tables
2. **RUN_FIX.sh** - Bash script wrapper for easy execution
3. **backend/scripts/fixRolePermissionsTable.js** - Node.js version of the fix
4. **ROLE_PERMISSIONS_FIX_README.md** - This documentation

## Troubleshooting

### Error: "Can't connect to MySQL server"
- Check that MySQL is running: `systemctl status mysql`
- Verify database credentials in `backend/.env`

### Error: "Access denied for user"
- Check your database password
- Try: `mysql -u mesob -p` and enter password manually

### Error: "Foreign key constraint fails"
- Ensure the parent tables exist: `Roles`, `Permissions`, `DataScopes`
- You may need to run the RBAC migration first: `database/rbac_migration.sql`

### Still getting the error after fix
- Make sure you **restarted the backend server**
- Check the server logs for any other errors
- Verify the table exists: `mysql -u mesob -p mesob_hrms -e "DESCRIBE Role_Permissions;"`

## Prevention

To prevent this issue in the future, the codebase should be updated to use consistent table naming conventions. Either:

1. Update all service code to use `RolePermissions` (without underscore), OR
2. Update all migration scripts to use `Role_Permissions` (with underscore)

Currently, this fix ensures the underscore version exists since that's what the service code expects.

## Support

If you continue to experience issues after applying this fix:
1. Check the backend server logs for detailed error messages
2. Verify all RBAC tables exist: `Roles`, `Permissions`, `Resources`, `DataScopes`
3. Ensure the database user has proper permissions

---

**Status**: Ready to apply
**Date**: 2026-10-09
**Fix Version**: 1.0
