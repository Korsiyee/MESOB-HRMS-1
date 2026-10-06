const fs = require('fs');
const file = fs.readFileSync('/home/wty/Downloads/FDRE-Mesob-HRMS-main/Mesob HRMS/backend/src/services/authService.js', 'utf8');

// Fix the return statement to not reference the commented-out variables
const fixed = file.replace(
  /return \{[\s\S]*?role: roleInfo \? roleInfo\.code : user\.role,[\s\S]*?role_name: roleInfo \? roleInfo\.name : null,[\s\S]*?permissions,[\s\S]*?occupations: occupations,[\s\S]*?\};/,
  `return {
    uuid: user.uuid,
    employee_uuid: user.employee_uuid,
    department_uuid: user.department_uuid || null,
    username: user.username,
    email: employeeData?.email || null,
    role_id: user.role_id,
    role_uuid: user.role_uuid,
    is_active: Boolean(user.is_active),
    full_name: fullName,
    profile_photo_url: profilePhotoUrl,
    mesob_id: employeeData?.mesob_id || null,
    // Module permissions will be fetched separately by moduleAuthService
  };`
);

fs.writeFileSync('/home/wty/Downloads/FDRE-Mesob-HRMS-main/Mesob HRMS/backend/src/services/authService.js', fixed);
console.log('✅ Fixed getUserWithOccupations return statement');
