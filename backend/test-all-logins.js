const users = [
  { username: 'abebe.tadesse', role: 'Super Admin', expectedDashboard: 'hr' },
  { username: 'tigist.bekele', role: 'HR Admin', expectedDashboard: 'hr' },
  { username: 'dawit.girma', role: 'Department Head', expectedDashboard: 'department' },
  { username: 'marta.mulugeta', role: 'HR Officer', expectedDashboard: 'hr' },
  { username: 'yohannes.solomon', role: 'Employee', expectedDashboard: 'employee' }
];

const password = 'mesob2024';

async function testLogin(username, role, expectedDashboard) {
  try {
    const response = await fetch('http://localhost:5000/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password })
    });
    
    const data = await response.json();
    
    if (response.ok) {
      const actualDashboard = data.data.dashboard;
      const match = actualDashboard === expectedDashboard;
      
      console.log(`${match ? '✓' : '✗'} ${role} (${username})`);
      console.log(`  Expected: ${expectedDashboard}`);
      console.log(`  Actual:   ${actualDashboard}`);
      console.log(`  Role:     ${data.data.role?.name || 'N/A'}`);
      console.log('');
      
      return match;
    } else {
      console.log(`✗ ${role} (${username}): Login failed`);
      console.log(`  Error: ${data.message}`);
      console.log('');
      return false;
    }
  } catch (error) {
    console.log(`✗ ${role} (${username}): ${error.message}`);
    console.log('');
    return false;
  }
}

async function testAll() {
  console.log('Testing Dashboard Routing for All Roles\n' + '='.repeat(50) + '\n');
  
  let passed = 0;
  let failed = 0;
  
  for (const user of users) {
    const result = await testLogin(user.username, user.role, user.expectedDashboard);
    if (result) passed++;
    else failed++;
  }
  
  console.log('='.repeat(50));
  console.log(`Results: ${passed} passed, ${failed} failed`);
  
  if (failed === 0) {
    console.log('✓ All tests passed!');
  } else {
    console.log('✗ Some tests failed');
    process.exit(1);
  }
}

testAll();
