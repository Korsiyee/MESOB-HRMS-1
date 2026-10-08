SET FOREIGN_KEY_CHECKS=0;

DROP TABLE IF EXISTS Modules;
CREATE TABLE Modules (
  uuid VARCHAR(36) NOT NULL,
  code VARCHAR(50) NOT NULL,
  name VARCHAR(100) NOT NULL,
  description TEXT DEFAULT NULL,
  icon VARCHAR(50) DEFAULT NULL,
  display_order INT NOT NULL DEFAULT 0,
  is_active TINYINT(1) NOT NULL DEFAULT 1,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (uuid),
  UNIQUE KEY uk_modules_code (code),
  KEY idx_modules_active (is_active),
  KEY idx_modules_display_order (display_order)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

DROP TABLE IF EXISTS Scopes;
CREATE TABLE Scopes (
  uuid VARCHAR(36) NOT NULL,
  code VARCHAR(50) NOT NULL,
  name VARCHAR(100) NOT NULL,
  description TEXT DEFAULT NULL,
  level INT NOT NULL DEFAULT 0,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (uuid),
  UNIQUE KEY uk_scopes_code (code),
  KEY idx_scopes_level (level)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

DROP TABLE IF EXISTS Roles;
CREATE TABLE Roles (
  uuid VARCHAR(36) NOT NULL,
  code VARCHAR(50) NOT NULL,
  name VARCHAR(100) NOT NULL,
  description TEXT DEFAULT NULL,
  default_scope_uuid VARCHAR(36) DEFAULT NULL,
  hierarchy_level INT NOT NULL DEFAULT 10,
  is_system_role TINYINT(1) NOT NULL DEFAULT 0,
  is_active TINYINT(1) NOT NULL DEFAULT 1,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (uuid),
  UNIQUE KEY uk_roles_code (code),
  KEY idx_roles_active (is_active),
  KEY idx_roles_hierarchy (hierarchy_level),
  KEY fk_roles_scope (default_scope_uuid),
  CONSTRAINT fk_roles_scope FOREIGN KEY (default_scope_uuid) REFERENCES Scopes (uuid) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

DROP TABLE IF EXISTS RoleModules;
CREATE TABLE RoleModules (
  uuid VARCHAR(36) NOT NULL,
  role_uuid VARCHAR(36) NOT NULL,
  module_uuid VARCHAR(36) NOT NULL,
  scope_uuid VARCHAR(36) NOT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (uuid),
  UNIQUE KEY uk_rolemodules_role_module (role_uuid, module_uuid),
  KEY idx_rolemodules_role (role_uuid),
  KEY idx_rolemodules_module (module_uuid),
  KEY idx_rolemodules_scope (scope_uuid),
  CONSTRAINT fk_rolemodules_role FOREIGN KEY (role_uuid) REFERENCES Roles (uuid) ON DELETE CASCADE,
  CONSTRAINT fk_rolemodules_module FOREIGN KEY (module_uuid) REFERENCES Modules (uuid) ON DELETE CASCADE,
  CONSTRAINT fk_rolemodules_scope FOREIGN KEY (scope_uuid) REFERENCES Scopes (uuid) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

DROP TABLE IF EXISTS Departments;
CREATE TABLE Departments (
  uuid VARCHAR(36) NOT NULL,
  dept_code VARCHAR(50) NOT NULL,
  name VARCHAR(200) NOT NULL,
  parent_uuid VARCHAR(36) DEFAULT NULL,
  is_active TINYINT(1) NOT NULL DEFAULT 1,
  head_employee_uuid VARCHAR(36) DEFAULT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (uuid),
  UNIQUE KEY uk_departments_code (dept_code),
  UNIQUE KEY uk_departments_name (name),
  KEY idx_departments_parent (parent_uuid),
  KEY idx_departments_head (head_employee_uuid),
  KEY idx_departments_active (is_active),
  CONSTRAINT fk_departments_parent FOREIGN KEY (parent_uuid) REFERENCES Departments (uuid) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

DROP TABLE IF EXISTS ShiftDefinitions;
CREATE TABLE ShiftDefinitions (
  uuid VARCHAR(36) NOT NULL,
  shift_code VARCHAR(50) NOT NULL,
  name VARCHAR(100) NOT NULL,
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  working_days_json JSON DEFAULT NULL,
  grace_period_minutes INT NOT NULL DEFAULT 15,
  break_duration_minutes INT NOT NULL DEFAULT 0,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (uuid),
  UNIQUE KEY uk_shifts_code (shift_code),
  UNIQUE KEY uk_shifts_name (name)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

DROP TABLE IF EXISTS Positions;
CREATE TABLE Positions (
  uuid VARCHAR(36) NOT NULL,
  position_code VARCHAR(50) NOT NULL,
  title VARCHAR(200) NOT NULL,
  grade VARCHAR(50) DEFAULT NULL,
  occupation_type VARCHAR(100) DEFAULT NULL,
  department_uuid VARCHAR(36) NOT NULL,
  default_shift_uuid VARCHAR(36) DEFAULT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (uuid),
  UNIQUE KEY uk_positions_code (position_code),
  KEY idx_positions_department (department_uuid),
  KEY idx_positions_shift (default_shift_uuid),
  CONSTRAINT fk_positions_department FOREIGN KEY (department_uuid) REFERENCES Departments (uuid) ON DELETE RESTRICT,
  CONSTRAINT fk_positions_shift FOREIGN KEY (default_shift_uuid) REFERENCES ShiftDefinitions (uuid) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

DROP TABLE IF EXISTS DepartmentLeadership;
CREATE TABLE DepartmentLeadership (
  uuid VARCHAR(36) NOT NULL,
  department_uuid VARCHAR(36) NOT NULL,
  employee_uuid VARCHAR(36) NOT NULL,
  effective_from DATE NOT NULL,
  effective_to DATE DEFAULT NULL,
  appointed_by_uuid VARCHAR(36) DEFAULT NULL,
  appointment_reason TEXT DEFAULT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (uuid),
  KEY idx_deptlead_dept (department_uuid),
  KEY idx_deptlead_emp (employee_uuid),
  KEY idx_deptlead_effective (department_uuid, effective_from, effective_to),
  KEY idx_deptlead_current (department_uuid, effective_to),
  CONSTRAINT fk_deptlead_dept FOREIGN KEY (department_uuid) REFERENCES Departments (uuid) ON DELETE CASCADE,
  CONSTRAINT chk_deptlead_dates CHECK (effective_to IS NULL OR effective_to >= effective_from)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

DROP TABLE IF EXISTS Users;
CREATE TABLE Users (
  uuid VARCHAR(36) NOT NULL,
  employee_uuid VARCHAR(36) DEFAULT NULL,
  user_type ENUM('EMPLOYEE','SYSTEM','SERVICE') NOT NULL DEFAULT 'EMPLOYEE',
  username VARCHAR(100) NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  refresh_token TEXT DEFAULT NULL,
  token_version INT NOT NULL DEFAULT 0,
  permissions_version INT NOT NULL DEFAULT 1,
  role_uuid VARCHAR(36) NOT NULL,
  is_active TINYINT(1) NOT NULL DEFAULT 1,
  must_change_password TINYINT(1) NOT NULL DEFAULT 0,
  last_login DATETIME DEFAULT NULL,
  last_activity DATETIME DEFAULT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (uuid),
  UNIQUE KEY uk_users_username (username),
  KEY idx_users_employee (employee_uuid),
  KEY idx_users_role (role_uuid),
  KEY idx_users_active (is_active),
  KEY idx_users_permissions_version (permissions_version),
  CONSTRAINT fk_users_role FOREIGN KEY (role_uuid) REFERENCES Roles (uuid) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

DROP TABLE IF EXISTS Employees;
CREATE TABLE Employees (
  uuid VARCHAR(36) NOT NULL,
  mesob_id VARCHAR(20) DEFAULT NULL,
  title ENUM('Mr','Mrs','Ms','Dr','Prof','Ato','W/ro','W/t') DEFAULT NULL,
  first_name VARCHAR(100) NOT NULL,
  middle_name VARCHAR(100) NOT NULL,
  last_name VARCHAR(100) NOT NULL,
  mother_name VARCHAR(100) NOT NULL,
  gender ENUM('MALE','FEMALE') NOT NULL,
  date_of_birth DATE NOT NULL,
  nationality VARCHAR(100) NOT NULL DEFAULT 'Ethiopian',
  profile_photo_key VARCHAR(500) DEFAULT NULL,
  tin_number VARCHAR(50) DEFAULT NULL,
  pension_code VARCHAR(50) DEFAULT NULL,
  bank_name VARCHAR(200) DEFAULT NULL,
  bank_account_number VARCHAR(100) DEFAULT NULL,
  hire_date DATE NOT NULL,
  prior_gov_service_years DECIMAL(5,2) NOT NULL DEFAULT 0.00,
  status ENUM('ACTIVE','INACTIVE','TERMINATED') NOT NULL DEFAULT 'ACTIVE',
  attendance_exempt TINYINT(1) NOT NULL DEFAULT 0,
  face_images_registered TINYINT(1) NOT NULL DEFAULT 0,
  position_uuid VARCHAR(36) NOT NULL,
  department_uuid VARCHAR(36) DEFAULT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (uuid),
  UNIQUE KEY uk_employees_mesob_id (mesob_id),
  KEY idx_employees_name (last_name, first_name),
  KEY idx_employees_position (position_uuid),
  KEY idx_employees_department (department_uuid),
  KEY idx_employees_status (status),
  KEY idx_employees_tin (tin_number),
  KEY idx_employees_hire_date (hire_date),
  CONSTRAINT fk_employees_position FOREIGN KEY (position_uuid) REFERENCES Positions (uuid) ON DELETE RESTRICT,
  CONSTRAINT fk_employees_department FOREIGN KEY (department_uuid) REFERENCES Departments (uuid) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

ALTER TABLE Users ADD CONSTRAINT fk_users_employee FOREIGN KEY (employee_uuid) REFERENCES Employees (uuid) ON DELETE CASCADE;
ALTER TABLE Departments ADD CONSTRAINT fk_departments_head FOREIGN KEY (head_employee_uuid) REFERENCES Employees (uuid) ON DELETE SET NULL;
ALTER TABLE DepartmentLeadership ADD CONSTRAINT fk_deptlead_emp FOREIGN KEY (employee_uuid) REFERENCES Employees (uuid) ON DELETE CASCADE;

DROP TABLE IF EXISTS EmployeeAddresses;
CREATE TABLE EmployeeAddresses (
  uuid VARCHAR(36) NOT NULL,
  employee_uuid VARCHAR(36) NOT NULL,
  address_type ENUM('PERMANENT','CURRENT') NOT NULL,
  region VARCHAR(100) DEFAULT NULL,
  zone VARCHAR(100) DEFAULT NULL,
  woreda VARCHAR(100) DEFAULT NULL,
  kebele VARCHAR(100) DEFAULT NULL,
  house_number VARCHAR(50) DEFAULT NULL,
  phone_primary VARCHAR(20) DEFAULT NULL,
  phone_secondary VARCHAR(20) DEFAULT NULL,
  email VARCHAR(200) DEFAULT NULL,
  PRIMARY KEY (uuid),
  KEY idx_empaddr_employee (employee_uuid),
  KEY idx_empaddr_type (employee_uuid, address_type),
  CONSTRAINT fk_empaddr_employee FOREIGN KEY (employee_uuid) REFERENCES Employees (uuid) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

DROP TABLE IF EXISTS EmployeeIDDocuments;
CREATE TABLE EmployeeIDDocuments (
  uuid VARCHAR(36) NOT NULL,
  employee_uuid VARCHAR(36) NOT NULL,
  doc_type VARCHAR(100) NOT NULL,
  id_number VARCHAR(100) NOT NULL,
  issue_date DATE DEFAULT NULL,
  valid_until DATE DEFAULT NULL,
  file_key VARCHAR(500) DEFAULT NULL,
  original_name VARCHAR(255) DEFAULT NULL,
  mime_type VARCHAR(120) DEFAULT NULL,
  file_size BIGINT DEFAULT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (uuid),
  KEY idx_empiddocs_employee (employee_uuid),
  KEY idx_empiddocs_type (employee_uuid, doc_type),
  CONSTRAINT fk_empiddocs_employee FOREIGN KEY (employee_uuid) REFERENCES Employees (uuid) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

DROP TABLE IF EXISTS EmployeeFaceImages;
CREATE TABLE EmployeeFaceImages (
  uuid VARCHAR(36) NOT NULL,
  employee_uuid VARCHAR(36) NOT NULL,
  image_key VARCHAR(500) NOT NULL,
  image_number INT NOT NULL,
  descriptor_json JSON DEFAULT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (uuid),
  UNIQUE KEY uk_empface_emp_num (employee_uuid, image_number),
  KEY idx_empface_employee (employee_uuid),
  CONSTRAINT fk_empface_employee FOREIGN KEY (employee_uuid) REFERENCES Employees (uuid) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

DROP TABLE IF EXISTS EmployeeShifts;
CREATE TABLE EmployeeShifts (
  uuid VARCHAR(36) NOT NULL,
  employee_uuid VARCHAR(36) NOT NULL,
  shift_uuid VARCHAR(36) NOT NULL,
  effective_from DATE NOT NULL,
  effective_to DATE DEFAULT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (uuid),
  KEY idx_empshift_employee (employee_uuid),
  KEY idx_empshift_shift (shift_uuid),
  KEY idx_empshift_dates (employee_uuid, effective_from, effective_to),
  CONSTRAINT fk_empshift_employee FOREIGN KEY (employee_uuid) REFERENCES Employees (uuid) ON DELETE CASCADE,
  CONSTRAINT fk_empshift_shift FOREIGN KEY (shift_uuid) REFERENCES ShiftDefinitions (uuid) ON DELETE RESTRICT,
  CONSTRAINT chk_empshift_dates CHECK (effective_to IS NULL OR effective_to >= effective_from)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

DROP TABLE IF EXISTS EmployeeRegistrationDrafts;
CREATE TABLE EmployeeRegistrationDrafts (
  uuid VARCHAR(36) NOT NULL,
  step_completed INT NOT NULL DEFAULT 0,
  draft_json JSON NOT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (uuid)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

DROP TABLE IF EXISTS Levels;
CREATE TABLE Levels (
  uuid VARCHAR(36) NOT NULL,
  level_code VARCHAR(50) NOT NULL,
  name VARCHAR(200) NOT NULL,
  description TEXT DEFAULT NULL,
  sort_order INT NOT NULL DEFAULT 0,
  is_active TINYINT(1) NOT NULL DEFAULT 1,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (uuid),
  UNIQUE KEY uk_levels_code (level_code),
  KEY idx_levels_sort (sort_order),
  KEY idx_levels_active (is_active)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

DROP TABLE IF EXISTS LevelVersions;
CREATE TABLE LevelVersions (
  uuid VARCHAR(36) NOT NULL,
  level_uuid VARCHAR(36) NOT NULL,
  base_salary DECIMAL(10,2) NOT NULL,
  allowances_json JSON DEFAULT NULL,
  effective_from DATE NOT NULL,
  effective_to DATE DEFAULT NULL,
  version_number INT NOT NULL,
  notes TEXT DEFAULT NULL,
  created_by_uuid VARCHAR(36) DEFAULT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (uuid),
  UNIQUE KEY uk_levelver_level_version (level_uuid, version_number),
  KEY idx_levelver_level (level_uuid),
  KEY idx_levelver_dates (level_uuid, effective_from, effective_to),
  CONSTRAINT fk_levelver_level FOREIGN KEY (level_uuid) REFERENCES Levels (uuid) ON DELETE CASCADE,
  CONSTRAINT chk_levelver_dates CHECK (effective_to IS NULL OR effective_to >= effective_from)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

DROP TABLE IF EXISTS EmployeeLevelHistory;
CREATE TABLE EmployeeLevelHistory (
  uuid VARCHAR(36) NOT NULL,
  employee_uuid VARCHAR(36) NOT NULL,
  level_uuid VARCHAR(36) NOT NULL,
  level_version_uuid VARCHAR(36) NOT NULL,
  effective_from DATE NOT NULL,
  effective_to DATE DEFAULT NULL,
  changed_by_uuid VARCHAR(36) DEFAULT NULL,
  reason TEXT DEFAULT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (uuid),
  KEY idx_emplevel_employee (employee_uuid),
  KEY idx_emplevel_level (level_uuid),
  KEY idx_emplevel_dates (employee_uuid, effective_from, effective_to),
  KEY idx_emplevel_version (level_version_uuid),
  CONSTRAINT fk_emplevel_employee FOREIGN KEY (employee_uuid) REFERENCES Employees (uuid) ON DELETE CASCADE,
  CONSTRAINT fk_emplevel_level FOREIGN KEY (level_uuid) REFERENCES Levels (uuid) ON DELETE RESTRICT,
  CONSTRAINT fk_emplevel_version FOREIGN KEY (level_version_uuid) REFERENCES LevelVersions (uuid) ON DELETE RESTRICT,
  CONSTRAINT chk_emplevel_dates CHECK (effective_to IS NULL OR effective_to >= effective_from)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

DROP TABLE IF EXISTS Holidays;
CREATE TABLE Holidays (
  uuid VARCHAR(36) NOT NULL,
  holiday_date DATE NOT NULL,
  holiday_name VARCHAR(200) NOT NULL,
  calendar_year INT NOT NULL,
  calendar_type ENUM('GREGORIAN','ETHIOPIAN') NOT NULL DEFAULT 'ETHIOPIAN',
  is_active TINYINT(1) NOT NULL DEFAULT 1,
  source VARCHAR(100) DEFAULT NULL,
  description TEXT DEFAULT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (uuid),
  UNIQUE KEY uk_holidays_date (holiday_date),
  KEY idx_holidays_year (calendar_year),
  KEY idx_holidays_active (is_active)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

DROP TABLE IF EXISTS AttendanceLogs;
CREATE TABLE AttendanceLogs (
  uuid VARCHAR(36) NOT NULL,
  employee_uuid VARCHAR(36) NOT NULL,
  date DATE NOT NULL,
  check_in DATETIME DEFAULT NULL,
  check_out DATETIME DEFAULT NULL,
  state ENUM('PENDING','COMPLETED','CORRECTED') NOT NULL DEFAULT 'PENDING',
  source ENUM('SELF','FACE','ADMIN','SYSTEM') NOT NULL DEFAULT 'ADMIN',
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (uuid),
  UNIQUE KEY uk_attlog_emp_date (employee_uuid, date),
  KEY idx_attlog_employee (employee_uuid),
  KEY idx_attlog_date (date),
  KEY idx_attlog_state (state),
  CONSTRAINT fk_attlog_employee FOREIGN KEY (employee_uuid) REFERENCES Employees (uuid) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

DROP TABLE IF EXISTS AttendanceSummary;
CREATE TABLE AttendanceSummary (
  uuid VARCHAR(36) NOT NULL,
  employee_uuid VARCHAR(36) NOT NULL,
  date DATE NOT NULL,
  status ENUM('PRESENT','ABSENT','LATE','LEAVE','HOLIDAY','WEEKEND','EXEMPT') NOT NULL,
  shift_uuid VARCHAR(36) DEFAULT NULL,
  shift_name_snapshot VARCHAR(100) DEFAULT NULL,
  shift_start_time_snapshot TIME DEFAULT NULL,
  shift_end_time_snapshot TIME DEFAULT NULL,
  leave_request_uuid VARCHAR(36) DEFAULT NULL,
  worked_hours DECIMAL(5,2) DEFAULT 0.00,
  overtime_hours DECIMAL(5,2) DEFAULT 0.00,
  missing_hours DECIMAL(5,2) DEFAULT 0.00,
  late_minutes INT DEFAULT 0,
  break_duration_minutes INT DEFAULT 0,
  corrected_by_uuid VARCHAR(36) DEFAULT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (uuid),
  UNIQUE KEY uk_attsum_emp_date (employee_uuid, date),
  KEY idx_attsum_employee (employee_uuid),
  KEY idx_attsum_date (date),
  KEY idx_attsum_status (status),
  KEY idx_attsum_shift (shift_uuid),
  CONSTRAINT fk_attsum_employee FOREIGN KEY (employee_uuid) REFERENCES Employees (uuid) ON DELETE CASCADE,
  CONSTRAINT fk_attsum_shift FOREIGN KEY (shift_uuid) REFERENCES ShiftDefinitions (uuid) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

DROP TABLE IF EXISTS NetworkSettings;
CREATE TABLE NetworkSettings (
  uuid VARCHAR(36) NOT NULL,
  ip_address VARCHAR(45) NOT NULL,
  subnet_mask VARCHAR(45) DEFAULT NULL,
  location_name VARCHAR(200) DEFAULT NULL,
  is_active TINYINT(1) NOT NULL DEFAULT 1,
  created_by_uuid VARCHAR(36) DEFAULT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (uuid),
  UNIQUE KEY uk_netset_ip (ip_address),
  KEY idx_netset_active (is_active)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

DROP TABLE IF EXISTS leaveTypes;
CREATE TABLE leaveTypes (
  uuid VARCHAR(36) NOT NULL,
  code VARCHAR(50) NOT NULL,
  name VARCHAR(200) NOT NULL,
  description TEXT DEFAULT NULL,
  requires_documentation TINYINT(1) NOT NULL DEFAULT 0,
  is_active TINYINT(1) NOT NULL DEFAULT 1,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (uuid),
  UNIQUE KEY uk_leavetypes_code (code),
  KEY idx_leavetypes_active (is_active)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

DROP TABLE IF EXISTS leavePolicies;
CREATE TABLE leavePolicies (
  uuid VARCHAR(36) NOT NULL,
  leaveType VARCHAR(50) NOT NULL,
  baseDays INT NOT NULL,
  incrementPerYear DECIMAL(5,2) NOT NULL DEFAULT 0.00,
  maxDays INT NOT NULL,
  eligibilityMonths INT NOT NULL DEFAULT 0,
  useBudgetYear TINYINT(1) NOT NULL DEFAULT 1,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (uuid),
  UNIQUE KEY uk_leavepol_type (leaveType)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

DROP TABLE IF EXISTS budgetYears;
CREATE TABLE budgetYears (
  uuid VARCHAR(36) NOT NULL,
  year INT NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  status ENUM('PLANNING','ACTIVE','CLOSED') NOT NULL DEFAULT 'PLANNING',
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (uuid),
  UNIQUE KEY uk_budgetyear_year (year),
  KEY idx_budgetyear_status (status),
  KEY idx_budgetyear_dates (start_date, end_date)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

DROP TABLE IF EXISTS employeeLeaveBalances;
CREATE TABLE employeeLeaveBalances (
  uuid VARCHAR(36) NOT NULL,
  employee_uuid VARCHAR(36) NOT NULL,
  budgetYear INT NOT NULL,
  leaveType VARCHAR(50) NOT NULL,
  entitledDays DECIMAL(5,2) NOT NULL DEFAULT 0.00,
  carriedForwardDays DECIMAL(5,2) NOT NULL DEFAULT 0.00,
  usedDays DECIMAL(5,2) NOT NULL DEFAULT 0.00,
  remainingDays DECIMAL(5,2) NOT NULL DEFAULT 0.00,
  status ENUM('ACTIVE','CLOSED') NOT NULL DEFAULT 'ACTIVE',
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (uuid),
  UNIQUE KEY uk_empbal_emp_year_type (employee_uuid, budgetYear, leaveType),
  KEY idx_empbal_employee (employee_uuid),
  KEY idx_empbal_year (budgetYear),
  KEY idx_empbal_type (leaveType),
  KEY idx_empbal_status (status),
  CONSTRAINT fk_empbal_employee FOREIGN KEY (employee_uuid) REFERENCES Employees (uuid) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

DROP TABLE IF EXISTS leavePostponements;
CREATE TABLE leavePostponements (
  uuid VARCHAR(36) NOT NULL,
  employee_uuid VARCHAR(36) NOT NULL,
  leave_balance_uuid VARCHAR(36) NOT NULL,
  postponed_days DECIMAL(5,2) NOT NULL,
  reason TEXT DEFAULT NULL,
  status ENUM('PENDING','APPROVED','REJECTED') NOT NULL DEFAULT 'PENDING',
  approved_by_uuid VARCHAR(36) DEFAULT NULL,
  approved_at DATETIME DEFAULT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (uuid),
  KEY idx_leavepost_employee (employee_uuid),
  KEY idx_leavepost_balance (leave_balance_uuid),
  KEY idx_leavepost_status (status),
  CONSTRAINT fk_leavepost_employee FOREIGN KEY (employee_uuid) REFERENCES Employees (uuid) ON DELETE CASCADE,
  CONSTRAINT fk_leavepost_balance FOREIGN KEY (leave_balance_uuid) REFERENCES employeeLeaveBalances (uuid) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

DROP TABLE IF EXISTS leaveRequests;
CREATE TABLE leaveRequests (
  uuid VARCHAR(36) NOT NULL,
  employee_uuid VARCHAR(36) NOT NULL,
  leaveType VARCHAR(50) NOT NULL,
  startDate DATE NOT NULL,
  endDate DATE NOT NULL,
  totalDays DECIMAL(5,2) NOT NULL,
  dayPattern ENUM('FULL','CUSTOM') NOT NULL DEFAULT 'FULL',
  dailyPlan JSON DEFAULT NULL,
  reason TEXT NOT NULL,
  rejectionReason TEXT DEFAULT NULL,
  status ENUM('DRAFT','PENDING_DEPARTMENT','PENDING_HR','APPROVED','REJECTED','CANCELLED') NOT NULL DEFAULT 'DRAFT',
  department_head_id VARCHAR(36) DEFAULT NULL,
  department_approved_at DATETIME DEFAULT NULL,
  hr_supervisor_id VARCHAR(36) DEFAULT NULL,
  hr_approved_at DATETIME DEFAULT NULL,
  cancelled_at DATETIME DEFAULT NULL,
  cancelled_by_uuid VARCHAR(36) DEFAULT NULL,
  original_end_date DATE DEFAULT NULL,
  actual_return_date DATE DEFAULT NULL,
  is_shortened TINYINT(1) NOT NULL DEFAULT 0,
  shortened_at DATETIME DEFAULT NULL,
  shortened_by_uuid VARCHAR(36) DEFAULT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (uuid),
  KEY idx_leavereq_employee (employee_uuid),
  KEY idx_leavereq_type (leaveType),
  KEY idx_leavereq_status (status),
  KEY idx_leavereq_dates (startDate, endDate),
  KEY idx_leavereq_dephead (department_head_id),
  KEY idx_leavereq_hr (hr_supervisor_id),
  CONSTRAINT fk_leavereq_employee FOREIGN KEY (employee_uuid) REFERENCES Employees (uuid) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

DROP TABLE IF EXISTS leaveRequestDocuments;
CREATE TABLE leaveRequestDocuments (
  uuid VARCHAR(36) NOT NULL,
  leaveRequestUuid VARCHAR(36) NOT NULL,
  employee_uuid VARCHAR(36) NOT NULL,
  originalName VARCHAR(255) NOT NULL,
  objectKey VARCHAR(500) NOT NULL,
  mimeType VARCHAR(120) NOT NULL,
  sizeBytes BIGINT NOT NULL,
  createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (uuid),
  KEY idx_leavereqdoc_request (leaveRequestUuid),
  KEY idx_leavereqdoc_employee (employee_uuid),
  CONSTRAINT fk_leavereqdoc_request FOREIGN KEY (leaveRequestUuid) REFERENCES leaveRequests (uuid) ON DELETE CASCADE,
  CONSTRAINT fk_leavereqdoc_employee FOREIGN KEY (employee_uuid) REFERENCES Employees (uuid) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

DROP TABLE IF EXISTS LetterLayoutConfig;
CREATE TABLE LetterLayoutConfig (
  uuid VARCHAR(36) NOT NULL,
  layout_name VARCHAR(100) NOT NULL,
  margin_top INT NOT NULL DEFAULT 20,
  margin_bottom INT NOT NULL DEFAULT 20,
  margin_left INT NOT NULL DEFAULT 20,
  margin_right INT NOT NULL DEFAULT 20,
  header_height INT NOT NULL DEFAULT 30,
  footer_height INT NOT NULL DEFAULT 20,
  font_family VARCHAR(100) NOT NULL DEFAULT 'Arial',
  font_size INT NOT NULL DEFAULT 12,
  is_active TINYINT(1) NOT NULL DEFAULT 1,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (uuid),
  UNIQUE KEY uk_letterlayout_name (layout_name),
  KEY idx_letterlayout_active (is_active)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

DROP TABLE IF EXISTS LetterTemplates;
CREATE TABLE LetterTemplates (
  uuid VARCHAR(36) NOT NULL,
  template_code VARCHAR(50) NOT NULL,
  template_name VARCHAR(200) NOT NULL,
  letter_type VARCHAR(100) NOT NULL,
  subject_template TEXT NOT NULL,
  body_template TEXT NOT NULL,
  footer_template TEXT DEFAULT NULL,
  required_fields_json JSON DEFAULT NULL,
  available_variables_json JSON DEFAULT NULL,
  requires_approval TINYINT(1) NOT NULL DEFAULT 0,
  approval_levels INT NOT NULL DEFAULT 0,
  is_active TINYINT(1) NOT NULL DEFAULT 1,
  layout_config_uuid VARCHAR(36) DEFAULT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (uuid),
  UNIQUE KEY uk_lettertempl_code (template_code),
  KEY idx_lettertempl_type (letter_type),
  KEY idx_lettertempl_active (is_active),
  KEY idx_lettertempl_layout (layout_config_uuid),
  CONSTRAINT fk_lettertempl_layout FOREIGN KEY (layout_config_uuid) REFERENCES LetterLayoutConfig (uuid) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

DROP TABLE IF EXISTS LetterRequests;
CREATE TABLE LetterRequests (
  uuid VARCHAR(36) NOT NULL,
  employee_uuid VARCHAR(36) NOT NULL,
  template_uuid VARCHAR(36) NOT NULL,
  letter_type VARCHAR(100) NOT NULL,
  subject TEXT NOT NULL,
  body_content TEXT NOT NULL,
  footer_content TEXT DEFAULT NULL,
  request_reason TEXT DEFAULT NULL,
  status ENUM('PENDING','APPROVED','REJECTED','ISSUED') NOT NULL DEFAULT 'PENDING',
  current_approval_level INT NOT NULL DEFAULT 0,
  requested_by_uuid VARCHAR(36) NOT NULL,
  requested_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  final_approved_by_uuid VARCHAR(36) DEFAULT NULL,
  final_approved_at DATETIME DEFAULT NULL,
  rejected_by_uuid VARCHAR(36) DEFAULT NULL,
  rejected_at DATETIME DEFAULT NULL,
  rejection_reason TEXT DEFAULT NULL,
  issued_letter_uuid VARCHAR(36) DEFAULT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (uuid),
  KEY idx_letterreq_employee (employee_uuid),
  KEY idx_letterreq_template (template_uuid),
  KEY idx_letterreq_status (status),
  KEY idx_letterreq_requested_by (requested_by_uuid),
  CONSTRAINT fk_letterreq_employee FOREIGN KEY (employee_uuid) REFERENCES Employees (uuid) ON DELETE CASCADE,
  CONSTRAINT fk_letterreq_template FOREIGN KEY (template_uuid) REFERENCES LetterTemplates (uuid) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

DROP TABLE IF EXISTS LetterApprovers;
CREATE TABLE LetterApprovers (
  uuid VARCHAR(36) NOT NULL,
  letter_request_uuid VARCHAR(36) NOT NULL,
  approver_user_uuid VARCHAR(36) NOT NULL,
  approval_level INT NOT NULL,
  status ENUM('PENDING','APPROVED','REJECTED') NOT NULL DEFAULT 'PENDING',
  approved_at DATETIME DEFAULT NULL,
  rejection_reason TEXT DEFAULT NULL,
  comments TEXT DEFAULT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (uuid),
  UNIQUE KEY uk_letterappr_req_level (letter_request_uuid, approval_level),
  KEY idx_letterappr_request (letter_request_uuid),
  KEY idx_letterappr_approver (approver_user_uuid),
  KEY idx_letterappr_status (status),
  CONSTRAINT fk_letterappr_request FOREIGN KEY (letter_request_uuid) REFERENCES LetterRequests (uuid) ON DELETE CASCADE,
  CONSTRAINT fk_letterappr_approver FOREIGN KEY (approver_user_uuid) REFERENCES Users (uuid) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

DROP TABLE IF EXISTS LetterSigners;
CREATE TABLE LetterSigners (
  uuid VARCHAR(36) NOT NULL,
  template_uuid VARCHAR(36) NOT NULL,
  signer_name VARCHAR(200) NOT NULL,
  signer_title VARCHAR(200) NOT NULL,
  signature_image_key VARCHAR(500) DEFAULT NULL,
  display_order INT NOT NULL DEFAULT 0,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (uuid),
  KEY idx_lettersign_template (template_uuid),
  KEY idx_lettersign_order (template_uuid, display_order),
  CONSTRAINT fk_lettersign_template FOREIGN KEY (template_uuid) REFERENCES LetterTemplates (uuid) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

DROP TABLE IF EXISTS IssuedLetters;
CREATE TABLE IssuedLetters (
  uuid VARCHAR(36) NOT NULL,
  letter_request_uuid VARCHAR(36) DEFAULT NULL,
  employee_uuid VARCHAR(36) NOT NULL,
  template_uuid VARCHAR(36) NOT NULL,
  letter_number VARCHAR(100) NOT NULL,
  issued_date DATE NOT NULL,
  content_html TEXT NOT NULL,
  file_key VARCHAR(500) NOT NULL,
  file_size BIGINT NOT NULL,
  issued_by_uuid VARCHAR(36) NOT NULL,
  invalidated_at DATETIME DEFAULT NULL,
  invalidation_reason TEXT DEFAULT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (uuid),
  UNIQUE KEY uk_issued_number (letter_number),
  KEY idx_issued_employee (employee_uuid),
  KEY idx_issued_template (template_uuid),
  KEY idx_issued_date (issued_date),
  KEY idx_issued_request (letter_request_uuid),
  CONSTRAINT fk_issued_employee FOREIGN KEY (employee_uuid) REFERENCES Employees (uuid) ON DELETE RESTRICT,
  CONSTRAINT fk_issued_template FOREIGN KEY (template_uuid) REFERENCES LetterTemplates (uuid) ON DELETE RESTRICT,
  CONSTRAINT fk_issued_request FOREIGN KEY (letter_request_uuid) REFERENCES LetterRequests (uuid) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

DROP TABLE IF EXISTS AuditLogs;
CREATE TABLE AuditLogs (
  uuid VARCHAR(36) NOT NULL,
  actor_user_uuid VARCHAR(36) DEFAULT NULL,
  action_type VARCHAR(100) NOT NULL,
  resource_type VARCHAR(100) DEFAULT NULL,
  resource_uuid VARCHAR(36) DEFAULT NULL,
  old_values_json JSON DEFAULT NULL,
  new_values_json JSON DEFAULT NULL,
  ip_address VARCHAR(45) DEFAULT NULL,
  user_agent TEXT DEFAULT NULL,
  reason TEXT DEFAULT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (uuid),
  KEY idx_audit_actor (actor_user_uuid),
  KEY idx_audit_action (action_type),
  KEY idx_audit_resource (resource_type, resource_uuid),
  KEY idx_audit_created (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

DROP TABLE IF EXISTS Notifications;
CREATE TABLE Notifications (
  uuid VARCHAR(36) NOT NULL,
  user_uuid VARCHAR(36) NOT NULL,
  type VARCHAR(100) NOT NULL,
  title VARCHAR(200) NOT NULL,
  message TEXT NOT NULL,
  link_url VARCHAR(500) DEFAULT NULL,
  is_read TINYINT(1) NOT NULL DEFAULT 0,
  read_at DATETIME DEFAULT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (uuid),
  KEY idx_notif_user (user_uuid),
  KEY idx_notif_read (user_uuid, is_read),
  KEY idx_notif_created (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

DROP TABLE IF EXISTS _migrations;
CREATE TABLE _migrations (
  id INT AUTO_INCREMENT,
  migration_name VARCHAR(255) NOT NULL,
  executed_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uk_migrations_name (migration_name)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

DROP TABLE IF EXISTS MesobIdSequence;
CREATE TABLE MesobIdSequence (
  id INT AUTO_INCREMENT,
  last_value INT NOT NULL DEFAULT 0,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

DROP TABLE IF EXISTS LetterReferenceSequence;
CREATE TABLE LetterReferenceSequence (
  id INT AUTO_INCREMENT,
  last_value INT NOT NULL DEFAULT 0,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

DROP TABLE IF EXISTS OrganizationConfig;
CREATE TABLE OrganizationConfig (
  id INT NOT NULL DEFAULT 1,
  organization_name VARCHAR(200) NOT NULL,
  organization_name_amharic VARCHAR(200) DEFAULT NULL,
  logo_key VARCHAR(500) DEFAULT NULL,
  address TEXT DEFAULT NULL,
  phone VARCHAR(50) DEFAULT NULL,
  email VARCHAR(200) DEFAULT NULL,
  website VARCHAR(200) DEFAULT NULL,
  tin_number VARCHAR(50) DEFAULT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  CONSTRAINT chk_orgconfig_singleton CHECK (id = 1)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

SET FOREIGN_KEY_CHECKS=1;

INSERT INTO Modules (uuid, code, name, description, icon, display_order, is_active) VALUES
(UUID(), 'HOME', 'Home', 'Dashboard and overview', 'LayoutDashboard', 0, 1),
(UUID(), 'EMPLOYEES', 'Employees', 'Employee management', 'Users', 10, 1),
(UUID(), 'ORGANIZATION', 'Organization', 'Departments, positions, levels', 'Building2', 20, 1),
(UUID(), 'ATTENDANCE', 'Attendance', 'Attendance tracking and analytics', 'Clock', 30, 1),
(UUID(), 'SHIFTS', 'Shifts', 'Shift definitions and assignments', 'Layers', 40, 1),
(UUID(), 'LETTERS', 'Letters', 'Letter generation and templates', 'FileText', 50, 1),
(UUID(), 'LEAVE', 'Leave', 'Leave requests and management', 'CalendarDays', 60, 1),
(UUID(), 'ADMIN', 'Administration', 'System administration', 'Shield', 70, 1);

INSERT INTO Scopes (uuid, code, name, description, level) VALUES
(UUID(), 'ORGANIZATION', 'Organization', 'Access to all data across organization', 100),
(UUID(), 'DEPARTMENT', 'Department', 'Access to own department data only', 50),
(UUID(), 'PERSONAL', 'Personal', 'Access to own data only', 10);

INSERT INTO Roles (uuid, code, name, description, default_scope_uuid, hierarchy_level, is_system_role, is_active) VALUES
(UUID(), 'SUPER_ADMIN', 'Super Administrator', 'Full system access', (SELECT uuid FROM Scopes WHERE code = 'ORGANIZATION'), 100, 1, 1),
(UUID(), 'HR_ADMIN', 'HR Administrator', 'HR management with organization scope', (SELECT uuid FROM Scopes WHERE code = 'ORGANIZATION'), 90, 1, 1),
(UUID(), 'DEPARTMENT_HEAD', 'Department Head', 'Department-level management', (SELECT uuid FROM Scopes WHERE code = 'DEPARTMENT'), 70, 1, 1),
(UUID(), 'HR_OFFICER', 'HR Officer', 'HR operations staff', (SELECT uuid FROM Scopes WHERE code = 'ORGANIZATION'), 60, 1, 1),
(UUID(), 'EMPLOYEE', 'Employee', 'Regular employee', (SELECT uuid FROM Scopes WHERE code = 'PERSONAL'), 10, 1, 1);

INSERT INTO RoleModules (uuid, role_uuid, module_uuid, scope_uuid)
SELECT UUID(), (SELECT uuid FROM Roles WHERE code = 'SUPER_ADMIN'), m.uuid, (SELECT uuid FROM Scopes WHERE code = 'ORGANIZATION')
FROM Modules m;

INSERT INTO RoleModules (uuid, role_uuid, module_uuid, scope_uuid)
SELECT UUID(), (SELECT uuid FROM Roles WHERE code = 'HR_ADMIN'), m.uuid, (SELECT uuid FROM Scopes WHERE code = 'ORGANIZATION')
FROM Modules m WHERE m.code != 'ADMIN';

INSERT INTO RoleModules (uuid, role_uuid, module_uuid, scope_uuid)
SELECT UUID(), (SELECT uuid FROM Roles WHERE code = 'DEPARTMENT_HEAD'), m.uuid, (SELECT uuid FROM Scopes WHERE code = 'DEPARTMENT')
FROM Modules m WHERE m.code IN ('EMPLOYEES', 'ATTENDANCE', 'SHIFTS', 'LEAVE');

INSERT INTO RoleModules (uuid, role_uuid, module_uuid, scope_uuid)
SELECT UUID(), (SELECT uuid FROM Roles WHERE code = 'HR_OFFICER'), m.uuid, (SELECT uuid FROM Scopes WHERE code = 'ORGANIZATION')
FROM Modules m WHERE m.code IN ('EMPLOYEES', 'LETTERS', 'LEAVE');

INSERT INTO RoleModules (uuid, role_uuid, module_uuid, scope_uuid)
SELECT UUID(), (SELECT uuid FROM Roles WHERE code = 'EMPLOYEE'), m.uuid, (SELECT uuid FROM Scopes WHERE code = 'PERSONAL')
FROM Modules m WHERE m.code = 'HOME';

INSERT INTO MesobIdSequence (last_value) VALUES (0);
INSERT INTO LetterReferenceSequence (last_value) VALUES (0);
