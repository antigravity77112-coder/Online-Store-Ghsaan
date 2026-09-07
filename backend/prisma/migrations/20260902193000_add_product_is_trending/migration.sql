-- Add manual trending flag for merchandising (Phase 1)
ALTER TABLE "Product" ADD COLUMN "isTrending" BOOLEAN NOT NULL DEFAULT false;

CREATE INDEX "Product_status_isTrending_createdAt_idx" ON "Product"("status", "isTrending", "createdAt" DESC);
