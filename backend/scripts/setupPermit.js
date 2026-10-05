/**
 * Permit.io Setup Script
 * 
 * This script initializes Permit.io with all resources, actions, and roles
 * needed for the Mesob HRMS application.
 * 
 * Run this script ONCE after creating your Permit.io account:
 *   node scripts/setupPermit.js
 * 
 * What this script does:
 * 1. Creates all resources (employees, attendance, leave, etc.)
 * 2. Defines actions for each resource (view, create, update, delete, etc.)
 * 3. Creates initial roles (super_admin, hr_admin, hr_officer, department_head, employee)
 * 4. Assigns permissions to roles
 * 5. Syncs all existing HRMS users to Permit
 */

require('dotenv').config();
const { permit } = require('../src/config/permit');
const { bulkSyncAllUsers } = require('../src/services/permitSyncService');

// Resource definitions with their actions
const RESOURCES = [
  {
    key: 'employees',
    name: 'Employees',
    description: 'Employee records and management',
    actions: ['view', 'create', 'update', 'delete', 'export'],
  },
  {
    key: 'attendance',
    name: 'Attendance',
    description: 'Attendance tracking and management',
    actions: ['view', 'create', 'update', 'delete', 'approve', 'export'],
  },
  {
    key: 'leave',
    name: 'Leave',
    description: 'Leave balances and management',
    actions: ['view', 'create', 'update', 'delete', 'rebuild_all'],
  },
  {
    key: 'requests',
    name: 'Requests',
    description: 'Leave and other employee requests',
    actions: ['view', 'create', 'update', 'delete', 'approve', 'reject'],
  },
  {
    key: 'departments',
    name: 'Departments',
    description: 'Department management',
    actions: ['view', 'create', 'update', 'delete'],
  },
  {
    key: 'positions',
    name: 'Positions',
    description: 'Position/job title management',
    actions: ['view', 'create', 'update', 'delete'],
  },
  {
    key: 'levels',
    name: 'Levels',
    description: 'Salary levels and compensation',
    actions: ['view', 'create', 'update', 'delete'],
  },
  {
    key: 'shifts',
    name: 'Shifts',
    description: 'Work shift definitions',
    actions: ['view', 'create', 'update', 'delete', 'assign'],
  },
  {
    key: 'accounts',
    name: 'Accounts',
    description: 'User account management',
    actions: ['view', 'create', 'update', 'delete', 'assign_role', 'reset_password'],
  },
  {
    key: 'letters',
    name: 'Letters',
    description: 'Employment letters and certificates',
    actions: ['view', 'create', 'update', 'delete', 'generate', 'approve'],
  },
  {
    key: 'policies',
    name: 'Policies',
    description: 'HR policies and leave policies',
    actions: ['view', 'create', 'update', 'delete'],
  },
  {
    key: 'reports',
    name: 'Reports',
    description: 'Reports and analytics',
    actions: ['view', 'generate', 'export'],
  },
  {
    key: 'dashboard',
    name: 'Dashboard',
    description: 'Dashboard and statistics',
    actions: ['view'],
  },
  {
    key: 'notifications',
    name: 'Notifications',
    description: 'System notifications',
    actions: ['view', 'create', 'mark_read'],
  },
  {
    key: 'logs',
    name: 'Audit Logs',
    description: 'System audit logs',
    actions: ['view', 'export'],
  },
];

// Role definitions with their permissions
const ROLES = [
  {
    key: 'super_admin',
    name: 'Super Administrator',
    description: 'Full system access - can do everything',
    permissions: 'ALL', // Special case - gets all permissions
  },
  {
    key: 'hr_admin',
    name: 'HR Administrator',
    description: 'HR management with organization-wide access',
    permissions: [
      'employees:view', 'employees:create', 'employees:update', 'employees:delete', 'employees:export',
      'attendance:view', 'attendance:create', 'attendance:update', 'attendance:delete', 'attendance:approve', 'attendance:export',
      'leave:view', 'leave:create', 'leave:update', 'leave:delete', 'leave:rebuild_all',
      'requests:view', 'requests:create', 'requests:update', 'requests:delete', 'requests:approve', 'requests:reject',
      'departments:view', 'departments:create', 'departments:update', 'departments:delete',
      'positions:view', 'positions:create', 'positions:update', 'positions:delete',
      'levels:view', 'levels:create', 'levels:update', 'levels:delete',
      'shifts:view', 'shifts:create', 'shifts:update', 'shifts:delete', 'shifts:assign',
      'accounts:view', 'accounts:create', 'accounts:update', 'accounts:assign_role', 'accounts:reset_password',
      'letters:view', 'letters:create', 'letters:update', 'letters:delete', 'letters:generate', 'letters:approve',
      'policies:view', 'policies:create', 'policies:update', 'policies:delete',
      'reports:view', 'reports:generate', 'reports:export',
      'dashboard:view',
      'notifications:view', 'notifications:create', 'notifications:mark_read',
      'logs:view', 'logs:export',
    ],
  },
  {
    key: 'hr_officer',
    name: 'HR Officer',
    description: 'HR operations staff - department-scoped access',
    permissions: [
      'employees:view', 'employees:create', 'employees:update',
      'attendance:view', 'attendance:create', 'attendance:update', 'attendance:approve',
      'leave:view', 'leave:update',
      'requests:view', 'requests:approve', 'requests:reject',
      'departments:view',
      'positions:view',
      'levels:view',
      'shifts:view', 'shifts:assign',
      'letters:view', 'letters:generate', 'letters:approve',
      'policies:view',
      'reports:view', 'reports:generate',
      'dashboard:view',
      'notifications:view', 'notifications:mark_read',
    ],
  },
  {
    key: 'department_head',
    name: 'Department Head',
    description: 'Department manager - can manage department employees and approve requests',
    permissions: [
      'employees:view',
      'attendance:view', 'attendance:approve',
      'leave:view',
      'requests:view', 'requests:approve', 'requests:reject',
      'departments:view',
      'positions:view',
      'shifts:view',
      'letters:view',
      'reports:view',
      'dashboard:view',
      'notifications:view', 'notifications:mark_read',
    ],
  },
  {
    key: 'employee',
    name: 'Employee',
    description: 'Regular employee - self-service access only',
    permissions: [
      'employees:view', // Can view own record
      'attendance:view', // Can view own attendance
      'leave:view', // Can view own balance
      'requests:view', 'requests:create', 'requests:update', 'requests:delete', // Can manage own requests
      'letters:view', // Can view own letters
      'dashboard:view',
      'notifications:view', 'notifications:mark_read',
    ],
  },
];

/**
 * Create or update a resource in Permit
 */
async function createResource(resource) {
  try {
    console.log(`\n📦 Creating resource: ${resource.name}`);
    
    // Create resource
    await permit.api.resources.create({
      key: resource.key,
      name: resource.name,
      description: resource.description,
      actions: resource.actions.reduce((acc, action) => {
        acc[action] = {
          name: action.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase()),
        };
        return acc;
      }, {}),
    });
    
    console.log(`   ✓ Created resource '${resource.key}' with ${resource.actions.length} actions`);
  } catch (error) {
    if (error.message && error.message.includes('already exists')) {
      console.log(`   ℹ Resource '${resource.key}' already exists, skipping...`);
    } else {
      console.error(`   ✗ Failed to create resource '${resource.key}':`, error.message);
      throw error;
    }
  }
}

/**
 * Create or update a role in Permit
 */
async function createRole(role) {
  try {
    console.log(`\n👤 Creating role: ${role.name}`);
    
    // Create role
    await permit.api.roles.create({
      key: role.key,
      name: role.name,
      description: role.description,
    });
    
    console.log(`   ✓ Created role '${role.key}'`);
  } catch (error) {
    if (error.message && error.message.includes('already exists')) {
      console.log(`   ℹ Role '${role.key}' already exists, skipping...`);
    } else {
      console.error(`   ✗ Failed to create role '${role.key}':`, error.message);
      throw error;
    }
  }
}

/**
 * Assign permissions to a role
 */
async function assignPermissionsToRole(role) {
  try {
    console.log(`\n🔐 Assigning permissions to role: ${role.name}`);
    
    if (role.permissions === 'ALL') {
      // Super admin gets all permissions
      console.log(`   ℹ Granting ALL permissions to ${role.key}...`);
      
      for (const resource of RESOURCES) {
        for (const action of resource.actions) {
          try {
            await permit.api.roleAssignments.assign({
              role: role.key,
              resource: resource.key,
              action: action,
            });
          } catch (err) {
            // Permission might already be assigned
            if (!err.message || !err.message.includes('already')) {
              console.error(`   ✗ Failed to assign ${resource.key}:${action}:`, err.message);
            }
          }
        }
      }
      console.log(`   ✓ Assigned ALL permissions to ${role.key}`);
    } else {
      // Assign specific permissions
      let successCount = 0;
      let skipCount = 0;
      
      for (const permission of role.permissions) {
        const [resource, action] = permission.split(':');
        
        try {
          await permit.api.roleAssignments.assign({
            role: role.key,
            resource: resource,
            action: action,
          });
          successCount++;
        } catch (err) {
          if (err.message && err.message.includes('already')) {
            skipCount++;
          } else {
            console.error(`   ✗ Failed to assign ${permission}:`, err.message);
          }
        }
      }
      
      console.log(`   ✓ Assigned ${successCount} permissions to ${role.key} (${skipCount} already existed)`);
    }
  } catch (error) {
    console.error(`   ✗ Failed to assign permissions to ${role.key}:`, error.message);
    throw error;
  }
}

/**
 * Main setup function
 */
async function setupPermit() {
  console.log('═══════════════════════════════════════════════════════════════');
  console.log('🚀 Permit.io Setup for Mesob HRMS');
  console.log('═══════════════════════════════════════════════════════════════');
  
  try {
    // Step 1: Create resources
    console.log('\n📦 STEP 1: Creating Resources');
    console.log('───────────────────────────────────────────────────────────────');
    for (const resource of RESOURCES) {
      await createResource(resource);
    }
    
    // Step 2: Create roles
    console.log('\n👤 STEP 2: Creating Roles');
    console.log('───────────────────────────────────────────────────────────────');
    for (const role of ROLES) {
      await createRole(role);
    }
    
    // Step 3: Assign permissions to roles
    console.log('\n🔐 STEP 3: Assigning Permissions to Roles');
    console.log('───────────────────────────────────────────────────────────────');
    for (const role of ROLES) {
      await assignPermissionsToRole(role);
    }
    
    // Step 4: Sync existing users
    console.log('\n👥 STEP 4: Syncing Existing Users');
    console.log('───────────────────────────────────────────────────────────────');
    console.log('   ℹ This may take a few minutes...');
    const syncStats = await bulkSyncAllUsers();
    console.log(`   ✓ Synced ${syncStats.success} users successfully`);
    if (syncStats.failed > 0) {
      console.log(`   ⚠ ${syncStats.failed} users failed to sync`);
    }
    
    // Done!
    console.log('\n═══════════════════════════════════════════════════════════════');
    console.log('✅ Permit.io Setup Complete!');
    console.log('═══════════════════════════════════════════════════════════════');
    console.log('\nNext steps:');
    console.log('1. Visit https://app.permit.io to view your configuration');
    console.log('2. Update .env with PERMIT_API_KEY if not already set');
    console.log('3. Start your application');
    console.log('4. Test authorization with different user roles');
    console.log('\n');
    
    process.exit(0);
  } catch (error) {
    console.error('\n❌ Setup failed:', error);
    console.error('\nPlease check:');
    console.error('1. PERMIT_API_KEY is set correctly in .env');
    console.error('2. You have internet connection');
    console.error('3. Your Permit.io account is active');
    process.exit(1);
  }
}

// Run setup
if (require.main === module) {
  setupPermit();
}

module.exports = { setupPermit, RESOURCES, ROLES };
