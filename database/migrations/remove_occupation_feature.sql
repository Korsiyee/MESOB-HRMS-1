-- ============================================================
-- Migration: Remove Legacy Occupation Feature (OPTION A - KEEP RBAC)
-- Description: This migration removes the old business Occupation
--              feature while preserving the RBAC permission system.
-- Date: 2024
-- ============================================================

-- IMPORTANT: Read README_OCCUPATION_REMOVAL.md before executing!

-- ============================================================
-- STEP 1: Drop EmployeeOccupations junction table
-- This table was used for business occupation assignments
-- (NOT the same as RBAC RoleOccupations)
-- ============================================================
DROP TABLE IF EXISTS EmployeeOccupations;

-- ============================================================
-- STEP 2: Remove occupation_uuid column from Employees table
-- Check if column exists first (compatible with all MySQL 8.x versions)
SET @col_exists = (
  SELECT COUNT(*) FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'Employees'
    AND COLUMN_NAME = 'occupation_uuid'
);
SET @sql = IF(@col_exists > 0,
  'ALTER TABLE Employees DROP COLUMN occupation_uuid',
  'SELECT ''occupation_uuid column already removed'' AS status'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- ============================================================
-- STEP 3: Verify RBAC tables are intact
-- ============================================================

-- These tables should still exist for RBAC:
-- - Occupations (permission definitions)
-- - RoleOccupations (role->permission mappings)
-- - OccupationDelegations (permission delegation)
-- - UserPermissionOverrides (user-specific overrides)

-- Verification queries
SELECT 
  'Migration Complete' as status,
  'Legacy occupation features removed' as message,
  'RBAC permission system preserved' as rbac_status;

-- Show count of RBAC occupations (permissions)
SELECT 
  COUNT(*) as rbac_permission_count,
  'Occupations table preserved for RBAC' as note
FROM Occupations;

-- Show count of role-permission mappings
SELECT 
  COUNT(*) as role_permission_mappings,
  'RoleOccupations table preserved' as note
FROM RoleOccupations;

-- ============================================================
-- IMPORTANT: If you are NOT using RBAC, use the script below
-- instead to remove all occupation tables
-- ============================================================

/*
-- OPTION B: Complete removal (DESTROYS RBAC - use only if not using permissions)
-- Uncomment below if you want to remove everything:

DROP TABLE IF EXISTS UserPermissionOverrides;
DROP TABLE IF EXISTS OccupationDelegations;
DROP TABLE IF EXISTS RoleOccupations;
DROP TABLE IF EXISTS EmployeeOccupations;
DROP TABLE IF EXISTS Occupations;
ALTER TABLE Employees DROP COLUMN IF EXISTS occupation_uuid;
*/
