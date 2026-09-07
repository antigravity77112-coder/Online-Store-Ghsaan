const prisma = require('./src/prismaClient');
const zlib = require('zlib');
const fs = require('fs');
const path = require('path');

async function test() {
  try {
    const backupsDir = path.join(__dirname, 'uploads/backups');
    if (!fs.existsSync(backupsDir)) {
      fs.mkdirSync(backupsDir, { recursive: true });
    }
    
    // Fetch current DB state
    const [
      currentUsers, currentCategories, currentProducts, currentOrders,
      currentOrderItems, currentSystemSettings, currentBanners, currentCartItems, currentFavorites
    ] = await Promise.all([
      prisma.user.findMany(), prisma.category.findMany(), prisma.product.findMany(),
      prisma.order.findMany(), prisma.orderItem.findMany(), prisma.systemSetting.findMany(),
      prisma.banner.findMany(), prisma.cartItem.findMany(), prisma.favorite.findMany()
    ]);

    const preRestoreData = {
      metadata: {
        appName: 'Gisaah_Store',
        version: '1.0',
        generatedAt: new Date().toISOString(),
        generatedBy: 'SYSTEM_PRE_RESTORE',
        tablesExported: 9
      },
      data: {
        users: currentUsers, categories: currentCategories, products: currentProducts,
        orders: currentOrders, orderItems: currentOrderItems, systemSettings: currentSystemSettings,
        banners: currentBanners, cartItems: currentCartItems, favorites: currentFavorites
      }
    };

    const preRestoreJson = JSON.stringify(preRestoreData);
    const preRestoreGzip = zlib.gzipSync(preRestoreJson);
    const backupPath = path.join(backupsDir, `pre-restore-${Date.now()}.json.gz`);
    fs.writeFileSync(backupPath, preRestoreGzip);
    console.log('Success pre-restore');
  } catch(e) {
    console.error('FAILED:', e);
  } finally {
    await prisma.$disconnect();
  }
}
test();
