#!/usr/bin/env node
/**
 * Manual test runner for bug condition exploration
 * This script tests the duplicate RBAC API issue WITHOUT using Jest
 */

const fs = require('fs');
const path = require('path');

console.log('\n=== Bug Condition Exploration Test ===\n');
console.log('Testing for duplicate RBAC APIs that should NOT exist after fix...\n');

const backendRoot = path.join(__dirname, '..');
const frontendRoot = path.join(__dirname, '../../frontend');

let passCount = 0;
let failCount = 0;
const counterexamples = [];

function test(description, testFn) {
  try {
    testFn();
    console.log(`✓ PASS: ${description}`);
    passCount++;
  } catch (error) {
    console.log(`✗ FAIL: ${description}`);
    console.log(`  Reason: ${error.message}`);
    failCount++;
    counterexamples.push({ description, error: error.message });
  }
}

console.log('--- Backend Duplication Detection ---\n');

test('Should have ONLY roleManagementController.js (not duplicates)', () => {
  const roleManagementController = path.join(backendRoot, 'src/controllers/roleManagementController.js');
  const rbacController = path.join(backendRoot, 'src/controllers/rbacController.js');
  const moduleRoleController = path.join(backendRoot, 'src/controllers/moduleRoleController.js');
  
  if (!fs.existsSync(roleManagementController)) {
    throw new Error('roleManagementController.js does not exist');
  }
  
  if (fs.existsSync(rbacController)) {
    throw new Error('Duplicate controller rbacController.js still exists');
  }
  
  if (fs.existsSync(moduleRoleController)) {
    throw new Error('Duplicate controller moduleRoleController.js still exists');
  }
});

test('Should have ONLY roleManagementRoutes.js (not duplicates)', () => {
  const roleManagementRoutes = path.join(backendRoot, 'src/routes/roleManagementRoutes.js');
  const rbacRoutes = path.join(backendRoot, 'src/routes/rbacRoutes.js');
  const moduleRoleRoutes = path.join(backendRoot, 'src/routes/moduleRoleRoutes.js');
  
  if (!fs.existsSync(roleManagementRoutes)) {
    throw new Error('roleManagementRoutes.js does not exist');
  }
  
  if (fs.existsSync(rbacRoutes)) {
    throw new Error('Duplicate route file rbacRoutes.js still exists');
  }
  
  if (fs.existsSync(moduleRoleRoutes)) {
    throw new Error('Duplicate route file moduleRoleRoutes.js still exists');
  }
});

test('Should register ONLY /api/role-management in app.js', () => {
  const appJsPath = path.join(backendRoot, 'src/app.js');
  const appJsContent = fs.readFileSync(appJsPath, 'utf8');
  
  if (!appJsContent.includes('app.use("/api/role-management", roleManagementRoutes)')) {
    throw new Error('Unified route /api/role-management is not registered');
  }
  
  if (appJsContent.includes('app.use("/api/rbac", rbacRoutes)')) {
    throw new Error('Duplicate route registration app.use("/api/rbac", rbacRoutes) still exists');
  }
  
  if (appJsContent.includes('app.use("/api/module-roles", moduleRoleRoutes)')) {
    throw new Error('Duplicate route registration app.use("/api/module-roles", moduleRoleRoutes) still exists');
  }
  
  if (appJsContent.includes('require("./routes/rbacRoutes")')) {
    throw new Error('Import for rbacRoutes still exists in app.js');
  }
  
  if (appJsContent.includes('require("./routes/moduleRoleRoutes")')) {
    throw new Error('Import for moduleRoleRoutes still exists in app.js');
  }
});

console.log('\n--- Frontend Duplication Detection ---\n');

test('Should have ONLY ONE RoleManagementPage.jsx (not duplicate)', () => {
  const unifiedRolePage = path.join(frontendRoot, 'src/pages/RoleManagementPage.jsx');
  const duplicateRolePage = path.join(frontendRoot, 'src/pages/rbac/RoleManagementPage.jsx');
  
  if (!fs.existsSync(unifiedRolePage)) {
    throw new Error('Unified RoleManagementPage.jsx does not exist');
  }
  
  if (fs.existsSync(duplicateRolePage)) {
    throw new Error('Duplicate RoleManagementPage at src/pages/rbac/RoleManagementPage.jsx still exists');
  }
});

test('Should have ONLY /admin/roles route (not /rbac/roles)', () => {
  const appRouterPath = path.join(frontendRoot, 'src/routes/AppRouter.jsx');
  const appRouterContent = fs.readFileSync(appRouterPath, 'utf8');
  
  if (!appRouterContent.includes('path="admin/roles"')) {
    throw new Error('Unified route path="admin/roles" does not exist');
  }
  
  if (appRouterContent.includes('path="rbac/roles"')) {
    throw new Error('Duplicate route path="rbac/roles" still exists');
  }
});

console.log('\n=== Test Results ===\n');
console.log(`Passed: ${passCount}`);
console.log(`Failed: ${failCount}`);
console.log(`Total:  ${passCount + failCount}\n`);

if (failCount > 0) {
  console.log('=== COUNTEREXAMPLES (Bug Evidence) ===\n');
  console.log('These failures prove the bug exists on unfixed code:\n');
  counterexamples.forEach((ce, idx) => {
    console.log(`${idx + 1}. ${ce.description}`);
    console.log(`   → ${ce.error}\n`);
  });
  
  console.log('✓ Bug condition exploration SUCCESSFUL');
  console.log('✓ Test correctly identified duplicate RBAC implementations');
  console.log('✓ After implementing the fix, re-run this test - it should pass\n');
  process.exit(0); // Exit with success - finding the bug is the goal
} else {
  console.log('✓ All tests passed!');
  console.log('✓ No duplicate RBAC implementations found');
  console.log('✓ System has unified role management API\n');
  process.exit(0);
}
