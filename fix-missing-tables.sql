-- Fix for missing tables in mesob_hrms database

-- Create EmployeeAddresses table if it doesn't exist
CREATE TABLE IF NOT EXISTS `EmployeeAddresses` (
  `uuid` VARCHAR(36) NOT NULL,
  `employee_uuid` VARCHAR(36) NOT NULL,
  `address_type` ENUM('PERMANENT','CURRENT') NOT NULL,
  `region` VARCHAR(100) DEFAULT NULL,
  `zone` VARCHAR(100) DEFAULT NULL,
  `woreda` VARCHAR(100) DEFAULT NULL,
  `kebele` VARCHAR(100) DEFAULT NULL,
  `house_number` VARCHAR(50) DEFAULT NULL,
  `phone_primary` VARCHAR(20) DEFAULT NULL,
  `phone_secondary` VARCHAR(20) DEFAULT NULL,
  `email` VARCHAR(200) DEFAULT NULL,
  PRIMARY KEY (`uuid`),
  KEY `idx_employee_addresses_employee` (`employee_uuid`),
  KEY `idx_employee_addresses_type` (`employee_uuid`, `address_type`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
COMMENT='Employee address information';

-- Create Notifications table if it doesn't exist
CREATE TABLE IF NOT EXISTS `Notifications` (
  `uuid` VARCHAR(36) NOT NULL,
  `recipient_uuid` VARCHAR(36) NOT NULL,
  `sender_uuid` VARCHAR(36) DEFAULT NULL,
  `type` VARCHAR(50) NOT NULL,
  `title` VARCHAR(255) NOT NULL,
  `message` TEXT,
  `action_url` VARCHAR(500) DEFAULT NULL,
  `is_read` TINYINT(1) NOT NULL DEFAULT 0,
  `read_at` DATETIME DEFAULT NULL,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP(),
  PRIMARY KEY (`uuid`),
  KEY `idx_notifications_recipient` (`recipient_uuid`),
  KEY `idx_notifications_read` (`recipient_uuid`, `is_read`),
  KEY `idx_notifications_created` (`created_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
COMMENT='User notifications';
