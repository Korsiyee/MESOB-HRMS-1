-- ═══════════════════════════════════════════════════════════════════════
-- Verification Script for Migration 100
-- Run this after executing 100_rbac_refactor.sql
-- ═══════════════════════════════════════════════════════════════════════

SELECT '════════════════════════════════════════════' as '';
SELECT 'RBAC MIGRATION 100 - VERIFICATION REPORT' as '';
SELECT '════════════════════════════════════════════' as '';
SELECT '' as '';

-- 1. Roles
SELECT '1. ROLES TABLE' as '';
SELECT '─────────────────────────────────────────────' as '';
SELECT 
  code as Role,
  name as Name,
  rank as Rank,
  is_active as Active,
  description as Description
FROM Roles
ORDER BY rank;
SELECT '' as '';

-- 2. Permissions Summary
SELECT '2. PERMISSIONS SUMMARY' as '';
SELECT '─────────────────────────────────────────────' as '';
SELECT 
  resource as Resource,
  COUNT(*) as 'Permission Count'
FROM Permissions
WHERE is_active = TRUE
GROUP BY resource
ORDER BY resource;
SELECT '' as '';

SELECT CONCAT('Total Permissions: ', COUNT(*)) as '' FROM Permissions WHERE is_active = TRUE;
SELECT '' as '';

-- 3. Role-Permission Mappings
SELECT '3. ROLE-PERMISSION MAPPINGS' as '';
SELECT '─────────────────────────────────────────────' as '';
SELECT 
  r.code as Role,
  r.rank as Rank,
  COUNT(rp.id) as 'Permission Count'
FROM Roles r
LEFT JOIN RolePermissions rp ON r.id = rp.role_id
GROUP BY r.id, r.code, r.rank
ORDER BY r.rank;
SELECT '' as '';

-- 4. Sample permissions for each role
SELECT '4. SAMPLE PERMISSIONS BY ROLE' as '';
SELECT '─────────────────────────────────────────────' as '';
SELECT 
  r.code as Role,
  GROUP_CONCAT(p.code ORDER BY p.code SEPARATOR ', ') as 'Sample Permissions (first 5)'
FROM Roles r
JOIN RolePermissions rp ON r.id = rp.role_id
JOIN Permissions p ON rp.permission_id = p.id
WHERE p.code IN (
  SELECT p2.code 
  FROM RolePermissions rp2
  JOIN Permissions p2 ON rp2.permission_id = p2.id
  WHERE rp2.role_id = r.id
  LIMIT 5
)
GROUP BY r.id, r.code
ORDER BY r.rank;
SELECT '' as '';

-- 5. Users Migration Status
SELECT '5. USERS MIGRATION STATUS' as '';
SELECT '─────────────────────────────────────────────' as '';
SELECT 
  COALESCE(r.code, 'UNMAPPED') as Role,
  COUNT(u.uuid) as 'User Count'
FROM Users u
LEFT JOIN Roles r ON u.role_id = r.id
GROUP BY r.code
ORDER BY r.rank;
SELECT '' as '';

SELECT 
  COUNT(*) as 'Total Users',
  SUM(CASE WHEN role_id IS NOT NULL THEN 1 ELSE 0 END) as 'Users with role_id',
  SUM(CASE WHEN role_id IS NULL THEN 1 ELSE 0 END) as 'Users WITHOUT role_id (CRITICAL!)'
FROM Users;
SELECT '' as '';

-- 6. User Scopes Migration
SELECT '6. USER SCOPES MIGRATION' as '';
SELECT '─────────────────────────────────────────────' as '';
SELECT 
  scope_type as 'Scope Type',
  COUNT(*) as 'Count'
FROM UserScopes
GROUP BY scope_type
ORDER BY scope_type;
SELECT '' as '';

-- 7. Audit Logs Migration
SELECT '7. AUTHORIZATION AUDIT LOGS' as '';
SELECT '─────────────────────────────────────────────' as '';
SELECT COUNT(*) as 'Total Audit Log Entries' FROM AuthorizationAuditLogs;
SELECT 
  action_type as 'Action Type',
  COUNT(*) as 'Count'
FROM AuthorizationAuditLogs
GROUP BY action_type
ORDER BY COUNT(*) DESC
LIMIT 10;
SELECT '' as '';

-- 8. Deprecated Tables (Should exist but be renamed)
SELECT '8. DEPRECATED TABLES (should exist as *_Deprecated)' as '';
SELECT '─────────────────────────────────────────────' as '';
SELECT 
  table_name as 'Deprecated Table',
  CASE 
    WHEN table_name LIKE '%_Deprecated' THEN '✓ Renamed'
    ELSE '✗ Not renamed'
  END as Status
FROM information_schema.tables
WHERE table_schema = DATABASE()
  AND table_name IN (
    'Occupations_Deprecated',
    'RoleOccupations_Deprecated',
    'EmployeeOccupations_Deprecated',
    'OccupationDelegations_Deprecated',
    'UserPermissionOverrides_Deprecated',
    'UserScopes_Old',
    'AccessAuditLogs_Old'
  );
SELECT '' as '';

-- 9. Critical Checks
SELECT '9. CRITICAL VALIDATION CHECKS' as '';
SELECT '─────────────────────────────────────────────' as '';

-- Check: All users have role_id
SELECT 
  CASE 
    WHEN COUNT(*) = 0 THEN '✓ PASS: All users have role_id'
    ELSE CONCAT('✗ FAIL: ', COUNT(*), ' users missing role_id')
  END as 'Check: Users have role_id'
FROM Users
WHERE role_id IS NULL;

-- Check: All roles have at least one permission
SELECT 
  CASE 
    WHEN COUNT(*) = 0 THEN '✓ PASS: All roles have permissions'
    ELSE CONCAT('✗ FAIL: ', COUNT(*), ' roles have no permissions')
  END as 'Check: Roles have permissions'
FROM Roles r
LEFT JOIN RolePermissions rp ON r.id = rp.role_id
WHERE rp.id IS NULL;

-- Check: Super Admin has all permissions
SELECT 
  CASE 
    WHEN perm_count = total_perms THEN '✓ PASS: Super Admin has all permissions'
    ELSE CONCAT('✗ FAIL: Super Admin has ', perm_count, ' of ', total_perms, ' permissions')
  END as 'Check: Super Admin permissions'
FROM (
  SELECT 
    (SELECT COUNT(*) FROM RolePermissions WHERE role_id = (SELECT id FROM Roles WHERE code = 'SUPER_ADMIN')) as perm_count,
    (SELECT COUNT(*) FROM Permissions WHERE is_active = TRUE) as total_perms
) as counts;

-- Check: Employee has minimal permissions
SELECT 
  CASE 
    WHEN perm_count >= 10 THEN '✓ PASS: Employee has baseline permissions'
    ELSE CONCAT('✗ FAIL: Employee has only ', perm_count, ' permissions (expected >=10)')
  END as 'Check: Employee permissions'
FROM (
  SELECT COUNT(*) as perm_count
  FROM RolePermissions 
  WHERE role_id = (SELECT id FROM Roles WHERE code = 'EMPLOYEE')
) as counts;

-- Check: Role hierarchy is correct
SELECT 
  CASE 
    WHEN 
      (SELECT rank FROM Roles WHERE code = 'EMPLOYEE') < 
      (SELECT rank FROM Roles WHERE code = 'DEPARTMENT_HEAD') AND
      (SELECT rank FROM Roles WHERE code = 'DEPARTMENT_HEAD') < 
      (SELECT rank FROM Roles WHERE code = 'HR_OFFICER') AND
      (SELECT rank FROM Roles WHERE code = 'HR_OFFICER') < 
      (SELECT rank FROM Roles WHERE code = 'HR_ADMIN') AND
      (SELECT rank FROM Roles WHERE code = 'HR_ADMIN') < 
      (SELECT rank FROM Roles WHERE code = 'SUPER_ADMIN')
    THEN '✓ PASS: Role hierarchy is correct'
    ELSE '✗ FAIL: Role hierarchy is broken'
  END as 'Check: Role hierarchy';

-- Check: Foreign keys are set up correctly
SELECT 
  CASE 
    WHEN COUNT(*) >= 3 THEN '✓ PASS: Foreign keys exist'
    ELSE '✗ FAIL: Missing foreign keys'
  END as 'Check: Foreign key constraints'
FROM information_schema.TABLE_CONSTRAINTS
WHERE CONSTRAINT_SCHEMA = DATABASE()
  AND CONSTRAINT_TYPE = 'FOREIGN KEY'
  AND TABLE_NAME IN ('RolePermissions', 'Users', 'UserScopes');

SELECT '' as '';
SELECT '════════════════════════════════════════════' as '';
SELECT 'VERIFICATION COMPLETE' as '';
SELECT '════════════════════════════════════════════' as '';
