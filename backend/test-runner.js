#!/usr/bin/env node

const { spawn } = require('child_process');

const jest = spawn('npx', ['jest', '__tests__/preservationPropertyTests.test.js', '--verbose', '--forceExit'], {
  cwd: __dirname,
  stdio: 'inherit',
  shell: true
});

jest.on('close', (code) => {
  console.log(`Test process exited with code ${code}`);
  process.exit(code);
});
