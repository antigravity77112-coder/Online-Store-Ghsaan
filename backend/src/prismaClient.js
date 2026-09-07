const { PrismaClient } = require('@prisma/client');

// Singleton to avoid exhausting DB connections in serverless (Vercel).
// In dev, we attach to globalThis so hot-reloads don't spawn new clients.
const globalForPrisma = globalThis;

const prisma = globalForPrisma.__prisma || new PrismaClient({
  log: ['error', 'warn'],
  datasources: {
    db: {
      // Supabase pooler requires connection_limit=1 and pgbouncer=true
      url: (() => {
        const url = process.env.DATABASE_URL || '';
        if (url && !url.includes('connection_limit')) {
          const sep = url.includes('?') ? '&' : '?';
          return `${url}${sep}connection_limit=1&pool_timeout=10`;
        }
        return url;
      })(),
    },
  },
});

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.__prisma = prisma;
}

// Gracefully disconnect on shutdown so connections are released cleanly
process.on('beforeExit', async () => {
  await prisma.$disconnect();
});

module.exports = prisma;