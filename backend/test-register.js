async function testRegistration() {
  const url = 'http://localhost:5000/api/account/register';
  try {
    console.log('Sending registration request to ' + url + ' without phone number...');
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        fullName: 'Test No Phone User',
        email: `test_no_phone_${Date.now()}@example.com`,
        password: 'password123',
        city: 'صنعاء'
      })
    });
    
    console.log('Status:', res.status);
    const text = await res.text();
    console.log('Response:', text);
  } catch (err) {
    console.error('Fetch error:', err);
  }
}
testRegistration();
