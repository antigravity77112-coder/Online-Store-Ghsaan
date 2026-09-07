const http = require('http');

const data = JSON.stringify({
  email: 'bdalrhmnaljdy395@gmail.com',
  password: 'Ghoomaan'
});

const options = {
  hostname: 'localhost',
  port: 5000,
  path: '/api/account/login',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Content-Length': data.length
  }
};

const req = http.request(options, (res) => {
  let result = '';
  res.on('data', (chunk) => {
    result += chunk;
  });
  res.on('end', () => {
    console.log(`Status: ${res.statusCode}`);
    console.log('Response: ', result);
  });
});

req.on('error', (error) => {
  console.error('Error:', error);
});

req.write(data);
req.end();
