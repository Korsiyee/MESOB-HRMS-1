#!/usr/bin/env node
/**
 * Quick Permit.io Setup Script
 * Sets up resources, roles, and permissions without syncing all users
 */

const { Permit } = require('permitio');
require('dotenv').config();

const permit = new Permit({
  token: process.env.PERMIT_API_KEY,
  pdp: process.env.PERMIT_PDP_URL || 'https://cloudpdp.api.permit.io',
});

// Resources with actions
const RESOURCES = [
  { key: 'employees', name: 'Employees', actions: ['view', 'create', 'update', 'delete', 'export'] },
  { key: 'attendance', name: 'Attendance', actions: ['view', 'create', 'update', 'delete', 'manage_all', 'manage_department'] },
  { key: 'leave', name: 'Leave', actions: ['view', 'create', 'update', 'delete', 'approve_hr', 'approve_department', 'cancel'] },
  { key: 'departments', name: 'Departments', actions: ['view', 'create', 'update', 'delete'] },
  { key: 'positions', name: 'Positions', actions: ['view', 'create', 'update', 'delete'] },
  { key: 'levels', name: 'Levels', actions: ['view', 'create', 'update', 'delete'] },
  { key: 'shifts', name: 'Shifts', actions: ['view', 'create', 'update', 'delete', 'assign'] },
  { key: 'accounts', name: 'Accounts', actions: ['view', 'create', 'update', 'reset_password', 'activate', 'deactivate'] },
  { key: 'letters', name: 'Letters', actions: ['view', 'create', 'manage', 'request', 'approve', 'reject'] },
  { key: 'policies', name: 'Policies', actions: ['view', 'create', 'update', 'delete'] },
  { key: 'reports', name: 'Reports', actions: ['view', 'export'] },
  { key: 'dashboard', name: 'Dashboard', actions: ['view_organization', 'view_department', 'view_personal'] },
  { key: 'logs', name: 'Logs', actions: ['view'] },
  { key: 'roles', name: 'Roles', actions: ['view', 'manage'] },
];

// Roles with descriptions
const ROLES = [
  { key: 'super_admin', name: 'Super Admin', description: 'Full system access' },
  { key: 'hr_admin', name: 'HR Admin', description: 'HR management and administration' },
  { key: 'hr_officer', name: 'HR Officer', description: 'HR operations' },
  { key: 'department_head', name: 'Department Head', description: 'Department management' },
  { key: 'employee', name: 'Employee', description: 'Basic employee access' },
];

// Role permissions mapping
const ROLE_PERMISSIONS = {
  super_admin: [
    // Full access to everything
    'employees.*', 'attendance.*', 'leave.*', 'departments.*', 'positions.*',
    'levels.*', 'shifts.*', 'accounts.*', 'letters.*', 'policies.*',
    'reports.*', 'dashboard.*', 'logs.*', 'roles.*'
  ],
  hr_admin: [
    'employees.*', 'attendance.view', 'attendance.manage_all', 
    'leave.view', 'leave.create', 'leave.approve_hr', 'leave.cancel',
    'departments.*', 'positions.*', 'levels.*', 'shifts.*',
    'accounts.view', 'accounts.create', 'accounts.reset_password',
    'letters.view', 'letters.manage', 'letters.approve', 'letters.reject',
    'policies.*', 'reports.*', 'dashboard.view_organization', 'logs.view'
  ],
  hr_officer: [
    'employees.view', 'employees.create', 'employees.update',
    'attendance.view', 'attendance.manage_all',
    'leave.view', 'leave.approve_hr',
    'departments.view', 'positions.view', 'levels.view', 'shifts.view', 'shifts.assign',
    'letters.view', 'letters.manage', 'letters.approve', 'letters.reject',
    'reports.view', 'reports.export', 'dashboard.view_organization'
  ],
  department_head: [
    'employees.view', 'attendance.view', 'attendance.manage_department',
    'leave.view', 'leave.approve_department',
    'departments.view', 'positions.view', 'shifts.view',
    'letters.view', 'letters.approve', 'letters.reject',
    'reports.view', 'dashboard.view_department'
  ],
  employee: [
    'employees.view', 'attendance.view', 'leave.view', 'leave.create',
    'departments.view', 'positions.view', 'letters.view', 'letters.request',
    'dashboard.view_personal'
  ],
};

async function setupResources() {
  console.log('\n📦 Setting up resources...');
  
  for (const resource of RESOURCES) {
    try {
      const existing = await permit.api.resources.get(resource.key).catch(() => null);
      
      if (existing) {
        console.log(`  ✓ Resource '${resource.key}' already exists`);
        
        // Update actions if needed
        const existingActions = Object.keys(existing.actions || {});
        const newActions = resource.actions.filter(a => !existingActions.includes(a));
        
        if (newActions.length > 0) {
          for (const action of newActions) {
            await permit.api.resourceActions.create(resource.key, {
              key: action,
              name: action.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
            });
          }
          console.log(`    + Added actions: ${newActions.join(', ')}`);
        }
      } else {
        await permit.api.resources.create({
          key: resource.key,
          name: resource.name,
          actions: resource.actions.reduce((acc, action) => ({
            ...acc,
            [action]: { name: action.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()) }
          }), {}),
        });
        console.log(`  ✓ Created resource '${resource.key}' with ${resource.actions.length} actions`);
      }
    } catch (err) {
      console.error(`  ✗ Failed to create resource '${resource.key}':`, err.message);
    }
  }
}

async function setupRoles() {
  console.log('\n👥 Setting up roles...');
  
  for (const role of ROLES) {
    try {
      const existing = await permit.api.roles.get(role.key).catch(() => null);
      
      if (existing) {
        console.log(`  ✓ Role '${role.key}' already exists`);
      } else {
        await permit.api.roles.create({
          key: role.key,
          name: role.name,
          description: role.description,
        });
        console.log(`  ✓ Created role '${role.key}'`);
      }
    } catch (err) {
      console.error(`  ✗ Failed to create role '${role.key}':`, err.message);
    }
  }
}

async function assignPermissions() {
  console.log('\n🔐 Assigning permissions to roles...');
  
  for (const [roleKey, permissions] of Object.entries(ROLE_PERMISSIONS)) {
    console.log(`\n  Role: ${roleKey}`);
    let successCount = 0;
    
    for (const permission of permissions) {
      try {
        if (permission.endsWith('.*')) {
          // Wildcard - assign all actions for this resource
          const resourceKey = permission.replace('.*', '');
          const resource = RESOURCES.find(r => r.key === resourceKey);
          
          if (resource) {
            for (const action of resource.actions) {
              try {
                // Use the correct API: roles.assignPermissions
                await permit.api.roles.assignPermissions(roleKey, [{
                  resource: resourceKey,
                  action: action,
                }]);
                successCount++;
              } catch (err) {
                // Ignore if already exists
                if (!err.message?.includes('already') && !err.response?.status === 409) {
                  throw err;
                }
              }
            }
            console.log(`    ✓ ${resourceKey}.* (${resource.actions.length} actions)`);
          }
        } else {
          // Specific permission
          const [resourceKey, action] = permission.split('.');
          try {
            await permit.api.roles.assignPermissions(roleKey, [{
              resource: resourceKey,
              action: action,
            }]);
            successCount++;
            console.log(`    ✓ ${permission}`);
          } catch (err) {
            // Ignore if already exists
            if (!err.message?.includes('already') && err.response?.status !== 409) {
              throw err;
            } else {
              console.log(`    ○ ${permission} (already assigned)`);
            }
          }
        }
      } catch (err) {
        console.error(`    ✗ ${permission}: ${err.message}`);
      }
    }
    console.log(`    Total: ${successCount} permissions assigned to ${roleKey}`);
  }
}

async function verifySetup() {
  console.log('\n✅ Verifying setup...');
  
  const resources = await permit.api.resources.list();
  console.log(`  Resources: ${resources.length} created`);
  
  const roles = await permit.api.roles.list();
  console.log(`  Roles: ${roles.length} created`);
  
  console.log('\n📋 Summary:');
  console.log('  Resources:', resources.map(r => r.key).join(', '));
  console.log('  Roles:', roles.map(r => r.key).join(', '));
}

async function main() {
  console.log('🚀 Permit.io Quick Setup');
  console.log('========================\n');
  console.log(`API Key: ${process.env.PERMIT_API_KEY?.substring(0, 20)}...`);
  console.log(`PDP URL: ${process.env.PERMIT_PDP_URL || 'https://cloudpdp.api.permit.io'}\n`);
  
  try {
    await setupResources();
    await setupRoles();
    await assignPermissions();
    await verifySetup();
    
    console.log('\n✅ Setup complete!');
    console.log('\n📝 Next steps:');
    console.log('  1. Run database migration: mysql -u root -p mesob_hrms < database/migrations/010_permit_dynamic_roles.sql');
    console.log('  2. Restart the backend server');
    console.log('  3. Test login with different roles');
    console.log('  4. Verify permissions in Permit dashboard: https://app.permit.io\n');
  } catch (err) {
    console.error('\n❌ Setup failed:', err.message);
    process.exit(1);
  }
}

main();
