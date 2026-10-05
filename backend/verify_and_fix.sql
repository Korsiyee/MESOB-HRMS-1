-- Manual Database Fixes for FDRE MESOB HRMS Server Errors
-- Execute this SQL directly in your MySQL client

-- Use the correct database
USE mesob_hrms;

-- Show current table structure before fixes
SELECT 'BEFORE FIXES - Checking current table structures' as Info;

-- Check if problematic columns exist
SELECT 
  'Roles table columns' as TableInfo,
  COLUMN_NAME,
  DATA_TYPE
FROM INFORMATION_SCHEMA.COLUMNS 
WHERE TABLE_SCHEMA = 'mesob_hrms' 
  AND TABLE_NAME = 'Roles' 
  AND COLUMN_NAME IN ('id', 'uuid', 'is_active');

SELECT 
  'Permissions table columns' as TableInfo,
  COLUMN_NAME,
  DATA_TYPE
FROM INFORMATION_SCHEMA.COLUMNS 
WHERE TABLE_SCHEMA = 'mesob_hrms' 
  AND TABLE_NAME = 'Permissions' 
  AND COLUMN_NAME = 'is_active';

-- Apply fixes
SELECT 'APPLYING FIXES...' as Status;

-- Fix 1: Add id column to Roles table (if missing)
SET @sql = IF((SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS 
               WHERE TABLE_SCHEMA = 'mesob_hrms' 
                 AND TABLE_NAME = 'Roles' 
                 AND COLUMN_NAME = 'id') = 0,
              'ALTER TABLE Roles ADD COLUMN id INT AUTO_INCREMENT PRIMARY KEY FIRST',
              'SELECT "Roles.id column already exists" as Info');

PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Fix 2: Add is_active column to Permissions table (if missing)
SET @sql = IF((SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS 
               WHERE TABLE_SCHEMA = 'mesob_hrms' 
                 AND TABLE_NAME = 'Permissions' 
                 AND COLUMN_NAME = 'is_active') = 0,
              'ALTER TABLE Permissions ADD COLUMN is_active BOOLEAN NOT NULL DEFAULT TRUE AFTER action',
              'SELECT "Permissions.is_active column already exists" as Info');

PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Fix 3: Add uuid column to AuthorizationAuditLogs table (if missing)
SET @sql = IF((SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS 
               WHERE TABLE_SCHEMA = 'mesob_hrms' 
                 AND TABLE_NAME = 'AuthorizationAuditLogs' 
                 AND COLUMN_NAME = 'uuid') = 0,
              'ALTER TABLE AuthorizationAuditLogs ADD COLUMN uuid VARCHAR(36) UNIQUE FIRST',
              'SELECT "AuthorizationAuditLogs.uuid column already exists" as Info');

PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Fix 4: Add role_id column to Users table (if missing)
SET @sql = IF((SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS 
               WHERE TABLE_SCHEMA = 'mesob_hrms' 
                 AND TABLE_NAME = 'Users' 
                 AND COLUMN_NAME = 'role_id') = 0,
              'ALTER TABLE Users ADD COLUMN role_id INT AFTER role_uuid',
              'SELECT "Users.role_id column already exists" as Info');

PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Now update missing UUIDs in AuthorizationAuditLogs
UPDATE AuthorizationAuditLogs 
SET uuid = UUID() 
WHERE uuid IS NULL OR uuid = '';

-- Sync role_id with role_uuid in Users table
UPDATE Users u
JOIN Roles r ON u.role_uuid = r.uuid
SET u.role_id = r.id
WHERE u.role_uuid IS NOT NULL AND (u.role_id IS NULL OR u.role_id = 0);

-- Fix admin email for Permit.io compatibility
UPDATE EmployeeAddresses ea
JOIN Employees e ON ea.employee_uuid = e.uuid
JOIN Users u ON e.uuid = u.employee_uuid
SET ea.email = 'admin@mesobhrms.org'
WHERE u.username = 'admin' 
  AND ea.address_type = 'CURRENT'
  AND (ea.email IS NULL OR ea.email = '' OR ea.email LIKE '%@hrms.local');

-- Ensure all permissions are marked as active
UPDATE Permissions SET is_active = TRUE WHERE is_active IS NULL;

-- Show results after fixes
SELECT 'AFTER FIXES - Verification' as Info;

SELECT 
  'Roles table structure' as TableInfo,
  COLUMN_NAME,
  DATA_TYPE,
  IS_NULLABLE
FROM INFORMATION_SCHEMA.COLUMNS 
WHERE TABLE_SCHEMA = 'mesob_hrms' 
  AND TABLE_NAME = 'Roles' 
  AND COLUMN_NAME IN ('id', 'uuid', 'is_active')
ORDER BY ORDINAL_POSITION;

SELECT 
  'Permissions table structure' as TableInfo,
  COLUMN_NAME,
  DATA_TYPE,
  IS_NULLABLE
FROM INFORMATION_SCHEMA.COLUMNS 
WHERE TABLE_SCHEMA = 'mesob_hrms' 
  AND TABLE_NAME = 'Permissions' 
  AND COLUMN_NAME = 'is_active';

SELECT 
  'AuthorizationAuditLogs table structure' as TableInfo,
  COLUMN_NAME,
  DATA_TYPE
FROM INFORMATION_SCHEMA.COLUMNS 
WHERE TABLE_SCHEMA = 'mesob_hrms' 
  AND TABLE_NAME = 'AuthorizationAuditLogs' 
  AND COLUMN_NAME = 'uuid';

SELECT 
  'Users table structure' as TableInfo,
  COLUMN_NAME,
  DATA_TYPE
FROM INFORMATION_SCHEMA.COLUMNS 
WHERE TABLE_SCHEMA = 'mesob_hrms' 
  AND TABLE_NAME = 'Users' 
  AND COLUMN_NAME IN ('role_id', 'role_uuid')
ORDER BY ORDINAL_POSITION;

-- Check admin email
SELECT 
  'Admin user email' as Info,
  u.username,
  ea.email
FROM Users u
JOIN Employees e ON u.employee_uuid = e.uuid
JOIN EmployeeAddresses ea ON e.uuid = ea.employee_uuid
WHERE u.username = 'admin' AND ea.address_type = 'CURRENT';

-- Count roles and users
SELECT 'Database counts' as Info;
SELECT 'Roles' as TableName, COUNT(*) as RecordCount FROM Roles
UNION ALL
SELECT 'Users' as TableName, COUNT(*) as RecordCount FROM Users
UNION ALL
SELECT 'Permissions' as TableName, COUNT(*) as RecordCount FROM Permissions
UNION ALL
SELECT 'Active Permissions' as TableName, COUNT(*) as RecordCount FROM Permissions WHERE is_active = TRUE;

SELECT 'Database fixes completed successfully!' as Status;