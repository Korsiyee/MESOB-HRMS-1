#!/usr/bin/env node
/**
 * API Testing Script for Baseline Functionality
 * This script tests the API endpoints to establish baseline behavior before cleanup
 */

const axios = require('axios');
const fs = require('fs');
const path = require('path');

const BASE_URL = 'http://localhost:5000/api';
let adminToken = '';
let employeeToken = '';

// Results object to store all test results
const results = {
  timestamp: new Date().toISOString(),
  tests: []
};

async function log(message, data = null) {
  const entry = {
    message,
    timestamp: new Date().toISOString(),
    data
  };
  results.tests.push(entry);
  console.log(`[${entry.timestamp}] ${message}`);
  if (data) {
    console.log(JSON.stringify(data, null, 2));
  }
}

async function testAuthentication() {
  console.log('\n=== SUB-TASK 2.1: Authentication Baseline Test ===\n');
  
  try {
    // Test admin login
    const adminLogin = await axios.post(`${BASE_URL}/auth/login`, {
      username: 'admin',
      password: 'admin123'
    });
    
    await log('✓ Admin login successful', {
      status: adminLogin.status,
      hasToken: !!adminLogin.data.token,
      hasRefreshToken: !!adminLogin.data.refreshToken,
      hasUser: !!adminLogin.data.user,
      tokenType: typeof adminLogin.data.token,
      userFields: Object.keys(adminLogin.data.user || {})
    });
    
    adminToken = adminLogin.data.token;
    
    // Test employee login
    const employeeLogin = await axios.post(`${BASE_URL}/auth/login`, {
      username: 'employee',
      password: 'emp123'
    });
    
    await log('✓ Employee login successful', {
      status: employeeLogin.status,
      hasToken: !!employeeLogin.data.token,
      hasRefreshToken: !!employeeLogin.data.refreshToken,
      hasUser: !!employeeLogin.data.user
    });
    
    employeeToken = employeeLogin.data.token;
    
    return true;
  } catch (error) {
    await log('✗ Authentication test failed', {
      error: error.message,
      response: error.response?.data
    });
    return false;
  }
}

async function testRBAC() {
  console.log('\n=== SUB-TASK 2.2: RBAC Baseline Test ===\n');
  
  try {
    // Test SUPER_ADMIN access to modules
    const adminModules = await axios.get(`${BASE_URL}/users/me/permissions`, {
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    
    await log('✓ Admin permissions retrieved', {
      status: adminModules.status,
      hasModules: !!adminModules.data.modules,
      moduleCount: adminModules.data.modules?.length || 0,
      modules: adminModules.data.modules?.map(m => m.moduleName || m.name) || []
    });
    
    // Test EMPLOYEE access (should be limited)
    const employeeModules = await axios.get(`${BASE_URL}/users/me/permissions`, {
      headers: { Authorization: `Bearer ${employeeToken}` }
    });
    
    await log('✓ Employee permissions retrieved', {
      status: employeeModules.status,
      hasModules: !!employeeModules.data.modules,
      moduleCount: employeeModules.data.modules?.length || 0,
      modules: employeeModules.data.modules?.map(m => m.moduleName || m.name) || []
    });
    
    // Test accessing a protected endpoint as employee (should fail or be limited)
    try {
      const employeeAccessTest = await axios.get(`${BASE_URL}/employees`, {
        headers: { Authorization: `Bearer ${employeeToken}` }
      });
      await log('✓ Employee can access employees endpoint (limited scope expected)', {
        status: employeeAccessTest.status,
        recordCount: employeeAccessTest.data.length || employeeAccessTest.data.employees?.length || 0
      });
    } catch (error) {
      if (error.response?.status === 403) {
        await log('✓ Employee correctly denied access to employees endpoint', {
          status: 403,
          message: error.response.data.message
        });
      } else {
        throw error;
      }
    }
    
    return true;
  } catch (error) {
    await log('✗ RBAC test failed', {
      error: error.message,
      response: error.response?.data
    });
    return false;
  }
}

async function testAttendance() {
  console.log('\n=== SUB-TASK 2.3: Attendance Features Baseline Test ===\n');
  
  try {
    // Get attendance records
    const attendanceList = await axios.get(`${BASE_URL}/attendance`, {
      headers: { Authorization: `Bearer ${adminToken}` },
      params: { limit: 5 }
    });
    
    await log('✓ Attendance list retrieved', {
      status: attendanceList.status,
      recordCount: attendanceList.data.length || attendanceList.data.records?.length || 0,
      hasData: !!attendanceList.data
    });
    
    // Try to create attendance record (may need specific employee ID)
    try {
      const createAttendance = await axios.post(`${BASE_URL}/attendance`, {
        date: new Date().toISOString().split('T')[0],
        status: 'PRESENT',
        checkInTime: '09:00:00'
      }, {
        headers: { Authorization: `Bearer ${adminToken}` }
      });
      
      await log('✓ Attendance record created', {
        status: createAttendance.status,
        recordId: createAttendance.data.id || createAttendance.data.uuid
      });
    } catch (error) {
      await log('ℹ Attendance creation test (may require specific params)', {
        status: error.response?.status,
        message: error.response?.data?.message || error.message
      });
    }
    
    return true;
  } catch (error) {
    await log('✗ Attendance test failed', {
      error: error.message,
      response: error.response?.data
    });
    return false;
  }
}

async function testPermits() {
  console.log('\n=== SUB-TASK 2.4: Permit Features Baseline Test ===\n');
  
  try {
    // Get permit records
    const permitList = await axios.get(`${BASE_URL}/permits`, {
      headers: { Authorization: `Bearer ${adminToken}` },
      params: { limit: 5 }
    });
    
    await log('✓ Permit list retrieved', {
      status: permitList.status,
      recordCount: permitList.data.length || permitList.data.permits?.length || 0,
      hasData: !!permitList.data
    });
    
    // Try to create permit request
    try {
      const createPermit = await axios.post(`${BASE_URL}/permits`, {
        permitType: 'PERSONAL',
        startDate: new Date().toISOString().split('T')[0],
        endDate: new Date().toISOString().split('T')[0],
        reason: 'Baseline test permit'
      }, {
        headers: { Authorization: `Bearer ${adminToken}` }
      });
      
      await log('✓ Permit record created', {
        status: createPermit.status,
        permitId: createPermit.data.id || createPermit.data.uuid,
        permitStatus: createPermit.data.status
      });
    } catch (error) {
      await log('ℹ Permit creation test (may require specific params)', {
        status: error.response?.status,
        message: error.response?.data?.message || error.message
      });
    }
    
    return true;
  } catch (error) {
    await log('✗ Permit test failed', {
      error: error.message,
      response: error.response?.data
    });
    return false;
  }
}

async function testAPIEndpoints() {
  console.log('\n=== SUB-TASK 2.5: API Endpoints Comprehensive Baseline ===\n');
  
  const endpoints = [
    { method: 'GET', path: '/employees', name: 'Get Employees' },
    { method: 'GET', path: '/departments', name: 'Get Departments' },
    { method: 'GET', path: '/leaves', name: 'Get Leaves' },
    { method: 'GET', path: '/users', name: 'Get Users' },
    { method: 'GET', path: '/users/me', name: 'Get Current User' },
  ];
  
  for (const endpoint of endpoints) {
    try {
      const response = await axios({
        method: endpoint.method,
        url: `${BASE_URL}${endpoint.path}`,
        headers: { Authorization: `Bearer ${adminToken}` }
      });
      
      await log(`✓ ${endpoint.name}`, {
        status: response.status,
        hasData: !!response.data,
        dataType: Array.isArray(response.data) ? 'array' : typeof response.data,
        recordCount: Array.isArray(response.data) ? response.data.length : (response.data?.length || 'N/A')
      });
    } catch (error) {
      await log(`✗ ${endpoint.name} failed`, {
        status: error.response?.status,
        message: error.response?.data?.message || error.message
      });
    }
  }
  
  return true;
}

async function testDatabaseState() {
  console.log('\n=== SUB-TASK 2.6: Database State Baseline ===\n');
  
  const mysql = require('mysql2/promise');
  
  try {
    const connection = await mysql.createConnection({
      host: process.env.DB_HOST || 'localhost',
      user: process.env.DB_USER || 'mesob',
      password: process.env.DB_PASSWORD || 'mesob_password',
      database: process.env.DB_NAME || 'mesob_hrms'
    });
    
    // Count rows in key tables
    const tables = ['Users', 'Roles', 'RoleModules', 'Modules', 'Scopes'];
    
    for (const table of tables) {
      const [rows] = await connection.execute(`SELECT COUNT(*) as count FROM ${table}`);
      await log(`✓ Table ${table} row count`, {
        table,
        count: rows[0].count
      });
    }
    
    // Get all roles
    const [roles] = await connection.execute('SELECT * FROM Roles');
    await log('✓ All roles retrieved', {
      roles: roles.map(r => ({ name: r.roleName, level: r.level }))
    });
    
    // Get all scopes
    const [scopes] = await connection.execute('SELECT * FROM Scopes');
    await log('✓ All scopes retrieved', {
      scopes: scopes.map(s => ({ name: s.scopeName, level: s.level }))
    });
    
    await connection.end();
    return true;
  } catch (error) {
    await log('✗ Database state test failed', {
      error: error.message
    });
    return false;
  }
}

async function runAllTests() {
  console.log('Starting Baseline Functionality Tests...\n');
  console.log('This will establish the baseline behavior BEFORE any cleanup changes.\n');
  
  // Wait for server to be ready
  console.log('Waiting for server to be ready...');
  await new Promise(resolve => setTimeout(resolve, 2000));
  
  const authOk = await testAuthentication();
  if (!authOk) {
    console.error('\nAuthentication failed - cannot proceed with other tests');
    return;
  }
  
  await testRBAC();
  await testAttendance();
  await testPermits();
  await testAPIEndpoints();
  await testDatabaseState();
  
  // Save results to file
  const outputPath = path.join(__dirname, 'baseline-test-results.json');
  fs.writeFileSync(outputPath, JSON.stringify(results, null, 2));
  console.log(`\n✓ Baseline test results saved to: ${outputPath}`);
  
  console.log('\n=== Baseline Testing Complete ===');
  console.log(`Total tests executed: ${results.tests.length}`);
}

// Check if server is accessible before running tests
axios.get('http://localhost:5000/')
  .then(() => {
    console.log('✓ Server is accessible\n');
    runAllTests().then(() => process.exit(0)).catch(err => {
      console.error('Error running tests:', err);
      process.exit(1);
    });
  })
  .catch(err => {
    console.error('✗ Cannot connect to server at http://localhost:5000');
    console.error('Please ensure the backend server is running with: npm start');
    process.exit(1);
  });
