const { PrismaClient } = require('@prisma/client');
const fs = require('fs');
const prisma = new PrismaClient();

async function main() {
  try {
    const sql = fs.readFileSync('schema_fixed.sql', 'utf8');
    console.log('Executing schema SQL...');
    
    // Split SQL by semicolor and filter out empty lines
    // Note: This is a simple split, might need more care for complex SQL
    // but for this generated script it should be fine as it doesn't have 
    // nested semicolons in strings usually.
    // Actually Prisma supports $executeRawUnsafe for the whole string if it's one transaction
    // but PostgreSQL doesn't always like multiple statements in one call depending on driver.
    // We'll try $executeRawUnsafe first.
    
    await prisma.$executeRawUnsafe(sql);
    console.log('Successfully executed schema SQL!');
  } catch (error) {
    console.error('Failed to execute SQL:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();
