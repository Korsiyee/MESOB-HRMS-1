/**
 * Database initialization controller
 * Provides endpoint to initialize database via HTTP request
 */

const { autoInitDatabase } = require('../../scripts/autoInitDb');
const { Pool } = require('pg');

/**
 * Initialize database via HTTP endpoint
 * GET /api/init/database?secret=YOUR_SECRET
 */
async function initializeDatabaseViaHTTP(req, res) {
  try {
    // Simple security check - require a secret query parameter
    const secret = req.query.secret;
    const expectedSecret = process.env.INIT_SECRET || 'mesob-init-2024';
    
    if (secret !== expectedSecret) {
      return res.status(403).json({
        success: false,
        message: 'Forbidden: Invalid initialization secret'
      });
    }
    
    console.log('🚀 HTTP Database Initialization Request Received');
    
    const DATABASE_URL = process.env.DATABASE_URL;
    
    if (!DATABASE_URL) {
      return res.status(500).json({
        success: false,
        message: 'DATABASE_URL not configured'
      });
    }
    
    const pool = new Pool({
      connectionString: DATABASE_URL,
      ssl: {
        rejectUnauthorized: false
      }
    });
    
    const client = await pool.connect();
    
    // Check if already initialized
    const checkResult = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' AND table_name = 'users'
    `);
    
    if (checkResult.rows.length > 0) {
      client.release();
      await pool.end();
      return res.status(200).json({
        success: true,
        message: 'Database already initialized',
        alreadyInitialized: true
      });
    }
    
    // Run initialization
    console.log('📝 Starting database initialization...');
    
    // Import and run the initialization
    const initModule = require('../../scripts/initPostgresDb');
    
    // Since initPostgresDb is a standalone script, we need to inline the logic here
    await runFullInitialization(client);
    
    client.release();
    await pool.end();
    
    console.log('✅ Database initialized successfully via HTTP');
    
    return res.status(200).json({
      success: true,
      message: 'Database initialized successfully!',
      credentials: {
        username: 'abebe.tadesse',
        password: 'mesob2024'
      }
    });
    
  } catch (error) {
    console.error('❌ HTTP initialization failed:', error);
    return res.status(500).json({
      success: false,
      message: 'Initialization failed',
      error: error.message
    });
  }
}

/**
 * Run full database initialization
 */
async function runFullInitialization(client) {
  // Create extension
  await client.query('CREATE EXTENSION IF NOT EXISTS "pgcrypto"');
  
  // Create tables (truncated for brevity - using key tables only)
  console.log('Creating tables...');
  
  // Drop all tables first to ensure clean state
  await client.query(`DROP TABLE IF EXISTS LetterAttachments CASCADE`);
  await client.query(`DROP TABLE IF EXISTS LetterRequests CASCADE`);
  await client.query(`DROP TABLE IF EXISTS LetterTemplates CASCADE`);
  await client.query(`DROP TABLE IF EXISTS LetterReferenceSequence CASCADE`);
  await client.query(`DROP TABLE IF EXISTS PolicyAcknowledgments CASCADE`);
  await client.query(`DROP TABLE IF EXISTS PolicyVersions CASCADE`);
  await client.query(`DROP TABLE IF EXISTS Policies CASCADE`);
  await client.query(`DROP TABLE IF EXISTS Notifications CASCADE`);
  await client.query(`DROP TABLE IF EXISTS LeaveBalances CASCADE`);
  await client.query(`DROP TABLE IF EXISTS LeaveApplications CASCADE`);
  await client.query(`DROP TABLE IF EXISTS LeaveTypes CASCADE`);
  await client.query(`DROP TABLE IF EXISTS PublicHolidays CASCADE`);
  await client.query(`DROP TABLE IF EXISTS AttendanceRecords CASCADE`);
  await client.query(`DROP TABLE IF EXISTS EmployeeShifts CASCADE`);
  await client.query(`DROP TABLE IF EXISTS FaceEncodings CASCADE`);
  await client.query(`DROP TABLE IF EXISTS EmployeeLevelHistory CASCADE`);
  await client.query(`DROP TABLE IF EXISTS EmployeeIDDocuments CASCADE`);
  await client.query(`DROP TABLE IF EXISTS EmployeeAddresses CASCADE`);
  await client.query(`DROP TABLE IF EXISTS Employees CASCADE`);
  await client.query(`DROP TABLE IF EXISTS Users CASCADE`);
  await client.query(`DROP TABLE IF EXISTS LevelVersions CASCADE`);
  await client.query(`DROP TABLE IF EXISTS Levels CASCADE`);
  await client.query(`DROP TABLE IF EXISTS DepartmentLeadership CASCADE`);
  await client.query(`DROP TABLE IF EXISTS Positions CASCADE`);
  await client.query(`DROP TABLE IF EXISTS ShiftDefinitions CASCADE`);
  await client.query(`DROP TABLE IF EXISTS Departments CASCADE`);
  await client.query(`DROP TABLE IF EXISTS RoleModules CASCADE`);
  await client.query(`DROP TABLE IF EXISTS Roles CASCADE`);
  await client.query(`DROP TABLE IF EXISTS Scopes CASCADE`);
  await client.query(`DROP TABLE IF EXISTS Modules CASCADE`);
  await client.query(`DROP TABLE IF EXISTS SystemSettings CASCADE`);
  await client.query(`DROP TABLE IF EXISTS NetworkSettings CASCADE`);
  
  console.log('Dropped existing tables...');
  
  // System tables
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
  
  // Modules
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
  
  // Scopes
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
  
  // Roles
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
  
  // RoleModules
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
  
  // Departments
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
  
  // ShiftDefinitions
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
  
  // Positions
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
  
  // Levels
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
  
  // LevelVersions
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
  
  // Users
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
  
  // Add employee foreign key to Users
  await client.query(`
    ALTER TABLE Users 
    ADD CONSTRAINT fk_users_employee 
    FOREIGN KEY (employee_uuid) REFERENCES Employees(uuid) ON DELETE CASCADE
  `);
  
  console.log('Inserting seed data...');
  
  // Insert Modules
  await client.query(`
    INSERT INTO Modules (uuid, code, name, description, icon, display_order, is_active) 
    VALUES
    (gen_random_uuid()::text, 'HOME', 'Home', 'Dashboard and overview', 'LayoutDashboard', 0, TRUE),
    (gen_random_uuid()::text, 'EMPLOYEES', 'Employees', 'Employee management', 'Users', 10, TRUE),
    (gen_random_uuid()::text, 'ATTENDANCE', 'Attendance', 'Attendance tracking', 'Clock', 20, TRUE),
    (gen_random_uuid()::text, 'LEAVE', 'Leave', 'Leave management', 'Calendar', 40, TRUE),
    (gen_random_uuid()::text, 'ADMIN', 'Administration', 'System administration', 'Settings', 90, TRUE)
    ON CONFLICT (code) DO NOTHING
  `);
  
  // Insert Scopes
  await client.query(`
    INSERT INTO Scopes (uuid, code, name, description, level) VALUES
    (gen_random_uuid()::text, 'ORGANIZATION', 'Organization', 'Access to all data across organization', 100),
    (gen_random_uuid()::text, 'DEPARTMENT', 'Department', 'Access to own department data only', 50),
    (gen_random_uuid()::text, 'PERSONAL', 'Personal', 'Access to own data only', 10)
    ON CONFLICT (code) DO NOTHING
  `);
  
  // Insert Roles
  await client.query(`
    INSERT INTO Roles (uuid, code, name, description, default_scope_uuid, hierarchy_level, is_system_role, is_active) VALUES
    (gen_random_uuid()::text, 'SUPER_ADMIN', 'Super Administrator', 'Full system access', (SELECT uuid FROM Scopes WHERE code = 'ORGANIZATION'), 100, TRUE, TRUE),
    (gen_random_uuid()::text, 'HR_ADMIN', 'HR Administrator', 'HR management', (SELECT uuid FROM Scopes WHERE code = 'ORGANIZATION'), 90, TRUE, TRUE),
    (gen_random_uuid()::text, 'EMPLOYEE', 'Employee', 'Regular employee', (SELECT uuid FROM Scopes WHERE code = 'PERSONAL'), 10, TRUE, TRUE)
    ON CONFLICT (code) DO NOTHING
  `);
  
  // Insert RoleModules
  await client.query(`
    INSERT INTO RoleModules (uuid, role_uuid, module_uuid, scope_uuid)
    SELECT gen_random_uuid()::text, (SELECT uuid FROM Roles WHERE code = 'SUPER_ADMIN'), m.uuid, (SELECT uuid FROM Scopes WHERE code = 'ORGANIZATION')
    FROM Modules m
    ON CONFLICT (role_uuid, module_uuid) DO NOTHING
  `);
  
  // Insert Departments
  await client.query(`
    INSERT INTO Departments (uuid, dept_code, name, is_active) VALUES
    ('d1000001-0000-0000-0000-000000000001', 'MIN-INNOV', 'Ministry of Innovation', TRUE)
    ON CONFLICT (dept_code) DO NOTHING
  `);
  
  // Insert Shifts
  await client.query(`
    INSERT INTO ShiftDefinitions (uuid, shift_code, name, start_time, end_time, working_days_json, grace_period_minutes, break_duration_minutes) VALUES
    ('s1000001-0000-0000-0000-000000000001', 'SHIFT-DAY', 'Day Shift', '08:30:00', '17:30:00', '[1,2,3,4,5]', 15, 60)
    ON CONFLICT (shift_code) DO NOTHING
  `);
  
  // Insert Positions
  await client.query(`
    INSERT INTO Positions (uuid, position_code, title, department_uuid, default_shift_uuid) VALUES
    ('p1000001-0000-0000-0000-000000000001', 'POS-MIN', 'Minister', 'd1000001-0000-0000-0000-000000000001', 's1000001-0000-0000-0000-000000000001')
    ON CONFLICT (position_code) DO NOTHING
  `);
  
  // Insert Levels
  await client.query(`
    INSERT INTO Levels (uuid, level_code, name, description, sort_order) VALUES
    ('l1000001-0000-0000-0000-000000000001', 'LEVEL-1', 'Level 1', 'Executive level', 10)
    ON CONFLICT (level_code) DO NOTHING
  `);
  
  // Insert LevelVersions
  await client.query(`
    INSERT INTO LevelVersions (uuid, level_uuid, base_salary, effective_from, version_number) VALUES
    ('lv100001-0000-0000-0000-000000000001', 'l1000001-0000-0000-0000-000000000001', 45000.00, '2024-01-01', 1)
    ON CONFLICT DO NOTHING
  `);
  
  // Insert Employee
  await client.query(`
    INSERT INTO Employees (uuid, mesob_id, title, first_name, middle_name, last_name, hire_date, status, position_uuid, department_uuid) VALUES
    ('e1000001-0000-0000-0000-000000000001', 'MESOB-001', 'Ato', 'Abebe', 'Kebede', 'Tadesse', '2015-01-10', 'ACTIVE', 'p1000001-0000-0000-0000-000000000001', 'd1000001-0000-0000-0000-000000000001')
    ON CONFLICT (mesob_id) DO NOTHING
  `);
  
  // Insert User - Password: mesob2024
  await client.query(`
    INSERT INTO Users (uuid, employee_uuid, username, password_hash, role_uuid, is_active) VALUES
    ('u1000001-0000-0000-0000-000000000001', 'e1000001-0000-0000-0000-000000000001', 'abebe.tadesse', '$2b$10$vI8aWBnW3fID.Zj7.lfIlOJ.1vLoOYsNjzQyX.NjqiIy/1F7L8YxC', (SELECT uuid FROM Roles WHERE code = 'SUPER_ADMIN'), TRUE)
    ON CONFLICT (username) DO NOTHING
  `);
  
  console.log('✅ Initialization complete!');
}

module.exports = {
  initializeDatabaseViaHTTP
};
