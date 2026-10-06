const fs = require('fs');
const file = fs.readFileSync('/home/wty/Downloads/FDRE-Mesob-HRMS-main/Mesob HRMS/backend/src/controllers/attendanceController.js', 'utf8');

// Fix the assertEmployeeListAccess call to pass req.moduleAccess
const fixed = file.replace(
  /const scope = assertEmployeeListAccess\(req\.user\);/,
  'const scope = await assertEmployeeListAccess(req.user, req.moduleAccess);'
);

fs.writeFileSync('/home/wty/Downloads/FDRE-Mesob-HRMS-main/Mesob HRMS/backend/src/controllers/attendanceController.js', fixed);
console.log('✅ Fixed assertEmployeeListAccess call in attendanceController.js');
