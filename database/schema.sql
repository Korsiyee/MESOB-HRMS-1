-- ═══════════════════════════════════════════════════════════════════════
-- HRMS Leave Service - Complete Database Schema
-- Last Updated: 2026-06-24
-- Description: Complete database schema reflecting all current features
-- ═══════════════════════════════════════════════════════════════════════

-- ═══════════════════════════════════════════════════════════════════════
-- LEAVE MANAGEMENT TABLES
-- ═══════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS leavePolicies (
  uuid VARCHAR(50) PRIMARY KEY,
  leaveType VARCHAR(50) UNIQUE,
  baseDays INT,
  incrementPerYear INT,
  maxDays INT,
  eligibilityMonths INT,
  useBudgetYear BOOLEAN
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS Holidays (
  uuid VARCHAR(50) PRIMARY KEY,
  holidayDate DATE UNIQUE,
  holidayName VARCHAR(255),
  calendarYear VARCHAR(10),
  calendarType VARCHAR(30),
  isActive BOOLEAN NOT NULL DEFAULT TRUE,
  source VARCHAR(30) NOT NULL DEFAULT 'MANUAL',
  description TEXT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ═══════════════════════════════════════════════════════════════════════
-- ORGANIZATIONAL STRUCTURE TABLES
-- ═══════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS Departments (
  uuid VARCHAR(36) PRIMARY KEY,
  name VARCHAR(200) UNIQUE NOT NULL,
  parent_uuid VARCHAR(36),
  head_employee_uuid VARCHAR(36),
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_departments_parent (parent_uuid),
  FOREIGN KEY (parent_uuid) REFERENCES Departments (uuid) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS Positions (
  uuid VARCHAR(36) PRIMARY KEY,
  title VARCHAR(200) NOT NULL,
  grade VARCHAR(50),
  department_uuid VARCHAR(36),
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_positions_department (department_uuid),
  FOREIGN KEY (department_uuid) REFERENCES Departments (uuid) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS Occupations (
  uuid VARCHAR(36) PRIMARY KEY,
  name VARCHAR(200) UNIQUE NOT NULL,
  description TEXT,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ═══════════════════════════════════════════════════════════════════════
-- EMPLOYEE TABLES
-- ═══════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS Employees (
  uuid VARCHAR(36) PRIMARY KEY,
  mesob_id VARCHAR(20) UNIQUE,
  title ENUM('Mr','Mrs','Ms','Dr','Prof','Ato','W/ro','W/t'),
  first_name VARCHAR(100) NOT NULL,
  middle_name VARCHAR(100) NOT NULL,
  last_name VARCHAR(100) NOT NULL,
  mother_name VARCHAR(100) NOT NULL,
  gender ENUM('MALE','FEMALE'),
  date_of_birth DATE NOT NULL,
  nationality VARCHAR(100) DEFAULT 'Ethiopian',
  profile_photo_key VARCHAR(500),
  tin_number VARCHAR(50),
  pension_code VARCHAR(50),
  bank_name VARCHAR(200),
  bank_account_number VARCHAR(100),
  hire_date DATE NOT NULL,
  prior_gov_service DECIMAL(5,2) DEFAULT 0,
  status ENUM('ACTIVE','INACTIVE','TERMINATED') NOT NULL DEFAULT 'ACTIVE',
  attendance_exempt BOOLEAN NOT NULL DEFAULT FALSE,
  face_images_registered BOOLEAN NOT NULL DEFAULT FALSE,
  department_uuid VARCHAR(36),
  position_uuid VARCHAR(36),
  occupation_uuid VARCHAR(36),
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_employees_name (last_name, first_name),
  INDEX idx_employees_department (department_uuid),
  INDEX idx_employees_position (position_uuid),
  INDEX idx_employees_occupation (occupation_uuid),
  INDEX idx_employees_status (status),
  INDEX idx_employees_tin (tin_number),
  FOREIGN KEY (department_uuid) REFERENCES Departments (uuid) ON DELETE SET NULL,
  FOREIGN KEY (position_uuid) REFERENCES Positions (uuid) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Add foreign key for department head after Employees table is created
ALTER TABLE Departments 
ADD CONSTRAINT fk_departments_head 
FOREIGN KEY (head_employee_uuid) REFERENCES Employees (uuid) ON DELETE SET NULL;

CREATE TABLE IF NOT EXISTS MesobIdSequence (
  id INT AUTO_INCREMENT PRIMARY KEY,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS EmployeeAddresses (
  uuid VARCHAR(36) PRIMARY KEY,
  employee_uuid VARCHAR(36) NOT NULL,
  address_type ENUM('PERMANENT','CURRENT'),
  region VARCHAR(100),
  zone VARCHAR(100),
  woreda VARCHAR(100),
  kebele VARCHAR(100),
  house_number VARCHAR(50),
  phone_primary VARCHAR(20),
  phone_secondary VARCHAR(20),
  email VARCHAR(200),
  INDEX idx_employee_addresses_employee (employee_uuid),
  FOREIGN KEY (employee_uuid) REFERENCES Employees (uuid) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS EmployeeIDDocuments (
  uuid VARCHAR(36) PRIMARY KEY,
  employee_uuid VARCHAR(36) NOT NULL,
  doc_type VARCHAR(100),
  id_number VARCHAR(100),
  issue_date DATE,
  valid_until DATE,
  file_key VARCHAR(500),
  original_name VARCHAR(255),
  mime_type VARCHAR(120),
  file_size BIGINT,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_employee_docs_employee (employee_uuid),
  FOREIGN KEY (employee_uuid) REFERENCES Employees (uuid) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS EmployeeRegistrationDrafts (
  uuid VARCHAR(36) PRIMARY KEY,
  step_completed TINYINT,
  draft_json JSON,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS EmployeeFaceImages (
  uuid VARCHAR(36) PRIMARY KEY,
  employee_uuid VARCHAR(36) NOT NULL,
  image_key VARCHAR(500) NOT NULL,
  image_number TINYINT NOT NULL CHECK (image_number BETWEEN 1 AND 7),
  descriptor_json TEXT,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_face_images_employee (employee_uuid),
  UNIQUE KEY idx_face_images_employee_number (employee_uuid, image_number),
  FOREIGN KEY (employee_uuid) REFERENCES Employees (uuid) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Junction table for many-to-many relationship between Employees and Occupations
CREATE TABLE IF NOT EXISTS EmployeeOccupations (
  uuid VARCHAR(36) PRIMARY KEY,
  employee_uuid VARCHAR(36) NOT NULL,
  occupation_uuid VARCHAR(36) NOT NULL,
  assigned_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  assigned_by VARCHAR(36),
  UNIQUE KEY unique_employee_occupation (employee_uuid, occupation_uuid),
  INDEX idx_employee_occupations_employee (employee_uuid),
  INDEX idx_employee_occupations_occupation (occupation_uuid),
  FOREIGN KEY (employee_uuid) REFERENCES Employees(uuid) ON DELETE CASCADE,
  FOREIGN KEY (occupation_uuid) REFERENCES Occupations(uuid) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ═══════════════════════════════════════════════════════════════════════
-- USER MANAGEMENT TABLES
-- ═══════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS Users (
  uuid VARCHAR(36) PRIMARY KEY,
  employee_uuid VARCHAR(36),
  username VARCHAR(100) UNIQUE,
  password_hash VARCHAR(255),
  refresh_token VARCHAR(512),
  token_version INT NOT NULL DEFAULT 0,
  role ENUM('EMPLOYEE','DEPARTMENT_HEAD','HR_OFFICER','HR_ADMIN','SUPER_ADMIN') NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  must_change_password TINYINT(1) DEFAULT 0,
  last_login DATETIME,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_users_employee (employee_uuid),
  FOREIGN KEY (employee_uuid) REFERENCES Employees (uuid) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Add foreign key for assigned_by in EmployeeOccupations
ALTER TABLE EmployeeOccupations 
ADD CONSTRAINT fk_employee_occupations_assigned_by 
FOREIGN KEY (assigned_by) REFERENCES Users(uuid) ON DELETE SET NULL;

-- ═══════════════════════════════════════════════════════════════════════
-- ATTENDANCE TABLES
-- ═══════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS ShiftDefinitions (
  uuid VARCHAR(36) PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  working_days_json JSON,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_shifts_name (name)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS EmployeeShifts (
  uuid VARCHAR(36) PRIMARY KEY,
  employee_uuid VARCHAR(36) NOT NULL,
  shift_uuid VARCHAR(36) NOT NULL,
  effective_from DATE NOT NULL,
  effective_to DATE,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_employee_shifts_employee (employee_uuid),
  INDEX idx_employee_shifts_shift (shift_uuid),
  INDEX idx_employee_shifts_effective (employee_uuid, effective_from),
  FOREIGN KEY (employee_uuid) REFERENCES Employees (uuid) ON DELETE CASCADE,
  FOREIGN KEY (shift_uuid) REFERENCES ShiftDefinitions (uuid) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS AttendanceLogs (
  uuid VARCHAR(36) PRIMARY KEY,
  employee_uuid VARCHAR(36) NOT NULL,
  date DATE NOT NULL,
  check_in DATETIME,
  check_out DATETIME,
  source ENUM('MANUAL','DEVICE','SYSTEM','FACE_RECOGNITION') NOT NULL DEFAULT 'SYSTEM',
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_attendance_logs_employee (employee_uuid),
  INDEX idx_attendance_logs_date (date),
  FOREIGN KEY (employee_uuid) REFERENCES Employees (uuid) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS AttendanceSummary (
  uuid VARCHAR(36) PRIMARY KEY,
  employee_uuid VARCHAR(36) NOT NULL,
  date DATE NOT NULL,
  status ENUM('PRESENT','ABSENT','LATE','ON_LEAVE') NOT NULL,
  shift_uuid VARCHAR(36),
  shift_name_snapshot VARCHAR(100) NULL COMMENT 'Snapshot of shift name at attendance time',
  shift_start_time_snapshot TIME NULL COMMENT 'Snapshot of shift start time at attendance time',
  shift_end_time_snapshot TIME NULL COMMENT 'Snapshot of shift end time at attendance time',
  leave_request_uuid VARCHAR(36),
  corrected_by VARCHAR(36),
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY idx_attendance_summary_employee_date (employee_uuid, date),
  INDEX idx_attendance_summary_status (status),
  FOREIGN KEY (employee_uuid) REFERENCES Employees (uuid) ON DELETE CASCADE,
  FOREIGN KEY (shift_uuid) REFERENCES ShiftDefinitions (uuid) ON DELETE SET NULL,
  FOREIGN KEY (corrected_by) REFERENCES Employees (uuid) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS NetworkSettings (
  uuid VARCHAR(36) PRIMARY KEY,
  label VARCHAR(100) NOT NULL COMMENT 'Descriptive name for this network range',
  ip_range VARCHAR(50) NOT NULL COMMENT 'IP address or CIDR notation',
  is_active TINYINT(1) DEFAULT 1 COMMENT 'Whether this network range is currently active',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_network_settings_active (is_active)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='Stores allowed network ranges for company Wi-Fi verification';

-- ═══════════════════════════════════════════════════════════════════════
-- LEAVE REQUEST TABLES
-- ═══════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS employeeLeaveBalances (
  uuid VARCHAR(50) PRIMARY KEY,
  employee_uuid VARCHAR(36) NOT NULL,
  budgetYear VARCHAR(10),
  entitledDays DECIMAL(8,1),
  carriedForwardDays DECIMAL(8,1),
  usedDays DECIMAL(8,1),
  remainingDays DECIMAL(8,1),
  status ENUM('ACTIVE', 'INACTIVE') NOT NULL DEFAULT 'ACTIVE',
  updatedAt DATE NOT NULL DEFAULT (CURRENT_DATE),
  INDEX idx_balance_employee_year (employee_uuid, budgetYear),
  FOREIGN KEY (employee_uuid) REFERENCES Employees (uuid) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS leaveRequests (
  uuid VARCHAR(50) PRIMARY KEY,
  employee_uuid VARCHAR(36) NOT NULL,
  leaveType VARCHAR(50),
  startDate DATE,
  endDate DATE,
  total_days DECIMAL(8,1),
  dayPattern VARCHAR(20),
  dailyPlanJson TEXT,
  reason TEXT,
  rejectionReason TEXT,
  supportingDocument VARCHAR(255),
  status ENUM('PENDING','PENDING_DEPARTMENT','PENDING_HR','APPROVED','REJECTED','REJECTED_DEPARTMENT','REJECTED_HR','CANCELLED') NOT NULL DEFAULT 'PENDING_DEPARTMENT',
  department_head_id INT,
  hr_supervisor_id INT,
  cancelled_at DATETIME NULL,
  cancelled_by VARCHAR(36) NULL,
  original_end_date DATE NULL,
  actual_return_date DATE NULL,
  is_shortened TINYINT(1) NOT NULL DEFAULT 0,
  shortened_at DATETIME NULL,
  shortened_by VARCHAR(36) NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_requests_employee_status (employee_uuid, status),
  INDEX idx_requests_dates (startDate, endDate),
  FOREIGN KEY (employee_uuid) REFERENCES Employees (uuid) ON DELETE CASCADE,
  FOREIGN KEY (leaveType) REFERENCES leavePolicies (leaveType) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Add foreign key for leave_request_uuid in AttendanceSummary
ALTER TABLE AttendanceSummary 
ADD CONSTRAINT fk_attendance_summary_leave_request 
FOREIGN KEY (leave_request_uuid) REFERENCES leaveRequests (uuid) ON DELETE SET NULL;

CREATE TABLE IF NOT EXISTS leaveRequestDocuments (
  uuid VARCHAR(50) PRIMARY KEY,
  leaveRequestUuid VARCHAR(50) NOT NULL,
  employee_uuid VARCHAR(36) NOT NULL,
  originalName VARCHAR(255) NOT NULL,
  objectKey VARCHAR(512) NOT NULL,
  mimeType VARCHAR(120) NOT NULL,
  sizeBytes BIGINT NOT NULL,
  createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_leave_docs_request (leaveRequestUuid),
  INDEX idx_leave_docs_employee (employee_uuid),
  FOREIGN KEY (leaveRequestUuid) REFERENCES leaveRequests (uuid) ON DELETE CASCADE,
  FOREIGN KEY (employee_uuid) REFERENCES Employees (uuid) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS leavePostponements (
  uuid VARCHAR(50) PRIMARY KEY,
  employee_uuid VARCHAR(36) NOT NULL,
  leaveBalanceUuid VARCHAR(50),
  postponedDays DECIMAL(8,1),
  reason TEXT,
  status ENUM('APPROVED', 'REJECTED') NOT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_postponements_employee (employee_uuid),
  FOREIGN KEY (employee_uuid) REFERENCES Employees (uuid) ON DELETE CASCADE,
  FOREIGN KEY (leaveBalanceUuid) REFERENCES employeeLeaveBalances (uuid) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ═══════════════════════════════════════════════════════════════════════
-- LETTER MANAGEMENT TABLES
-- ═══════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS LetterTemplates (
  uuid VARCHAR(36) PRIMARY KEY,
  type VARCHAR(100),
  title VARCHAR(200),
  category VARCHAR(50) DEFAULT 'GENERAL',
  body_template TEXT,
  text_content LONGTEXT NULL,
  pdf_template_key VARCHAR(500) NULL,
  original_filename VARCHAR(255) NULL,
  file_size BIGINT NULL,
  mime_type VARCHAR(120) NULL,
  recipient_info TEXT NULL COMMENT 'Rich text HTML for recipient information',
  subject TEXT NULL COMMENT 'Rich text HTML for subject',
  main_body TEXT NULL COMMENT 'Rich text HTML for main body',
  closing_text TEXT NULL COMMENT 'Rich text HTML for closing',
  cc_recipients TEXT NULL COMMENT 'Rich text HTML for CC recipients',
  uses_new_format BOOLEAN DEFAULT TRUE COMMENT 'Uses new structured format',
  is_active BOOLEAN DEFAULT TRUE,
  created_by VARCHAR(36),
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_letter_templates_created_by (created_by),
  FOREIGN KEY (created_by) REFERENCES Employees (uuid) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS IssuedLetters (
  uuid VARCHAR(36) PRIMARY KEY,
  employee_uuid VARCHAR(36) NOT NULL,
  template_uuid VARCHAR(36) NOT NULL,
  name VARCHAR(200) NULL,
  type VARCHAR(100) NULL,
  generated_content LONGTEXT NULL,
  generated_pdf_key VARCHAR(500),
  issued_by VARCHAR(36),
  issued_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_issued_letters_employee (employee_uuid),
  INDEX idx_issued_letters_template (template_uuid),
  INDEX idx_issued_letters_issued_by (issued_by),
  FOREIGN KEY (employee_uuid) REFERENCES Employees (uuid) ON DELETE CASCADE,
  FOREIGN KEY (template_uuid) REFERENCES LetterTemplates (uuid) ON DELETE CASCADE,
  FOREIGN KEY (issued_by) REFERENCES Employees (uuid) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS LetterRequests (
  uuid VARCHAR(36) NOT NULL PRIMARY KEY,
  employee_uuid VARCHAR(36) NOT NULL,
  template_uuid VARCHAR(36) NOT NULL,
  recipient_info TEXT NULL,
  subject TEXT NULL,
  main_body TEXT NULL,
  closing_text TEXT NULL,
  cc_recipients TEXT NULL,
  generated_content LONGTEXT,
  generated_pdf_key VARCHAR(500) NULL,
  status ENUM('PENDING', 'APPROVED', 'REJECTED') DEFAULT 'PENDING',
  requested_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  reviewed_by VARCHAR(36) NULL,
  reviewed_at TIMESTAMP NULL,
  rejection_reason TEXT NULL,
  INDEX idx_letter_requests_employee (employee_uuid),
  INDEX idx_letter_requests_template (template_uuid),
  INDEX idx_letter_requests_status (status),
  INDEX idx_letter_requests_requested_at (requested_at),
  FOREIGN KEY (employee_uuid) REFERENCES Employees (uuid) ON DELETE CASCADE,
  FOREIGN KEY (template_uuid) REFERENCES LetterTemplates (uuid) ON DELETE CASCADE,
  FOREIGN KEY (reviewed_by) REFERENCES Employees (uuid) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ═══════════════════════════════════════════════════════════════════════
-- NOTIFICATION & AUDIT TABLES
-- ═══════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS Notifications (
  uuid VARCHAR(36) NOT NULL PRIMARY KEY,
  recipient_uuid VARCHAR(36) NOT NULL,
  sender_uuid VARCHAR(36) NULL,
  sender_role VARCHAR(50) NULL,
  notification_type VARCHAR(80) NOT NULL,
  title VARCHAR(255) NOT NULL,
  message TEXT NOT NULL,
  redirect_url VARCHAR(500) NULL,
  entity_type VARCHAR(50) NULL,
  entity_uuid VARCHAR(50) NULL,
  is_read TINYINT(1) NOT NULL DEFAULT 0,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_notif_recipient (recipient_uuid),
  INDEX idx_notif_unread (recipient_uuid, is_read),
  INDEX idx_notif_created (created_at),
  FOREIGN KEY (recipient_uuid) REFERENCES Users (uuid) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS AuditLogs (
  uuid VARCHAR(36) PRIMARY KEY,
  actor_uuid VARCHAR(36),
  action VARCHAR(100),
  entity_type VARCHAR(100),
  entity_uuid VARCHAR(36),
  diff_json JSON,
  ip_address VARCHAR(45),
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_audit_actor (actor_uuid),
  INDEX idx_audit_action (action),
  INDEX idx_audit_created (created_at),
  FOREIGN KEY (actor_uuid) REFERENCES Users (uuid) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ═══════════════════════════════════════════════════════════════════════
-- MIGRATION TRACKING TABLE
-- ═══════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS _migrations (
  id INT AUTO_INCREMENT PRIMARY KEY,
  filename VARCHAR(255) NOT NULL UNIQUE,
  executed_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
c