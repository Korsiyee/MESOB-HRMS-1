-- Complete fix for all employee-related tables

-- 1. EmployeeAddresses (already created but ensuring it exists)
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

-- 2. EmployeeIDDocuments
CREATE TABLE IF NOT EXISTS `EmployeeIDDocuments` (
  `uuid` VARCHAR(36) NOT NULL,
  `employee_uuid` VARCHAR(36) NOT NULL,
  `doc_type` VARCHAR(100) NOT NULL COMMENT 'e.g., Passport, National ID, Driver License',
  `id_number` VARCHAR(100) NOT NULL,
  `issue_date` DATE DEFAULT NULL,
  `valid_until` DATE DEFAULT NULL,
  `file_key` VARCHAR(500) DEFAULT NULL COMMENT 'S3 key or file path',
  `original_name` VARCHAR(255) DEFAULT NULL,
  `mime_type` VARCHAR(120) DEFAULT NULL,
  `file_size` BIGINT DEFAULT NULL,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP(),
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP() ON UPDATE CURRENT_TIMESTAMP(),
  PRIMARY KEY (`uuid`),
  KEY `idx_employee_docs_employee` (`employee_uuid`),
  KEY `idx_employee_docs_type` (`employee_uuid`, `doc_type`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
COMMENT='Employee identification documents';

-- 3. EmployeeFaceImages
CREATE TABLE IF NOT EXISTS `EmployeeFaceImages` (
  `uuid` VARCHAR(36) NOT NULL,
  `employee_uuid` VARCHAR(36) NOT NULL,
  `image_key` VARCHAR(500) NOT NULL COMMENT 'S3 key or file path',
  `image_number` TINYINT NOT NULL,
  `descriptor_json` TEXT DEFAULT NULL COMMENT 'Face encoding descriptor for recognition',
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP(),
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP() ON UPDATE CURRENT_TIMESTAMP(),
  PRIMARY KEY (`uuid`),
  UNIQUE KEY `uk_face_images_employee_number` (`employee_uuid`, `image_number`),
  KEY `idx_face_images_employee` (`employee_uuid`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
COMMENT='Employee face images for biometric attendance';

-- 4. EmployeeRegistrationDrafts
CREATE TABLE IF NOT EXISTS `EmployeeRegistrationDrafts` (
  `uuid` VARCHAR(36) NOT NULL,
  `step_completed` TINYINT DEFAULT NULL COMMENT 'Last completed step in registration wizard',
  `draft_json` JSON DEFAULT NULL COMMENT 'Partial employee data',
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP(),
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP() ON UPDATE CURRENT_TIMESTAMP(),
  PRIMARY KEY (`uuid`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
COMMENT='Temporary drafts for multi-step employee registration';

-- 5. Notifications (already created but ensuring it exists)
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

-- Verify tables were created
SELECT 'Tables created successfully!' AS status;
SELECT TABLE_NAME FROM information_schema.TABLES 
WHERE TABLE_SCHEMA = 'mesob_hrms' 
AND TABLE_NAME IN ('EmployeeAddresses', 'EmployeeIDDocuments', 'EmployeeFaceImages', 
                   'EmployeeRegistrationDrafts', 'Notifications')
ORDER BY TABLE_NAME;
