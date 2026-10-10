-- =====================================================
-- Fix Role_Permissions Table Name Issue
-- Purpose: Create Role_Permissions table with underscore to match service code expectations
-- Date: 2026-10-09
-- =====================================================

-- Check if RolePermissions exists (without underscore) and Role_Permissions doesn't exist
-- If so, we'll create Role_Permissions and migrate data

-- 1. Create Role_Permissions table (with underscore) if it doesn't exist
CREATE TABLE IF NOT EXISTS `Role_Permissions` (
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
COMMENT='Maps roles to their permissions (with underscore naming convention)';

-- 2. Migrate data from RolePermissions (if it exists) to Role_Permissions
INSERT IGNORE INTO `Role_Permissions` (`uuid`, `role_uuid`, `permission_uuid`, `created_at`)
SELECT `uuid`, `role_uuid`, `permission_uuid`, `created_at`
FROM `RolePermissions`
WHERE EXISTS (SELECT 1 FROM information_schema.tables 
              WHERE table_schema = DATABASE() 
              AND table_name = 'RolePermissions');

-- 3. Create Role_Permission_Scopes table (with underscores) if it doesn't exist
CREATE TABLE IF NOT EXISTS `Role_Permission_Scopes` (
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
COMMENT='Maps role permissions to their data scopes (with underscore naming convention)';

-- 4. Migrate data from RolePermissionScopes (if it exists) to Role_Permission_Scopes
INSERT IGNORE INTO `Role_Permission_Scopes` (`uuid`, `role_uuid`, `permission_uuid`, `data_scope_uuid`, `scope_configuration`, `created_at`)
SELECT `uuid`, `role_uuid`, `permission_uuid`, `data_scope_uuid`, `scope_configuration`, `created_at`
FROM `RolePermissionScopes`
WHERE EXISTS (SELECT 1 FROM information_schema.tables 
              WHERE table_schema = DATABASE() 
              AND table_name = 'RolePermissionScopes');

-- 5. Verification query
SELECT 
  'Role_Permissions' as table_name,
  COUNT(*) as record_count
FROM Role_Permissions
UNION ALL
SELECT 
  'Role_Permission_Scopes' as table_name,
  COUNT(*) as record_count
FROM Role_Permission_Scopes;

-- =====================================================
-- END OF FIX
-- =====================================================
