/**
 * One-time backfill after adding ProductCategory + Product.searchText.
 *   node src/scripts/backfillSearchAndCategories.js
 * Safe to re-run.
 */
require('dotenv').config();
const prisma = require('../prismaClient');
const { refreshSearchText } = require('../services/productService');

async function main() {
  const products = await prisma.product.findMany({ select: { id: true, categoryId: true } });

  const links = await prisma.productCategory.createMany({
    data: products.map((p) => ({ productId: p.id, categoryId: p.categoryId })),
    skipDuplicates: true,
  });
  console.log(`ProductCategory: ${links.count} links created`);

  let done = 0;
  for (const p of products) {
    await refreshSearchText(p.id);
    done += 1;
    if (done % 50 === 0) console.log(`searchText: ${done}/${products.length}`);
  }
  console.log(`searchText: ${done}/${products.length} done`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
