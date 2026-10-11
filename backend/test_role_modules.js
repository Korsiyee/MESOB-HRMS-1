/**
 * Test Role Module Assignment
 * 
 * This script tests the role-to-module mapping to verify DEPT_HEAD
 * gets the correct modules and not HR_ADMIN modules.
 */

const { getModulesForRole } = require('./src/config/roleModuleMapping');

console.log('\n' + '='.repeat(70));
console.log('ROLE MODULE MAPPING TEST');
console.log('='.repeat(70) + '\n');

// Define expected module counts
const expectedCounts = {
  'EMPLOYEE': 4,
  'DEPT_HEAD': 11,
  'MANAGER': 11,
  'HR_OFFICER': 13,
  'HR_ADMIN': 18,
  'SUPER_ADMIN': 18
};

// Test each role
Object.keys(expectedCounts).forEach(roleCode => {
  const modules = getModulesForRole(roleCode);
  const expected = expectedCounts[roleCode];
  const match = modules.length === expected ? '✅' : '❌';
  
  console.log(`${match} ${roleCode.padEnd(15)} | Expected: ${expected.toString().padStart(2)} | Actual: ${modules.length.toString().padStart(2)}`);
  
  if (modules.length !== expected) {
    console.log(`   WARNING: Module count mismatch!`);
  }
});

console.log('\n' + '-'.repeat(70));
console.log('DEPT_HEAD MODULES (should be 11):');
console.log('-'.repeat(70));

const deptHeadModules = getModulesForRole('DEPT_HEAD');
deptHeadModules.forEach((mod, idx) => {
  console.log(`  ${(idx + 1).toString().padStart(2)}. ${mod}`);
});

console.log('\n' + '-'.repeat(70));
console.log('HR_ADMIN MODULES (should be 18):');
console.log('-'.repeat(70));

const hrAdminModules = getModulesForRole('HR_ADMIN');
hrAdminModules.forEach((mod, idx) => {
  console.log(`  ${(idx + 1).toString().padStart(2)}. ${mod}`);
});

console.log('\n' + '-'.repeat(70));
console.log('MODULES ONLY HR_ADMIN HAS (not DEPT_HEAD):');
console.log('-'.repeat(70));

const deptHeadSet = new Set(deptHeadModules);
const hrAdminOnly = hrAdminModules.filter(mod => !deptHeadSet.has(mod));

if (hrAdminOnly.length === 0) {
  console.log('  ❌ ERROR: HR_ADMIN has no unique modules! This is wrong!');
} else {
  hrAdminOnly.forEach((mod, idx) => {
    console.log(`  ${(idx + 1).toString().padStart(2)}. ${mod}`);
  });
}

console.log('\n' + '='.repeat(70));
console.log('If a DEPT_HEAD user is seeing HR_ADMIN modules in the UI,');
console.log('the problem is NOT in the static configuration.');
console.log('Check the database: the user likely has role_code = \'HR_ADMIN\'');
console.log('instead of role_code = \'DEPT_HEAD\'');
console.log('='.repeat(70) + '\n');
