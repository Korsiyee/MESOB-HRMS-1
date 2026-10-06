require('dotenv').config();
const mysql = require('mysql2/promise');
const { v4: uuidv4 } = require('uuid');

async function assignModules() {
  let connection;
  try {
    console.log('Assigning modules to roles...\n');
    
    connection = await mysql.createConnection({
      host: process.env.DB_HOST,
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      database: process.env.DB_NAME
    });

    // Get all modules
    const [modules] = await connection.execute('SELECT uuid, code FROM Modules');
    const moduleMap = {};
    modules.forEach(m => { moduleMap[m.code] = m.uuid; });

    // Get all scopes
    const [scopes] = await connection.execute('SELECT uuid, code FROM Scopes');
    const scopeMap = {};
    scopes.forEach(s => { scopeMap[s.code] = s.uuid; });

    // Get all roles
    const [roles] = await connection.execute('SELECT uuid, code FROM Roles');
    const roleMap = {};
    roles.forEach(r => { roleMap[r.code] = r.uuid; });

    // Define role-module mappings
    const assignments = [
      // SUPER_ADMIN - All modules with ORGANIZATION scope
      { role: 'SUPER_ADMIN', module: 'HOME', scope: 'ORGANIZATION' },
      { role: 'SUPER_ADMIN', module: 'EMPLOYEES', scope: 'ORGANIZATION' },
      { role: 'SUPER_ADMIN', module: 'ORGANIZATION', scope: 'ORGANIZATION' },
      { role: 'SUPER_ADMIN', module: 'ATTENDANCE', scope: 'ORGANIZATION' },
      { role: 'SUPER_ADMIN', module: 'SHIFTS', scope: 'ORGANIZATION' },
      { role: 'SUPER_ADMIN', module: 'LETTERS', scope: 'ORGANIZATION' },
      { role: 'SUPER_ADMIN', module: 'LEAVE', scope: 'ORGANIZATION' },

      // HR_ADMIN - All except ORGANIZATION module
      { role: 'HR_ADMIN', module: 'HOME', scope: 'ORGANIZATION' },
      { role: 'HR_ADMIN', module: 'EMPLOYEES', scope: 'ORGANIZATION' },
      { role: 'HR_ADMIN', module: 'ATTENDANCE', scope: 'ORGANIZATION' },
      { role: 'HR_ADMIN', module: 'SHIFTS', scope: 'ORGANIZATION' },
      { role: 'HR_ADMIN', module: 'LETTERS', scope: 'ORGANIZATION' },
      { role: 'HR_ADMIN', module: 'LEAVE', scope: 'ORGANIZATION' },

      // DEPARTMENT_HEAD - Limited modules with DEPARTMENT scope
      { role: 'DEPARTMENT_HEAD', module: 'HOME', scope: 'DEPARTMENT' },
      { role: 'DEPARTMENT_HEAD', module: 'EMPLOYEES', scope: 'DEPARTMENT' },
      { role: 'DEPARTMENT_HEAD', module: 'ATTENDANCE', scope: 'DEPARTMENT' },
      { role: 'DEPARTMENT_HEAD', module: 'LETTERS', scope: 'DEPARTMENT' },
      { role: 'DEPARTMENT_HEAD', module: 'LEAVE', scope: 'DEPARTMENT' },

      // HR_OFFICER - Similar to HR_ADMIN
      { role: 'HR_OFFICER', module: 'HOME', scope: 'ORGANIZATION' },
      { role: 'HR_OFFICER', module: 'EMPLOYEES', scope: 'ORGANIZATION' },
      { role: 'HR_OFFICER', module: 'ATTENDANCE', scope: 'ORGANIZATION' },
      { role: 'HR_OFFICER', module: 'SHIFTS', scope: 'ORGANIZATION' },
      { role: 'HR_OFFICER', module: 'LETTERS', scope: 'ORGANIZATION' },
      { role: 'HR_OFFICER', module: 'LEAVE', scope: 'ORGANIZATION' },

      // EMPLOYEE - Only HOME with PERSONAL scope
      { role: 'EMPLOYEE', module: 'HOME', scope: 'PERSONAL' },
    ];

    // Clear existing assignments
    await connection.execute('DELETE FROM RoleModules');
    console.log('Cleared existing assignments\n');

    // Insert new assignments
    for (const assignment of assignments) {
      const roleUuid = roleMap[assignment.role];
      const moduleUuid = moduleMap[assignment.module];
      const scopeUuid = scopeMap[assignment.scope];

      if (!roleUuid || !moduleUuid || !scopeUuid) {
        console.log(`⚠️  Skipping: ${assignment.role} - ${assignment.module} (missing data)`);
        continue;
      }

      await connection.execute(
        'INSERT INTO RoleModules (uuid, role_uuid, module_uuid, scope_uuid) VALUES (?, ?, ?, ?)',
        [uuidv4(), roleUuid, moduleUuid, scopeUuid]
      );
      console.log(`✓ ${assignment.role.padEnd(20)} → ${assignment.module.padEnd(15)} (${assignment.scope})`);
    }

    console.log('\n✅ Module assignments complete!');
    await connection.end();
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error.message);
    if (connection) await connection.end();
    process.exit(1);
  }
}

assignModules();
