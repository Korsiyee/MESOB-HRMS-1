#!/usr/bin/env node

/**
 * Fix RBAC Migration - Handle Existing Tables
 * 
 * This script safely migrates existing tables to the RBAC schema
 * by checking what exists and only creating/modifying what's needed.
 */

const db = require('../src/config/db');
const crypto = require('crypto');

// Simple UUID v4 generator (no external dependency)
function generateUUID() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    var r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

// ANSI color codes
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  gray: '\x1b[90m'
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function success(message) {
  log(`✅ ${message}`, 'green');
}

function error(message) {
  log(`❌ ${message}`, 'red');
}

function info(message) {
  log(`ℹ️  ${message}`, 'blue');
}

function warning(message) {
  log(`⚠️  ${message}`, 'yellow');
}

async function checkTableExists(tableName) {
  try {
    const [rows] = await db.query(`
      SELECT COUNT(*) as count 
      FROM information_schema.tables 
      WHERE table_schema = DATABASE() 
      AND table_name = ?
    `, [tableName]);
    return rows[0].count > 0;
  } catch (err) {
    return false;
  }
}

async function checkColumnExists(tableName, columnName) {
  try {
    const [rows] = await db.query(`
      SELECT COUNT(*) as count 
      FROM information_schema.columns 
      WHERE table_schema = DATABASE() 
      AND table_name = ? 
      AND column_name = ?
    `, [tableName, columnName]);
    return rows[0].count > 0;
  } catch (err) {
    return false;
  }
}

async function addColumnSafely(tableName, columnName, columnDefinition) {
  const exists = await checkColumnExists(tableName, columnName);
  if (!exists) {
    await db.query(`ALTER TABLE ?? ADD COLUMN ?? ${columnDefinition}`, [tableName, columnName]);
    success(`Added column ${columnName} to ${tableName}`);
  } else {
    info(`Column ${columnName} already exists in ${tableName}`);
  }
}

async function createTableSafely(tableName, createSQL) {
  const exists = await checkTableExists(tableName);
  if (!exists) {
    await db.query(createSQL);
    success(`Created table ${tableName}`);
  } else {
    info(`Table ${tableName} already exists`);
  }
}

async function fixRoleTable() {
  log('\n🔧 Fixing Roles table...', 'blue');
  
  const exists = await checkTableExists('Roles');
  if (!exists) {
    // Create new Roles table with full RBAC schema
    await db.query(`
      CREATE TABLE Roles (
        uuid VARCHAR(36) PRIMARY KEY,
        code VARCHAR(100) NOT NULL UNIQUE,
        name VARCHAR(255) NOT NULL,
        description TEXT,
        is_system_role BOOLEAN NOT NULL DEFAULT FALSE,
        is_active BOOLEAN NOT NULL DEFAULT TRUE,
        hierarchy_level INT NOT NULL DEFAULT 10,
        can_be_deleted BOOLEAN NOT NULL DEFAULT TRUE,
        created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        created_by VARCHAR(36),
        updated_by VARCHAR(36),
        INDEX idx_roles_code (code),
        INDEX idx_roles_active (is_active),
        INDEX idx_roles_system (is_system_role),
        INDEX idx_roles_hierarchy (hierarchy_level)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
    success('Created new Roles table with RBAC schema');
  } else {
    // Add missing columns to existing Roles table
    await addColumnSafely('Roles', 'uuid', 'VARCHAR(36) PRIMARY KEY');
    await addColumnSafely('Roles', 'code', 'VARCHAR(100) NOT NULL UNIQUE');
    await addColumnSafely('Roles', 'description', 'TEXT');
    await addColumnSafely('Roles', 'is_system_role', 'BOOLEAN NOT NULL DEFAULT FALSE');
    await addColumnSafely('Roles', 'hierarchy_level', 'INT NOT NULL DEFAULT 10');
    await addColumnSafely('Roles', 'can_be_deleted', 'BOOLEAN NOT NULL DEFAULT TRUE');
    await addColumnSafely('Roles', 'created_by', 'VARCHAR(36)');
    await addColumnSafely('Roles', 'updated_by', 'VARCHAR(36)');
    
    // Update existing roles with UUIDs if they don't have them
    const [existingRoles] = await db.query('SELECT * FROM Roles LIMIT 1');
    if (existingRoles.length > 0 && !existingRoles[0].uuid) {
      const [roles] = await db.query('SELECT * FROM Roles WHERE uuid IS NULL OR uuid = ""');
      for (const role of roles) {
        const uuid = generateUUID();
        const code = role.name ? role.name.toUpperCase().replace(/\s+/g, '_') : `ROLE_${Date.now()}`;
        await db.query(
          'UPDATE Roles SET uuid = ?, code = ? WHERE id = ?',
          [uuid, code, role.id]
        );
      }
      success(`Updated ${roles.length} existing roles with UUIDs`);
    }
  }
}

async function createMissingTables() {
  log('\n🏗️  Creating missing RBAC tables...', 'blue');
  
  // Resources table
  await createTableSafely('Resources', `
    CREATE TABLE Resources (
      uuid VARCHAR(36) PRIMARY KEY,
      code VARCHAR(100) NOT NULL UNIQUE,
      name VARCHAR(255) NOT NULL,
      description TEXT,
      category VARCHAR(100) DEFAULT 'GENERAL',
      display_order INT NOT NULL DEFAULT 0,
      is_active BOOLEAN NOT NULL DEFAULT TRUE,
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      INDEX idx_resources_code (code),
      INDEX idx_resources_active (is_active),
      INDEX idx_resources_category (category)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);

  // Permissions table
  await createTableSafely('Permissions', `
    CREATE TABLE Permissions (
      uuid VARCHAR(36) PRIMARY KEY,
      name VARCHAR(255) NOT NULL UNIQUE,
      resource_uuid VARCHAR(36) NOT NULL,
      action VARCHAR(100) NOT NULL,
      description TEXT,
      is_active BOOLEAN NOT NULL DEFAULT TRUE,
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      FOREIGN KEY (resource_uuid) REFERENCES Resources(uuid) ON DELETE CASCADE,
      INDEX idx_permissions_name (name),
      INDEX idx_permissions_resource (resource_uuid),
      INDEX idx_permissions_action (action),
      UNIQUE KEY uk_permissions_resource_action (resource_uuid, action)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);

  // RolePermissions table
  await createTableSafely('RolePermissions', `
    CREATE TABLE RolePermissions (
      uuid VARCHAR(36) PRIMARY KEY,
      role_uuid VARCHAR(36) NOT NULL,
      permission_uuid VARCHAR(36) NOT NULL,
      granted_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      granted_by VARCHAR(36),
      FOREIGN KEY (role_uuid) REFERENCES Roles(uuid) ON DELETE CASCADE,
      FOREIGN KEY (permission_uuid) REFERENCES Permissions(uuid) ON DELETE CASCADE,
      UNIQUE KEY uk_role_permission (role_uuid, permission_uuid),
      INDEX idx_role_permissions_role (role_uuid),
      INDEX idx_role_permissions_permission (permission_uuid)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);

  // DataScopes table
  await createTableSafely('DataScopes', `
    CREATE TABLE DataScopes (
      uuid VARCHAR(36) PRIMARY KEY,
      code VARCHAR(100) NOT NULL UNIQUE,
      name VARCHAR(255) NOT NULL,
      description TEXT,
      sql_template TEXT,
      parameters JSON,
      is_active BOOLEAN NOT NULL DEFAULT TRUE,
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      INDEX idx_data_scopes_code (code),
      INDEX idx_data_scopes_active (is_active)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);

  // RolePermissionScopes table
  await createTableSafely('RolePermissionScopes', `
    CREATE TABLE RolePermissionScopes (
      uuid VARCHAR(36) PRIMARY KEY,
      role_uuid VARCHAR(36) NOT NULL,
      permission_uuid VARCHAR(36) NOT NULL,
      data_scope_uuid VARCHAR(36) NOT NULL,
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      created_by VARCHAR(36),
      FOREIGN KEY (role_uuid) REFERENCES Roles(uuid) ON DELETE CASCADE,
      FOREIGN KEY (permission_uuid) REFERENCES Permissions(uuid) ON DELETE CASCADE,
      FOREIGN KEY (data_scope_uuid) REFERENCES DataScopes(uuid) ON DELETE CASCADE,
      UNIQUE KEY uk_role_permission_scope (role_uuid, permission_uuid, data_scope_uuid),
      INDEX idx_rps_role (role_uuid),
      INDEX idx_rps_permission (permission_uuid),
      INDEX idx_rps_scope (data_scope_uuid)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);

  // UserPermissionOverrides table
  await createTableSafely('UserPermissionOverrides', `
    CREATE TABLE UserPermissionOverrides (
      uuid VARCHAR(36) PRIMARY KEY,
      user_uuid VARCHAR(36) NOT NULL,
      permission_uuid VARCHAR(36) NOT NULL,
      override_type ENUM('ALLOW', 'DENY') NOT NULL,
      reason TEXT,
      expires_at DATETIME,
      is_active BOOLEAN NOT NULL DEFAULT TRUE,
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      created_by VARCHAR(36),
      FOREIGN KEY (permission_uuid) REFERENCES Permissions(uuid) ON DELETE CASCADE,
      INDEX idx_upo_user (user_uuid),
      INDEX idx_upo_permission (permission_uuid),
      INDEX idx_upo_active (is_active),
      INDEX idx_upo_expires (expires_at)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);

  // UserScopeOverrides table
  await createTableSafely('UserScopeOverrides', `
    CREATE TABLE UserScopeOverrides (
      uuid VARCHAR(36) PRIMARY KEY,
      user_uuid VARCHAR(36) NOT NULL,
      permission_uuid VARCHAR(36) NOT NULL,
      data_scope_uuid VARCHAR(36) NOT NULL,
      reason TEXT,
      expires_at DATETIME,
      is_active BOOLEAN NOT NULL DEFAULT TRUE,
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      created_by VARCHAR(36),
      FOREIGN KEY (permission_uuid) REFERENCES Permissions(uuid) ON DELETE CASCADE,
      FOREIGN KEY (data_scope_uuid) REFERENCES DataScopes(uuid) ON DELETE CASCADE,
      INDEX idx_uso_user (user_uuid),
      INDEX idx_uso_permission (permission_uuid),
      INDEX idx_uso_scope (data_scope_uuid),
      INDEX idx_uso_active (is_active)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);

  // PermissionDelegations table
  await createTableSafely('PermissionDelegations', `
    CREATE TABLE PermissionDelegations (
      uuid VARCHAR(36) PRIMARY KEY,
      from_user_uuid VARCHAR(36) NOT NULL,
      to_user_uuid VARCHAR(36) NOT NULL,
      permission_uuid VARCHAR(36) NOT NULL,
      start_date DATETIME NOT NULL,
      end_date DATETIME NOT NULL,
      reason TEXT,
      is_active BOOLEAN NOT NULL DEFAULT TRUE,
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      created_by VARCHAR(36),
      FOREIGN KEY (permission_uuid) REFERENCES Permissions(uuid) ON DELETE CASCADE,
      INDEX idx_pd_from_user (from_user_uuid),
      INDEX idx_pd_to_user (to_user_uuid),
      INDEX idx_pd_permission (permission_uuid),
      INDEX idx_pd_active (is_active),
      INDEX idx_pd_dates (start_date, end_date)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);

  // AuthorizationAuditLogs table
  await createTableSafely('AuthorizationAuditLogs', `
    CREATE TABLE AuthorizationAuditLogs (
      id BIGINT AUTO_INCREMENT PRIMARY KEY,
      action VARCHAR(100) NOT NULL,
      resource_type VARCHAR(100),
      resource_uuid VARCHAR(36),
      description TEXT,
      performed_by VARCHAR(36) NOT NULL,
      performed_by_name VARCHAR(255),
      ip_address VARCHAR(45),
      user_agent TEXT,
      request_data JSON,
      response_data JSON,
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      INDEX idx_aal_action (action),
      INDEX idx_aal_resource (resource_type, resource_uuid),
      INDEX idx_aal_performed_by (performed_by),
      INDEX idx_aal_created_at (created_at)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);
}

async function updateUsersTable() {
  log('\n👤 Updating Users table...', 'blue');
  
  const hasRoleUuid = await checkColumnExists('Users', 'role_uuid');
  const hasPermissionsVersion = await checkColumnExists('Users', 'permissions_version');
  
  if (!hasRoleUuid) {
    await addColumnSafely('Users', 'role_uuid', 'VARCHAR(36)');
    // Add foreign key constraint
    try {
      await db.query('ALTER TABLE Users ADD FOREIGN KEY (role_uuid) REFERENCES Roles(uuid)');
      success('Added role_uuid foreign key constraint to Users');
    } catch (err) {
      warning('Could not add foreign key constraint (may already exist)');
    }
  }
  
  if (!hasPermissionsVersion) {
    await addColumnSafely('Users', 'permissions_version', 'INT NOT NULL DEFAULT 1');
  }
}

async function seedData() {
  log('\n🌱 Seeding initial data...', 'blue');
  
  // Check if data already exists
  const [existingRoles] = await db.query('SELECT COUNT(*) as count FROM Roles');
  const [existingResources] = await db.query('SELECT COUNT(*) as count FROM Resources');
  
  if (existingRoles[0].count > 0 && existingResources[0].count > 0) {
    info('Data already exists, skipping seed');
    return;
  }

  // System roles
  const systemRoles = [
    {
      uuid: generateUUID(),
      code: 'SUPER_ADMIN',
      name: 'Super Admin',
      description: 'Full system access with all permissions',
      is_system_role: true,
      hierarchy_level: 100,
      can_be_deleted: false
    },
    {
      uuid: generateUUID(),
      code: 'HR_ADMIN',
      name: 'HR Admin',
      description: 'Human Resources administrator with broad HR permissions',
      is_system_role: true,
      hierarchy_level: 90,
      can_be_deleted: false
    },
    {
      uuid: generateUUID(),
      code: 'DEPARTMENT_HEAD',
      name: 'Department Head',
      description: 'Department manager with team management capabilities',
      is_system_role: true,
      hierarchy_level: 70,
      can_be_deleted: false
    },
    {
      uuid: generateUUID(),
      code: 'HR_OFFICER',
      name: 'HR Officer',
      description: 'HR staff with limited administrative permissions',
      is_system_role: true,
      hierarchy_level: 60,
      can_be_deleted: false
    },
    {
      uuid: generateUUID(),
      code: 'EMPLOYEE',
      name: 'Employee',
      description: 'Standard employee with self-service permissions',
      is_system_role: true,
      hierarchy_level: 10,
      can_be_deleted: false
    }
  ];

  // Insert roles
  for (const role of systemRoles) {
    try {
      await db.query(
        'INSERT INTO Roles (uuid, code, name, description, is_system_role, hierarchy_level, can_be_deleted) VALUES (?, ?, ?, ?, ?, ?, ?)',
        [role.uuid, role.code, role.name, role.description, role.is_system_role, role.hierarchy_level, role.can_be_deleted]
      );
    } catch (err) {
      if (err.code === 'ER_DUP_ENTRY') {
        info(`Role ${role.code} already exists`);
      } else {
        throw err;
      }
    }
  }
  success(`Seeded ${systemRoles.length} system roles`);

  // Resources
  const resources = [
    { code: 'EMPLOYEES', name: 'Employees', description: 'Employee management and information', category: 'CORE' },
    { code: 'DEPARTMENTS', name: 'Departments', description: 'Department structure and management', category: 'CORE' },
    { code: 'POSITIONS', name: 'Positions', description: 'Job positions and titles', category: 'CORE' },
    { code: 'LEVELS', name: 'Levels', description: 'Employee levels and grades', category: 'CORE' },
    { code: 'ATTENDANCE', name: 'Attendance', description: 'Time tracking and attendance management', category: 'WORKFORCE' },
    { code: 'LEAVE', name: 'Leave', description: 'Leave requests and approval workflow', category: 'WORKFORCE' },
    { code: 'SHIFTS', name: 'Shifts', description: 'Work shifts and scheduling', category: 'WORKFORCE' },
    { code: 'LETTERS', name: 'Letters', description: 'Official letters and document generation', category: 'DOCUMENTS' },
    { code: 'ACCOUNTS', name: 'Accounts', description: 'User account management', category: 'ADMIN' },
    { code: 'USERS', name: 'Users', description: 'System user management', category: 'ADMIN' },
    { code: 'ROLES', name: 'Roles', description: 'Role and permission management', category: 'ADMIN' },
    { code: 'PERMISSIONS', name: 'Permissions', description: 'Permission system management', category: 'ADMIN' },
    { code: 'POLICIES', name: 'Policies', description: 'Company policies and rules', category: 'ADMIN' },
    { code: 'HOLIDAYS', name: 'Holidays', description: 'Holiday calendar management', category: 'ADMIN' },
    { code: 'REPORTS', name: 'Reports', description: 'Report generation and analytics', category: 'REPORTS' },
    { code: 'AUDITLOGS', name: 'Audit Logs', description: 'System audit and activity logs', category: 'ADMIN' },
    { code: 'NETWORKSETTINGS', name: 'Network Settings', description: 'Network and system configuration', category: 'ADMIN' },
    { code: 'NOTIFICATIONS', name: 'Notifications', description: 'System notifications and alerts', category: 'GENERAL' },
    { code: 'SYSTEM', name: 'System', description: 'Core system operations', category: 'ADMIN' },
    { code: 'DASHBOARD', name: 'Dashboard', description: 'Dashboard and overview access', category: 'GENERAL' }
  ];

  for (const resource of resources) {
    const uuid = generateUUID();
    try {
      await db.query(
        'INSERT INTO Resources (uuid, code, name, description, category) VALUES (?, ?, ?, ?, ?)',
        [uuid, resource.code, resource.name, resource.description, resource.category]
      );
    } catch (err) {
      if (err.code === 'ER_DUP_ENTRY') {
        info(`Resource ${resource.code} already exists`);
      } else {
        throw err;
      }
    }
  }
  success(`Seeded ${resources.length} resources`);

  // Data scopes
  const dataScopes = [
    {
      code: 'ALL',
      name: 'All Records',
      description: 'Access to all records without restriction',
      sql_template: '1=1'
    },
    {
      code: 'DEPARTMENT',
      name: 'Department Only',
      description: 'Access limited to user\'s department',
      sql_template: 'department_uuid = ?'
    },
    {
      code: 'SELF',
      name: 'Self Only',
      description: 'Access limited to user\'s own records',
      sql_template: 'user_uuid = ?'
    },
    {
      code: 'SUBORDINATES',
      name: 'Direct Reports',
      description: 'Access to direct subordinates only',
      sql_template: 'manager_uuid = ?'
    },
    {
      code: 'DEPARTMENT_AND_SUBORDINATES',
      name: 'Department + Subordinates',
      description: 'Access to department and direct reports',
      sql_template: 'department_uuid = ? OR manager_uuid = ?'
    },
    {
      code: 'ASSIGNED',
      name: 'Assigned Records',
      description: 'Access to explicitly assigned records',
      sql_template: 'uuid IN (?)'
    },
    {
      code: 'NONE',
      name: 'No Access',
      description: 'No access to any records',
      sql_template: '1=0'
    },
    {
      code: 'CUSTOM',
      name: 'Custom Scope',
      description: 'Administrator-defined custom access scope',
      sql_template: 'custom_condition'
    }
  ];

  for (const scope of dataScopes) {
    const uuid = generateUUID();
    try {
      await db.query(
        'INSERT INTO DataScopes (uuid, code, name, description, sql_template) VALUES (?, ?, ?, ?, ?)',
        [uuid, scope.code, scope.name, scope.description, scope.sql_template]
      );
    } catch (err) {
      if (err.code === 'ER_DUP_ENTRY') {
        info(`Data scope ${scope.code} already exists`);
      } else {
        throw err;
      }
    }
  }
  success(`Seeded ${dataScopes.length} data scopes`);

  success('Initial data seeding completed!');
}

async function main() {
  try {
    log('\n🔧 RBAC Migration Fix', 'blue');
    log('='.repeat(50), 'blue');

    await fixRoleTable();
    await createMissingTables();
    await updateUsersTable();
    await seedData();

    log('\n✅ RBAC Migration Fix Complete!', 'green');
    log('\nNext steps:', 'yellow');
    log('1. Run: node scripts/checkRBACTables.js', 'gray');
    log('2. Run: node scripts/testRBACSystem.js', 'gray');
    log('3. Start your backend: npm start', 'gray');

    process.exit(0);
  } catch (err) {
    error(`Migration failed: ${err.message}`);
    console.error(err);
    process.exit(1);
  }
}

main();