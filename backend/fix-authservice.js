const fs = require('fs');
const file = fs.readFileSync('/home/wty/Downloads/FDRE-Mesob-HRMS-main/Mesob HRMS/backend/src/services/authService.js', 'utf8');

// Comment out the old authorizationService calls since we're using moduleAuthService now
const fixed = file.replace(
  /\/\/ NEW: Get permissions from new authorization service\n  let permissions = \[\];\n  try \{\n    permissions = await authorizationService\.getUserPermissions\(userUuid\);\n  \} catch \(err\) \{\n    console\.error\("Error fetching permissions:", err\);\n  \}/,
  `// OLD authorization system disabled - using moduleAuthService instead
  // let permissions = [];
  // try {
  //   permissions = await authorizationService.getUserPermissions(userUuid);
  // } catch (err) {
  //   console.error("Error fetching permissions:", err);
  // }`
).replace(
  /\/\/ Get role info\n  let roleInfo = null;\n  try \{\n    roleInfo = await authorizationService\.getUserRole\(userUuid\);\n  \} catch \(err\) \{\n    console\.error\("Error fetching role:", err\);\n  \}/,
  `// OLD authorization system disabled - using moduleAuthService instead
  // let roleInfo = null;
  // try {
  //   roleInfo = await authorizationService.getUserRole(userUuid);
  // } catch (err) {
  //   console.error("Error fetching role:", err);
  // }`
);

fs.writeFileSync('/home/wty/Downloads/FDRE-Mesob-HRMS-main/Mesob HRMS/backend/src/services/authService.js', fixed);
console.log('✅ Disabled old authorizationService calls in authService.js');
