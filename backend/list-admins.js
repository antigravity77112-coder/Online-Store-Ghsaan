const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const admins = await prisma.user.findMany({
    where: { role: 'Admin' }
  });
  console.log('Admins found:', admins.length);
  admins.forEach(admin => {
    console.log(`Email: ${admin.email}, Role: ${admin.role}`);
  });
}

main()
  .catch(e => console.error(e))
  .finally(() => prisma.$disconnect());
