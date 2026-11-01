/**
 * Initialize PostgreSQL database for Render deployment
 * Run this from Render Shell: cd backend && node scripts/initPostgresDb.js
 */

require('../src/config/env');
const { Pool } = require('pg');

const DATABASE_URL = process.env.DATABASE_URL;

if (!DATABASE_URL) {
  console.error('❌ DATABASE_URL environment variable not set');
  process.exit(1);
}

const pool = new Pool({
  connectionString: DATABASE_URL,
  ssl: {
    rejectUnauthorized: false
  }
});

async function initDatabase() {
  console.log('🚀 Starting PostgreSQL database initialization...\n');
  
  const client = await pool.connect();
  
  try {
    // Check if already initialized
    const checkResult = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' AND table_name = 'users'
    `);
    
    if (checkResult.rows.length > 0) {
      console.log('⚠️  Database already initialized!');
      const confirm = 'yes'; // Change to 'no' if you don't want to reinitialize
      if (confirm !== 'yes') {
        console.log('Aborting...');
        return;
      }
      console.log('Dropping existing tables...\n');
      await dropAllTables(client);
    }
    
    console.log('📝 Creating extension for UUID generation...');
    await client.query('CREATE EXTENSION IF NOT EXISTS "pgcrypto"');
    
    console.log('📝 Creating tables...\n');
    await createTables(client);
    
    console.log('\n📝 Inserting seed data...\n');
    await insertSeedData(client);
    
    console.log('\n✅ Database initialization completed successfully!');
    console.log('\n👤 Default login credentials:');
    console.log('   Username: abebe.tadesse');
    console.log('   Password: mesob2024\n');
    
  } catch (error) {
    console.error('\n❌ Initialization failed:', error.message);
    console.error(error.stack);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

async function dropAllTables(client) {
  const dropSQL = `
    DROP TABLE IF EXISTS LetterAttachments CASCADE;
    DROP TABLE IF EXISTS LetterRequests CASCADE;
    DROP TABLE IF EXISTS LetterTemplates CASCADE;
    DROP TABLE IF EXISTS LetterReferenceSequence CASCADE;
    DROP TABLE IF EXISTS PolicyAcknowledgments CASCADE;
    DROP TABLE IF EXISTS PolicyVersions CASCADE;
    DROP TABLE IF EXISTS Policies CASCADE;
    DROP TABLE IF EXISTS Notifications CASCADE;
    DROP TABLE IF EXISTS LeaveBalances CASCADE;
    DROP TABLE IF EXISTS LeaveApplications CASCADE;
    DROP TABLE IF EXISTS LeaveTypes CASCADE;
    DROP TABLE IF EXISTS PublicHolidays CASCADE;
    DROP TABLE IF EXISTS AttendanceRecords CASCADE;
    DROP TABLE IF EXISTS EmployeeShifts CASCADE;
    DROP TABLE IF EXISTS FaceEncodings CASCADE;
    DROP TABLE IF EXISTS EmployeeLevelHistory CASCADE;
    DROP TABLE IF EXISTS EmployeeIDDocuments CASCADE;
    DROP TABLE IF EXISTS EmployeeAddresses CASCADE;
    DROP TABLE IF EXISTS Employees CASCADE;
    DROP TABLE IF EXISTS Users CASCADE;
    DROP TABLE IF EXISTS LevelVersions CASCADE;
    DROP TABLE IF EXISTS Levels CASCADE;
    DROP TABLE IF EXISTS DepartmentLeadership CASCADE;
    DROP TABLE IF EXISTS Positions CASCADE;
    DROP TABLE IF EXISTS ShiftDefinitions CASCADE;
    DROP TABLE IF EXISTS Departments CASCADE;
    DROP TABLE IF EXISTS RoleModules CASCADE;
    DROP TABLE IF EXISTS Roles CASCADE;
    DROP TABLE IF EXISTS Scopes CASCADE;
    DROP TABLE IF EXISTS Modules CASCADE;
    DROP TABLE IF EXISTS SystemSettings CASCADE;
    DROP TABLE IF EXISTS NetworkSettings CASCADE;
  `;
  
  await client.query(dropSQL);
}

async function createTables(client) {
  // Create tables in dependency order
  
  // System settings
  await client.query(`
    CREATE TABLE SystemSettings (
      uuid VARCHAR(36) PRIMARY KEY DEFAULT gen_random_uuid()::text,
      setting_key VARCHAR(100) UNIQUE NOT NULL,
      setting_value TEXT,
      description TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);
  
  await client.query(`
    CREATE TABLE NetworkSettings (
      uuid VARCHAR(36) PRIMARY KEY DEFAULT gen_random_uuid()::text,
      setting_type VARCHAR(50) NOT NULL,
      setting_value TEXT NOT NULL,
      is_active BOOLEAN DEFAULT TRUE,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);
  
  // RBAC Tables
  console.log('Creating Modules table...');
  await client.query(`
    CREATE TABLE Modules (
      uuid VARCHAR(36) PRIMARY KEY,
      code VARCHAR(50) UNIQUE NOT NULL,
      name VARCHAR(100) NOT NULL,
      description TEXT,
      icon VARCHAR(50),
      display_order INT DEFAULT 0,
      is_active BOOLEAN DEFAULT TRUE,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);
  
  console.log('Creating Scopes table...');
  await client.query(`
    CREATE TABLE Scopes (
      uuid VARCHAR(36) PRIMARY KEY,
      code VARCHAR(50) UNIQUE NOT NULL,
      name VARCHAR(100) NOT NULL,
      description TEXT,
      level INT DEFAULT 0,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);
  
  console.log('Creating Roles table...');
  await client.query(`
    CREATE TABLE Roles (
      uuid VARCHAR(36) PRIMARY KEY,
      code VARCHAR(50) UNIQUE NOT NULL,
      name VARCHAR(100) NOT NULL,
      description TEXT,
      default_scope_uuid VARCHAR(36) REFERENCES Scopes(uuid) ON DELETE SET NULL,
      hierarchy_level INT DEFAULT 10,
      is_system_role BOOLEAN DEFAULT FALSE,
      is_active BOOLEAN DEFAULT TRUE,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);
  
  console.log('Creating RoleModules table...');
  await client.query(`
    CREATE TABLE RoleModules (
      uuid VARCHAR(36) PRIMARY KEY,
      role_uuid VARCHAR(36) NOT NULL REFERENCES Roles(uuid) ON DELETE CASCADE,
      module_uuid VARCHAR(36) NOT NULL REFERENCES Modules(uuid) ON DELETE CASCADE,
      scope_uuid VARCHAR(36) NOT NULL REFERENCES Scopes(uuid) ON DELETE RESTRICT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(role_uuid, module_uuid)
    )
  `);
  
  // Organization structure
  console.log('Creating Departments table...');
  await client.query(`
    CREATE TABLE Departments (
      uuid VARCHAR(36) PRIMARY KEY,
      dept_code VARCHAR(50) UNIQUE NOT NULL,
      name VARCHAR(200) UNIQUE NOT NULL,
      parent_uuid VARCHAR(36) REFERENCES Departments(uuid) ON DELETE SET NULL,
      is_active BOOLEAN DEFAULT TRUE,
      head_employee_uuid VARCHAR(36),
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);
  
  console.log('Creating ShiftDefinitions table...');
  await client.query(`
    CREATE TABLE ShiftDefinitions (
      uuid VARCHAR(36) PRIMARY KEY,
      shift_code VARCHAR(50) UNIQUE NOT NULL,
      name VARCHAR(100) UNIQUE NOT NULL,
      start_time TIME NOT NULL,
      end_time TIME NOT NULL,
      working_days_json JSONB,
      grace_period_minutes INT DEFAULT 15,
      break_duration_minutes INT DEFAULT 0,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);
  
  console.log('Creating Positions table...');
  await client.query(`
    CREATE TABLE Positions (
      uuid VARCHAR(36) PRIMARY KEY,
      position_code VARCHAR(50) UNIQUE NOT NULL,
      title VARCHAR(200) NOT NULL,
      grade VARCHAR(50),
      occupation_type VARCHAR(100),
      department_uuid VARCHAR(36) NOT NULL REFERENCES Departments(uuid) ON DELETE RESTRICT,
      default_shift_uuid VARCHAR(36) REFERENCES ShiftDefinitions(uuid) ON DELETE SET NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);
  
  console.log('Creating DepartmentLeadership table...');
  await client.query(`
    CREATE TABLE DepartmentLeadership (
      uuid VARCHAR(36) PRIMARY KEY,
      department_uuid VARCHAR(36) NOT NULL REFERENCES Departments(uuid) ON DELETE CASCADE,
      employee_uuid VARCHAR(36) NOT NULL,
      effective_from DATE NOT NULL,
      effective_to DATE,
      appointed_by_uuid VARCHAR(36),
      appointment_reason TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);
  
  // Compensation
  console.log('Creating Levels table...');
  await client.query(`
    CREATE TABLE Levels (
      uuid VARCHAR(36) PRIMARY KEY,
      level_code VARCHAR(50) UNIQUE NOT NULL,
      name VARCHAR(100) NOT NULL,
      description TEXT,
      sort_order INT DEFAULT 0,
      is_active BOOLEAN DEFAULT TRUE,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);
  
  console.log('Creating LevelVersions table...');
  await client.query(`
    CREATE TABLE LevelVersions (
      uuid VARCHAR(36) PRIMARY KEY,
      level_uuid VARCHAR(36) NOT NULL REFERENCES Levels(uuid) ON DELETE CASCADE,
      base_salary DECIMAL(15,2) NOT NULL,
      allowances_json JSONB,
      effective_from DATE NOT NULL,
      effective_to DATE,
      version_number INT DEFAULT 1,
      notes TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);
  
  // Users (before Employees due to foreign key)
  console.log('Creating Users table...');
  await client.query(`
    CREATE TABLE Users (
      uuid VARCHAR(36) PRIMARY KEY,
      employee_uuid VARCHAR(36),
      user_type VARCHAR(20) DEFAULT 'EMPLOYEE',
      username VARCHAR(100) UNIQUE NOT NULL,
      password_hash VARCHAR(255) NOT NULL,
      role_uuid VARCHAR(36) REFERENCES Roles(uuid) ON DELETE SET NULL,
      is_active BOOLEAN DEFAULT TRUE,
      last_login TIMESTAMP,
      password_changed_at TIMESTAMP,
      failed_login_attempts INT DEFAULT 0,
      locked_until TIMESTAMP,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);
  
  // Employees
  console.log('Creating Employees table...');
  await client.query(`
    CREATE TABLE Employees (
      uuid VARCHAR(36) PRIMARY KEY,
      mesob_id VARCHAR(20) UNIQUE,
      title VARCHAR(20),
      first_name VARCHAR(100) NOT NULL,
      middle_name VARCHAR(100),
      last_name VARCHAR(100) NOT NULL,
      mother_name VARCHAR(200),
      gender VARCHAR(10),
      date_of_birth DATE,
      nationality VARCHAR(100),
      tin_number VARCHAR(50) UNIQUE,
      pension_code VARCHAR(50),
      bank_name VARCHAR(100),
      bank_account_number VARCHAR(50),
      hire_date DATE NOT NULL,
      termination_date DATE,
      prior_gov_service_years DECIMAL(5,2) DEFAULT 0,
      status VARCHAR(20) DEFAULT 'ACTIVE',
      position_uuid VARCHAR(36) REFERENCES Positions(uuid) ON DELETE SET NULL,
      department_uuid VARCHAR(36) REFERENCES Departments(uuid) ON DELETE SET NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);
  
  // Add employee_uuid foreign key to Users
  await client.query(`
    ALTER TABLE Users 
    ADD CONSTRAINT fk_users_employee 
    FOREIGN KEY (employee_uuid) REFERENCES Employees(uuid) ON DELETE CASCADE
  `);
  
  // Employee related tables
  console.log('Creating EmployeeAddresses table...');
  await client.query(`
    CREATE TABLE EmployeeAddresses (
      uuid VARCHAR(36) PRIMARY KEY,
      employee_uuid VARCHAR(36) NOT NULL REFERENCES Employees(uuid) ON DELETE CASCADE,
      address_type VARCHAR(20) DEFAULT 'CURRENT',
      region VARCHAR(100),
      zone VARCHAR(100),
      woreda VARCHAR(100),
      kebele VARCHAR(100),
      house_number VARCHAR(50),
      phone_primary VARCHAR(20),
      phone_secondary VARCHAR(20),
      email VARCHAR(100),
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);
  
  console.log('Creating EmployeeIDDocuments table...');
  await client.query(`
    CREATE TABLE EmployeeIDDocuments (
      uuid VARCHAR(36) PRIMARY KEY,
      employee_uuid VARCHAR(36) NOT NULL REFERENCES Employees(uuid) ON DELETE CASCADE,
      document_type VARCHAR(50) NOT NULL,
      document_number VARCHAR(100),
      issue_date DATE,
      expiry_date DATE,
      issuing_authority VARCHAR(200),
      document_url VARCHAR(500),
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);
  
  console.log('Creating EmployeeLevelHistory table...');
  await client.query(`
    CREATE TABLE EmployeeLevelHistory (
      uuid VARCHAR(36) PRIMARY KEY,
      employee_uuid VARCHAR(36) NOT NULL REFERENCES Employees(uuid) ON DELETE CASCADE,
      level_uuid VARCHAR(36) NOT NULL REFERENCES Levels(uuid) ON DELETE RESTRICT,
      level_version_uuid VARCHAR(36) REFERENCES LevelVersions(uuid) ON DELETE SET NULL,
      effective_from DATE NOT NULL,
      effective_to DATE,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);
  
  console.log('Creating FaceEncodings table...');
  await client.query(`
    CREATE TABLE FaceEncodings (
      uuid VARCHAR(36) PRIMARY KEY DEFAULT gen_random_uuid()::text,
      employee_uuid VARCHAR(36) NOT NULL REFERENCES Employees(uuid) ON DELETE CASCADE,
      encoding TEXT NOT NULL,
      image_url VARCHAR(500),
      is_active BOOLEAN DEFAULT TRUE,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);
  
  console.log('Creating EmployeeShifts table...');
  await client.query(`
    CREATE TABLE EmployeeShifts (
      uuid VARCHAR(36) PRIMARY KEY,
      employee_uuid VARCHAR(36) NOT NULL REFERENCES Employees(uuid) ON DELETE CASCADE,
      shift_uuid VARCHAR(36) NOT NULL REFERENCES ShiftDefinitions(uuid) ON DELETE RESTRICT,
      effective_from DATE NOT NULL,
      effective_to DATE,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);
  
  // Attendance
  console.log('Creating AttendanceRecords table...');
  await client.query(`
    CREATE TABLE AttendanceRecords (
      uuid VARCHAR(36) PRIMARY KEY DEFAULT gen_random_uuid()::text,
      employee_uuid VARCHAR(36) NOT NULL REFERENCES Employees(uuid) ON DELETE CASCADE,
      attendance_date DATE NOT NULL,
      check_in_time TIMESTAMP,
      check_out_time TIMESTAMP,
      status VARCHAR(20) DEFAULT 'PRESENT',
      worked_hours DECIMAL(5,2),
      overtime_hours DECIMAL(5,2) DEFAULT 0,
      late_minutes INT DEFAULT 0,
      notes TEXT,
      approved_by_uuid VARCHAR(36),
      approved_at TIMESTAMP,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(employee_uuid, attendance_date)
    )
  `);
  
  // Leave management
  console.log('Creating PublicHolidays table...');
  await client.query(`
    CREATE TABLE PublicHolidays (
      uuid VARCHAR(36) PRIMARY KEY DEFAULT gen_random_uuid()::text,
      holiday_name VARCHAR(200) NOT NULL,
      holiday_date DATE NOT NULL UNIQUE,
      is_recurring BOOLEAN DEFAULT FALSE,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);
  
  console.log('Creating LeaveTypes table...');
  await client.query(`
    CREATE TABLE LeaveTypes (
      uuid VARCHAR(36) PRIMARY KEY DEFAULT gen_random_uuid()::text,
      code VARCHAR(50) UNIQUE NOT NULL,
      name VARCHAR(100) NOT NULL,
      description TEXT,
      default_days_per_year DECIMAL(5,2),
      requires_approval BOOLEAN DEFAULT TRUE,
      is_paid BOOLEAN DEFAULT TRUE,
      is_active BOOLEAN DEFAULT TRUE,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);
  
  console.log('Creating LeaveApplications table...');
  await client.query(`
    CREATE TABLE LeaveApplications (
      uuid VARCHAR(36) PRIMARY KEY DEFAULT gen_random_uuid()::text,
      employee_uuid VARCHAR(36) NOT NULL REFERENCES Employees(uuid) ON DELETE CASCADE,
      leave_type_uuid VARCHAR(36) NOT NULL REFERENCES LeaveTypes(uuid) ON DELETE RESTRICT,
      start_date DATE NOT NULL,
      end_date DATE NOT NULL,
      total_days DECIMAL(5,2) NOT NULL,
      reason TEXT,
      status VARCHAR(20) DEFAULT 'PENDING',
      reviewed_by_uuid VARCHAR(36),
      reviewed_at TIMESTAMP,
      review_notes TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);
  
  console.log('Creating LeaveBalances table...');
  await client.query(`
    CREATE TABLE LeaveBalances (
      uuid VARCHAR(36) PRIMARY KEY DEFAULT gen_random_uuid()::text,
      employee_uuid VARCHAR(36) NOT NULL REFERENCES Employees(uuid) ON DELETE CASCADE,
      leave_type_uuid VARCHAR(36) NOT NULL REFERENCES LeaveTypes(uuid) ON DELETE CASCADE,
      year INT NOT NULL,
      total_entitled DECIMAL(5,2) NOT NULL,
      used_days DECIMAL(5,2) DEFAULT 0,
      pending_days DECIMAL(5,2) DEFAULT 0,
      remaining_days DECIMAL(5,2) NOT NULL,
      carried_forward DECIMAL(5,2) DEFAULT 0,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(employee_uuid, leave_type_uuid, year)
    )
  `);
  
  // Notifications
  console.log('Creating Notifications table...');
  await client.query(`
    CREATE TABLE Notifications (
      uuid VARCHAR(36) PRIMARY KEY DEFAULT gen_random_uuid()::text,
      recipient_uuid VARCHAR(36) NOT NULL,
      sender_uuid VARCHAR(36),
      notification_type VARCHAR(50) NOT NULL,
      title VARCHAR(200) NOT NULL,
      message TEXT NOT NULL,
      related_entity_type VARCHAR(50),
      related_entity_uuid VARCHAR(36),
      is_read BOOLEAN DEFAULT FALSE,
      read_at TIMESTAMP,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);
  
  // Policies
  console.log('Creating Policies table...');
  await client.query(`
    CREATE TABLE Policies (
      uuid VARCHAR(36) PRIMARY KEY DEFAULT gen_random_uuid()::text,
      policy_code VARCHAR(50) UNIQUE NOT NULL,
      title VARCHAR(200) NOT NULL,
      category VARCHAR(100),
      current_version_uuid VARCHAR(36),
      is_active BOOLEAN DEFAULT TRUE,
      created_by_uuid VARCHAR(36),
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);
  
  console.log('Creating PolicyVersions table...');
  await client.query(`
    CREATE TABLE PolicyVersions (
      uuid VARCHAR(36) PRIMARY KEY DEFAULT gen_random_uuid()::text,
      policy_uuid VARCHAR(36) NOT NULL REFERENCES Policies(uuid) ON DELETE CASCADE,
      version_number INT NOT NULL,
      content TEXT NOT NULL,
      effective_from DATE NOT NULL,
      effective_to DATE,
      approved_by_uuid VARCHAR(36),
      approved_at TIMESTAMP,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(policy_uuid, version_number)
    )
  `);
  
  console.log('Creating PolicyAcknowledgments table...');
  await client.query(`
    CREATE TABLE PolicyAcknowledgments (
      uuid VARCHAR(36) PRIMARY KEY DEFAULT gen_random_uuid()::text,
      employee_uuid VARCHAR(36) NOT NULL REFERENCES Employees(uuid) ON DELETE CASCADE,
      policy_version_uuid VARCHAR(36) NOT NULL REFERENCES PolicyVersions(uuid) ON DELETE CASCADE,
      acknowledged_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      ip_address VARCHAR(50),
      UNIQUE(employee_uuid, policy_version_uuid)
    )
  `);
  
  // Letter management
  console.log('Creating LetterReferenceSequence table...');
  await client.query(`
    CREATE TABLE LetterReferenceSequence (
      id SERIAL PRIMARY KEY,
      year INT NOT NULL UNIQUE,
      last_sequence INT DEFAULT 0,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);
  
  console.log('Creating LetterTemplates table...');
  await client.query(`
    CREATE TABLE LetterTemplates (
      uuid VARCHAR(36) PRIMARY KEY DEFAULT gen_random_uuid()::text,
      template_code VARCHAR(50) UNIQUE NOT NULL,
      template_name VARCHAR(200) NOT NULL,
      letter_type VARCHAR(100) NOT NULL,
      description TEXT,
      header_content TEXT,
      body_content TEXT NOT NULL,
      footer_content TEXT,
      required_fields_json JSONB,
      is_active BOOLEAN DEFAULT TRUE,
      created_by_uuid VARCHAR(36),
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);
  
  console.log('Creating LetterRequests table...');
  await client.query(`
    CREATE TABLE LetterRequests (
      uuid VARCHAR(36) PRIMARY KEY DEFAULT gen_random_uuid()::text,
      reference_number VARCHAR(100) UNIQUE,
      request_type VARCHAR(100) NOT NULL,
      employee_uuid VARCHAR(36) NOT NULL REFERENCES Employees(uuid) ON DELETE CASCADE,
      template_uuid VARCHAR(36) REFERENCES LetterTemplates(uuid) ON DELETE SET NULL,
      request_reason TEXT,
      field_data_json JSONB,
      status VARCHAR(20) DEFAULT 'PENDING',
      reviewed_by_uuid VARCHAR(36),
      reviewed_at TIMESTAMP,
      review_notes TEXT,
      generated_file_url VARCHAR(500),
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);
  
  console.log('Creating LetterAttachments table...');
  await client.query(`
    CREATE TABLE LetterAttachments (
      uuid VARCHAR(36) PRIMARY KEY DEFAULT gen_random_uuid()::text,
      letter_request_uuid VARCHAR(36) NOT NULL REFERENCES LetterRequests(uuid) ON DELETE CASCADE,
      filename VARCHAR(255) NOT NULL,
      file_url VARCHAR(500) NOT NULL,
      file_size INT,
      mime_type VARCHAR(100),
      uploaded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);
  
  console.log('✅ All tables created successfully!');
}

async function insertSeedData(client) {
  // Insert Modules
  console.log('Inserting Modules...');
  await client.query(`
    INSERT INTO Modules (uuid, code, name, description, icon, display_order, is_active) VALUES
    (gen_random_uuid()::text, 'HOME', 'Home', 'Dashboard and overview', 'LayoutDashboard', 0, TRUE),
    (gen_random_uuid()::text, 'EMPLOYEES', 'Employees', 'Employee management', 'Users', 10, TRUE),
    (gen_random_uuid()::text, 'ATTENDANCE', 'Attendance', 'Attendance tracking', 'Clock', 20, TRUE),
    (gen_random_uuid()::text, 'SHIFTS', 'Shifts', 'Shift management', 'Calendar', 30, TRUE),
    (gen_random_uuid()::text, 'LEAVE', 'Leave', 'Leave management', 'Calendar', 40, TRUE),
    (gen_random_uuid()::text, 'LETTERS', 'Letters', 'Document requests', 'FileText', 50, TRUE),
    (gen_random_uuid()::text, 'ADMIN', 'Administration', 'System administration', 'Settings', 90, TRUE)
  `);
  
  // Insert Scopes
  console.log('Inserting Scopes...');
  await client.query(`
    INSERT INTO Scopes (uuid, code, name, description, level) VALUES
    (gen_random_uuid()::text, 'ORGANIZATION', 'Organization', 'Access to all data across organization', 100),
    (gen_random_uuid()::text, 'DEPARTMENT', 'Department', 'Access to own department data only', 50),
    (gen_random_uuid()::text, 'PERSONAL', 'Personal', 'Access to own data only', 10)
  `);
  
  // Insert Roles
  console.log('Inserting Roles...');
  await client.query(`
    INSERT INTO Roles (uuid, code, name, description, default_scope_uuid, hierarchy_level, is_system_role, is_active) VALUES
    (gen_random_uuid()::text, 'SUPER_ADMIN', 'Super Administrator', 'Full system access with all permissions', (SELECT uuid FROM Scopes WHERE code = 'ORGANIZATION'), 100, TRUE, TRUE),
    (gen_random_uuid()::text, 'HR_ADMIN', 'HR Administrator', 'HR management with organization-wide scope', (SELECT uuid FROM Scopes WHERE code = 'ORGANIZATION'), 90, TRUE, TRUE),
    (gen_random_uuid()::text, 'DEPARTMENT_HEAD', 'Department Head', 'Manage department staff', (SELECT uuid FROM Scopes WHERE code = 'DEPARTMENT'), 70, TRUE, TRUE),
    (gen_random_uuid()::text, 'HR_OFFICER', 'HR Officer', 'HR operations staff', (SELECT uuid FROM Scopes WHERE code = 'ORGANIZATION'), 60, TRUE, TRUE),
    (gen_random_uuid()::text, 'EMPLOYEE', 'Employee', 'Regular employee with personal access', (SELECT uuid FROM Scopes WHERE code = 'PERSONAL'), 10, TRUE, TRUE)
  `);
  
  // Insert RoleModules
  console.log('Inserting RoleModules...');
  await client.query(`
    INSERT INTO RoleModules (uuid, role_uuid, module_uuid, scope_uuid)
    SELECT gen_random_uuid()::text, (SELECT uuid FROM Roles WHERE code = 'SUPER_ADMIN'), m.uuid, (SELECT uuid FROM Scopes WHERE code = 'ORGANIZATION')
    FROM Modules m
  `);
  
  await client.query(`
    INSERT INTO RoleModules (uuid, role_uuid, module_uuid, scope_uuid)
    SELECT gen_random_uuid()::text, (SELECT uuid FROM Roles WHERE code = 'HR_ADMIN'), m.uuid, (SELECT uuid FROM Scopes WHERE code = 'ORGANIZATION')
    FROM Modules m WHERE m.code != 'ADMIN'
  `);
  
  await client.query(`
    INSERT INTO RoleModules (uuid, role_uuid, module_uuid, scope_uuid)
    SELECT gen_random_uuid()::text, (SELECT uuid FROM Roles WHERE code = 'DEPARTMENT_HEAD'), m.uuid, (SELECT uuid FROM Scopes WHERE code = 'DEPARTMENT')
    FROM Modules m WHERE m.code IN ('HOME', 'EMPLOYEES', 'ATTENDANCE', 'SHIFTS', 'LEAVE')
  `);
  
  await client.query(`
    INSERT INTO RoleModules (uuid, role_uuid, module_uuid, scope_uuid)
    SELECT gen_random_uuid()::text, (SELECT uuid FROM Roles WHERE code = 'HR_OFFICER'), m.uuid, (SELECT uuid FROM Scopes WHERE code = 'ORGANIZATION')
    FROM Modules m WHERE m.code IN ('HOME', 'EMPLOYEES', 'LETTERS', 'LEAVE')
  `);
  
  await client.query(`
    INSERT INTO RoleModules (uuid, role_uuid, module_uuid, scope_uuid)
    SELECT gen_random_uuid()::text, (SELECT uuid FROM Roles WHERE code = 'EMPLOYEE'), m.uuid, (SELECT uuid FROM Scopes WHERE code = 'PERSONAL')
    FROM Modules m WHERE m.code = 'HOME'
  `);
  
  // Insert Departments
  console.log('Inserting Departments...');
  await client.query(`
    INSERT INTO Departments (uuid, dept_code, name, parent_uuid, is_active) VALUES
    ('d1000001-0000-0000-0000-000000000001', 'MIN-INNOV', 'Ministry of Innovation and Technology', NULL, TRUE),
    ('d1000001-0000-0000-0000-000000000002', 'MIN-FIN', 'Ministry of Finance', NULL, TRUE),
    ('d1000001-0000-0000-0000-000000000003', 'MIN-HEALTH', 'Ministry of Health', NULL, TRUE)
  `);
  
  // Insert ShiftDefinitions
  console.log('Inserting ShiftDefinitions...');
  await client.query(`
    INSERT INTO ShiftDefinitions (uuid, shift_code, name, start_time, end_time, working_days_json, grace_period_minutes, break_duration_minutes) VALUES
    ('s1000001-0000-0000-0000-000000000001', 'SHIFT-DAY', 'Day Shift (8:30 AM - 5:30 PM)', '08:30:00', '17:30:00', '[1,2,3,4,5]', 15, 60),
    ('s1000001-0000-0000-0000-000000000002', 'SHIFT-FLEX', 'Flexible Shift (7:00 AM - 4:00 PM)', '07:00:00', '16:00:00', '[1,2,3,4,5]', 15, 60)
  `);
  
  // Insert Positions
  console.log('Inserting Positions...');
  await client.query(`
    INSERT INTO Positions (uuid, position_code, title, grade, occupation_type, department_uuid, default_shift_uuid) VALUES
    ('p1000001-0000-0000-0000-000000000001', 'POS-MIN', 'Minister', 'Grade 1', 'Executive Leadership', 'd1000001-0000-0000-0000-000000000001', 's1000001-0000-0000-0000-000000000001'),
    ('p1000001-0000-0000-0000-000000000002', 'POS-DIR', 'Director General', 'Grade 2', 'Senior Management', 'd1000001-0000-0000-0000-000000000002', 's1000001-0000-0000-0000-000000000001'),
    ('p1000001-0000-0000-0000-000000000003', 'POS-MGR', 'HR Manager', 'Grade 3', 'Management', 'd1000001-0000-0000-0000-000000000001', 's1000001-0000-0000-0000-000000000001')
  `);
  
  // Insert Levels
  console.log('Inserting Levels...');
  await client.query(`
    INSERT INTO Levels (uuid, level_code, name, description, sort_order, is_active) VALUES
    ('l1000001-0000-0000-0000-000000000001', 'LEVEL-1', 'Level 1 - Executive', 'Executive level compensation', 10, TRUE),
    ('l1000001-0000-0000-0000-000000000002', 'LEVEL-2', 'Level 2 - Senior Management', 'Senior management level', 20, TRUE),
    ('l1000001-0000-0000-0000-000000000003', 'LEVEL-3', 'Level 3 - Management', 'Management level', 30, TRUE)
  `);
  
  // Insert LevelVersions
  console.log('Inserting LevelVersions...');
  await client.query(`
    INSERT INTO LevelVersions (uuid, level_uuid, base_salary, allowances_json, effective_from, effective_to, version_number, notes) VALUES
    ('lv100001-0000-0000-0000-000000000001', 'l1000001-0000-0000-0000-000000000001', 45000.00, '[{"type":"Housing","amount":15000},{"type":"Transport","amount":8000}]', '2024-01-01', NULL, 1, 'Executive level'),
    ('lv100001-0000-0000-0000-000000000002', 'l1000001-0000-0000-0000-000000000002', 35000.00, '[{"type":"Housing","amount":12000},{"type":"Transport","amount":6000}]', '2024-01-01', NULL, 1, 'Senior management'),
    ('lv100001-0000-0000-0000-000000000003', 'l1000001-0000-0000-0000-000000000003', 25000.00, '[{"type":"Housing","amount":8000},{"type":"Transport","amount":4000}]', '2024-01-01', NULL, 1, 'Management')
  `);
  
  // Insert Employees
  console.log('Inserting Employees...');
  await client.query(`
    INSERT INTO Employees (uuid, mesob_id, title, first_name, middle_name, last_name, mother_name, gender, date_of_birth, nationality, tin_number, pension_code, bank_name, bank_account_number, hire_date, prior_gov_service_years, status, position_uuid, department_uuid) VALUES
    ('e1000001-0000-0000-0000-000000000001', 'MESOB-001', 'Ato', 'Abebe', 'Kebede', 'Tadesse', 'Almaz Worku', 'MALE', '1975-03-15', 'Ethiopian', 'TIN0001234567', 'PEN001', 'Commercial Bank of Ethiopia', '1000123456789', '2015-01-10', 5.00, 'ACTIVE', 'p1000001-0000-0000-0000-000000000001', 'd1000001-0000-0000-0000-000000000001'),
    ('e1000001-0000-0000-0000-000000000002', 'MESOB-002', 'W/ro', 'Tigist', 'Alemayehu', 'Bekele', 'Hiwot Hailu', 'FEMALE', '1980-07-22', 'Ethiopian', 'TIN0002345678', 'PEN002', 'Commercial Bank of Ethiopia', '1000234567890', '2016-03-15', 3.00, 'ACTIVE', 'p1000001-0000-0000-0000-000000000002', 'd1000001-0000-0000-0000-000000000002'),
    ('e1000001-0000-0000-0000-000000000003', 'MESOB-003', 'Ato', 'Yohannes', 'Tesfaye', 'Alemu', 'Seble Girma', 'MALE', '1982-11-08', 'Ethiopian', 'TIN0003456789', 'PEN003', 'Commercial Bank of Ethiopia', '1000345678901', '2017-06-20', 2.00, 'ACTIVE', 'p1000001-0000-0000-0000-000000000003', 'd1000001-0000-0000-0000-000000000001')
  `);
  
  // Insert EmployeeAddresses
  console.log('Inserting EmployeeAddresses...');
  await client.query(`
    INSERT INTO EmployeeAddresses (uuid, employee_uuid, address_type, region, zone, woreda, kebele, house_number, phone_primary, email) VALUES
    (gen_random_uuid()::text, 'e1000001-0000-0000-0000-000000000001', 'CURRENT', 'Addis Ababa', 'Addis Ketema', 'Woreda 01', 'Kebele 05', 'H-123', '+251911234567', 'abebe.tadesse@mesob.gov.et'),
    (gen_random_uuid()::text, 'e1000001-0000-0000-0000-000000000002', 'CURRENT', 'Addis Ababa', 'Bole', 'Woreda 03', 'Kebele 12', 'H-456', '+251922345678', 'tigist.bekele@mesob.gov.et'),
    (gen_random_uuid()::text, 'e1000001-0000-0000-0000-000000000003', 'CURRENT', 'Addis Ababa', 'Kirkos', 'Woreda 08', 'Kebele 20', 'H-789', '+251933456789', 'yohannes.alemu@mesob.gov.et')
  `);
  
  // Insert EmployeeLevelHistory
  console.log('Inserting EmployeeLevelHistory...');
  await client.query(`
    INSERT INTO EmployeeLevelHistory (uuid, employee_uuid, level_uuid, level_version_uuid, effective_from, effective_to) VALUES
    (gen_random_uuid()::text, 'e1000001-0000-0000-0000-000000000001', 'l1000001-0000-0000-0000-000000000001', 'lv100001-0000-0000-0000-000000000001', '2015-01-10', NULL),
    (gen_random_uuid()::text, 'e1000001-0000-0000-0000-000000000002', 'l1000001-0000-0000-0000-000000000002', 'lv100001-0000-0000-0000-000000000002', '2016-03-15', NULL),
    (gen_random_uuid()::text, 'e1000001-0000-0000-0000-000000000003', 'l1000001-0000-0000-0000-000000000003', 'lv100001-0000-0000-0000-000000000003', '2017-06-20', NULL)
  `);
  
  // Insert EmployeeShifts
  console.log('Inserting EmployeeShifts...');
  await client.query(`
    INSERT INTO EmployeeShifts (uuid, employee_uuid, shift_uuid, effective_from, effective_to) VALUES
    (gen_random_uuid()::text, 'e1000001-0000-0000-0000-000000000001', 's1000001-0000-0000-0000-000000000002', '2015-01-10', NULL),
    (gen_random_uuid()::text, 'e1000001-0000-0000-0000-000000000002', 's1000001-0000-0000-0000-000000000001', '2016-03-15', NULL),
    (gen_random_uuid()::text, 'e1000001-0000-0000-0000-000000000003', 's1000001-0000-0000-0000-000000000001', '2017-06-20', NULL)
  `);
  
  // Insert Users - Password for all users: mesob2024 (bcrypt hash)
  console.log('Inserting Users...');
  await client.query(`
    INSERT INTO Users (uuid, employee_uuid, user_type, username, password_hash, role_uuid, is_active) VALUES
    ('u1000001-0000-0000-0000-000000000001', 'e1000001-0000-0000-0000-000000000001', 'EMPLOYEE', 'abebe.tadesse', '$2b$10$vI8aWBnW3fID.Zj7.lfIlOJ.1vLoOYsNjzQyX.NjqiIy/1F7L8YxC', (SELECT uuid FROM Roles WHERE code = 'SUPER_ADMIN'), TRUE),
    ('u1000001-0000-0000-0000-000000000002', 'e1000001-0000-0000-0000-000000000002', 'EMPLOYEE', 'tigist.bekele', '$2b$10$vI8aWBnW3fID.Zj7.lfIlOJ.1vLoOYsNjzQyX.NjqiIy/1F7L8YxC', (SELECT uuid FROM Roles WHERE code = 'HR_ADMIN'), TRUE),
    ('u1000001-0000-0000-0000-000000000003', 'e1000001-0000-0000-0000-000000000003', 'EMPLOYEE', 'yohannes.alemu', '$2b$10$vI8aWBnW3fID.Zj7.lfIlOJ.1vLoOYsNjzQyX.NjqiIy/1F7L8YxC', (SELECT uuid FROM Roles WHERE code = 'HR_OFFICER'), TRUE)
  `);
  
  // Insert Leave Types
  console.log('Inserting LeaveTypes...');
  await client.query(`
    INSERT INTO LeaveTypes (code, name, description, default_days_per_year, requires_approval, is_paid, is_active) VALUES
    ('ANNUAL', 'Annual Leave', 'Regular annual vacation leave', 22, TRUE, TRUE, TRUE),
    ('SICK', 'Sick Leave', 'Medical or health-related leave', 15, TRUE, TRUE, TRUE),
    ('MATERNITY', 'Maternity Leave', 'Maternity leave for female employees', 120, TRUE, TRUE, TRUE),
    ('PATERNITY', 'Paternity Leave', 'Paternity leave for male employees', 5, TRUE, TRUE, TRUE),
    ('UNPAID', 'Unpaid Leave', 'Leave without pay', NULL, TRUE, FALSE, TRUE)
  `);
  
  console.log('✅ All seed data inserted successfully!');
}

// Run initialization
initDatabase();
