-- ═══════════════════════════════════════════════════════════════════════
-- Migration 100: RBAC System Refactor
-- Description: Replace occupation-based system with simple Role→Permission model
-- Created: 2026-09-08
-- Status: BREAKING CHANGE - Systematic migration from old RBAC
-- ═══════════════════════════════════════════════════════════════════════

-- ═══════════════════════════════════════════════════════════════════════
-- STEP 1: CREATE NEW RBAC TABLES
-- ═══════════════════════════════════════════════════════════════════════

-- Roles table: System roles with privilege hierarchy
CREATE TABLE IF NOT EXISTS Roles (
  id INT AUTO_INCREMENT PRIMARY KEY,
  uuid VARCHAR(36) NOT NULL UNIQUE,
  name VARCHAR(100) NOT NULL UNIQUE COMMENT 'Display name: "Employee", "HR Admin"',
  code VARCHAR(50) NOT NULL UNIQUE COMMENT 'Internal code: "EMPLOYEE", "HR_ADMIN"',
  rank INT NOT NULL UNIQUE COMMENT 'Privilege hierarchy: higher rank = more privilege',
  description TEXT,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_roles_code (code),
  INDEX idx_roles_rank (rank),
  INDEX idx_roles_active (is_active)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='System roles with hierarchical privileges';

-- Permissions table: Fine-grained permissions (resource.action format)
CREATE TABLE IF NOT EXISTS Permissions (
  id INT AUTO_INCREMENT PRIMARY KEY,
  uuid VARCHAR(36) NOT NULL UNIQUE,
  resource VARCHAR(100) NOT NULL COMMENT 'Resource name: employees, leave, attendance',
  action VARCHAR(100) NOT NULL COMMENT 'Action: view, create, update, delete, approve',
  code VARCHAR(200) NOT NULL UNIQUE COMMENT 'Full code: employees.view, leave.approve',
  description TEXT,
  requires_scope BOOLEAN NOT NULL DEFAULT FALSE COMMENT 'Whether this permission uses data scoping',
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_permissions_code (code),
  INDEX idx_permissions_resource (resource),
  INDEX idx_permissions_active (is_active),
  UNIQUE KEY unique_resource_action (resource, action)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='Fine-grained permissions for authorization';

-- RolePermissions table: Maps roles to permissions
CREATE TABLE IF NOT EXISTS RolePermissions (
  id INT AUTO_INCREMENT PRIMARY KEY,
  uuid VARCHAR(36) NOT NULL UNIQUE,
  role_id INT NOT NULL,
  permission_id INT NOT NULL,
  assigned_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  assigned_by_uuid VARCHAR(36) NULL COMMENT 'User who assigned this permission',
  assigned_reason TEXT,
  INDEX idx_role_perms_role (role_id),
  INDEX idx_role_perms_permission (permission_id),
  UNIQUE KEY unique_role_permission (role_id, permission_id),
  FOREIGN KEY (role_id) REFERENCES Roles(id) ON DELETE CASCADE,
  FOREIGN KEY (permission_id) REFERENCES Permissions(id) ON DELETE CASCADE,
  FOREIGN KEY (assigned_by_uuid) REFERENCES Users(uuid) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='Role-to-Permission mappings';

-- Simplified UserScopes table (restructured, not recreated)
CREATE TABLE IF NOT EXISTS UserScopes_New (
  id INT AUTO_INCREMENT PRIMARY KEY,
  uuid VARCHAR(36) NOT NULL UNIQUE,
  user_uuid VARCHAR(36) NOT NULL,
  scope_type ENUM('SELF','DEPARTMENT','BRANCH','COMPANY','ALL') NOT NULL,
  scope_value VARCHAR(36) NULL COMMENT 'department_uuid, branch_uuid, etc. (NULL for SELF/ALL)',
  assigned_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  assigned_by_uuid VARCHAR(36) NULL,
  assigned_reason TEXT,
  INDEX idx_user_scopes_user (user_uuid),
  INDEX idx_user_scopes_type (scope_type),
  FOREIGN KEY (user_uuid) REFERENCES Users(uuid) ON DELETE CASCADE,
  FOREIGN KEY (assigned_by_uuid) REFERENCES Users(uuid) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='Data access scopes per user';

-- AuthorizationAuditLogs table (rename and enhance AccessAuditLogs)
CREATE TABLE IF NOT EXISTS AuthorizationAuditLogs (
  id INT AUTO_INCREMENT PRIMARY KEY,
  uuid VARCHAR(36) NOT NULL UNIQUE,
  actor_user_uuid VARCHAR(36) NULL COMMENT 'User who performed the action (NULL for system)',
  target_user_uuid VARCHAR(36) NULL COMMENT 'User affected by the action',
  action_type VARCHAR(100) NOT NULL,
  resource_type VARCHAR(100) NULL,
  resource_uuid VARCHAR(36) NULL,
  old_value JSON NULL COMMENT 'Previous state',
  new_value JSON NULL COMMENT 'New state',
  reason TEXT,
  ip_address VARCHAR(45) NULL,
  user_agent TEXT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_authz_audit_actor (actor_user_uuid, created_at),
  INDEX idx_authz_audit_target (target_user_uuid, created_at),
  INDEX idx_authz_audit_action (action_type, created_at),
  INDEX idx_authz_audit_created (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='Comprehensive authorization audit trail';

-- ═══════════════════════════════════════════════════════════════════════
-- STEP 2: SEED ROLES WITH HIERARCHY
-- ═══════════════════════════════════════════════════════════════════════

INSERT INTO Roles (uuid, name, code, rank, description) VALUES
  (UUID(), 'Employee', 'EMPLOYEE', 10, 'Standard employee with self-service capabilities'),
  (UUID(), 'Department Head', 'DEPARTMENT_HEAD', 20, 'Department manager with team oversight'),
  (UUID(), 'HR Officer', 'HR_OFFICER', 30, 'HR staff with operational capabilities'),
  (UUID(), 'HR Admin', 'HR_ADMIN', 40, 'HR administrator with full HR management'),
  (UUID(), 'Super Admin', 'SUPER_ADMIN', 50, 'System administrator with unrestricted access');

-- ═══════════════════════════════════════════════════════════════════════
-- STEP 3: SEED PERMISSIONS (Mapped from Occupations)
-- ═══════════════════════════════════════════════════════════════════════

INSERT INTO Permissions (uuid, resource, action, code, description, requires_scope) VALUES
  -- Dashboard
  (UUID(), 'dashboard', 'view', 'dashboard.view', 'View dashboard and analytics', FALSE),
  
  -- Account (self-service)
  (UUID(), 'account', 'view_own', 'account.view_own', 'View own account information', FALSE),
  (UUID(), 'account', 'update_own', 'account.update_own', 'Update own account settings', FALSE),
  
  -- Accounts (admin)
  (UUID(), 'accounts', 'view', 'accounts.view', 'View user accounts', TRUE),
  (UUID(), 'accounts', 'create', 'accounts.create', 'Create new user accounts', FALSE),
  (UUID(), 'accounts', 'update', 'accounts.update', 'Update user accounts', FALSE),
  (UUID(), 'accounts', 'update_role', 'accounts.update_role', 'Change user roles', FALSE),
  (UUID(), 'accounts', 'deactivate', 'accounts.deactivate', 'Deactivate user accounts', FALSE),
  (UUID(), 'accounts', 'reset_password', 'accounts.reset_password', 'Reset user passwords', FALSE),
  
  -- Employees
  (UUID(), 'employees', 'view', 'employees.view', 'View employee information', TRUE),
  (UUID(), 'employees', 'view_own', 'employees.view_own', 'View own employee profile', FALSE),
  (UUID(), 'employees', 'create', 'employees.create', 'Register new employees', FALSE),
  (UUID(), 'employees', 'update', 'employees.update', 'Update employee information', TRUE),
  (UUID(), 'employees', 'update_own', 'employees.update_own', 'Update own employee information', FALSE),
  (UUID(), 'employees', 'delete', 'employees.delete', 'Delete employee records', FALSE),
  
  -- Departments
  (UUID(), 'departments', 'view', 'departments.view', 'View departments', FALSE),
  (UUID(), 'departments', 'create', 'departments.create', 'Create departments', FALSE),
  (UUID(), 'departments', 'update', 'departments.update', 'Update departments', FALSE),
  (UUID(), 'departments', 'delete', 'departments.delete', 'Delete departments', FALSE),
  
  -- Positions
  (UUID(), 'positions', 'view', 'positions.view', 'View positions', FALSE),
  (UUID(), 'positions', 'create', 'positions.create', 'Create positions', FALSE),
  (UUID(), 'positions', 'update', 'positions.update', 'Update positions', FALSE),
  (UUID(), 'positions', 'delete', 'positions.delete', 'Delete positions', FALSE),
  
  -- Levels
  (UUID(), 'levels', 'view', 'levels.view', 'View levels', FALSE),
  (UUID(), 'levels', 'create', 'levels.create', 'Create levels', FALSE),
  (UUID(), 'levels', 'update', 'levels.update', 'Update levels', FALSE),
  (UUID(), 'levels', 'delete', 'levels.delete', 'Delete levels', FALSE),
  
  -- Leave (employee self-service)
  (UUID(), 'leave', 'view_own', 'leave.view_own', 'View own leave requests and balance', FALSE),
  (UUID(), 'leave', 'create_own', 'leave.create_own', 'Create own leave requests', FALSE),
  (UUID(), 'leave', 'update_own', 'leave.update_own', 'Update own pending leave requests', FALSE),
  (UUID(), 'leave', 'cancel_own', 'leave.cancel_own', 'Cancel own leave requests', FALSE),
  
  -- Leave (management)
  (UUID(), 'leave', 'view_all', 'leave.view_all', 'View all leave requests', TRUE),
  (UUID(), 'leave', 'view_pending', 'leave.view_pending', 'View pending leave requests for approval', TRUE),
  (UUID(), 'leave', 'approve', 'leave.approve', 'Approve leave requests', TRUE),
  (UUID(), 'leave', 'reject', 'leave.reject', 'Reject leave requests', TRUE),
  (UUID(), 'leave', 'shorten', 'leave.shorten', 'Shorten approved leave requests', TRUE),
  (UUID(), 'leave', 'view_balances', 'leave.view_balances', 'View employee leave balances', TRUE),
  
  -- Leave Policies
  (UUID(), 'leave_policies', 'view', 'leave_policies.view', 'View leave policies', FALSE),
  (UUID(), 'leave_policies', 'manage', 'leave_policies.manage', 'Manage leave policies', FALSE),
  
  -- Attendance
  (UUID(), 'attendance', 'view_own', 'attendance.view_own', 'View own attendance records', FALSE),
  (UUID(), 'attendance', 'punch', 'attendance.punch', 'Record attendance check-in/out', FALSE),
  (UUID(), 'attendance', 'view', 'attendance.view', 'View attendance records', TRUE),
  (UUID(), 'attendance', 'manage', 'attendance.manage', 'Manage attendance (corrections, manual entry)', TRUE),
  
  -- Shifts
  (UUID(), 'shifts', 'view', 'shifts.view', 'View shift definitions', FALSE),
  (UUID(), 'shifts', 'create', 'shifts.create', 'Create shift definitions', FALSE),
  (UUID(), 'shifts', 'update', 'shifts.update', 'Update shift definitions', FALSE),
  (UUID(), 'shifts', 'delete', 'shifts.delete', 'Delete shift definitions', FALSE),
  (UUID(), 'shifts', 'assign', 'shifts.assign', 'Assign shifts to employees', TRUE),
  
  -- Letters
  (UUID(), 'letters', 'request', 'letters.request', 'Request letters from templates', FALSE),
  (UUID(), 'letters', 'view_own', 'letters.view_own', 'View own letter requests and issued letters', FALSE),
  (UUID(), 'letters', 'view_all', 'letters.view_all', 'View all letter requests', FALSE),
  (UUID(), 'letters', 'manage_templates', 'letters.manage_templates', 'Create/update letter templates', FALSE),
  (UUID(), 'letters', 'generate', 'letters.generate', 'Generate letters for employees', FALSE),
  (UUID(), 'letters', 'approve_requests', 'letters.approve_requests', 'Approve/reject letter requests', FALSE),
  
  -- Notifications
  (UUID(), 'notifications', 'view_own', 'notifications.view_own', 'View own notifications', FALSE),
  (UUID(), 'notifications', 'manage_own', 'notifications.manage_own', 'Manage own notifications', FALSE),
  (UUID(), 'notifications', 'view_all', 'notifications.view_all', 'View all user notifications', FALSE),
  
  -- Network Settings
  (UUID(), 'network_settings', 'view', 'network_settings.view', 'View network settings', FALSE),
  (UUID(), 'network_settings', 'manage', 'network_settings.manage', 'Manage network settings', FALSE),
  
  -- Audit Logs
  (UUID(), 'audit', 'view', 'audit.view', 'View audit logs', FALSE),
  
  -- RBAC Management
  (UUID(), 'rbac', 'view', 'rbac.view', 'View roles and permissions', FALSE),
  (UUID(), 'rbac', 'manage', 'rbac.manage', 'Manage roles and permissions', FALSE);

-- ═══════════════════════════════════════════════════════════════════════
-- STEP 4: SEED ROLE-PERMISSION MAPPINGS (Based on old RoleOccupations)
-- ═══════════════════════════════════════════════════════════════════════

-- Employee permissions
INSERT INTO RolePermissions (uuid, role_id, permission_id, assigned_reason)
SELECT 
  UUID(),
  (SELECT id FROM Roles WHERE code = 'EMPLOYEE'),
  p.id,
  'Default permission for Employee role'
FROM Permissions p
WHERE p.code IN (
  'dashboard.view',
  'account.view_own',
  'account.update_own',
  'employees.view_own',
  'employees.update_own',
  'leave.view_own',
  'leave.create_own',
  'leave.update_own',
  'leave.cancel_own',
  'attendance.view_own',
  'attendance.punch',
  'letters.request',
  'letters.view_own',
  'notifications.view_own',
  'notifications.manage_own'
);

-- Department Head permissions (includes Employee + management)
INSERT INTO RolePermissions (uuid, role_id, permission_id, assigned_reason)
SELECT 
  UUID(),
  (SELECT id FROM Roles WHERE code = 'DEPARTMENT_HEAD'),
  p.id,
  'Default permission for Department Head role'
FROM Permissions p
WHERE p.code IN (
  'dashboard.view',
  'account.view_own',
  'account.update_own',
  'employees.view_own',
  'employees.view',
  'employees.update_own',
  'leave.view_own',
  'leave.create_own',
  'leave.update_own',
  'leave.cancel_own',
  'leave.view_pending',
  'leave.approve',
  'leave.reject',
  'attendance.view_own',
  'attendance.view',
  'attendance.punch',
  'shifts.view',
  'letters.request',
  'letters.view_own',
  'notifications.view_own',
  'notifications.manage_own'
);

-- HR Officer permissions (comprehensive HR operations)
INSERT INTO RolePermissions (uuid, role_id, permission_id, assigned_reason)
SELECT 
  UUID(),
  (SELECT id FROM Roles WHERE code = 'HR_OFFICER'),
  p.id,
  'Default permission for HR Officer role'
FROM Permissions p
WHERE p.code IN (
  'dashboard.view',
  'account.view_own',
  'account.update_own',
  'employees.view_own',
  'employees.view',
  'employees.create',
  'employees.update',
  'employees.update_own',
  'departments.view',
  'departments.create',
  'departments.update',
  'positions.view',
  'positions.create',
  'positions.update',
  'levels.view',
  'levels.create',
  'levels.update',
  'leave.view_own',
  'leave.create_own',
  'leave.update_own',
  'leave.cancel_own',
  'leave.view_all',
  'leave.view_pending',
  'leave.approve',
  'leave.reject',
  'leave.shorten',
  'leave.view_balances',
  'leave_policies.view',
  'attendance.view_own',
  'attendance.view',
  'attendance.manage',
  'attendance.punch',
  'shifts.view',
  'shifts.create',
  'shifts.update',
  'shifts.assign',
  'letters.request',
  'letters.view_own',
  'letters.view_all',
  'letters.manage_templates',
  'letters.generate',
  'letters.approve_requests',
  'notifications.view_own',
  'notifications.manage_own'
);

-- HR Admin permissions (full HR administrative access)
INSERT INTO RolePermissions (uuid, role_id, permission_id, assigned_reason)
SELECT 
  UUID(),
  (SELECT id FROM Roles WHERE code = 'HR_ADMIN'),
  p.id,
  'Default permission for HR Admin role'
FROM Permissions p
WHERE p.code NOT IN ('audit.view', 'rbac.manage'); -- Everything except audit logs and RBAC management

-- Super Admin permissions (unrestricted access)
INSERT INTO RolePermissions (uuid, role_id, permission_id, assigned_reason)
SELECT 
  UUID(),
  (SELECT id FROM Roles WHERE code = 'SUPER_ADMIN'),
  p.id,
  'Super Admin has unrestricted access to all features'
FROM Permissions p;

-- ═══════════════════════════════════════════════════════════════════════
-- STEP 5: MODIFY USERS TABLE
-- ═══════════════════════════════════════════════════════════════════════

-- Add new columns to Users table
ALTER TABLE Users 
ADD COLUMN role_id INT NULL COMMENT 'Foreign key to Roles table' AFTER role,
ADD COLUMN permissions_version INT NOT NULL DEFAULT 1 COMMENT 'Incremented when permissions change (forces token refresh)' AFTER token_version,
ADD COLUMN last_activity DATETIME NULL COMMENT 'Last authenticated request timestamp' AFTER last_login,
ADD INDEX idx_users_role_id (role_id);

-- Populate role_id based on existing role ENUM
UPDATE Users u
SET u.role_id = (SELECT r.id FROM Roles r WHERE r.code = u.role);

-- Verify all users have role_id
-- (This should succeed if all ENUM values match seeded role codes)
SELECT COUNT(*) as users_without_role FROM Users WHERE role_id IS NULL;

-- Add foreign key constraint after population
ALTER TABLE Users
ADD CONSTRAINT fk_users_role
FOREIGN KEY (role_id) REFERENCES Roles(id) ON DELETE RESTRICT;

-- ═══════════════════════════════════════════════════════════════════════
-- STEP 6: MIGRATE USER SCOPES (Keep Existing UserScopes Data)
-- ═══════════════════════════════════════════════════════════════════════

-- Migrate data from old UserScopes to UserScopes_New (if old table has data)
INSERT INTO UserScopes_New (uuid, user_uuid, scope_type, scope_value, assigned_at, assigned_by_uuid, assigned_reason)
SELECT uuid, user_uuid, scope_type, scope_value, assigned_at, assigned_by_uuid, assigned_reason
FROM UserScopes
WHERE NOT EXISTS (SELECT 1 FROM UserScopes_New WHERE UserScopes_New.uuid = UserScopes.uuid);

-- Rename tables
RENAME TABLE UserScopes TO UserScopes_Old;
RENAME TABLE UserScopes_New TO UserScopes;

-- ═══════════════════════════════════════════════════════════════════════
-- STEP 7: MIGRATE AUDIT LOGS
-- ═══════════════════════════════════════════════════════════════════════

-- Copy data from AccessAuditLogs to new AuthorizationAuditLogs
INSERT INTO AuthorizationAuditLogs 
  (uuid, actor_user_uuid, target_user_uuid, action_type, resource_type, resource_uuid, 
   old_value, new_value, reason, ip_address, user_agent, created_at)
SELECT 
  uuid, 
  actor_user_uuid, 
  target_user_uuid, 
  action_type, 
  resource_type, 
  resource_uuid,
  JSON_OBJECT('value', old_value) as old_value,
  JSON_OBJECT('value', new_value) as new_value,
  reason,
  ip_address,
  user_agent,
  created_at
FROM AccessAuditLogs;

-- Rename old table
RENAME TABLE AccessAuditLogs TO AccessAuditLogs_Old;

-- ═══════════════════════════════════════════════════════════════════════
-- STEP 8: MARK OLD RBAC TABLES FOR DEPRECATION (DO NOT DROP YET)
-- ═══════════════════════════════════════════════════════════════════════

-- Rename old RBAC tables with _Deprecated suffix for safety
-- These will be dropped in a future migration after full verification

RENAME TABLE Occupations TO Occupations_Deprecated;
RENAME TABLE RoleOccupations TO RoleOccupations_Deprecated;
RENAME TABLE EmployeeOccupations TO EmployeeOccupations_Deprecated;
RENAME TABLE OccupationDelegations TO OccupationDelegations_Deprecated;

-- If UserPermissionOverrides table exists, deprecate it
-- (This table was added in migration 006 but may not exist)
SET @table_exists = (SELECT COUNT(*) FROM information_schema.tables 
  WHERE table_schema = DATABASE() AND table_name = 'UserPermissionOverrides');

SET @rename_query = IF(@table_exists > 0,
  'RENAME TABLE UserPermissionOverrides TO UserPermissionOverrides_Deprecated',
  'SELECT "UserPermissionOverrides table does not exist, skipping" as message');

PREPARE stmt FROM @rename_query;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Remove occupation_uuid from Employees table (deprecated foreign key)
ALTER TABLE Employees DROP FOREIGN KEY IF EXISTS Employees_ibfk_3;
-- ALTER TABLE Employees DROP COLUMN occupation_uuid; -- Keep for now, remove later

-- ═══════════════════════════════════════════════════════════════════════
-- STEP 9: CREATE SYSTEM ACTOR FOR AUDIT LOGS
-- ═══════════════════════════════════════════════════════════════════════

-- Add a special UUID constant for system-initiated actions
-- Store in a lookup table for clean reference

CREATE TABLE IF NOT EXISTS SystemActors (
  uuid VARCHAR(36) PRIMARY KEY,
  name VARCHAR(100) NOT NULL UNIQUE,
  description TEXT,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='System actor identifiers for audit logs';

INSERT INTO SystemActors (uuid, name, description) VALUES
  ('00000000-0000-0000-0000-000000000001', 'SYSTEM', 'System-initiated automated actions'),
  ('00000000-0000-0000-0000-000000000002', 'MIGRATION', 'Database migration scripts');

-- ═══════════════════════════════════════════════════════════════════════
-- STEP 10: RECORD MIGRATION IN AUDIT LOG
-- ═══════════════════════════════════════════════════════════════════════

INSERT INTO AuthorizationAuditLogs (uuid, actor_user_uuid, action_type, resource_type, reason, created_at)
VALUES (
  UUID(),
  '00000000-0000-0000-0000-000000000002',
  'RBAC_SYSTEM_MIGRATED',
  'Authorization',
  'Migrated from occupation-based RBAC to role-permission-based RBAC (Migration 100)',
  CURRENT_TIMESTAMP
);

-- ═══════════════════════════════════════════════════════════════════════
-- VERIFICATION QUERIES (Run after migration)
-- ═══════════════════════════════════════════════════════════════════════

-- SELECT 'Migration 100 Verification' as status;
-- SELECT COUNT(*) as total_roles FROM Roles;
-- SELECT COUNT(*) as total_permissions FROM Permissions;
-- SELECT COUNT(*) as total_role_permissions FROM RolePermissions;
-- SELECT COUNT(*) as users_with_role_id FROM Users WHERE role_id IS NOT NULL;
-- SELECT COUNT(*) as users_without_role_id FROM Users WHERE role_id IS NULL;
-- SELECT r.code, COUNT(rp.id) as permission_count 
-- FROM Roles r 
-- LEFT JOIN RolePermissions rp ON r.id = rp.role_id 
-- GROUP BY r.id, r.code
-- ORDER BY r.rank;

-- ═══════════════════════════════════════════════════════════════════════
-- MIGRATION COMPLETE
-- ═══════════════════════════════════════════════════════════════════════
