const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function run() {
  try {
    const res = await prisma.user.findMany();
    console.log('users ok');
    const o = await prisma.order.findMany();
    console.log('orders ok');
    const p = await prisma.product.findMany();
    console.log('products ok');
    const d = { u: res, o, p };
    JSON.stringify(d);
    console.log('stringify ok');
  } catch(e) {
    console.error(e);
  } finally {
    await prisma.$disconnect();
  }
}
run();
