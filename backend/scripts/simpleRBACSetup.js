#!/usr/bin/env node

/**
 * Simple RBAC Setup - Direct SQL Execution
 * This script manually creates the RBAC tables with direct SQL
 */

require('dotenv').config();
const mysql = require('mysql2/promise');

async function setupRBAC() {
  let connection;
  
  try {
    console.log('🔗 Connecting to database...');
    
    // Create connection
    connection = await mysql.createConnection({
      host: process.env.DB_HOST || 'localhost',
      user: process.env.DB_USER || 'mesob',
      password: process.env.DB_PASSWORD || 'mesob_password',
      database: process.env.DB_NAME || 'mesob_hrms',
      multipleStatements: true
    });

    console.log('✅ Connected to database');

    // Step 1: Create all RBAC tables
    console.log('\n🏗️  Creating RBAC tables...');
    
    const createTablesSQL = `
      -- Drop existing foreign key constraints first (if any)
      SET FOREIGN_KEY_CHECKS = 0;

      -- 1. Resources table
      CREATE TABLE IF NOT EXISTS Resources (
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
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

      -- 2. Permissions table  
      CREATE TABLE IF NOT EXISTS Permissions (
        uuid VARCHAR(36) PRIMARY KEY,
        name VARCHAR(255) NOT NULL UNIQUE,
        resource_uuid VARCHAR(36) NOT NULL,
        action VARCHAR(100) NOT NULL,
        description TEXT,
        is_active BOOLEAN NOT NULL DEFAULT TRUE,
        created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_permissions_name (name),
        INDEX idx_permissions_resource (resource_uuid),
        INDEX idx_permissions_action (action),
        UNIQUE KEY uk_permissions_resource_action (resource_uuid, action)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

      -- 3. Update existing Roles table
      ALTER TABLE Roles 
        ADD COLUMN IF NOT EXISTS uuid VARCHAR(36),
        ADD COLUMN IF NOT EXISTS code VARCHAR(100),
        ADD COLUMN IF NOT EXISTS description TEXT,
        ADD COLUMN IF NOT EXISTS is_system_role BOOLEAN NOT NULL DEFAULT FALSE,
        ADD COLUMN IF NOT EXISTS hierarchy_level INT NOT NULL DEFAULT 10,
        ADD COLUMN IF NOT EXISTS can_be_deleted BOOLEAN NOT NULL DEFAULT TRUE,
        ADD COLUMN IF NOT EXISTS created_by VARCHAR(36),
        ADD COLUMN IF NOT EXISTS updated_by VARCHAR(36);

      -- 4. RolePermissions table
      CREATE TABLE IF NOT EXISTS RolePermissions (
        uuid VARCHAR(36) PRIMARY KEY,
        role_uuid VARCHAR(36) NOT NULL,
        permission_uuid VARCHAR(36) NOT NULL,
        granted_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        granted_by VARCHAR(36),
        UNIQUE KEY uk_role_permission (role_uuid, permission_uuid),
        INDEX idx_role_permissions_role (role_uuid),
        INDEX idx_role_permissions_permission (permission_uuid)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

      -- 5. DataScopes table
      CREATE TABLE IF NOT EXISTS DataScopes (
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
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

      -- 6. RolePermissionScopes table
      CREATE TABLE IF NOT EXISTS RolePermissionScopes (
        uuid VARCHAR(36) PRIMARY KEY,
        role_uuid VARCHAR(36) NOT NULL,
        permission_uuid VARCHAR(36) NOT NULL,
        data_scope_uuid VARCHAR(36) NOT NULL,
        created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        created_by VARCHAR(36),
        UNIQUE KEY uk_role_permission_scope (role_uuid, permission_uuid, data_scope_uuid),
        INDEX idx_rps_role (role_uuid),
        INDEX idx_rps_permission (permission_uuid),
        INDEX idx_rps_scope (data_scope_uuid)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

      -- 7. UserPermissionOverrides table
      CREATE TABLE IF NOT EXISTS UserPermissionOverrides (
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
        INDEX idx_upo_user (user_uuid),
        INDEX idx_upo_permission (permission_uuid),
        INDEX idx_upo_active (is_active),
        INDEX idx_upo_expires (expires_at)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

      -- 8. UserScopeOverrides table
      CREATE TABLE IF NOT EXISTS UserScopeOverrides (
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
        INDEX idx_uso_user (user_uuid),
        INDEX idx_uso_permission (permission_uuid),
        INDEX idx_uso_scope (data_scope_uuid),
        INDEX idx_uso_active (is_active)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

      -- 9. PermissionDelegations table
      CREATE TABLE IF NOT EXISTS PermissionDelegations (
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
        INDEX idx_pd_from_user (from_user_uuid),
        INDEX idx_pd_to_user (to_user_uuid),
        INDEX idx_pd_permission (permission_uuid),
        INDEX idx_pd_active (is_active),
        INDEX idx_pd_dates (start_date, end_date)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

      -- 10. AuthorizationAuditLogs table
      CREATE TABLE IF NOT EXISTS AuthorizationAuditLogs (
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
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

      -- 11. Update Users table
      ALTER TABLE Users 
        ADD COLUMN IF NOT EXISTS role_uuid VARCHAR(36),
        ADD COLUMN IF NOT EXISTS permissions_version INT NOT NULL DEFAULT 1;

      SET FOREIGN_KEY_CHECKS = 1;
    `;

    await connection.execute(createTablesSQL);
    console.log('✅ RBAC tables created successfully');

    // Step 2: Insert seed data
    console.log('\n🌱 Inserting seed data...');

    // Generate simple UUIDs
    function generateUUID() {
      return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
        var r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16);
      });
    }

    // Resources data
    const resources = [
      { uuid: generateUUID(), code: 'EMPLOYEES', name: 'Employees', description: 'Employee management' },
      { uuid: generateUUID(), code: 'DEPARTMENTS', name: 'Departments', description: 'Department management' },
      { uuid: generateUUID(), code: 'ATTENDANCE', name: 'Attendance', description: 'Attendance tracking' },
      { uuid: generateUUID(), code: 'LEAVE', name: 'Leave', description: 'Leave management' },
      { uuid: generateUUID(), code: 'ROLES', name: 'Roles', description: 'Role management' },
      { uuid: generateUUID(), code: 'PERMISSIONS', name: 'Permissions', description: 'Permission management' },
      { uuid: generateUUID(), code: 'REPORTS', name: 'Reports', description: 'Report generation' },
      { uuid: generateUUID(), code: 'SYSTEM', name: 'System', description: 'System administration' }
    ];

    // Insert resources
    for (const resource of resources) {
      await connection.execute(
        'INSERT IGNORE INTO Resources (uuid, code, name, description) VALUES (?, ?, ?, ?)',
        [resource.uuid, resource.code, resource.name, resource.description]
      );
    }

    // Create permissions for each resource
    const actions = ['View', 'Create', 'Update', 'Delete', 'Manage'];
    const permissions = [];

    for (const resource of resources) {
      for (const action of actions) {
        const permUuid = generateUUID();
        const permName = `${resource.name}.${action}`;
        permissions.push({
          uuid: permUuid,
          name: permName,
          resource_uuid: resource.uuid,
          action: action,
          description: `${action} ${resource.name.toLowerCase()}`
        });
      }
    }

    // Insert permissions
    for (const permission of permissions) {
      await connection.execute(
        'INSERT IGNORE INTO Permissions (uuid, name, resource_uuid, action, description) VALUES (?, ?, ?, ?, ?)',
        [permission.uuid, permission.name, permission.resource_uuid, permission.action, permission.description]
      );
    }

    // Data scopes
    const dataScopes = [
      { uuid: generateUUID(), code: 'ALL', name: 'All Records', description: 'Full access', sql_template: '1=1' },
      { uuid: generateUUID(), code: 'DEPARTMENT', name: 'Department Only', description: 'Department scope', sql_template: 'department_uuid = ?' },
      { uuid: generateUUID(), code: 'SELF', name: 'Self Only', description: 'Own records only', sql_template: 'user_uuid = ?' },
      { uuid: generateUUID(), code: 'NONE', name: 'No Access', description: 'No access', sql_template: '1=0' }
    ];

    // Insert data scopes
    for (const scope of dataScopes) {
      await connection.execute(
        'INSERT IGNORE INTO DataScopes (uuid, code, name, description, sql_template) VALUES (?, ?, ?, ?, ?)',
        [scope.uuid, scope.code, scope.name, scope.description, scope.sql_template]
      );
    }

    // System roles - clear existing and insert fresh
    await connection.execute('DELETE FROM Roles WHERE is_system_role = TRUE OR code IN ("SUPER_ADMIN", "HR_ADMIN", "DEPARTMENT_HEAD", "HR_OFFICER", "EMPLOYEE")');

    const systemRoles = [
      { uuid: generateUUID(), code: 'SUPER_ADMIN', name: 'Super Admin', hierarchy_level: 100, is_system_role: true },
      { uuid: generateUUID(), code: 'HR_ADMIN', name: 'HR Admin', hierarchy_level: 90, is_system_role: true },
      { uuid: generateUUID(), code: 'DEPARTMENT_HEAD', name: 'Department Head', hierarchy_level: 70, is_system_role: true },
      { uuid: generateUUID(), code: 'HR_OFFICER', name: 'HR Officer', hierarchy_level: 60, is_system_role: true },
      { uuid: generateUUID(), code: 'EMPLOYEE', name: 'Employee', hierarchy_level: 10, is_system_role: true }
    ];

    // Insert system roles
    for (const role of systemRoles) {
      await connection.execute(
        'INSERT INTO Roles (uuid, code, name, hierarchy_level, is_system_role, can_be_deleted, is_active) VALUES (?, ?, ?, ?, ?, FALSE, TRUE)',
        [role.uuid, role.code, role.name, role.hierarchy_level, role.is_system_role]
      );
    }

    console.log('✅ Seed data inserted successfully');

    // Step 3: Verify the setup
    console.log('\n🔍 Verifying setup...');
    
    const [roleCount] = await connection.execute('SELECT COUNT(*) as count FROM Roles');
    const [resourceCount] = await connection.execute('SELECT COUNT(*) as count FROM Resources');
    const [permissionCount] = await connection.execute('SELECT COUNT(*) as count FROM Permissions');
    const [scopeCount] = await connection.execute('SELECT COUNT(*) as count FROM DataScopes');

    console.log(`✅ Roles: ${roleCount[0].count}`);
    console.log(`✅ Resources: ${resourceCount[0].count}`);
    console.log(`✅ Permissions: ${permissionCount[0].count}`);
    console.log(`✅ Data Scopes: ${scopeCount[0].count}`);

    console.log('\n🎉 RBAC setup completed successfully!');
    console.log('\nNext steps:');
    console.log('1. node scripts/checkRBACTables.js');
    console.log('2. npm start (backend)');
    console.log('3. npm run dev (frontend)');

  } catch (error) {
    console.error('❌ Setup failed:', error.message);
    console.error(error);
    process.exit(1);
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

setupRBAC();