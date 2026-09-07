-- Legacy marketplace column; catalog is single-store and Prisma schema no longer models sellerId.
ALTER TABLE "Product" DROP CONSTRAINT IF EXISTS "Product_sellerId_fkey";
DROP INDEX IF EXISTS "Product_sellerId_createdAt_idx";
DROP INDEX IF EXISTS "Product_sellerId_idx";
ALTER TABLE "Product" DROP COLUMN IF EXISTS "sellerId";
