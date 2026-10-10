#!/usr/bin/env node

const { spawn } = require('child_process');

const jest = spawn('npx', ['jest', '__tests__/bugConditionExploration.test.js', '--verbose', '--forceExit'], {
  cwd: __dirname,
  stdio: 'inherit',
  shell: true
});

jest.on('close', (code) => {
  console.log(`\n=== Test process exited with code ${code} ===`);
  process.exit(code);
});
