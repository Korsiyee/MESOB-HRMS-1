mysqldump: Deprecated program name. It will be removed in a future release, use '/usr/bin/mariadb-dump' instead
/*M!999999\- enable the sandbox mode */ 
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
-- Dumping data for table `AccessAuditLogs`
--

SET @OLD_AUTOCOMMIT=@@AUTOCOMMIT, @@AUTOCOMMIT=0;
LOCK TABLES `AccessAuditLogs` WRITE;
/*!40000 ALTER TABLE `AccessAuditLogs` DISABLE KEYS */;
/*!40000 ALTER TABLE `AccessAuditLogs` ENABLE KEYS */;
UNLOCK TABLES;
COMMIT;
SET AUTOCOMMIT=@OLD_AUTOCOMMIT;

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
-- Dumping data for table `AttendanceLogs`
--

SET @OLD_AUTOCOMMIT=@@AUTOCOMMIT, @@AUTOCOMMIT=0;
LOCK TABLES `AttendanceLogs` WRITE;
/*!40000 ALTER TABLE `AttendanceLogs` DISABLE KEYS */;
/*!40000 ALTER TABLE `AttendanceLogs` ENABLE KEYS */;
UNLOCK TABLES;
COMMIT;
SET AUTOCOMMIT=@OLD_AUTOCOMMIT;

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
-- Dumping data for table `AttendanceSummary`
--

SET @OLD_AUTOCOMMIT=@@AUTOCOMMIT, @@AUTOCOMMIT=0;
LOCK TABLES `AttendanceSummary` WRITE;
/*!40000 ALTER TABLE `AttendanceSummary` DISABLE KEYS */;
/*!40000 ALTER TABLE `AttendanceSummary` ENABLE KEYS */;
UNLOCK TABLES;
COMMIT;
SET AUTOCOMMIT=@OLD_AUTOCOMMIT;

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
-- Dumping data for table `AuditLogs`
--

SET @OLD_AUTOCOMMIT=@@AUTOCOMMIT, @@AUTOCOMMIT=0;
LOCK TABLES `AuditLogs` WRITE;
/*!40000 ALTER TABLE `AuditLogs` DISABLE KEYS */;
INSERT INTO `AuditLogs` VALUES
('03f6fe1e-d24f-4785-9fc2-7b654f2aff02','user-admin-001','AUTH_LOGIN_SUCCESS','User','user-admin-001','{\"username\":\"admin\"}','::1','2026-10-06 21:09:29'),
('069b6e1a-b0e5-44e6-a2bd-1cc1eaba6894','user-admin-001','AUTH_LOGIN_SUCCESS','User','user-admin-001','{\"username\":\"admin\"}','::1','2026-09-22 23:31:34'),
('09a110e0-76d7-44e6-85f9-e197ef0fa25b','user-admin-001','AUTH_LOGOUT','User','user-admin-001',NULL,'::1','2026-09-24 14:10:04'),
('0b52f2c0-3e96-4779-9199-ae5a435efd7f','user-admin-001','AUTH_LOGOUT','User','user-admin-001',NULL,'::1','2026-09-24 19:30:05'),
('11132f9f-a4c5-40f4-922d-077079763f92','user-admin-001','AUTH_LOGIN_SUCCESS','User','user-admin-001','{\"username\":\"admin\"}','::1','2026-09-22 22:01:46'),
('12cfa356-b354-46f1-bba8-b75a63d07698','user-admin-001','AUTH_LOGIN_SUCCESS','User','user-admin-001','{\"username\":\"admin\"}','::1','2026-09-22 22:39:48'),
('190eae8d-387b-45f4-b086-d9a51b4dc74a','user-admin-001','AUTH_LOGIN_SUCCESS','User','user-admin-001','{\"username\":\"admin\"}','::1','2026-10-06 21:02:14'),
('19ad4057-4299-4a77-b4b1-3f5cd8774908','user-admin-001','AUTH_LOGIN_SUCCESS','User','user-admin-001','{\"username\":\"admin\"}','::1','2026-10-06 12:55:14'),
('1b6b4b6e-ecbd-4940-9940-95ba237af29c','user-admin-001','AUTH_LOGOUT','User','user-admin-001',NULL,'::1','2026-10-06 16:58:11'),
('22e1f158-0b39-4c97-a42f-b2976c4ae92b','user-admin-001','AUTH_LOGIN_SUCCESS','User','user-admin-001','{\"username\":\"admin\"}','::1','2026-10-05 12:17:10'),
('24f126b8-41be-406f-a94a-a2818d188172','user-admin-001','AUTH_LOGIN_SUCCESS','User','user-admin-001','{\"username\":\"admin\"}','::1','2026-09-22 23:36:24'),
('2aa2dff3-a660-4a7f-abf0-0d8f3e0c750f','user-admin-001','AUTH_LOGIN_SUCCESS','User','user-admin-001','{\"username\":\"admin\"}','::1','2026-10-06 17:34:45'),
('2ff915b3-0860-4ed3-8dc1-8a56ef5c563b','user-admin-001','AUTH_LOGOUT','User','user-admin-001',NULL,'::1','2026-10-06 16:56:36'),
('30e85064-a7bf-4e44-8039-86bd5aca5c18','user-admin-001','AUTH_LOGIN_SUCCESS','User','user-admin-001','{\"username\":\"admin\"}','::1','2026-09-24 17:40:00'),
('31419072-d93b-41ec-96c9-9d57aaa9a6df','user-admin-001','AUTH_LOGIN_SUCCESS','User','user-admin-001','{\"username\":\"admin\"}','::1','2026-09-22 23:31:28'),
('35ecbebd-6fd6-46f1-aaed-f2140856d1b0','user-admin-001','AUTH_LOGIN_SUCCESS','User','user-admin-001','{\"username\":\"admin\"}','::1','2026-10-06 16:58:27'),
('389b9a0d-8d8f-4142-af55-f759eab02d20','user-admin-001','AUTH_LOGIN_SUCCESS','User','user-admin-001','{\"username\":\"admin\"}','::1','2026-09-22 23:33:30'),
('3aa97257-bab7-42ff-bf0d-0a58448cf714','user-admin-001','AUTH_LOGIN_SUCCESS','User','user-admin-001','{\"username\":\"admin\"}','::1','2026-09-22 23:23:53'),
('3b958e04-a107-4921-a6a0-263933b9e9f0','user-admin-001','AUTH_LOGIN_SUCCESS','User','user-admin-001','{\"username\":\"admin\"}','::1','2026-09-22 22:39:41'),
('3baecfe1-ac4d-412c-9184-f7a3a9b73838','user-admin-001','AUTH_LOGIN_SUCCESS','User','user-admin-001','{\"username\":\"admin\"}','::1','2026-09-22 23:01:38'),
('3d96a7f5-f0f7-43ca-bdbd-bac7db54af5c','user-admin-001','AUTH_LOGIN_SUCCESS','User','user-admin-001','{\"username\":\"admin\"}','::1','2026-09-24 12:29:14'),
('3fa3629d-66a0-40be-8f0c-f8b93beb99ca','user-admin-001','AUTH_LOGIN_SUCCESS','User','user-admin-001','{\"username\":\"admin\"}','::1','2026-09-21 16:38:33'),
('4001a874-592a-4502-ac77-a909f8dea925',NULL,'AUTH_LOGIN_FAILED','Auth',NULL,'{\"username\":\"admin\"}','::1','2026-09-21 16:34:19'),
('4186ab63-cd61-48f4-add4-a280ba791617','user-admin-001','AUTH_LOGIN_SUCCESS','User','user-admin-001','{\"username\":\"admin\"}','::1','2026-09-24 12:22:17'),
('42ca7768-85ab-4353-9475-85bcebaf7c48','user-admin-001','AUTH_LOGIN_SUCCESS','User','user-admin-001','{\"username\":\"admin\"}','::1','2026-09-22 22:40:42'),
('46f9bc20-fe6f-410f-b114-48c125f396e2','user-admin-001','AUTH_LOGIN_SUCCESS','User','user-admin-001','{\"username\":\"admin\"}','::1','2026-10-06 17:23:34'),
('486adfc9-554d-4b79-9897-bad506a91ddb','user-admin-001','AUTH_LOGIN_SUCCESS','User','user-admin-001','{\"username\":\"admin\"}','::1','2026-09-24 12:46:31'),
('48d32a11-08ea-438f-b0da-879bcb9b0212','user-admin-001','AUTH_LOGIN_SUCCESS','User','user-admin-001','{\"username\":\"admin\"}','::1','2026-09-22 22:39:46'),
('528e3d7f-0128-4775-b26a-117f16de633c','user-admin-001','AUTH_LOGIN_SUCCESS','User','user-admin-001','{\"username\":\"admin\"}','::1','2026-09-22 23:02:40'),
('53568876-984e-4787-8662-2b10fe3f1140','user-admin-001','AUTH_LOGIN_SUCCESS','User','user-admin-001','{\"username\":\"admin\"}','::1','2026-10-06 16:57:41'),
('5a9112f9-a95e-43cb-a958-014bfa3ccc26','user-admin-001','AUTH_LOGIN_SUCCESS','User','user-admin-001','{\"username\":\"admin\"}','::1','2026-09-22 23:10:33'),
('5af0b68b-e84f-4469-85d4-44e508cdf174','user-admin-001','AUTH_LOGIN_SUCCESS','User','user-admin-001','{\"username\":\"admin\"}','::1','2026-10-06 14:57:31'),
('5c10acc3-c174-4fcc-93e9-07b7038ce800','user-admin-001','AUTH_LOGIN_SUCCESS','User','user-admin-001','{\"username\":\"admin\"}','::1','2026-10-05 22:24:54'),
('60a7a1d4-ef47-485b-8673-e173c31f7523',NULL,'AUTH_LOGIN_FAILED','Auth',NULL,'{\"username\":\"admin\"}','::1','2026-09-21 16:34:20'),
('643387ac-7522-4ffe-a819-3efc0601d95c','user-admin-001','AUTH_LOGIN_SUCCESS','User','user-admin-001','{\"username\":\"admin\"}','::1','2026-09-22 21:57:55'),
('6477060d-b2b9-4f19-ae9d-ced5daf98389','user-admin-001','AUTH_LOGIN_SUCCESS','User','user-admin-001','{\"username\":\"admin\"}','::1','2026-09-24 12:33:03'),
('659d3b9f-8776-4bfe-8d07-7a3ba5cd6fec','user-admin-001','AUTH_LOGIN_SUCCESS','User','user-admin-001','{\"username\":\"admin\"}','::1','2026-10-06 20:48:10'),
('68152358-7664-4f23-b784-f281cd24d84b','user-admin-001','AUTH_LOGIN_SUCCESS','User','user-admin-001','{\"username\":\"admin\"}','::1','2026-10-05 22:20:54'),
('69b59813-33b5-4bce-b942-ecb0309c0439','user-admin-001','AUTH_LOGIN_SUCCESS','User','user-admin-001','{\"username\":\"admin\"}','::1','2026-09-22 23:01:21'),
('6a0482ea-1057-4195-af74-c33cfd0babe0','user-admin-001','AUTH_LOGIN_SUCCESS','User','user-admin-001','{\"username\":\"admin\"}','::1','2026-09-24 11:13:35'),
('6a475a6b-56a8-448f-9c76-1436ade73ace','user-admin-001','AUTH_LOGIN_SUCCESS','User','user-admin-001','{\"username\":\"admin\"}','::1','2026-09-24 11:24:09'),
('6c8107a4-3d3b-42ce-a22d-c3b359096ea6','user-admin-001','AUTH_LOGIN_SUCCESS','User','user-admin-001','{\"username\":\"admin\"}','::1','2026-09-24 18:29:27'),
('7574226a-ef7a-4a83-b55b-6bec91418c0c','user-admin-001','AUTH_LOGOUT','User','user-admin-001',NULL,'::1','2026-09-24 18:29:25'),
('790d4b73-8c3f-4353-b424-294a3544cd15','user-admin-001','AUTH_LOGIN_SUCCESS','User','user-admin-001','{\"username\":\"admin\"}','::1','2026-09-22 21:57:44'),
('7a765b07-e374-44da-83f2-58fcf55e3ed9','user-admin-001','AUTH_LOGIN_SUCCESS','User','user-admin-001','{\"username\":\"admin\"}','::1','2026-10-06 17:53:07'),
('7c61d1c5-7309-4057-89ea-6884baf8a073','user-admin-001','AUTH_LOGIN_SUCCESS','User','user-admin-001','{\"username\":\"admin\"}','::1','2026-09-24 11:27:33'),
('7da5fb69-7502-4bf3-9a40-735283c82631','user-admin-001','AUTH_LOGIN_SUCCESS','User','user-admin-001','{\"username\":\"admin\"}','::1','2026-09-24 12:32:42'),
('7e40c7ed-ce6c-4088-9678-b66b13ce3bd0','user-admin-001','AUTH_LOGOUT','User','user-admin-001',NULL,'::1','2026-10-06 17:53:01'),
('8700372f-f51d-493d-b757-efbfc0c7c51f',NULL,'AUTH_LOGIN_FAILED','Auth',NULL,'{\"username\":\"admin\"}','::1','2026-09-21 16:29:23'),
('89dae858-42a0-4770-8c53-6c1da0246c36','user-admin-001','AUTH_LOGIN_SUCCESS','User','user-admin-001','{\"username\":\"admin\"}','::1','2026-09-22 22:44:31'),
('8a148607-e056-41ae-a0a0-9f1eff502894','user-admin-001','AUTH_LOGIN_SUCCESS','User','user-admin-001','{\"username\":\"admin\"}','::1','2026-10-06 16:56:38'),
('8bbf2f53-3b6a-4b90-b4f1-60a440fab70b','user-admin-001','AUTH_LOGOUT','User','user-admin-001',NULL,'::1','2026-10-06 17:34:38'),
('96dc198a-7cb7-46a6-b219-038e46747166','user-admin-001','AUTH_LOGIN_SUCCESS','User','user-admin-001','{\"username\":\"admin\"}','::1','2026-09-24 14:07:40'),
('96eb9057-9660-4f2a-9fc7-d4beb766fd43','user-admin-001','AUTH_LOGOUT','User','user-admin-001',NULL,'::1','2026-10-06 20:43:50'),
('9c8ff3e4-fc1e-472e-b974-fe259e98c1e1','user-admin-001','AUTH_LOGIN_SUCCESS','User','user-admin-001','{\"username\":\"admin\"}','::1','2026-09-22 22:53:18'),
('a490b41e-5450-4c16-b310-332b2ac68fdd',NULL,'AUTH_LOGIN_FAILED','Auth',NULL,'{\"username\":\"admin\"}','::1','2026-09-21 16:29:20'),
('a9d59a1f-a01d-48cf-8c97-c975f962fffa','user-admin-001','AUTH_LOGOUT','User','user-admin-001',NULL,'::1','2026-09-24 21:26:38'),
('aed03b3a-2389-48e8-91a6-16f6b92f089c','user-admin-001','AUTH_LOGIN_SUCCESS','User','user-admin-001','{\"username\":\"admin\"}','::1','2026-09-22 22:53:22'),
('af2f982c-0e5a-4773-a9a4-43bb7f5c23eb','user-admin-001','AUTH_LOGIN_SUCCESS','User','user-admin-001','{\"username\":\"admin\"}','::1','2026-09-22 22:44:34'),
('audit-001',NULL,'CREATE','Employee','emp-1001','{\"action\":\"New Employee Added\",\"name\":\"Abel Tesfaye\"}','192.168.1.100','2026-09-21 16:27:50'),
('audit-002',NULL,'CREATE','Employee','emp-1002','{\"action\":\"New Employee Added\",\"name\":\"Marta Alem\"}','192.168.1.100','2026-09-21 16:27:50'),
('audit-003',NULL,'CREATE','Employee','emp-1003','{\"action\":\"New Employee Added\",\"name\":\"Sami Bekele\"}','192.168.1.100','2026-09-21 16:27:50'),
('audit-004',NULL,'APPROVE','LeaveRequest','req-1001-001','{\"action\":\"Leave Request Approved\",\"status\":\"APPROVED\"}','192.168.1.101','2026-09-21 16:27:50'),
('audit-005',NULL,'APPROVE','LeaveRequest','req-1002-001','{\"action\":\"Leave Request Approved\",\"status\":\"APPROVED\"}','192.168.1.101','2026-09-21 16:27:50'),
('audit-006',NULL,'DEPARTMENT_TRANSFER','Employee','emp-1010','{\"action\":\"Department Transfer\",\"from\":\"dept-001\",\"to\":\"dept-009\"}','192.168.1.102','2026-09-21 16:27:50'),
('audit-007',NULL,'STATUS_CHANGED','Employee','emp-1015','{\"action\":\"Status Changed to Active\",\"status\":\"ACTIVE\"}','192.168.1.100','2026-09-21 16:27:50'),
('audit-008',NULL,'CREATE','Employee','emp-1020','{\"action\":\"New Employee Added\",\"name\":\"Tewodros Bekele\"}','192.168.1.101','2026-09-21 16:27:50'),
('audit-009',NULL,'APPROVE','LeaveRequest','req-1005-001','{\"action\":\"Leave Request Approved\",\"status\":\"APPROVED\"}','192.168.1.103','2026-09-21 16:27:50'),
('audit-010',NULL,'CREATE','Employee','emp-1025','{\"action\":\"New Employee Added\",\"name\":\"Bereket Girma\"}','192.168.1.100','2026-09-21 16:27:50'),
('b02a3d10-f468-4fce-8d92-03f313e75ba8','user-admin-001','AUTH_LOGIN_SUCCESS','User','user-admin-001','{\"username\":\"admin\"}','::1','2026-09-24 12:28:39'),
('b2aae572-47c0-4702-a9de-debbb66941c6',NULL,'AUTH_LOGIN_FAILED','Auth',NULL,'{\"username\":\"admin\"}','::1','2026-09-21 16:34:20'),
('b3073af9-0cb4-4f01-b845-0d14cb0b4bd3',NULL,'AUTH_LOGIN_FAILED','Auth',NULL,'{\"username\":\"admin\"}','::1','2026-09-21 16:34:18'),
('b5199a28-e81d-4ba6-a997-9068d1ceb64d','user-admin-001','AUTH_LOGIN_SUCCESS','User','user-admin-001','{\"username\":\"admin\"}','::1','2026-09-24 12:46:25'),
('b7dafd30-c9f2-4b2a-9396-5ad148eb6921','user-admin-001','AUTH_LOGIN_SUCCESS','User','user-admin-001','{\"username\":\"admin\"}','::1','2026-10-06 20:58:02'),
('ba8f2a55-54e6-4851-9e4d-f0a99435287e','user-admin-001','AUTH_LOGIN_SUCCESS','User','user-admin-001','{\"username\":\"admin\"}','::1','2026-09-24 11:52:18'),
('bc370e1a-319b-4a0d-bf99-82ad9364d25e','user-admin-001','AUTH_LOGIN_SUCCESS','User','user-admin-001','{\"username\":\"admin\"}','::1','2026-09-22 23:27:04'),
('c38717de-75d7-467b-bbef-b84bec45131b','user-admin-001','AUTH_LOGIN_SUCCESS','User','user-admin-001','{\"username\":\"admin\"}','::1','2026-09-22 22:43:08'),
('c6f12898-7cb1-4e65-b368-0a6f1797f8f3',NULL,'AUTH_LOGIN_FAILED','Auth',NULL,'{\"username\":\"admin\"}','::1','2026-09-21 16:34:55'),
('c72281e9-4515-455a-bb5a-56aba76939f0','user-admin-001','AUTH_LOGIN_SUCCESS','User','user-admin-001','{\"username\":\"admin\"}','::1','2026-09-22 22:54:08'),
('ca7d930e-a0b0-4e10-91fd-d65ff3c42d24','user-admin-001','AUTH_LOGIN_SUCCESS','User','user-admin-001','{\"username\":\"admin\"}','::1','2026-09-22 23:27:42'),
('cba4c380-abf3-41dc-8fd5-3259e745bb5b','user-admin-001','AUTH_LOGIN_SUCCESS','User','user-admin-001','{\"username\":\"admin\"}','::1','2026-10-06 16:18:52'),
('d24a8d5e-b823-41ee-91dd-66cc75c32cf1',NULL,'AUTH_LOGIN_FAILED','Auth',NULL,'{\"username\":\"depthead\"}','::1','2026-10-06 20:44:57'),
('d2c990dd-ef2e-41b4-b667-37d8b80e08c4','user-admin-001','AUTH_LOGIN_SUCCESS','User','user-admin-001','{\"username\":\"admin\"}','::1','2026-09-24 21:26:41'),
('d3df2670-9885-4a2c-a4dd-40541a13f191','user-admin-001','AUTH_LOGIN_SUCCESS','User','user-admin-001','{\"username\":\"admin\"}','::1','2026-09-24 12:15:49'),
('d760dfba-b7a9-4d39-80c0-b1ee149794ea','user-admin-001','AUTH_LOGIN_SUCCESS','User','user-admin-001','{\"username\":\"admin\"}','::1','2026-09-24 12:25:12'),
('dc167b07-67f1-461e-9545-685f1598a40d','user-admin-001','AUTH_LOGIN_SUCCESS','User','user-admin-001','{\"username\":\"admin\"}','::1','2026-09-22 23:01:49'),
('ded3c1c0-c3c2-45f7-8a8c-0b739740eedc','user-admin-001','AUTH_LOGIN_SUCCESS','User','user-admin-001','{\"username\":\"admin\"}','::1','2026-09-22 22:43:28'),
('e012e993-0c13-4e32-a250-5807824c83db','user-admin-001','AUTH_LOGIN_SUCCESS','User','user-admin-001','{\"username\":\"admin\"}','::1','2026-09-22 22:03:00'),
('e23c1cbc-6793-4cf6-bad3-d5c25d9e5655','user-admin-001','AUTH_LOGIN_SUCCESS','User','user-admin-001','{\"username\":\"admin\"}','::1','2026-09-24 14:10:08'),
('e60e9b51-0bde-4cb4-9b5f-912fe592aaa2','user-admin-001','AUTH_LOGOUT','User','user-admin-001',NULL,'::1','2026-10-05 22:24:45'),
('e756edbc-222f-45d9-87a3-22d42d85388b','user-admin-001','AUTH_LOGOUT','User','user-admin-001',NULL,'::1','2026-10-06 16:40:59'),
('e9a2884b-3a3d-430f-aeeb-900981243fa7',NULL,'AUTH_LOGIN_FAILED','Auth',NULL,'{\"username\":\"depthead\"}','::1','2026-10-06 20:45:27'),
('eac1aa08-f127-4a9b-ba97-0bac9d01af4b','user-admin-001','AUTH_LOGIN_SUCCESS','User','user-admin-001','{\"username\":\"admin\"}','::1','2026-09-22 23:01:45'),
('eb25290c-daec-4250-94fc-76f4783aa9d4',NULL,'AUTH_LOGIN_FAILED','Auth',NULL,'{\"username\":\"admin\"}','::1','2026-09-22 21:57:29'),
('ee168dcc-e8f1-4603-bdab-6027d44a24f3','user-admin-001','AUTH_LOGIN_SUCCESS','User','user-admin-001','{\"username\":\"admin\"}','::1','2026-09-22 23:28:23'),
('ef260ca9-3251-4d2a-8551-0b0580b45cd5','user-admin-001','AUTH_LOGIN_SUCCESS','User','user-admin-001','{\"username\":\"admin\"}','::1','2026-10-06 16:41:04'),
('f393f39d-e91a-413b-b406-ea2927bd5cf3','user-admin-001','AUTH_LOGIN_SUCCESS','User','user-admin-001','{\"username\":\"admin\"}','::1','2026-10-06 16:47:16'),
('f481e46c-7ec6-48d8-b28c-c1566cf62b74',NULL,'AUTH_LOGIN_FAILED','Auth',NULL,'{\"username\":\"admin\"}','::1','2026-09-21 16:29:21'),
('f4b391a7-cf4c-4cd9-9289-39bc9f5cd6ef','user-admin-001','AUTH_LOGIN_SUCCESS','User','user-admin-001','{\"username\":\"admin\"}','::1','2026-09-24 19:30:09'),
('f72d10bc-0447-44a7-b1e7-268de396e397','user-admin-001','AUTH_LOGIN_SUCCESS','User','user-admin-001','{\"username\":\"admin\"}','::1','2026-09-24 12:46:37'),
('faaa627f-8262-40f5-8dee-fb50f1d6fcd7','user-admin-001','AUTH_LOGIN_SUCCESS','User','user-admin-001','{\"username\":\"admin\"}','::1','2026-09-24 11:50:52');
/*!40000 ALTER TABLE `AuditLogs` ENABLE KEYS */;
UNLOCK TABLES;
COMMIT;
SET AUTOCOMMIT=@OLD_AUTOCOMMIT;

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
-- Dumping data for table `Departments`
--

SET @OLD_AUTOCOMMIT=@@AUTOCOMMIT, @@AUTOCOMMIT=0;
LOCK TABLES `Departments` WRITE;
/*!40000 ALTER TABLE `Departments` DISABLE KEYS */;
INSERT INTO `Departments` VALUES
('dept-001','Human Resources',NULL,NULL,'2026-09-21 16:27:39','2026-09-21 16:27:39'),
('dept-002','Finance & Accounting',NULL,NULL,'2026-09-21 16:27:39','2026-09-21 16:27:39'),
('dept-003','Information Technology',NULL,NULL,'2026-09-21 16:27:39','2026-09-21 16:27:39'),
('dept-004','Operations',NULL,NULL,'2026-09-21 16:27:39','2026-09-21 16:27:39'),
('dept-005','Administration',NULL,NULL,'2026-09-21 16:27:39','2026-09-21 16:27:39'),
('dept-006','Procurement',NULL,NULL,'2026-09-21 16:27:39','2026-09-21 16:27:39'),
('dept-007','Legal Services',NULL,NULL,'2026-09-21 16:27:39','2026-09-21 16:27:39'),
('dept-008','Internal Audit',NULL,NULL,'2026-09-21 16:27:39','2026-09-21 16:27:39'),
('dept-009','Call Center',NULL,NULL,'2026-09-21 16:27:39','2026-09-21 16:27:39'),
('dept-010','Universal Services',NULL,NULL,'2026-09-21 16:27:39','2026-09-21 16:27:39'),
('dept-011','ECO Division',NULL,NULL,'2026-09-21 16:27:39','2026-09-21 16:27:39'),
('dept-012','MOR Division',NULL,NULL,'2026-09-21 16:27:39','2026-09-21 16:27:39'),
('dept-013','OARS Division',NULL,NULL,'2026-09-21 16:27:39','2026-09-21 16:27:39'),
('dept-014','BAES Division',NULL,NULL,'2026-09-21 16:27:39','2026-09-21 16:27:39'),
('dept-015','ECA Division',NULL,NULL,'2026-09-21 16:27:39','2026-09-21 16:27:39'),
('dept-016','DFCC Division',NULL,NULL,'2026-09-21 16:27:39','2026-09-21 16:27:39'),
('dept-017','MOT Division',NULL,NULL,'2026-09-21 16:27:39','2026-09-21 16:27:39'),
('dept-018','Planning & Strategy',NULL,NULL,'2026-09-21 16:27:39','2026-09-21 16:27:39'),
('dept-019','Customer Relations',NULL,NULL,'2026-09-21 16:27:39','2026-09-21 16:27:39'),
('dept-020','Research & Development',NULL,NULL,'2026-09-21 16:27:39','2026-09-21 16:27:39'),
('dept-021','Quality Assurance',NULL,NULL,'2026-09-21 16:27:39','2026-09-21 16:27:39'),
('dept-022','Training & Development',NULL,NULL,'2026-09-21 16:27:39','2026-09-21 16:27:39'),
('dept-023','Marketing',NULL,NULL,'2026-09-21 16:27:39','2026-09-21 16:27:39'),
('dept-024','Public Relations',NULL,NULL,'2026-09-21 16:27:39','2026-09-21 16:27:39'),
('dept-025','Security',NULL,NULL,'2026-09-21 16:27:39','2026-09-21 16:27:39'),
('dept-026','Facilities Management',NULL,NULL,'2026-09-21 16:27:39','2026-09-21 16:27:39'),
('dept-027','Supply Chain',NULL,NULL,'2026-09-21 16:27:39','2026-09-21 16:27:39'),
('dept-028','Risk Management',NULL,NULL,'2026-09-21 16:27:39','2026-09-21 16:27:39'),
('dept-029','Compliance',NULL,NULL,'2026-09-21 16:27:39','2026-09-21 16:27:39'),
('dept-030','Corporate Affairs',NULL,NULL,'2026-09-21 16:27:39','2026-09-21 16:27:39'),
('dept-031','Digital Transformation',NULL,NULL,'2026-09-21 16:27:39','2026-09-21 16:27:39'),
('dept-032','Data Science',NULL,NULL,'2026-09-21 16:27:39','2026-09-21 16:27:39'),
('dept-033','Project Management Office',NULL,NULL,'2026-09-21 16:27:39','2026-09-21 16:27:39'),
('dept-034','Business Development',NULL,NULL,'2026-09-21 16:27:39','2026-09-21 16:27:39'),
('dept-035','Executive Office',NULL,NULL,'2026-09-21 16:27:39','2026-09-21 16:27:39'),
('dept-036','Payroll',NULL,NULL,'2026-09-21 16:27:39','2026-09-21 16:27:39'),
('dept-037','Employee Benefits',NULL,NULL,'2026-09-21 16:27:39','2026-09-21 16:27:39'),
('dept-038','Employee Relations',NULL,NULL,'2026-09-21 16:27:39','2026-09-21 16:27:39');
/*!40000 ALTER TABLE `Departments` ENABLE KEYS */;
UNLOCK TABLES;
COMMIT;
SET AUTOCOMMIT=@OLD_AUTOCOMMIT;

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
-- Dumping data for table `EmployeeAddresses`
--

SET @OLD_AUTOCOMMIT=@@AUTOCOMMIT, @@AUTOCOMMIT=0;
LOCK TABLES `EmployeeAddresses` WRITE;
/*!40000 ALTER TABLE `EmployeeAddresses` DISABLE KEYS */;
INSERT INTO `EmployeeAddresses` VALUES
('dbae20b3-b6b6-11f1-8ff9-da2f5a380a88','emp-1001','CURRENT',NULL,NULL,NULL,NULL,NULL,NULL,NULL,'admin@mesobhrms.org');
/*!40000 ALTER TABLE `EmployeeAddresses` ENABLE KEYS */;
UNLOCK TABLES;
COMMIT;
SET AUTOCOMMIT=@OLD_AUTOCOMMIT;

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
-- Dumping data for table `EmployeeFaceImages`
--

SET @OLD_AUTOCOMMIT=@@AUTOCOMMIT, @@AUTOCOMMIT=0;
LOCK TABLES `EmployeeFaceImages` WRITE;
/*!40000 ALTER TABLE `EmployeeFaceImages` DISABLE KEYS */;
/*!40000 ALTER TABLE `EmployeeFaceImages` ENABLE KEYS */;
UNLOCK TABLES;
COMMIT;
SET AUTOCOMMIT=@OLD_AUTOCOMMIT;

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
-- Dumping data for table `EmployeeIDDocuments`
--

SET @OLD_AUTOCOMMIT=@@AUTOCOMMIT, @@AUTOCOMMIT=0;
LOCK TABLES `EmployeeIDDocuments` WRITE;
/*!40000 ALTER TABLE `EmployeeIDDocuments` DISABLE KEYS */;
/*!40000 ALTER TABLE `EmployeeIDDocuments` ENABLE KEYS */;
UNLOCK TABLES;
COMMIT;
SET AUTOCOMMIT=@OLD_AUTOCOMMIT;

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
-- Dumping data for table `EmployeeLevelHistory`
--

SET @OLD_AUTOCOMMIT=@@AUTOCOMMIT, @@AUTOCOMMIT=0;
LOCK TABLES `EmployeeLevelHistory` WRITE;
/*!40000 ALTER TABLE `EmployeeLevelHistory` DISABLE KEYS */;
/*!40000 ALTER TABLE `EmployeeLevelHistory` ENABLE KEYS */;
UNLOCK TABLES;
COMMIT;
SET AUTOCOMMIT=@OLD_AUTOCOMMIT;

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
-- Dumping data for table `EmployeeOccupations`
--

SET @OLD_AUTOCOMMIT=@@AUTOCOMMIT, @@AUTOCOMMIT=0;
LOCK TABLES `EmployeeOccupations` WRITE;
/*!40000 ALTER TABLE `EmployeeOccupations` DISABLE KEYS */;
/*!40000 ALTER TABLE `EmployeeOccupations` ENABLE KEYS */;
UNLOCK TABLES;
COMMIT;
SET AUTOCOMMIT=@OLD_AUTOCOMMIT;

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
-- Dumping data for table `EmployeeRegistrationDrafts`
--

SET @OLD_AUTOCOMMIT=@@AUTOCOMMIT, @@AUTOCOMMIT=0;
LOCK TABLES `EmployeeRegistrationDrafts` WRITE;
/*!40000 ALTER TABLE `EmployeeRegistrationDrafts` DISABLE KEYS */;
/*!40000 ALTER TABLE `EmployeeRegistrationDrafts` ENABLE KEYS */;
UNLOCK TABLES;
COMMIT;
SET AUTOCOMMIT=@OLD_AUTOCOMMIT;

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
-- Dumping data for table `EmployeeShifts`
--

SET @OLD_AUTOCOMMIT=@@AUTOCOMMIT, @@AUTOCOMMIT=0;
LOCK TABLES `EmployeeShifts` WRITE;
/*!40000 ALTER TABLE `EmployeeShifts` DISABLE KEYS */;
/*!40000 ALTER TABLE `EmployeeShifts` ENABLE KEYS */;
UNLOCK TABLES;
COMMIT;
SET AUTOCOMMIT=@OLD_AUTOCOMMIT;

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
-- Dumping data for table `Employees`
--

SET @OLD_AUTOCOMMIT=@@AUTOCOMMIT, @@AUTOCOMMIT=0;
LOCK TABLES `Employees` WRITE;
/*!40000 ALTER TABLE `Employees` DISABLE KEYS */;
INSERT INTO `Employees` VALUES
('emp-1001','MES-001','Mr','Abel','Kebede','Tesfaye','Eleni','MALE','1990-03-21','Ethiopian',NULL,'TIN-1001',NULL,'CBE','1000100001','2021-01-15',0.00,'ACTIVE',0,0,'dept-001','pos-001',NULL,'occ-004','2026-09-21 16:27:39','2026-09-21 16:27:39'),
('emp-1002','MES-002','Ms','Marta','Desta','Alem','Selam','FEMALE','1992-10-08','Ethiopian',NULL,'TIN-1002',NULL,'Awash','1000100002','2022-06-10',0.00,'ACTIVE',0,0,'dept-002','pos-005',NULL,'occ-002','2026-09-21 16:27:39','2026-09-21 16:27:39'),
('emp-1003','MES-003','Mr','Sami','Tadesse','Bekele','Hana','MALE','1995-05-30','Ethiopian',NULL,'TIN-1003',NULL,'Dashen','1000100003','2023-09-01',0.00,'ACTIVE',0,0,'dept-002','pos-005',NULL,'occ-002','2026-09-21 16:27:39','2026-09-21 16:27:39'),
('emp-1004','MES-004','Mrs','Tigist','Alemu','Haile','Mulu','FEMALE','1988-07-15','Ethiopian',NULL,'TIN-1004',NULL,'Abyssinia','1000100004','2020-03-01',2.50,'ACTIVE',0,0,'dept-001','pos-002',NULL,'occ-004','2026-09-21 16:27:39','2026-09-21 16:27:39'),
('emp-1005','MES-005','Mr','Dawit','Girma','Bekele','Almaz','MALE','1993-11-20','Ethiopian',NULL,'TIN-1005',NULL,'CBE','1000100005','2021-07-01',0.00,'ACTIVE',0,0,'dept-004','pos-013',NULL,'occ-001','2026-09-21 16:27:39','2026-09-21 16:27:39'),
('emp-1006','MES-006','Ms','Hiwot','Tesfaye','Mulugeta','Selamawit','FEMALE','1991-04-12','Ethiopian',NULL,'TIN-1006',NULL,'Awash','1000100006','2022-02-14',0.00,'ACTIVE',0,0,'dept-002','pos-005',NULL,'occ-002','2026-09-21 16:27:39','2026-09-21 16:27:39'),
('emp-1007','MES-007','Mr','Yonas','Haile','Girma','Tigist','MALE','1989-08-25','Ethiopian',NULL,'TIN-1007',NULL,'Dashen','1000100007','2019-11-01',3.00,'ACTIVE',0,0,'dept-002','pos-005',NULL,'occ-002','2026-09-21 16:27:39','2026-09-21 16:27:39'),
('emp-1008','MES-008','Mrs','Selamawit','Bekele','Tadesse','Hana','FEMALE','1994-02-18','Ethiopian',NULL,'TIN-1008',NULL,'CBE','1000100008','2023-01-10',0.00,'ACTIVE',0,0,'dept-002','pos-005',NULL,'occ-002','2026-09-21 16:27:39','2026-09-21 16:27:39'),
('emp-1009','MES-009','Mr','Biruk','Alemu','Tesfaye','Mulu','MALE','1996-06-05','Ethiopian',NULL,'TIN-1009',NULL,'Abyssinia','1000100009','2024-03-01',0.00,'ACTIVE',0,0,'dept-002','pos-005',NULL,'occ-002','2026-09-21 16:27:39','2026-09-21 16:27:39'),
('emp-1010','MES-010','Ms','Rahel','Girma','Haile','Eleni','FEMALE','1990-09-14','Ethiopian',NULL,'TIN-1010',NULL,'Awash','1000100010','2021-05-20',0.00,'ACTIVE',0,0,'dept-002','pos-005',NULL,'occ-002','2026-09-21 16:27:39','2026-09-21 16:27:39'),
('emp-1011','MES-011','Mr','Henok','Mulugeta','Bekele','Selam','MALE','1992-12-03','Ethiopian',NULL,'TIN-1011',NULL,'CBE','1000100011','2022-08-15',0.00,'ACTIVE',0,0,'dept-002','pos-005',NULL,'occ-002','2026-09-21 16:27:39','2026-09-21 16:27:39'),
('emp-1012','MES-012','Mr','Natnael','Tesfaye','Alemu','Tigist','MALE','1997-03-22','Ethiopian',NULL,'TIN-1012',NULL,'Dashen','1000100012','2024-01-08',0.00,'ACTIVE',0,0,'dept-011','pos-029',NULL,'occ-001','2026-09-21 16:27:39','2026-09-21 16:27:39'),
('emp-1013','MES-013','Ms','Lidya','Haile','Girma','Hana','FEMALE','1993-07-11','Ethiopian',NULL,'TIN-1013',NULL,'Abyssinia','1000100013','2022-11-01',0.00,'ACTIVE',0,0,'dept-012','pos-031',NULL,'occ-003','2026-09-21 16:27:39','2026-09-21 16:27:39'),
('emp-1014','MES-014','Mr','Mikias','Bekele','Tadesse','Mulu','MALE','1991-01-28','Ethiopian',NULL,'TIN-1014',NULL,'CBE','1000100014','2020-09-15',1.00,'ACTIVE',0,0,'dept-013','pos-033',NULL,'occ-010','2026-09-21 16:27:39','2026-09-21 16:27:39'),
('emp-1015','MES-015','Mrs','Azeb','Alemu','Mulugeta','Eleni','FEMALE','1988-05-17','Ethiopian',NULL,'TIN-1015',NULL,'Awash','1000100015','2019-06-01',4.00,'ACTIVE',0,0,'dept-014','pos-034',NULL,'occ-010','2026-09-21 16:27:39','2026-09-21 16:27:39'),
('emp-1016','MES-016','Mr','Robel','Girma','Tesfaye','Selam','MALE','1994-10-09','Ethiopian',NULL,'TIN-1016',NULL,'Dashen','1000100016','2023-04-01',0.00,'ACTIVE',0,0,'dept-015','pos-035',NULL,'occ-003','2026-09-21 16:27:39','2026-09-21 16:27:39'),
('emp-1017','MES-017','Mr','Eyob','Tadesse','Haile','Tigist','MALE','1995-08-30','Ethiopian',NULL,'TIN-1017',NULL,'CBE','1000100017','2023-07-15',0.00,'ACTIVE',0,0,'dept-016','pos-036',NULL,'occ-003','2026-09-21 16:27:39','2026-09-21 16:27:39'),
('emp-1018','MES-018','Ms','Mekdes','Bekele','Girma','Hana','FEMALE','1992-04-06','Ethiopian',NULL,'TIN-1018',NULL,'Abyssinia','1000100018','2022-03-20',0.00,'ACTIVE',0,0,'dept-017','pos-037',NULL,'occ-001','2026-09-21 16:27:39','2026-09-21 16:27:39'),
('emp-1019','MES-019','Mr','Fikadu','Mulugeta','Alem','Mulu','MALE','1990-11-15','Ethiopian',NULL,'TIN-1019',NULL,'Awash','1000100019','2021-10-01',0.00,'ACTIVE',0,0,'dept-018','pos-038',NULL,'occ-011','2026-09-21 16:27:39','2026-09-21 16:27:39'),
('emp-1020','MES-020','Mr','Tewodros','Tesfaye','Bekele','Eleni','MALE','1987-06-22','Ethiopian',NULL,'TIN-1020',NULL,'CBE','1000100020','2018-04-01',5.00,'ACTIVE',0,0,'dept-019','pos-040',NULL,'occ-009','2026-09-21 16:27:39','2026-09-21 16:27:39'),
('emp-1021','MES-021','Ms','Yeshi','Haile','Tadesse','Selam','FEMALE','1993-02-14','Ethiopian',NULL,'TIN-1021',NULL,'Dashen','1000100021','2022-09-01',0.00,'ACTIVE',0,0,'dept-020','pos-041',NULL,'occ-010','2026-09-21 16:27:39','2026-09-21 16:27:39'),
('emp-1022','MES-022','Mr','Amanuel','Girma','Mulugeta','Tigist','MALE','1996-07-08','Ethiopian',NULL,'TIN-1022',NULL,'Abyssinia','1000100022','2024-02-01',0.00,'ACTIVE',0,0,'dept-021','pos-042',NULL,'occ-001','2026-09-21 16:27:39','2026-09-21 16:27:39'),
('emp-1023','MES-023','Mrs','Hanna','Bekele','Tesfaye','Hana','FEMALE','1989-12-25','Ethiopian',NULL,'TIN-1023',NULL,'CBE','1000100023','2020-01-15',2.00,'ACTIVE',0,0,'dept-022','pos-043',NULL,'occ-004','2026-09-21 16:27:39','2026-09-21 16:27:39'),
('emp-1024','MES-024','Mr','Selam','Alemu','Haile','Mulu','MALE','1994-05-19','Ethiopian',NULL,'TIN-1024',NULL,'Awash','1000100024','2023-06-01',0.00,'ACTIVE',0,0,'dept-023','pos-044',NULL,'occ-003','2026-09-21 16:27:39','2026-09-21 16:27:39'),
('emp-1025','MES-025','Mr','Bereket','Tadesse','Girma','Eleni','MALE','1991-09-03','Ethiopian',NULL,'TIN-1025',NULL,'Dashen','1000100025','2021-03-10',0.00,'ACTIVE',0,0,'dept-024','pos-045',NULL,'occ-003','2026-09-21 16:27:39','2026-09-21 16:27:39');
/*!40000 ALTER TABLE `Employees` ENABLE KEYS */;
UNLOCK TABLES;
COMMIT;
SET AUTOCOMMIT=@OLD_AUTOCOMMIT;

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
-- Dumping data for table `Holidays`
--

SET @OLD_AUTOCOMMIT=@@AUTOCOMMIT, @@AUTOCOMMIT=0;
LOCK TABLES `Holidays` WRITE;
/*!40000 ALTER TABLE `Holidays` DISABLE KEYS */;
INSERT INTO `Holidays` VALUES
('hol-2025-01-07','2025-01-07','Ethiopian Christmas (Genna)','2017','Ethiopian',1,'MANUAL','Genna - Ethiopian Orthodox Christmas'),
('hol-2025-01-19','2025-01-19','Epiphany (Timket)','2017','Ethiopian',1,'MANUAL','Timket'),
('hol-2025-03-02','2025-03-02','Adwa Victory Day','2017','Ethiopian',1,'MANUAL','Battle of Adwa'),
('hol-2025-05-01','2025-05-01','International Workers Day','2017','Gregorian',1,'MANUAL','Labour Day'),
('hol-2025-05-05','2025-05-05','Patriots Victory Day','2017','Gregorian',1,'MANUAL','Liberation Day'),
('hol-2025-05-28','2025-05-28','Downfall of Derg','2017','Gregorian',1,'MANUAL','National Day'),
('hol-2025-09-11','2025-09-11','Ethiopian New Year','2018','Ethiopian',1,'MANUAL','Enkutatash'),
('hol-2026-01-07','2026-01-07','Ethiopian Christmas (Genna)','2018','Ethiopian',1,'MANUAL','Genna - Ethiopian Orthodox Christmas'),
('hol-2026-01-19','2026-01-19','Epiphany (Timket)','2018','Ethiopian',1,'MANUAL','Timket - Celebration of the baptism of Jesus'),
('hol-2026-03-02','2026-03-02','Adwa Victory Day','2018','Ethiopian',1,'MANUAL','Commemoration of the Battle of Adwa 1896'),
('hol-2026-04-02','2026-04-02','Good Friday','2018','Gregorian',1,'MANUAL','Good Friday - Christian holiday'),
('hol-2026-04-05','2026-04-05','Easter Sunday','2018','Gregorian',1,'MANUAL','Easter Sunday'),
('hol-2026-05-01','2026-05-01','International Workers Day','2018','Gregorian',1,'MANUAL','Labour Day'),
('hol-2026-05-05','2026-05-05','Patriots Victory Day','2018','Gregorian',1,'MANUAL','Liberation Day'),
('hol-2026-05-28','2026-05-28','Downfall of Derg','2018','Gregorian',1,'MANUAL','National Day'),
('hol-2026-06-06','2026-06-06','Eid al-Adha','2018','Religious',1,'MANUAL','Eid al-Adha - Islamic holiday'),
('hol-2026-09-11','2026-09-11','Ethiopian New Year (Enkutatash)','2019','Ethiopian',1,'MANUAL','Enkutatash - Ethiopian New Year'),
('hol-2026-09-27','2026-09-27','Meskel','2019','Ethiopian',1,'MANUAL','Finding of the True Cross');
/*!40000 ALTER TABLE `Holidays` ENABLE KEYS */;
UNLOCK TABLES;
COMMIT;
SET AUTOCOMMIT=@OLD_AUTOCOMMIT;

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
-- Dumping data for table `IssuedLetters`
--

SET @OLD_AUTOCOMMIT=@@AUTOCOMMIT, @@AUTOCOMMIT=0;
LOCK TABLES `IssuedLetters` WRITE;
/*!40000 ALTER TABLE `IssuedLetters` DISABLE KEYS */;
/*!40000 ALTER TABLE `IssuedLetters` ENABLE KEYS */;
UNLOCK TABLES;
COMMIT;
SET AUTOCOMMIT=@OLD_AUTOCOMMIT;

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
-- Dumping data for table `LetterLayoutConfig`
--

SET @OLD_AUTOCOMMIT=@@AUTOCOMMIT, @@AUTOCOMMIT=0;
LOCK TABLES `LetterLayoutConfig` WRITE;
/*!40000 ALTER TABLE `LetterLayoutConfig` DISABLE KEYS */;
/*!40000 ALTER TABLE `LetterLayoutConfig` ENABLE KEYS */;
UNLOCK TABLES;
COMMIT;
SET AUTOCOMMIT=@OLD_AUTOCOMMIT;

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
-- Dumping data for table `LetterReferenceSequence`
--

SET @OLD_AUTOCOMMIT=@@AUTOCOMMIT, @@AUTOCOMMIT=0;
LOCK TABLES `LetterReferenceSequence` WRITE;
/*!40000 ALTER TABLE `LetterReferenceSequence` DISABLE KEYS */;
/*!40000 ALTER TABLE `LetterReferenceSequence` ENABLE KEYS */;
UNLOCK TABLES;
COMMIT;
SET AUTOCOMMIT=@OLD_AUTOCOMMIT;

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
-- Dumping data for table `LetterRequests`
--

SET @OLD_AUTOCOMMIT=@@AUTOCOMMIT, @@AUTOCOMMIT=0;
LOCK TABLES `LetterRequests` WRITE;
/*!40000 ALTER TABLE `LetterRequests` DISABLE KEYS */;
/*!40000 ALTER TABLE `LetterRequests` ENABLE KEYS */;
UNLOCK TABLES;
COMMIT;
SET AUTOCOMMIT=@OLD_AUTOCOMMIT;

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
-- Dumping data for table `LetterTemplates`
--

SET @OLD_AUTOCOMMIT=@@AUTOCOMMIT, @@AUTOCOMMIT=0;
LOCK TABLES `LetterTemplates` WRITE;
/*!40000 ALTER TABLE `LetterTemplates` DISABLE KEYS */;
INSERT INTO `LetterTemplates` VALUES
('tmpl-001','Employment Verification','Employment Verification Letter','GENERAL','To Whom It May Concern,\n\nThis is to certify that {{employee_name}} (ID: {{mesob_id}}) is currently employed at FDRE MESOB Center as {{position}} in the {{department}} department.\n\nThey have been employed with us since {{hire_date}}.\n\nThis letter is issued upon request for official purposes.\n\nSincerely,\nHuman Resources Department\nFDRE MESOB Center',NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,1,1,NULL,'emp-1001','2026-09-21 16:27:50','2026-09-21 16:34:01'),
('tmpl-002','Salary Confirmation','Salary Confirmation Letter','GENERAL','To Whom It May Concern,\n\nThis is to confirm that {{employee_name}} (ID: {{mesob_id}}), employed as {{position}} in our organization, receives a monthly salary as per their employment contract.\n\nThis letter is issued upon the employee\'s request.\n\nSincerely,\nHuman Resources Department\nFDRE MESOB Center',NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,1,1,NULL,'emp-1001','2026-09-21 16:27:50','2026-09-21 16:34:01'),
('tmpl-003','Experience Letter','Experience Letter','GENERAL','To Whom It May Concern,\n\nThis is to certify that {{employee_name}} has been employed with FDRE MESOB Center from {{hire_date}} to {{date}} as {{position}} in the {{department}} department.\n\nDuring their tenure, they demonstrated excellent professional skills and dedication.\n\nWe wish them success in their future endeavors.\n\nSincerely,\nHuman Resources Department\nFDRE MESOB Center',NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,1,1,NULL,'emp-1001','2026-09-21 16:27:50','2026-09-21 16:34:01');
/*!40000 ALTER TABLE `LetterTemplates` ENABLE KEYS */;
UNLOCK TABLES;
COMMIT;
SET AUTOCOMMIT=@OLD_AUTOCOMMIT;

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
-- Dumping data for table `LevelAllowances`
--

SET @OLD_AUTOCOMMIT=@@AUTOCOMMIT, @@AUTOCOMMIT=0;
LOCK TABLES `LevelAllowances` WRITE;
/*!40000 ALTER TABLE `LevelAllowances` DISABLE KEYS */;
/*!40000 ALTER TABLE `LevelAllowances` ENABLE KEYS */;
UNLOCK TABLES;
COMMIT;
SET AUTOCOMMIT=@OLD_AUTOCOMMIT;

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
-- Dumping data for table `LevelVersions`
--

SET @OLD_AUTOCOMMIT=@@AUTOCOMMIT, @@AUTOCOMMIT=0;
LOCK TABLES `LevelVersions` WRITE;
/*!40000 ALTER TABLE `LevelVersions` DISABLE KEYS */;
/*!40000 ALTER TABLE `LevelVersions` ENABLE KEYS */;
UNLOCK TABLES;
COMMIT;
SET AUTOCOMMIT=@OLD_AUTOCOMMIT;

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
-- Dumping data for table `Levels`
--

SET @OLD_AUTOCOMMIT=@@AUTOCOMMIT, @@AUTOCOMMIT=0;
LOCK TABLES `Levels` WRITE;
/*!40000 ALTER TABLE `Levels` DISABLE KEYS */;
/*!40000 ALTER TABLE `Levels` ENABLE KEYS */;
UNLOCK TABLES;
COMMIT;
SET AUTOCOMMIT=@OLD_AUTOCOMMIT;

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
-- Dumping data for table `MesobIdSequence`
--

SET @OLD_AUTOCOMMIT=@@AUTOCOMMIT, @@AUTOCOMMIT=0;
LOCK TABLES `MesobIdSequence` WRITE;
/*!40000 ALTER TABLE `MesobIdSequence` DISABLE KEYS */;
/*!40000 ALTER TABLE `MesobIdSequence` ENABLE KEYS */;
UNLOCK TABLES;
COMMIT;
SET AUTOCOMMIT=@OLD_AUTOCOMMIT;

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
-- Dumping data for table `Modules`
--

SET @OLD_AUTOCOMMIT=@@AUTOCOMMIT, @@AUTOCOMMIT=0;
LOCK TABLES `Modules` WRITE;
/*!40000 ALTER TABLE `Modules` DISABLE KEYS */;
INSERT INTO `Modules` VALUES
('3d25fb77-d945-44de-af92-240e09916f51','LETTERS','Letters','Letter generation and management','FileText',6,1,'2026-10-06 10:49:27','2026-10-06 10:49:27'),
('45b57ed0-b586-424a-b26e-9bdea38913fa','EMPLOYEES','Employees','Employee management (list, details, registration)','Users',2,1,'2026-10-06 10:49:27','2026-10-06 10:49:27'),
('90e2f4c6-f69d-4eb1-af6f-a3b25fdf55ab','ORGANIZATION','Organization','Organization structure (departments, positions, levels)','Building2',3,1,'2026-10-06 10:49:27','2026-10-06 10:49:27'),
('95f15576-6c0e-4c7d-80ae-f1001cec50af','LEAVE','Leave','Leave requests, policies, and days off','CalendarDays',7,1,'2026-10-06 10:49:27','2026-10-06 10:49:27'),
('a3e30b6a-9b05-4004-8ea5-57c6b696d089','SHIFTS','Shifts','Shift management and assignments','Layers',5,1,'2026-10-06 10:49:27','2026-10-06 10:49:27'),
('cc7dcef2-1788-476f-a269-9cf4bcfc9435','HOME','Home','Dashboard and home page','LayoutDashboard',1,1,'2026-10-06 10:49:27','2026-10-06 10:49:27'),
('faedcb8a-7f40-4c8e-ad7b-b4114dded5c0','ATTENDANCE','Attendance','Attendance records and analytics','Clock',4,1,'2026-10-06 10:49:27','2026-10-06 10:49:27');
/*!40000 ALTER TABLE `Modules` ENABLE KEYS */;
UNLOCK TABLES;
COMMIT;
SET AUTOCOMMIT=@OLD_AUTOCOMMIT;

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
-- Dumping data for table `NetworkSettings`
--

SET @OLD_AUTOCOMMIT=@@AUTOCOMMIT, @@AUTOCOMMIT=0;
LOCK TABLES `NetworkSettings` WRITE;
/*!40000 ALTER TABLE `NetworkSettings` DISABLE KEYS */;
INSERT INTO `NetworkSettings` VALUES
('net-001','Local Development','127.0.0.1',1,'2026-09-21 13:27:50','2026-09-21 13:27:50'),
('net-002','Local Network Range','192.168.0.0/16',0,'2026-09-21 13:27:50','2026-09-21 13:27:50'),
('net-003','Company Office Network','10.0.0.0/24',0,'2026-09-21 13:27:50','2026-09-21 13:27:50');
/*!40000 ALTER TABLE `NetworkSettings` ENABLE KEYS */;
UNLOCK TABLES;
COMMIT;
SET AUTOCOMMIT=@OLD_AUTOCOMMIT;

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
-- Dumping data for table `Notifications`
--

SET @OLD_AUTOCOMMIT=@@AUTOCOMMIT, @@AUTOCOMMIT=0;
LOCK TABLES `Notifications` WRITE;
/*!40000 ALTER TABLE `Notifications` DISABLE KEYS */;
/*!40000 ALTER TABLE `Notifications` ENABLE KEYS */;
UNLOCK TABLES;
COMMIT;
SET AUTOCOMMIT=@OLD_AUTOCOMMIT;

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
-- Dumping data for table `OccupationDelegations`
--

SET @OLD_AUTOCOMMIT=@@AUTOCOMMIT, @@AUTOCOMMIT=0;
LOCK TABLES `OccupationDelegations` WRITE;
/*!40000 ALTER TABLE `OccupationDelegations` DISABLE KEYS */;
/*!40000 ALTER TABLE `OccupationDelegations` ENABLE KEYS */;
UNLOCK TABLES;
COMMIT;
SET AUTOCOMMIT=@OLD_AUTOCOMMIT;

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
-- Dumping data for table `Occupations`
--

SET @OLD_AUTOCOMMIT=@@AUTOCOMMIT, @@AUTOCOMMIT=0;
LOCK TABLES `Occupations` WRITE;
/*!40000 ALTER TABLE `Occupations` DISABLE KEYS */;
INSERT INTO `Occupations` VALUES
('occ-001',NULL,'Dashboard','Access to main dashboard','2026-09-21 16:27:39'),
('occ-002',NULL,'Employees - Overview','View employees list and details','2026-09-21 16:27:39'),
('occ-003',NULL,'Employees - Registration','Register new employees','2026-09-21 16:27:39'),
('occ-004',NULL,'Departments - Overview','View departments','2026-09-21 16:27:39'),
('occ-005',NULL,'Departments - Manage','Create and manage departments','2026-09-21 16:27:39'),
('occ-006',NULL,'Positions - Overview','View positions','2026-09-21 16:27:39'),
('occ-007',NULL,'Positions - Manage','Create and manage positions','2026-09-21 16:27:39'),
('occ-008',NULL,'Attendance - Overview','View attendance overview','2026-09-21 16:27:39'),
('occ-009',NULL,'Attendance - Manage','Manage employee attendance','2026-09-21 16:27:39'),
('occ-010',NULL,'Leave - Manage Requests','Approve/reject leave requests','2026-09-21 16:27:39'),
('occ-011',NULL,'Leave - My Leave','View and submit own leave requests','2026-09-21 16:27:39'),
('occ-012',NULL,'Shifts - Overview','View shift schedules','2026-09-21 16:27:39'),
('occ-013',NULL,'Shifts - Add','Create and assign shifts','2026-09-21 16:27:39'),
('occ-014',NULL,'Letters','Generate and manage letters','2026-09-21 16:27:39'),
('occ-015',NULL,'Accounts','Manage user accounts','2026-09-21 16:27:39'),
('occ-016',NULL,'Audit Logs','View system audit logs','2026-09-21 16:27:39'),
('occ-017',NULL,'Leave Policies','Configure leave policies','2026-09-21 16:27:39'),
('occ-018',NULL,'Holidays','Manage holidays and day-offs','2026-09-21 16:27:39'),
('occ-019',NULL,'My Account','Access personal account settings','2026-09-21 16:27:39');
/*!40000 ALTER TABLE `Occupations` ENABLE KEYS */;
UNLOCK TABLES;
COMMIT;
SET AUTOCOMMIT=@OLD_AUTOCOMMIT;

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
-- Dumping data for table `OrganizationConfig`
--

SET @OLD_AUTOCOMMIT=@@AUTOCOMMIT, @@AUTOCOMMIT=0;
LOCK TABLES `OrganizationConfig` WRITE;
/*!40000 ALTER TABLE `OrganizationConfig` DISABLE KEYS */;
/*!40000 ALTER TABLE `OrganizationConfig` ENABLE KEYS */;
UNLOCK TABLES;
COMMIT;
SET AUTOCOMMIT=@OLD_AUTOCOMMIT;

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
-- Dumping data for table `Positions`
--

SET @OLD_AUTOCOMMIT=@@AUTOCOMMIT, @@AUTOCOMMIT=0;
LOCK TABLES `Positions` WRITE;
/*!40000 ALTER TABLE `Positions` DISABLE KEYS */;
INSERT INTO `Positions` VALUES
('pos-001','HR Officer','Grade 9','dept-001',NULL,'2026-09-21 16:27:39','2026-09-21 16:27:39'),
('pos-002','HR Manager','Grade 12','dept-001',NULL,'2026-09-21 16:27:39','2026-09-21 16:27:39'),
('pos-003','HR Assistant','Grade 7','dept-001',NULL,'2026-09-21 16:27:39','2026-09-21 16:27:39'),
('pos-004','Recruitment Specialist','Grade 10','dept-001',NULL,'2026-09-21 16:27:39','2026-09-21 16:27:39'),
('pos-005','Finance Analyst','Grade 10','dept-002',NULL,'2026-09-21 16:27:39','2026-09-21 16:27:39'),
('pos-006','Senior Accountant','Grade 12','dept-002',NULL,'2026-09-21 16:27:39','2026-09-21 16:27:39'),
('pos-007','Junior Accountant','Grade 8','dept-002',NULL,'2026-09-21 16:27:39','2026-09-21 16:27:39'),
('pos-008','Budget Officer','Grade 11','dept-002',NULL,'2026-09-21 16:27:39','2026-09-21 16:27:39'),
('pos-009','IT Specialist','Grade 10','dept-003',NULL,'2026-09-21 16:27:39','2026-09-21 16:27:39'),
('pos-010','Systems Administrator','Grade 11','dept-003',NULL,'2026-09-21 16:27:39','2026-09-21 16:27:39'),
('pos-011','Network Engineer','Grade 11','dept-003',NULL,'2026-09-21 16:27:39','2026-09-21 16:27:39'),
('pos-012','Software Developer','Grade 10','dept-003',NULL,'2026-09-21 16:27:39','2026-09-21 16:27:39'),
('pos-013','Operations Supervisor','Grade 11','dept-004',NULL,'2026-09-21 16:27:39','2026-09-21 16:27:39'),
('pos-014','Operations Manager','Grade 13','dept-004',NULL,'2026-09-21 16:27:39','2026-09-21 16:27:39'),
('pos-015','Operations Analyst','Grade 9','dept-004',NULL,'2026-09-21 16:27:39','2026-09-21 16:27:39'),
('pos-016','Administrative Officer','Grade 9','dept-005',NULL,'2026-09-21 16:27:39','2026-09-21 16:27:39'),
('pos-017','Executive Assistant','Grade 10','dept-005',NULL,'2026-09-21 16:27:39','2026-09-21 16:27:39'),
('pos-018','Office Manager','Grade 11','dept-005',NULL,'2026-09-21 16:27:39','2026-09-21 16:27:39'),
('pos-019','Procurement Officer','Grade 10','dept-006',NULL,'2026-09-21 16:27:39','2026-09-21 16:27:39'),
('pos-020','Procurement Manager','Grade 12','dept-006',NULL,'2026-09-21 16:27:39','2026-09-21 16:27:39'),
('pos-021','Legal Officer','Grade 11','dept-007',NULL,'2026-09-21 16:27:39','2026-09-21 16:27:39'),
('pos-022','Senior Legal Counsel','Grade 13','dept-007',NULL,'2026-09-21 16:27:39','2026-09-21 16:27:39'),
('pos-023','Internal Auditor','Grade 11','dept-008',NULL,'2026-09-21 16:27:39','2026-09-21 16:27:39'),
('pos-024','Senior Auditor','Grade 12','dept-008',NULL,'2026-09-21 16:27:39','2026-09-21 16:27:39'),
('pos-025','Call Center Agent','Grade 7','dept-009',NULL,'2026-09-21 16:27:39','2026-09-21 16:27:39'),
('pos-026','Call Center Supervisor','Grade 10','dept-009',NULL,'2026-09-21 16:27:39','2026-09-21 16:27:39'),
('pos-027','Call Center Manager','Grade 12','dept-009',NULL,'2026-09-21 16:27:39','2026-09-21 16:27:39'),
('pos-028','Universal Services Officer','Grade 9','dept-010',NULL,'2026-09-21 16:27:39','2026-09-21 16:27:39'),
('pos-029','ECO Analyst','Grade 10','dept-011',NULL,'2026-09-21 16:27:39','2026-09-21 16:27:39'),
('pos-030','ECO Manager','Grade 12','dept-011',NULL,'2026-09-21 16:27:39','2026-09-21 16:27:39'),
('pos-031','MOR Officer','Grade 9','dept-012',NULL,'2026-09-21 16:27:39','2026-09-21 16:27:39'),
('pos-032','MOR Supervisor','Grade 11','dept-012',NULL,'2026-09-21 16:27:39','2026-09-21 16:27:39'),
('pos-033','OARS Specialist','Grade 10','dept-013',NULL,'2026-09-21 16:27:39','2026-09-21 16:27:39'),
('pos-034','BAES Analyst','Grade 10','dept-014',NULL,'2026-09-21 16:27:39','2026-09-21 16:27:39'),
('pos-035','ECA Officer','Grade 9','dept-015',NULL,'2026-09-21 16:27:39','2026-09-21 16:27:39'),
('pos-036','DFCC Coordinator','Grade 9','dept-016',NULL,'2026-09-21 16:27:39','2026-09-21 16:27:39'),
('pos-037','MOT Specialist','Grade 10','dept-017',NULL,'2026-09-21 16:27:39','2026-09-21 16:27:39'),
('pos-038','Planning Officer','Grade 10','dept-018',NULL,'2026-09-21 16:27:39','2026-09-21 16:27:39'),
('pos-039','Strategy Analyst','Grade 11','dept-018',NULL,'2026-09-21 16:27:39','2026-09-21 16:27:39'),
('pos-040','Customer Relations Officer','Grade 9','dept-019',NULL,'2026-09-21 16:27:39','2026-09-21 16:27:39'),
('pos-041','Research Officer','Grade 10','dept-020',NULL,'2026-09-21 16:27:39','2026-09-21 16:27:39'),
('pos-042','QA Specialist','Grade 10','dept-021',NULL,'2026-09-21 16:27:39','2026-09-21 16:27:39'),
('pos-043','Training Coordinator','Grade 9','dept-022',NULL,'2026-09-21 16:27:39','2026-09-21 16:27:39'),
('pos-044','Marketing Officer','Grade 10','dept-023',NULL,'2026-09-21 16:27:39','2026-09-21 16:27:39'),
('pos-045','PR Specialist','Grade 10','dept-024',NULL,'2026-09-21 16:27:39','2026-09-21 16:27:39'),
('pos-046','Security Officer','Grade 8','dept-025',NULL,'2026-09-21 16:27:39','2026-09-21 16:27:39'),
('pos-047','Facilities Officer','Grade 8','dept-026',NULL,'2026-09-21 16:27:39','2026-09-21 16:27:39'),
('pos-048','Supply Chain Analyst','Grade 10','dept-027',NULL,'2026-09-21 16:27:39','2026-09-21 16:27:39'),
('pos-049','Risk Analyst','Grade 11','dept-028',NULL,'2026-09-21 16:27:39','2026-09-21 16:27:39'),
('pos-050','Compliance Officer','Grade 11','dept-029',NULL,'2026-09-21 16:27:39','2026-09-21 16:27:39'),
('pos-051','Corporate Affairs Officer','Grade 10','dept-030',NULL,'2026-09-21 16:27:39','2026-09-21 16:27:39'),
('pos-052','Digital Transformation Lead','Grade 12','dept-031',NULL,'2026-09-21 16:27:39','2026-09-21 16:27:39'),
('pos-053','Data Scientist','Grade 12','dept-032',NULL,'2026-09-21 16:27:39','2026-09-21 16:27:39'),
('pos-054','Project Coordinator','Grade 10','dept-033',NULL,'2026-09-21 16:27:39','2026-09-21 16:27:39'),
('pos-055','Business Development Officer','Grade 11','dept-034',NULL,'2026-09-21 16:27:39','2026-09-21 16:27:39'),
('pos-056','Executive Officer','Grade 14','dept-035',NULL,'2026-09-21 16:27:39','2026-09-21 16:27:39'),
('pos-057','Payroll Officer','Grade 10','dept-036',NULL,'2026-09-21 16:27:39','2026-09-21 16:27:39'),
('pos-058','Benefits Coordinator','Grade 9','dept-037',NULL,'2026-09-21 16:27:39','2026-09-21 16:27:39'),
('pos-059','Employee Relations Officer','Grade 10','dept-038',NULL,'2026-09-21 16:27:39','2026-09-21 16:27:39'),
('pos-060','Accountant','Grade 9','dept-002',NULL,'2026-09-21 16:27:39','2026-09-21 16:27:39'),
('pos-061','Advisor','Grade 11','dept-009',NULL,'2026-09-21 16:27:39','2026-09-21 16:27:39'),
('pos-062','Back Office Officer','Grade 8','dept-010',NULL,'2026-09-21 16:27:39','2026-09-21 16:27:39'),
('pos-063','Back Office Supervisor','Grade 10','dept-011',NULL,'2026-09-21 16:27:39','2026-09-21 16:27:39'),
('pos-064','Back Office Analyst','Grade 9','dept-012',NULL,'2026-09-21 16:27:39','2026-09-21 16:27:39'),
('pos-065','Back Office Coordinator','Grade 9','dept-013',NULL,'2026-09-21 16:27:39','2026-09-21 16:27:39'),
('pos-066','Back Office Manager','Grade 12','dept-014',NULL,'2026-09-21 16:27:39','2026-09-21 16:27:39'),
('pos-067','Back Office Specialist','Grade 10','dept-015',NULL,'2026-09-21 16:27:39','2026-09-21 16:27:39'),
('pos-068','Back Office Lead','Grade 11','dept-016',NULL,'2026-09-21 16:27:39','2026-09-21 16:27:39'),
('pos-069','Back Office Associate','Grade 7','dept-017',NULL,'2026-09-21 16:27:39','2026-09-21 16:27:39'),
('pos-070','Senior HR Officer','Grade 11','dept-001',NULL,'2026-09-21 16:27:39','2026-09-21 16:27:39'),
('pos-071','Finance Director','Grade 15','dept-002',NULL,'2026-09-21 16:27:39','2026-09-21 16:27:39'),
('pos-072','IT Director','Grade 15','dept-003',NULL,'2026-09-21 16:27:39','2026-09-21 16:27:39'),
('pos-073','Operations Director','Grade 15','dept-004',NULL,'2026-09-21 16:27:39','2026-09-21 16:27:39'),
('pos-074','Chief Administrative Officer','Grade 16','dept-005',NULL,'2026-09-21 16:27:39','2026-09-21 16:27:39'),
('pos-075','Procurement Director','Grade 14','dept-006',NULL,'2026-09-21 16:27:39','2026-09-21 16:27:39'),
('pos-076','General Counsel','Grade 15','dept-007',NULL,'2026-09-21 16:27:39','2026-09-21 16:27:39'),
('pos-077','Chief Audit Executive','Grade 15','dept-008',NULL,'2026-09-21 16:27:39','2026-09-21 16:27:39'),
('pos-078','Call Center Director','Grade 14','dept-009',NULL,'2026-09-21 16:27:39','2026-09-21 16:27:39'),
('pos-079','Senior Analyst','Grade 12','dept-010',NULL,'2026-09-21 16:27:39','2026-09-21 16:27:39'),
('pos-080','Division Head','Grade 13','dept-011',NULL,'2026-09-21 16:27:39','2026-09-21 16:27:39'),
('pos-081','Senior Officer','Grade 11','dept-012',NULL,'2026-09-21 16:27:39','2026-09-21 16:27:39'),
('pos-082','Division Coordinator','Grade 10','dept-013',NULL,'2026-09-21 16:27:39','2026-09-21 16:27:39'),
('pos-083','Senior Specialist','Grade 12','dept-014',NULL,'2026-09-21 16:27:39','2026-09-21 16:27:39'),
('pos-084','Division Analyst','Grade 10','dept-015',NULL,'2026-09-21 16:27:39','2026-09-21 16:27:39'),
('pos-085','Senior Coordinator','Grade 11','dept-016',NULL,'2026-09-21 16:27:39','2026-09-21 16:27:39'),
('pos-086','Division Manager','Grade 13','dept-017',NULL,'2026-09-21 16:27:39','2026-09-21 16:27:39'),
('pos-087','Senior Planning Officer','Grade 12','dept-018',NULL,'2026-09-21 16:27:39','2026-09-21 16:27:39'),
('pos-088','Customer Experience Manager','Grade 12','dept-019',NULL,'2026-09-21 16:27:39','2026-09-21 16:27:39'),
('pos-089','Senior Research Officer','Grade 12','dept-020',NULL,'2026-09-21 16:27:39','2026-09-21 16:27:39'),
('pos-090','QA Manager','Grade 12','dept-021',NULL,'2026-09-21 16:27:39','2026-09-21 16:27:39'),
('pos-091','Training Manager','Grade 12','dept-022',NULL,'2026-09-21 16:27:39','2026-09-21 16:27:39'),
('pos-092','Marketing Manager','Grade 12','dept-023',NULL,'2026-09-21 16:27:39','2026-09-21 16:27:39'),
('pos-093','PR Manager','Grade 12','dept-024',NULL,'2026-09-21 16:27:39','2026-09-21 16:27:39'),
('pos-094','Security Manager','Grade 11','dept-025',NULL,'2026-09-21 16:27:39','2026-09-21 16:27:39'),
('pos-095','Facilities Manager','Grade 11','dept-026',NULL,'2026-09-21 16:27:39','2026-09-21 16:27:39'),
('pos-096','Supply Chain Manager','Grade 12','dept-027',NULL,'2026-09-21 16:27:39','2026-09-21 16:27:39'),
('pos-097','Risk Manager','Grade 13','dept-028',NULL,'2026-09-21 16:27:39','2026-09-21 16:27:39'),
('pos-098','Compliance Manager','Grade 13','dept-029',NULL,'2026-09-21 16:27:39','2026-09-21 16:27:39'),
('pos-099','Corporate Affairs Manager','Grade 12','dept-030',NULL,'2026-09-21 16:27:39','2026-09-21 16:27:39'),
('pos-100','Digital Innovation Officer','Grade 11','dept-031',NULL,'2026-09-21 16:27:39','2026-09-21 16:27:39'),
('pos-101','Data Engineer','Grade 11','dept-032',NULL,'2026-09-21 16:27:39','2026-09-21 16:27:39'),
('pos-102','Project Manager','Grade 13','dept-033',NULL,'2026-09-21 16:27:39','2026-09-21 16:27:39'),
('pos-103','Business Analyst','Grade 11','dept-034',NULL,'2026-09-21 16:27:39','2026-09-21 16:27:39'),
('pos-104','Executive Secretary','Grade 11','dept-035',NULL,'2026-09-21 16:27:39','2026-09-21 16:27:39'),
('pos-105','Senior Payroll Officer','Grade 12','dept-036',NULL,'2026-09-21 16:27:39','2026-09-21 16:27:39'),
('pos-106','Senior Benefits Coordinator','Grade 11','dept-037',NULL,'2026-09-21 16:27:39','2026-09-21 16:27:39'),
('pos-107','Senior Employee Relations Officer','Grade 12','dept-038',NULL,'2026-09-21 16:27:39','2026-09-21 16:27:39'),
('pos-108','HR Generalist','Grade 10','dept-001',NULL,'2026-09-21 16:27:39','2026-09-21 16:27:39'),
('pos-109','Tax Accountant','Grade 11','dept-002',NULL,'2026-09-21 16:27:39','2026-09-21 16:27:39'),
('pos-110','Database Administrator','Grade 11','dept-003',NULL,'2026-09-21 16:27:39','2026-09-21 16:27:39'),
('pos-111','Logistics Coordinator','Grade 9','dept-004',NULL,'2026-09-21 16:27:39','2026-09-21 16:27:39'),
('pos-112','Records Officer','Grade 8','dept-005',NULL,'2026-09-21 16:27:39','2026-09-21 16:27:39'),
('pos-113','Vendor Relations Officer','Grade 10','dept-006',NULL,'2026-09-21 16:27:39','2026-09-21 16:27:39'),
('pos-114','Contract Specialist','Grade 11','dept-007',NULL,'2026-09-21 16:27:39','2026-09-21 16:27:39'),
('pos-115','Audit Coordinator','Grade 9','dept-008',NULL,'2026-09-21 16:27:39','2026-09-21 16:27:39'),
('pos-116','Customer Support Specialist','Grade 8','dept-009',NULL,'2026-09-21 16:27:39','2026-09-21 16:27:39'),
('pos-117','Service Delivery Officer','Grade 9','dept-010',NULL,'2026-09-21 16:27:39','2026-09-21 16:27:39'),
('pos-118','Environmental Officer','Grade 10','dept-011',NULL,'2026-09-21 16:27:39','2026-09-21 16:27:39'),
('pos-119','Monitoring Officer','Grade 9','dept-012',NULL,'2026-09-21 16:27:39','2026-09-21 16:27:39'),
('pos-120','Reporting Analyst','Grade 10','dept-013',NULL,'2026-09-21 16:27:39','2026-09-21 16:27:39'),
('pos-121','Standards Officer','Grade 9','dept-014',NULL,'2026-09-21 16:27:39','2026-09-21 16:27:39'),
('pos-122','Evaluation Specialist','Grade 10','dept-015',NULL,'2026-09-21 16:27:39','2026-09-21 16:27:39'),
('pos-123','Financial Controller','Grade 13','dept-016',NULL,'2026-09-21 16:27:39','2026-09-21 16:27:39'),
('pos-124','Transport Officer','Grade 8','dept-017',NULL,'2026-09-21 16:27:39','2026-09-21 16:27:39'),
('pos-125','Policy Analyst','Grade 11','dept-018',NULL,'2026-09-21 16:27:39','2026-09-21 16:27:39'),
('pos-126','Relationship Manager','Grade 12','dept-019',NULL,'2026-09-21 16:27:39','2026-09-21 16:27:39'),
('pos-127','Innovation Analyst','Grade 10','dept-020',NULL,'2026-09-21 16:27:39','2026-09-21 16:27:39'),
('pos-128','Testing Specialist','Grade 9','dept-021',NULL,'2026-09-21 16:27:39','2026-09-21 16:27:39'),
('pos-129','Learning & Development Officer','Grade 10','dept-022',NULL,'2026-09-21 16:27:39','2026-09-21 16:27:39'),
('pos-130','Brand Officer','Grade 10','dept-023',NULL,'2026-09-21 16:27:39','2026-09-21 16:27:39'),
('pos-131','Communications Officer','Grade 10','dept-024',NULL,'2026-09-21 16:27:39','2026-09-21 16:27:39'),
('pos-132','Guard Supervisor','Grade 9','dept-025',NULL,'2026-09-21 16:27:39','2026-09-21 16:27:39'),
('pos-133','Maintenance Officer','Grade 8','dept-026',NULL,'2026-09-21 16:27:39','2026-09-21 16:27:39'),
('pos-134','Inventory Controller','Grade 9','dept-027',NULL,'2026-09-21 16:27:39','2026-09-21 16:27:39'),
('pos-135','Risk Officer','Grade 10','dept-028',NULL,'2026-09-21 16:27:39','2026-09-21 16:27:39'),
('pos-136','Regulatory Affairs Officer','Grade 11','dept-029',NULL,'2026-09-21 16:27:39','2026-09-21 16:27:39'),
('pos-137','Stakeholder Relations Officer','Grade 10','dept-030',NULL,'2026-09-21 16:27:39','2026-09-21 16:27:39'),
('pos-138','Technology Architect','Grade 13','dept-031',NULL,'2026-09-21 16:27:39','2026-09-21 16:27:39');
/*!40000 ALTER TABLE `Positions` ENABLE KEYS */;
UNLOCK TABLES;
COMMIT;
SET AUTOCOMMIT=@OLD_AUTOCOMMIT;

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
-- Dumping data for table `RoleModules`
--

SET @OLD_AUTOCOMMIT=@@AUTOCOMMIT, @@AUTOCOMMIT=0;
LOCK TABLES `RoleModules` WRITE;
/*!40000 ALTER TABLE `RoleModules` DISABLE KEYS */;
INSERT INTO `RoleModules` VALUES
('03c88176-7e54-4f33-9cf1-54444ed4efdd','6012d36a-e345-404a-895e-79b76c79012e','3d25fb77-d945-44de-af92-240e09916f51','ca6b96a9-9756-4b1a-bf65-279976a99094','2026-10-06 16:54:44'),
('4045985a-8183-4082-a24a-4b51b9d55ba5','6012d36a-e345-404a-895e-79b76c79012e','cc7dcef2-1788-476f-a269-9cf4bcfc9435','ca6b96a9-9756-4b1a-bf65-279976a99094','2026-10-06 16:54:44'),
('6aa98984-1c35-40e1-836a-61921edce6c5','6012d36a-e345-404a-895e-79b76c79012e','faedcb8a-7f40-4c8e-ad7b-b4114dded5c0','ca6b96a9-9756-4b1a-bf65-279976a99094','2026-10-06 16:54:44'),
('7f1ed4d0-c6ec-4e4c-95c6-a216a451ce47','6012d36a-e345-404a-895e-79b76c79012e','90e2f4c6-f69d-4eb1-af6f-a3b25fdf55ab','ca6b96a9-9756-4b1a-bf65-279976a99094','2026-10-06 16:54:44'),
('c7bf81c8-783d-4d83-9e39-c16ab3fbfc29','6012d36a-e345-404a-895e-79b76c79012e','a3e30b6a-9b05-4004-8ea5-57c6b696d089','ca6b96a9-9756-4b1a-bf65-279976a99094','2026-10-06 16:54:44'),
('c8778f62-8676-46f6-9bab-cd79b090d769','6012d36a-e345-404a-895e-79b76c79012e','45b57ed0-b586-424a-b26e-9bdea38913fa','ca6b96a9-9756-4b1a-bf65-279976a99094','2026-10-06 16:54:44'),
('f173900a-f4e1-4cf4-8f58-bcc4b481f121','6012d36a-e345-404a-895e-79b76c79012e','95f15576-6c0e-4c7d-80ae-f1001cec50af','ca6b96a9-9756-4b1a-bf65-279976a99094','2026-10-06 16:54:44');
/*!40000 ALTER TABLE `RoleModules` ENABLE KEYS */;
UNLOCK TABLES;
COMMIT;
SET AUTOCOMMIT=@OLD_AUTOCOMMIT;

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
-- Dumping data for table `RoleOccupations`
--

SET @OLD_AUTOCOMMIT=@@AUTOCOMMIT, @@AUTOCOMMIT=0;
LOCK TABLES `RoleOccupations` WRITE;
/*!40000 ALTER TABLE `RoleOccupations` DISABLE KEYS */;
/*!40000 ALTER TABLE `RoleOccupations` ENABLE KEYS */;
UNLOCK TABLES;
COMMIT;
SET AUTOCOMMIT=@OLD_AUTOCOMMIT;

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
-- Dumping data for table `Roles`
--

SET @OLD_AUTOCOMMIT=@@AUTOCOMMIT, @@AUTOCOMMIT=0;
LOCK TABLES `Roles` WRITE;
/*!40000 ALTER TABLE `Roles` DISABLE KEYS */;
INSERT INTO `Roles` VALUES
('4958c5ab-7b91-4dd4-bdb7-cf7450da957c','EMPLOYEE','Employee','Regular employee with personal access only','98fafcad-160b-4c0c-afb7-35055d36ef9c',10,1,1,'2026-10-06 16:52:01','2026-10-06 16:52:01'),
('4d665df0-de8f-4ea9-a3c4-b91d6c5532cc','HR_OFFICER','HR Officer','HR officer with limited organization access','ae5f91a5-5df4-4805-9041-729c130dbd26',60,1,1,'2026-10-06 16:52:01','2026-10-06 16:52:01'),
('6012d36a-e345-404a-895e-79b76c79012e','SUPER_ADMIN','Super Admin','Full system access with all permissions','ae5f91a5-5df4-4805-9041-729c130dbd26',100,1,1,'2026-10-06 16:52:01','2026-10-06 16:52:01'),
('781a1085-0d0f-4965-bc9b-ea26245ca555','HR_ADMIN','HR Admin','HR administrator with organization-wide access','ae5f91a5-5df4-4805-9041-729c130dbd26',90,1,1,'2026-10-06 16:52:01','2026-10-06 16:52:01'),
('b420fe20-243b-4115-9c7f-2a48eee1f1bc','DEPARTMENT_HEAD','Department Head','Department head with department-level access','906f4992-f214-458d-8ae2-ea928f517f0b',70,1,1,'2026-10-06 16:52:01','2026-10-06 16:52:01');
/*!40000 ALTER TABLE `Roles` ENABLE KEYS */;
UNLOCK TABLES;
COMMIT;
SET AUTOCOMMIT=@OLD_AUTOCOMMIT;

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
-- Dumping data for table `Scopes`
--

SET @OLD_AUTOCOMMIT=@@AUTOCOMMIT, @@AUTOCOMMIT=0;
LOCK TABLES `Scopes` WRITE;
/*!40000 ALTER TABLE `Scopes` DISABLE KEYS */;
INSERT INTO `Scopes` VALUES
('a401fb51-c02e-4575-b3f2-e9204be07661','DEPARTMENT','Department','Access to data within own department only',50,'2026-10-06 10:49:27'),
('ca6b96a9-9756-4b1a-bf65-279976a99094','ORGANIZATION','Organization-wide','Access to all data across the entire organization',100,'2026-10-06 10:49:27'),
('d095a063-352f-4a78-9c4f-a477d49c7bca','PERSONAL','Personal','Access to own data only',10,'2026-10-06 10:49:27');
/*!40000 ALTER TABLE `Scopes` ENABLE KEYS */;
UNLOCK TABLES;
COMMIT;
SET AUTOCOMMIT=@OLD_AUTOCOMMIT;

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
-- Dumping data for table `ShiftDefinitions`
--

SET @OLD_AUTOCOMMIT=@@AUTOCOMMIT, @@AUTOCOMMIT=0;
LOCK TABLES `ShiftDefinitions` WRITE;
/*!40000 ALTER TABLE `ShiftDefinitions` DISABLE KEYS */;
INSERT INTO `ShiftDefinitions` VALUES
('shift-001','Morning Shift','08:00:00','17:00:00','[\"Monday\",\"Tuesday\",\"Wednesday\",\"Thursday\",\"Friday\"]',15,0,'2026-09-21 16:27:39','2026-09-21 16:27:39'),
('shift-002','Afternoon Shift','12:00:00','21:00:00','[\"Monday\",\"Tuesday\",\"Wednesday\",\"Thursday\",\"Friday\"]',15,0,'2026-09-21 16:27:39','2026-09-21 16:27:39'),
('shift-003','Night Shift','22:00:00','06:00:00','[\"Monday\",\"Tuesday\",\"Wednesday\",\"Thursday\",\"Friday\"]',15,0,'2026-09-21 16:27:39','2026-09-21 16:27:39'),
('shift-004','Weekend Shift','08:00:00','14:00:00','[\"Saturday\",\"Sunday\"]',15,0,'2026-09-21 16:27:39','2026-09-21 16:27:39');
/*!40000 ALTER TABLE `ShiftDefinitions` ENABLE KEYS */;
UNLOCK TABLES;
COMMIT;
SET AUTOCOMMIT=@OLD_AUTOCOMMIT;

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
-- Dumping data for table `UserScopes`
--

SET @OLD_AUTOCOMMIT=@@AUTOCOMMIT, @@AUTOCOMMIT=0;
LOCK TABLES `UserScopes` WRITE;
/*!40000 ALTER TABLE `UserScopes` DISABLE KEYS */;
/*!40000 ALTER TABLE `UserScopes` ENABLE KEYS */;
UNLOCK TABLES;
COMMIT;
SET AUTOCOMMIT=@OLD_AUTOCOMMIT;

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
-- Dumping data for table `Users`
--

SET @OLD_AUTOCOMMIT=@@AUTOCOMMIT, @@AUTOCOMMIT=0;
LOCK TABLES `Users` WRITE;
/*!40000 ALTER TABLE `Users` DISABLE KEYS */;
INSERT INTO `Users` VALUES
('user-admin-001','emp-1001','admin','$2a$10$xM1XVImo490LM/o55Pt3ge2nVOH4lnO5qJ.hq2LCAOulYsbl8cp9K','eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1dWlkIjoidXNlci1hZG1pbi0wMDEiLCJlbXBsb3llZV91dWlkIjoiZW1wLTEwMDEiLCJkZXBhcnRtZW50X3V1aWQiOiJkZXB0LTAwMSIsInRva2VuX3ZlcnNpb24iOjMsInBlcm1pc3Npb25zX3ZlcnNpb24iOjEsInRva2VuSWQiOiJkNTk2MmQ0OC0yZWY5LTRhMTYtODUwNS0yMWI4MDFiMjFkYzEiLCJpYXQiOjE3OTEzMTAxNjksImV4cCI6MTc5MTkxNDk2OX0.e8cTwWq99gDNKMAXtEecXynESMcBvq8jPhFtjRomBok',3,1,'super_admin','6012d36a-e345-404a-895e-79b76c79012e',1,1,0,'2026-10-06 21:09:29','2026-10-06 21:16:14','2026-09-21 16:34:01','2026-10-06 21:16:14'),
('user-dept-001','emp-1002','dept.marta','$2b$10$N9qo8uLOickgx2ZMRZoMye7fJZbVEKJRw6vIMvH1zXLmBfKfZKz6W',NULL,0,1,'department_head','b420fe20-243b-4115-9c7f-2a48eee1f1bc',4,1,0,NULL,NULL,'2026-09-21 16:34:01','2026-10-06 16:52:01'),
('user-dept-002','emp-1005','dept.dawit','$2b$10$N9qo8uLOickgx2ZMRZoMye7fJZbVEKJRw6vIMvH1zXLmBfKfZKz6W',NULL,0,1,'department_head','b420fe20-243b-4115-9c7f-2a48eee1f1bc',4,1,0,NULL,NULL,'2026-09-21 16:34:01','2026-10-06 16:52:01'),
('user-emp-001','emp-1003','emp.sami','$2b$10$N9qo8uLOickgx2ZMRZoMye7fJZbVEKJRw6vIMvH1zXLmBfKfZKz6W',NULL,0,1,'employee','4958c5ab-7b91-4dd4-bdb7-cf7450da957c',5,1,0,NULL,NULL,'2026-09-21 16:34:01','2026-10-06 16:52:01'),
('user-emp-002','emp-1010','emp.rahel','$2b$10$N9qo8uLOickgx2ZMRZoMye7fJZbVEKJRw6vIMvH1zXLmBfKfZKz6W',NULL,0,1,'employee','4958c5ab-7b91-4dd4-bdb7-cf7450da957c',5,1,0,NULL,NULL,'2026-09-21 16:34:01','2026-10-06 16:52:01'),
('user-emp-003','emp-1020','emp.tewodros','$2b$10$N9qo8uLOickgx2ZMRZoMye7fJZbVEKJRw6vIMvH1zXLmBfKfZKz6W',NULL,0,1,'employee','4958c5ab-7b91-4dd4-bdb7-cf7450da957c',5,1,0,NULL,NULL,'2026-09-21 16:34:01','2026-10-06 16:52:01'),
('user-hr-001','emp-1004','hr.tigist','$2b$10$N9qo8uLOickgx2ZMRZoMye7fJZbVEKJRw6vIMvH1zXLmBfKfZKz6W',NULL,0,1,'hr_admin','781a1085-0d0f-4965-bc9b-ea26245ca555',2,1,0,NULL,NULL,'2026-09-21 16:34:01','2026-10-06 16:52:01'),
('user-hr-002','emp-1023','hr.hanna','$2b$10$N9qo8uLOickgx2ZMRZoMye7fJZbVEKJRw6vIMvH1zXLmBfKfZKz6W',NULL,0,1,'hr_officer','4d665df0-de8f-4ea9-a3c4-b91d6c5532cc',3,1,0,NULL,NULL,'2026-09-21 16:34:01','2026-10-06 16:52:01');
/*!40000 ALTER TABLE `Users` ENABLE KEYS */;
UNLOCK TABLES;
COMMIT;
SET AUTOCOMMIT=@OLD_AUTOCOMMIT;

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
-- Dumping data for table `_migrations`
--

SET @OLD_AUTOCOMMIT=@@AUTOCOMMIT, @@AUTOCOMMIT=0;
LOCK TABLES `_migrations` WRITE;
/*!40000 ALTER TABLE `_migrations` DISABLE KEYS */;
/*!40000 ALTER TABLE `_migrations` ENABLE KEYS */;
UNLOCK TABLES;
COMMIT;
SET AUTOCOMMIT=@OLD_AUTOCOMMIT;

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
-- Dumping data for table `budgetYears`
--

SET @OLD_AUTOCOMMIT=@@AUTOCOMMIT, @@AUTOCOMMIT=0;
LOCK TABLES `budgetYears` WRITE;
/*!40000 ALTER TABLE `budgetYears` DISABLE KEYS */;
/*!40000 ALTER TABLE `budgetYears` ENABLE KEYS */;
UNLOCK TABLES;
COMMIT;
SET AUTOCOMMIT=@OLD_AUTOCOMMIT;

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
-- Dumping data for table `employeeLeaveBalances`
--

SET @OLD_AUTOCOMMIT=@@AUTOCOMMIT, @@AUTOCOMMIT=0;
LOCK TABLES `employeeLeaveBalances` WRITE;
/*!40000 ALTER TABLE `employeeLeaveBalances` DISABLE KEYS */;
INSERT INTO `employeeLeaveBalances` VALUES
('bal-emp-1001-2018','emp-1001','2018',25.0,3.0,0.0,24.0,'ACTIVE','2026-09-21'),
('bal-emp-1002-2018','emp-1002','2018',20.0,2.0,3.0,20.0,'ACTIVE','2026-09-21'),
('bal-emp-1003-2018','emp-1003','2018',20.0,0.0,5.0,18.0,'ACTIVE','2026-09-21'),
('bal-emp-1004-2018','emp-1004','2018',25.0,3.0,1.0,23.0,'ACTIVE','2026-09-21'),
('bal-emp-1005-2018','emp-1005','2018',25.0,4.0,8.0,19.0,'ACTIVE','2026-09-21'),
('bal-emp-1006-2018','emp-1006','2018',20.0,2.0,8.0,15.0,'ACTIVE','2026-09-21'),
('bal-emp-1007-2018','emp-1007','2018',25.0,2.0,3.0,21.0,'ACTIVE','2026-09-21'),
('bal-emp-1008-2018','emp-1008','2018',20.0,1.0,8.0,13.0,'ACTIVE','2026-09-21'),
('bal-emp-1009-2018','emp-1009','2018',20.0,4.0,4.0,16.0,'ACTIVE','2026-09-21'),
('bal-emp-1010-2018','emp-1010','2018',25.0,0.0,0.0,16.0,'ACTIVE','2026-09-21'),
('bal-emp-1011-2018','emp-1011','2018',20.0,2.0,3.0,15.0,'ACTIVE','2026-09-21'),
('bal-emp-1012-2018','emp-1012','2018',20.0,3.0,1.0,16.0,'ACTIVE','2026-09-21'),
('bal-emp-1013-2018','emp-1013','2018',20.0,4.0,9.0,18.0,'ACTIVE','2026-09-21'),
('bal-emp-1014-2018','emp-1014','2018',25.0,1.0,4.0,19.0,'ACTIVE','2026-09-21'),
('bal-emp-1015-2018','emp-1015','2018',25.0,4.0,7.0,18.0,'ACTIVE','2026-09-21'),
('bal-emp-1016-2018','emp-1016','2018',20.0,3.0,5.0,18.0,'ACTIVE','2026-09-21'),
('bal-emp-1017-2018','emp-1017','2018',20.0,4.0,6.0,17.0,'ACTIVE','2026-09-21'),
('bal-emp-1018-2018','emp-1018','2018',20.0,0.0,3.0,18.0,'ACTIVE','2026-09-21'),
('bal-emp-1019-2018','emp-1019','2018',20.0,1.0,4.0,13.0,'ACTIVE','2026-09-21'),
('bal-emp-1020-2018','emp-1020','2018',25.0,0.0,3.0,19.0,'ACTIVE','2026-09-21'),
('bal-emp-1021-2018','emp-1021','2018',20.0,0.0,9.0,19.0,'ACTIVE','2026-09-21'),
('bal-emp-1022-2018','emp-1022','2018',20.0,0.0,8.0,20.0,'ACTIVE','2026-09-21'),
('bal-emp-1023-2018','emp-1023','2018',25.0,3.0,7.0,22.0,'ACTIVE','2026-09-21'),
('bal-emp-1024-2018','emp-1024','2018',20.0,2.0,0.0,20.0,'ACTIVE','2026-09-21'),
('bal-emp-1025-2018','emp-1025','2018',25.0,4.0,7.0,17.0,'ACTIVE','2026-09-21');
/*!40000 ALTER TABLE `employeeLeaveBalances` ENABLE KEYS */;
UNLOCK TABLES;
COMMIT;
SET AUTOCOMMIT=@OLD_AUTOCOMMIT;

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
-- Dumping data for table `leavePolicies`
--

SET @OLD_AUTOCOMMIT=@@AUTOCOMMIT, @@AUTOCOMMIT=0;
LOCK TABLES `leavePolicies` WRITE;
/*!40000 ALTER TABLE `leavePolicies` DISABLE KEYS */;
INSERT INTO `leavePolicies` VALUES
('policy-annual-001','Annual',20,1,30,11,1),
('policy-emergency-001','Emergency',3,0,3,0,0),
('policy-maternity-001','Maternity',90,0,90,0,0),
('policy-paternity-001','Paternity',10,0,10,0,0),
('policy-sick-001','Sick',10,0,10,6,0),
('policy-unpaid-001','Unpaid',30,0,30,0,0);
/*!40000 ALTER TABLE `leavePolicies` ENABLE KEYS */;
UNLOCK TABLES;
COMMIT;
SET AUTOCOMMIT=@OLD_AUTOCOMMIT;

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
-- Dumping data for table `leavePostponements`
--

SET @OLD_AUTOCOMMIT=@@AUTOCOMMIT, @@AUTOCOMMIT=0;
LOCK TABLES `leavePostponements` WRITE;
/*!40000 ALTER TABLE `leavePostponements` DISABLE KEYS */;
/*!40000 ALTER TABLE `leavePostponements` ENABLE KEYS */;
UNLOCK TABLES;
COMMIT;
SET AUTOCOMMIT=@OLD_AUTOCOMMIT;

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
-- Dumping data for table `leaveRequestDocuments`
--

SET @OLD_AUTOCOMMIT=@@AUTOCOMMIT, @@AUTOCOMMIT=0;
LOCK TABLES `leaveRequestDocuments` WRITE;
/*!40000 ALTER TABLE `leaveRequestDocuments` DISABLE KEYS */;
/*!40000 ALTER TABLE `leaveRequestDocuments` ENABLE KEYS */;
UNLOCK TABLES;
COMMIT;
SET AUTOCOMMIT=@OLD_AUTOCOMMIT;

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

--
-- Dumping data for table `leaveRequests`
--

SET @OLD_AUTOCOMMIT=@@AUTOCOMMIT, @@AUTOCOMMIT=0;
LOCK TABLES `leaveRequests` WRITE;
/*!40000 ALTER TABLE `leaveRequests` DISABLE KEYS */;
INSERT INTO `leaveRequests` VALUES
('req-1001-001','emp-1001','Annual','2026-06-10','2026-06-14',5.0,'FULL_DAY',NULL,'Family vacation',NULL,NULL,'APPROVED',NULL,NULL,NULL,NULL,NULL,NULL,0,NULL,NULL,'2026-09-21 16:27:39','2026-09-21 16:27:39'),
('req-1002-001','emp-1002','Sick','2026-05-20','2026-05-22',3.0,'FULL_DAY',NULL,'Medical treatment',NULL,NULL,'APPROVED',NULL,NULL,NULL,NULL,NULL,NULL,0,NULL,NULL,'2026-09-21 16:27:39','2026-09-21 16:27:39'),
('req-1003-001','emp-1003','Annual','2026-06-12','2026-06-16',5.0,'FULL_DAY',NULL,'Personal matters',NULL,NULL,'PENDING',NULL,NULL,NULL,NULL,NULL,NULL,0,NULL,NULL,'2026-09-21 16:27:39','2026-09-21 16:27:39'),
('req-1004-001','emp-1004','Annual','2026-08-15','2026-08-20',6.0,'FULL_DAY',NULL,'Summer vacation',NULL,NULL,'PENDING_DEPARTMENT',NULL,NULL,NULL,NULL,NULL,NULL,0,NULL,NULL,'2026-09-21 16:27:39','2026-09-21 16:27:39'),
('req-1005-001','emp-1005','Paternity','2026-05-01','2026-05-10',10.0,'FULL_DAY',NULL,'Paternity leave',NULL,NULL,'APPROVED',NULL,NULL,NULL,NULL,NULL,NULL,0,NULL,NULL,'2026-09-21 16:27:39','2026-09-21 16:27:39'),
('req-1006-001','emp-1006','Annual','2026-06-20','2026-06-25',6.0,'FULL_DAY',NULL,'Annual leave',NULL,NULL,'PENDING',NULL,NULL,NULL,NULL,NULL,NULL,0,NULL,NULL,'2026-09-21 16:27:39','2026-09-21 16:27:39'),
('req-1007-001','emp-1007','Sick','2026-06-08','2026-06-09',2.0,'FULL_DAY',NULL,'Illness',NULL,NULL,'PENDING_DEPARTMENT',NULL,NULL,NULL,NULL,NULL,NULL,0,NULL,NULL,'2026-09-21 16:27:39','2026-09-21 16:27:39'),
('req-1008-001','emp-1008','Annual','2026-07-15','2026-07-19',5.0,'FULL_DAY',NULL,'Vacation',NULL,NULL,'PENDING',NULL,NULL,NULL,NULL,NULL,NULL,0,NULL,NULL,'2026-09-21 16:27:39','2026-09-21 16:27:39'),
('req-1009-001','emp-1009','Emergency','2026-06-10','2026-06-11',2.0,'FULL_DAY',NULL,'Family emergency',NULL,NULL,'PENDING',NULL,NULL,NULL,NULL,NULL,NULL,0,NULL,NULL,'2026-09-21 16:27:39','2026-09-21 16:27:39'),
('req-1010-001','emp-1010','Annual','2026-08-01','2026-08-05',5.0,'FULL_DAY',NULL,'Annual leave',NULL,NULL,'APPROVED',NULL,NULL,NULL,NULL,NULL,NULL,0,NULL,NULL,'2026-09-21 16:27:39','2026-09-21 16:27:39'),
('req-1011-001','emp-1011','Sick','2026-06-01','2026-06-03',3.0,'FULL_DAY',NULL,'Medical',NULL,NULL,'APPROVED',NULL,NULL,NULL,NULL,NULL,NULL,0,NULL,NULL,'2026-09-21 16:27:39','2026-09-21 16:27:39'),
('req-1012-001','emp-1012','Annual','2026-07-20','2026-07-24',5.0,'FULL_DAY',NULL,'Vacation',NULL,NULL,'PENDING',NULL,NULL,NULL,NULL,NULL,NULL,0,NULL,NULL,'2026-09-21 16:27:39','2026-09-21 16:27:39'),
('req-1013-001','emp-1013','Maternity','2026-06-15','2026-09-12',90.0,'FULL_DAY',NULL,'Maternity leave',NULL,NULL,'APPROVED',NULL,NULL,NULL,NULL,NULL,NULL,0,NULL,NULL,'2026-09-21 16:27:39','2026-09-21 16:27:39'),
('req-1014-001','emp-1014','Annual','2026-05-25','2026-05-29',5.0,'FULL_DAY',NULL,'Annual leave',NULL,NULL,'APPROVED',NULL,NULL,NULL,NULL,NULL,NULL,0,NULL,NULL,'2026-09-21 16:27:39','2026-09-21 16:27:39'),
('req-1015-001','emp-1015','Sick','2026-04-20','2026-04-22',3.0,'FULL_DAY',NULL,'Illness',NULL,NULL,'REJECTED',NULL,NULL,NULL,NULL,NULL,NULL,0,NULL,NULL,'2026-09-21 16:27:39','2026-09-21 16:27:39');
/*!40000 ALTER TABLE `leaveRequests` ENABLE KEYS */;
UNLOCK TABLES;
COMMIT;
SET AUTOCOMMIT=@OLD_AUTOCOMMIT;
/*!40103 SET TIME_ZONE=@OLD_TIME_ZONE */;

/*!40101 SET SQL_MODE=@OLD_SQL_MODE */;
/*!40014 SET FOREIGN_KEY_CHECKS=@OLD_FOREIGN_KEY_CHECKS */;
/*!40014 SET UNIQUE_CHECKS=@OLD_UNIQUE_CHECKS */;
/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
/*M!100616 SET NOTE_VERBOSITY=@OLD_NOTE_VERBOSITY */;

-- Dump completed on 2026-10-06 21:19:16
