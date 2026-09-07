-- ═══════════════════════════════════════════════════════════════════════
-- LEVEL MODULE MIGRATION
-- Creates standalone Level master data module with versioned salary/allowances
-- ═══════════════════════════════════════════════════════════════════════

-- Drop existing tables if they exist (for clean migration)
DROP TABLE IF EXISTS EmployeeLevelHistory;
DROP TABLE IF EXISTS LevelAllowances;
DROP TABLE IF EXISTS LevelVersions;
DROP TABLE IF EXISTS Levels;

-- ═══════════════════════════════════════════════════════════════════════
-- LEVELS TABLE
-- Master data for organizational levels
-- ═══════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS Levels (
  uuid VARCHAR(36) PRIMARY KEY,
  name VARCHAR(200) NOT NULL UNIQUE,
  description TEXT,
  sort_order INT NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_levels_active (is_active),
  INDEX idx_levels_sort_order (sort_order)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ═══════════════════════════════════════════════════════════════════════
-- LEVEL VERSIONS TABLE
-- Versioned salary information for each level (effective-date based)
-- Allows tracking historical salary changes without losing data
-- ═══════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS LevelVersions (
  uuid VARCHAR(36) PRIMARY KEY,
  level_uuid VARCHAR(36) NOT NULL,
  base_salary DECIMAL(15,2) NOT NULL DEFAULT 0.00,
  effective_from DATE NOT NULL,
  effective_to DATE NULL,
  version_number INT NOT NULL DEFAULT 1,
  notes TEXT,
  created_by_uuid VARCHAR(36),
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_level_versions_level (level_uuid),
  INDEX idx_level_versions_effective (level_uuid, effective_from, effective_to),
  FOREIGN KEY (level_uuid) REFERENCES Levels (uuid) ON DELETE CASCADE,
  UNIQUE KEY unique_level_effective_from (level_uuid, effective_from)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ═══════════════════════════════════════════════════════════════════════
-- LEVEL ALLOWANCES TABLE
-- Multiple allowance components per level version (transport, housing, etc.)
-- Supports future payroll requirements with flexible allowance types
-- ═══════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS LevelAllowances (
  uuid VARCHAR(36) PRIMARY KEY,
  level_version_uuid VARCHAR(36) NOT NULL,
  allowance_type ENUM('TRANSPORT', 'HOUSING', 'RESPONSIBILITY', 'HARDSHIP', 'SPECIAL', 'OTHER') NOT NULL,
  allowance_name VARCHAR(200) NOT NULL,
  amount DECIMAL(15,2) NOT NULL DEFAULT 0.00,
  is_taxable BOOLEAN NOT NULL DEFAULT TRUE,
  description TEXT,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_allowances_version (level_version_uuid),
  INDEX idx_allowances_type (allowance_type),
  FOREIGN KEY (level_version_uuid) REFERENCES LevelVersions (uuid) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ═══════════════════════════════════════════════════════════════════════
-- ADD LEVEL TO EMPLOYEES TABLE
-- Links employees to their assigned level (mandatory field)
-- ═══════════════════════════════════════════════════════════════════════

-- Check if level_uuid column already exists before adding
SET @column_exists = (
  SELECT COUNT(*)
  FROM information_schema.columns
  WHERE table_schema = DATABASE()
    AND table_name = 'Employees'
    AND column_name = 'level_uuid'
);

SET @sql = IF(
  @column_exists = 0,
  'ALTER TABLE Employees ADD COLUMN level_uuid VARCHAR(36) NULL AFTER position_uuid, ADD INDEX idx_employees_level (level_uuid), ADD FOREIGN KEY (level_uuid) REFERENCES Levels (uuid) ON DELETE SET NULL',
  'SELECT "level_uuid column already exists" AS message'
);

PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- ═══════════════════════════════════════════════════════════════════════
-- EMPLOYEE LEVEL HISTORY TABLE
-- Tracks level changes for each employee over time
-- Enables reporting and historical analysis
-- ═══════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS EmployeeLevelHistory (
  uuid VARCHAR(36) PRIMARY KEY,
  employee_uuid VARCHAR(36) NOT NULL,
  level_uuid VARCHAR(36) NOT NULL,
  level_version_uuid VARCHAR(36),
  effective_from DATE NOT NULL,
  effective_to DATE NULL,
  changed_by_uuid VARCHAR(36),
  reason TEXT,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_level_history_employee (employee_uuid),
  INDEX idx_level_history_level (level_uuid),
  INDEX idx_level_history_effective (employee_uuid, effective_from, effective_to),
  FOREIGN KEY (employee_uuid) REFERENCES Employees (uuid) ON DELETE CASCADE,
  FOREIGN KEY (level_uuid) REFERENCES Levels (uuid) ON DELETE CASCADE,
  FOREIGN KEY (level_version_uuid) REFERENCES LevelVersions (uuid) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ═══════════════════════════════════════════════════════════════════════
-- SEED DEFAULT LEVELS
-- Insert standard organizational levels (1-12)
-- ═══════════════════════════════════════════════════════════════════════

INSERT INTO Levels (uuid, name, description, sort_order, is_active) VALUES
  (UUID(), 'Level 1', 'Entry level position', 1, TRUE),
  (UUID(), 'Level 2', 'Junior level position', 2, TRUE),
  (UUID(), 'Level 3', 'Associate level position', 3, TRUE),
  (UUID(), 'Level 4', 'Intermediate level position', 4, TRUE),
  (UUID(), 'Level 5', 'Senior associate position', 5, TRUE),
  (UUID(), 'Level 6', 'Senior level position', 6, TRUE),
  (UUID(), 'Level 7', 'Lead level position', 7, TRUE),
  (UUID(), 'Level 8', 'Principal level position', 8, TRUE),
  (UUID(), 'Level 9', 'Manager level position', 9, TRUE),
  (UUID(), 'Level 10', 'Senior manager position', 10, TRUE),
  (UUID(), 'Level 11', 'Director level position', 11, TRUE),
  (UUID(), 'Level 12', 'Executive level position', 12, TRUE);

-- ═══════════════════════════════════════════════════════════════════════
-- CREATE INITIAL LEVEL VERSIONS
-- Create version 1 for each level with placeholder base salary
-- Organizations should update these values according to their salary structure
-- ═══════════════════════════════════════════════════════════════════════

INSERT INTO LevelVersions (uuid, level_uuid, base_salary, effective_from, version_number)
SELECT 
  UUID(),
  uuid,
  (sort_order * 5000.00) AS base_salary,  -- Placeholder: adjust per organization
  CURDATE(),
  1
FROM Levels;

-- Migration complete
SELECT 'Level module migration completed successfully' AS status;
