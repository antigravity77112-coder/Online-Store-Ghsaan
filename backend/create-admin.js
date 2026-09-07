require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

/**
 * Optional: create or reset an admin when ADMIN_EMAIL + ADMIN_PASSWORD are set in .env.
 * If your admin already exists in Supabase, you do not need this script — use TEST_ADMIN_* for tests only.
 */
async function main() {
  const emailInput = process.env.ADMIN_EMAIL;
  const passwordInput = process.env.ADMIN_PASSWORD;
  if (!emailInput || !passwordInput) {
    console.error('Set ADMIN_EMAIL and ADMIN_PASSWORD in .env to create or reset an admin user.');
    process.exit(1);
  }

  const salt = await bcrypt.genSalt(10);
  const passwordHash = await bcrypt.hash(passwordInput, salt);

  try {
    const existing = await prisma.user.findFirst({ where: { email: emailInput } });
    const adminUser = existing
      ? await prisma.user.update({
          where: { id: existing.id },
          data: {
            passwordHash,
            role: 'Admin',
            isVerified: true,
          },
        })
      : await prisma.user.create({
          data: {
            fullName: 'Admin',
            phoneNumber: '000000000',
            email: emailInput,
            passwordHash,
            role: 'Admin',
            isVerified: true,
            city: 'صنعاء',
          },
        });
    console.log('Admin user ready.');
    console.log('Account (Email):', adminUser.email);
    console.log('Role:', adminUser.role);
  } catch (err) {
    console.error('Error creating admin user:', err);
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
