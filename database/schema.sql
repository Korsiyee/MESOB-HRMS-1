-- ============================================================================
-- Mesob HRMS Database Schema
-- ============================================================================
-- Version: 1.0.0
-- Created: 2024
-- Description: Complete database schema for Mesob HRMS (Human Resource Management System)
--              This file creates all tables, indexes, and foreign key constraints
--              needed for the HRMS application.
--
-- Usage: This file can be used to initialize a fresh database:
--        mysql -u username -p database_name < schema.sql
--
-- Tables are organized in the following order:
--   1. Core RBAC (Roles, Scopes, Modules)
--   2. Users and Authentication
--   3. Employee Management
--   4. Attendance System
--   5. Leave Management
--   6. Level System
--   7. Notifications and Audit
--   8. Supporting Tables
-- ============================================================================

-- MariaDB dump 10.20-12.3.3-MariaDB, for Linux (x86_64)
--
-- Host: localhost    Database: mesob_hrms
-- ------------------------------------------------------
-- Server version	12.3.3-MariaDB

/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!40101 SET NAMES utf8mb4 */;
/*!40103 SET @OLD_TIME_ZONE=@@TIME_ZONE */;
/*!40103 SET TIME_ZONE='+00:00' */;
/*!40014 SET @OLD_UNIQUE_CHECKS=@@UNIQUE_CHECKS, UNIQUE_CHECKS=0 */;
/*!40014 SET @OLD_FOREIGN_KEY_CHECKS=@@FOREIGN_KEY_CHECKS, FOREIGN_KEY_CHECKS=0 */;
/*!40101 SET @OLD_SQL_MODE=@@SQL_MODE, SQL_MODE='NO_AUTO_VALUE_ON_ZERO' */;
/*M!100616 SET @OLD_NOTE_VERBOSITY=@@NOTE_VERBOSITY, NOTE_VERBOSITY=0 */;

--
-- Table structure for table `AccessAuditLogs`
--

DROP TABLE IF EXISTS `AccessAuditLogs`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `AccessAuditLogs` (
  `uuid` varchar(36) NOT NULL,
  `actor_user_uuid` varchar(36) DEFAULT NULL,
  `target_user_uuid` varchar(36) DEFAULT NULL,
  `action_type` enum('ROLE_OCCUPATION_ASSIGNED','ROLE_OCCUPATION_REMOVED','USER_OCCUPATION_ASSIGNED','USER_OCCUPATION_REMOVED','SCOPE_ASSIGNED','SCOPE_REMOVED','DELEGATION_CREATED','DELEGATION_REVOKED','AUTHORIZATION_DENIED','TOKEN_REVOKED','PERMISSION_CHECKED','PERMISSION_GRANTED','PERMISSION_DENIED','SCOPE_VIOLATION','LOGIN_FAILURE','TOKEN_REFRESH','DELEGATION_EXPIRED','PERMISSION_EXPIRED','PERMISSION_OVERRIDE_ADDED','PERMISSION_OVERRIDE_REMOVED') NOT NULL,
  `resource_type` varchar(50) DEFAULT NULL,
  `resource_uuid` varchar(255) DEFAULT NULL,
  `old_value` text DEFAULT NULL,
  `new_value` text DEFAULT NULL,
  `reason` text DEFAULT NULL,
  `ip_address` varchar(45) DEFAULT NULL,
  `user_agent` text DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`uuid`),
  KEY `idx_audit_logs_actor` (`actor_user_uuid`,`created_at`),
  KEY `idx_audit_logs_target` (`target_user_uuid`,`created_at`),
  KEY `idx_audit_logs_action` (`action_type`,`created_at`),
  KEY `idx_audit_logs_created` (`created_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `AttendanceLogs`
--

DROP TABLE IF EXISTS `AttendanceLogs`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `AttendanceLogs` (
  `uuid` varchar(36) NOT NULL,
  `employee_uuid` varchar(36) NOT NULL,
  `date` date NOT NULL,
  `check_in` datetime DEFAULT NULL,
  `check_out` datetime DEFAULT NULL,
  `state` enum('PENDING','CHECKED_IN','CHECKED_OUT','CALCULATED') NOT NULL DEFAULT 'PENDING',
  `source` enum('MANUAL','DEVICE','SYSTEM','FACE_RECOGNITION') NOT NULL DEFAULT 'SYSTEM',
  `created_at` datetime NOT NULL DEFAULT current_timestamp(),
  `updated_at` datetime NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`uuid`),
  KEY `idx_attendance_logs_employee` (`employee_uuid`),
  KEY `idx_attendance_logs_date` (`date`),
  KEY `idx_attendance_logs_state` (`state`),
  KEY `idx_attendance_logs_state_date` (`state`,`date`),
  CONSTRAINT `fk_attendance_logs_employee` FOREIGN KEY (`employee_uuid`) REFERENCES `Employees` (`uuid`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `AttendanceSummary`
--

DROP TABLE IF EXISTS `AttendanceSummary`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `AttendanceSummary` (
  `uuid` varchar(36) NOT NULL,
  `employee_uuid` varchar(36) NOT NULL,
  `date` date NOT NULL,
  `status` enum('PRESENT','ABSENT','LATE','ON_LEAVE') NOT NULL,
  `shift_uuid` varchar(36) DEFAULT NULL,
  `shift_name_snapshot` varchar(100) DEFAULT NULL,
  `shift_start_time_snapshot` time DEFAULT NULL,
  `shift_end_time_snapshot` time DEFAULT NULL,
  `leave_request_uuid` varchar(36) DEFAULT NULL,
  `worked_hours` decimal(5,2) DEFAULT NULL,
  `overtime_hours` decimal(5,2) DEFAULT NULL,
  `missing_hours` decimal(5,2) DEFAULT NULL,
  `late_minutes` int(11) DEFAULT NULL,
  `break_duration_minutes` int(11) DEFAULT NULL,
  `corrected_by` varchar(36) DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT current_timestamp(),
  `updated_at` datetime NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`uuid`),
  UNIQUE KEY `idx_attendance_summary_employee_date` (`employee_uuid`,`date`),
  KEY `idx_attendance_summary_status` (`status`),
  KEY `idx_attendance_summary_worked_hours` (`worked_hours`),
  KEY `fk_attendance_summary_shift` (`shift_uuid`),
  KEY `fk_attendance_summary_leave_request` (`leave_request_uuid`),
  KEY `fk_attendance_summary_corrected_by` (`corrected_by`),
  CONSTRAINT `fk_attendance_summary_corrected_by` FOREIGN KEY (`corrected_by`) REFERENCES `Employees` (`uuid`) ON DELETE SET NULL,
  CONSTRAINT `fk_attendance_summary_employee` FOREIGN KEY (`employee_uuid`) REFERENCES `Employees` (`uuid`) ON DELETE CASCADE,
  CONSTRAINT `fk_attendance_summary_leave_request` FOREIGN KEY (`leave_request_uuid`) REFERENCES `leaveRequests` (`uuid`) ON DELETE SET NULL,
  CONSTRAINT `fk_attendance_summary_shift` FOREIGN KEY (`shift_uuid`) REFERENCES `ShiftDefinitions` (`uuid`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `AuditLogs`
--

DROP TABLE IF EXISTS `AuditLogs`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `AuditLogs` (
  `uuid` varchar(36) NOT NULL,
  `actor_uuid` varchar(36) DEFAULT NULL,
  `action` varchar(100) NOT NULL,
  `entity_type` varchar(100) DEFAULT NULL,
  `entity_uuid` varchar(36) DEFAULT NULL,
  `diff_json` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`diff_json`)),
  `ip_address` varchar(45) DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`uuid`),
  KEY `idx_audit_actor` (`actor_uuid`),
  KEY `idx_audit_action` (`action`),
  KEY `idx_audit_created` (`created_at`),
  CONSTRAINT `fk_audit_logs_actor` FOREIGN KEY (`actor_uuid`) REFERENCES `Users` (`uuid`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `Departments`
--

DROP TABLE IF EXISTS `Departments`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `Departments` (
  `uuid` varchar(36) NOT NULL,
  `name` varchar(200) NOT NULL,
  `parent_uuid` varchar(36) DEFAULT NULL,
  `head_employee_uuid` varchar(36) DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT current_timestamp(),
  `updated_at` datetime NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`uuid`),
  UNIQUE KEY `name` (`name`),
  KEY `idx_departments_parent` (`parent_uuid`),
  KEY `fk_departments_head` (`head_employee_uuid`),
  CONSTRAINT `fk_departments_head` FOREIGN KEY (`head_employee_uuid`) REFERENCES `Employees` (`uuid`) ON DELETE SET NULL,
  CONSTRAINT `fk_departments_parent` FOREIGN KEY (`parent_uuid`) REFERENCES `Departments` (`uuid`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `EmployeeAddresses`
--

DROP TABLE IF EXISTS `EmployeeAddresses`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `EmployeeAddresses` (
  `uuid` varchar(36) NOT NULL,
  `employee_uuid` varchar(36) NOT NULL,
  `address_type` enum('PERMANENT','CURRENT') DEFAULT NULL,
  `region` varchar(100) DEFAULT NULL,
  `zone` varchar(100) DEFAULT NULL,
  `woreda` varchar(100) DEFAULT NULL,
  `kebele` varchar(100) DEFAULT NULL,
  `house_number` varchar(50) DEFAULT NULL,
  `phone_primary` varchar(20) DEFAULT NULL,
  `phone_secondary` varchar(20) DEFAULT NULL,
  `email` varchar(200) DEFAULT NULL,
  PRIMARY KEY (`uuid`),
  KEY `idx_employee_addresses_employee` (`employee_uuid`),
  CONSTRAINT `fk_employee_addresses_employee` FOREIGN KEY (`employee_uuid`) REFERENCES `Employees` (`uuid`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `EmployeeFaceImages`
--

DROP TABLE IF EXISTS `EmployeeFaceImages`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `EmployeeFaceImages` (
  `uuid` varchar(36) NOT NULL,
  `employee_uuid` varchar(36) NOT NULL,
  `image_key` varchar(500) NOT NULL,
  `image_number` tinyint(4) NOT NULL CHECK (`image_number` between 1 and 7),
  `descriptor_json` text DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT current_timestamp(),
  `updated_at` datetime NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`uuid`),
  UNIQUE KEY `idx_face_images_employee_number` (`employee_uuid`,`image_number`),
  KEY `idx_face_images_employee` (`employee_uuid`),
  CONSTRAINT `fk_face_images_employee` FOREIGN KEY (`employee_uuid`) REFERENCES `Employees` (`uuid`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `EmployeeIDDocuments`
--

DROP TABLE IF EXISTS `EmployeeIDDocuments`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `EmployeeIDDocuments` (
  `uuid` varchar(36) NOT NULL,
  `employee_uuid` varchar(36) NOT NULL,
  `doc_type` varchar(100) DEFAULT NULL,
  `id_number` varchar(100) DEFAULT NULL,
  `issue_date` date DEFAULT NULL,
  `valid_until` date DEFAULT NULL,
  `file_key` varchar(500) DEFAULT NULL,
  `original_name` varchar(255) DEFAULT NULL,
  `mime_type` varchar(120) DEFAULT NULL,
  `file_size` bigint(20) DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT current_timestamp(),
  `updated_at` datetime NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`uuid`),
  KEY `idx_employee_docs_employee` (`employee_uuid`),
  CONSTRAINT `fk_employee_docs_employee` FOREIGN KEY (`employee_uuid`) REFERENCES `Employees` (`uuid`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `EmployeeLevelHistory`
--

DROP TABLE IF EXISTS `EmployeeLevelHistory`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `EmployeeLevelHistory` (
  `uuid` varchar(36) NOT NULL,
  `employee_uuid` varchar(36) NOT NULL,
  `level_uuid` varchar(36) NOT NULL,
  `level_version_uuid` varchar(36) DEFAULT NULL,
  `effective_from` date NOT NULL,
  `effective_to` date DEFAULT NULL,
  `changed_by_uuid` varchar(36) DEFAULT NULL,
  `reason` text DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`uuid`),
  KEY `idx_level_history_employee` (`employee_uuid`),
  KEY `idx_level_history_level` (`level_uuid`),
  KEY `idx_level_history_effective` (`employee_uuid`,`effective_from`,`effective_to`),
  KEY `fk_level_history_version` (`level_version_uuid`),
  CONSTRAINT `fk_level_history_employee` FOREIGN KEY (`employee_uuid`) REFERENCES `Employees` (`uuid`) ON DELETE CASCADE,
  CONSTRAINT `fk_level_history_level` FOREIGN KEY (`level_uuid`) REFERENCES `Levels` (`uuid`) ON DELETE CASCADE,
  CONSTRAINT `fk_level_history_version` FOREIGN KEY (`level_version_uuid`) REFERENCES `LevelVersions` (`uuid`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `EmployeeOccupations`
--

DROP TABLE IF EXISTS `EmployeeOccupations`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `EmployeeOccupations` (
  `uuid` varchar(36) NOT NULL,
  `employee_uuid` varchar(36) NOT NULL,
  `occupation_uuid` varchar(36) NOT NULL,
  `assigned_at` datetime NOT NULL DEFAULT current_timestamp(),
  `assigned_by` varchar(36) DEFAULT NULL,
  `expires_at` datetime DEFAULT NULL,
  `assigned_reason` text DEFAULT NULL,
  PRIMARY KEY (`uuid`),
  UNIQUE KEY `unique_employee_occupation` (`employee_uuid`,`occupation_uuid`),
  KEY `idx_employee_occupations_employee` (`employee_uuid`),
  KEY `idx_employee_occupations_occupation` (`occupation_uuid`),
  KEY `idx_employee_occupations_expires` (`expires_at`),
  CONSTRAINT `fk_employee_occupations_employee` FOREIGN KEY (`employee_uuid`) REFERENCES `Employees` (`uuid`) ON DELETE CASCADE,
  CONSTRAINT `fk_employee_occupations_occupation` FOREIGN KEY (`occupation_uuid`) REFERENCES `Occupations` (`uuid`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `EmployeeRegistrationDrafts`
--

DROP TABLE IF EXISTS `EmployeeRegistrationDrafts`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `EmployeeRegistrationDrafts` (
  `uuid` varchar(36) NOT NULL,
  `step_completed` tinyint(4) DEFAULT NULL,
  `draft_json` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`draft_json`)),
  `created_at` datetime NOT NULL DEFAULT current_timestamp(),
  `updated_at` datetime NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`uuid`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `EmployeeShifts`
--

DROP TABLE IF EXISTS `EmployeeShifts`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `EmployeeShifts` (
  `uuid` varchar(36) NOT NULL,
  `employee_uuid` varchar(36) NOT NULL,
  `shift_uuid` varchar(36) NOT NULL,
  `effective_from` date NOT NULL,
  `effective_to` date DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`uuid`),
  KEY `idx_employee_shifts_employee` (`employee_uuid`),
  KEY `idx_employee_shifts_shift` (`shift_uuid`),
  KEY `idx_employee_shifts_effective` (`employee_uuid`,`effective_from`),
  CONSTRAINT `fk_employee_shifts_employee` FOREIGN KEY (`employee_uuid`) REFERENCES `Employees` (`uuid`) ON DELETE CASCADE,
  CONSTRAINT `fk_employee_shifts_shift` FOREIGN KEY (`shift_uuid`) REFERENCES `ShiftDefinitions` (`uuid`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `Employees`
--

DROP TABLE IF EXISTS `Employees`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `Employees` (
  `uuid` varchar(36) NOT NULL,
  `mesob_id` varchar(20) DEFAULT NULL,
  `title` enum('Mr','Mrs','Ms','Dr','Prof','Ato','W/ro','W/t') DEFAULT NULL,
  `first_name` varchar(100) NOT NULL,
  `middle_name` varchar(100) NOT NULL,
  `last_name` varchar(100) NOT NULL,
  `mother_name` varchar(100) NOT NULL,
  `gender` enum('MALE','FEMALE') DEFAULT NULL,
  `date_of_birth` date NOT NULL,
  `nationality` varchar(100) DEFAULT 'Ethiopian',
  `profile_photo_key` varchar(500) DEFAULT NULL,
  `tin_number` varchar(50) DEFAULT NULL,
  `pension_code` varchar(50) DEFAULT NULL,
  `bank_name` varchar(200) DEFAULT NULL,
  `bank_account_number` varchar(100) DEFAULT NULL,
  `hire_date` date NOT NULL,
  `prior_gov_service` decimal(5,2) DEFAULT 0.00,
  `status` enum('ACTIVE','INACTIVE','TERMINATED') NOT NULL DEFAULT 'ACTIVE',
  `attendance_exempt` tinyint(1) NOT NULL DEFAULT 0,
  `face_images_registered` tinyint(1) NOT NULL DEFAULT 0,
  `department_uuid` varchar(36) DEFAULT NULL,
  `position_uuid` varchar(36) DEFAULT NULL,
  `level_uuid` varchar(36) DEFAULT NULL,
  `occupation_uuid` varchar(36) DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT current_timestamp(),
  `updated_at` datetime NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`uuid`),
  UNIQUE KEY `mesob_id` (`mesob_id`),
  KEY `idx_employees_name` (`last_name`,`first_name`),
  KEY `idx_employees_department` (`department_uuid`),
  KEY `idx_employees_position` (`position_uuid`),
  KEY `idx_employees_level` (`level_uuid`),
  KEY `idx_employees_occupation` (`occupation_uuid`),
  KEY `idx_employees_status` (`status`),
  KEY `idx_employees_tin` (`tin_number`),
  CONSTRAINT `fk_employees_department` FOREIGN KEY (`department_uuid`) REFERENCES `Departments` (`uuid`) ON DELETE SET NULL,
  CONSTRAINT `fk_employees_level` FOREIGN KEY (`level_uuid`) REFERENCES `Levels` (`uuid`) ON DELETE SET NULL,
  CONSTRAINT `fk_employees_occupation` FOREIGN KEY (`occupation_uuid`) REFERENCES `Occupations` (`uuid`) ON DELETE SET NULL,
  CONSTRAINT `fk_employees_position` FOREIGN KEY (`position_uuid`) REFERENCES `Positions` (`uuid`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `Holidays`
--

DROP TABLE IF EXISTS `Holidays`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `Holidays` (
  `uuid` varchar(50) NOT NULL,
  `holidayDate` date NOT NULL,
  `holidayName` varchar(255) NOT NULL,
  `calendarYear` varchar(10) NOT NULL,
  `calendarType` varchar(30) NOT NULL,
  `isActive` tinyint(1) NOT NULL DEFAULT 1,
  `source` varchar(30) NOT NULL DEFAULT 'MANUAL',
  `description` text DEFAULT NULL,
  PRIMARY KEY (`uuid`),
  UNIQUE KEY `holidayDate` (`holidayDate`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `IssuedLetters`
--

DROP TABLE IF EXISTS `IssuedLetters`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `IssuedLetters` (
  `uuid` varchar(36) NOT NULL,
  `employee_uuid` varchar(36) NOT NULL,
  `template_uuid` varchar(36) NOT NULL,
  `name` varchar(200) DEFAULT NULL,
  `type` varchar(100) DEFAULT NULL,
  `generated_content` longtext DEFAULT NULL,
  `generated_pdf_key` varchar(500) NOT NULL,
  `issued_by` varchar(36) DEFAULT NULL,
  `issued_at` datetime NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`uuid`),
  KEY `idx_issued_letters_employee` (`employee_uuid`),
  KEY `idx_issued_letters_template` (`template_uuid`),
  KEY `idx_issued_letters_issued_by` (`issued_by`),
  CONSTRAINT `fk_issued_letters_employee` FOREIGN KEY (`employee_uuid`) REFERENCES `Employees` (`uuid`) ON DELETE CASCADE,
  CONSTRAINT `fk_issued_letters_issued_by` FOREIGN KEY (`issued_by`) REFERENCES `Employees` (`uuid`) ON DELETE SET NULL,
  CONSTRAINT `fk_issued_letters_template` FOREIGN KEY (`template_uuid`) REFERENCES `LetterTemplates` (`uuid`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `LetterLayoutConfig`
--

DROP TABLE IF EXISTS `LetterLayoutConfig`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `LetterLayoutConfig` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `layout_name` varchar(100) NOT NULL,
  `margin_top` int(11) DEFAULT NULL,
  `margin_bottom` int(11) DEFAULT NULL,
  `margin_left` int(11) DEFAULT NULL,
  `margin_right` int(11) DEFAULT NULL,
  `header_height` int(11) DEFAULT NULL,
  `footer_height` int(11) DEFAULT NULL,
  `font_family` varchar(100) DEFAULT NULL,
  `font_size` int(11) DEFAULT NULL,
  `is_active` tinyint(1) DEFAULT 1,
  `created_at` datetime NOT NULL DEFAULT current_timestamp(),
  `updated_at` datetime NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `LetterReferenceSequence`
--

DROP TABLE IF EXISTS `LetterReferenceSequence`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `LetterReferenceSequence` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `year` int(11) NOT NULL,
  `sequence_number` int(11) NOT NULL,
  `letter_type` varchar(100) DEFAULT NULL,
  `generated_ref_no` varchar(100) DEFAULT NULL,
  `letter_uuid` varchar(36) DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `LetterRequests`
--

DROP TABLE IF EXISTS `LetterRequests`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `LetterRequests` (
  `uuid` varchar(36) NOT NULL,
  `employee_uuid` varchar(36) NOT NULL,
  `template_uuid` varchar(36) NOT NULL,
  `recipient_info` text DEFAULT NULL,
  `subject` text DEFAULT NULL,
  `main_body` text DEFAULT NULL,
  `closing_text` text DEFAULT NULL,
  `cc_recipients` text DEFAULT NULL,
  `generated_content` longtext DEFAULT NULL,
  `generated_pdf_key` varchar(500) DEFAULT NULL,
  `status` enum('PENDING','APPROVED','REJECTED') DEFAULT 'PENDING',
  `requested_at` timestamp NULL DEFAULT current_timestamp(),
  `reviewed_by` varchar(36) DEFAULT NULL,
  `reviewed_at` timestamp NULL DEFAULT NULL,
  `rejection_reason` text DEFAULT NULL,
  PRIMARY KEY (`uuid`),
  KEY `idx_letter_requests_employee` (`employee_uuid`),
  KEY `idx_letter_requests_template` (`template_uuid`),
  KEY `idx_letter_requests_status` (`status`),
  KEY `idx_letter_requests_requested_at` (`requested_at`),
  KEY `fk_letter_requests_reviewed_by` (`reviewed_by`),
  CONSTRAINT `fk_letter_requests_employee` FOREIGN KEY (`employee_uuid`) REFERENCES `Employees` (`uuid`) ON DELETE CASCADE,
  CONSTRAINT `fk_letter_requests_reviewed_by` FOREIGN KEY (`reviewed_by`) REFERENCES `Employees` (`uuid`) ON DELETE SET NULL,
  CONSTRAINT `fk_letter_requests_template` FOREIGN KEY (`template_uuid`) REFERENCES `LetterTemplates` (`uuid`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `LetterTemplates`
--

DROP TABLE IF EXISTS `LetterTemplates`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `LetterTemplates` (
  `uuid` varchar(36) NOT NULL,
  `type` varchar(100) DEFAULT NULL,
  `title` varchar(200) NOT NULL,
  `category` varchar(50) DEFAULT 'GENERAL',
  `body_template` text DEFAULT NULL,
  `text_content` longtext DEFAULT NULL,
  `pdf_template_key` varchar(500) DEFAULT NULL,
  `original_filename` varchar(255) DEFAULT NULL,
  `file_size` bigint(20) DEFAULT NULL,
  `mime_type` varchar(120) DEFAULT NULL,
  `recipient_info` text DEFAULT NULL,
  `subject` text DEFAULT NULL,
  `main_body` text DEFAULT NULL,
  `closing_text` text DEFAULT NULL,
  `cc_recipients` text DEFAULT NULL,
  `uses_new_format` tinyint(1) DEFAULT 1,
  `is_active` tinyint(1) DEFAULT 1,
  `layout_config_id` int(11) DEFAULT NULL,
  `created_by` varchar(36) DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT current_timestamp(),
  `updated_at` datetime NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`uuid`),
  KEY `idx_letter_templates_created_by` (`created_by`),
  KEY `fk_letter_templates_layout` (`layout_config_id`),
  CONSTRAINT `fk_letter_templates_created_by` FOREIGN KEY (`created_by`) REFERENCES `Employees` (`uuid`) ON DELETE SET NULL,
  CONSTRAINT `fk_letter_templates_layout` FOREIGN KEY (`layout_config_id`) REFERENCES `LetterLayoutConfig` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `LevelAllowances`
--

DROP TABLE IF EXISTS `LevelAllowances`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `LevelAllowances` (
  `uuid` varchar(36) NOT NULL,
  `level_version_uuid` varchar(36) NOT NULL,
  `allowance_type` enum('TRANSPORT','HOUSING','RESPONSIBILITY','HARDSHIP','SPECIAL','OTHER') NOT NULL,
  `allowance_name` varchar(200) NOT NULL,
  `amount` decimal(15,2) NOT NULL DEFAULT 0.00,
  `is_taxable` tinyint(1) NOT NULL DEFAULT 1,
  `description` text DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT current_timestamp(),
  `updated_at` datetime NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`uuid`),
  KEY `idx_allowances_version` (`level_version_uuid`),
  KEY `idx_allowances_type` (`allowance_type`),
  CONSTRAINT `fk_level_allowances_version` FOREIGN KEY (`level_version_uuid`) REFERENCES `LevelVersions` (`uuid`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `LevelVersions`
--

DROP TABLE IF EXISTS `LevelVersions`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `LevelVersions` (
  `uuid` varchar(36) NOT NULL,
  `level_uuid` varchar(36) NOT NULL,
  `base_salary` decimal(15,2) NOT NULL DEFAULT 0.00,
  `effective_from` date NOT NULL,
  `effective_to` date DEFAULT NULL,
  `version_number` int(11) NOT NULL DEFAULT 1,
  `notes` text DEFAULT NULL,
  `created_by_uuid` varchar(36) DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT current_timestamp(),
  `updated_at` datetime NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`uuid`),
  UNIQUE KEY `unique_level_effective_from` (`level_uuid`,`effective_from`),
  KEY `idx_level_versions_level` (`level_uuid`),
  KEY `idx_level_versions_effective` (`level_uuid`,`effective_from`,`effective_to`),
  KEY `fk_level_versions_created_by` (`created_by_uuid`),
  CONSTRAINT `fk_level_versions_created_by` FOREIGN KEY (`created_by_uuid`) REFERENCES `Users` (`uuid`) ON DELETE SET NULL,
  CONSTRAINT `fk_level_versions_level` FOREIGN KEY (`level_uuid`) REFERENCES `Levels` (`uuid`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `Levels`
--

DROP TABLE IF EXISTS `Levels`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `Levels` (
  `uuid` varchar(36) NOT NULL,
  `name` varchar(200) NOT NULL,
  `description` text DEFAULT NULL,
  `sort_order` int(11) NOT NULL DEFAULT 0,
  `is_active` tinyint(1) NOT NULL DEFAULT 1,
  `created_at` datetime NOT NULL DEFAULT current_timestamp(),
  `updated_at` datetime NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`uuid`),
  UNIQUE KEY `name` (`name`),
  KEY `idx_levels_active` (`is_active`),
  KEY `idx_levels_sort_order` (`sort_order`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `MesobIdSequence`
--

DROP TABLE IF EXISTS `MesobIdSequence`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `MesobIdSequence` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `created_at` datetime NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `Modules`
--

DROP TABLE IF EXISTS `Modules`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `Modules` (
  `uuid` varchar(36) NOT NULL,
  `code` varchar(50) NOT NULL,
  `name` varchar(100) NOT NULL,
  `description` text DEFAULT NULL,
  `icon` varchar(50) DEFAULT NULL,
  `display_order` int(11) NOT NULL DEFAULT 0,
  `is_active` tinyint(1) NOT NULL DEFAULT 1,
  `created_at` datetime NOT NULL DEFAULT current_timestamp(),
  `updated_at` datetime NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`uuid`),
  UNIQUE KEY `code` (`code`),
  KEY `idx_modules_code` (`code`),
  KEY `idx_modules_active` (`is_active`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `NetworkSettings`
--

DROP TABLE IF EXISTS `NetworkSettings`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `NetworkSettings` (
  `uuid` varchar(36) NOT NULL,
  `label` varchar(100) NOT NULL,
  `ip_range` varchar(50) NOT NULL,
  `is_active` tinyint(1) DEFAULT 1,
  `created_at` timestamp NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`uuid`),
  KEY `idx_network_settings_active` (`is_active`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `Notifications`
--

DROP TABLE IF EXISTS `Notifications`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `Notifications` (
  `uuid` varchar(36) NOT NULL,
  `recipient_uuid` varchar(36) NOT NULL,
  `sender_uuid` varchar(36) DEFAULT NULL,
  `sender_role` varchar(100) DEFAULT NULL,
  `notification_type` varchar(80) NOT NULL,
  `title` varchar(255) NOT NULL,
  `message` text NOT NULL,
  `redirect_url` varchar(500) DEFAULT NULL,
  `entity_type` varchar(50) DEFAULT NULL,
  `entity_uuid` varchar(50) DEFAULT NULL,
  `is_read` tinyint(1) NOT NULL DEFAULT 0,
  `created_at` datetime NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`uuid`),
  KEY `idx_notif_recipient` (`recipient_uuid`),
  KEY `idx_notif_unread` (`recipient_uuid`,`is_read`),
  KEY `idx_notif_created` (`created_at`),
  KEY `fk_notifications_sender` (`sender_uuid`),
  CONSTRAINT `fk_notifications_recipient` FOREIGN KEY (`recipient_uuid`) REFERENCES `Users` (`uuid`) ON DELETE CASCADE,
  CONSTRAINT `fk_notifications_sender` FOREIGN KEY (`sender_uuid`) REFERENCES `Users` (`uuid`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `OccupationDelegations`
--

DROP TABLE IF EXISTS `OccupationDelegations`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `OccupationDelegations` (
  `uuid` varchar(36) NOT NULL,
  `delegator_user_uuid` varchar(36) NOT NULL,
  `delegatee_user_uuid` varchar(36) NOT NULL,
  `occupation_uuid` varchar(36) NOT NULL,
  `start_date` datetime NOT NULL,
  `end_date` datetime NOT NULL,
  `delegation_reason` text DEFAULT NULL,
  `revoked_at` datetime DEFAULT NULL,
  `revoked_by_uuid` varchar(36) DEFAULT NULL,
  `delegation_chain_level` int(11) DEFAULT NULL,
  `original_delegator_uuid` varchar(36) DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`uuid`),
  KEY `idx_delegations_delegatee` (`delegatee_user_uuid`),
  KEY `idx_delegations_delegator` (`delegator_user_uuid`),
  KEY `idx_delegations_active` (`end_date`,`revoked_at`),
  KEY `idx_delegations_occupation` (`occupation_uuid`),
  KEY `fk_delegations_revoked_by` (`revoked_by_uuid`),
  CONSTRAINT `fk_delegations_delegatee` FOREIGN KEY (`delegatee_user_uuid`) REFERENCES `Users` (`uuid`) ON DELETE CASCADE,
  CONSTRAINT `fk_delegations_delegator` FOREIGN KEY (`delegator_user_uuid`) REFERENCES `Users` (`uuid`) ON DELETE CASCADE,
  CONSTRAINT `fk_delegations_occupation` FOREIGN KEY (`occupation_uuid`) REFERENCES `Occupations` (`uuid`) ON DELETE CASCADE,
  CONSTRAINT `fk_delegations_revoked_by` FOREIGN KEY (`revoked_by_uuid`) REFERENCES `Users` (`uuid`) ON DELETE SET NULL,
  CONSTRAINT `CONSTRAINT_1` CHECK (`end_date` > `start_date`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `Occupations`
--

DROP TABLE IF EXISTS `Occupations`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `Occupations` (
  `uuid` varchar(36) NOT NULL,
  `code` varchar(100) DEFAULT NULL,
  `name` varchar(200) NOT NULL,
  `description` text DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`uuid`),
  UNIQUE KEY `name` (`name`),
  UNIQUE KEY `code` (`code`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `OrganizationConfig`
--

DROP TABLE IF EXISTS `OrganizationConfig`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `OrganizationConfig` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `organization_name_en` varchar(255) DEFAULT NULL,
  `organization_name_am` varchar(255) DEFAULT NULL,
  `address_line1_en` varchar(255) DEFAULT NULL,
  `address_line1_am` varchar(255) DEFAULT NULL,
  `address_line2_en` varchar(255) DEFAULT NULL,
  `address_line2_am` varchar(255) DEFAULT NULL,
  `phone` varchar(50) DEFAULT NULL,
  `email` varchar(255) DEFAULT NULL,
  `logo_key` varchar(500) DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT current_timestamp(),
  `updated_at` datetime NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `Positions`
--

DROP TABLE IF EXISTS `Positions`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `Positions` (
  `uuid` varchar(36) NOT NULL,
  `title` varchar(200) NOT NULL,
  `grade` varchar(50) DEFAULT NULL,
  `department_uuid` varchar(36) DEFAULT NULL,
  `default_shift_uuid` varchar(36) DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT current_timestamp(),
  `updated_at` datetime NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`uuid`),
  KEY `idx_positions_department` (`department_uuid`),
  KEY `fk_positions_default_shift` (`default_shift_uuid`),
  CONSTRAINT `fk_positions_default_shift` FOREIGN KEY (`default_shift_uuid`) REFERENCES `ShiftDefinitions` (`uuid`) ON DELETE SET NULL,
  CONSTRAINT `fk_positions_department` FOREIGN KEY (`department_uuid`) REFERENCES `Departments` (`uuid`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `RoleModules`
--

DROP TABLE IF EXISTS `RoleModules`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `RoleModules` (
  `uuid` varchar(36) NOT NULL,
  `role_uuid` varchar(36) NOT NULL,
  `module_uuid` varchar(36) NOT NULL,
  `scope_uuid` varchar(36) NOT NULL,
  `created_at` datetime NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`uuid`),
  UNIQUE KEY `uk_role_module` (`role_uuid`,`module_uuid`),
  KEY `idx_rm_role` (`role_uuid`),
  KEY `idx_rm_module` (`module_uuid`),
  KEY `idx_rm_scope` (`scope_uuid`),
  CONSTRAINT `fk_rm_module` FOREIGN KEY (`module_uuid`) REFERENCES `Modules` (`uuid`) ON DELETE CASCADE,
  CONSTRAINT `fk_rm_role` FOREIGN KEY (`role_uuid`) REFERENCES `Roles` (`uuid`) ON DELETE CASCADE,
  CONSTRAINT `fk_rm_scope` FOREIGN KEY (`scope_uuid`) REFERENCES `Scopes` (`uuid`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `RoleOccupations`
--

DROP TABLE IF EXISTS `RoleOccupations`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `RoleOccupations` (
  `uuid` varchar(36) NOT NULL,
  `role` varchar(100) NOT NULL,
  `occupation_uuid` varchar(36) NOT NULL,
  `assigned_by_uuid` varchar(36) DEFAULT NULL,
  `assigned_at` datetime NOT NULL DEFAULT current_timestamp(),
  `assigned_reason` text DEFAULT NULL,
  PRIMARY KEY (`uuid`),
  UNIQUE KEY `unique_role_occupation` (`role`,`occupation_uuid`),
  KEY `idx_role_occupations_role` (`role`),
  KEY `idx_role_occupations_occupation` (`occupation_uuid`),
  KEY `fk_role_occupations_assigned_by` (`assigned_by_uuid`),
  CONSTRAINT `fk_role_occupations_assigned_by` FOREIGN KEY (`assigned_by_uuid`) REFERENCES `Users` (`uuid`) ON DELETE SET NULL,
  CONSTRAINT `fk_role_occupations_occupation` FOREIGN KEY (`occupation_uuid`) REFERENCES `Occupations` (`uuid`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `Roles`
--

DROP TABLE IF EXISTS `Roles`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `Roles` (
  `uuid` varchar(36) NOT NULL,
  `code` varchar(50) NOT NULL,
  `name` varchar(100) NOT NULL,
  `description` text DEFAULT NULL,
  `default_scope_uuid` varchar(36) DEFAULT NULL,
  `hierarchy_level` int(11) NOT NULL DEFAULT 10,
  `is_system_role` tinyint(1) NOT NULL DEFAULT 0,
  `is_active` tinyint(1) NOT NULL DEFAULT 1,
  `created_at` datetime NOT NULL DEFAULT current_timestamp(),
  `updated_at` datetime NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`uuid`),
  UNIQUE KEY `code` (`code`),
  KEY `idx_roles_code` (`code`),
  KEY `idx_roles_active` (`is_active`),
  KEY `idx_roles_hierarchy` (`hierarchy_level`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `Scopes`
--

DROP TABLE IF EXISTS `Scopes`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `Scopes` (
  `uuid` varchar(36) NOT NULL,
  `code` varchar(50) NOT NULL,
  `name` varchar(100) NOT NULL,
  `description` text DEFAULT NULL,
  `level` int(11) NOT NULL DEFAULT 0,
  `created_at` datetime NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`uuid`),
  UNIQUE KEY `code` (`code`),
  KEY `idx_scopes_code` (`code`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `ShiftDefinitions`
--

DROP TABLE IF EXISTS `ShiftDefinitions`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `ShiftDefinitions` (
  `uuid` varchar(36) NOT NULL,
  `name` varchar(100) NOT NULL,
  `start_time` time NOT NULL,
  `end_time` time NOT NULL,
  `working_days_json` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`working_days_json`)),
  `grace_period_minutes` int(11) NOT NULL DEFAULT 15,
  `break_duration_minutes` int(11) NOT NULL DEFAULT 0,
  `created_at` datetime NOT NULL DEFAULT current_timestamp(),
  `updated_at` datetime NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`uuid`),
  UNIQUE KEY `name` (`name`),
  KEY `idx_shifts_name` (`name`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `UserScopes`
--

DROP TABLE IF EXISTS `UserScopes`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `UserScopes` (
  `uuid` varchar(36) NOT NULL,
  `user_uuid` varchar(36) NOT NULL,
  `scope_type` enum('SELF','DEPARTMENT','BRANCH','COMPANY','ALL') NOT NULL,
  `scope_value` varchar(36) DEFAULT NULL,
  `assigned_by_uuid` varchar(36) DEFAULT NULL,
  `assigned_at` datetime NOT NULL DEFAULT current_timestamp(),
  `assigned_reason` text DEFAULT NULL,
  PRIMARY KEY (`uuid`),
  KEY `idx_user_scopes_user` (`user_uuid`),
  KEY `idx_user_scopes_type` (`scope_type`),
  KEY `fk_user_scopes_assigned_by` (`assigned_by_uuid`),
  CONSTRAINT `fk_user_scopes_assigned_by` FOREIGN KEY (`assigned_by_uuid`) REFERENCES `Users` (`uuid`) ON DELETE SET NULL,
  CONSTRAINT `fk_user_scopes_user` FOREIGN KEY (`user_uuid`) REFERENCES `Users` (`uuid`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `Users`
--

DROP TABLE IF EXISTS `Users`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `Users` (
  `uuid` varchar(36) NOT NULL,
  `employee_uuid` varchar(36) DEFAULT NULL,
  `username` varchar(100) NOT NULL,
  `password_hash` varchar(255) NOT NULL,
  `refresh_token` text DEFAULT NULL,
  `token_version` int(11) NOT NULL DEFAULT 0,
  `permissions_version` int(11) NOT NULL DEFAULT 1,
  `role` varchar(100) NOT NULL COMMENT 'Permit.io role key - must match a role in Permit',
  `role_uuid` varchar(36) DEFAULT NULL,
  `role_id` int(11) DEFAULT NULL,
  `is_active` tinyint(1) NOT NULL DEFAULT 1,
  `must_change_password` tinyint(1) DEFAULT 0,
  `last_login` datetime DEFAULT NULL,
  `last_activity` datetime DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT current_timestamp(),
  `updated_at` datetime NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`uuid`),
  UNIQUE KEY `username` (`username`),
  KEY `idx_users_employee` (`employee_uuid`),
  KEY `idx_users_permissions_version` (`permissions_version`),
  KEY `idx_users_role_uuid` (`role_uuid`),
  KEY `idx_users_role` (`role`),
  CONSTRAINT `fk_users_employee` FOREIGN KEY (`employee_uuid`) REFERENCES `Employees` (`uuid`) ON DELETE CASCADE,
  CONSTRAINT `fk_users_role` FOREIGN KEY (`role_uuid`) REFERENCES `Roles` (`uuid`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `_migrations`
--

DROP TABLE IF EXISTS `_migrations`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `_migrations` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `filename` varchar(255) NOT NULL,
  `executed_at` datetime NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id`),
  UNIQUE KEY `filename` (`filename`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `budgetYears`
--

DROP TABLE IF EXISTS `budgetYears`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `budgetYears` (
  `uuid` varchar(50) NOT NULL,
  `year` int(11) NOT NULL,
  `start_date` date NOT NULL,
  `end_date` date NOT NULL,
  `is_active` tinyint(1) NOT NULL DEFAULT 1,
  `created_at` datetime NOT NULL DEFAULT current_timestamp(),
  `updated_at` datetime NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  `status` enum('ACTIVE','INACTIVE','DRAFT') NOT NULL DEFAULT 'ACTIVE',
  PRIMARY KEY (`uuid`),
  UNIQUE KEY `year` (`year`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `employeeLeaveBalances`
--

DROP TABLE IF EXISTS `employeeLeaveBalances`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `employeeLeaveBalances` (
  `uuid` varchar(50) NOT NULL,
  `employee_uuid` varchar(36) NOT NULL,
  `budgetYear` varchar(10) NOT NULL,
  `entitledDays` decimal(8,1) NOT NULL,
  `carriedForwardDays` decimal(8,1) NOT NULL DEFAULT 0.0,
  `usedDays` decimal(8,1) NOT NULL DEFAULT 0.0,
  `remainingDays` decimal(8,1) NOT NULL,
  `status` enum('ACTIVE','INACTIVE') NOT NULL DEFAULT 'ACTIVE',
  `updatedAt` date NOT NULL DEFAULT curdate(),
  PRIMARY KEY (`uuid`),
  KEY `idx_balance_employee_year` (`employee_uuid`,`budgetYear`),
  CONSTRAINT `fk_leave_balances_employee` FOREIGN KEY (`employee_uuid`) REFERENCES `Employees` (`uuid`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `leavePolicies`
--

DROP TABLE IF EXISTS `leavePolicies`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `leavePolicies` (
  `uuid` varchar(50) NOT NULL,
  `leaveType` varchar(50) NOT NULL,
  `baseDays` int(11) NOT NULL,
  `incrementPerYear` int(11) NOT NULL,
  `maxDays` int(11) NOT NULL,
  `eligibilityMonths` int(11) NOT NULL,
  `useBudgetYear` tinyint(1) NOT NULL,
  PRIMARY KEY (`uuid`),
  UNIQUE KEY `leaveType` (`leaveType`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `leavePostponements`
--

DROP TABLE IF EXISTS `leavePostponements`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `leavePostponements` (
  `uuid` varchar(50) NOT NULL,
  `employee_uuid` varchar(36) NOT NULL,
  `leaveBalanceUuid` varchar(50) NOT NULL,
  `postponedDays` decimal(8,1) NOT NULL,
  `reason` text DEFAULT NULL,
  `status` enum('APPROVED','REJECTED') NOT NULL,
  `created_at` datetime NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`uuid`),
  KEY `idx_postponements_employee` (`employee_uuid`),
  KEY `fk_postponements_balance` (`leaveBalanceUuid`),
  CONSTRAINT `fk_postponements_balance` FOREIGN KEY (`leaveBalanceUuid`) REFERENCES `employeeLeaveBalances` (`uuid`) ON DELETE CASCADE,
  CONSTRAINT `fk_postponements_employee` FOREIGN KEY (`employee_uuid`) REFERENCES `Employees` (`uuid`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `leaveRequestDocuments`
--

DROP TABLE IF EXISTS `leaveRequestDocuments`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `leaveRequestDocuments` (
  `uuid` varchar(50) NOT NULL,
  `leaveRequestUuid` varchar(50) NOT NULL,
  `employee_uuid` varchar(36) NOT NULL,
  `originalName` varchar(255) NOT NULL,
  `objectKey` varchar(512) NOT NULL,
  `mimeType` varchar(120) NOT NULL,
  `sizeBytes` bigint(20) NOT NULL,
  `createdAt` datetime NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`uuid`),
  KEY `idx_leave_docs_request` (`leaveRequestUuid`),
  KEY `idx_leave_docs_employee` (`employee_uuid`),
  CONSTRAINT `fk_leave_docs_employee` FOREIGN KEY (`employee_uuid`) REFERENCES `Employees` (`uuid`) ON DELETE CASCADE,
  CONSTRAINT `fk_leave_docs_request` FOREIGN KEY (`leaveRequestUuid`) REFERENCES `leaveRequests` (`uuid`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `leaveRequests`
--

DROP TABLE IF EXISTS `leaveRequests`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `leaveRequests` (
  `uuid` varchar(50) NOT NULL,
  `employee_uuid` varchar(36) NOT NULL,
  `leaveType` varchar(50) DEFAULT NULL,
  `startDate` date NOT NULL,
  `endDate` date NOT NULL,
  `total_days` decimal(8,1) NOT NULL,
  `dayPattern` varchar(20) DEFAULT NULL,
  `dailyPlanJson` text DEFAULT NULL,
  `reason` text DEFAULT NULL,
  `rejectionReason` text DEFAULT NULL,
  `supportingDocument` varchar(255) DEFAULT NULL,
  `status` enum('PENDING','PENDING_DEPARTMENT','PENDING_HR','APPROVED','REJECTED','REJECTED_DEPARTMENT','REJECTED_HR','CANCELLED') NOT NULL DEFAULT 'PENDING_DEPARTMENT',
  `department_head_id` int(11) DEFAULT NULL,
  `hr_supervisor_id` int(11) DEFAULT NULL,
  `cancelled_at` datetime DEFAULT NULL,
  `cancelled_by` varchar(36) DEFAULT NULL,
  `original_end_date` date DEFAULT NULL,
  `actual_return_date` date DEFAULT NULL,
  `is_shortened` tinyint(1) NOT NULL DEFAULT 0,
  `shortened_at` datetime DEFAULT NULL,
  `shortened_by` varchar(36) DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT current_timestamp(),
  `updated_at` datetime NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`uuid`),
  KEY `idx_requests_employee_status` (`employee_uuid`,`status`),
  KEY `idx_requests_dates` (`startDate`,`endDate`),
  CONSTRAINT `fk_leave_requests_employee` FOREIGN KEY (`employee_uuid`) REFERENCES `Employees` (`uuid`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
/*!40103 SET TIME_ZONE=@OLD_TIME_ZONE */;

/*!40101 SET SQL_MODE=@OLD_SQL_MODE */;
/*!40014 SET FOREIGN_KEY_CHECKS=@OLD_FOREIGN_KEY_CHECKS */;
/*!40014 SET UNIQUE_CHECKS=@OLD_UNIQUE_CHECKS */;
/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
/*M!100616 SET NOTE_VERBOSITY=@OLD_NOTE_VERBOSITY */;

-- Dump completed on 2026-10-06 21:23:50
