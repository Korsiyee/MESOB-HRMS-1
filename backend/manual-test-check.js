#!/usr/bin/env node
/**
 * Manual test validation script
 * This script validates that preservation tests can run by checking prerequisites
 */

const db = require('./src/config/db');
const app = require('./src/app');

async function checkPrerequisites() {
  console.log('=== Preservation Test Prerequisites Check ===\n');
  
  // Check 1: Database connection
  try {
    console.log('1. Checking database connection...');
    await db.query('SELECT 1 as test');
    console.log('   ✓ Database connection successful\n');
  } catch (error) {
    console.log('   ✗ Database connection failed:', error.message);
    console.log('   This may cause tests to fail\n');
  }
  
  // Check 2: App structure
  console.log('2. Checking app structure...');
  console.log('   ✓ App module loaded successfully\n');
  
  // Check 3: Check if test dependencies are installed
  try {
    require('fast-check');
    console.log('3. fast-check installed: ✓\n');
  } catch (error) {
    console.log('3. fast-check NOT installed: ✗\n');
  }
  
  try {
    require('supertest');
    console.log('4. supertest installed: ✓\n');
  } catch (error) {
    console.log('4. supertest NOT installed: ✗\n');
  }
  
  try {
    require('jest');
    console.log('5. jest installed: ✓\n');
  } catch (error) {
    console.log('5. jest NOT installed: ✗\n');
  }
  
  console.log('=== Prerequisites check complete ===\n');
  console.log('If all checks passed, preservation tests should be runnable.');
  console.log('Run: npm test -- preservationPropertyTests.test.js\n');
  
  await db.end();
  process.exit(0);
}

checkPrerequisites().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
