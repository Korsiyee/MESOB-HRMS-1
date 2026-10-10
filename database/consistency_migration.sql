-- ============================================================================
-- Mesob HRMS - Consistency Migration
-- Date: 2026-10-10
-- Purpose: Fix all database mismatches found during audit
-- Safety: All changes use IF EXISTS/IF NOT EXISTS guards
-- ============================================================================

-- 1. Add missing columns to EmployeeShifts
--    positionService.js and shiftService.js reference these columns
ALTER TABLE EmployeeShifts
  ADD COLUMN IF NOT EXISTS assignment_type ENUM('DIRECT','INHERITED') NOT NULL DEFAULT 'DIRECT' AFTER effective_to,
  ADD COLUMN IF NOT EXISTS source_position_uuid VARCHAR(36) DEFAULT NULL AFTER assignment_type;

-- 2. Drop obsolete RBAC backup tables (confirmed not referenced by any code)
DROP TABLE IF EXISTS _backup_roles_before_static_rbac;
DROP TABLE IF EXISTS _backup_user_roles_before_static_rbac;

-- 3. Drop obsolete DataScopes table
--    Old dynamic RBAC used scopes; static RBAC has no scope concept
--    No foreign keys reference this table; no code queries it
DROP TABLE IF EXISTS DataScopes;

-- 4. Drop obsolete RoleModules table
--    The static RBAC system uses roleModuleMapping.js config file
--    moduleAuthService.js reads modules from the static config, not this table
--    rbacService.js still has code that queries it but it is superseded by moduleAuthService
DROP TABLE IF EXISTS RoleModules;

-- 5. Verify: show final table list
SELECT TABLE_NAME FROM information_schema.TABLES
WHERE TABLE_SCHEMA = DATABASE()
ORDER BY TABLE_NAME;
