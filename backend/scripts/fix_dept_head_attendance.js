require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const mysql = require('mysql2/promise');
const crypto = require('crypto');

/**
 * Fix Department Head Attendance Access
 * 
 * This script assigns the required occupations to ALL department heads
 * so they can access the attendance module.
 * 
 * Required Occupations:
 * - Dashboard (occ-001)
 * - Employees - Overview (occ-002) 
 * - Attendance - Overview (occ-008) ⚠️ CRITICAL for attendance access
 * - Leave - Manage Requests (occ-010)
 */

async function fixDeptHeadAttendance() {
  console.log('🔧 Starting Department Head Attendance Fix...\n');
  
  const conn = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || 'Henok@2060',
    database: process.env.DB_NAME || 'hrms_leave'
  });

  try {
    // Step 1: Find all department heads
    console.log('📋 Step 1: Finding all department heads...');
    const [deptHeads] = await conn.query(`
      SELECT 
        u.uuid as user_uuid,
        u.username,
        u.employee_uuid,
        e.first_name,
        e.last_name,
        e.department_uuid,
        d.name as department_name
      FROM Users u
      LEFT JOIN Employees e ON e.uuid = u.employee_uuid
      LEFT JOIN Departments d ON d.uuid = e.department_uuid
      WHERE u.role = 'DEPARTMENT_HEAD'
      ORDER BY u.username
    `);

    if (deptHeads.length === 0) {
      console.log('⚠️  No department heads found in the system.');
      await conn.end();
      return;
    }

    console.log(`✅ Found ${deptHeads.length} department head(s):\n`);
    deptHeads.forEach(dh => {
      console.log(`   - ${dh.first_name} ${dh.last_name} (${dh.username})`);
      console.log(`     Department: ${dh.department_name || 'NOT ASSIGNED'}`);
      console.log(`     Employee UUID: ${dh.employee_uuid || 'MISSING ⚠️'}`);
      console.log('');
    });

    // Step 2: Check required occupations exist
    console.log('📋 Step 2: Checking required occupations...');
    const requiredOccupations = [
      { code: 'occ-001', name: 'Dashboard' },
      { code: 'occ-002', name: 'Employees - Overview' },
      { code: 'occ-008', name: 'Attendance - Overview' },  // CRITICAL for attendance
      { code: 'occ-010', name: 'Leave - Manage Requests' }
    ];

    const [occupations] = await conn.query(`
      SELECT uuid, name 
      FROM Occupations 
      WHERE uuid IN (?, ?, ?, ?)
    `, requiredOccupations.map(o => o.code));

    if (occupations.length !== requiredOccupations.length) {
      console.error('❌ ERROR: Not all required occupations exist in database!');
      console.log('Found:', occupations.map(o => o.name).join(', '));
      console.log('Expected:', requiredOccupations.map(o => o.name).join(', '));
      await conn.end();
      return;
    }

    console.log('✅ All required occupations found:\n');
    occupations.forEach(occ => {
      console.log(`   - ${occ.name} (${occ.uuid})`);
    });
    console.log('');

    // Step 3: Assign occupations to each department head
    console.log('📋 Step 3: Assigning occupations to department heads...\n');
    let totalAssigned = 0;
    let alreadyHad = 0;
    let errors = 0;

    for (const dh of deptHeads) {
      if (!dh.employee_uuid) {
        console.log(`⚠️  Skipping ${dh.username} - no employee_uuid assigned`);
        errors++;
        continue;
      }

      console.log(`Processing: ${dh.first_name} ${dh.last_name} (${dh.username})`);

      for (const occ of occupations) {
        try {
          const uuid = crypto.randomUUID();
          await conn.query(
            `INSERT INTO EmployeeOccupations 
             (uuid, employee_uuid, occupation_uuid, assigned_by, assigned_at) 
             VALUES (?, ?, ?, NULL, NOW())`,
            [uuid, dh.employee_uuid, occ.uuid]
          );
          console.log(`   ✅ Assigned: ${occ.name}`);
          totalAssigned++;
        } catch (e) {
          if (e.code === 'ER_DUP_ENTRY') {
            console.log(`   ⏭️  Already has: ${occ.name}`);
            alreadyHad++;
          } else {
            console.error(`   ❌ Error assigning ${occ.name}: ${e.message}`);
            errors++;
          }
        }
      }
      console.log('');
    }

    // Step 4: Verify assignments
    console.log('📋 Step 4: Verifying all assignments...\n');
    const [verification] = await conn.query(`
      SELECT 
        u.username,
        u.role,
        CONCAT(e.first_name, ' ', e.last_name) as full_name,
        d.name as department,
        o.name as occupation_name,
        eo.assigned_at
      FROM Users u
      LEFT JOIN Employees e ON e.uuid = u.employee_uuid
      LEFT JOIN Departments d ON d.uuid = e.department_uuid
      LEFT JOIN EmployeeOccupations eo ON eo.employee_uuid = e.uuid
      LEFT JOIN Occupations o ON o.uuid = eo.occupation_uuid
      WHERE u.role = 'DEPARTMENT_HEAD'
      ORDER BY u.username, o.name
    `);

    console.log('Current Department Head Occupations:');
    console.table(verification);

    // Step 5: Summary
    console.log('\n📊 SUMMARY');
    console.log('═══════════════════════════════════════════════════');
    console.log(`Department Heads Found:        ${deptHeads.length}`);
    console.log(`New Occupations Assigned:      ${totalAssigned}`);
    console.log(`Already Assigned (skipped):    ${alreadyHad}`);
    console.log(`Errors:                        ${errors}`);
    console.log('═══════════════════════════════════════════════════');

    // Check for department heads without critical attendance occupation
    const [missingAttendance] = await conn.query(`
      SELECT 
        u.username,
        CONCAT(e.first_name, ' ', e.last_name) as full_name
      FROM Users u
      LEFT JOIN Employees e ON e.uuid = u.employee_uuid
      WHERE u.role = 'DEPARTMENT_HEAD'
        AND u.employee_uuid IS NOT NULL
        AND NOT EXISTS (
          SELECT 1 FROM EmployeeOccupations eo
          JOIN Occupations o ON o.uuid = eo.occupation_uuid
          WHERE eo.employee_uuid = e.uuid
            AND o.name = 'Attendance - Overview'
        )
    `);

    if (missingAttendance.length > 0) {
      console.log('\n⚠️  WARNING: Department heads still missing Attendance - Overview:');
      missingAttendance.forEach(dh => {
        console.log(`   - ${dh.full_name} (${dh.username})`);
      });
      console.log('\n❌ FIX INCOMPLETE - Attendance module will NOT work for these users!');
    } else {
      console.log('\n✅ SUCCESS! All department heads now have access to attendance module.');
      console.log('   They should be able to view attendance at: /attendance');
    }

  } catch (error) {
    console.error('\n💥 FATAL ERROR:', error.message);
    console.error(error.stack);
  } finally {
    await conn.end();
    console.log('\n🔌 Database connection closed.');
  }
}

// Run the fix
fixDeptHeadAttendance().catch(console.error);
