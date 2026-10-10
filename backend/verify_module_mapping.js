/**
 * Verification script to check role-module mapping consistency
 * This checks that static config matches database module codes
 */

const { getModulesForRole, getAllRoles } = require('./src/config/roleModuleMapping');

console.log('\n=== MODULE MAPPING VERIFICATION ===\n');

// Database module codes (from static_rbac_migration.sql)
const DATABASE_MODULES = [
  'EMPLOYEE_LIST',
  'EMPLOYEE_PROFILE',
  'REGISTER_EMPLOYEE',
  'DEPARTMENTS',
  'POSITIONS',
  'LEVELS',
  'ATTENDANCE_RECORDS',
  'NETWORK_SETTINGS',
  'SHIFTS',
  'LETTERS',
  'LEAVE_REQUESTS',
  'LEAVE_SETTINGS',
  'ACCOUNTS',
  'AUDIT_LOGS',
  'MY_ATTENDANCE',
  'MY_LETTERS',
  'MY_LEAVES',
  'MY_ACCOUNTS'
];

// Database roles (from static_rbac_migration.sql)
const DATABASE_ROLES = [
  'EMPLOYEE',
  'DEPT_HEAD',
  'HR_OFFICER',
  'HR_ADMIN',
  'SUPER_ADMIN'
];

console.log('Database Modules (18 total):', DATABASE_MODULES.length);
console.log('Database Roles (5 total):', DATABASE_ROLES.length);
console.log();

// Check each role
let hasErrors = false;

const allRoles = getAllRoles();
console.log(`Configured Roles: ${allRoles.join(', ')}\n`);

// Check for missing database roles
const missingRoles = DATABASE_ROLES.filter(r => !allRoles.includes(r));
if (missingRoles.length > 0) {
  console.log('❌ MISSING ROLES in static config:', missingRoles.join(', '));
  hasErrors = true;
} else {
  console.log('✅ All database roles are configured\n');
}

// Check each configured role
allRoles.forEach(roleCode => {
  const modules = getModulesForRole(roleCode);
  console.log(`\n${roleCode} (${modules.length} modules):`);
  
  const invalidModules = modules.filter(m => !DATABASE_MODULES.includes(m));
  
  if (invalidModules.length > 0) {
    console.log('  ❌ INVALID module codes (not in database):');
    invalidModules.forEach(m => console.log(`     - ${m}`));
    hasErrors = true;
  } else {
    console.log('  ✅ All modules are valid');
  }
  
  console.log(`  Modules: ${modules.join(', ')}`);
});

console.log('\n=== SUMMARY ===\n');

if (hasErrors) {
  console.log('❌ ERRORS FOUND: The static configuration has issues');
  console.log('   Fix required: Update roleModuleMapping.js to match database');
  process.exit(1);
} else {
  console.log('✅ CONFIGURATION IS VALID');
  console.log('   All role-module mappings match the database schema');
  console.log();
  console.log('Next steps:');
  console.log('1. Restart the backend server: npm start');
  console.log('2. Clear browser localStorage or logout/login');
  console.log('3. Test with SUPER_ADMIN user');
  process.exit(0);
}
