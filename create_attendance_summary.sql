-- Create AttendanceSummary table if it doesn't exist

DROP TABLE IF EXISTS `AttendanceSummary`;
CREATE TABLE `AttendanceSummary` (
  `uuid` VARCHAR(36) NOT NULL,
  `employee_uuid` VARCHAR(36) NOT NULL,
  `date` DATE NOT NULL,
  `status` ENUM('PRESENT','ABSENT','LATE','ON_LEAVE','HALF_DAY') NOT NULL DEFAULT 'ABSENT',
  `check_in` DATETIME DEFAULT NULL,
  `check_out` DATETIME DEFAULT NULL,
  `worked_hours` DECIMAL(5,2) DEFAULT 0,
  `overtime_hours` DECIMAL(5,2) DEFAULT 0,
  `missing_hours` DECIMAL(5,2) DEFAULT 0,
  `late_minutes` INT DEFAULT 0,
  `shift_uuid` VARCHAR(36) DEFAULT NULL,
  `notes` TEXT,
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`uuid`),
  UNIQUE KEY `unique_employee_date` (`employee_uuid`, `date`),
  KEY `idx_employee` (`employee_uuid`),
  KEY `idx_date` (`date`),
  KEY `idx_status` (`status`),
  CONSTRAINT `fk_attendance_employee` FOREIGN KEY (`employee_uuid`) REFERENCES `Employees` (`uuid`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
