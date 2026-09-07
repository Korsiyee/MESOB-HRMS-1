-- ═══════════════════════════════════════════════════════════════════════
-- Migration 004: Enhance EmployeeOccupations Table
-- Description: Add time-bound assignment support and audit fields
-- Created: 2026-06-29
-- ═══════════════════════════════════════════════════════════════════════

-- Add new columns for time-bound assignments and audit trail
ALTER TABLE EmployeeOccupations
ADD COLUMN IF NOT EXISTS expires_at DATETIME NULL AFTER occupation_uuid,
ADD COLUMN IF NOT EXISTS assigned_reason TEXT NULL AFTER expires_at,
ADD INDEX IF NOT EXISTS idx_employee_occupations_expires (expires_at);

-- Note: expires_at = NULL means permanent assignment
-- Note: expires_at = future date means time-bound assignment
