/**
 * backfill-category-slugs.js — Reset category slugs to match display names
 *
 * Run with: node backfill-category-slugs.js
 */

require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const { generateUniqueCategorySlug } = require('./src/utils/slugify');

const prisma = new PrismaClient();

async function backfill() {
  console.log('🔍 Updating category slugs to match names...');

  const categories = await prisma.category.findMany({
    select: { id: true, name: true, slug: true },
    orderBy: { sortOrder: 'asc' },
  });

  let updated = 0;
  let skipped = 0;

  for (const category of categories) {
    try {
      const newSlug = await generateUniqueCategorySlug(category.name, prisma, category.id);
      if (newSlug === category.slug) {
        skipped++;
        continue;
      }

      await prisma.category.update({
        where: { id: category.id },
        data: { slug: newSlug },
      });
      console.log(`  ✅ "${category.name}" → ${newSlug}`);
      updated++;
    } catch (err) {
      console.warn(`  ⚠️  Skipped "${category.name}": ${err.message}`);
      skipped++;
    }
  }

  console.log(`\n🎉 Done! Updated: ${updated}, Unchanged: ${skipped}`);
  await prisma.$disconnect();
}

backfill().catch(async (err) => {
  console.error('Fatal error:', err);
  await prisma.$disconnect();
  process.exit(1);
});
