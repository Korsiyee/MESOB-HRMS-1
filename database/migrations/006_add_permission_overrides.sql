-- ═══════════════════════════════════════════════════════════════════════
-- Migration 006: Add Permission Overrides (ALLOW/DENY)
-- Description: Implement explicit DENY permissions that override inheritance
-- Created: 2026-06-29
-- ═══════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS UserPermissionOverrides (
  uuid VARCHAR(36) PRIMARY KEY,
  user_uuid VARCHAR(36) NOT NULL,
  occupation_uuid VARCHAR(36) NOT NULL,
  effect ENUM('ALLOW', 'DENY') NOT NULL,
  created_by_uuid VARCHAR(36),
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  reason TEXT,
  INDEX idx_permission_overrides_user (user_uuid),
  INDEX idx_permission_overrides_occupation (occupation_uuid),
  INDEX idx_permission_overrides_effect (effect),
  UNIQUE KEY unique_user_occupation_override (user_uuid, occupation_uuid),
  FOREIGN KEY (user_uuid) REFERENCES Users (uuid) ON DELETE CASCADE,
  FOREIGN KEY (occupation_uuid) REFERENCES Occupations (uuid) ON DELETE CASCADE,
  FOREIGN KEY (created_by_uuid) REFERENCES Users (uuid) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Add permissions_version column to Users table for fine-grained token invalidation
ALTER TABLE Users
ADD COLUMN IF NOT EXISTS permissions_version INT NOT NULL DEFAULT 1 AFTER token_version;

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_users_permissions_version ON Users (permissions_version);

-- Update AccessAuditLogs to support new action types
ALTER TABLE AccessAuditLogs
MODIFY COLUMN action_type ENUM(
  'ROLE_OCCUPATION_ASSIGNED',
  'ROLE_OCCUPATION_REMOVED',
  'USER_OCCUPATION_ASSIGNED',
  'USER_OCCUPATION_REMOVED',
  'SCOPE_ASSIGNED',
  'SCOPE_REMOVED',
  'DELEGATION_CREATED',
  'DELEGATION_REVOKED',
  'AUTHORIZATION_DENIED',
  'TOKEN_REVOKED',
  'PERMISSION_CHECKED',
  'PERMISSION_GRANTED',
  'PERMISSION_DENIED',
  'SCOPE_VIOLATION',
  'LOGIN_FAILURE',
  'TOKEN_REFRESH',
  'DELEGATION_EXPIRED',
  'PERMISSION_EXPIRED',
  'PERMISSION_OVERRIDE_ADDED',
  'PERMISSION_OVERRIDE_REMOVED'
) NOT NULL;
