const fs = require('fs');
const file = fs.readFileSync('/home/wty/Downloads/FDRE-Mesob-HRMS-main/Mesob HRMS/backend/src/utils/rbac.js', 'utf8');

// Replace the assertEmployeeListAccess function to use module scope instead of old auth service
const fixed = file.replace(
  /async function assertEmployeeListAccess\(user\) \{[^}]+await authorizationService\.hasPermission[^}]+await authorizationService\.getUserScope[^}]+\}/s,
  `async function assertEmployeeListAccess(user, moduleAccess) {
  if (!user) {
    throw new ApiError("Not authenticated.", 401, "UNAUTHORIZED");
  }

  // Permission check is now handled by requireModule() middleware
  // Just return the scope from moduleAccess
  return moduleAccess?.scope || 'ORGANIZATION';
}`
);

fs.writeFileSync('/home/wty/Downloads/FDRE-Mesob-HRMS-main/Mesob HRMS/backend/src/utils/rbac.js', fixed);
console.log('✅ Fixed assertEmployeeListAccess in rbac.js');
