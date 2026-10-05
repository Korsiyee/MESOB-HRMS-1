-- Direct SQL fixes for FDRE MESOB HRMS database issues
USE mesob_hrms;

-- Fix 1: Add id column to Roles table if it doesn't exist
SET @sql = (SELECT IF(
  (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS 
   WHERE TABLE_SCHEMA = DATABASE() 
     AND TABLE_NAME = 'Roles' 
     AND COLUMN_NAME = 'id') = 0,
  'ALTER TABLE Roles ADD COLUMN id INT AUTO_INCREMENT PRIMARY KEY FIRST',
  'SELECT "Roles.id already exists" as message'));

PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Fix 2: Add is_active to Permissions if it doesn't exist
SET @sql = (SELECT IF(
  (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS 
   WHERE TABLE_SCHEMA = DATABASE() 
     AND TABLE_NAME = 'Permissions' 
     AND COLUMN_NAME = 'is_active') = 0,
  'ALTER TABLE Permissions ADD COLUMN is_active BOOLEAN NOT NULL DEFAULT TRUE',
  'SELECT "Permissions.is_active already exists" as message'));

PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Fix 3: Add action column to AuthorizationAuditLogs if missing
SET @sql = (SELECT IF(
  (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS 
   WHERE TABLE_SCHEMA = DATABASE() 
     AND TABLE_NAME = 'AuthorizationAuditLogs' 
     AND COLUMN_NAME = 'action') = 0,
  'ALTER TABLE AuthorizationAuditLogs ADD COLUMN action VARCHAR(100) DEFAULT "AUTHORIZATION_CHECK"',
  'SELECT "AuthorizationAuditLogs.action already exists" as message'));

PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Fix 4: Add role_id to Users if missing
SET @sql = (SELECT IF(
  (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS 
   WHERE TABLE_SCHEMA = DATABASE() 
     AND TABLE_NAME = 'Users' 
     AND COLUMN_NAME = 'role_id') = 0,
  'ALTER TABLE Users ADD COLUMN role_id INT AFTER role_uuid',
  'SELECT "Users.role_id already exists" as message'));

PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Update role_id references
UPDATE Users u
JOIN Roles r ON u.role_uuid = r.uuid
SET u.role_id = r.id
WHERE u.role_uuid IS NOT NULL AND r.id IS NOT NULL;

-- Show final results
SELECT 'VERIFICATION RESULTS' as info;

SELECT 
  'Roles table' as table_name,
  COUNT(*) as records_with_id
FROM Roles 
WHERE id IS NOT NULL;

SELECT 
  'Users table' as table_name,
  COUNT(*) as records_with_role_id
FROM Users 
WHERE role_id IS NOT NULL;

-- Test the problematic query
SELECT 'Testing problematic query...' as info;
SELECT r.id, r.uuid, r.code, r.name 
FROM Roles r 
WHERE r.is_active = TRUE 
LIMIT 3;