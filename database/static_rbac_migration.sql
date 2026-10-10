-- ============================================================================
-- STATIC RBAC MIGRATION
-- Migrates from dynamic RBAC system to 5 static roles with module-based access
-- ============================================================================
-- This migration:
-- 1. Backs up existing role data
-- 2. Removes obsolete dynamic RBAC tables
-- 3. Creates/ensures correct 3-table structure (Roles, Modules, RoleModules)
-- 4. Seeds 5 static roles
-- 5. Seeds 18 system modules
-- 6. Maps modules to roles based on access requirements
-- ============================================================================

SET FOREIGN_KEY_CHECKS=0;

-- ============================================================================
-- STEP 1: BACKUP EXISTING DATA
-- ============================================================================

-- Backup existing roles (in case we need to reference them)
CREATE TABLE IF NOT EXISTS _backup_roles_before_static_rbac AS
SELECT * FROM Roles WHERE 1=1;

-- Backup existing role assignments from users
CREATE TABLE IF NOT EXISTS _backup_user_roles_before_static_rbac AS
SELECT uuid, username, role_uuid FROM Users WHERE role_uuid IS NOT NULL;

-- ============================================================================
-- STEP 2: DROP OBSOLETE DYNAMIC RBAC TABLES
-- ============================================================================

-- Drop tables related to dynamic permissions and scopes
DROP TABLE IF EXISTS Role_Permission_Scopes;
DROP TABLE IF EXISTS Role_Permissions;
DROP TABLE IF EXISTS RolePermissionScopes;
DROP TABLE IF EXISTS RolePermissions;
DROP TABLE IF EXISTS Permissions;
DROP TABLE IF EXISTS Resources;
DROP TABLE IF EXISTS Scopes;
DROP TABLE IF EXISTS AuthorizationAuditLogs;
DROP TABLE IF EXISTS PermissionOverrides;
DROP TABLE IF EXISTS ScopeOverrides;
DROP TABLE IF EXISTS PermissionDelegations;

-- ============================================================================
-- STEP 3: ENSURE CLEAN 3-TABLE RBAC STRUCTURE
-- ============================================================================

-- Drop and recreate Modules table
DROP TABLE IF EXISTS Modules;
CREATE TABLE Modules (
  uuid VARCHAR(36) NOT NULL,
  code VARCHAR(50) NOT NULL,
  name VARCHAR(100) NOT NULL,
  description TEXT DEFAULT NULL,
  category VARCHAR(50) DEFAULT 'GENERAL',
  icon VARCHAR(50) DEFAULT NULL,
  display_order INT NOT NULL DEFAULT 0,
  is_active TINYINT(1) NOT NULL DEFAULT 1,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (uuid),
  UNIQUE KEY uk_modules_code (code),
  KEY idx_modules_active (is_active),
  KEY idx_modules_category (category),
  KEY idx_modules_display_order (display_order)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Drop and recreate Roles table (static roles only)
DROP TABLE IF EXISTS RoleModules;
DROP TABLE IF EXISTS Roles;
CREATE TABLE Roles (
  uuid VARCHAR(36) NOT NULL,
  code VARCHAR(50) NOT NULL,
  name VARCHAR(100) NOT NULL,
  description TEXT DEFAULT NULL,
  hierarchy_level INT NOT NULL DEFAULT 10,
  is_system_role TINYINT(1) NOT NULL DEFAULT 1,
  is_active TINYINT(1) NOT NULL DEFAULT 1,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (uuid),
  UNIQUE KEY uk_roles_code (code),
  KEY idx_roles_active (is_active),
  KEY idx_roles_hierarchy (hierarchy_level)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Drop and recreate RoleModules table
CREATE TABLE RoleModules (
  uuid VARCHAR(36) NOT NULL,
  role_uuid VARCHAR(36) NOT NULL,
  module_uuid VARCHAR(36) NOT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (uuid),
  UNIQUE KEY uk_rolemodules_role_module (role_uuid, module_uuid),
  KEY idx_rolemodules_role (role_uuid),
  KEY idx_rolemodules_module (module_uuid),
  CONSTRAINT fk_rolemodules_role FOREIGN KEY (role_uuid) REFERENCES Roles (uuid) ON DELETE CASCADE,
  CONSTRAINT fk_rolemodules_module FOREIGN KEY (module_uuid) REFERENCES Modules (uuid) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================================
-- STEP 4: SEED 5 STATIC ROLES
-- ============================================================================

INSERT INTO Roles (uuid, code, name, description, hierarchy_level, is_system_role, is_active) VALUES
(UUID(), 'EMPLOYEE', 'Employee', 'Regular employee with access to personal information and requests', 10, 1, 1),
(UUID(), 'DEPT_HEAD', 'Department Head', 'Department head with access to department management and employee oversight', 20, 1, 1),
(UUID(), 'HR_OFFICER', 'HR Officer', 'HR officer with access to employee records and HR operations', 30, 1, 1),
(UUID(), 'HR_ADMIN', 'HR Admin', 'HR administrator with full access to HR management functions', 40, 1, 1),
(UUID(), 'SUPER_ADMIN', 'Super Admin', 'System administrator with full access to all system functions', 50, 1, 1);

-- ============================================================================
-- STEP 5: SEED 18 SYSTEM MODULES
-- ============================================================================

INSERT INTO Modules (uuid, code, name, description, category, icon, display_order, is_active) VALUES
-- HR Management Modules (HR Admin & Super Admin)
(UUID(), 'EMPLOYEE_LIST', 'Employee List', 'View and manage list of all employees', 'HR_MANAGEMENT', 'users', 1, 1),
(UUID(), 'EMPLOYEE_PROFILE', 'Employee Profile', 'View and edit detailed employee profiles', 'HR_MANAGEMENT', 'user', 2, 1),
(UUID(), 'REGISTER_EMPLOYEE', 'Register Employee', 'Register new employees in the system', 'HR_MANAGEMENT', 'user-plus', 3, 1),
(UUID(), 'DEPARTMENTS', 'Departments', 'Manage organizational departments', 'HR_MANAGEMENT', 'building', 4, 1),
(UUID(), 'POSITIONS', 'Positions', 'Manage employee positions and job titles', 'HR_MANAGEMENT', 'briefcase', 5, 1),
(UUID(), 'LEVELS', 'Levels', 'Manage employee levels and salary grades', 'HR_MANAGEMENT', 'layers', 6, 1),
(UUID(), 'ATTENDANCE_RECORDS', 'Attendance Records', 'View and manage all attendance records', 'HR_MANAGEMENT', 'calendar-check', 7, 1),
(UUID(), 'NETWORK_SETTINGS', 'Network Settings', 'Configure network and system settings', 'HR_MANAGEMENT', 'settings', 8, 1),
(UUID(), 'SHIFTS', 'Shifts', 'Manage work shifts and schedules', 'HR_MANAGEMENT', 'clock', 9, 1),
(UUID(), 'LETTERS', 'Letters', 'Manage employee letters and documents', 'HR_MANAGEMENT', 'file-text', 10, 1),
(UUID(), 'LEAVE_REQUESTS', 'Leave Requests', 'Review and approve leave requests', 'HR_MANAGEMENT', 'calendar-x', 11, 1),
(UUID(), 'LEAVE_SETTINGS', 'Leave Settings', 'Configure leave policies and settings', 'HR_MANAGEMENT', 'settings', 12, 1),
(UUID(), 'ACCOUNTS', 'Accounts', 'Manage user accounts and access', 'HR_MANAGEMENT', 'key', 13, 1),
(UUID(), 'AUDIT_LOGS', 'Audit Logs', 'View system audit logs and activity history', 'HR_MANAGEMENT', 'file-search', 14, 1),

-- Personal Modules (All roles including Employee)
(UUID(), 'MY_ATTENDANCE', 'My Attendance', 'View personal attendance records', 'PERSONAL', 'calendar-check', 15, 1),
(UUID(), 'MY_LETTERS', 'My Letters', 'Request and view personal letters', 'PERSONAL', 'file-text', 16, 1),
(UUID(), 'MY_LEAVES', 'My Leaves', 'Submit and track personal leave requests', 'PERSONAL', 'calendar-x', 17, 1),
(UUID(), 'MY_ACCOUNTS', 'My Accounts', 'Manage personal account settings', 'PERSONAL', 'user-cog', 18, 1);

-- ============================================================================
-- STEP 6: MAP MODULES TO ROLES
-- ============================================================================

-- Get role UUIDs into variables
SET @employee_uuid = (SELECT uuid FROM Roles WHERE code = 'EMPLOYEE');
SET @dept_head_uuid = (SELECT uuid FROM Roles WHERE code = 'DEPT_HEAD');
SET @hr_officer_uuid = (SELECT uuid FROM Roles WHERE code = 'HR_OFFICER');
SET @hr_admin_uuid = (SELECT uuid FROM Roles WHERE code = 'HR_ADMIN');
SET @super_admin_uuid = (SELECT uuid FROM Roles WHERE code = 'SUPER_ADMIN');

-- Get module UUIDs
SET @mod_employee_list = (SELECT uuid FROM Modules WHERE code = 'EMPLOYEE_LIST');
SET @mod_employee_profile = (SELECT uuid FROM Modules WHERE code = 'EMPLOYEE_PROFILE');
SET @mod_register_employee = (SELECT uuid FROM Modules WHERE code = 'REGISTER_EMPLOYEE');
SET @mod_departments = (SELECT uuid FROM Modules WHERE code = 'DEPARTMENTS');
SET @mod_positions = (SELECT uuid FROM Modules WHERE code = 'POSITIONS');
SET @mod_levels = (SELECT uuid FROM Modules WHERE code = 'LEVELS');
SET @mod_attendance_records = (SELECT uuid FROM Modules WHERE code = 'ATTENDANCE_RECORDS');
SET @mod_network_settings = (SELECT uuid FROM Modules WHERE code = 'NETWORK_SETTINGS');
SET @mod_shifts = (SELECT uuid FROM Modules WHERE code = 'SHIFTS');
SET @mod_letters = (SELECT uuid FROM Modules WHERE code = 'LETTERS');
SET @mod_leave_requests = (SELECT uuid FROM Modules WHERE code = 'LEAVE_REQUESTS');
SET @mod_leave_settings = (SELECT uuid FROM Modules WHERE code = 'LEAVE_SETTINGS');
SET @mod_accounts = (SELECT uuid FROM Modules WHERE code = 'ACCOUNTS');
SET @mod_audit_logs = (SELECT uuid FROM Modules WHERE code = 'AUDIT_LOGS');
SET @mod_my_attendance = (SELECT uuid FROM Modules WHERE code = 'MY_ATTENDANCE');
SET @mod_my_letters = (SELECT uuid FROM Modules WHERE code = 'MY_LETTERS');
SET @mod_my_leaves = (SELECT uuid FROM Modules WHERE code = 'MY_LEAVES');
SET @mod_my_accounts = (SELECT uuid FROM Modules WHERE code = 'MY_ACCOUNTS');

-- EMPLOYEE: Only personal modules
INSERT INTO RoleModules (uuid, role_uuid, module_uuid) VALUES
(UUID(), @employee_uuid, @mod_my_attendance),
(UUID(), @employee_uuid, @mod_my_letters),
(UUID(), @employee_uuid, @mod_my_leaves),
(UUID(), @employee_uuid, @mod_my_accounts);

-- DEPT_HEAD: Personal modules + department management
INSERT INTO RoleModules (uuid, role_uuid, module_uuid) VALUES
(UUID(), @dept_head_uuid, @mod_employee_list),
(UUID(), @dept_head_uuid, @mod_employee_profile),
(UUID(), @dept_head_uuid, @mod_departments),
(UUID(), @dept_head_uuid, @mod_attendance_records),
(UUID(), @dept_head_uuid, @mod_leave_requests),
(UUID(), @dept_head_uuid, @mod_my_attendance),
(UUID(), @dept_head_uuid, @mod_my_letters),
(UUID(), @dept_head_uuid, @mod_my_leaves),
(UUID(), @dept_head_uuid, @mod_my_accounts);

-- HR_OFFICER: Most HR modules except critical admin functions
INSERT INTO RoleModules (uuid, role_uuid, module_uuid) VALUES
(UUID(), @hr_officer_uuid, @mod_employee_list),
(UUID(), @hr_officer_uuid, @mod_employee_profile),
(UUID(), @hr_officer_uuid, @mod_departments),
(UUID(), @hr_officer_uuid, @mod_positions),
(UUID(), @hr_officer_uuid, @mod_levels),
(UUID(), @hr_officer_uuid, @mod_attendance_records),
(UUID(), @hr_officer_uuid, @mod_shifts),
(UUID(), @hr_officer_uuid, @mod_letters),
(UUID(), @hr_officer_uuid, @mod_leave_requests),
(UUID(), @hr_officer_uuid, @mod_my_attendance),
(UUID(), @hr_officer_uuid, @mod_my_letters),
(UUID(), @hr_officer_uuid, @mod_my_leaves),
(UUID(), @hr_officer_uuid, @mod_my_accounts);

-- HR_ADMIN: All HR modules
INSERT INTO RoleModules (uuid, role_uuid, module_uuid) VALUES
(UUID(), @hr_admin_uuid, @mod_employee_list),
(UUID(), @hr_admin_uuid, @mod_employee_profile),
(UUID(), @hr_admin_uuid, @mod_register_employee),
(UUID(), @hr_admin_uuid, @mod_departments),
(UUID(), @hr_admin_uuid, @mod_positions),
(UUID(), @hr_admin_uuid, @mod_levels),
(UUID(), @hr_admin_uuid, @mod_attendance_records),
(UUID(), @hr_admin_uuid, @mod_network_settings),
(UUID(), @hr_admin_uuid, @mod_shifts),
(UUID(), @hr_admin_uuid, @mod_letters),
(UUID(), @hr_admin_uuid, @mod_leave_requests),
(UUID(), @hr_admin_uuid, @mod_leave_settings),
(UUID(), @hr_admin_uuid, @mod_accounts),
(UUID(), @hr_admin_uuid, @mod_audit_logs),
(UUID(), @hr_admin_uuid, @mod_my_attendance),
(UUID(), @hr_admin_uuid, @mod_my_letters),
(UUID(), @hr_admin_uuid, @mod_my_leaves),
(UUID(), @hr_admin_uuid, @mod_my_accounts);

-- SUPER_ADMIN: All modules
INSERT INTO RoleModules (uuid, role_uuid, module_uuid) VALUES
(UUID(), @super_admin_uuid, @mod_employee_list),
(UUID(), @super_admin_uuid, @mod_employee_profile),
(UUID(), @super_admin_uuid, @mod_register_employee),
(UUID(), @super_admin_uuid, @mod_departments),
(UUID(), @super_admin_uuid, @mod_positions),
(UUID(), @super_admin_uuid, @mod_levels),
(UUID(), @super_admin_uuid, @mod_attendance_records),
(UUID(), @super_admin_uuid, @mod_network_settings),
(UUID(), @super_admin_uuid, @mod_shifts),
(UUID(), @super_admin_uuid, @mod_letters),
(UUID(), @super_admin_uuid, @mod_leave_requests),
(UUID(), @super_admin_uuid, @mod_leave_settings),
(UUID(), @super_admin_uuid, @mod_accounts),
(UUID(), @super_admin_uuid, @mod_audit_logs),
(UUID(), @super_admin_uuid, @mod_my_attendance),
(UUID(), @super_admin_uuid, @mod_my_letters),
(UUID(), @super_admin_uuid, @mod_my_leaves),
(UUID(), @super_admin_uuid, @mod_my_accounts);

-- ============================================================================
-- STEP 7: MIGRATE EXISTING USERS TO NEW ROLES
-- ============================================================================
-- Map old role names to new static roles
-- This is a best-effort migration based on common role naming patterns

-- Update users with admin-like roles to SUPER_ADMIN
UPDATE Users 
SET role_uuid = @super_admin_uuid
WHERE role_uuid IN (
  SELECT uuid FROM _backup_roles_before_static_rbac 
  WHERE code IN ('ADMIN', 'SUPER_ADMIN', 'SYSTEM_ADMIN', 'ADMINISTRATOR')
);

-- Update users with HR admin roles to HR_ADMIN
UPDATE Users 
SET role_uuid = @hr_admin_uuid
WHERE role_uuid IN (
  SELECT uuid FROM _backup_roles_before_static_rbac 
  WHERE code IN ('HR_ADMIN', 'HR_ADMINISTRATOR', 'HR_MANAGER')
);

-- Update users with HR officer/staff roles to HR_OFFICER
UPDATE Users 
SET role_uuid = @hr_officer_uuid
WHERE role_uuid IN (
  SELECT uuid FROM _backup_roles_before_static_rbac 
  WHERE code IN ('HR_OFFICER', 'HR_STAFF', 'HR_SPECIALIST')
);

-- Update users with department head roles to DEPT_HEAD
UPDATE Users 
SET role_uuid = @dept_head_uuid
WHERE role_uuid IN (
  SELECT uuid FROM _backup_roles_before_static_rbac 
  WHERE code IN ('DEPT_HEAD', 'DEPARTMENT_HEAD', 'MANAGER', 'SUPERVISOR')
);

-- Update remaining users to EMPLOYEE
UPDATE Users 
SET role_uuid = @employee_uuid
WHERE role_uuid NOT IN (@super_admin_uuid, @hr_admin_uuid, @hr_officer_uuid, @dept_head_uuid)
OR role_uuid IS NULL;

-- Ensure all users have a role
UPDATE Users 
SET role_uuid = @employee_uuid
WHERE role_uuid IS NULL;

-- ============================================================================
-- STEP 8: CLEANUP AND VERIFICATION
-- ============================================================================

-- Remove permissions_version column from Users if it exists
ALTER TABLE Users DROP COLUMN IF EXISTS permissions_version;

SET FOREIGN_KEY_CHECKS=1;

-- ============================================================================
-- VERIFICATION QUERIES (Run these to verify migration)
-- ============================================================================

-- Verify roles
SELECT 'ROLES:' as verification;
SELECT code, name, hierarchy_level, is_active FROM Roles ORDER BY hierarchy_level;

-- Verify modules
SELECT 'MODULES:' as verification;
SELECT code, name, category, display_order FROM Modules ORDER BY display_order;

-- Verify role-module mappings
SELECT 'ROLE-MODULE MAPPINGS:' as verification;
SELECT r.code as role_code, r.name as role_name, COUNT(rm.module_uuid) as module_count
FROM Roles r
LEFT JOIN RoleModules rm ON r.uuid = rm.role_uuid
GROUP BY r.uuid, r.code, r.name
ORDER BY r.hierarchy_level;

-- Verify user role distribution
SELECT 'USER ROLE DISTRIBUTION:' as verification;
SELECT r.code as role_code, r.name as role_name, COUNT(u.uuid) as user_count
FROM Roles r
LEFT JOIN Users u ON r.uuid = u.role_uuid
GROUP BY r.uuid, r.code, r.name
ORDER BY r.hierarchy_level;

-- ============================================================================
-- END OF MIGRATION
-- ============================================================================
