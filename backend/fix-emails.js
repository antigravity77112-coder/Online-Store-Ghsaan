const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const users = await prisma.user.findMany();
  console.log(`Found ${users.length} users. Fixing emails...`);
  let i = 0;
  for (const user of users) {
    try {
      await prisma.user.update({
        where: { id: user.id },
        data: { email: `user_${user.id.substring(0,8)}_${i++}@example.com` }
      });
    } catch(err) {
      console.error(`Failed to update user ${user.id}:`, err);
    }
  }
  console.log('Finished updating emails.');
}

main().catch(console.error).finally(() => prisma.$disconnect());
