const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  try {
    console.log('Testing connection to Supabase...');
    await prisma.$connect();
    console.log('Successfully connected to Supabase!');
    
    // Check if tables exist
    const usersCount = await prisma.user.count();
    console.log('Users count:', usersCount);
    
    const categoriesCount = await prisma.category.count();
    console.log('Categories count:', categoriesCount);
  } catch (error) {
    console.error('Failed to connect to Supabase:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();
