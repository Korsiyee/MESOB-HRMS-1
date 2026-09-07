/**
 * Migration Script: Attendance System Enhancements
 * 
 * This script applies the database schema changes for the attendance system redesign:
 * - Adds lifecycle states to AttendanceLogs
 * - Adds calculation fields to AttendanceSummary (worked_hours, overtime_hours, missing_hours, late_minutes)
 * - Adds grace_period_minutes and break_duration_minutes to ShiftDefinitions
 * - Updates existing data to set proper states
 */

const fs = require('fs');
const path = require('path');
const { executeQuery } = require('../src/utils/dbQuery');

async function runMigration() {
  console.log('='.repeat(70));
  console.log('ATTENDANCE SYSTEM ENHANCEMENT MIGRATION');
  console.log('='.repeat(70));
  
  try {
    const statements = [
      // Step 1: Add lifecycle state to AttendanceLogs
      `ALTER TABLE AttendanceLogs 
       ADD COLUMN state ENUM('PENDING','CHECKED_IN','CHECKED_OUT','CALCULATED') 
       NOT NULL DEFAULT 'PENDING' 
       AFTER check_out`,
      
      `ALTER TABLE AttendanceLogs ADD INDEX idx_attendance_logs_state (state)`,
      
      // Step 2: Add calculated hours to AttendanceSummary
      `ALTER TABLE AttendanceSummary 
       ADD COLUMN worked_hours DECIMAL(5,2) NULL COMMENT 'Total hours worked (check_out - check_in - break)'`,
      
      `ALTER TABLE AttendanceSummary 
       ADD COLUMN overtime_hours DECIMAL(5,2) NULL COMMENT 'Hours worked beyond shift duration'`,
      
      `ALTER TABLE AttendanceSummary 
       ADD COLUMN missing_hours DECIMAL(5,2) NULL COMMENT 'Hours missing from expected shift duration (undertime)'`,
      
      `ALTER TABLE AttendanceSummary 
       ADD COLUMN late_minutes INT NULL COMMENT 'Minutes late compared to shift start time'`,
      
      `ALTER TABLE AttendanceSummary 
       ADD COLUMN break_duration_minutes INT NULL COMMENT 'Break duration snapshot from shift at calculation time'`,
      
      // Step 3: Add grace period and break duration to ShiftDefinitions
      `ALTER TABLE ShiftDefinitions 
       ADD COLUMN grace_period_minutes INT NOT NULL DEFAULT 15 COMMENT 'Grace period before marking employee as late'`,
      
      `ALTER TABLE ShiftDefinitions 
       ADD COLUMN break_duration_minutes INT NOT NULL DEFAULT 0 COMMENT 'Break duration to deduct from worked hours'`,
      
      // Step 4: Update existing AttendanceLogs to set proper state based on current data
      `UPDATE AttendanceLogs 
       SET state = CASE 
           WHEN check_out IS NOT NULL THEN 'CHECKED_OUT'
           WHEN check_in IS NOT NULL THEN 'CHECKED_IN'
           ELSE 'PENDING'
       END`,
      
      // Step 5: Add indexes
      `ALTER TABLE AttendanceLogs 
       ADD INDEX idx_attendance_logs_state_date (state, date)`,
      
      `ALTER TABLE AttendanceSummary 
       ADD INDEX idx_attendance_summary_worked_hours (worked_hours)`
    ];
    
    console.log(`\nFound ${statements.length} SQL statements to execute\n`);
    
    let successCount = 0;
    let skipCount = 0;
    let errorCount = 0;
    
    const operations = [
      'Adding lifecycle state column to AttendanceLogs',
      'Adding state index to AttendanceLogs',
      'Adding worked_hours column to AttendanceSummary',
      'Adding overtime_hours column to AttendanceSummary',
      'Adding missing_hours column to AttendanceSummary',
      'Adding late_minutes column to AttendanceSummary',
      'Adding break_duration_minutes column to AttendanceSummary',
      'Adding grace_period_minutes to ShiftDefinitions',
      'Adding break_duration_minutes to ShiftDefinitions',
      'Updating existing attendance log states',
      'Adding compound index (state, date) to AttendanceLogs',
      'Adding worked_hours index to AttendanceSummary'
    ];
    
    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i];
      const operation = operations[i];
      
      console.log(`[${i + 1}/${statements.length}] ${operation}...`);
      
      try {
        await executeQuery(statement);
        successCount++;
        console.log('  ✓ Success');
      } catch (error) {
        // Check if error is because column/index already exists
        if (error.message.includes('Duplicate column name') || 
            error.message.includes('Duplicate key name') ||
            error.message.includes('already exists')) {
          skipCount++;
          console.log('  ⊘ Skipped (already exists)');
        } else {
          errorCount++;
          console.error(`  ✗ Error: ${error.message}`);
        }
      }
    }
    
    console.log('\n' + '='.repeat(70));
    console.log('MIGRATION SUMMARY');
    console.log('='.repeat(70));
    console.log(`✓ Successful: ${successCount}`);
    console.log(`⊘ Skipped:    ${skipCount}`);
    console.log(`✗ Errors:     ${errorCount}`);
    console.log('='.repeat(70));
    
    if (errorCount === 0) {
      console.log('\n✓ Migration completed successfully!');
      console.log('\nNext steps:');
      console.log('1. Restart your backend server');
      console.log('2. Test check-in/check-out functionality');
      console.log('3. Verify worked hours calculations appear correctly');
      console.log('4. Update shift definitions to set grace periods and break durations');
      return true;
    } else {
      console.log('\n⚠ Migration completed with errors. Please review the errors above.');
      return false;
    }
    
  } catch (error) {
    console.error('\n✗ Migration failed:', error.message);
    console.error(error.stack);
    return false;
  }
}

// Run if called directly
if (require.main === module) {
  runMigration()
    .then((success) => {
      process.exit(success ? 0 : 1);
    })
    .catch((error) => {
      console.error('Fatal error:', error);
      process.exit(1);
    });
}

module.exports = { runMigration };
