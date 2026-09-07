-- ═══════════════════════════════════════════════════════════════════════
-- Migration 003: Add RBAC Tables
-- Description: Create Role-Based Access Control tables for hybrid authorization
-- Created: 2026-06-29
-- ═══════════════════════════════════════════════════════════════════════

-- ═══════════════════════════════════════════════════════════════════════
-- 1. RoleOccupations Table
-- Maps roles to occupations (default permissions per role)
-- ═══════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS RoleOccupations (
  uuid VARCHAR(36) PRIMARY KEY,
  role ENUM('EMPLOYEE','DEPARTMENT_HEAD','HR_OFFICER','HR_ADMIN','SUPER_ADMIN') NOT NULL,
  occupation_uuid VARCHAR(36) NOT NULL,
  assigned_by_uuid VARCHAR(36),
  assigned_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  assigned_reason TEXT,
  INDEX idx_role_occupations_role (role),
  INDEX idx_role_occupations_occupation (occupation_uuid),
  UNIQUE KEY unique_role_occupation (role, occupation_uuid),
  FOREIGN KEY (occupation_uuid) REFERENCES Occupations (uuid) ON DELETE CASCADE,
  FOREIGN KEY (assigned_by_uuid) REFERENCES Users (uuid) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ═══════════════════════════════════════════════════════════════════════
-- 2. UserScopes Table
-- Defines data access boundaries per user (SELF, DEPARTMENT, BRANCH, COMPANY, ALL)
-- ═══════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS UserScopes (
  uuid VARCHAR(36) PRIMARY KEY,
  user_uuid VARCHAR(36) NOT NULL,
  scope_type ENUM('SELF','DEPARTMENT','BRANCH','COMPANY','ALL') NOT NULL,
  scope_value VARCHAR(36),
  assigned_by_uuid VARCHAR(36),
  assigned_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  assigned_reason TEXT,
  INDEX idx_user_scopes_user (user_uuid),
  INDEX idx_user_scopes_type (scope_type),
  FOREIGN KEY (user_uuid) REFERENCES Users (uuid) ON DELETE CASCADE,
  FOREIGN KEY (assigned_by_uuid) REFERENCES Users (uuid) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ═══════════════════════════════════════════════════════════════════════
-- 3. OccupationDelegations Table
-- Manages temporary permission grants (time-bound)
-- ═══════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS OccupationDelegations (
  uuid VARCHAR(36) PRIMARY KEY,
  delegator_user_uuid VARCHAR(36) NOT NULL,
  delegatee_user_uuid VARCHAR(36) NOT NULL,
  occupation_uuid VARCHAR(36) NOT NULL,
  start_date DATETIME NOT NULL,
  end_date DATETIME NOT NULL,
  delegation_reason TEXT,
  revoked_at DATETIME,
  revoked_by_uuid VARCHAR(36),
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_delegations_delegatee (delegatee_user_uuid),
  INDEX idx_delegations_delegator (delegator_user_uuid),
  INDEX idx_delegations_active (end_date, revoked_at),
  INDEX idx_delegations_occupation (occupation_uuid),
  CHECK (end_date > start_date),
  FOREIGN KEY (delegator_user_uuid) REFERENCES Users (uuid) ON DELETE CASCADE,
  FOREIGN KEY (delegatee_user_uuid) REFERENCES Users (uuid) ON DELETE CASCADE,
  FOREIGN KEY (occupation_uuid) REFERENCES Occupations (uuid) ON DELETE CASCADE,
  FOREIGN KEY (revoked_by_uuid) REFERENCES Users (uuid) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ═══════════════════════════════════════════════════════════════════════
-- 4. AccessAuditLogs Table
-- Comprehensive audit trail for all permission changes (immutable)
-- ═══════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS AccessAuditLogs (
  uuid VARCHAR(36) PRIMARY KEY,
  actor_user_uuid VARCHAR(36),
  target_user_uuid VARCHAR(36),
  action_type ENUM(
    'ROLE_OCCUPATION_ASSIGNED',
    'ROLE_OCCUPATION_REMOVED',
    'USER_OCCUPATION_ASSIGNED',
    'USER_OCCUPATION_REMOVED',
    'SCOPE_ASSIGNED',
    'SCOPE_REMOVED',
    'DELEGATION_CREATED',
    'DELEGATION_REVOKED',
    'AUTHORIZATION_DENIED',
    'TOKEN_REVOKED'
  ) NOT NULL,
  resource_type VARCHAR(50),
  resource_uuid VARCHAR(36),
  old_value TEXT,
  new_value TEXT,
  reason TEXT,
  ip_address VARCHAR(45),
  user_agent TEXT,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_audit_logs_actor (actor_user_uuid, created_at),
  INDEX idx_audit_logs_target (target_user_uuid, created_at),
  INDEX idx_audit_logs_action (action_type, created_at),
  INDEX idx_audit_logs_created (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Note: No foreign keys on actor/target UUIDs to preserve audit logs even after user deletion
