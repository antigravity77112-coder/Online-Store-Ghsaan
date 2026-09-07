const prisma = require('../src/prismaClient');

async function main() {
  const inactive = await prisma.scent.findFirst({ where: { slug: 'spicy' } });
  if (!inactive) return console.log('no spicy scent');

  await prisma.scent.update({ where: { id: inactive.id }, data: { isActive: false } });

  const activeScents = await prisma.scent.findMany({ where: { isActive: true } });
  console.log('Active scents count:', activeScents.length);

  const all = await prisma.scent.count();
  console.log('Total scents:', all);

  // restore
  await prisma.scent.update({ where: { id: inactive.id }, data: { isActive: true } });
  console.log('Restored spicy to active');
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
