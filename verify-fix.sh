#!/bin/bash

echo "========================================================================"
echo "EMPLOYEE MODULE VERIFICATION"
echo "========================================================================"
echo ""

cd "/home/wty/Downloads/FDRE-Mesob-HRMS-main/Mesob HRMS"

echo "1. Checking database tables..."
echo ""

mysql -u mesob -pmesob_password mesob_hrms << 'EOF'
SELECT 
  CASE 
    WHEN COUNT(*) = 5 THEN '✓ ALL 5 TABLES EXIST'
    ELSE CONCAT('✗ MISSING ', 5 - COUNT(*), ' TABLES')
  END as status
FROM information_schema.TABLES 
WHERE TABLE_SCHEMA = 'mesob_hrms' 
AND TABLE_NAME IN ('EmployeeAddresses', 'EmployeeIDDocuments', 'EmployeeFaceImages', 
                   'EmployeeRegistrationDrafts', 'Notifications');

SELECT 
  TABLE_NAME as 'Table',
  CASE WHEN TABLE_NAME IS NOT NULL THEN '✓' ELSE '✗' END as 'Exists'
FROM (
  SELECT 'EmployeeAddresses' as TABLE_NAME
  UNION SELECT 'EmployeeIDDocuments'
  UNION SELECT 'EmployeeFaceImages'
  UNION SELECT 'EmployeeRegistrationDrafts'
  UNION SELECT 'Notifications'
) expected
LEFT JOIN information_schema.TABLES t 
  ON t.TABLE_SCHEMA = 'mesob_hrms' 
  AND t.TABLE_NAME = expected.TABLE_NAME;
EOF

echo ""
echo "2. Checking employee data..."
echo ""

mysql -u mesob -pmesob_password mesob_hrms << 'EOF'
SELECT 
  CONCAT('Employees: ', COUNT(*)) as 'Record Count'
FROM Employees;

SELECT 
  CONCAT('Departments: ', COUNT(*)) as 'Record Count'
FROM Departments;

SELECT 
  CONCAT('Positions: ', COUNT(*)) as 'Record Count'
FROM Positions;
EOF

echo ""
echo "========================================================================"
echo "VERIFICATION COMPLETE"
echo "========================================================================"
echo ""
echo "Next steps:"
echo "  1. Restart your backend server"
echo "  2. Open browser and test:"
echo "     - Employee Profile page: http://localhost:3000/employees"
echo "     - Employee Registration: http://localhost:3000/employee-registration"
echo "  3. Check browser console and network tab for any errors"
echo ""
echo "For detailed info, see: EMPLOYEE_MODULE_FIX_COMPLETE.md"
echo ""
