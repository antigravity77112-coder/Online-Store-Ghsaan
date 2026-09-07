async function testProfile() {
  const url = 'http://localhost:5000/api/account/profile';
  try {
    const res = await fetch(url, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
      // No token
    });
    
    console.log('Status:', res.status);
    const text = await res.text();
    console.log('Response:', text);
  } catch (err) {
    console.error('Fetch error:', err);
  }
}
testProfile();
