const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  try {
    const category = await prisma.category.findFirst();
    const seller = await prisma.user.findFirst({ where: { role: 'Seller' } });
    if (!category || !seller) {
      console.log('No category or seller found, skipping creation.');
      return;
    }
    const product = await prisma.product.create({
      data: {
        title: 'Test Product',
        description: 'Test description',
        price: 10,
        discountPrice: 8,
        currency: 'YER_Sanaa',
        condition: 'New',
        stockQuantity: 5,
        categoryId: category.id,
        sellerId: seller.id,
      },
    });
    console.log('Created product with id', product.id);
  } catch (e) {
    console.error('Error', e.message);
  } finally {
    await prisma.$disconnect();
  }
}
main();
