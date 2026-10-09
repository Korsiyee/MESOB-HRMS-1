# Bugfix Requirements Document

## Introduction

The attendance records page is currently broken due to a SQL error in the `attendanceAnalyticsService.js` file. The error occurs because the SQL query references a non-existent column name `a.corrected_by` when the actual column in the AttendanceSummary table is `corrected_by_uuid`. Additionally, the query incorrectly attempts to join the Employees table using this column when `corrected_by_uuid` is a foreign key to the Users table, not the Employees table.

This bug completely prevents users from viewing attendance records and causes continuous errors on page load.

## Bug Analysis

### Current Behavior (Defect)

1.1 WHEN the getAttendanceRecords function is called THEN the system throws an SQL error "ER_BAD_FIELD_ERROR (1054): Unknown column 'a.corrected_by' in 'on clause'"

1.2 WHEN the SQL query attempts to join Employees table using `a.corrected_by` THEN the system fails because the column does not exist in the AttendanceSummary table

1.3 WHEN the attendance records page loads THEN the system displays error messages continuously and prevents users from viewing attendance data

### Expected Behavior (Correct)

2.1 WHEN the getAttendanceRecords function is called THEN the system SHALL use the correct column name `corrected_by_uuid` in the SQL query

2.2 WHEN retrieving the corrector's name THEN the system SHALL join the Users table using `a.corrected_by_uuid` and then join the Employees table through the Users table's employee_uuid column

2.3 WHEN the attendance records page loads THEN the system SHALL successfully display attendance records with corrector names (when applicable) without any SQL errors

### Unchanged Behavior (Regression Prevention)

3.1 WHEN querying attendance records with no manual corrections THEN the system SHALL CONTINUE TO return records with NULL values for corrected_by_name and corrected_at

3.2 WHEN filtering, sorting, and paginating attendance records THEN the system SHALL CONTINUE TO apply filters, sorting, and pagination correctly

3.3 WHEN retrieving employee information, department, position, shift, and attendance log data THEN the system SHALL CONTINUE TO join and return all other fields correctly

3.4 WHEN counting total records for pagination THEN the system SHALL CONTINUE TO return accurate counts

3.5 WHEN querying attendance records for employees without correction data THEN the system SHALL CONTINUE TO handle LEFT JOIN gracefully with NULL values
