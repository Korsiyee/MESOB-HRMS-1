-- ═══════════════════════════════════════════════════════════════════════
-- Migration 005: Seed Default Role-Occupation Mappings
-- Description: Define default occupations for each role (RBAC defaults)
-- Created: 2026-06-29
-- ═══════════════════════════════════════════════════════════════════════

-- ═══════════════════════════════════════════════════════════════════════
-- EMPLOYEE Role - Minimal Self-Service Permissions
-- ═══════════════════════════════════════════════════════════════════════

INSERT INTO RoleOccupations (uuid, role, occupation_uuid, assigned_reason)
SELECT 
  UUID() as uuid,
  'EMPLOYEE' as role,
  uuid as occupation_uuid,
  'Default permission for all employees' as assigned_reason
FROM Occupations 
WHERE name IN (
  'Dashboard',
  'Leave - My Leave',
  'My Account'
)
ON DUPLICATE KEY UPDATE assigned_reason = VALUES(assigned_reason);

-- ═══════════════════════════════════════════════════════════════════════
-- DEPARTMENT_HEAD Role - Departmental Oversight
-- ═══════════════════════════════════════════════════════════════════════

INSERT INTO RoleOccupations (uuid, role, occupation_uuid, assigned_reason)
SELECT 
  UUID() as uuid,
  'DEPARTMENT_HEAD' as role,
  uuid as occupation_uuid,
  'Default permission for all department heads' as assigned_reason
FROM Occupations 
WHERE name IN (
  'Dashboard',
  'Employees - Overview',
  'Attendance - Overview',
  'Leave - Manage Requests',
  'Leave - My Leave',
  'Shifts - Overview',
  'My Account'
)
ON DUPLICATE KEY UPDATE assigned_reason = VALUES(assigned_reason);

-- ═══════════════════════════════════════════════════════════════════════
-- HR_OFFICER Role - Comprehensive HR Operations
-- ═══════════════════════════════════════════════════════════════════════

INSERT INTO RoleOccupations (uuid, role, occupation_uuid, assigned_reason)
SELECT 
  UUID() as uuid,
  'HR_OFFICER' as role,
  uuid as occupation_uuid,
  'Default permission for all HR officers' as assigned_reason
FROM Occupations 
WHERE name IN (
  'Dashboard',
  'Employees - Overview',
  'Employees - Registration',
  'Departments - Overview',
  'Positions - Overview',
  'Attendance - Overview',
  'Attendance - Manage',
  'Leave - Manage Requests',
  'Leave - My Leave',
  'Shifts - Overview',
  'Shifts - Add',
  'Letters',
  'My Account'
)
ON DUPLICATE KEY UPDATE assigned_reason = VALUES(assigned_reason);

-- ═══════════════════════════════════════════════════════════════════════
-- HR_ADMIN Role - Full HR Administrative Access
-- ═══════════════════════════════════════════════════════════════════════

INSERT INTO RoleOccupations (uuid, role, occupation_uuid, assigned_reason)
SELECT 
  UUID() as uuid,
  'HR_ADMIN' as role,
  uuid as occupation_uuid,
  'Default permission for all HR administrators' as assigned_reason
FROM Occupations 
WHERE name NOT IN (
  'Audit Logs'  -- Only SUPER_ADMIN gets audit log access by default
)
ON DUPLICATE KEY UPDATE assigned_reason = VALUES(assigned_reason);

-- ═══════════════════════════════════════════════════════════════════════
-- SUPER_ADMIN Role - No Explicit Mappings (Bypass Logic)
-- Note: SUPER_ADMIN bypasses all occupation checks in middleware
-- Therefore, no explicit occupation assignments are needed
-- ═══════════════════════════════════════════════════════════════════════

-- SUPER_ADMIN gets ALL occupations for completeness (even though bypass logic applies)
INSERT INTO RoleOccupations (uuid, role, occupation_uuid, assigned_reason)
SELECT 
  UUID() as uuid,
  'SUPER_ADMIN' as role,
  uuid as occupation_uuid,
  'Super admin has unrestricted access to all features' as assigned_reason
FROM Occupations
ON DUPLICATE KEY UPDATE assigned_reason = VALUES(assigned_reason);

-- ═══════════════════════════════════════════════════════════════════════
-- Summary of Role-Occupation Mappings
-- ═══════════════════════════════════════════════════════════════════════
-- EMPLOYEE:        3 occupations  (Dashboard, Leave - My Leave, My Account)
-- DEPARTMENT_HEAD: 7 occupations  (+ Employee Overview, Attendance Overview, Leave Management, Shifts Overview)
-- HR_OFFICER:     13 occupations  (+ Employee Registration, Departments, Positions, Attendance Manage, Shifts Add, Letters)
-- HR_ADMIN:       18 occupations  (All except Audit Logs)
-- SUPER_ADMIN:    19 occupations  (All occupations + bypass logic)
-- ═══════════════════════════════════════════════════════════════════════
