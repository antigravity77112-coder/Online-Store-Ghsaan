const prisma = require('../prismaClient');

class PrismaStore {
  constructor(options = {}) {
    this.windowMs = options.windowMs || 15 * 60 * 1000;
  }

  async increment(key) {
    const now = new Date();
    
    try {
      // Find the existing rate limit
      const existing = await prisma.rateLimit.findUnique({ where: { key } });

      if (!existing) {
        // Create a new record
        const resetTime = new Date(now.getTime() + this.windowMs);
        await prisma.rateLimit.create({
          data: {
            key,
            hits: 1,
            resetTime
          }
        });
        return { totalHits: 1, resetTime };
      }

      if (existing.resetTime < now) {
        // Record has expired, reset it
        const resetTime = new Date(now.getTime() + this.windowMs);
        const updated = await prisma.rateLimit.update({
          where: { key },
          data: {
            hits: 1,
            resetTime
          }
        });
        return { totalHits: updated.hits, resetTime: updated.resetTime };
      }

      // Record is still valid, increment hits
      const updated = await prisma.rateLimit.update({
        where: { key },
        data: {
          hits: existing.hits + 1
        }
      });
      return { totalHits: updated.hits, resetTime: updated.resetTime };
    } catch (error) {
      console.error('RateLimit PrismaStore Error:', error);
      // Fallback to allow request on DB failure
      return { totalHits: 0, resetTime: new Date(now.getTime() + this.windowMs) };
    }
  }

  async decrement(key) {
    try {
      const existing = await prisma.rateLimit.findUnique({ where: { key } });
      if (existing && existing.hits > 0) {
        await prisma.rateLimit.update({
          where: { key },
          data: { hits: existing.hits - 1 }
        });
      }
    } catch (error) {
      console.error('RateLimit PrismaStore Error during decrement:', error);
    }
  }

  async resetKey(key) {
    try {
      await prisma.rateLimit.delete({ where: { key } });
    } catch (error) {
      // ignore error if not found
    }
  }
  
  async resetAll() {
    try {
      await prisma.rateLimit.deleteMany();
    } catch (error) {
      console.error('RateLimit PrismaStore Error during resetAll:', error);
    }
  }
}

module.exports = PrismaStore;
