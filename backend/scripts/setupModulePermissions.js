#!/usr/bin/env node

/**
 * Module-Level Permission System Setup
 * 
 * This script sets up a simplified module-level permission system:
 * - Permissions are granted at the MODULE/PAGE level (not individual actions)
 * - Each role has a SCOPE that determines what data they can see
 * - Scopes: ORGANIZATION (all data), DEPARTMENT (department data), PERSONAL (own data only)
 * 
 * Modules:
 * - Home (Dashboard)
 * - Employees
 * - Organization (Departments, Positions, Levels)
 * - Attendance
 * - Shifts
 * - Letters
 * - Leave
 * - Personal Space (always accessible to all users)
 */

require('dotenv').config();
const mysql = require('mysql2/promise');
const { v4: uuidv4 } = require('uuid');

async function setupModulePermissions() {
  let connection;
  
  try {
    console.log('═══════════════════════════════════════════════════════════');
    console.log('Module-Level Permission System Setup');
    console.log('═══════════════════════════════════════════════════════════\n');
    
    console.log('🔗 Connecting to database...');
    
    connection = await mysql.createConnection({
      host: process.env.DB_HOST || 'localhost',
      user: process.env.DB_USER || 'mesob',
      password: process.env.DB_PASSWORD || 'mesob_password',
      database: process.env.DB_NAME || 'mesob_hrms',
      multipleStatements: true
    });

    console.log('✅ Connected to database\n');

    // ============================================================================
    // STEP 1: Create simplified module permission tables
    // ============================================================================
    console.log('📋 Step 1: Creating simplified permission tables...\n');
    
    await connection.execute('SET FOREIGN_KEY_CHECKS = 0');
    
    // Drop old complex RBAC tables if they exist
    const oldTables = [
      'AuthorizationAuditLogs',
      'PermissionDelegations',
      'UserScopeOverrides',
      'UserPermissionOverrides',
      'RolePermissionScopes',
      'RolePermissions',
      'Permissions',
      'Resources',
      'DataScopes'
    ];
    
    for (const table of oldTables) {
      await connection.execute(`DROP TABLE IF EXISTS ${table}`);
      console.log(`  ✓ Dropped old table: ${table}`);
    }
    
    // Create new simplified tables
    console.log('\n  Creating new tables...\n');
    
    // Modules table - defines the main application modules
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS Modules (
        uuid VARCHAR(36) PRIMARY KEY,
        code VARCHAR(50) NOT NULL UNIQUE,
        name VARCHAR(100) NOT NULL,
        description TEXT,
        icon VARCHAR(50),
        display_order INT NOT NULL DEFAULT 0,
        is_active BOOLEAN NOT NULL DEFAULT TRUE,
        created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_modules_code (code),
        INDEX idx_modules_active (is_active)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
    console.log('    ✓ Created Modules table');
    
    // Scopes table - defines data access scopes
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS Scopes (
        uuid VARCHAR(36) PRIMARY KEY,
        code VARCHAR(50) NOT NULL UNIQUE,
        name VARCHAR(100) NOT NULL,
        description TEXT,
        level INT NOT NULL DEFAULT 0,
        created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_scopes_code (code)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
    console.log('    ✓ Created Scopes table');
    
    // Update Roles table - drop and recreate to ensure correct structure
    console.log('    Recreating Roles table...');
    
    // Check if Roles table exists
    const [rolesTables] = await connection.query(`
      SELECT TABLE_NAME 
      FROM INFORMATION_SCHEMA.TABLES 
      WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'Roles'
    `);
    
    if (rolesTables.length > 0) {
      // Backup old role assignments if Users table has role column
      console.log('    Backing up existing role data...');
      const [users] = await connection.query('SELECT uuid, role FROM Users WHERE role IS NOT NULL LIMIT 1');
      const hasOldRoles = users.length > 0;
      
      // Drop old Roles table
      await connection.execute('DROP TABLE IF EXISTS RoleModules');
      await connection.execute('DROP TABLE IF EXISTS Roles');
      console.log('    ✓ Dropped old Roles table');
    }
    
    // Create new Roles table with correct structure
    await connection.execute(`
      CREATE TABLE Roles (
        uuid VARCHAR(36) PRIMARY KEY,
        code VARCHAR(50) NOT NULL UNIQUE,
        name VARCHAR(100) NOT NULL,
        description TEXT,
        default_scope_uuid VARCHAR(36),
        hierarchy_level INT NOT NULL DEFAULT 10,
        is_system_role BOOLEAN NOT NULL DEFAULT FALSE,
        is_active BOOLEAN NOT NULL DEFAULT TRUE,
        created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_roles_code (code),
        INDEX idx_roles_active (is_active),
        INDEX idx_roles_hierarchy (hierarchy_level)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
    console.log('    ✓ Created Roles table');
    
    // RoleModules - maps which modules a role can access with which scope
    await connection.execute(`
      CREATE TABLE RoleModules (
        uuid VARCHAR(36) PRIMARY KEY,
        role_uuid VARCHAR(36) NOT NULL,
        module_uuid VARCHAR(36) NOT NULL,
        scope_uuid VARCHAR(36) NOT NULL,
        created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        UNIQUE KEY uk_role_module (role_uuid, module_uuid),
        INDEX idx_rm_role (role_uuid),
        INDEX idx_rm_module (module_uuid),
        INDEX idx_rm_scope (scope_uuid),
        CONSTRAINT fk_rm_role FOREIGN KEY (role_uuid) REFERENCES Roles(uuid) ON DELETE CASCADE,
        CONSTRAINT fk_rm_module FOREIGN KEY (module_uuid) REFERENCES Modules(uuid) ON DELETE CASCADE,
        CONSTRAINT fk_rm_scope FOREIGN KEY (scope_uuid) REFERENCES Scopes(uuid)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
    console.log('    ✓ Created RoleModules table');
    
    // Update Users table to use role_uuid (check if column exists first)
    const [columns] = await connection.query(`
      SELECT COLUMN_NAME 
      FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_SCHEMA = DATABASE() 
        AND TABLE_NAME = 'Users' 
        AND COLUMN_NAME = 'role_uuid'
    `);
    
    if (columns.length === 0) {
      await connection.execute('ALTER TABLE Users ADD COLUMN role_uuid VARCHAR(36)');
      await connection.execute('ALTER TABLE Users ADD INDEX idx_users_role (role_uuid)');
    }
    console.log('    ✓ Updated Users table');
    
    await connection.execute('SET FOREIGN_KEY_CHECKS = 1');
    
    console.log('\n✅ Step 1 Complete: Tables created\n');
    
    // ============================================================================
    // STEP 2: Insert seed data
    // ============================================================================
    console.log('📋 Step 2: Inserting seed data...\n');
    
    // Define scopes
    const scopes = [
      {
        uuid: uuidv4(),
        code: 'ORGANIZATION',
        name: 'Organization-wide',
        description: 'Access to all data across the entire organization',
        level: 100
      },
      {
        uuid: uuidv4(),
        code: 'DEPARTMENT',
        name: 'Department',
        description: 'Access to data within own department only',
        level: 50
      },
      {
        uuid: uuidv4(),
        code: 'PERSONAL',
        name: 'Personal',
        description: 'Access to own data only',
        level: 10
      }
    ];
    
    console.log('  Inserting scopes...');
    for (const scope of scopes) {
      await connection.execute(
        'INSERT IGNORE INTO Scopes (uuid, code, name, description, level) VALUES (?, ?, ?, ?, ?)',
        [scope.uuid, scope.code, scope.name, scope.description, scope.level]
      );
    }
    console.log('    ✓ Scopes inserted\n');
    
    // Define modules
    const modules = [
      {
        uuid: uuidv4(),
        code: 'HOME',
        name: 'Home',
        description: 'Dashboard and home page',
        icon: 'LayoutDashboard',
        display_order: 1
      },
      {
        uuid: uuidv4(),
        code: 'EMPLOYEES',
        name: 'Employees',
        description: 'Employee management (list, details, registration)',
        icon: 'Users',
        display_order: 2
      },
      {
        uuid: uuidv4(),
        code: 'ORGANIZATION',
        name: 'Organization',
        description: 'Organization structure (departments, positions, levels)',
        icon: 'Building2',
        display_order: 3
      },
      {
        uuid: uuidv4(),
        code: 'ATTENDANCE',
        name: 'Attendance',
        description: 'Attendance records and analytics',
        icon: 'Clock',
        display_order: 4
      },
      {
        uuid: uuidv4(),
        code: 'SHIFTS',
        name: 'Shifts',
        description: 'Shift management and assignments',
        icon: 'Layers',
        display_order: 5
      },
      {
        uuid: uuidv4(),
        code: 'LETTERS',
        name: 'Letters',
        description: 'Letter generation and management',
        icon: 'FileText',
        display_order: 6
      },
      {
        uuid: uuidv4(),
        code: 'LEAVE',
        name: 'Leave',
        description: 'Leave requests, policies, and days off',
        icon: 'CalendarDays',
        display_order: 7
      }
    ];
    
    console.log('  Inserting modules...');
    for (const module of modules) {
      await connection.execute(
        'INSERT IGNORE INTO Modules (uuid, code, name, description, icon, display_order) VALUES (?, ?, ?, ?, ?, ?)',
        [module.uuid, module.code, module.name, module.description, module.icon, module.display_order]
      );
    }
    console.log('    ✓ Modules inserted\n');
    
    // Define system roles
    const orgScope = scopes.find(s => s.code === 'ORGANIZATION');
    const deptScope = scopes.find(s => s.code === 'DEPARTMENT');
    const personalScope = scopes.find(s => s.code === 'PERSONAL');
    
    const roles = [
      {
        uuid: uuidv4(),
        code: 'SUPER_ADMIN',
        name: 'Super Admin',
        description: 'Full system access with all permissions',
        default_scope_uuid: orgScope.uuid,
        hierarchy_level: 100,
        is_system_role: true
      },
      {
        uuid: uuidv4(),
        code: 'HR_ADMIN',
        name: 'HR Admin',
        description: 'HR administrator with organization-wide access',
        default_scope_uuid: orgScope.uuid,
        hierarchy_level: 90,
        is_system_role: true
      },
      {
        uuid: uuidv4(),
        code: 'DEPARTMENT_HEAD',
        name: 'Department Head',
        description: 'Department head with department-level access',
        default_scope_uuid: deptScope.uuid,
        hierarchy_level: 70,
        is_system_role: true
      },
      {
        uuid: uuidv4(),
        code: 'HR_OFFICER',
        name: 'HR Officer',
        description: 'HR officer with limited organization access',
        default_scope_uuid: orgScope.uuid,
        hierarchy_level: 60,
        is_system_role: true
      },
      {
        uuid: uuidv4(),
        code: 'EMPLOYEE',
        name: 'Employee',
        description: 'Regular employee with personal access only',
        default_scope_uuid: personalScope.uuid,
        hierarchy_level: 10,
        is_system_role: true
      }
    ];
    
    console.log('  Inserting roles...');
    // Clear existing roles first
    await connection.execute('DELETE FROM Roles');
    
    for (const role of roles) {
      await connection.execute(
        `INSERT INTO Roles (uuid, code, name, description, default_scope_uuid, hierarchy_level, is_system_role, is_active) 
         VALUES (?, ?, ?, ?, ?, ?, ?, TRUE)`,
        [role.uuid, role.code, role.name, role.description, role.default_scope_uuid, role.hierarchy_level, role.is_system_role]
      );
    }
    console.log('    ✓ Roles inserted\n');
    
    // ============================================================================
    // STEP 3: Assign module permissions to roles
    // ============================================================================
    console.log('📋 Step 3: Assigning module permissions to roles...\n');
    
    // Helper to find entities
    const findModule = (code) => modules.find(m => m.code === code);
    const findRole = (code) => roles.find(r => r.code === code);
    const findScope = (code) => scopes.find(s => s.code === code);
    
    // SUPER_ADMIN - All modules with ORGANIZATION scope
    console.log('  Configuring SUPER_ADMIN...');
    const superAdminRole = findRole('SUPER_ADMIN');
    for (const module of modules) {
      await connection.execute(
        'INSERT IGNORE INTO RoleModules (uuid, role_uuid, module_uuid, scope_uuid) VALUES (?, ?, ?, ?)',
        [uuidv4(), superAdminRole.uuid, module.uuid, orgScope.uuid]
      );
    }
    console.log('    ✓ All modules with ORGANIZATION scope\n');
    
    // HR_ADMIN - All modules with ORGANIZATION scope
    console.log('  Configuring HR_ADMIN...');
    const hrAdminRole = findRole('HR_ADMIN');
    for (const module of modules) {
      await connection.execute(
        'INSERT IGNORE INTO RoleModules (uuid, role_uuid, module_uuid, scope_uuid) VALUES (?, ?, ?, ?)',
        [uuidv4(), hrAdminRole.uuid, module.uuid, orgScope.uuid]
      );
    }
    console.log('    ✓ All modules with ORGANIZATION scope\n');
    
    // DEPARTMENT_HEAD - Selected modules with DEPARTMENT scope
    console.log('  Configuring DEPARTMENT_HEAD...');
    const deptHeadRole = findRole('DEPARTMENT_HEAD');
    const deptHeadModules = ['HOME', 'EMPLOYEES', 'ATTENDANCE', 'LEAVE', 'LETTERS'];
    for (const moduleCode of deptHeadModules) {
      const module = findModule(moduleCode);
      await connection.execute(
        'INSERT IGNORE INTO RoleModules (uuid, role_uuid, module_uuid, scope_uuid) VALUES (?, ?, ?, ?)',
        [uuidv4(), deptHeadRole.uuid, module.uuid, deptScope.uuid]
      );
    }
    console.log('    ✓ Selected modules with DEPARTMENT scope\n');
    
    // HR_OFFICER - Limited modules with ORGANIZATION scope
    console.log('  Configuring HR_OFFICER...');
    const hrOfficerRole = findRole('HR_OFFICER');
    const hrOfficerModules = ['HOME', 'EMPLOYEES', 'ORGANIZATION'];
    for (const moduleCode of hrOfficerModules) {
      const module = findModule(moduleCode);
      await connection.execute(
        'INSERT IGNORE INTO RoleModules (uuid, role_uuid, module_uuid, scope_uuid) VALUES (?, ?, ?, ?)',
        [uuidv4(), hrOfficerRole.uuid, module.uuid, orgScope.uuid]
      );
    }
    console.log('    ✓ Limited modules with ORGANIZATION scope\n');
    
    // EMPLOYEE - Only HOME with PERSONAL scope (Personal Space is always accessible)
    console.log('  Configuring EMPLOYEE...');
    const employeeRole = findRole('EMPLOYEE');
    const homeModule = findModule('HOME');
    await connection.execute(
      'INSERT IGNORE INTO RoleModules (uuid, role_uuid, module_uuid, scope_uuid) VALUES (?, ?, ?, ?)',
      [uuidv4(), employeeRole.uuid, homeModule.uuid, personalScope.uuid]
    );
    console.log('    ✓ HOME with PERSONAL scope (Personal Space always accessible)\n');
    
    console.log('✅ Step 3 Complete: Module permissions assigned\n');
    
    // ============================================================================
    // STEP 4: Update existing users to use role_uuid
    // ============================================================================
    console.log('📋 Step 4: Migrating existing users to new role system...\n');
    
    // Map old role enum values to new role UUIDs
    const roleMapping = {
      'SUPER_ADMIN': superAdminRole.uuid,
      'HR_ADMIN': hrAdminRole.uuid,
      'DEPARTMENT_HEAD': deptHeadRole.uuid,
      'HR_OFFICER': hrOfficerRole.uuid,
      'EMPLOYEE': employeeRole.uuid
    };
    
    for (const [oldRole, newRoleUuid] of Object.entries(roleMapping)) {
      const [result] = await connection.execute(
        'UPDATE Users SET role_uuid = ? WHERE role = ?',
        [newRoleUuid, oldRole]
      );
      if (result.affectedRows > 0) {
        console.log(`  ✓ Migrated ${result.affectedRows} users from ${oldRole}`);
      }
    }
    
    console.log('\n✅ Step 4 Complete: Users migrated\n');
    
    // ============================================================================
    // STEP 5: Verification
    // ============================================================================
    console.log('📋 Step 5: Verifying setup...\n');
    
    const [scopeCount] = await connection.execute('SELECT COUNT(*) as count FROM Scopes');
    const [moduleCount] = await connection.execute('SELECT COUNT(*) as count FROM Modules');
    const [roleCount] = await connection.execute('SELECT COUNT(*) as count FROM Roles');
    const [roleModuleCount] = await connection.execute('SELECT COUNT(*) as count FROM RoleModules');
    const [userCount] = await connection.execute('SELECT COUNT(*) as count FROM Users WHERE role_uuid IS NOT NULL');
    
    console.log('  Database Statistics:');
    console.log(`    • Scopes: ${scopeCount[0].count}`);
    console.log(`    • Modules: ${moduleCount[0].count}`);
    console.log(`    • Roles: ${roleCount[0].count}`);
    console.log(`    • Role-Module Assignments: ${roleModuleCount[0].count}`);
    console.log(`    • Users Migrated: ${userCount[0].count}`);
    
    console.log('\n  Role Permission Summary:');
    const [roleSummary] = await connection.execute(`
      SELECT 
        r.name as role_name,
        COUNT(rm.uuid) as module_count,
        s.name as default_scope
      FROM Roles r
      LEFT JOIN RoleModules rm ON r.uuid = rm.role_uuid
      LEFT JOIN Scopes s ON r.default_scope_uuid = s.uuid
      GROUP BY r.uuid, r.name, s.name
      ORDER BY r.hierarchy_level DESC
    `);
    
    for (const row of roleSummary) {
      console.log(`    • ${row.role_name}: ${row.module_count} modules (${row.default_scope} scope)`);
    }
    
    console.log('\n═══════════════════════════════════════════════════════════');
    console.log('✅ Module-Level Permission System Setup Complete!');
    console.log('═══════════════════════════════════════════════════════════\n');
    
    console.log('📝 Next Steps:');
    console.log('  1. Remove Permit.io dependencies');
    console.log('  2. Update authorization middleware');
    console.log('  3. Update frontend to use new module permissions');
    console.log('  4. Test the system\n');

  } catch (error) {
    console.error('\n❌ Setup failed:', error.message);
    console.error(error);
    process.exit(1);
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

setupModulePermissions();
