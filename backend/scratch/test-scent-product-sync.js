const prisma = require('../src/prismaClient');
const ProductService = require('../src/services/productService');

async function main() {
  const service = new ProductService();
  const product = await prisma.product.findFirst({ select: { id: true, title: true } });
  const scents = await prisma.scent.findMany({ take: 2, select: { id: true, name: true } });

  if (!product || scents.length < 2) {
    console.log('Skip: need product and scents');
    return;
  }

  console.log('Updating product', product.title, 'with scents', scents.map((s) => s.name));

  const updated = await service.updateProduct(product.id, {
    id: product.id,
    scentIds: scents.map((s) => s.id),
  });

  console.log('Updated scents:', updated.scents);

  const links = await prisma.productScent.findMany({ where: { productId: product.id } });
  console.log('Junction rows:', links.length, '(expected', scents.length, ')');

  // Remove one scent
  const updated2 = await service.updateProduct(product.id, {
    id: product.id,
    scentIds: [scents[0].id],
  });
  console.log('After remove:', updated2.scents?.map((s) => s.name));

  const links2 = await prisma.productScent.findMany({ where: { productId: product.id } });
  console.log('Junction rows after remove:', links2.length, '(expected 1)');

  // Restore empty
  await service.updateProduct(product.id, { id: product.id, scentIds: [] });
  console.log('Restored product to no scents');
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
