-- ============================================================================
-- FDRE MESOB HRMS - Database Issues Fix
-- This SQL script fixes all the database schema issues causing server errors
-- ============================================================================

USE mesob_hrms;

-- 1. Add missing id column to Roles table
-- This fixes: Unknown column 'r.id' in 'SELECT'
ALTER TABLE Roles ADD COLUMN id INT AUTO_INCREMENT PRIMARY KEY FIRST;

-- 2. Add missing is_active column to Permissions table  
-- This fixes: Unknown column 'p.is_active' in 'WHERE'
ALTER TABLE Permissions ADD COLUMN is_active BOOLEAN NOT NULL DEFAULT TRUE AFTER action;

-- 3. Add missing uuid column to AuthorizationAuditLogs table
-- This fixes: Unknown column 'uuid' in 'INSERT INTO'
ALTER TABLE AuthorizationAuditLogs ADD COLUMN uuid VARCHAR(36) UNIQUE FIRST;

-- Update existing records to have UUIDs
UPDATE AuthorizationAuditLogs SET uuid = UUID() WHERE uuid IS NULL OR uuid = '';

-- 4. Add role_id column to Users table for backward compatibility
-- The authorization service expects both role_id and role_uuid
ALTER TABLE Users ADD COLUMN role_id INT AFTER role_uuid;

-- Sync role_id with role_uuid
UPDATE Users u
JOIN Roles r ON u.role_uuid = r.uuid
SET u.role_id = r.id
WHERE u.role_uuid IS NOT NULL;

-- 5. Update admin user email to be Permit.io compatible
-- This fixes: "value is not a valid email address" for admin@hrms.local
UPDATE EmployeeAddresses ea
JOIN Employees e ON ea.employee_uuid = e.uuid
JOIN Users u ON e.uuid = u.employee_uuid
SET ea.email = 'admin@mesobhrms.org'
WHERE u.username = 'admin' 
  AND ea.address_type = 'CURRENT'
  AND (ea.email IS NULL OR ea.email = '' OR ea.email LIKE '%@hrms.local');

-- Insert email record if it doesn't exist for admin
INSERT IGNORE INTO EmployeeAddresses (uuid, employee_uuid, address_type, email)
SELECT 
  UUID() as uuid,
  e.uuid as employee_uuid,
  'CURRENT' as address_type,
  'admin@mesobhrms.org' as email
FROM Employees e
JOIN Users u ON e.uuid = u.employee_uuid
WHERE u.username = 'admin'
  AND e.uuid NOT IN (
    SELECT employee_uuid 
    FROM EmployeeAddresses 
    WHERE address_type = 'CURRENT' 
      AND email IS NOT NULL 
      AND email != ''
  );

-- 6. Update other employee emails to valid format
UPDATE EmployeeAddresses ea
JOIN Employees e ON ea.employee_uuid = e.uuid
SET ea.email = CONCAT(
  REPLACE(LOWER(e.first_name), ' ', '.'), 
  '.', 
  REPLACE(LOWER(e.last_name), ' ', '.'), 
  '@mesobhrms.org'
)
WHERE ea.address_type = 'CURRENT' 
  AND (ea.email IS NULL OR ea.email = '' OR ea.email LIKE '%@hrms.local');

-- 7. Ensure all active permissions are marked as such
UPDATE Permissions SET is_active = TRUE WHERE is_active IS NULL;

-- 8. Ensure all roles have proper hierarchy
UPDATE Roles SET hierarchy_level = CASE 
  WHEN code = 'SUPER_ADMIN' THEN 100
  WHEN code = 'HR_ADMIN' THEN 90
  WHEN code = 'HR_OFFICER' THEN 80
  WHEN code = 'DEPARTMENT_HEAD' THEN 70
  WHEN code = 'EMPLOYEE' THEN 10
  ELSE COALESCE(hierarchy_level, 50)
END
WHERE hierarchy_level IS NULL OR hierarchy_level = 0;

-- 9. Create system roles if missing
INSERT IGNORE INTO Roles (uuid, code, name, hierarchy_level, is_system_role, is_active)
VALUES 
  (UUID(), 'SUPER_ADMIN', 'Super Administrator', 100, TRUE, TRUE),
  (UUID(), 'HR_ADMIN', 'HR Administrator', 90, TRUE, TRUE),
  (UUID(), 'HR_OFFICER', 'HR Officer', 80, TRUE, TRUE),
  (UUID(), 'DEPARTMENT_HEAD', 'Department Head', 70, TRUE, TRUE),
  (UUID(), 'EMPLOYEE', 'Employee', 10, TRUE, TRUE);

-- 10. Create basic permissions if missing
INSERT IGNORE INTO Permissions (uuid, code, name, is_active)
VALUES 
  (UUID(), 'dashboard.view', 'View Dashboard', TRUE),
  (UUID(), 'employees.view', 'View Employees', TRUE),
  (UUID(), 'employees.create', 'Create Employees', TRUE),
  (UUID(), 'employees.update', 'Update Employees', TRUE),
  (UUID(), 'employees.delete', 'Delete Employees', TRUE),
  (UUID(), 'departments.view', 'View Departments', TRUE),
  (UUID(), 'departments.manage', 'Manage Departments', TRUE),
  (UUID(), 'attendance.view', 'View Attendance', TRUE),
  (UUID(), 'attendance.manage', 'Manage Attendance', TRUE),
  (UUID(), 'leaves.view', 'View Leaves', TRUE),
  (UUID(), 'leaves.approve', 'Approve Leaves', TRUE),
  (UUID(), 'letters.generate', 'Generate Letters', TRUE),
  (UUID(), 'accounts.manage', 'Manage Accounts', TRUE),
  (UUID(), 'logs.view', 'View Logs', TRUE),
  (UUID(), 'notifications.view_own', 'View Own Notifications', TRUE),
  (UUID(), 'requests.view', 'View Requests', TRUE),
  (UUID(), 'shifts.view', 'View Shifts', TRUE);

-- 11. Grant all permissions to SUPER_ADMIN role
INSERT IGNORE INTO RolePermissions (uuid, role_uuid, permission_uuid)
SELECT 
  UUID() as uuid,
  r.uuid as role_uuid,
  p.uuid as permission_uuid
FROM Roles r
CROSS JOIN Permissions p
WHERE r.code = 'SUPER_ADMIN' 
  AND p.is_active = TRUE;

-- 12. Update Users table role references after adding new roles
UPDATE Users u
JOIN Roles r ON u.role_uuid = r.uuid
SET u.role_id = r.id
WHERE u.role_uuid IS NOT NULL AND (u.role_id IS NULL OR u.role_id = 0);

-- Fix any Users without role_uuid but with role enum
UPDATE Users u
LEFT JOIN Roles r ON r.code = u.role
SET u.role_uuid = r.uuid, u.role_id = r.id
WHERE u.role_uuid IS NULL AND r.uuid IS NOT NULL;

-- Verification queries (these will show the results)
SELECT 'Database fixes completed successfully!' as Status;

SELECT 
  'Roles table structure' as Info,
  COLUMN_NAME as Column_Name,
  DATA_TYPE as Data_Type,
  IS_NULLABLE as Nullable
FROM INFORMATION_SCHEMA.COLUMNS 
WHERE TABLE_SCHEMA = 'mesob_hrms' 
  AND TABLE_NAME = 'Roles' 
  AND COLUMN_NAME IN ('id', 'uuid', 'is_active')
ORDER BY ORDINAL_POSITION;

SELECT 
  'Permissions table structure' as Info,
  COLUMN_NAME as Column_Name,
  DATA_TYPE as Data_Type,
  IS_NULLABLE as Nullable
FROM INFORMATION_SCHEMA.COLUMNS 
WHERE TABLE_SCHEMA = 'mesob_hrms' 
  AND TABLE_NAME = 'Permissions' 
  AND COLUMN_NAME = 'is_active';

SELECT 
  'Admin user email' as Info,
  ea.email as Email_Address
FROM EmployeeAddresses ea
JOIN Employees e ON ea.employee_uuid = e.uuid
JOIN Users u ON e.uuid = u.employee_uuid
WHERE u.username = 'admin' AND ea.address_type = 'CURRENT'
LIMIT 1;