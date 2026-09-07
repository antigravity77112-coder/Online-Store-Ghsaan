/**
 * backfill-category-slugs.js
 *
 * Regenerates Category.slug with Latin transliteration (same as products)
 * so sitemap / storefront URLs are /category/3saf instead of
 * /category/%D8%B9%D8%B3%D8%A7%D9%81 (encoded Arabic) or a UUID.
 *
 * Usage (from backend/):
 *   node src/scripts/backfill-category-slugs.js
 *   node src/scripts/backfill-category-slugs.js --dry-run
 */

const prisma = require('../prismaClient');
const { generateUniqueCategorySlug, slugify } = require('../utils/slugify');

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const dryRun = process.argv.includes('--dry-run');

function needsBackfill(slug, name) {
  const value = String(slug || '').trim();
  if (!value) return true;
  if (UUID_REGEX.test(value)) return true;
  // Raw Arabic (or slug identical to Arabic name) should become Latin
  if (/[\u0600-\u06FF]/.test(value)) return true;
  // Already a good Latin slug — keep unless empty after slugify mismatch intent
  const expected = slugify(name);
  if (expected && value === expected) return false;
  // Keep existing custom Latin slugs (e.g. alaiz-aud)
  if (/^[a-z0-9]+(?:-[a-z0-9]+)*$/i.test(value) && !UUID_REGEX.test(value)) {
    return false;
  }
  return true;
}

async function main() {
  const categories = await prisma.category.findMany({
    select: { id: true, name: true, slug: true },
    orderBy: { createdAt: 'asc' },
  });

  console.log(`${dryRun ? '[DRY RUN] ' : ''}Checking ${categories.length} categories…`);

  let updated = 0;
  let skipped = 0;

  for (const cat of categories) {
    if (!needsBackfill(cat.slug, cat.name)) {
      console.log(`  skip  ${cat.name} → ${cat.slug}`);
      skipped += 1;
      continue;
    }

    const newSlug = await generateUniqueCategorySlug(cat.name, prisma, cat.id);
    console.log(`  ${dryRun ? 'would' : 'update'}  ${cat.name}: "${cat.slug}" → "${newSlug}"`);

    if (!dryRun) {
      await prisma.category.update({
        where: { id: cat.id },
        data: { slug: newSlug },
      });
    }
    updated += 1;
  }

  console.log(`Done. ${updated} updated, ${skipped} kept.`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
