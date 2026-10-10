-- =====================================================
-- ADD RBAC TABLES TO EXISTING SCHEMA
-- This adds all missing Permission/RBAC tables
-- Run this: mysql -u mesob -pmesob_password mesob_hrms < ADD_RBAC_TABLES.sql
-- =====================================================

USE mesob_hrms;

-- =====================================================
-- 1. CREATE RESOURCES TABLE
-- =====================================================
DROP TABLE IF EXISTS `Resources`;
CREATE TABLE `Resources` (
  `id` INT AUTO_INCREMENT,
  `uuid` VARCHAR(36) NOT NULL,
  `code` VARCHAR(100) NOT NULL COMMENT 'e.g., Employees, Attendance, NetworkSettings',
  `name` VARCHAR(200) NOT NULL,
  `description` TEXT DEFAULT NULL,
  `display_order` INT NOT NULL DEFAULT 0,
  `is_active` TINYINT(1) NOT NULL DEFAULT 1,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_resources_uuid` (`uuid`),
  UNIQUE KEY `uk_resources_code` (`code`),
  KEY `idx_resources_active` (`is_active`),
  KEY `idx_resources_display` (`display_order`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
COMMENT='System resources that can have permissions';

-- =====================================================
-- 2. CREATE PERMISSIONS TABLE
-- =====================================================
DROP TABLE IF EXISTS `Permissions`;
CREATE TABLE `Permissions` (
  `id` INT AUTO_INCREMENT,
  `uuid` VARCHAR(36) NOT NULL,
  `resource_uuid` VARCHAR(36) NOT NULL,
  `code` VARCHAR(100) NOT NULL COMMENT 'e.g., Employees.View, Attendance.Create',
  `name` VARCHAR(200) NOT NULL,
  `action` VARCHAR(50) NOT NULL COMMENT 'e.g., View, Create, Update, Delete',
  `description` TEXT DEFAULT NULL,
  `requires_scope` TINYINT(1) NOT NULL DEFAULT 0,
  `is_sensitive` TINYINT(1) NOT NULL DEFAULT 0,
  `display_order` INT NOT NULL DEFAULT 0,
  `is_active` TINYINT(1) NOT NULL DEFAULT 1,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_permissions_uuid` (`uuid`),
  UNIQUE KEY `uk_permissions_code` (`code`),
  KEY `idx_permissions_resource` (`resource_uuid`),
  KEY `idx_permissions_action` (`action`),
  KEY `idx_permissions_active` (`is_active`),
  CONSTRAINT `fk_permissions_resource` FOREIGN KEY (`resource_uuid`) REFERENCES `Resources` (`uuid`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
COMMENT='Granular permissions (Resource.Action format)';

-- =====================================================
-- 3. CREATE DATA_SCOPES TABLE
-- =====================================================
DROP TABLE IF EXISTS `DataScopes`;
CREATE TABLE `DataScopes` (
  `id` INT AUTO_INCREMENT,
  `uuid` VARCHAR(36) NOT NULL,
  `code` VARCHAR(50) NOT NULL COMMENT 'e.g., ALL, ORGANIZATION, DEPARTMENT, OWN',
  `name` VARCHAR(100) NOT NULL,
  `scope_type` VARCHAR(50) NOT NULL DEFAULT 'STANDARD',
  `description` TEXT DEFAULT NULL,
  `hierarchy_level` INT NOT NULL DEFAULT 0 COMMENT 'Higher = broader scope',
  `is_active` TINYINT(1) NOT NULL DEFAULT 1,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_datascopes_uuid` (`uuid`),
  UNIQUE KEY `uk_datascopes_code` (`code`),
  KEY `idx_datascopes_active` (`is_active`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
COMMENT='Data access scopes for permission filtering';

-- =====================================================
-- 4. CREATE ROLE_PERMISSIONS TABLE (WITH UNDERSCORE!)
-- =====================================================
DROP TABLE IF EXISTS `Role_Permissions`;
CREATE TABLE `Role_Permissions` (
  `id` INT AUTO_INCREMENT,
  `uuid` VARCHAR(36) NOT NULL,
  `role_uuid` VARCHAR(36) NOT NULL,
  `permission_uuid` VARCHAR(36) NOT NULL,
  `granted_by` VARCHAR(36) DEFAULT NULL COMMENT 'User UUID who granted this permission',
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_role_permissions_uuid` (`uuid`),
  UNIQUE KEY `uk_role_permission` (`role_uuid`, `permission_uuid`),
  KEY `idx_role_permissions_role` (`role_uuid`),
  KEY `idx_role_permissions_permission` (`permission_uuid`),
  CONSTRAINT `fk_role_permissions_role` FOREIGN KEY (`role_uuid`) REFERENCES `Roles` (`uuid`) ON DELETE CASCADE,
  CONSTRAINT `fk_role_permissions_permission` FOREIGN KEY (`permission_uuid`) REFERENCES `Permissions` (`uuid`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
COMMENT='Maps roles to their permissions';

-- =====================================================
-- 5. CREATE ROLE_PERMISSION_SCOPES TABLE (WITH UNDERSCORES!)
-- =====================================================
DROP TABLE IF EXISTS `Role_Permission_Scopes`;
CREATE TABLE `Role_Permission_Scopes` (
  `id` INT AUTO_INCREMENT,
  `uuid` VARCHAR(36) NOT NULL,
  `role_uuid` VARCHAR(36) NOT NULL,
  `permission_uuid` VARCHAR(36) NOT NULL,
  `data_scope_uuid` VARCHAR(36) NOT NULL,
  `scope_configuration` JSON DEFAULT NULL COMMENT 'Additional scope constraints',
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_role_perm_scopes_uuid` (`uuid`),
  UNIQUE KEY `uk_role_perm_scope` (`role_uuid`, `permission_uuid`),
  KEY `idx_rps_role` (`role_uuid`),
  KEY `idx_rps_permission` (`permission_uuid`),
  KEY `idx_rps_scope` (`data_scope_uuid`),
  CONSTRAINT `fk_rps_role` FOREIGN KEY (`role_uuid`) REFERENCES `Roles` (`uuid`) ON DELETE CASCADE,
  CONSTRAINT `fk_rps_permission` FOREIGN KEY (`permission_uuid`) REFERENCES `Permissions` (`uuid`) ON DELETE CASCADE,
  CONSTRAINT `fk_rps_datascope` FOREIGN KEY (`data_scope_uuid`) REFERENCES `DataScopes` (`uuid`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
COMMENT='Maps role permissions to their data scopes';

-- =====================================================
-- 6. SEED RESOURCES
-- =====================================================
INSERT INTO `Resources` (`uuid`, `code`, `name`, `description`, `display_order`) VALUES
(UUID(), 'Employees', 'Employees', 'Employee management and records', 10),
(UUID(), 'Attendance', 'Attendance', 'Attendance tracking and logs', 20),
(UUID(), 'Leave', 'Leave', 'Leave requests and balances', 30),
(UUID(), 'Letters', 'Letters', 'Letter templates and requests', 40),
(UUID(), 'Accounts', 'Accounts', 'User account management', 50),
(UUID(), 'Roles', 'Roles', 'Role and permission management', 60),
(UUID(), 'NetworkSettings', 'Network Settings', 'Network configuration', 70),
(UUID(), 'AuditLogs', 'Audit Logs', 'System audit logs', 80),
(UUID(), 'Departments', 'Departments', 'Department management', 90),
(UUID(), 'Positions', 'Positions', 'Position management', 100);

-- =====================================================
-- 7. SEED PERMISSIONS
-- =====================================================
INSERT INTO `Permissions` (`uuid`, `resource_uuid`, `code`, `name`, `action`, `description`, `requires_scope`, `is_sensitive`, `display_order`)
SELECT 
  UUID(),
  (SELECT uuid FROM Resources WHERE code = 'Employees'),
  'Employees.View', 'View Employees', 'View', 'View employee records', 1, 0, 10
UNION ALL SELECT UUID(), (SELECT uuid FROM Resources WHERE code = 'Employees'), 'Employees.Create', 'Create Employee', 'Create', 'Create new employees', 0, 0, 20
UNION ALL SELECT UUID(), (SELECT uuid FROM Resources WHERE code = 'Employees'), 'Employees.Update', 'Update Employee', 'Update', 'Update employee records', 1, 0, 30
UNION ALL SELECT UUID(), (SELECT uuid FROM Resources WHERE code = 'Employees'), 'Employees.Delete', 'Delete Employee', 'Delete', 'Delete employees', 0, 1, 40
UNION ALL SELECT UUID(), (SELECT uuid FROM Resources WHERE code = 'Attendance'), 'Attendance.View', 'View Attendance', 'View', 'View attendance records', 1, 0, 10
UNION ALL SELECT UUID(), (SELECT uuid FROM Resources WHERE code = 'Attendance'), 'Attendance.Create', 'Create Attendance', 'Create', 'Create attendance records', 0, 0, 20
UNION ALL SELECT UUID(), (SELECT uuid FROM Resources WHERE code = 'Attendance'), 'Attendance.Update', 'Update Attendance', 'Update', 'Update attendance records', 1, 0, 30
UNION ALL SELECT UUID(), (SELECT uuid FROM Resources WHERE code = 'Attendance'), 'Attendance.Delete', 'Delete Attendance', 'Delete', 'Delete attendance records', 0, 1, 40
UNION ALL SELECT UUID(), (SELECT uuid FROM Resources WHERE code = 'Leave'), 'Leave.View', 'View Leave', 'View', 'View leave requests', 1, 0, 10
UNION ALL SELECT UUID(), (SELECT uuid FROM Resources WHERE code = 'Leave'), 'Leave.Create', 'Create Leave', 'Create', 'Create leave requests', 0, 0, 20
UNION ALL SELECT UUID(), (SELECT uuid FROM Resources WHERE code = 'Leave'), 'Leave.Update', 'Update Leave', 'Update', 'Update leave requests', 1, 0, 30
UNION ALL SELECT UUID(), (SELECT uuid FROM Resources WHERE code = 'Leave'), 'Leave.Approve', 'Approve Leave', 'Approve', 'Approve leave requests', 1, 0, 40
UNION ALL SELECT UUID(), (SELECT uuid FROM Resources WHERE code = 'Leave'), 'Leave.Reject', 'Reject Leave', 'Reject', 'Reject leave requests', 1, 0, 50
UNION ALL SELECT UUID(), (SELECT uuid FROM Resources WHERE code = 'Leave'), 'Leave.Cancel', 'Cancel Leave', 'Cancel', 'Cancel leave requests', 1, 0, 60
UNION ALL SELECT UUID(), (SELECT uuid FROM Resources WHERE code = 'Letters'), 'Letters.View', 'View Letters', 'View', 'View letter requests', 0, 0, 10
UNION ALL SELECT UUID(), (SELECT uuid FROM Resources WHERE code = 'Letters'), 'Letters.Create', 'Create Letter', 'Create', 'Create letter requests', 0, 0, 20
UNION ALL SELECT UUID(), (SELECT uuid FROM Resources WHERE code = 'Letters'), 'Letters.Update', 'Update Letter', 'Update', 'Update letter requests', 0, 0, 30
UNION ALL SELECT UUID(), (SELECT uuid FROM Resources WHERE code = 'Letters'), 'Letters.Delete', 'Delete Letter', 'Delete', 'Delete letter requests', 0, 1, 40
UNION ALL SELECT UUID(), (SELECT uuid FROM Resources WHERE code = 'Accounts'), 'Accounts.View', 'View Accounts', 'View', 'View user accounts', 0, 0, 10
UNION ALL SELECT UUID(), (SELECT uuid FROM Resources WHERE code = 'Accounts'), 'Accounts.Create', 'Create Account', 'Create', 'Create user accounts', 0, 1, 20
UNION ALL SELECT UUID(), (SELECT uuid FROM Resources WHERE code = 'Accounts'), 'Accounts.Update', 'Update Account', 'Update', 'Update user accounts', 0, 1, 30
UNION ALL SELECT UUID(), (SELECT uuid FROM Resources WHERE code = 'Accounts'), 'Accounts.Delete', 'Delete Account', 'Delete', 'Delete user accounts', 0, 1, 40
UNION ALL SELECT UUID(), (SELECT uuid FROM Resources WHERE code = 'Roles'), 'Roles.View', 'View Roles', 'View', 'View roles and permissions', 0, 0, 10
UNION ALL SELECT UUID(), (SELECT uuid FROM Resources WHERE code = 'Roles'), 'Roles.Create', 'Create Role', 'Create', 'Create new roles', 0, 1, 20
UNION ALL SELECT UUID(), (SELECT uuid FROM Resources WHERE code = 'Roles'), 'Roles.Update', 'Update Role', 'Update', 'Update existing roles', 0, 1, 30
UNION ALL SELECT UUID(), (SELECT uuid FROM Resources WHERE code = 'Roles'), 'Roles.Delete', 'Delete Role', 'Delete', 'Delete roles', 0, 1, 40
UNION ALL SELECT UUID(), (SELECT uuid FROM Resources WHERE code = 'Roles'), 'Roles.AssignPermissions', 'Assign Permissions', 'AssignPermissions', 'Assign permissions to roles', 0, 1, 50
UNION ALL SELECT UUID(), (SELECT uuid FROM Resources WHERE code = 'NetworkSettings'), 'NetworkSettings.View', 'View Network Settings', 'View', 'View network configuration', 0, 0, 10
UNION ALL SELECT UUID(), (SELECT uuid FROM Resources WHERE code = 'NetworkSettings'), 'NetworkSettings.Create', 'Create Network Setting', 'Create', 'Create network settings', 0, 1, 20
UNION ALL SELECT UUID(), (SELECT uuid FROM Resources WHERE code = 'NetworkSettings'), 'NetworkSettings.Update', 'Update Network Setting', 'Update', 'Update network settings', 0, 1, 30
UNION ALL SELECT UUID(), (SELECT uuid FROM Resources WHERE code = 'NetworkSettings'), 'NetworkSettings.Delete', 'Delete Network Setting', 'Delete', 'Delete network settings', 0, 1, 40
UNION ALL SELECT UUID(), (SELECT uuid FROM Resources WHERE code = 'AuditLogs'), 'AuditLogs.View', 'View Audit Logs', 'View', 'View system audit logs', 1, 1, 10
UNION ALL SELECT UUID(), (SELECT uuid FROM Resources WHERE code = 'AuditLogs'), 'AuditLogs.Export', 'Export Audit Logs', 'Export', 'Export audit logs', 0, 1, 20;

-- =====================================================
-- 8. SEED DATA SCOPES
-- =====================================================
INSERT INTO `DataScopes` (`uuid`, `code`, `name`, `scope_type`, `description`, `hierarchy_level`) VALUES
(UUID(), 'ALL', 'All Data', 'STANDARD', 'Access to all data across the organization', 100),
(UUID(), 'ORGANIZATION', 'Organization', 'STANDARD', 'Access to organization-wide data', 90),
(UUID(), 'DEPARTMENT', 'Department', 'STANDARD', 'Access to own department data only', 50),
(UUID(), 'OWN', 'Own Data', 'STANDARD', 'Access to own data only', 10);

-- =====================================================
-- 9. ASSIGN ALL PERMISSIONS TO SUPER_ADMIN
-- =====================================================
INSERT INTO `Role_Permissions` (`uuid`, `role_uuid`, `permission_uuid`, `granted_by`, `created_at`)
SELECT 
  UUID(),
  r.uuid,
  p.uuid,
  NULL,
  NOW()
FROM Roles r
CROSS JOIN Permissions p
WHERE r.code = 'SUPER_ADMIN'
ON DUPLICATE KEY UPDATE uuid=uuid;

-- =====================================================
-- 10. ASSIGN ORGANIZATION SCOPE TO ALL SUPER_ADMIN PERMISSIONS
-- =====================================================
INSERT INTO `Role_Permission_Scopes` (`uuid`, `role_uuid`, `permission_uuid`, `data_scope_uuid`, `created_at`)
SELECT 
  UUID(),
  rp.role_uuid,
  rp.permission_uuid,
  ds.uuid,
  NOW()
FROM Role_Permissions rp
CROSS JOIN DataScopes ds
INNER JOIN Roles r ON rp.role_uuid = r.uuid
WHERE r.code = 'SUPER_ADMIN'
AND ds.code = 'ORGANIZATION'
ON DUPLICATE KEY UPDATE uuid=uuid;

-- =====================================================
-- 11. VERIFICATION
-- =====================================================
SELECT '=== TABLES CREATED ===' as '';
SHOW TABLES LIKE '%Permission%';
SHOW TABLES LIKE 'Resources';
SHOW TABLES LIKE 'DataScopes';

SELECT '=== RECORD COUNTS ===' as '';
SELECT 'Resources' as table_name, COUNT(*) as count FROM Resources
UNION ALL SELECT 'Permissions', COUNT(*) FROM Permissions
UNION ALL SELECT 'DataScopes', COUNT(*) FROM DataScopes
UNION ALL SELECT 'Role_Permissions', COUNT(*) FROM Role_Permissions
UNION ALL SELECT 'Role_Permission_Scopes', COUNT(*) FROM Role_Permission_Scopes;

SELECT '=== SUPER_ADMIN PERMISSIONS ===' as '';
SELECT COUNT(*) as total_permissions
FROM Role_Permissions rp
INNER JOIN Roles r ON rp.role_uuid = r.uuid
WHERE r.code = 'SUPER_ADMIN';

SELECT 'COMPLETE! Now restart your backend server.' as message;

SET FOREIGN_KEY_CHECKS=1;
