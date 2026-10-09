const mysql = require('mysql2/promise');

(async () => {
  const conn = await mysql.createConnection({
    host: 'localhost',
    user: 'mesob',
    password: 'mesob_password',
    database: 'mesob_hrms'
  });

  console.log('Fixing AttendanceSummary table...');
  
  // Check if corrected_by_uuid column exists
  const [columns] = await conn.query("SHOW COLUMNS FROM AttendanceSummary LIKE 'corrected_by_uuid'");
  
  if (columns.length === 0) {
    await conn.query(`
      ALTER TABLE AttendanceSummary 
      ADD COLUMN corrected_by_uuid VARCHAR(36) DEFAULT NULL AFTER break_duration_minutes
    `);
    console.log('✓ Added corrected_by_uuid column to AttendanceSummary');
  } else {
    console.log('✓ corrected_by_uuid column already exists');
  }

  console.log('\nFixing Holidays table...');
  
  // Drop and recreate Holidays table with correct camelCase column names
  await conn.query('DROP TABLE IF EXISTS Holidays');
  await conn.query(`
    CREATE TABLE Holidays (
      uuid VARCHAR(50) NOT NULL,
      holidayDate DATE NOT NULL,
      holidayName VARCHAR(255) NOT NULL,
      calendarYear VARCHAR(10) NOT NULL,
      calendarType VARCHAR(30) NOT NULL,
      isActive TINYINT(1) NOT NULL DEFAULT 1,
      source VARCHAR(30) NOT NULL DEFAULT 'MANUAL',
      description TEXT DEFAULT NULL,
      PRIMARY KEY (uuid),
      UNIQUE KEY uk_holidays_date (holidayDate)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);
  console.log('✓ Recreated Holidays table with camelCase columns');

  console.log('\nVerifying tables...');
  
  const [attCols] = await conn.query('DESCRIBE AttendanceSummary');
  const correctedByCol = attCols.find(c => c.Field === 'corrected_by_uuid');
  console.log('AttendanceSummary.corrected_by_uuid:', correctedByCol ? '✓ EXISTS' : '✗ MISSING');
  
  const [holidayCols] = await conn.query('DESCRIBE Holidays');
  const hasHolidayDate = holidayCols.find(c => c.Field === 'holidayDate');
  console.log('Holidays.holidayDate:', hasHolidayDate ? '✓ EXISTS' : '✗ MISSING');

  await conn.end();
  console.log('\n✅ All fixes applied successfully!');
})().catch(err => {
  console.error('❌ Error:', err.message);
  process.exit(1);
});
