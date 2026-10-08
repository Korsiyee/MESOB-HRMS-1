#!/bin/bash

# Fix all remaining JOIN order issues

# Fix attendanceService.js
sed -i 's/LEFT JOIN Departments d ON d\.uuid = p\.department_uuid.*$/LEFT JOIN Positions p ON p.uuid = e.position_uuid\n    LEFT JOIN Departments d ON d.uuid = p.department_uuid/g' src/services/attendanceService.js

# Fix employeeService.js  
sed -i 's/LEFT JOIN Departments d ON d\.uuid = p\.department_uuid.*$/LEFT JOIN Positions p ON p.uuid = e.position_uuid\n    LEFT JOIN Departments d ON d.uuid = p.department_uuid/g' src/services/employeeService.js

# Fix positionService.js - these are correct as p is Positions table
# No changes needed

# Fix shiftService.js
sed -i 's/LEFT JOIN Departments d ON p\.department_uuid = d\.uuid$/LEFT JOIN Positions p ON p.uuid = e.position_uuid\n    LEFT JOIN Departments d ON p.department_uuid = d.uuid/g' src/services/shiftService.js

# Fix faceRecognitionService.js
sed -i 's/LEFT JOIN Departments d ON p\.department_uuid = d\.uuid$/LEFT JOIN Positions p ON p.uuid = e.position_uuid\n     LEFT JOIN Departments d ON p.department_uuid = d.uuid/g' src/services/faceRecognitionService.js

echo "All fixes applied!"
