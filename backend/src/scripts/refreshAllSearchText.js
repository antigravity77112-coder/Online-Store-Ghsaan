/**
 * Rebuild Product.searchText for all products (safe; does not touch keywords/descriptions).
 *   node src/scripts/refreshAllSearchText.js
 */
require('dotenv').config();
const prisma = require('../prismaClient');
const { refreshSearchText } = require('../services/productService');

async function withRetry(fn, attempts = 3) {
  let lastErr;
  for (let i = 0; i < attempts; i += 1) {
    try {
      return await fn();
    } catch (err) {
      lastErr = err;
      console.warn(`retry ${i + 1}/${attempts}:`, err.message);
      await new Promise((r) => setTimeout(r, 1500 * (i + 1)));
    }
  }
  throw lastErr;
}

async function main() {
  const products = await prisma.product.findMany({ select: { id: true } });
  let done = 0;
  for (const p of products) {
    await withRetry(() => refreshSearchText(p.id));
    done += 1;
    if (done % 25 === 0 || done === products.length) {
      console.log(`searchText: ${done}/${products.length}`);
    }
  }
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
