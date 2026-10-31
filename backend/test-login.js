async function testLogin() {
  try {
    const response = await fetch('http://localhost:5000/api/auth/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        username: 'abebe.tadesse',
        password: 'mesob2024'
      })
    });
    
    const data = await response.json();
    
    if (response.ok) {
      console.log('✓ Login successful!');
      console.log('\nResponse status:', response.status);
      console.log('Response data:', JSON.stringify(data, null, 2));
    } else {
      console.error('✗ Login failed!');
      console.error('Status:', response.status);
      console.error('Data:', data);
      process.exit(1);
    }
    
  } catch (error) {
    console.error('✗ Error:', error.message);
    process.exit(1);
  }
}

testLogin();
