const { PrismaClient } = require('@prisma/client');

// Singleton to avoid exhausting DB connections in serverless (Vercel).
// Attach to globalThis in all environments so hot-reloads / warm lambdas reuse one client.
const globalForPrisma = globalThis;

/** Vercel / Lambda: keep a single pooled connection per instance. Local API: allow concurrent queries. */
function isServerlessRuntime() {
  return Boolean(process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME);
}

function appendQueryParam(url, key, value) {
  if (!url || url.includes(`${key}=`)) return url;
  const sep = url.includes('?') ? '&' : '?';
  return `${url}${sep}${key}=${value}`;
}

/**
 * Normalize DATABASE_URL for Prisma + Supabase pooler.
 * - Transaction pooler (6543): ensure pgbouncer=true
 * - Defaults: serverless connection_limit=1; local Node API connection_limit=10
 * - Explicit URL params always win (not overwritten)
 */
function resolveDatabaseUrl(rawUrl) {
  if (!rawUrl) return rawUrl;

  let url = rawUrl;
  const usesTransactionPooler =
    /:6543(\/|$|\?)/.test(url) || /[?&]pgbouncer=true/i.test(url);

  if (usesTransactionPooler) {
    url = appendQueryParam(url, 'pgbouncer', 'true');
  }

  const serverless = isServerlessRuntime();
  url = appendQueryParam(url, 'connection_limit', serverless ? '1' : '10');
  url = appendQueryParam(url, 'pool_timeout', serverless ? '10' : '30');

  return url;
}

const prisma =
  globalForPrisma.__prisma
  || new PrismaClient({
    log: ['error', 'warn'],
    datasources: {
      db: {
        url: resolveDatabaseUrl(process.env.DATABASE_URL || ''),
      },
    },
  });

globalForPrisma.__prisma = prisma;

// Gracefully disconnect on shutdown so connections are released cleanly
process.on('beforeExit', async () => {
  await prisma.$disconnect();
});

module.exports = prisma;
