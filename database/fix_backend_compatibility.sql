-- Fix backend compatibility issues
-- Run this if you encounter column name mismatches

-- Add alias columns to AuditLogs for backward compatibility (if needed)
ALTER TABLE AuditLogs 
  ADD COLUMN IF NOT EXISTS action VARCHAR(100) GENERATED ALWAYS AS (action_type) VIRTUAL,
  ADD COLUMN IF NOT EXISTS entity_type VARCHAR(100) GENERATED ALWAYS AS (resource_type) VIRTUAL,
  ADD COLUMN IF NOT EXISTS entity_uuid VARCHAR(36) GENERATED ALWAYS AS (resource_uuid) VIRTUAL,
  ADD COLUMN IF NOT EXISTS actor_uuid VARCHAR(36) GENERATED ALWAYS AS (actor_user_uuid) VIRTUAL,
  ADD COLUMN IF NOT EXISTS diff_json JSON GENERATED ALWAYS AS (old_values_json) VIRTUAL;

SELECT 'Backend compatibility fixes applied' AS status;
