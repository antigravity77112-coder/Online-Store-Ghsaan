const { PrismaClient } = require('@prisma/client');
const Joi = require('joi');
const prisma = new PrismaClient();

const schema = Joi.string().guid();

async function main() {
  const products = await prisma.product.findMany();
  let invalidCount = 0;
  for (const p of products) {
    const { error } = schema.validate(p.id);
    if (error) {
      console.log('Invalid UUID:', p.id, error.message);
      invalidCount++;
    }
  }
  console.log(`Checked ${products.length} products. Invalid count: ${invalidCount}`);
}
main()
  .catch(e => console.error(e))
  .finally(async () => {
    await prisma.$disconnect();
  });
