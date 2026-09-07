require('dotenv').config();
const http = require('http');

const BASE = { hostname: 'localhost', port: 5000 };

const TEST_EMAIL = process.env.TEST_ADMIN_EMAIL;
const TEST_PASSWORD = process.env.TEST_ADMIN_PASSWORD;
if (!TEST_EMAIL || !TEST_PASSWORD) {
  console.error(
    'Set TEST_ADMIN_EMAIL and TEST_ADMIN_PASSWORD in backend/.env (your existing Supabase admin), then run again.'
  );
  process.exit(1);
}

function req(method, path, body, token) {
  return new Promise((resolve, reject) => {
    const headers = { 'Content-Type': 'application/json' };
    if (token) headers['Authorization'] = 'Bearer ' + token;
    const opts = { ...BASE, path, method, headers };
    const r = http.request(opts, res => {
      let d = '';
      res.on('data', c => d += c);
      res.on('end', () => resolve({ status: res.statusCode, body: d }));
    });
    r.on('error', reject);
    if (body) r.write(JSON.stringify(body));
    r.end();
  });
}

async function main() {
  // 1. Login — uses existing admin from Supabase (see TEST_ADMIN_* in .env)
  const login = await req('POST', '/api/account/login', {
    email: TEST_EMAIL,
    password: TEST_PASSWORD,
  });
  console.log('LOGIN:', login.status, login.body.substring(0, 120));
  let token;
  try {
    token = JSON.parse(login.body).token;
  } catch {
    console.error('Login failed; cannot continue authenticated tests.');
    process.exit(1);
  }

  // 2. Admin dashboard
  const dash = await req('GET', '/api/admin/dashboard', null, token);
  console.log('DASHBOARD:', dash.status, dash.body.substring(0, 80));

  // 3. Admin users
  const users = await req('GET', '/api/admin/users', null, token);
  console.log('USERS:', users.status, 'count:', JSON.parse(users.body).length);

  // 4. Admin products
  const prods = await req('GET', '/api/admin/products', null, token);
  console.log('PRODUCTS:', prods.status, 'count:', JSON.parse(prods.body).length);

  // 5. Categories
  const cats = await req('GET', '/api/categories', null, token);
  console.log('CATEGORIES:', cats.status, 'count:', JSON.parse(cats.body).length);

  // 6. Exchange rates
  const rates = await req('GET', '/api/SystemSettings/exchange-rates', null, token);
  console.log('RATES:', rates.status, rates.body);

  // 7. Update exchange rates
  const ratesUp = await req('PUT', '/api/SystemSettings/exchange-rates', { USD_to_YER_Sanaa: 550, USD_to_YER_Aden: 1700 }, token);
  console.log('RATES_UPDATE:', ratesUp.status);

  // 8. Create category
  const catNew = await req('POST', '/api/categories', { name: 'Test Category' }, token);
  console.log('CREATE_CAT:', catNew.status, catNew.body);

  // 9. Public products
  const pub = await req('GET', '/api/products?pageSize=2', null, null);
  const pubData = JSON.parse(pub.body);
  console.log('PUBLIC_PRODUCTS:', pub.status, 'isArray:', Array.isArray(pubData), 'count:', pubData.length);

  // Cleanup: delete test category
  if (catNew.status === 201) {
    const catId = JSON.parse(catNew.body);
    if (typeof catId === 'string') {
      const del = await req('DELETE', '/api/categories/' + catId, null, token);
      console.log('DELETE_CAT:', del.status);
    }
  }

  console.log('\n✅ All tests complete!');
}

main().catch(e => console.error('FAIL:', e));
