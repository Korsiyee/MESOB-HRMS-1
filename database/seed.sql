-- ============================================================================
-- FDRE MESOB HRMS - Seed Data
-- ============================================================================
-- Sample data for testing and development
-- Default password for all users: mesob2024
-- ============================================================================

SET FOREIGN_KEY_CHECKS=0;

-- ============================================================================
-- RBAC - Static Roles, Modules, and Scopes (Required)
-- ============================================================================

-- Insert Modules
INSERT INTO Modules (uuid, code, name, description, icon, display_order, is_active) VALUES
(UUID(), 'HOME', 'Home', 'Dashboard and overview', 'LayoutDashboard', 0, 1),
(UUID(), 'EMPLOYEES', 'Employees', 'Employee management', 'Users', 10, 1),
(UUID(), 'ORGANIZATION', 'Organization', 'Departments, positions, levels', 'Building2', 20, 1),
(UUID(), 'ATTENDANCE', 'Attendance', 'Attendance tracking and analytics', 'Clock', 30, 1),
(UUID(), 'SHIFTS', 'Shifts', 'Shift definitions and assignments', 'Layers', 40, 1),
(UUID(), 'LETTERS', 'Letters', 'Letter generation and templates', 'FileText', 50, 1),
(UUID(), 'LEAVE', 'Leave', 'Leave requests and management', 'CalendarDays', 60, 1),
(UUID(), 'ADMIN', 'Administration', 'System administration', 'Shield', 70, 1);

-- Insert Scopes
INSERT INTO Scopes (uuid, code, name, description, level) VALUES
(UUID(), 'ORGANIZATION', 'Organization', 'Access to all data across organization', 100),
(UUID(), 'DEPARTMENT', 'Department', 'Access to own department data only', 50),
(UUID(), 'PERSONAL', 'Personal', 'Access to own data only', 10);

-- Insert Static Roles
INSERT INTO Roles (uuid, code, name, description, default_scope_uuid, hierarchy_level, is_system_role, is_active) VALUES
(UUID(), 'SUPER_ADMIN', 'Super Administrator', 'Full system access with all permissions', (SELECT uuid FROM Scopes WHERE code = 'ORGANIZATION'), 100, 1, 1),
(UUID(), 'HR_ADMIN', 'HR Administrator', 'HR management with organization-wide scope', (SELECT uuid FROM Scopes WHERE code = 'ORGANIZATION'), 90, 1, 1),
(UUID(), 'DEPARTMENT_HEAD', 'Department Head', 'Department-level management and oversight', (SELECT uuid FROM Scopes WHERE code = 'DEPARTMENT'), 70, 1, 1),
(UUID(), 'HR_OFFICER', 'HR Officer', 'HR operations and support staff', (SELECT uuid FROM Scopes WHERE code = 'ORGANIZATION'), 60, 1, 1),
(UUID(), 'EMPLOYEE', 'Employee', 'Regular employee with personal access', (SELECT uuid FROM Scopes WHERE code = 'PERSONAL'), 10, 1, 1);

-- SUPER_ADMIN: Full access to all modules
INSERT INTO RoleModules (uuid, role_uuid, module_uuid, scope_uuid)
SELECT UUID(), (SELECT uuid FROM Roles WHERE code = 'SUPER_ADMIN'), m.uuid, (SELECT uuid FROM Scopes WHERE code = 'ORGANIZATION')
FROM Modules m;

-- HR_ADMIN: All modules except ADMIN
INSERT INTO RoleModules (uuid, role_uuid, module_uuid, scope_uuid)
SELECT UUID(), (SELECT uuid FROM Roles WHERE code = 'HR_ADMIN'), m.uuid, (SELECT uuid FROM Scopes WHERE code = 'ORGANIZATION')
FROM Modules m WHERE m.code != 'ADMIN';

-- DEPARTMENT_HEAD: Department-scoped access to employee and attendance modules
INSERT INTO RoleModules (uuid, role_uuid, module_uuid, scope_uuid)
SELECT UUID(), (SELECT uuid FROM Roles WHERE code = 'DEPARTMENT_HEAD'), m.uuid, (SELECT uuid FROM Scopes WHERE code = 'DEPARTMENT')
FROM Modules m WHERE m.code IN ('HOME', 'EMPLOYEES', 'ATTENDANCE', 'SHIFTS', 'LEAVE');

-- HR_OFFICER: Organization-scoped access to HR-related modules
INSERT INTO RoleModules (uuid, role_uuid, module_uuid, scope_uuid)
SELECT UUID(), (SELECT uuid FROM Roles WHERE code = 'HR_OFFICER'), m.uuid, (SELECT uuid FROM Scopes WHERE code = 'ORGANIZATION')
FROM Modules m WHERE m.code IN ('HOME', 'EMPLOYEES', 'LETTERS', 'LEAVE');

-- EMPLOYEE: Personal access to dashboard only
INSERT INTO RoleModules (uuid, role_uuid, module_uuid, scope_uuid)
SELECT UUID(), (SELECT uuid FROM Roles WHERE code = 'EMPLOYEE'), m.uuid, (SELECT uuid FROM Scopes WHERE code = 'PERSONAL')
FROM Modules m WHERE m.code = 'HOME';

-- ============================================================================
-- Sample Organization Data
-- ============================================================================

-- Departments
INSERT INTO Departments (uuid, dept_code, name, parent_uuid, is_active) VALUES
('d1000001-0000-0000-0000-000000000001', 'MIN-INNOV', 'Ministry of Innovation and Technology', NULL, 1),
('d1000001-0000-0000-0000-000000000002', 'MIN-FIN', 'Ministry of Finance', NULL, 1),
('d1000001-0000-0000-0000-000000000003', 'MIN-HR', 'Ministry of Human Resources', NULL, 1),
('d1000001-0000-0000-0000-000000000004', 'MIN-HEALTH', 'Ministry of Health', NULL, 1),
('d1000001-0000-0000-0000-000000000005', 'MIN-EDU', 'Ministry of Education', NULL, 1),
('d1000001-0000-0000-0000-000000000006', 'MIN-TRADE', 'Ministry of Trade and Industry', NULL, 1),
('d1000001-0000-0000-0000-000000000007', 'MIN-TRANS', 'Ministry of Transport and Logistics', NULL, 1),
('d1000001-0000-0000-0000-000000000008', 'MIN-AGR', 'Ministry of Agriculture', NULL, 1),
('d1000001-0000-0000-0000-000000000009', 'MIN-WATER', 'Ministry of Water and Energy', NULL, 1),
('d1000001-0000-0000-0000-000000000010', 'MIN-LABOR', 'Ministry of Labor and Social Affairs', NULL, 1);

-- Shift Definitions
INSERT INTO ShiftDefinitions (uuid, shift_code, name, start_time, end_time, working_days_json, grace_period_minutes, break_duration_minutes) VALUES
('s1000001-0000-0000-0000-000000000001', 'SHIFT-DAY', 'Day Shift (8:30 AM - 5:30 PM)', '08:30:00', '17:30:00', '[1,2,3,4,5]', 15, 60),
('s1000001-0000-0000-0000-000000000002', 'SHIFT-FLEX', 'Flexible Shift (7:00 AM - 4:00 PM)', '07:00:00', '16:00:00', '[1,2,3,4,5]', 15, 60);

-- Positions
INSERT INTO Positions (uuid, position_code, title, grade, occupation_type, department_uuid, default_shift_uuid) VALUES
('p1000001-0000-0000-0000-000000000001', 'POS-MIN', 'Minister', 'Grade 1', 'Executive Leadership', 'd1000001-0000-0000-0000-000000000001', 's1000001-0000-0000-0000-000000000001'),
('p1000001-0000-0000-0000-000000000002', 'POS-DIR', 'Director General', 'Grade 2', 'Senior Management', 'd1000001-0000-0000-0000-000000000002', 's1000001-0000-0000-0000-000000000001'),
('p1000001-0000-0000-0000-000000000003', 'POS-DEPT', 'Department Head', 'Grade 3', 'Middle Management', 'd1000001-0000-0000-0000-000000000003', 's1000001-0000-0000-0000-000000000001'),
('p1000001-0000-0000-0000-000000000004', 'POS-SPEC', 'Senior Specialist', 'Grade 4', 'Professional', 'd1000001-0000-0000-0000-000000000004', 's1000001-0000-0000-0000-000000000001'),
('p1000001-0000-0000-0000-000000000005', 'POS-OFF', 'Officer', 'Grade 5', 'Operations', 'd1000001-0000-0000-0000-000000000005', 's1000001-0000-0000-0000-000000000001');

-- Compensation Levels
INSERT INTO Levels (uuid, level_code, name, description, sort_order, is_active) VALUES
('l1000001-0000-0000-0000-000000000001', 'LEVEL-1', 'Level 1 - Executive', 'Executive level compensation', 10, 1),
('l1000001-0000-0000-0000-000000000002', 'LEVEL-2', 'Level 2 - Senior Management', 'Senior management level', 20, 1),
('l1000001-0000-0000-0000-000000000003', 'LEVEL-3', 'Level 3 - Middle Management', 'Middle management level', 30, 1),
('l1000001-0000-0000-0000-000000000004', 'LEVEL-4', 'Level 4 - Professional', 'Professional level', 40, 1),
('l1000001-0000-0000-0000-000000000005', 'LEVEL-5', 'Level 5 - Operations', 'Operations level', 50, 1);

-- Level Versions (Current salary structures)
INSERT INTO LevelVersions (uuid, level_uuid, base_salary, allowances_json, effective_from, effective_to, version_number, notes) VALUES
('lv100001-0000-0000-0000-000000000001', 'l1000001-0000-0000-0000-000000000001', 45000.00, '[{"type":"Housing","amount":15000},{"type":"Transport","amount":8000}]', '2024-01-01', NULL, 1, 'Executive level'),
('lv100001-0000-0000-0000-000000000002', 'l1000001-0000-0000-0000-000000000002', 35000.00, '[{"type":"Housing","amount":12000},{"type":"Transport","amount":6000}]', '2024-01-01', NULL, 1, 'Senior management'),
('lv100001-0000-0000-0000-000000000003', 'l1000001-0000-0000-0000-000000000003', 25000.00, '[{"type":"Housing","amount":8000},{"type":"Transport","amount":4000}]', '2024-01-01', NULL, 1, 'Middle management'),
('lv100001-0000-0000-0000-000000000004', 'l1000001-0000-0000-0000-000000000004', 18000.00, '[{"type":"Housing","amount":5000},{"type":"Transport","amount":3000}]', '2024-01-01', NULL, 1, 'Professional'),
('lv100001-0000-0000-0000-000000000005', 'l1000001-0000-0000-0000-000000000005', 12000.00, '[{"type":"Housing","amount":3000},{"type":"Transport","amount":2000}]', '2024-01-01', NULL, 1, 'Operations');

-- ============================================================================
-- Sample Employees
-- ============================================================================

INSERT INTO Employees (uuid, mesob_id, title, first_name, middle_name, last_name, mother_name, gender, date_of_birth, nationality, tin_number, pension_code, bank_name, bank_account_number, hire_date, prior_gov_service_years, status, position_uuid, department_uuid) VALUES
('e1000001-0000-0000-0000-000000000001', 'MESOB-001', 'Ato', 'Abebe', 'Kebede', 'Tadesse', 'Almaz Worku', 'MALE', '1975-03-15', 'Ethiopian', 'TIN0001234567', 'PEN001', 'Commercial Bank of Ethiopia', '1000123456789', '2015-01-10', 5.00, 'ACTIVE', 'p1000001-0000-0000-0000-000000000001', 'd1000001-0000-0000-0000-000000000001'),
('e1000001-0000-0000-0000-000000000002', 'MESOB-002', 'W/ro', 'Tigist', 'Alemayehu', 'Bekele', 'Hiwot Hailu', 'FEMALE', '1980-07-22', 'Ethiopian', 'TIN0002345678', 'PEN002', 'Commercial Bank of Ethiopia', '1000234567890', '2016-03-15', 3.00, 'ACTIVE', 'p1000001-0000-0000-0000-000000000002', 'd1000001-0000-0000-0000-000000000002'),
('e1000001-0000-0000-0000-000000000003', 'MESOB-003', 'Ato', 'Dawit', 'Tesfaye', 'Girma', 'Seble Desta', 'MALE', '1982-11-08', 'Ethiopian', 'TIN0003456789', 'PEN003', 'Awash Bank', '2000345678901', '2017-06-20', 2.00, 'ACTIVE', 'p1000001-0000-0000-0000-000000000003', 'd1000001-0000-0000-0000-000000000003'),
('e1000001-0000-0000-0000-000000000004', 'MESOB-004', 'W/t', 'Marta', 'Assefa', 'Mulugeta', 'Mulu Gebre', 'FEMALE', '1985-05-30', 'Ethiopian', 'TIN0004567890', 'PEN004', 'Bank of Abyssinia', '3000456789012', '2018-09-01', 1.00, 'ACTIVE', 'p1000001-0000-0000-0000-000000000004', 'd1000001-0000-0000-0000-000000000004'),
('e1000001-0000-0000-0000-000000000005', 'MESOB-005', 'Ato', 'Yohannes', 'Mekonnen', 'Solomon', 'Rahel Yosef', 'MALE', '1988-02-14', 'Ethiopian', 'TIN0005678901', 'PEN005', 'Dashen Bank', '4000567890123', '2019-01-15', 0.00, 'ACTIVE', 'p1000001-0000-0000-0000-000000000005', 'd1000001-0000-0000-0000-000000000005'),
('e1000001-0000-0000-0000-000000000006', 'MESOB-006', 'W/ro', 'Selamawit', 'Getachew', 'Hagos', 'Eden Tekle', 'FEMALE', '1990-09-18', 'Ethiopian', 'TIN0006789012', 'PEN006', 'United Bank', '5000678901234', '2020-04-01', 0.00, 'ACTIVE', 'p1000001-0000-0000-0000-000000000005', 'd1000001-0000-0000-0000-000000000006'),
('e1000001-0000-0000-0000-000000000007', 'MESOB-007', 'Ato', 'Berhanu', 'Tadesse', 'Wolde', 'Aster Gebreyesus', 'MALE', '1987-12-25', 'Ethiopian', 'TIN0007890123', 'PEN007', 'Nib International Bank', '6000789012345', '2018-11-10', 1.50, 'ACTIVE', 'p1000001-0000-0000-0000-000000000004', 'd1000001-0000-0000-0000-000000000007'),
('e1000001-0000-0000-0000-000000000008', 'MESOB-008', 'W/t', 'Helen', 'Abera', 'Desta', 'Tizita Alemu', 'FEMALE', '1992-06-05', 'Ethiopian', 'TIN0008901234', 'PEN008', 'Cooperative Bank of Oromia', '7000890123456', '2021-02-15', 0.00, 'ACTIVE', 'p1000001-0000-0000-0000-000000000005', 'd1000001-0000-0000-0000-000000000008'),
('e1000001-0000-0000-0000-000000000009', 'MESOB-009', 'Ato', 'Mulugeta', 'Worku', 'Kebede', 'Senait Haile', 'MALE', '1983-04-12', 'Ethiopian', 'TIN0009012345', 'PEN009', 'Wegagen Bank', '8000901234567', '2017-08-20', 2.50, 'ACTIVE', 'p1000001-0000-0000-0000-000000000003', 'd1000001-0000-0000-0000-000000000009'),
('e1000001-0000-0000-0000-000000000010', 'MESOB-010', 'W/ro', 'Birtukan', 'Negash', 'Fikre', 'Azeb Tefera', 'FEMALE', '1986-10-28', 'Ethiopian', 'TIN0010123456', 'PEN010', 'Zemen Bank', '9000012345678', '2019-05-01', 1.00, 'ACTIVE', 'p1000001-0000-0000-0000-000000000004', 'd1000001-0000-0000-0000-000000000010');

-- Employee Addresses
INSERT INTO EmployeeAddresses (uuid, employee_uuid, address_type, region, zone, woreda, kebele, house_number, phone_primary, email) VALUES
(UUID(), 'e1000001-0000-0000-0000-000000000001', 'CURRENT', 'Addis Ababa', 'Addis Ketema', 'Woreda 01', 'Kebele 05', 'H-123', '+251911234567', 'abebe.tadesse@mesob.gov.et'),
(UUID(), 'e1000001-0000-0000-0000-000000000002', 'CURRENT', 'Addis Ababa', 'Bole', 'Woreda 03', 'Kebele 12', 'H-456', '+251922345678', 'tigist.bekele@mesob.gov.et'),
(UUID(), 'e1000001-0000-0000-0000-000000000003', 'CURRENT', 'Addis Ababa', 'Kirkos', 'Woreda 02', 'Kebele 08', 'H-789', '+251933456789', 'dawit.girma@mesob.gov.et'),
(UUID(), 'e1000001-0000-0000-0000-000000000004', 'CURRENT', 'Addis Ababa', 'Yeka', 'Woreda 05', 'Kebele 15', 'H-234', '+251944567890', 'marta.mulugeta@mesob.gov.et'),
(UUID(), 'e1000001-0000-0000-0000-000000000005', 'CURRENT', 'Addis Ababa', 'Arada', 'Woreda 04', 'Kebele 10', 'H-567', '+251955678901', 'yohannes.solomon@mesob.gov.et'),
(UUID(), 'e1000001-0000-0000-0000-000000000006', 'CURRENT', 'Addis Ababa', 'Nifas Silk-Lafto', 'Woreda 06', 'Kebele 18', 'H-890', '+251966789012', 'selamawit.hagos@mesob.gov.et'),
(UUID(), 'e1000001-0000-0000-0000-000000000007', 'CURRENT', 'Addis Ababa', 'Kolfe Keranio', 'Woreda 07', 'Kebele 20', 'H-345', '+251977890123', 'berhanu.wolde@mesob.gov.et'),
(UUID(), 'e1000001-0000-0000-0000-000000000008', 'CURRENT', 'Addis Ababa', 'Gulele', 'Woreda 08', 'Kebele 22', 'H-678', '+251988901234', 'helen.desta@mesob.gov.et'),
(UUID(), 'e1000001-0000-0000-0000-000000000009', 'CURRENT', 'Addis Ababa', 'Lideta', 'Woreda 09', 'Kebele 25', 'H-901', '+251999012345', 'mulugeta.kebede@mesob.gov.et'),
(UUID(), 'e1000001-0000-0000-0000-000000000010', 'CURRENT', 'Addis Ababa', 'Akaky Kaliti', 'Woreda 10', 'Kebele 28', 'H-012', '+251900123456', 'birtukan.fikre@mesob.gov.et');

-- Employee Level History
INSERT INTO EmployeeLevelHistory (uuid, employee_uuid, level_uuid, level_version_uuid, effective_from, effective_to) VALUES
(UUID(), 'e1000001-0000-0000-0000-000000000001', 'l1000001-0000-0000-0000-000000000001', 'lv100001-0000-0000-0000-000000000001', '2015-01-10', NULL),
(UUID(), 'e1000001-0000-0000-0000-000000000002', 'l1000001-0000-0000-0000-000000000002', 'lv100001-0000-0000-0000-000000000002', '2016-03-15', NULL),
(UUID(), 'e1000001-0000-0000-0000-000000000003', 'l1000001-0000-0000-0000-000000000003', 'lv100001-0000-0000-0000-000000000003', '2017-06-20', NULL),
(UUID(), 'e1000001-0000-0000-0000-000000000004', 'l1000001-0000-0000-0000-000000000004', 'lv100001-0000-0000-0000-000000000004', '2018-09-01', NULL),
(UUID(), 'e1000001-0000-0000-0000-000000000005', 'l1000001-0000-0000-0000-000000000005', 'lv100001-0000-0000-0000-000000000005', '2019-01-15', NULL),
(UUID(), 'e1000001-0000-0000-0000-000000000006', 'l1000001-0000-0000-0000-000000000005', 'lv100001-0000-0000-0000-000000000005', '2020-04-01', NULL),
(UUID(), 'e1000001-0000-0000-0000-000000000007', 'l1000001-0000-0000-0000-000000000004', 'lv100001-0000-0000-0000-000000000004', '2018-11-10', NULL),
(UUID(), 'e1000001-0000-0000-0000-000000000008', 'l1000001-0000-0000-0000-000000000005', 'lv100001-0000-0000-0000-000000000005', '2021-02-15', NULL),
(UUID(), 'e1000001-0000-0000-0000-000000000009', 'l1000001-0000-0000-0000-000000000003', 'lv100001-0000-0000-0000-000000000003', '2017-08-20', NULL),
(UUID(), 'e1000001-0000-0000-0000-000000000010', 'l1000001-0000-0000-0000-000000000004', 'lv100001-0000-0000-0000-000000000004', '2019-05-01', NULL);

-- Employee Shifts
INSERT INTO EmployeeShifts (uuid, employee_uuid, shift_uuid, effective_from, effective_to) VALUES
(UUID(), 'e1000001-0000-0000-0000-000000000001', 's1000001-0000-0000-0000-000000000002', '2015-01-10', NULL),
(UUID(), 'e1000001-0000-0000-0000-000000000002', 's1000001-0000-0000-0000-000000000001', '2016-03-15', NULL),
(UUID(), 'e1000001-0000-0000-0000-000000000003', 's1000001-0000-0000-0000-000000000001', '2017-06-20', NULL),
(UUID(), 'e1000001-0000-0000-0000-000000000004', 's1000001-0000-0000-0000-000000000001', '2018-09-01', NULL),
(UUID(), 'e1000001-0000-0000-0000-000000000005', 's1000001-0000-0000-0000-000000000001', '2019-01-15', NULL),
(UUID(), 'e1000001-0000-0000-0000-000000000006', 's1000001-0000-0000-0000-000000000001', '2020-04-01', NULL),
(UUID(), 'e1000001-0000-0000-0000-000000000007', 's1000001-0000-0000-0000-000000000001', '2018-11-10', NULL),
(UUID(), 'e1000001-0000-0000-0000-000000000008', 's1000001-0000-0000-0000-000000000001', '2021-02-15', NULL),
(UUID(), 'e1000001-0000-0000-0000-000000000009', 's1000001-0000-0000-0000-000000000001', '2017-08-20', NULL),
(UUID(), 'e1000001-0000-0000-0000-000000000010', 's1000001-0000-0000-0000-000000000001', '2019-05-01', NULL);

-- ============================================================================
-- Sample Users with Static Role Assignments
-- ============================================================================
-- Password for all users: mesob2024 (bcrypt hash)

INSERT INTO Users (uuid, employee_uuid, user_type, username, password_hash, role_uuid, is_active) VALUES
('u1000001-0000-0000-0000-000000000001', 'e1000001-0000-0000-0000-000000000001', 'EMPLOYEE', 'abebe.tadesse', '$2b$10$vI8aWBnW3fID.Zj7.lfIlOJ.1vLoOYsNjzQyX.NjqiIy/1F7L8YxC', (SELECT uuid FROM Roles WHERE code = 'SUPER_ADMIN'), 1),
('u1000001-0000-0000-0000-000000000002', 'e1000001-0000-0000-0000-000000000002', 'EMPLOYEE', 'tigist.bekele', '$2b$10$vI8aWBnW3fID.Zj7.lfIlOJ.1vLoOYsNjzQyX.NjqiIy/1F7L8YxC', (SELECT uuid FROM Roles WHERE code = 'HR_ADMIN'), 1),
('u1000001-0000-0000-0000-000000000003', 'e1000001-0000-0000-0000-000000000003', 'EMPLOYEE', 'dawit.girma', '$2b$10$vI8aWBnW3fID.Zj7.lfIlOJ.1vLoOYsNjzQyX.NjqiIy/1F7L8YxC', (SELECT uuid FROM Roles WHERE code = 'DEPARTMENT_HEAD'), 1),
('u1000001-0000-0000-0000-000000000004', 'e1000001-0000-0000-0000-000000000004', 'EMPLOYEE', 'marta.mulugeta', '$2b$10$vI8aWBnW3fID.Zj7.lfIlOJ.1vLoOYsNjzQyX.NjqiIy/1F7L8YxC', (SELECT uuid FROM Roles WHERE code = 'HR_OFFICER'), 1),
('u1000001-0000-0000-0000-000000000005', 'e1000001-0000-0000-0000-000000000005', 'EMPLOYEE', 'yohannes.solomon', '$2b$10$vI8aWBnW3fID.Zj7.lfIlOJ.1vLoOYsNjzQyX.NjqiIy/1F7L8YxC', (SELECT uuid FROM Roles WHERE code = 'EMPLOYEE'), 1),
('u1000001-0000-0000-0000-000000000006', 'e1000001-0000-0000-0000-000000000006', 'EMPLOYEE', 'selamawit.hagos', '$2b$10$vI8aWBnW3fID.Zj7.lfIlOJ.1vLoOYsNjzQyX.NjqiIy/1F7L8YxC', (SELECT uuid FROM Roles WHERE code = 'EMPLOYEE'), 1),
('u1000001-0000-0000-0000-000000000007', 'e1000001-0000-0000-0000-000000000007', 'EMPLOYEE', 'berhanu.wolde', '$2b$10$vI8aWBnW3fID.Zj7.lfIlOJ.1vLoOYsNjzQyX.NjqiIy/1F7L8YxC', (SELECT uuid FROM Roles WHERE code = 'HR_OFFICER'), 1),
('u1000001-0000-0000-0000-000000000008', 'e1000001-0000-0000-0000-000000000008', 'EMPLOYEE', 'helen.desta', '$2b$10$vI8aWBnW3fID.Zj7.lfIlOJ.1vLoOYsNjzQyX.NjqiIy/1F7L8YxC', (SELECT uuid FROM Roles WHERE code = 'EMPLOYEE'), 1),
('u1000001-0000-0000-0000-000000000009', 'e1000001-0000-0000-0000-000000000009', 'EMPLOYEE', 'mulugeta.kebede', '$2b$10$vI8aWBnW3fID.Zj7.lfIlOJ.1vLoOYsNjzQyX.NjqiIy/1F7L8YxC', (SELECT uuid FROM Roles WHERE code = 'DEPARTMENT_HEAD'), 1),
('u1000001-0000-0000-0000-000000000010', 'e1000001-0000-0000-0000-000000000010', 'EMPLOYEE', 'birtukan.fikre', '$2b$10$vI8aWBnW3fID.Zj7.lfIlOJ.1vLoOYsNjzQyX.NjqiIy/1F7L8YxC', (SELECT uuid FROM Roles WHERE code = 'HR_OFFICER'), 1);

SET FOREIGN_KEY_CHECKS=1;

-- ============================================================================
-- Verification Queries
-- ============================================================================

SELECT '✓ Seed data loaded successfully!' AS Status;

SELECT 'Data Summary:' AS Info;
SELECT 'Modules' AS Type, COUNT(*) AS Count FROM Modules
UNION ALL SELECT 'Scopes', COUNT(*) FROM Scopes
UNION ALL SELECT 'Roles', COUNT(*) FROM Roles
UNION ALL SELECT 'Role-Module Assignments', COUNT(*) FROM RoleModules
UNION ALL SELECT 'Departments', COUNT(*) FROM Departments
UNION ALL SELECT 'Positions', COUNT(*) FROM Positions
UNION ALL SELECT 'Employees', COUNT(*) FROM Employees
UNION ALL SELECT 'Users', COUNT(*) FROM Users;

SELECT '' AS Separator;
SELECT 'Test User Credentials (Password: mesob2024):' AS Info;
SELECT 
  u.username AS Username,
  r.name AS Role,
  CONCAT(e.first_name, ' ', e.last_name) AS 'Employee Name',
  e.mesob_id AS 'Employee ID'
FROM Users u
JOIN Roles r ON u.role_uuid = r.uuid
JOIN Employees e ON u.employee_uuid = e.uuid
ORDER BY r.hierarchy_level DESC;

