const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkImages() {
  const products = await prisma.product.findMany({
    where: { mainImageUrl: { not: null } },
    include: { images: true }
  });

  let missing = 0;
  for (const p of products) {
    if (p.images.length === 0) {
      missing++;
      console.log(`Product ${p.id} missing image (had mainImageUrl: ${p.mainImageUrl})`);
      
      // Auto-fix
      await prisma.productImage.create({
        data: {
          productId: p.id,
          url: p.mainImageUrl,
          isPrimary: true,
          sortOrder: 0
        }
      });
      console.log(`Auto-fixed Product ${p.id}`);
    }
  }
  console.log(`Total missing: ${missing}`);
  prisma.$disconnect();
}
checkImages();
