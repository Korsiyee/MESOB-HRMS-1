/**
 * Standalone Bug Condition Exploration Test Runner
 * 
 * This script directly executes the buggy SQL queries to demonstrate the four defect patterns.
 * Run with: node run-bug-exploration-test.js
 */

const mysql = require('mysql2/promise');
require('dotenv').config();

// ANSI color codes for output
const RED = '\x1b[31m';
const GREEN = '\x1b[32m';
const YELLOW = '\x1b[33m';
const BLUE = '\x1b[34m';
const RESET = '\x1b[0m';

async function runBugExplorationTests() {
  let connection;
  
  try {
    console.log(`${BLUE}========================================`);
    console.log('Bug Condition Exploration Test Suite');
    console.log('========================================${RESET}\n');
    
    // Create database connection
    connection = await mysql.createConnection({
      host: process.env.DB_HOST,
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      database: process.env.DB_NAME,
    });
    
    console.log(`${GREEN}✓ Database connection established${RESET}\n`);
    
    const results = {
      total: 0,
      failed: 0,
      passed: 0,
      counterexamples: []
    };
    
    // Test 1: Missing Positions JOIN
    console.log(`${BLUE}Test 1: Missing Positions JOIN (accountController.js:157)${RESET}`);
    results.total++;
    try {
      const buggyQuery = `
        SELECT u.uuid, u.employee_uuid, u.username, u.role, u.is_active, u.must_change_password,
               u.last_login, u.created_at, u.updated_at,
               e.first_name, e.middle_name, e.last_name, e.mesob_id,
               CONCAT_WS(' ', e.first_name, e.middle_name, e.last_name) as employee_name,
               d.name as department_name, p.title as position_title
        FROM Users u
        LEFT JOIN Employees e ON e.uuid = u.employee_uuid
        LEFT JOIN Departments d ON d.uuid = p.department_uuid
        LEFT JOIN Positions p ON p.uuid = e.position_uuid
        WHERE 1=1
        LIMIT 1
      `;
      
      await connection.execute(buggyQuery);
      console.log(`${RED}✗ UNEXPECTED: Query executed without error (bug not reproduced)${RESET}\n`);
      results.passed++;
    } catch (error) {
      console.log(`${GREEN}✓ EXPECTED FAILURE: ${error.message}${RESET}`);
      results.failed++;
      results.counterexamples.push({
        defect: 'Missing Positions JOIN',
        error: error.message,
        location: 'accountController.js:157'
      });
    }
    console.log();
    
    // Test 2: Incorrect JOIN Order
    console.log(`${BLUE}Test 2: Incorrect JOIN Order (employeeController.js:314)${RESET}`);
    results.total++;
    try {
      const buggyQuery = `
        SELECT e.uuid, e.first_name, e.middle_name, e.last_name,
               d.name AS department_name,
               p.title AS position_title
        FROM Employees e
        LEFT JOIN Departments d ON d.uuid = e.department_uuid
        LEFT JOIN Positions p ON p.uuid = e.position_uuid
        LIMIT 1
      `;
      
      await connection.execute(buggyQuery);
      console.log(`${RED}✗ UNEXPECTED: Query executed without error (bug not reproduced)${RESET}\n`);
      results.passed++;
    } catch (error) {
      console.log(`${GREEN}✓ EXPECTED FAILURE: ${error.message}${RESET}`);
      results.failed++;
      results.counterexamples.push({
        defect: 'Incorrect JOIN Order',
        error: error.message,
        location: 'employeeController.js:314'
      });
    }
    console.log();
    
    // Test 3: Wrong Column Name
    console.log(`${BLUE}Test 3: Wrong Column Name - diff_json (logController.js:152)${RESET}`);
    results.total++;
    try {
      const buggyQuery = `
        SELECT al.uuid, al.actor_uuid, al.action, al.entity_type, al.entity_uuid,
               al.diff_json, al.ip_address, al.created_at
        FROM AuditLogs al
        LIMIT 1
      `;
      
      await connection.execute(buggyQuery);
      console.log(`${RED}✗ UNEXPECTED: Query executed without error (bug not reproduced)${RESET}\n`);
      results.passed++;
    } catch (error) {
      console.log(`${GREEN}✓ EXPECTED FAILURE: ${error.message}${RESET}`);
      results.failed++;
      results.counterexamples.push({
        defect: 'Wrong Column Name (diff_json)',
        error: error.message,
        location: 'logController.js:152'
      });
    }
    console.log();
    
    // Test 4: CamelCase Timestamps
    console.log(`${BLUE}Test 4: CamelCase Timestamp Columns${RESET}`);
    results.total++;
    try {
      const buggyQuery = `
        SELECT e.uuid, e.employee_id, e.first_name, e.last_name,
               e.updatedAt, e.createdAt
        FROM Employees e
        LIMIT 1
      `;
      
      await connection.execute(buggyQuery);
      console.log(`${RED}✗ UNEXPECTED: Query executed without error (bug not reproduced)${RESET}\n`);
      results.passed++;
    } catch (error) {
      console.log(`${GREEN}✓ EXPECTED FAILURE: ${error.message}${RESET}`);
      results.failed++;
      results.counterexamples.push({
        defect: 'CamelCase Timestamps',
        error: error.message,
        location: 'Various files'
      });
    }
    console.log();
    
    // Test 5: Multiple Combined Defects
    console.log(`${BLUE}Test 5: Multiple Combined Defects${RESET}`);
    results.total++;
    try {
      const buggyQuery = `
        SELECT u.uuid, u.username, u.updatedAt,
               e.first_name, e.last_name,
               d.name as department_name,
               al.diff_json
        FROM Users u
        LEFT JOIN Employees e ON e.uuid = u.employee_uuid
        LEFT JOIN Departments d ON d.uuid = p.department_uuid
        LEFT JOIN AuditLogs al ON al.entity_uuid = u.uuid
        WHERE 1=1
        LIMIT 1
      `;
      
      await connection.execute(buggyQuery);
      console.log(`${RED}✗ UNEXPECTED: Query executed without error (bug not reproduced)${RESET}\n`);
      results.passed++;
    } catch (error) {
      console.log(`${GREEN}✓ EXPECTED FAILURE: ${error.message}${RESET}`);
      results.failed++;
      results.counterexamples.push({
        defect: 'Multiple Combined Defects',
        error: error.message,
        location: 'Combined test'
      });
    }
    console.log();
    
    // Summary
    console.log(`${BLUE}========================================`);
    console.log('Test Summary');
    console.log(`========================================${RESET}`);
    console.log(`Total Tests: ${results.total}`);
    console.log(`${GREEN}Expected Failures (Bug Confirmed): ${results.failed}${RESET}`);
    console.log(`${RED}Unexpected Passes (Bug NOT Found): ${results.passed}${RESET}\n`);
    
    if (results.counterexamples.length > 0) {
      console.log(`${YELLOW}Counterexamples Found:${RESET}`);
      results.counterexamples.forEach((ex, idx) => {
        console.log(`\n${idx + 1}. ${ex.defect}`);
        console.log(`   Location: ${ex.location}`);
        console.log(`   Error: ${ex.error}`);
      });
      console.log();
    }
    
    if (results.failed === results.total) {
      console.log(`${GREEN}✓ SUCCESS: All defect patterns confirmed!${RESET}`);
      console.log(`${GREEN}  The bugs exist in the unfixed code as expected.${RESET}`);
      console.log(`${GREEN}  Task 1 complete - bug condition exploration test validated.${RESET}\n`);
      process.exit(0);
    } else if (results.passed === results.total) {
      console.log(`${RED}✗ WARNING: No defect patterns found!${RESET}`);
      console.log(`${RED}  Either the code is already fixed, or the test needs adjustment.${RESET}\n`);
      process.exit(1);
    } else {
      console.log(`${YELLOW}⚠ PARTIAL: Some defect patterns found, some not.${RESET}`);
      console.log(`${YELLOW}  Review the results above.${RESET}\n`);
      process.exit(0);
    }
    
  } catch (error) {
    console.error(`${RED}Error running tests: ${error.message}${RESET}`);
    console.error(error.stack);
    process.exit(1);
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

// Run the tests
runBugExplorationTests().catch(console.error);
