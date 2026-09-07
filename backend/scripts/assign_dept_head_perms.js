const mysql = require('mysql2/promise');
const crypto = require('crypto');

async function assignPermissions() {
  const conn = await mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: 'Henok@2060',
    database: 'hrms_leave_service'
  });

  const userUuids = [
    '2aba074a-6ca7-46a2-8ffc-95dc698a6615',
    'c27b47c8-4e7b-48aa-b17a-b7ec3350b19c',
    'user-dept-001',
    'user-dept-002'
  ];
  
  const occUuids = ['occ-001', 'occ-002', 'occ-010'];
  let added = 0;

  for (const userUuid of userUuids) {
    const [emp] = await conn.query(
      'SELECT uuid FROM Employees WHERE uuid IN (SELECT employee_uuid FROM Users WHERE uuid = ?)',
      [userUuid]
    );
    
    if (emp.length === 0) {
      console.log(`No employee found for user ${userUuid}`);
      continue;
    }
    
    const empUuid = emp[0].uuid;
    console.log(`Processing employee: ${empUuid}`);

    for (const occUuid of occUuids) {
      const uuid = crypto.randomUUID();
      try {
        await conn.query(
          'INSERT INTO employeeoccupations (uuid, employee_uuid, occupation_uuid, assigned_by) VALUES (?, ?, ?, NULL)',
          [uuid, empUuid, occUuid]
        );
        added++;
      } catch (e) {
        if (e.code !== 'ER_DUP_ENTRY') {
          console.error(`Error: ${e.message}`);
        }
      }
    }
  }

  console.log(`✅ ${added} occupations assigned`);

  // Verify
  const [result] = await conn.query(`
    SELECT 
      e.first_name,
      e.last_name,
      u.username,
      o.name as occupation
    FROM Employees e
    JOIN Users u ON u.employee_uuid = e.uuid
    JOIN employeeoccupations eo ON eo.employee_uuid = e.uuid
    JOIN occupations o ON o.uuid = eo.occupation_uuid
    WHERE u.role = 'DEPARTMENT_HEAD'
    ORDER BY e.last_name, o.name
  `);

  console.log('\nAssigned occupations:');
  console.table(result);

  await conn.end();
}

assignPermissions().catch(console.error);
