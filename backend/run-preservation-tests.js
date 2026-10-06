#!/usr/bin/env node
/**
 * Phase 6: Preservation Tests - Re-run Verification
 * 
 * This script re-runs all baseline tests from Phase 2 to verify that
 * cleanup operations have NOT changed any functional behavior.
 */

const mysql = require('mysql2/promise');
require('dotenv').config();

const BASELINE = {
  users: 8,
  roles: 5,
  scopes: 3,
  modules: 7,
  roleModules: 7,
  employees: 25,
  departments: 38,
  attendanceLogs: 0
};

async function runPreservationTests() {
  console.log('\n═══════════════════════════════════════════════════════════');
  console.log('Phase 6: Preservation Testing - Re-run Verification');
  console.log('═══════════════════════════════════════════════════════════\n');
  
  let connection;
  const results = {
    passed: [],
    failed: [],
    warnings: []
  };
  
  try {
    // Connect to database
    connection = await mysql.createConnection({
      host: process.env.DB_HOST || 'localhost',
      user: process.env.DB_USER || 'mesob',
      password: process.env.DB_PASSWORD || 'mesob_password',
      database: process.env.DB_NAME || 'mesob_hrms'
    });
    
    console.log('✓ Database connection established\n');
    
    // Test 8.6: Database State Preservation Test
    console.log('═══ Task 8.6: Database State Preservation Test ═══\n');
    
    const tests = [
      { name: 'Users', table: 'Users', expected: BASELINE.users },
      { name: 'Roles', table: 'Roles', expected: BASELINE.roles },
      { name: 'Scopes', table: 'Scopes', expected: BASELINE.scopes },
      { name: 'Modules', table: 'Modules', expected: BASELINE.modules },
      { name: 'RoleModules', table: 'RoleModules', expected: BASELINE.roleModules },
      { name: 'Employees', table: 'Employees', expected: BASELINE.employees },
      { name: 'Departments', table: 'Departments', expected: BASELINE.departments }
    ];
    
    for (const test of tests) {
      const [rows] = await connection.execute(`SELECT COUNT(*) as count FROM ${test.table}`);
      const actual = rows[0].count;
      const passed = actual === test.expected;
      
      if (passed) {
        console.log(`✓ ${test.name}: ${actual} records (expected ${test.expected})`);
        results.passed.push(`${test.name} count preserved`);
      } else {
        console.log(`✗ ${test.name}: ${actual} records (expected ${test.expected}) - MISMATCH!`);
        results.failed.push(`${test.name} count changed from ${test.expected} to ${actual}`);
      }
    }
    
    // Verify SUPER_ADMIN has all modules
    console.log('\n═══ RBAC Verification ═══\n');
    const [roleModules] = await connection.execute(`
      SELECT COUNT(*) as count 
      FROM RoleModules rm
      JOIN Roles r ON rm.role_uuid = r.uuid
      WHERE r.code = 'SUPER_ADMIN'
    `);
    
    const superAdminModules = roleModules[0].count;
    if (superAdminModules === 7) {
      console.log(`✓ SUPER_ADMIN has ${superAdminModules} modules (expected 7)`);
      results.passed.push('SUPER_ADMIN module access preserved');
    } else {
      console.log(`✗ SUPER_ADMIN has ${superAdminModules} modules (expected 7) - MISMATCH!`);
      results.failed.push(`SUPER_ADMIN modules changed from 7 to ${superAdminModules}`);
    }
    
    // Verify all users are active
    const [activeUsers] = await connection.execute(`
      SELECT username, role, is_active 
      FROM Users 
      ORDER BY username
    `);
    
    console.log('\n═══ User Account Verification ═══\n');
    activeUsers.forEach(user => {
      console.log(`  ${user.username.padEnd(20)} | ${user.role.padEnd(18)} | Active: ${user.is_active ? 'Yes' : 'No'}`);
      if (user.is_active) {
        results.passed.push(`User ${user.username} active`);
      } else {
        results.warnings.push(`User ${user.username} is inactive`);
      }
    });
    
    // Verify all modules are active
    const [activeModules] = await connection.execute(`
      SELECT code, name, is_active 
      FROM Modules 
      ORDER BY display_order
    `);
    
    console.log('\n═══ Module System Verification ═══\n');
    activeModules.forEach(module => {
      console.log(`  ${module.code.padEnd(15)} | ${module.name.padEnd(20)} | Active: ${module.is_active ? 'Yes' : 'No'}`);
      if (module.is_active) {
        results.passed.push(`Module ${module.code} active`);
      } else {
        results.warnings.push(`Module ${module.code} is inactive`);
      }
    });
    
    // Verify scope system
    const [scopes] = await connection.execute(`
      SELECT code, name, level 
      FROM Scopes 
      ORDER BY level DESC
    `);
    
    console.log('\n═══ Scope System Verification ═══\n');
    scopes.forEach(scope => {
      console.log(`  ${scope.code.padEnd(15)} | ${scope.name.padEnd(20)} | Level: ${scope.level}`);
      results.passed.push(`Scope ${scope.code} exists`);
    });
    
  } catch (error) {
    console.error('\n✗ Error during preservation tests:');
    console.error(error.message);
    results.failed.push(`Database test error: ${error.message}`);
  } finally {
    if (connection) {
      await connection.end();
    }
  }
  
  // Print summary
  console.log('\n═══════════════════════════════════════════════════════════');
  console.log('Test Summary');
  console.log('═══════════════════════════════════════════════════════════\n');
  console.log(`✓ Passed: ${results.passed.length} tests`);
  console.log(`✗ Failed: ${results.failed.length} tests`);
  console.log(`⚠ Warnings: ${results.warnings.length} warnings\n`);
  
  if (results.failed.length > 0) {
    console.log('Failed Tests:');
    results.failed.forEach(fail => console.log(`  ✗ ${fail}`));
    console.log('');
  }
  
  if (results.warnings.length > 0) {
    console.log('Warnings:');
    results.warnings.forEach(warn => console.log(`  ⚠ ${warn}`));
    console.log('');
  }
  
  // Overall result
  if (results.failed.length === 0) {
    console.log('═══════════════════════════════════════════════════════════');
    console.log('✓ ALL PRESERVATION TESTS PASSED');
    console.log('═══════════════════════════════════════════════════════════');
    console.log('All functional capabilities preserved after cleanup.');
    console.log('No regressions detected.\n');
    process.exit(0);
  } else {
    console.log('═══════════════════════════════════════════════════════════');
    console.log('✗ PRESERVATION TESTS FAILED');
    console.log('═══════════════════════════════════════════════════════════');
    console.log('Some functional capabilities changed after cleanup!');
    console.log('Review failed tests above.\n');
    process.exit(1);
  }
}

// Run tests
runPreservationTests();
