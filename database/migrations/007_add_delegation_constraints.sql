-- ═══════════════════════════════════════════════════════════════════════
-- Migration 007: Add Delegation Constraints
-- Description: Prevent delegation abuse (circular, chains, max duration)
-- Created: 2026-06-29
-- ═══════════════════════════════════════════════════════════════════════

-- Add delegation_chain_level to track delegation depth
ALTER TABLE OccupationDelegations
ADD COLUMN IF NOT EXISTS delegation_chain_level INT NOT NULL DEFAULT 1 AFTER occupation_uuid,
ADD COLUMN IF NOT EXISTS original_delegator_uuid VARCHAR(36) AFTER delegation_chain_level;

-- Add index for circular delegation detection
CREATE INDEX IF NOT EXISTS idx_delegations_circular 
ON OccupationDelegations (delegator_user_uuid, delegatee_user_uuid, occupation_uuid);

-- Add check constraint for max delegation duration (30 days)
-- Note: MySQL doesn't support CHECK constraints with functions, so this is enforced in application code
-- But we document it here for reference

-- Add foreign key for original delegator
ALTER TABLE OccupationDelegations
ADD CONSTRAINT IF NOT EXISTS fk_original_delegator
FOREIGN KEY (original_delegator_uuid) REFERENCES Users (uuid) ON DELETE SET NULL;

-- Create view for active delegations (easier querying)
CREATE OR REPLACE VIEW ActiveDelegations AS
SELECT 
  od.*,
  delegator.username AS delegator_username,
  delegatee.username AS delegatee_username,
  o.name AS occupation_name,
  DATEDIFF(od.end_date, od.start_date) AS duration_days
FROM OccupationDelegations od
JOIN Users delegator ON od.delegator_user_uuid = delegator.uuid
JOIN Users delegatee ON od.delegatee_user_uuid = delegatee.uuid
JOIN Occupations o ON od.occupation_uuid = o.uuid
WHERE od.revoked_at IS NULL
  AND NOW() BETWEEN od.start_date AND od.end_date;

-- Create view for delegation chains (for circular detection)
CREATE OR REPLACE VIEW DelegationChains AS
SELECT 
  od1.delegator_user_uuid AS level1_delegator,
  od1.delegatee_user_uuid AS level1_delegatee,
  od2.delegatee_user_uuid AS level2_delegatee,
  od1.occupation_uuid,
  od1.uuid AS delegation1_uuid,
  od2.uuid AS delegation2_uuid
FROM OccupationDelegations od1
LEFT JOIN OccupationDelegations od2 
  ON od1.delegatee_user_uuid = od2.delegator_user_uuid
  AND od1.occupation_uuid = od2.occupation_uuid
  AND od2.revoked_at IS NULL
  AND NOW() BETWEEN od2.start_date AND od2.end_date
WHERE od1.revoked_at IS NULL
  AND NOW() BETWEEN od1.start_date AND od1.end_date;
