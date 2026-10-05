/**
 * Permit.io Authorization Testing Script
 * 
 * Tests authorization checks for different users and roles
 * 
 * Usage: node scripts/testPermitAuth.js
 */

require('dotenv').config();
const { permit } = require('../src/config/permit');
const db = require('../src/config/db');

// Test results tracking
const results = {
  passed: 0,
  failed: 0,
  tests: []
};

function log(message, type = 'info') {
  const icons = {
    info: 'ℹ',
    success: '✓',
    error: '✗',
    warning: '⚠'
  };
  console.log(`${icons[type]} ${message}`);
}

function recordTest(name, passed, details = '') {
  results.tests.push({ name, passed, details });
  if (passed) {
    results.passed++;
    log(`${name}`, 'success');
  } else {
    results.failed++;
    log(`${name} - ${details}`, 'error');
  }
}

/**
 * Test 1: Verify Permit connection
 */
async function testPermitConnection() {
  try {
    // Try to list roles as a connection test
    const roles = await permit.api.roles.list();
    const hasExpectedRoles = ['super_admin', 'hr_admin', 'hr_officer', 'department_head', 'employee']
      .every(role => roles.some(r => r.key === role));
    
    recordTest(
      'Permit connection and role setup',
      hasExpectedRoles,
      hasExpectedRoles ? '' : 'Some expected roles are missing'
    );
    return hasExpectedRoles;
  } catch (error) {
    recordTest('Permit connection', false, error.message);
    return false;
  }
}

/**
 * Test 2: Verify resources exist
 */
async function testResourcesExist() {
  try {
    const resources = await permit.api.resources.list();
    const expectedResources = [
      'employees', 'attendance', 'leave', 'requests', 'departments',
      'positions', 'levels', 'shifts', 'accounts', 'letters',
      'policies', 'reports', 'dashboard', 'notifications', 'logs'
    ];
    
    const missingResources = expectedResources.filter(
      r => !resources.some(res => res.key === r)
    );
    
    const allExist = missingResources.length === 0;
    recordTest(
      `Resources exist (${resources.length}/15)`,
      allExist,
      allExist ? '' : `Missing: ${missingResources.join(', ')}`
    );
    return allExist;
  } catch (error) {
    recordTest('Resources check', false, error.message);
    return false;
  }
}

/**
 * Test 3: Verify users are synced
 */
async function testUsersSynced() {
  try {
    const [dbUsers] = await db.query('SELECT COUNT(*) as count FROM Users WHERE isActive = 1');
    const dbUserCount = dbUsers[0].count;
    
    const permitUsers = await permit.api.users.list();
    const permitUserCount = permitUsers.length;
    
    const syncRatio = permitUserCount / dbUserCount;
    const wellSynced = syncRatio >= 0.8; // At least 80% synced
    
    recordTest(
      `Users synced (${permitUserCount}/${dbUserCount})`,
      wellSynced,
      wellSynced ? '' : `Only ${Math.round(syncRatio * 100)}% of users are synced`
    );
    return wellSynced;
  } catch (error) {
    recordTest('Users sync check', false, error.message);
    return false;
  }
}

/**
 * Test 4: Test Super Admin permissions
 */
async function testSuperAdminPermissions() {
  try {
    const [users] = await db.query(
      'SELECT uuid FROM Users WHERE role = ? AND isActive = 1 LIMIT 1',
      ['SUPER_ADMIN']
    );
    
    if (users.length === 0) {
      recordTest('Super Admin permissions', false, 'No super admin user found');
      return false;
    }
    
    const userUuid = users[0].uuid;
    
    // Test multiple permissions
    const testCases = [
      { resource: 'employees', action: 'view' },
      { resource: 'employees', action: 'create' },
      { resource: 'employees', action: 'delete' },
      { resource: 'accounts', action: 'assign_role' },
      { resource: 'logs', action: 'view' }
    ];
    
    const results = await Promise.all(
      testCases.map(async ({ resource, action }) => {
        const allowed = await permit.check(userUuid, action, resource);
        return { resource, action, allowed };
      })
    );
    
    const allAllowed = results.every(r => r.allowed);
    const deniedPerms = results.filter(r => !r.allowed).map(r => `${r.action}:${r.resource}`);
    
    recordTest(
      'Super Admin has all permissions',
      allAllowed,
      allAllowed ? '' : `Denied: ${deniedPerms.join(', ')}`
    );
    return allAllowed;
  } catch (error) {
    recordTest('Super Admin permissions', false, error.message);
    return false;
  }
}

/**
 * Test 5: Test Employee restrictions
 */
async function testEmployeeRestrictions() {
  try {
    const [users] = await db.query(
      'SELECT uuid FROM Users WHERE role = ? AND isActive = 1 LIMIT 1',
      ['EMPLOYEE']
    );
    
    if (users.length === 0) {
      recordTest('Employee restrictions', false, 'No employee user found');
      return false;
    }
    
    const userUuid = users[0].uuid;
    
    // Test permissions that should be denied
    const deniedCases = [
      { resource: 'employees', action: 'create' },
      { resource: 'employees', action: 'delete' },
      { resource: 'accounts', action: 'create' },
      { resource: 'departments', action: 'create' },
      { resource: 'logs', action: 'view' }
    ];
    
    // Test permissions that should be allowed
    const allowedCases = [
      { resource: 'employees', action: 'view' },
      { resource: 'requests', action: 'create' },
      { resource: 'dashboard', action: 'view' }
    ];
    
    const deniedResults = await Promise.all(
      deniedCases.map(async ({ resource, action }) => {
        const allowed = await permit.check(userUuid, action, resource);
        return { resource, action, allowed };
      })
    );
    
    const allowedResults = await Promise.all(
      allowedCases.map(async ({ resource, action }) => {
        const allowed = await permit.check(userUuid, action, resource);
        return { resource, action, allowed };
      })
    );
    
    const correctlyDenied = deniedResults.every(r => !r.allowed);
    const correctlyAllowed = allowedResults.every(r => r.allowed);
    const passed = correctlyDenied && correctlyAllowed;
    
    let details = '';
    if (!correctlyDenied) {
      const wronglyAllowed = deniedResults.filter(r => r.allowed).map(r => `${r.action}:${r.resource}`);
      details = `Wrongly allowed: ${wronglyAllowed.join(', ')}`;
    }
    if (!correctlyAllowed) {
      const wronglyDenied = allowedResults.filter(r => !r.allowed).map(r => `${r.action}:${r.resource}`);
      details += ` Wrongly denied: ${wronglyDenied.join(', ')}`;
    }
    
    recordTest('Employee has correct restrictions', passed, details.trim());
    return passed;
  } catch (error) {
    recordTest('Employee restrictions', false, error.message);
    return false;
  }
}

/**
 * Test 6: Test HR Admin permissions
 */
async function testHRAdminPermissions() {
  try {
    const [users] = await db.query(
      'SELECT uuid FROM Users WHERE role = ? AND isActive = 1 LIMIT 1',
      ['HR_ADMIN']
    );
    
    if (users.length === 0) {
      recordTest('HR Admin permissions', false, 'No HR Admin user found');
      return false;
    }
    
    const userUuid = users[0].uuid;
    
    // Test HR Admin should have these permissions
    const testCases = [
      { resource: 'employees', action: 'view' },
      { resource: 'employees', action: 'create' },
      { resource: 'employees', action: 'update' },
      { resource: 'attendance', action: 'approve' },
      { resource: 'leave', action: 'rebuild_all' },
      { resource: 'requests', action: 'approve' },
      { resource: 'departments', action: 'create' }
    ];
    
    const results = await Promise.all(
      testCases.map(async ({ resource, action }) => {
        const allowed = await permit.check(userUuid, action, resource);
        return { resource, action, allowed };
      })
    );
    
    const allAllowed = results.every(r => r.allowed);
    const deniedPerms = results.filter(r => !r.allowed).map(r => `${r.action}:${r.resource}`);
    
    recordTest(
      'HR Admin has required permissions',
      allAllowed,
      allAllowed ? '' : `Denied: ${deniedPerms.join(', ')}`
    );
    return allAllowed;
  } catch (error) {
    recordTest('HR Admin permissions', false, error.message);
    return false;
  }
}

/**
 * Test 7: Test Department Head permissions
 */
async function testDepartmentHeadPermissions() {
  try {
    const [users] = await db.query(
      'SELECT uuid FROM Users WHERE role = ? AND isActive = 1 LIMIT 1',
      ['DEPARTMENT_HEAD']
    );
    
    if (users.length === 0) {
      recordTest('Department Head permissions', false, 'No Department Head user found');
      return false;
    }
    
    const userUuid = users[0].uuid;
    
    // Should have these permissions
    const allowedCases = [
      { resource: 'employees', action: 'view' },
      { resource: 'requests', action: 'approve' },
      { resource: 'attendance', action: 'approve' }
    ];
    
    // Should NOT have these permissions
    const deniedCases = [
      { resource: 'employees', action: 'create' },
      { resource: 'employees', action: 'delete' },
      { resource: 'departments', action: 'create' },
      { resource: 'accounts', action: 'create' }
    ];
    
    const allowedResults = await Promise.all(
      allowedCases.map(async ({ resource, action }) => {
        const allowed = await permit.check(userUuid, action, resource);
        return { resource, action, allowed };
      })
    );
    
    const deniedResults = await Promise.all(
      deniedCases.map(async ({ resource, action }) => {
        const allowed = await permit.check(userUuid, action, resource);
        return { resource, action, allowed };
      })
    );
    
    const correctlyAllowed = allowedResults.every(r => r.allowed);
    const correctlyDenied = deniedResults.every(r => !r.allowed);
    const passed = correctlyAllowed && correctlyDenied;
    
    let details = '';
    if (!correctlyAllowed) {
      const wronglyDenied = allowedResults.filter(r => !r.allowed).map(r => `${r.action}:${r.resource}`);
      details = `Wrongly denied: ${wronglyDenied.join(', ')}`;
    }
    if (!correctlyDenied) {
      const wronglyAllowed = deniedResults.filter(r => r.allowed).map(r => `${r.action}:${r.resource}`);
      details += ` Wrongly allowed: ${wronglyAllowed.join(', ')}`;
    }
    
    recordTest('Department Head has correct permissions', passed, details.trim());
    return passed;
  } catch (error) {
    recordTest('Department Head permissions', false, error.message);
    return false;
  }
}

/**
 * Test 8: Test inactive user
 */
async function testInactiveUser() {
  try {
    const [users] = await db.query(
      'SELECT uuid FROM Users WHERE isActive = 0 LIMIT 1'
    );
    
    if (users.length === 0) {
      log('No inactive user found, skipping test', 'warning');
      return true;
    }
    
    const userUuid = users[0].uuid;
    
    // Inactive user should not have any permissions
    const testCases = [
      { resource: 'employees', action: 'view' },
      { resource: 'dashboard', action: 'view' }
    ];
    
    const results = await Promise.all(
      testCases.map(async ({ resource, action }) => {
        const allowed = await permit.check(userUuid, action, resource);
        return { resource, action, allowed };
      })
    );
    
    const allDenied = results.every(r => !r.allowed);
    const wronglyAllowed = results.filter(r => r.allowed).map(r => `${r.action}:${r.resource}`);
    
    recordTest(
      'Inactive user has no permissions',
      allDenied,
      allDenied ? '' : `Wrongly allowed: ${wronglyAllowed.join(', ')}`
    );
    return allDenied;
  } catch (error) {
    recordTest('Inactive user check', false, error.message);
    return false;
  }
}

/**
 * Main test runner
 */
async function runTests() {
  console.log('═══════════════════════════════════════════════════════════════');
  console.log('🧪 Permit.io Authorization Testing');
  console.log('═══════════════════════════════════════════════════════════════\n');
  
  try {
    // Run all tests
    await testPermitConnection();
    await testResourcesExist();
    await testUsersSynced();
    await testSuperAdminPermissions();
    await testHRAdminPermissions();
    await testDepartmentHeadPermissions();
    await testEmployeeRestrictions();
    await testInactiveUser();
    
    // Print summary
    console.log('\n═══════════════════════════════════════════════════════════════');
    console.log('📊 Test Summary');
    console.log('═══════════════════════════════════════════════════════════════');
    console.log(`Total Tests: ${results.passed + results.failed}`);
    console.log(`✓ Passed: ${results.passed}`);
    console.log(`✗ Failed: ${results.failed}`);
    console.log(`Success Rate: ${Math.round((results.passed / (results.passed + results.failed)) * 100)}%`);
    
    if (results.failed === 0) {
      console.log('\n🎉 All tests passed! Authorization system is working correctly.');
      process.exit(0);
    } else {
      console.log('\n⚠ Some tests failed. Please review the errors above.');
      console.log('\nFailed tests:');
      results.tests
        .filter(t => !t.passed)
        .forEach(t => console.log(`  - ${t.name}: ${t.details}`));
      process.exit(1);
    }
  } catch (error) {
    console.error('\n❌ Test suite failed:', error);
    process.exit(1);
  } finally {
    // Close database connection
    await db.end();
  }
}

// Run tests if executed directly
if (require.main === module) {
  runTests();
}

module.exports = { runTests };
