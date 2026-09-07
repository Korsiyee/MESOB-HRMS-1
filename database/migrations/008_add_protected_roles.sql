-- ═══════════════════════════════════════════════════════════════════════
-- Migration 008: Protect Built-in Roles
-- Description: Mark system roles as protected from deletion/modification
-- Created: 2026-06-29
-- ═══════════════════════════════════════════════════════════════════════

-- Create ProtectedRoles table
CREATE TABLE IF NOT EXISTS ProtectedRoles (
  role ENUM('EMPLOYEE','DEPARTMENT_HEAD','HR_OFFICER','HR_ADMIN','SUPER_ADMIN') PRIMARY KEY,
  is_system_role BOOLEAN NOT NULL DEFAULT TRUE,
  can_delete BOOLEAN NOT NULL DEFAULT FALSE,
  can_rename BOOLEAN NOT NULL DEFAULT FALSE,
  can_modify_hierarchy BOOLEAN NOT NULL DEFAULT FALSE,
  description TEXT,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Seed protected roles
INSERT INTO ProtectedRoles (role, is_system_role, can_delete, can_rename, can_modify_hierarchy, description)
VALUES
  ('SUPER_ADMIN', TRUE, FALSE, FALSE, FALSE, 'System administrator with full access'),
  ('HR_ADMIN', TRUE, FALSE, FALSE, FALSE, 'HR administrator with full HR access'),
  ('HR_OFFICER', TRUE, FALSE, FALSE, FALSE, 'HR officer with operational HR access'),
  ('DEPARTMENT_HEAD', TRUE, FALSE, FALSE, FALSE, 'Department head with departmental oversight'),
  ('EMPLOYEE', TRUE, FALSE, FALSE, FALSE, 'Regular employee with self-service access')
ON DUPLICATE KEY UPDATE
  is_system_role = VALUES(is_system_role),
  description = VALUES(description);
