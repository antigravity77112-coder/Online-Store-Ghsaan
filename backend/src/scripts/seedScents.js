/**
 * Seed initial fragrance families (scents) into the database.
 * Run: node src/scripts/seedScents.js
 *
 * Safe to run multiple times — skips scents whose slug already exists.
 */
const prisma = require('../prismaClient');
const crypto = require('crypto');

const INITIAL_SCENTS = [
  { name: 'عود', slug: 'oud', sortOrder: 1 },
  { name: 'مسك', slug: 'musk', sortOrder: 2 },
  { name: 'ورد', slug: 'rose', sortOrder: 3 },
  { name: 'فانيلا', slug: 'vanilla', sortOrder: 4 },
  { name: 'حمضيات', slug: 'citrus', sortOrder: 5 },
  { name: 'زهري', slug: 'floral', sortOrder: 6 },
  { name: 'خشبي', slug: 'woody', sortOrder: 7 },
  { name: 'عنبر', slug: 'amber', sortOrder: 8 },
  { name: 'منعش', slug: 'fresh', sortOrder: 9 },
  { name: 'توابل', slug: 'spicy', sortOrder: 10 },
  { name: 'شرقي', slug: 'oriental', sortOrder: 11 },
];

async function main() {
  let created = 0;
  let skipped = 0;

  for (const scent of INITIAL_SCENTS) {
    const existing = await prisma.scent.findUnique({ where: { slug: scent.slug } });
    if (existing) {
      skipped += 1;
      continue;
    }

    await prisma.scent.create({
      data: {
        id: crypto.randomUUID(),
        name: scent.name,
        slug: scent.slug,
        sortOrder: scent.sortOrder,
        isActive: true,
      },
    });
    created += 1;
  }

  console.log(`Scents seed complete: ${created} created, ${skipped} skipped (already exist).`);
}

main()
  .catch((err) => {
    console.error('Seed failed:', err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
