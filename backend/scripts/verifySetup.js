/**
 * Comprehensive Setup Verification
 * Checks that all tables, columns, and seed data are present
 */

const mysql = require('mysql2/promise');
const Minio = require('minio');
require('dotenv').config();

const sep = () => console.log('='.repeat(70));

(async () => {
  sep();
  console.log('MESOB HRMS — SETUP VERIFICATION');
  sep();

  // ─── MySQL ───────────────────────────────────────────────────────────
  const mc = await mysql.createConnection({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME,
  });

  console.log('\n[MySQL] Database:', process.env.DB_NAME);

  // Check table count
  const [tables] = await mc.query('SHOW TABLES');
  const expected = 36;
  console.log(` Tables: ${tables.length} ${tables.length >= expected ? '✓' : '✗ Expected ' + expected}`);

  // Check critical tables exist
  const critical = [
    'Employees', 'Users', 'Departments', 'Positions', 'Occupations',
    'Levels', 'LevelVersions', 'RoleOccupations', 'OccupationDelegations',
    'leaveRequests', 'AttendanceLogs', 'LetterTemplates', 'AuditLogs'
  ];

  const tableNames = new Set(tables.map(t => Object.values(t)[0]));
  let missingTables = [];
  for (const t of critical) {
    if (!tableNames.has(t)) {
      missingTables.push(t);
    }
  }

  if (missingTables.length > 0) {
    console.log(' ✗ Missing tables:', missingTables.join(', '));
  } else {
    console.log(' ✓ All critical tables present');
  }

  // Check Users columns
  const [userCols] = await mc.query('DESCRIBE Users');
  const userColNames = new Set(userCols.map(c => c.Field));
  const requiredUserCols = ['permissions_version', 'last_activity'];
  const missingUserCols = requiredUserCols.filter(c => !userColNames.has(c));
  
  if (missingUserCols.length > 0) {
    console.log(' ✗ Missing Users columns:', missingUserCols.join(', '));
    console.log('   Fix: npm run db:migrate:users');
  } else {
    console.log(' ✓ Users table has all required columns');
  }

  // Check Employees.level_uuid
  const empCols = new Set((await mc.query('DESCRIBE Employees'))[0].map(c => c.Field));
  if (!empCols.has('level_uuid')) {
    console.log(' ✗ Missing Employees.level_uuid column');
    console.log('   Fix: npm run db:migrate:levels');
  } else {
    console.log(' ✓ Employees.level_uuid exists');
  }

  // Check row counts
  const counts = {
    Employees: 25,
    Users: 8,
    Departments: 38,
    Positions: 138,
    Levels: 12,
    RoleOccupations: 35,
    Holidays: 18,
    Occupations: 19,
  };

  console.log('\n[MySQL] Row Counts:');
  let allGood = true;
  for (const [table, expectedCount] of Object.entries(counts)) {
    if (!tableNames.has(table)) {
      console.log(` ✗ ${table.padEnd(20)} MISSING TABLE`);
      allGood = false;
      continue;
    }
    const [[row]] = await mc.query(`SELECT COUNT(*) AS n FROM \`${table}\``);
    const actual = row.n;
    const ok = actual >= expectedCount;
    console.log(` ${ok ? '✓' : '✗'} ${table.padEnd(20)} ${actual} ${!ok ? '(expected ≥' + expectedCount + ')' : ''}`);
    if (!ok) allGood = false;
  }

  // Check admin user password
  const [[admin]] = await mc.query("SELECT password_hash FROM Users WHERE username = 'admin'");
  if (!admin) {
    console.log('\n ✗ Admin user not found');
  } else {
    const bcrypt = require('bcryptjs');
    const valid = await bcrypt.compare('admin123', admin.password_hash);
    console.log(`\n ${valid ? '✓' : '✗'} Admin password ${valid ? 'matches admin123' : 'is incorrect — run password reset'}`);
  }

  await mc.end();

  // ─── MinIO ───────────────────────────────────────────────────────────
  console.log('\n[MinIO] Bucket:', process.env.MINIO_BUCKET);

  const client = new Minio.Client({
    endPoint:  process.env.MINIO_ENDPOINT,
    port:      parseInt(process.env.MINIO_PORT || '9000'),
    useSSL:    false,
    accessKey: process.env.MINIO_ACCESS_KEY,
    secretKey: process.env.MINIO_SECRET_KEY,
  });

  const bucket = process.env.MINIO_BUCKET;
  const exists = await client.bucketExists(bucket);
  console.log(` ${exists ? '✓' : '✗'} Bucket exists: ${exists}`);

  if (exists) {
    const folders = [
      'employee-photos/',
      'employee-documents/',
      'face-images/',
      'leave-documents/',
      'letter-templates/',
      'letter-requests/',
      'organization/',
    ];

    const objects = await new Promise((resolve) => {
      const list = [];
      const stream = client.listObjects(bucket, '', true);
      stream.on('data', obj => list.push(obj.name));
      stream.on('end', () => resolve(list));
    });

    const folderSet = new Set(objects.map(o => o.replace('.keep', '')));
    let missingFolders = [];
    for (const f of folders) {
      if (!folderSet.has(f)) {
        missingFolders.push(f);
      }
    }

    if (missingFolders.length > 0) {
      console.log(' ✗ Missing folders:', missingFolders.join(', '));
    } else {
      console.log(' ✓ All folders present');
    }
  }

  // ─── Summary ─────────────────────────────────────────────────────────
  sep();
  console.log('VERIFICATION SUMMARY');
  sep();

  if (missingTables.length > 0) {
    console.log('✗ Some tables are missing — run: npm run db:init');
  } else if (missingUserCols.length > 0 || !empCols.has('level_uuid')) {
    console.log('✗ Migrations incomplete — run: npm run db:migrate:all');
  } else if (!allGood) {
    console.log('⚠️  Tables exist but seed data is incomplete');
  } else {
    console.log('✓ Database and MinIO are fully configured!');
    console.log('  You can now run: npm start');
  }
  sep();
})().catch(e => {
  console.error('\nVerification failed:', e.message);
  process.exit(1);
});
