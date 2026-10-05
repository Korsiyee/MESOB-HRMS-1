#!/usr/bin/env node

/**
 * RBAC System Comprehensive Test Suite
 * Tests all major RBAC functionality
 * 
 * Usage: node scripts/testRBACSystem.js
 */

const axios = require('axios');

const API_URL = process.env.API_URL || 'http://localhost:5000';
const ADMIN_USERNAME = process.env.ADMIN_USERNAME || 'admin';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'admin123';

let adminToken = '';
let testRoleUuid = '';
let testPermissionUuid = '';

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

function section(title) {
  log(`\n${'='.repeat(60)}`, 'blue');
  log(`  ${title}`, 'blue');
  log(`${'='.repeat(60)}`, 'blue');
}

async function runTest(name, testFn) {
  try {
    info(`Running: ${name}`);
    await testFn();
    success(`PASSED: ${name}`);
    return true;
  } catch (err) {
    error(`FAILED: ${name}`);
    log(`  Error: ${err.response?.data?.error || err.message}`, 'red');
    if (err.response?.data) {
      log(`  Details: ${JSON.stringify(err.response.data, null, 2)}`, 'gray');
    }
    return false;
  }
}

// Test Suite
const tests = {
  async test1_Login() {
    const res = await axios.post(`${API_URL}/api/auth/login`, {
      username: ADMIN_USERNAME,
      password: ADMIN_PASSWORD
    });
    
    if (!res.data.token) throw new Error('No token received');
    adminToken = res.data.token;
    log(`  Token: ${adminToken.substring(0, 20)}...`, 'gray');
  },

  async test2_GetCurrentUser() {
    const res = await axios.get(`${API_URL}/api/auth/me`, {
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    
    if (!res.data.user) throw new Error('No user data');
    if (!res.data.user.permissions) throw new Error('No permissions in response');
    
    log(`  User: ${res.data.user.username}`, 'gray');
    log(`  Role: ${res.data.user.role}`, 'gray');
    log(`  Permissions: ${res.data.user.permissions.length}`, 'gray');
  },

  async test3_ListAllRoles() {
    const res = await axios.get(`${API_URL}/api/role-management/roles`, {
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    
    if (!res.data.roles || res.data.roles.length === 0) {
      throw new Error('No roles returned');
    }
    
    log(`  Found ${res.data.roles.length} roles`, 'gray');
    res.data.roles.forEach(role => {
      log(`    - ${role.name} (${role.code})`, 'gray');
    });
  },

  async test4_ListAllPermissions() {
    const res = await axios.get(`${API_URL}/api/role-management/permissions`, {
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    
    if (!res.data.permissions || res.data.permissions.length === 0) {
      throw new Error('No permissions returned');
    }
    
    testPermissionUuid = res.data.permissions[0].uuid;
    
    log(`  Found ${res.data.permissions.length} permissions`, 'gray');
    
    // Group by resource
    const grouped = {};
    res.data.permissions.forEach(p => {
      if (!grouped[p.resource]) grouped[p.resource] = [];
      grouped[p.resource].push(p.action);
    });
    
    Object.entries(grouped).forEach(([resource, actions]) => {
      log(`    - ${resource}: ${actions.join(', ')}`, 'gray');
    });
  },

  async test5_ListDataScopes() {
    const res = await axios.get(`${API_URL}/api/role-management/data-scopes`, {
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    
    if (!res.data.scopes || res.data.scopes.length === 0) {
      throw new Error('No data scopes returned');
    }
    
    log(`  Found ${res.data.scopes.length} data scopes`, 'gray');
    res.data.scopes.forEach(scope => {
      log(`    - ${scope.name} (${scope.code})`, 'gray');
    });
  },

  async test6_CreateCustomRole() {
    const res = await axios.post(
      `${API_URL}/api/role-management/roles`,
      {
        name: 'Test Role ' + Date.now(),
        code: 'TEST_ROLE_' + Date.now(),
        description: 'Automated test role',
        hierarchy_level: 50,
        is_active: true
      },
      { headers: { Authorization: `Bearer ${adminToken}` } }
    );
    
    if (!res.data.role || !res.data.role.uuid) {
      throw new Error('No role UUID in response');
    }
    
    testRoleUuid = res.data.role.uuid;
    log(`  Created role: ${testRoleUuid}`, 'gray');
    log(`  Name: ${res.data.role.name}`, 'gray');
  },

  async test7_AssignPermissionToRole() {
    if (!testRoleUuid || !testPermissionUuid) {
      throw new Error('Missing test role or permission UUID');
    }

    await axios.post(
      `${API_URL}/api/role-management/roles/${testRoleUuid}/permissions`,
      {
        permission_uuid: testPermissionUuid,
        data_scope: 'DEPARTMENT'
      },
      { headers: { Authorization: `Bearer ${adminToken}` } }
    );
    
    log(`  Assigned permission to role`, 'gray');
  },

  async test8_GetRolePermissions() {
    const res = await axios.get(
      `${API_URL}/api/role-management/roles/${testRoleUuid}/permissions`,
      { headers: { Authorization: `Bearer ${adminToken}` } }
    );
    
    if (!res.data.permissions || res.data.permissions.length === 0) {
      throw new Error('No permissions assigned to role');
    }
    
    log(`  Role has ${res.data.permissions.length} permission(s)`, 'gray');
    res.data.permissions.forEach(p => {
      log(`    - ${p.name} (Scope: ${p.data_scope || 'None'})`, 'gray');
    });
  },

  async test9_UpdatePermissionScope() {
    await axios.patch(
      `${API_URL}/api/role-management/roles/${testRoleUuid}/permissions/${testPermissionUuid}/scope`,
      { data_scope: 'ALL' },
      { headers: { Authorization: `Bearer ${adminToken}` } }
    );
    
    log(`  Updated permission scope to ALL`, 'gray');
  },

  async test10_GetRoleDetails() {
    const res = await axios.get(
      `${API_URL}/api/role-management/roles/${testRoleUuid}`,
      { headers: { Authorization: `Bearer ${adminToken}` } }
    );
    
    if (!res.data.role) throw new Error('No role data');
    
    log(`  Role: ${res.data.role.name}`, 'gray');
    log(`  Code: ${res.data.role.code}`, 'gray');
    log(`  Level: ${res.data.role.hierarchy_level}`, 'gray');
    log(`  Active: ${res.data.role.is_active}`, 'gray');
  },

  async test11_UpdateRole() {
    await axios.put(
      `${API_URL}/api/role-management/roles/${testRoleUuid}`,
      {
        name: 'Updated Test Role',
        description: 'Updated description',
        hierarchy_level: 55
      },
      { headers: { Authorization: `Bearer ${adminToken}` } }
    );
    
    log(`  Updated role details`, 'gray');
  },

  async test12_DeactivateRole() {
    await axios.patch(
      `${API_URL}/api/role-management/roles/${testRoleUuid}/status`,
      { is_active: false },
      { headers: { Authorization: `Bearer ${adminToken}` } }
    );
    
    log(`  Deactivated role`, 'gray');
  },

  async test13_ActivateRole() {
    await axios.patch(
      `${API_URL}/api/role-management/roles/${testRoleUuid}/status`,
      { is_active: true },
      { headers: { Authorization: `Bearer ${adminToken}` } }
    );
    
    log(`  Reactivated role`, 'gray');
  },

  async test14_BulkAssignPermissions() {
    const res = await axios.get(`${API_URL}/api/role-management/permissions`, {
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    
    const permissions = res.data.permissions.slice(0, 5).map(p => ({
      permission_uuid: p.uuid,
      data_scope: 'DEPARTMENT'
    }));

    await axios.post(
      `${API_URL}/api/role-management/roles/${testRoleUuid}/permissions/bulk`,
      { permissions },
      { headers: { Authorization: `Bearer ${adminToken}` } }
    );
    
    log(`  Bulk assigned ${permissions.length} permissions`, 'gray');
  },

  async test15_RemovePermissionFromRole() {
    await axios.delete(
      `${API_URL}/api/role-management/roles/${testRoleUuid}/permissions/${testPermissionUuid}`,
      { headers: { Authorization: `Bearer ${adminToken}` } }
    );
    
    log(`  Removed permission from role`, 'gray');
  },

  async test16_GetRoleAuditLogs() {
    const res = await axios.get(
      `${API_URL}/api/role-management/roles/${testRoleUuid}/audit-logs`,
      { headers: { Authorization: `Bearer ${adminToken}` } }
    );
    
    if (!res.data.logs) throw new Error('No audit logs returned');
    
    log(`  Found ${res.data.logs.length} audit log entries`, 'gray');
    if (res.data.logs.length > 0) {
      log(`  Latest: ${res.data.logs[0].action} - ${res.data.logs[0].description}`, 'gray');
    }
  },

  async test17_DeleteRole() {
    await axios.delete(
      `${API_URL}/api/role-management/roles/${testRoleUuid}`,
      { headers: { Authorization: `Bearer ${adminToken}` } }
    );
    
    log(`  Deleted test role`, 'gray');
  },

  async test18_VerifyRoleDeleted() {
    try {
      await axios.get(
        `${API_URL}/api/role-management/roles/${testRoleUuid}`,
        { headers: { Authorization: `Bearer ${adminToken}` } }
      );
      throw new Error('Role still exists after deletion');
    } catch (err) {
      if (err.response && err.response.status === 404) {
        log(`  Confirmed role deleted (404 response)`, 'gray');
      } else {
        throw err;
      }
    }
  },

  async test19_TestSystemRoleProtection() {
    const rolesRes = await axios.get(`${API_URL}/api/role-management/roles`, {
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    
    const superAdminRole = rolesRes.data.roles.find(r => r.code === 'SUPER_ADMIN');
    if (!superAdminRole) throw new Error('Super Admin role not found');

    try {
      await axios.delete(
        `${API_URL}/api/role-management/roles/${superAdminRole.uuid}`,
        { headers: { Authorization: `Bearer ${adminToken}` } }
      );
      throw new Error('System role deletion should have been blocked');
    } catch (err) {
      if (err.response && (err.response.status === 403 || err.response.status === 400)) {
        log(`  System role protection working (${err.response.status})`, 'gray');
      } else {
        throw err;
      }
    }
  },

  async test20_TestInvalidToken() {
    try {
      await axios.get(`${API_URL}/api/role-management/roles`, {
        headers: { Authorization: 'Bearer invalid_token_12345' }
      });
      throw new Error('Invalid token should have been rejected');
    } catch (err) {
      if (err.response && err.response.status === 401) {
        log(`  Invalid token correctly rejected (401)`, 'gray');
      } else {
        throw err;
      }
    }
  }
};

async function runAllTests() {
  section('RBAC System Comprehensive Test Suite');
  
  log(`API URL: ${API_URL}`, 'yellow');
  log(`Admin User: ${ADMIN_USERNAME}`, 'yellow');
  log('');

  const testNames = Object.keys(tests);
  const results = {
    passed: 0,
    failed: 0,
    total: testNames.length
  };

  for (const testName of testNames) {
    const testNumber = testName.match(/\d+/)[0];
    const testDescription = testName.replace(/test\d+_/, '').replace(/_/g, ' ');
    
    const passed = await runTest(`Test ${testNumber}: ${testDescription}`, tests[testName]);
    
    if (passed) {
      results.passed++;
    } else {
      results.failed++;
    }
    
    // Small delay between tests
    await new Promise(resolve => setTimeout(resolve, 100));
  }

  // Final Summary
  section('Test Results Summary');
  log(`Total Tests: ${results.total}`, 'blue');
  log(`Passed: ${results.passed}`, results.passed === results.total ? 'green' : 'yellow');
  log(`Failed: ${results.failed}`, results.failed > 0 ? 'red' : 'green');
  log(`Success Rate: ${((results.passed / results.total) * 100).toFixed(1)}%`, 
      results.passed === results.total ? 'green' : 'yellow');

  if (results.failed === 0) {
    log('\n🎉 All tests passed! RBAC system is working correctly.', 'green');
    process.exit(0);
  } else {
    log(`\n⚠️  ${results.failed} test(s) failed. Please review the errors above.`, 'red');
    process.exit(1);
  }
}

// Handle errors
process.on('unhandledRejection', (err) => {
  error('Unhandled error:');
  console.error(err);
  process.exit(1);
});

// Check if server is running
async function checkServer() {
  try {
    await axios.get(`${API_URL}/api/health`, { timeout: 5000 });
    return true;
  } catch (err) {
    return false;
  }
}

// Main
async function main() {
  log('Checking if server is running...', 'yellow');
  const serverRunning = await checkServer();
  
  if (!serverRunning) {
    error(`Server is not running at ${API_URL}`);
    log('\nPlease start the backend server first:', 'yellow');
    log('  cd backend && npm start\n', 'gray');
    process.exit(1);
  }

  success('Server is running\n');
  await runAllTests();
}

main();
