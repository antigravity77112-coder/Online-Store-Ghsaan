-- AlterTable
ALTER TABLE "Order" ADD COLUMN IF NOT EXISTS "idempotencyKey" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "Order_buyerId_idempotencyKey_key" ON "Order"("buyerId", "idempotencyKey");
