-- AlterEnum
CREATE TYPE "CouponDiscountType" AS ENUM ('Percent', 'Amount');

-- AlterTable Coupon: support fixed-amount discounts alongside percent
ALTER TABLE "Coupon" ADD COLUMN "discountType" "CouponDiscountType" NOT NULL DEFAULT 'Percent';
ALTER TABLE "Coupon" ADD COLUMN "discountFixedAmount" DECIMAL(18,2);

ALTER TABLE "Coupon" ALTER COLUMN "discountPercent" DROP NOT NULL;

-- AlterTable Order: snapshot discount type at checkout
ALTER TABLE "Order" ADD COLUMN "discountType" "CouponDiscountType";
