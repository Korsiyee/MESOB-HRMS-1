-- ============================================================================
-- Mesob HRMS Database Seed Data
-- ============================================================================
-- Version: 1.0.0
-- Created: 2024
-- Description: Initial seed data for Mesob HRMS (Human Resource Management System)
--              This file populates essential reference data needed for the system
--              to function properly.
--
-- Usage: This file should be run AFTER schema.sql:
--        mysql -u username -p database_name < seed.sql
--
-- Seed Data Includes:
--   - Scopes: PERSONAL, DEPARTMENT, ORGANIZATION
--   - Roles: SUPER_ADMIN, HR_ADMIN, HR_OFFICER, DEPARTMENT_HEAD, EMPLOYEE
--   - Modules: HOME, EMPLOYEES, ORGANIZATION, ATTENDANCE, SHIFTS, LETTERS, LEAVE
--   - RoleModules: SUPER_ADMIN permissions for all modules
--
-- Note: INSERT statements use INSERT IGNORE to make this file idempotent
--       (can be run multiple times without errors)
-- ============================================================================

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
-- Dumping data for table `Scopes`
--

SET @OLD_AUTOCOMMIT=@@AUTOCOMMIT, @@AUTOCOMMIT=0;
LOCK TABLES `Scopes` WRITE;
/*!40000 ALTER TABLE `Scopes` DISABLE KEYS */;
INSERT IGNORE INTO `Scopes` VALUES
('a401fb51-c02e-4575-b3f2-e9204be07661','DEPARTMENT','Department','Access to data within own department only',50,'2026-10-06 10:49:27'),
('ca6b96a9-9756-4b1a-bf65-279976a99094','ORGANIZATION','Organization-wide','Access to all data across the entire organization',100,'2026-10-06 10:49:27'),
('d095a063-352f-4a78-9c4f-a477d49c7bca','PERSONAL','Personal','Access to own data only',10,'2026-10-06 10:49:27');
/*!40000 ALTER TABLE `Scopes` ENABLE KEYS */;
UNLOCK TABLES;
COMMIT;
SET AUTOCOMMIT=@OLD_AUTOCOMMIT;

--
-- Dumping data for table `Roles`
--

SET @OLD_AUTOCOMMIT=@@AUTOCOMMIT, @@AUTOCOMMIT=0;
LOCK TABLES `Roles` WRITE;
/*!40000 ALTER TABLE `Roles` DISABLE KEYS */;
INSERT IGNORE INTO `Roles` VALUES
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
-- Dumping data for table `Modules`
--

SET @OLD_AUTOCOMMIT=@@AUTOCOMMIT, @@AUTOCOMMIT=0;
LOCK TABLES `Modules` WRITE;
/*!40000 ALTER TABLE `Modules` DISABLE KEYS */;
INSERT IGNORE INTO `Modules` VALUES
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
-- Dumping data for table `RoleModules`
--

SET @OLD_AUTOCOMMIT=@@AUTOCOMMIT, @@AUTOCOMMIT=0;
LOCK TABLES `RoleModules` WRITE;
/*!40000 ALTER TABLE `RoleModules` DISABLE KEYS */;
INSERT IGNORE INTO `RoleModules` VALUES
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
/*!40103 SET TIME_ZONE=@OLD_TIME_ZONE */;

/*!40101 SET SQL_MODE=@OLD_SQL_MODE */;
/*!40014 SET FOREIGN_KEY_CHECKS=@OLD_FOREIGN_KEY_CHECKS */;
/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
/*M!100616 SET NOTE_VERBOSITY=@OLD_NOTE_VERBOSITY */;

-- Dump completed on 2026-10-06 21:26:28
