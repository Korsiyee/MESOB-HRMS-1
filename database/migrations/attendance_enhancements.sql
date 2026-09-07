-- ================================================================
-- Attendance System Enhancement - Database Schema Updates
-- ================================================================
-- This migration adds:
-- 1. Attendance lifecycle state (PENDING, CHECKED_IN, CHECKED_OUT, CALCULATED)
-- 2. Worked hours, overtime, and missing hours calculations
-- 3. Grace period and break duration to shifts
-- 4. Late minutes tracking
-- ================================================================

-- Step 1: Add lifecycle state to AttendanceLogs
ALTER TABLE AttendanceLogs 
ADD COLUMN state ENUM('PENDING','CHECKED_IN','CHECKED_OUT','CALCULATED') 
NOT NULL DEFAULT 'PENDING' 
AFTER check_out,
ADD INDEX idx_attendance_logs_state (state);

-- Step 2: Add calculated hours to AttendanceSummary
ALTER TABLE AttendanceSummary 
ADD COLUMN worked_hours DECIMAL(5,2) NULL COMMENT 'Total hours worked (check_out - check_in - break)',
ADD COLUMN overtime_hours DECIMAL(5,2) NULL COMMENT 'Hours worked beyond shift duration',
ADD COLUMN missing_hours DECIMAL(5,2) NULL COMMENT 'Hours missing from expected shift duration (undertime)',
ADD COLUMN late_minutes INT NULL COMMENT 'Minutes late compared to shift start time',
ADD COLUMN break_duration_minutes INT NULL COMMENT 'Break duration snapshot from shift at calculation time';

-- Step 3: Add grace period and break duration to ShiftDefinitions
ALTER TABLE ShiftDefinitions 
ADD COLUMN grace_period_minutes INT NOT NULL DEFAULT 15 COMMENT 'Grace period before marking employee as late',
ADD COLUMN break_duration_minutes INT NOT NULL DEFAULT 0 COMMENT 'Break duration to deduct from worked hours';

-- Step 4: Update existing AttendanceLogs to set proper state based on current data
UPDATE AttendanceLogs 
SET state = CASE 
    WHEN check_out IS NOT NULL THEN 'CHECKED_OUT'
    WHEN check_in IS NOT NULL THEN 'CHECKED_IN'
    ELSE 'PENDING'
END;

-- Step 5: Add comment to clarify AttendanceSummary usage
ALTER TABLE AttendanceSummary 
MODIFY COLUMN uuid VARCHAR(36) PRIMARY KEY 
COMMENT 'Summary calculated after checkout or manually set';

-- ================================================================
-- Index optimizations for new query patterns
-- ================================================================

-- Index for querying by state transitions
ALTER TABLE AttendanceLogs 
ADD INDEX idx_attendance_logs_state_date (state, date);

-- Index for hours-based queries
ALTER TABLE AttendanceSummary 
ADD INDEX idx_attendance_summary_worked_hours (worked_hours);

-- ================================================================
-- Rollback instructions (if needed)
-- ================================================================
-- To rollback this migration:
-- ALTER TABLE AttendanceLogs DROP COLUMN state, DROP INDEX idx_attendance_logs_state, DROP INDEX idx_attendance_logs_state_date;
-- ALTER TABLE AttendanceSummary DROP COLUMN worked_hours, DROP COLUMN overtime_hours, DROP COLUMN missing_hours, DROP COLUMN late_minutes, DROP COLUMN break_duration_minutes, DROP INDEX idx_attendance_summary_worked_hours;
-- ALTER TABLE ShiftDefinitions DROP COLUMN grace_period_minutes, DROP COLUMN break_duration_minutes;
