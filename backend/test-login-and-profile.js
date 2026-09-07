async function testLoginAndProfile() {
  try {
    const loginRes = await fetch('http://localhost:5000/api/account/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'bdalrhmnaljdy395@gmail.com', password: 'Ghoomaan' })
    });
    const loginData = await loginRes.json();
    console.log('Login successful. Token:', loginData.token.substring(0, 20) + '...');
    
    const profileRes = await fetch('http://localhost:5000/api/account/profile', {
      method: 'GET',
      headers: { 'Authorization': `Bearer ${loginData.token}` }
    });
    
    console.log('Profile Status:', profileRes.status);
    const profileText = await profileRes.text();
    console.log('Profile Data:', profileText);
  } catch(err) {
    console.error('Error:', err);
  }
}
testLoginAndProfile();
