require('dotenv').config();

async function testLetterRequestsAPI() {
  try {
    console.log('Testing /api/letters/requests/all endpoint...\n');
    
    // First login to get a token
    const loginRes = await fetch('http://localhost:5000/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: 'admin', password: 'admin123' })
    });
    
    const loginData = await loginRes.json();
    
    if (!loginRes.ok) {
      console.log('❌ Login failed:', loginData.message);
      return;
    }
    
    console.log('✅ Login successful');
    const token = loginData.data.accessToken;
    
    // Test the letter requests endpoint
    console.log('\nTesting GET /api/letters/requests/all...');
    const requestsRes = await fetch('http://localhost:5000/api/letters/requests/all', {
      headers: { 
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });
    
    console.log('Status:', requestsRes.status);
    console.log('Status Text:', requestsRes.statusText);
    
    const requestsData = await requestsRes.json();
    
    if (!requestsRes.ok) {
      console.log('\n❌ API Error:');
      console.log('Message:', requestsData.message || requestsData.error);
      console.log('Full response:', JSON.stringify(requestsData, null, 2));
    } else {
      console.log('\n✅ API Success:');
      console.log('Data type:', Array.isArray(requestsData.data) ? 'Array' : typeof requestsData.data);
      console.log('Count:', requestsData.data?.length || 0);
      console.log('Response:', JSON.stringify(requestsData, null, 2));
    }
    
  } catch (error) {
    console.error('\n❌ Test failed:', error.message);
    console.error(error.stack);
  }
}

testLetterRequestsAPI();
