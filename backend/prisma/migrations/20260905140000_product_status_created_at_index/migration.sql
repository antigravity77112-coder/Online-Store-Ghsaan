-- CreateIndex
CREATE INDEX IF NOT EXISTS "Product_status_createdAt_idx" ON "Product"("status", "createdAt" DESC);
