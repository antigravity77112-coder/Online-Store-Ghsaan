const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  try {
    const cols = await prisma.$queryRawUnsafe(`SELECT column_name FROM information_schema.columns WHERE table_name = 'Product'`);
    console.log(cols.map(c => c.column_name));
  } catch (error) {
    console.error('Failed to get columns:', error);
  } finally {
    await prisma.$disconnect();
  }
}

main();
