/**
 * backfill-slugs.js — One-time slug backfill for existing products
 *
 * Run with: node backfill-slugs.js
 *
 * For each product without a slug, generates a slug from its title
 * using the same logic as slugify.js. Falls back to UUID if title fails.
 * Products already having a slug are skipped.
 */

require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const { generateUniqueSlug } = require('./src/utils/slugify');

const prisma = new PrismaClient();

async function backfill() {
  console.log('🔍 Finding products without proper slugs...');

  // Find all products — we'll check if slug looks like a UUID (old backfill)
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

  const products = await prisma.product.findMany({
    select: { id: true, title: true, slug: true },
  });

  const needsSlug = products.filter(p => !p.slug || uuidRegex.test(p.slug));
  console.log(`📦 Found ${needsSlug.length} products needing title-based slugs (out of ${products.length} total)`);

  let updated = 0;
  let skipped = 0;

  for (const product of needsSlug) {
    try {
      const newSlug = await generateUniqueSlug(product.title, prisma, product.id);
      await prisma.product.update({
        where: { id: product.id },
        data: { slug: newSlug },
      });
      console.log(`  ✅ "${product.title}" → ${newSlug}`);
      updated++;
    } catch (err) {
      console.warn(`  ⚠️  Skipped "${product.title}": ${err.message}`);
      skipped++;
    }
  }

  console.log(`\n🎉 Done! Updated: ${updated}, Skipped: ${skipped}`);
  await prisma.$disconnect();
}

backfill().catch(async (err) => {
  console.error('Fatal error:', err);
  await prisma.$disconnect();
  process.exit(1);
});
