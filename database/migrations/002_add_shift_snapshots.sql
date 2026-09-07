-- Migration: Add shift snapshot columns to AttendanceSummary table
-- These columns store a snapshot of shift details at the time of attendance
-- to preserve historical data even if shift definitions change later

ALTER TABLE AttendanceSummary
ADD COLUMN shift_name_snapshot VARCHAR(100) NULL COMMENT 'Snapshot of shift name at attendance time' AFTER shift_uuid,
ADD COLUMN shift_start_time_snapshot TIME NULL COMMENT 'Snapshot of shift start time at attendance time' AFTER shift_name_snapshot,
ADD COLUMN shift_end_time_snapshot TIME NULL COMMENT 'Snapshot of shift end time at attendance time' AFTER shift_start_time_snapshot;
