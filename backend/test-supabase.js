const { PrismaClient } = require('@prisma/client');
const dotenv = require('dotenv');

dotenv.config();

const prisma = new PrismaClient({ log: ['info', 'warn', 'error'] });

async function testSupabase() {
  console.log('='.repeat(60));
  console.log('   SUPABASE DATABASE CONNECTION & TABLE TEST');
  console.log('='.repeat(60));
  console.log();

  // 1. Test Connection
  console.log('[1/4] Testing connection...');
  try {
    await prisma.$connect();
    console.log('  ✅ Connected to Supabase successfully!\n');
  } catch (err) {
    console.error('  ❌ Connection FAILED:', err.message);
    process.exit(1);
  }

  // 2. Test raw SQL query
  console.log('[2/4] Testing raw SQL query...');
  try {
    const result = await prisma.$queryRaw`SELECT NOW() as server_time, current_database() as db_name, version() as pg_version`;
    console.log('  ✅ Raw SQL query works!');
    console.log('  Server time:', result[0].server_time);
    console.log('  Database:   ', result[0].db_name);
    console.log('  PostgreSQL: ', result[0].pg_version.substring(0, 50) + '...\n');
  } catch (err) {
    console.error('  ❌ Raw SQL query FAILED:', err.message, '\n');
  }

  // 3. Test all tables (count records)
  console.log('[3/4] Checking all tables...');
  const tables = ['user', 'category', 'product', 'order', 'orderItem'];
  const counts = {};

  for (const table of tables) {
    try {
      const count = await prisma[table].count();
      counts[table] = count;
      console.log(`  ✅ ${table.padEnd(12)} — ${count} records`);
    } catch (err) {
      console.error(`  ❌ ${table.padEnd(12)} — ERROR: ${err.message}`);
    }
  }
  console.log();

  // 4. Test CRUD — Create, Read, Delete a test category
  console.log('[4/4] Testing CRUD (Create → Read → Delete)...');
  let testId = null;
  try {
    // CREATE
    const created = await prisma.category.create({
      data: {
        name: '__test_category_delete_me__',
        iconUrl: 'https://example.com/test.png',
      },
    });
    testId = created.id;
    console.log('  ✅ CREATE — Test category created, id:', testId);

    // READ
    const found = await prisma.category.findUnique({ where: { id: testId } });
    if (found && found.name === '__test_category_delete_me__') {
      console.log('  ✅ READ   — Found the test category');
    } else {
      console.log('  ❌ READ   — Could not find the test category');
    }

    // DELETE
    await prisma.category.delete({ where: { id: testId } });
    console.log('  ✅ DELETE — Test category removed');

    const verify = await prisma.category.findUnique({ where: { id: testId } });
    if (!verify) {
      console.log('  ✅ VERIFY — Confirmed deletion');
    }
  } catch (err) {
    console.error('  ❌ CRUD test FAILED:', err.message);
    // Try to clean up if we created a record
    if (testId) {
      try { await prisma.category.delete({ where: { id: testId } }); } catch (_) {}
    }
  }

  console.log();
  console.log('='.repeat(60));
  console.log('  DATABASE TEST COMPLETE');
  console.log('='.repeat(60));

  await prisma.$disconnect();
}

testSupabase().catch((err) => {
  console.error('Unexpected error:', err);
  process.exit(1);
});
