-- AlterTable
ALTER TABLE "Brand" ADD COLUMN IF NOT EXISTS "isActive" BOOLEAN NOT NULL DEFAULT true;

-- CreateIndex
CREATE INDEX IF NOT EXISTS "Brand_isActive_idx" ON "Brand"("isActive");
