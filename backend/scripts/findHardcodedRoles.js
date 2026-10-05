/**
 * Find Hardcoded Role Checks
 * 
 * Scans the codebase for hardcoded role comparisons that need to be
 * replaced with permission-based checks.
 * 
 * Run: node scripts/findHardcodedRoles.js
 */

const fs = require('fs');
const path = require('path');

// Directories to scan
const dirsToScan = [
  'src/controllers',
  'src/services',
  'src/middleware',
  'src/routes'
];

// Patterns to search for
const patterns = [
  /\.role\s*===\s*["'](?:SUPER_ADMIN|HR_ADMIN|HR_OFFICER|DEPARTMENT_HEAD|EMPLOYEE)["']/g,
  /\.role\s*!==\s*["'](?:SUPER_ADMIN|HR_ADMIN|HR_OFFICER|DEPARTMENT_HEAD|EMPLOYEE)["']/g,
  /["'](?:SUPER_ADMIN|HR_ADMIN|HR_OFFICER|DEPARTMENT_HEAD|EMPLOYEE)["']\s*===\s*\.role/g,
  /\bincludes\s*\(\s*["'](?:SUPER_ADMIN|HR_ADMIN|HR_OFFICER|DEPARTMENT_HEAD|EMPLOYEE)["']\s*\)/g,
  /\[["'](?:SUPER_ADMIN|HR_ADMIN|HR_OFFICER|DEPARTMENT_HEAD|EMPLOYEE)["'].*\]\.includes\(/g,
];

// Files to exclude
const excludeFiles = [
  'findHardcodedRoles.js',
  'authorize.js', // Already migrated
  'roleManagementController.js', // New RBAC system
  'roleManagementRoutes.js', // New RBAC system
  'rbacService.js', // New RBAC system
  'roleManagementService.js', // New RBAC system
];

const results = [];

function scanFile(filePath) {
  const fileName = path.basename(filePath);
  
  if (excludeFiles.includes(fileName)) {
    return;
  }
  
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    const lines = content.split('\n');
    
    const matches = [];
    
    lines.forEach((line, index) => {
      patterns.forEach(pattern => {
        const match = line.match(pattern);
        if (match) {
          matches.push({
            line: index + 1,
            content: line.trim(),
            match: match[0]
          });
        }
      });
    });
    
    if (matches.length > 0) {
      results.push({
        file: filePath,
        matches: matches
      });
    }
  } catch (error) {
    console.error(`Error scanning ${filePath}:`, error.message);
  }
}

function scanDirectory(dir) {
  const fullPath = path.join(__dirname, '..', dir);
  
  if (!fs.existsSync(fullPath)) {
    console.log(`Directory not found: ${dir}`);
    return;
  }
  
  const files = fs.readdirSync(fullPath);
  
  files.forEach(file => {
    const filePath = path.join(fullPath, file);
    const stat = fs.statSync(filePath);
    
    if (stat.isDirectory()) {
      // Recursively scan subdirectories
      scanDirectory(path.join(dir, file));
    } else if (file.endsWith('.js')) {
      scanFile(filePath);
    }
  });
}

console.log('====================================');
console.log('Hardcoded Role Check Scanner');
console.log('====================================\n');

console.log('Scanning directories:');
dirsToScan.forEach(dir => console.log(`  - ${dir}`));
console.log('');

// Scan all directories
dirsToScan.forEach(dir => scanDirectory(dir));

// Display results
if (results.length === 0) {
  console.log('✅ No hardcoded role checks found!\n');
} else {
  console.log(`Found hardcoded role checks in ${results.length} file(s):\n`);
  
  results.forEach(result => {
    const relPath = result.file.replace(path.join(__dirname, '..'), '');
    console.log(`📄 ${relPath}`);
    console.log(`   ${result.matches.length} occurrence(s):\n`);
    
    result.matches.forEach(match => {
      console.log(`   Line ${match.line}: ${match.content}`);
    });
    
    console.log('');
  });
  
  // Summary
  console.log('====================================');
  console.log('Summary');
  console.log('====================================');
  console.log(`Files with hardcoded roles: ${results.length}`);
  console.log(`Total occurrences: ${results.reduce((sum, r) => sum + r.matches.length, 0)}`);
  console.log('');
  
  // Priority list
  const controllers = results.filter(r => r.file.includes('/controllers/'));
  const services = results.filter(r => r.file.includes('/services/'));
  const middleware = results.filter(r => r.file.includes('/middleware/'));
  const routes = results.filter(r => r.file.includes('/routes/'));
  
  console.log('By Category:');
  console.log(`  Controllers: ${controllers.length} files`);
  console.log(`  Services: ${services.length} files`);
  console.log(`  Middleware: ${middleware.length} files`);
  console.log(`  Routes: ${routes.length} files`);
  console.log('');
  
  console.log('Migration Priority:');
  console.log('  1. Controllers (business logic)');
  console.log('  2. Services (supporting logic)');
  console.log('  3. Middleware (can be deprecated)');
  console.log('  4. Routes (update as controllers migrate)');
  console.log('');
}

console.log('Next Steps:');
console.log('  1. Review RBAC_MIGRATION_GUIDE.md for migration patterns');
console.log('  2. Start with high-priority controllers');
console.log('  3. Replace role checks with permission checks');
console.log('  4. Test thoroughly with different roles');
console.log('  5. Run this script again to track progress\n');
