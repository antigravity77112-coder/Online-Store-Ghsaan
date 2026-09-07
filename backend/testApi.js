const axios = require('axios');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function testApi() {
  const products = await prisma.product.findMany();
  let failed = 0;
  for (const p of products) {
    try {
      const res = await axios.get(`https://dhura-store.vercel.app/api/products/${p.id}`);
      if (res.status !== 200) {
        console.log(`Product ${p.id} returned status ${res.status}`);
        failed++;
      }
    } catch (e) {
      console.log(`Product ${p.id} API error:`, e.response ? e.response.status : e.message);
      failed++;
    }
  }
  console.log(`Tested ${products.length} products API. Failed: ${failed}`);
}
testApi().finally(() => prisma.$disconnect());
