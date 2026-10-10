-- =====================================================
-- CRITICAL FIX: Role_Permissions Table Missing
-- Error: Table 'mesob_hrms.Role_Permissions' doesn't exist
-- =====================================================
-- 
-- INSTRUCTIONS:
-- Run this file with: mysql -u mesob -p mesob_hrms < FIX_ROLE_PERMISSIONS_NOW.sql
-- 
-- =====================================================

USE mesob_hrms;

-- 1. Create Role_Permissions table (WITH UNDERSCORE)
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
COMMENT='Maps roles to their permissions';

-- 2. Create Role_Permission_Scopes table (WITH UNDERSCORES)
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
COMMENT='Maps role permissions to their data scopes';

-- 3. If RolePermissions exists (without underscore), copy its data
INSERT IGNORE INTO `Role_Permissions` (`uuid`, `role_uuid`, `permission_uuid`, `created_at`)
SELECT `uuid`, `role_uuid`, `permission_uuid`, `created_at`
FROM `RolePermissions`
WHERE EXISTS (
  SELECT 1 FROM information_schema.tables 
  WHERE table_schema = DATABASE() 
  AND table_name = 'RolePermissions'
);

-- 4. If RolePermissionScopes exists (without underscores), copy its data  
INSERT IGNORE INTO `Role_Permission_Scopes` (`uuid`, `role_uuid`, `permission_uuid`, `data_scope_uuid`, `scope_configuration`, `created_at`)
SELECT `uuid`, `role_uuid`, `permission_uuid`, `data_scope_uuid`, `scope_configuration`, `created_at`
FROM `RolePermissionScopes`
WHERE EXISTS (
  SELECT 1 FROM information_schema.tables 
  WHERE table_schema = DATABASE() 
  AND table_name = 'RolePermissionScopes'
);

-- 5. Verification
SELECT '=== TABLE STATUS ===' as '';
SELECT 
  TABLE_NAME,
  TABLE_ROWS,
  CREATE_TIME
FROM information_schema.TABLES
WHERE TABLE_SCHEMA = 'mesob_hrms'
AND TABLE_NAME IN ('Role_Permissions', 'RolePermissions', 'Role_Permission_Scopes', 'RolePermissionScopes')
ORDER BY TABLE_NAME;

SELECT '=== RECORD COUNTS ===' as '';
SELECT 'Role_Permissions' as table_name, COUNT(*) as record_count FROM Role_Permissions
UNION ALL
SELECT 'Role_Permission_Scopes' as table_name, COUNT(*) as record_count FROM Role_Permission_Scopes;

SELECT '=== FIX COMPLETE ===' as '';
SELECT 'The Role_Permissions table has been created successfully!' as message;
SELECT 'Please restart your backend server for changes to take effect.' as next_step;
