-- CreateEnum
CREATE TYPE "CouponAdminStatus" AS ENUM ('Draft', 'Active', 'Disabled');

-- CreateTable
CREATE TABLE "Coupon" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "name" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "discountPercent" INTEGER NOT NULL,
    "validityDays" INTEGER NOT NULL,
    "usageLimit" INTEGER NOT NULL DEFAULT 1,
    "usageCount" INTEGER NOT NULL DEFAULT 0,
    "adminStatus" "CouponAdminStatus" NOT NULL DEFAULT 'Draft',
    "activatedAt" TIMESTAMP(3),
    "expiresAt" TIMESTAMP(3),
    "internalNotes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Coupon_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CouponRedemption" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "couponId" UUID NOT NULL,
    "orderId" UUID NOT NULL,
    "discountAmount" DECIMAL(18,2) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CouponRedemption_pkey" PRIMARY KEY ("id")
);

-- AlterTable Order — coupon snapshot fields
ALTER TABLE "Order" ADD COLUMN IF NOT EXISTS "couponId" UUID;
ALTER TABLE "Order" ADD COLUMN IF NOT EXISTS "couponCode" TEXT;
ALTER TABLE "Order" ADD COLUMN IF NOT EXISTS "discountPercent" INTEGER;
ALTER TABLE "Order" ADD COLUMN IF NOT EXISTS "discountAmount" DECIMAL(18,2);
ALTER TABLE "Order" ADD COLUMN IF NOT EXISTS "subtotalBeforeDiscount" DECIMAL(18,2);

-- Indexes
CREATE UNIQUE INDEX "Coupon_code_key" ON "Coupon"("code");
CREATE INDEX "Coupon_adminStatus_expiresAt_idx" ON "Coupon"("adminStatus", "expiresAt");
CREATE INDEX "Coupon_code_idx" ON "Coupon"("code");
CREATE UNIQUE INDEX "CouponRedemption_orderId_key" ON "CouponRedemption"("orderId");
CREATE INDEX "CouponRedemption_couponId_idx" ON "CouponRedemption"("couponId");
CREATE INDEX "Order_couponId_idx" ON "Order"("couponId");

-- ForeignKeys
ALTER TABLE "CouponRedemption" ADD CONSTRAINT "CouponRedemption_couponId_fkey" FOREIGN KEY ("couponId") REFERENCES "Coupon"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CouponRedemption" ADD CONSTRAINT "CouponRedemption_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Order" ADD CONSTRAINT "Order_couponId_fkey" FOREIGN KEY ("couponId") REFERENCES "Coupon"("id") ON DELETE SET NULL ON UPDATE CASCADE;
