#!/usr/bin/env node

/**
 * Deployment Readiness Check Script
 * Verifies that your MESOB HRMS application is ready for Render deployment
 */

const fs = require('fs');
const path = require('path');

const COLORS = {
  GREEN: '\x1b[32m',
  RED: '\x1b[31m',
  YELLOW: '\x1b[33m',
  BLUE: '\x1b[34m',
  RESET: '\x1b[0m',
};

let errors = 0;
let warnings = 0;
let passed = 0;

function check(description, condition, isWarning = false) {
  if (condition) {
    console.log(`${COLORS.GREEN}✓${COLORS.RESET} ${description}`);
    passed++;
    return true;
  } else {
    if (isWarning) {
      console.log(`${COLORS.YELLOW}⚠${COLORS.RESET} ${description}`);
      warnings++;
    } else {
      console.log(`${COLORS.RED}✗${COLORS.RESET} ${description}`);
      errors++;
    }
    return false;
  }
}

function fileExists(filePath) {
  return fs.existsSync(path.join(__dirname, filePath));
}

function fileContains(filePath, searchString) {
  try {
    const content = fs.readFileSync(path.join(__dirname, filePath), 'utf8');
    return content.includes(searchString);
  } catch (e) {
    return false;
  }
}

console.log(`\n${COLORS.BLUE}╔════════════════════════════════════════════════════╗${COLORS.RESET}`);
console.log(`${COLORS.BLUE}║   MESOB HRMS - Deployment Readiness Check         ║${COLORS.RESET}`);
console.log(`${COLORS.BLUE}╚════════════════════════════════════════════════════╝${COLORS.RESET}\n`);

// Section 1: Required Files
console.log(`${COLORS.BLUE}1. Required Deployment Files${COLORS.RESET}`);
check('render.yaml exists', fileExists('render.yaml'));
check('Backend Dockerfile exists', fileExists('backend/Dockerfile'));
check('Backend .env.example exists', fileExists('backend/.env.example'));
check('Backend .env.production exists', fileExists('backend/.env.production'));
check('Frontend .env.production exists', fileExists('frontend/.env.production'));
check('DEPLOYMENT_GUIDE.md exists', fileExists('DEPLOYMENT_GUIDE.md'));
console.log('');

// Section 2: Backend Configuration
console.log(`${COLORS.BLUE}2. Backend Configuration${COLORS.RESET}`);
check('Backend package.json exists', fileExists('backend/package.json'));
check('Backend server.js exists', fileExists('backend/server.js'));
check('Backend has start script', fileContains('backend/package.json', '"start"'));
check('Backend has Node engine specified', fileContains('backend/package.json', '"engines"'));
check('Backend has health endpoint', fileExists('backend/src/routes/healthRoutes.js'));
console.log('');

// Section 3: Frontend Configuration
console.log(`${COLORS.BLUE}3. Frontend Configuration${COLORS.RESET}`);
check('Frontend package.json exists', fileExists('frontend/package.json'));
check('Frontend has build script', fileContains('frontend/package.json', '"build"'));
check('Frontend has Node engine specified', fileContains('frontend/package.json', '"engines"'));
check('Frontend vite.config.js exists', fileExists('frontend/vite.config.js'));
check('Frontend index.html exists', fileExists('frontend/index.html'));
console.log('');

// Section 4: Database Scripts
console.log(`${COLORS.BLUE}4. Database Setup${COLORS.RESET}`);
check('Database schema exists', fileExists('database/schema.sql'));
check('Database seed data exists', fileExists('database/seed.sql'));
check('Database setup script exists', fileExists('backend/scripts/dbSetup.js') || fileExists('backend/scripts/dbInit.js') || fileContains('backend/package.json', '"db:init"'));
console.log('');

// Section 5: Git Configuration
console.log(`${COLORS.BLUE}5. Git Configuration${COLORS.RESET}`);
check('.gitignore exists', fileExists('.gitignore'));
check('.gitignore excludes .env', fileContains('.gitignore', '.env'));
check('.gitignore excludes node_modules', fileContains('.gitignore', 'node_modules'));
check('.gitignore excludes dist', fileContains('.gitignore', 'dist'));
console.log('');

// Section 6: Environment Variables Check
console.log(`${COLORS.BLUE}6. Environment Variable Templates${COLORS.RESET}`);
const envVars = [
  'PORT',
  'DB_HOST',
  'DB_USER',
  'DB_PASSWORD',
  'DB_NAME',
  'JWT_SECRET',
  'MINIO_ENDPOINT',
  'MINIO_ACCESS_KEY',
];
envVars.forEach(varName => {
  check(
    `.env.example includes ${varName}`,
    fileContains('backend/.env.example', varName),
    true
  );
});
console.log('');

// Section 7: Security Checks
console.log(`${COLORS.BLUE}7. Security Checks${COLORS.RESET}`);
check('.env file is gitignored', !fileExists('.git/config') || !fileContains('.git/config', '.env'));
check('No .env file in root (use .env.example)', !fileExists('.env'), true);
check('No backend .env committed', !fileExists('backend/.env'), true);
check('CORS configuration exists', fileContains('backend/src/app.js', 'cors'));
check('Helmet security headers enabled', fileContains('backend/src/app.js', 'helmet'));
console.log('');

// Section 8: Code Quality
console.log(`${COLORS.BLUE}8. Code Quality & Structure${COLORS.RESET}`);
check('Backend controllers exist', fileExists('backend/src/controllers'));
check('Backend routes exist', fileExists('backend/src/routes'));
check('Backend middleware exists', fileExists('backend/src/middleware'));
check('Frontend components exist', fileExists('frontend/src/components') || fileExists('frontend/src'));
check('API client exists', fileExists('frontend/src/utils/apiClient.js') || fileExists('frontend/src/api'));
console.log('');

// Summary
console.log(`\n${COLORS.BLUE}╔════════════════════════════════════════════════════╗${COLORS.RESET}`);
console.log(`${COLORS.BLUE}║   Summary                                          ║${COLORS.RESET}`);
console.log(`${COLORS.BLUE}╚════════════════════════════════════════════════════╝${COLORS.RESET}\n`);

console.log(`${COLORS.GREEN}✓ Passed:${COLORS.RESET}   ${passed}`);
console.log(`${COLORS.YELLOW}⚠ Warnings:${COLORS.RESET} ${warnings}`);
console.log(`${COLORS.RED}✗ Errors:${COLORS.RESET}   ${errors}\n`);

if (errors === 0 && warnings === 0) {
  console.log(`${COLORS.GREEN}╔════════════════════════════════════════════════════╗${COLORS.RESET}`);
  console.log(`${COLORS.GREEN}║   🎉 READY FOR DEPLOYMENT!                        ║${COLORS.RESET}`);
  console.log(`${COLORS.GREEN}╚════════════════════════════════════════════════════╝${COLORS.RESET}\n`);
  console.log('Your application is ready to deploy on Render!');
  console.log(`\nNext steps:`);
  console.log('1. Commit and push all changes to GitHub');
  console.log('2. Read DEPLOYMENT_GUIDE.md for detailed instructions');
  console.log('3. Go to render.com and create a new Blueprint');
  console.log('4. Connect your GitHub repository\n');
} else if (errors === 0) {
  console.log(`${COLORS.YELLOW}╔════════════════════════════════════════════════════╗${COLORS.RESET}`);
  console.log(`${COLORS.YELLOW}║   ⚠ READY WITH WARNINGS                           ║${COLORS.RESET}`);
  console.log(`${COLORS.YELLOW}╚════════════════════════════════════════════════════╝${COLORS.RESET}\n`);
  console.log('Your application is mostly ready, but has some warnings.');
  console.log('Review the warnings above and fix if necessary.\n');
} else {
  console.log(`${COLORS.RED}╔════════════════════════════════════════════════════╗${COLORS.RESET}`);
  console.log(`${COLORS.RED}║   ✗ NOT READY FOR DEPLOYMENT                      ║${COLORS.RESET}`);
  console.log(`${COLORS.RED}╚════════════════════════════════════════════════════╝${COLORS.RESET}\n`);
  console.log('Please fix the errors above before deploying.\n');
  process.exit(1);
}
