/**
 * Diagnostic Script: Department Role Module Access
 * 
 * This script checks:
 * 1. What roles exist in the database
 * 2. What users have department-related roles
 * 3. What modules are assigned to DEPT_HEAD in the static config
 * 4. What modules are actually returned by the service
 */

require('dotenv').config();
const { db } = require('./src/config/db');
const { getModulesForRole } = require('./src/config/roleModuleMapping');
const moduleAuthService = require('./src/services/moduleAuthService');

async function diagnose() {
  console.log('\n========================================');
  console.log('DEPARTMENT ROLE MODULE DIAGNOSIS');
  console.log('========================================\n');

  try {
    // 1. Check all roles in database
    console.log('1. ROLES IN DATABASE:\n');
    const [roles] = await db.promise().query(`
      SELECT uuid, code, name, is_active, is_system_role
      FROM Roles
      ORDER BY code
    `);
    
    roles.forEach(role => {
      console.log(`   - ${role.code.padEnd(20)} | ${role.name.padEnd(25)} | Active: ${role.is_active} | System: ${role.is_system_role}`);
    });

    // 2. Check users with department-related roles
    console.log('\n2. USERS WITH DEPARTMENT/MANAGER ROLES:\n');
    const [deptUsers] = await db.promise().query(`
      SELECT 
        u.uuid,
        u.username,
        u.employee_uuid,
        u.department_uuid,
        r.code as role_code,
        r.name as role_name,
        e.first_name,
        e.last_name,
        d.name as department_name
      FROM Users u
      INNER JOIN Roles r ON u.role_uuid = r.uuid
      LEFT JOIN Employees e ON u.employee_uuid = e.uuid
      LEFT JOIN Departments d ON u.department_uuid = d.uuid
      WHERE r.code IN ('DEPT_HEAD', 'DEPARTMENT_HEAD', 'MANAGER')
      ORDER BY r.code, u.username
    `);

    if (deptUsers.length === 0) {
      console.log('   ❌ No users found with DEPT_HEAD, DEPARTMENT_HEAD, or MANAGER roles');
    } else {
      deptUsers.forEach(user => {
        console.log(`   - ${user.username.padEnd(20)} | Role: ${user.role_code.padEnd(20)} | Dept: ${user.department_name || 'N/A'}`);
      });
    }

    // 3. Check static module configuration for DEPT_HEAD
    console.log('\n3. STATIC MODULE CONFIGURATION (roleModuleMapping.js):\n');
    const deptHeadModules = getModulesForRole('DEPT_HEAD');
    const hrAdminModules = getModulesForRole('HR_ADMIN');
    
    console.log(`   DEPT_HEAD modules (${deptHeadModules.length}):`);
    deptHeadModules.forEach(mod => console.log(`      - ${mod}`));
    
    console.log(`\n   HR_ADMIN modules (${hrAdminModules.length}):`);
    hrAdminModules.forEach(mod => console.log(`      - ${mod}`));

    // 4. Check if there are any DEPT_HEAD users and get their actual permissions
    if (deptUsers.length > 0) {
      console.log('\n4. ACTUAL PERMISSIONS FROM SERVICE:\n');
      
      for (const user of deptUsers) {
        console.log(`   User: ${user.username} (${user.role_code})`);
        
        try {
          const permissions = await moduleAuthService.getUserPermissions(user.uuid);
          
          if (permissions) {
            console.log(`   - Role: ${permissions.role.code}`);
            console.log(`   - Dashboard: ${permissions.dashboard}`);
            console.log(`   - Modules Count: ${permissions.modules.length}`);
            console.log(`   - Module Codes:`);
            permissions.modules.forEach(mod => {
              console.log(`      - ${mod.code} (${mod.name})`);
            });
          } else {
            console.log(`   ❌ No permissions found`);
          }
        } catch (error) {
          console.log(`   ❌ Error fetching permissions: ${error.message}`);
        }
        console.log('');
      }
    }

    // 5. Check if there are any mismatched role codes
    console.log('5. ROLE CODE ANALYSIS:\n');
    const expectedRoles = ['EMPLOYEE', 'DEPT_HEAD', 'HR_OFFICER', 'HR_ADMIN', 'SUPER_ADMIN'];
    const dbRoleCodes = roles.map(r => r.code);
    
    console.log('   Expected role codes (from config):');
    expectedRoles.forEach(code => {
      const exists = dbRoleCodes.includes(code);
      console.log(`      - ${code.padEnd(20)} ${exists ? '✅' : '❌'}`);
    });
    
    console.log('\n   Extra role codes in database:');
    const extraRoles = dbRoleCodes.filter(code => !expectedRoles.includes(code));
    if (extraRoles.length === 0) {
      console.log('      ✅ None - all roles match expected configuration');
    } else {
      extraRoles.forEach(code => console.log(`      - ${code}`));
    }

    // 6. Check if any users have HR_ADMIN role code but shouldn't
    console.log('\n6. CHECKING FOR ROLE MISASSIGNMENT:\n');
    const [allUsers] = await db.promise().query(`
      SELECT 
        u.uuid,
        u.username,
        r.code as role_code,
        r.name as role_name,
        e.first_name,
        e.last_name
      FROM Users u
      INNER JOIN Roles r ON u.role_uuid = r.uuid
      LEFT JOIN Employees e ON u.employee_uuid = e.uuid
      WHERE u.is_active = 1
      ORDER BY r.code, u.username
    `);

    const roleCounts = {};
    allUsers.forEach(user => {
      roleCounts[user.role_code] = (roleCounts[user.role_code] || 0) + 1;
    });

    console.log('   User distribution by role:');
    Object.entries(roleCounts).forEach(([role, count]) => {
      console.log(`      - ${role.padEnd(20)} : ${count} user(s)`);
    });

  } catch (error) {
    console.error('\n❌ ERROR:', error.message);
    console.error(error);
  } finally {
    await db.end();
  }
}

diagnose();
