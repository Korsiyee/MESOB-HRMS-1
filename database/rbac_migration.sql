-- =====================================================
-- RBAC System Migration Script
-- Purpose: Add granular permission tables to existing database
-- Date: 2026-10-08
-- =====================================================

-- This script adds the new RBAC tables required for granular permission checking
-- It keeps your existing RoleModules table intact for backward compatibility

-- =====================================================
-- 1. CREATE PERMISSIONS TABLE
-- =====================================================

CREATE TABLE IF NOT EXISTS `Permissions` (
  `id` INT AUTO_INCREMENT,
  `uuid` VARCHAR(36) NOT NULL,
  `code` VARCHAR(100) NOT NULL COMMENT 'e.g., NetworkSettings.View, Accounts.Create',
  `resource` VARCHAR(50) NOT NULL COMMENT 'e.g., NetworkSettings, Accounts, AuditLogs',
  `action` VARCHAR(50) NOT NULL COMMENT 'e.g., View, Create, Update, Delete, Export',
  `description` TEXT DEFAULT NULL,
  `requires_scope` TINYINT(1) NOT NULL DEFAULT 0 COMMENT 'Whether this permission requires scope checking',
  `is_active` TINYINT(1) NOT NULL DEFAULT 1,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_permissions_uuid` (`uuid`),
  UNIQUE KEY `uk_permissions_code` (`code`),
  KEY `idx_permissions_resource` (`resource`),
  KEY `idx_permissions_action` (`action`),
  KEY `idx_permissions_active` (`is_active`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
COMMENT='Granular permissions (Resource.Action format)';

-- =====================================================
-- 2. CREATE ROLE_PERMISSIONS TABLE
-- =====================================================

CREATE TABLE IF NOT EXISTS `RolePermissions` (
  `id` INT AUTO_INCREMENT,
  `uuid` VARCHAR(36) NOT NULL,
  `role_uuid` VARCHAR(36) NOT NULL,
  `permission_uuid` VARCHAR(36) NOT NULL,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_rolepermissions_uuid` (`uuid`),
  UNIQUE KEY `uk_role_permission` (`role_uuid`, `permission_uuid`),
  KEY `idx_rolepermissions_role` (`role_uuid`),
  KEY `idx_rolepermissions_permission` (`permission_uuid`),
  CONSTRAINT `fk_rolepermissions_role` FOREIGN KEY (`role_uuid`) REFERENCES `Roles` (`uuid`) ON DELETE CASCADE,
  CONSTRAINT `fk_rolepermissions_permission` FOREIGN KEY (`permission_uuid`) REFERENCES `Permissions` (`uuid`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
COMMENT='Maps roles to their permissions';

-- =====================================================
-- 3. CREATE DATA_SCOPES TABLE (Optional - for scope enforcement)
-- =====================================================

CREATE TABLE IF NOT EXISTS `DataScopes` (
  `id` INT AUTO_INCREMENT,
  `uuid` VARCHAR(36) NOT NULL,
  `code` VARCHAR(50) NOT NULL COMMENT 'e.g., ALL, ORGANIZATION, DEPARTMENT, OWN',
  `name` VARCHAR(100) NOT NULL,
  `description` TEXT DEFAULT NULL,
  `hierarchy_level` INT NOT NULL DEFAULT 0 COMMENT 'Higher = broader scope',
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_datascopes_uuid` (`uuid`),
  UNIQUE KEY `uk_datascopes_code` (`code`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
COMMENT='Data access scopes for permission filtering';

-- =====================================================
-- 4. CREATE ROLE_PERMISSION_SCOPES TABLE (Optional - for scope enforcement)
-- =====================================================

CREATE TABLE IF NOT EXISTS `RolePermissionScopes` (
  `id` INT AUTO_INCREMENT,
  `uuid` VARCHAR(36) NOT NULL,
  `role_uuid` VARCHAR(36) NOT NULL,
  `permission_uuid` VARCHAR(36) NOT NULL,
  `data_scope_uuid` VARCHAR(36) NOT NULL,
  `scope_configuration` JSON DEFAULT NULL COMMENT 'Additional scope constraints',
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_rolepermscopes_uuid` (`uuid`),
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
-- 5. SEED CORE PERMISSIONS
-- =====================================================

-- Insert core permissions for the newly protected pages
INSERT IGNORE INTO `Permissions` (`uuid`, `code`, `resource`, `action`, `description`, `requires_scope`) VALUES
-- Network Settings
(UUID(), 'NetworkSettings.View', 'NetworkSettings', 'View', 'View network settings', 0),
(UUID(), 'NetworkSettings.Create', 'NetworkSettings', 'Create', 'Create network settings', 0),
(UUID(), 'NetworkSettings.Update', 'NetworkSettings', 'Update', 'Update network settings', 0),
(UUID(), 'NetworkSettings.Delete', 'NetworkSettings', 'Delete', 'Delete network settings', 0),

-- Accounts
(UUID(), 'Accounts.View', 'Accounts', 'View', 'View user accounts', 0),
(UUID(), 'Accounts.Create', 'Accounts', 'Create', 'Create user accounts', 0),
(UUID(), 'Accounts.Update', 'Accounts', 'Update', 'Update user accounts', 0),
(UUID(), 'Accounts.Delete', 'Accounts', 'Delete', 'Delete user accounts', 0),

-- Audit Logs
(UUID(), 'AuditLogs.View', 'AuditLogs', 'View', 'View audit logs', 1),
(UUID(), 'AuditLogs.Export', 'AuditLogs', 'Export', 'Export audit logs', 0),

-- Roles & Permissions
(UUID(), 'Roles.View', 'Roles', 'View', 'View roles', 0),
(UUID(), 'Roles.Create', 'Roles', 'Create', 'Create roles', 0),
(UUID(), 'Roles.Update', 'Roles', 'Update', 'Update roles', 0),
(UUID(), 'Roles.Delete', 'Roles', 'Delete', 'Delete roles', 0),
(UUID(), 'Roles.AssignPermissions', 'Roles', 'AssignPermissions', 'Assign permissions to roles', 0),

-- Common permissions (add more as needed)
(UUID(), 'Employees.View', 'Employees', 'View', 'View employees', 1),
(UUID(), 'Employees.Create', 'Employees', 'Create', 'Create employees', 0),
(UUID(), 'Employees.Update', 'Employees', 'Update', 'Update employees', 1),
(UUID(), 'Employees.Delete', 'Employees', 'Delete', 'Delete employees', 0),

(UUID(), 'Attendance.View', 'Attendance', 'View', 'View attendance records', 1),
(UUID(), 'Attendance.Create', 'Attendance', 'Create', 'Create attendance records', 0),
(UUID(), 'Attendance.Update', 'Attendance', 'Update', 'Update attendance records', 1),
(UUID(), 'Attendance.Delete', 'Attendance', 'Delete', 'Delete attendance records', 0),

(UUID(), 'Leave.View', 'Leave', 'View', 'View leave requests', 1),
(UUID(), 'Leave.Create', 'Leave', 'Create', 'Create leave requests', 0),
(UUID(), 'Leave.Update', 'Leave', 'Update', 'Update leave requests', 1),
(UUID(), 'Leave.Approve', 'Leave', 'Approve', 'Approve leave requests', 1),
(UUID(), 'Leave.Reject', 'Leave', 'Reject', 'Reject leave requests', 1),
(UUID(), 'Leave.Cancel', 'Leave', 'Cancel', 'Cancel leave requests', 1),

(UUID(), 'Letters.View', 'Letters', 'View', 'View letters', 0),
(UUID(), 'Letters.Create', 'Letters', 'Create', 'Create letters', 0),
(UUID(), 'Letters.Update', 'Letters', 'Update', 'Update letters', 0),
(UUID(), 'Letters.Delete', 'Letters', 'Delete', 'Delete letters', 0);

-- =====================================================
-- 6. SEED DATA SCOPES (if using scope enforcement)
-- =====================================================

INSERT IGNORE INTO `DataScopes` (`uuid`, `code`, `name`, `description`, `hierarchy_level`) VALUES
(UUID(), 'ALL', 'All Data', 'Access to all data across the organization', 100),
(UUID(), 'ORGANIZATION', 'Organization', 'Access to organization-wide data', 90),
(UUID(), 'DEPARTMENT', 'Department', 'Access to own department data only', 50),
(UUID(), 'OWN', 'Own Data', 'Access to own data only', 10);

-- =====================================================
-- 7. ASSIGN PERMISSIONS TO SUPER_ADMIN
-- =====================================================

-- Give Super Admin all permissions
INSERT INTO `RolePermissions` (`uuid`, `role_uuid`, `permission_uuid`, `created_at`)
SELECT 
  UUID(),
  (SELECT uuid FROM Roles WHERE code = 'SUPER_ADMIN' LIMIT 1),
  p.uuid,
  NOW()
FROM Permissions p
WHERE NOT EXISTS (
  SELECT 1 FROM RolePermissions rp
  WHERE rp.role_uuid = (SELECT uuid FROM Roles WHERE code = 'SUPER_ADMIN' LIMIT 1)
  AND rp.permission_uuid = p.uuid
);

-- =====================================================
-- 8. ASSIGN PERMISSIONS TO HR_ADMIN (Limited Access)
-- =====================================================

-- HR Admin gets view-only for admin pages
INSERT INTO `RolePermissions` (`uuid`, `role_uuid`, `permission_uuid`, `created_at`)
SELECT 
  UUID(),
  (SELECT uuid FROM Roles WHERE code = 'HR_ADMIN' LIMIT 1),
  p.uuid,
  NOW()
FROM Permissions p
WHERE p.code IN (
  'NetworkSettings.View',
  'NetworkSettings.Update',
  'Accounts.View',
  'AuditLogs.View',
  'Roles.View',
  'Employees.View',
  'Employees.Create',
  'Employees.Update',
  'Attendance.View',
  'Attendance.Create',
  'Attendance.Update',
  'Leave.View',
  'Leave.Approve',
  'Leave.Reject',
  'Letters.View',
  'Letters.Create'
)
AND NOT EXISTS (
  SELECT 1 FROM RolePermissions rp
  WHERE rp.role_uuid = (SELECT uuid FROM Roles WHERE code = 'HR_ADMIN' LIMIT 1)
  AND rp.permission_uuid = p.uuid
);

-- =====================================================
-- 9. VERIFICATION QUERY
-- =====================================================

SELECT 
  r.code AS role,
  p.code AS permission,
  p.resource,
  p.action
FROM RolePermissions rp
JOIN Roles r ON rp.role_uuid = r.uuid
JOIN Permissions p ON rp.permission_uuid = p.uuid
WHERE r.code IN ('SUPER_ADMIN', 'HR_ADMIN')
ORDER BY r.code, p.resource, p.action;

-- =====================================================
-- END OF MIGRATION
-- =====================================================
