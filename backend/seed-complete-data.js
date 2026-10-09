const mysql = require('mysql2/promise');
const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');
require('dotenv').config();

async function seedCompleteData() {
  let connection;
  
  try {
    connection = await mysql.createConnection({
      host: process.env.DB_HOST || 'localhost',
      user: process.env.DB_USER || 'mesob',
      password: process.env.DB_PASSWORD || 'mesob',
      database: process.env.DB_NAME || 'mesob_hrms'
    });

    console.log('✓ Connected to database\n');
    console.log('===========================================');
    console.log('   COMPLETE DATABASE SEEDING');
    console.log('===========================================\n');

    // Get role UUIDs for later use
    const [roles] = await connection.execute('SELECT uuid, code FROM Roles');
    const roleMap = {};
    roles.forEach(r => roleMap[r.code] = r.uuid);

    // ==========================================
    // 1. CREATE DEPARTMENTS
    // ==========================================
    console.log('📁 Creating Departments...');
    
    const departments = [
      { name: 'Executive Management', parent: null },
      { name: 'Human Resources', parent: null },
      { name: 'Finance', parent: null },
      { name: 'IT Department', parent: null },
      { name: 'Operations', parent: null },
      { name: 'Marketing', parent: null },
      { name: 'Sales', parent: null },
      { name: 'Customer Service', parent: null },
      { name: 'Research & Development', parent: null },
      { name: 'Legal', parent: null }
    ];

    const deptMap = {};
    for (const dept of departments) {
      const uuid = uuidv4();
      const [existing] = await connection.execute(
        'SELECT uuid FROM Departments WHERE name = ?',
        [dept.name]
      );

      if (existing.length === 0) {
        await connection.execute(
          'INSERT INTO Departments (uuid, name, parent_uuid, created_at, updated_at) VALUES (?, ?, ?, NOW(), NOW())',
          [uuid, dept.name, dept.parent]
        );
        deptMap[dept.name] = uuid;
        console.log(`  ✓ ${dept.name}`);
      } else {
        deptMap[dept.name] = existing[0].uuid;
      }
    }

    // ==========================================
    // 2. CREATE POSITIONS
    // ==========================================
    console.log('\n💼 Creating Positions...');
    
    const positions = [
      { title: 'Chief Executive Officer', dept: 'Executive Management' },
      { title: 'Chief Operating Officer', dept: 'Executive Management' },
      { title: 'HR Manager', dept: 'Human Resources' },
      { title: 'HR Officer', dept: 'Human Resources' },
      { title: 'Finance Manager', dept: 'Finance' },
      { title: 'Accountant', dept: 'Finance' },
      { title: 'IT Manager', dept: 'IT Department' },
      { title: 'Software Developer', dept: 'IT Department' },
      { title: 'System Administrator', dept: 'IT Department' },
      { title: 'Operations Manager', dept: 'Operations' },
      { title: 'Operations Officer', dept: 'Operations' },
      { title: 'Marketing Manager', dept: 'Marketing' },
      { title: 'Sales Manager', dept: 'Sales' },
      { title: 'Sales Representative', dept: 'Sales' }
    ];

    const posMap = {};
    for (const pos of positions) {
      const uuid = uuidv4();
      const deptUuid = deptMap[pos.dept];
      
      const [existing] = await connection.execute(
        'SELECT uuid FROM Positions WHERE title = ?',
        [pos.title]
      );

      if (existing.length === 0) {
        await connection.execute(
          'INSERT INTO Positions (uuid, title, department_uuid, created_at, updated_at) VALUES (?, ?, ?, NOW(), NOW())',
          [uuid, pos.title, deptUuid]
        );
        posMap[pos.title] = uuid;
        console.log(`  ✓ ${pos.title}`);
      } else {
        posMap[pos.title] = existing[0].uuid;
      }
    }

    // ==========================================
    // 3. CREATE EMPLOYEES
    // ==========================================
    console.log('\n👥 Creating Employees...');
    
    const employees = [
      { 
        mesob_id: 'EMP-001', 
        first_name: 'Abebe', 
        middle_name: 'Kebede', 
        last_name: 'Tekle',
        mother_name: 'Almaz',
        gender: 'MALE',
        date_of_birth: '1985-03-15',
        hire_date: '2020-01-15',
        department: 'Executive Management',
        position: 'Chief Executive Officer',
        status: 'ACTIVE',
        username: 'admin',
        role: 'SUPER_ADMIN'
      },
      { 
        mesob_id: 'EMP-002', 
        first_name: 'Tigist', 
        middle_name: 'Haile', 
        last_name: 'Gebre',
        mother_name: 'Hanna',
        gender: 'FEMALE',
        date_of_birth: '1988-07-22',
        hire_date: '2020-02-01',
        department: 'Human Resources',
        position: 'HR Manager',
        status: 'ACTIVE',
        username: 'hradmin',
        role: 'HR_ADMIN'
      },
      { 
        mesob_id: 'EMP-003', 
        first_name: 'Dawit', 
        middle_name: 'Alem', 
        last_name: 'Desta',
        mother_name: 'Marta',
        gender: 'MALE',
        date_of_birth: '1990-05-10',
        hire_date: '2021-03-15',
        department: 'IT Department',
        position: 'IT Manager',
        status: 'ACTIVE',
        username: 'depthead',
        role: 'DEPARTMENT_HEAD'
      },
      { 
        mesob_id: 'EMP-004', 
        first_name: 'Marta', 
        middle_name: 'Girma', 
        last_name: 'Tadesse',
        mother_name: 'Sara',
        gender: 'FEMALE',
        date_of_birth: '1992-11-05',
        hire_date: '2021-06-01',
        department: 'Human Resources',
        position: 'HR Officer',
        status: 'ACTIVE',
        username: 'hrofficer',
        role: 'HR_OFFICER'
      },
      { 
        mesob_id: 'EMP-005', 
        first_name: 'Samuel', 
        middle_name: 'Tesfaye', 
        last_name: 'Bekele',
        mother_name: 'Eleni',
        gender: 'MALE',
        date_of_birth: '1995-08-20',
        hire_date: '2022-01-10',
        department: 'IT Department',
        position: 'Software Developer',
        status: 'ACTIVE',
        username: 'employee',
        role: 'EMPLOYEE'
      },
      { 
        mesob_id: 'EMP-006', 
        first_name: 'Hanna', 
        middle_name: 'Mulugeta', 
        last_name: 'Assefa',
        mother_name: 'Tigist',
        gender: 'FEMALE',
        date_of_birth: '1993-04-12',
        hire_date: '2021-08-15',
        department: 'Finance',
        position: 'Finance Manager',
        status: 'ACTIVE',
        username: 'financemanager',
        role: 'DEPARTMENT_HEAD'
      },
      { 
        mesob_id: 'EMP-007', 
        first_name: 'Yohannes', 
        middle_name: 'Mekonnen', 
        last_name: 'Wolde',
        mother_name: 'Azeb',
        gender: 'MALE',
        date_of_birth: '1991-09-08',
        hire_date: '2021-09-01',
        department: 'Operations',
        position: 'Operations Manager',
        status: 'ACTIVE',
        username: 'operations',
        role: 'DEPARTMENT_HEAD'
      },
      { 
        mesob_id: 'EMP-008', 
        first_name: 'Sara', 
        middle_name: 'Alemayehu', 
        last_name: 'Negash',
        mother_name: 'Ruth',
        gender: 'FEMALE',
        date_of_birth: '1994-02-18',
        hire_date: '2022-03-01',
        department: 'Marketing',
        position: 'Marketing Manager',
        status: 'ACTIVE',
        username: null,
        role: null
      },
      { 
        mesob_id: 'EMP-009', 
        first_name: 'Elias', 
        middle_name: 'Bekele', 
        last_name: 'Demissie',
        mother_name: 'Senait',
        gender: 'MALE',
        date_of_birth: '1996-06-25',
        hire_date: '2022-05-15',
        department: 'IT Department',
        position: 'System Administrator',
        status: 'ACTIVE',
        username: null,
        role: null
      },
      { 
        mesob_id: 'EMP-010', 
        first_name: 'Meron', 
        middle_name: 'Tadesse', 
        last_name: 'Alemu',
        mother_name: 'Almaz',
        gender: 'FEMALE',
        date_of_birth: '1997-01-30',
        hire_date: '2022-07-01',
        department: 'Sales',
        position: 'Sales Representative',
        status: 'ACTIVE',
        username: null,
        role: null
      }
    ];

    const empMap = {};
    for (const emp of employees) {
      const uuid = uuidv4();
      const deptUuid = deptMap[emp.department];
      const posUuid = posMap[emp.position];
      
      const [existing] = await connection.execute(
        'SELECT uuid FROM Employees WHERE mesob_id = ?',
        [emp.mesob_id]
      );

      if (existing.length === 0) {
        await connection.execute(
          `INSERT INTO Employees 
          (uuid, mesob_id, first_name, middle_name, last_name, mother_name, gender, 
           date_of_birth, hire_date, department_uuid, position_uuid, status, 
           created_at, updated_at) 
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())`,
          [uuid, emp.mesob_id, emp.first_name, emp.middle_name, emp.last_name, 
           emp.mother_name, emp.gender, emp.date_of_birth, emp.hire_date, 
           deptUuid, posUuid, emp.status]
        );
        empMap[emp.mesob_id] = uuid;
        console.log(`  ✓ ${emp.mesob_id} - ${emp.first_name} ${emp.last_name} (${emp.position})`);
      } else {
        empMap[emp.mesob_id] = existing[0].uuid;
      }
    }

    // ==========================================
    // 4. CREATE USERS (WITH PASSWORD HASHING)
    // ==========================================
    console.log('\n🔐 Creating Users with Authentication...');
    
    const users = [
      { username: 'admin', password: 'admin123', role: 'SUPER_ADMIN', employee: 'EMP-001' },
      { username: 'superadmin', password: 'super123', role: 'SUPER_ADMIN', employee: null },
      { username: 'hradmin', password: 'hr123', role: 'HR_ADMIN', employee: 'EMP-002' },
      { username: 'depthead', password: 'dept123', role: 'DEPARTMENT_HEAD', employee: 'EMP-003' },
      { username: 'hrofficer', password: 'officer123', role: 'HR_OFFICER', employee: 'EMP-004' },
      { username: 'employee', password: 'emp123', role: 'EMPLOYEE', employee: 'EMP-005' },
      { username: 'financemanager', password: 'fin123', role: 'DEPARTMENT_HEAD', employee: 'EMP-006' },
      { username: 'operations', password: 'ops123', role: 'DEPARTMENT_HEAD', employee: 'EMP-007' }
    ];

    for (const user of users) {
      const uuid = uuidv4();
      const hashedPassword = bcrypt.hashSync(user.password, 10);
      const roleUuid = roleMap[user.role];
      const employeeUuid = user.employee ? empMap[user.employee] : null;

      const [existing] = await connection.execute(
        'SELECT username FROM Users WHERE username = ?',
        [user.username]
      );

      if (existing.length > 0) {
        await connection.execute(
          'UPDATE Users SET password_hash = ?, role = ?, role_uuid = ?, employee_uuid = ?, is_active = 1 WHERE username = ?',
          [hashedPassword, user.role, roleUuid, employeeUuid, user.username]
        );
        console.log(`  ✓ Updated ${user.username} (${user.role})`);
      } else {
        await connection.execute(
          `INSERT INTO Users 
          (uuid, username, password_hash, role, role_uuid, employee_uuid, is_active, 
           created_at, updated_at) 
          VALUES (?, ?, ?, ?, ?, ?, 1, NOW(), NOW())`,
          [uuid, user.username, hashedPassword, user.role, roleUuid, employeeUuid]
        );
        console.log(`  ✓ Created ${user.username} (${user.role})`);
      }
    }

    // ==========================================
    // SUMMARY
    // ==========================================
    console.log('\n===========================================');
    console.log('   ✅ DATABASE SEEDING COMPLETE!');
    console.log('===========================================\n');

    console.log('📊 Summary:');
    console.log(`  ✓ ${departments.length} Departments created`);
    console.log(`  ✓ ${positions.length} Positions created`);
    console.log(`  ✓ ${employees.length} Employees created`);
    console.log(`  ✓ ${users.length} Users created with authentication\n`);

    console.log('🔐 Login Credentials:');
    console.log('==========================================');
    console.log('Username         | Password   | Role');
    console.log('-----------------|------------|------------------');
    users.forEach(u => {
      console.log(`${u.username.padEnd(16)} | ${u.password.padEnd(10)} | ${u.role}`);
    });
    console.log('==========================================\n');

    console.log('🎉 You can now login to the system!');
    console.log('   Try: admin / admin123\n');

  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error);
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

seedCompleteData();
