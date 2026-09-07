const prisma = require('../src/prismaClient');

async function main() {
  const scents = await prisma.scent.findMany({
    take: 3,
    orderBy: { sortOrder: 'asc' },
    include: { _count: { select: { products: true } } },
  });
  console.log('Scents sample:', JSON.stringify(scents, null, 2));

  const product = await prisma.product.findFirst({
    include: {
      scents: { include: { scent: { select: { id: true, name: true, slug: true } } } },
    },
  });
  console.log('Product with scents (may be empty):', product ? { id: product.id, title: product.title, scents: product.scents } : null);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
