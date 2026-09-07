# Occupation Feature Removal Migration Guide

## ⚠️ CRITICAL WARNING

**Before executing this migration, read this document completely!**

The legacy "Occupation" feature used the `Occupations` table for two different purposes:
1. **Legacy Business Occupations** (Employee job classifications) - **TO BE REMOVED**
2. **RBAC Permission System** (Access control permissions) - **MUST BE KEPT**

## Understanding the System

### What is Being Removed
- Employee business occupation assignments (not used for access control)
- The ability to assign "job titles" or "classifications" to employees via Occupations UI
- The `/occupations` and `/occupations/manage` pages in the UI
- The "Occupations" tab on employee detail pages

### What is Being Kept
- The RBAC permission system that uses `Occupations` as permission objects
- The `Occupations` table (contains permission definitions)
- The `RoleOccupations` table (maps roles to permissions)
- The `OccupationDelegations` table (permission delegation)
- The `UserPermissionOverrides` table (user-specific overrides)
- All RBAC management features in Permissions Management page

## Migration Options

### Option A: Keep RBAC Occupations (RECOMMENDED)

If your system uses the RBAC permission system, execute this modified migration:

```sql
-- ============================================================
-- Migration: Remove Legacy Occupation Feature (Keep RBAC)
-- Description: Removes business occupation references while
--              preserving RBAC permission system
-- ============================================================

-- 1. Drop EmployeeOccupations junction table
--    (This table links employees to occupations for business purposes)
--    NOTE: This is different from the RBAC system
DROP TABLE IF EXISTS EmployeeOccupations;

-- 2. Remove occupation_uuid column from Employees table
--    (This was used for direct business occupation assignment)
ALTER TABLE Employees DROP COLUMN IF EXISTS occupation_uuid;

-- 3. Keep the Occupations table (used by RBAC)
-- DO NOT DROP: Occupations, RoleOccupations, OccupationDelegations

-- Verify the changes
SELECT 'Migration complete: Legacy Occupation references removed, RBAC system preserved' AS Status;

-- Verify RBAC tables still exist
SELECT 
  COUNT(*) as occupation_count,
  'Occupations table preserved for RBAC' as message
FROM Occupations;

SELECT 
  COUNT(*) as role_occupation_count,
  'RoleOccupations table preserved' as message  
FROM RoleOccupations;
```

### Option B: Remove Everything (NOT RECOMMENDED)

⚠️ **Only use this if you are NOT using the RBAC permission system**

If you want to remove the Occupations table entirely:

```sql
-- ============================================================
-- Migration: Complete Occupation Removal (DESTROYS RBAC)
-- WARNING: This will break the permission system!
-- ============================================================

-- Drop all occupation-related tables
DROP TABLE IF EXISTS UserPermissionOverrides;
DROP TABLE IF EXISTS OccupationDelegations;
DROP TABLE IF EXISTS RoleOccupations;
DROP TABLE IF EXISTS EmployeeOccupations;
DROP TABLE IF EXISTS Occupations;

-- Remove occupation_uuid column from Employees
ALTER TABLE Employees DROP COLUMN IF EXISTS occupation_uuid;

SELECT 'All occupation tables removed - RBAC system destroyed' AS Status;
```

## Pre-Migration Checklist

- [ ] **Backup database** - Create a complete backup before proceeding
- [ ] **Verify RBAC usage** - Check if your system uses the Permission Management page
- [ ] **Test in staging** - Run migration in test environment first
- [ ] **Document current state** - Query and save current occupation assignments
- [ ] **Plan rollback** - Ensure you can restore from backup if needed

## Execution Steps

### 1. Create Backup
```bash
# MySQL backup
mysqldump -u [username] -p [database_name] > backup_before_occupation_removal.sql

# Or use your database backup tool
```

### 2. Document Current State
```sql
-- Count employees with occupation assignments
SELECT COUNT(*) as employees_with_occupation
FROM Employees 
WHERE occupation_uuid IS NOT NULL;

-- Count employee occupation assignments
SELECT COUNT(*) as occupation_assignments
FROM EmployeeOccupations;

-- Count RBAC occupations
SELECT COUNT(*) as rbac_permissions
FROM Occupations;

-- Count role-occupation mappings
SELECT COUNT(*) as role_permissions
FROM RoleOccupations;
```

### 3. Execute Migration
```bash
# Connect to your database
mysql -u [username] -p [database_name]

# Execute the migration file
source /path/to/remove_occupation_feature.sql

# Or use a database tool
```

### 4. Verify Results
```sql
-- Verify EmployeeOccupations table is dropped
SHOW TABLES LIKE 'EmployeeOccupations';
-- Should return empty result

-- Verify occupation_uuid column is removed
DESCRIBE Employees;
-- Should not show occupation_uuid column

-- Verify RBAC tables still exist (if using Option A)
SHOW TABLES LIKE 'Occupations';
SHOW TABLES LIKE 'RoleOccupations';
-- Should return these tables
```

### 5. Test Application
- [ ] Start the backend server - verify no errors
- [ ] Start the frontend - verify no errors
- [ ] Test employee registration/editing - should work without occupation
- [ ] Test employee listing - should work without occupation filter
- [ ] Test Permissions Management page - should still show RBAC occupations
- [ ] Test user login - permissions should still work

## Rollback Procedure

If issues occur:

```bash
# 1. Stop the application
# 2. Restore database from backup
mysql -u [username] -p [database_name] < backup_before_occupation_removal.sql

# 3. Revert code changes using git
git revert [commit-hash]

# 4. Restart application
```

## Post-Migration Tasks

1. **Clean up documentation**
   - Update user manuals that reference Occupations
   - Update API documentation
   - Update training materials

2. **Monitor logs**
   - Watch for any occupation-related errors
   - Check for broken functionality

3. **Update seed data** (if needed)
   - Remove occupation seed data from `database/seed.sql`
   - Keep RBAC occupation seeds if using permissions

## Troubleshooting

### Error: "Table 'EmployeeOccupations' doesn't exist"
**Solution:** The table was already removed. This is safe to ignore.

### Error: "Unknown column 'occupation_uuid' in 'field list'"
**Solution:** The migration is working correctly. Update your code to not reference this column.

### Error: "Cannot find occupations for permissions"
**Solution:** You may have dropped the wrong table. Restore from backup and use Option A.

### RBAC permissions not working after migration
**Solution:** You likely dropped the Occupations table. Restore from backup and use Option A.

## Questions?

- Review the `OCCUPATION_REMOVAL_SUMMARY.md` file
- Check the git commit history for changes made
- Test thoroughly in a development environment first

---

**Last Updated:** $(date)
**Migration File:** `remove_occupation_feature.sql`
