-- Pending manual migrations (apply when migrate deploy is unavailable)
ALTER TABLE "ProductVariant" ADD COLUMN IF NOT EXISTS "imageUrl" TEXT;
ALTER TABLE "CategoryAttribute" ADD COLUMN IF NOT EXISTS "options" TEXT;

-- Legacy marketplace column (not used by current Prisma schema)
ALTER TABLE "Product" DROP CONSTRAINT IF EXISTS "Product_sellerId_fkey";
DROP INDEX IF EXISTS "Product_sellerId_createdAt_idx";
DROP INDEX IF EXISTS "Product_sellerId_idx";
ALTER TABLE "Product" DROP COLUMN IF EXISTS "sellerId";
