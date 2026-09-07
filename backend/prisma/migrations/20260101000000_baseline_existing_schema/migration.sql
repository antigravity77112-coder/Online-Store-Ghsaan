-- CreateEnum
CREATE TYPE "BannerPlacement" AS ENUM ('promo_home', 'announcement', 'category', 'product', 'sidebar', 'footer', 'popup', 'hero');

-- CreateEnum
CREATE TYPE "BannerStatus" AS ENUM ('active', 'draft', 'scheduled', 'archived');

-- CreateEnum
CREATE TYPE "Condition" AS ENUM ('New', 'Used', 'Refurbished');

-- CreateEnum
CREATE TYPE "Currency" AS ENUM ('YER_Sanaa', 'YER_Aden', 'USD', 'SAR', 'EUR');

-- CreateEnum
CREATE TYPE "OrderStatus" AS ENUM ('Pending', 'Processing', 'Shipped', 'Delivered', 'Cancelled', 'Confirmed');

-- CreateEnum
CREATE TYPE "PaymentMethod" AS ENUM ('COD', 'BankTransfer', 'CreditCard', 'CashOnDelivery');

-- CreateEnum
CREATE TYPE "Role" AS ENUM ('Admin', 'Seller', 'Buyer');

-- CreateTable
CREATE TABLE "AuditLog" (
    "id" UUID NOT NULL,
    "action" TEXT NOT NULL,
    "details" TEXT,
    "ipAddress" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "userId" UUID,

    CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Banner" (
    "id" UUID NOT NULL,
    "title" TEXT NOT NULL,
    "subtitle" TEXT,
    "description" TEXT,
    "ctaText" TEXT,
    "ctaUrl" TEXT,
    "imageUrl" TEXT,
    "mobileImageUrl" TEXT,
    "bgColor" TEXT,
    "textAlign" TEXT NOT NULL DEFAULT 'right',
    "overlayOpacity" INTEGER NOT NULL DEFAULT 30,
    "placement" "BannerPlacement" NOT NULL DEFAULT 'promo_home',
    "status" "BannerStatus" NOT NULL DEFAULT 'draft',
    "showOnDesktop" BOOLEAN NOT NULL DEFAULT true,
    "showOnMobile" BOOLEAN NOT NULL DEFAULT true,
    "priority" INTEGER NOT NULL DEFAULT 0,
    "scheduledAt" TIMESTAMP(3),
    "expiresAt" TIMESTAMP(3),
    "impressions" INTEGER NOT NULL DEFAULT 0,
    "clicks" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Banner_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Branch" (
    "id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "address" TEXT NOT NULL,
    "city" TEXT NOT NULL,
    "latitude" DOUBLE PRECISION,
    "longitude" DOUBLE PRECISION,
    "phone" TEXT,
    "whatsapp" TEXT,
    "workingHours" TEXT,
    "mapUrl" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Branch_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CartItem" (
    "id" UUID NOT NULL,
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "userId" UUID NOT NULL,
    "productId" UUID NOT NULL,

    CONSTRAINT "CartItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Category" (
    "id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "iconUrl" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Category_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Favorite" (
    "id" UUID NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "userId" UUID NOT NULL,
    "productId" UUID NOT NULL,

    CONSTRAINT "Favorite_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Order" (
    "id" UUID NOT NULL,
    "totalAmount" DECIMAL(18,2) NOT NULL,
    "currency" "Currency" NOT NULL DEFAULT 'YER_Sanaa',
    "status" "OrderStatus" NOT NULL DEFAULT 'Pending',
    "shippingAddress" TEXT NOT NULL,
    "paymentMethod" "PaymentMethod" NOT NULL DEFAULT 'COD',
    "orderDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "buyerId" UUID NOT NULL,

    CONSTRAINT "Order_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OrderItem" (
    "id" UUID NOT NULL,
    "quantity" INTEGER NOT NULL,
    "unitPrice" DECIMAL(18,2) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "orderId" UUID NOT NULL,
    "productId" UUID NOT NULL,

    CONSTRAINT "OrderItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Product" (
    "id" UUID NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "price" DECIMAL(18,2) NOT NULL,
    "currency" "Currency" NOT NULL DEFAULT 'YER_Sanaa',
    "condition" "Condition" NOT NULL DEFAULT 'New',
    "stockQuantity" INTEGER NOT NULL,
    "mainImageUrl" TEXT,
    "isHidden" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "categoryId" UUID NOT NULL,
    "sellerId" UUID NOT NULL,
    "discountPrice" DECIMAL(18,2),
    "isPromoted" BOOLEAN NOT NULL DEFAULT false,
    "promotionLabel" TEXT,
    "slug" TEXT NOT NULL,

    CONSTRAINT "Product_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RateLimit" (
    "key" TEXT NOT NULL,
    "hits" INTEGER NOT NULL DEFAULT 0,
    "resetTime" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RateLimit_pkey" PRIMARY KEY ("key")
);

-- CreateTable
CREATE TABLE "RefreshToken" (
    "id" UUID NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "userId" UUID NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "revokedAt" TIMESTAMP(3),
    "replacedBy" UUID,
    "userAgent" TEXT,
    "ipAddress" TEXT,

    CONSTRAINT "RefreshToken_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SystemSetting" (
    "id" TEXT NOT NULL DEFAULT 'global',
    "aboutUsText" TEXT NOT NULL DEFAULT '╪│┘ê┘é ╪ح┘┘â╪ز╪▒┘ê┘┘è ┘è┘à┘┘è ┘è┘ê┘╪▒ ╪ث┘╪╢┘ ╪د┘┘à┘╪ز╪ش╪د╪ز...',
    "contactEmail" TEXT NOT NULL DEFAULT 'info@al-gaadi.com',
    "contactPhone" TEXT NOT NULL DEFAULT '+967 77X XXX XXX',
    "shippingOfferText" TEXT NOT NULL DEFAULT '╪┤╪ص┘ ┘à╪ش╪د┘┘è ┘┘╪╖┘╪ذ╪د╪ز ┘┘ê┘é 50$',
    "facebookUrl" TEXT,
    "twitterUrl" TEXT,
    "whatsappUrl" TEXT,
    "instagramUrl" TEXT,
    "seoTitle" TEXT,
    "seoDescription" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "tiktokUrl" TEXT,

    CONSTRAINT "SystemSetting_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "User" (
    "id" UUID NOT NULL,
    "fullName" TEXT NOT NULL,
    "phoneNumber" TEXT,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "role" "Role" NOT NULL DEFAULT 'Buyer',
    "city" TEXT,
    "isVerified" BOOLEAN NOT NULL DEFAULT false,
    "isBlocked" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "AuditLog_action_idx" ON "AuditLog"("action" ASC);

-- CreateIndex
CREATE INDEX "AuditLog_createdAt_idx" ON "AuditLog"("createdAt" DESC);

-- CreateIndex
CREATE INDEX "Banner_placement_status_priority_idx" ON "Banner"("placement" ASC, "status" ASC, "priority" ASC);

-- CreateIndex
CREATE INDEX "Banner_status_scheduledAt_idx" ON "Banner"("status" ASC, "scheduledAt" ASC);

-- CreateIndex
CREATE INDEX "Branch_isActive_sortOrder_idx" ON "Branch"("isActive" ASC, "sortOrder" ASC);

-- CreateIndex
CREATE INDEX "CartItem_userId_idx" ON "CartItem"("userId" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "CartItem_userId_productId_key" ON "CartItem"("userId" ASC, "productId" ASC);

-- CreateIndex
CREATE INDEX "Category_name_idx" ON "Category"("name" ASC);

-- CreateIndex
CREATE INDEX "Favorite_userId_idx" ON "Favorite"("userId" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "Favorite_userId_productId_key" ON "Favorite"("userId" ASC, "productId" ASC);

-- CreateIndex
CREATE INDEX "Order_buyerId_orderDate_idx" ON "Order"("buyerId" ASC, "orderDate" DESC);

-- CreateIndex
CREATE INDEX "Order_status_orderDate_idx" ON "Order"("status" ASC, "orderDate" DESC);

-- CreateIndex
CREATE INDEX "OrderItem_orderId_idx" ON "OrderItem"("orderId" ASC);

-- CreateIndex
CREATE INDEX "OrderItem_productId_idx" ON "OrderItem"("productId" ASC);

-- CreateIndex
CREATE INDEX "Product_categoryId_isHidden_isPromoted_idx" ON "Product"("categoryId" ASC, "isHidden" ASC, "isPromoted" ASC);

-- CreateIndex
CREATE INDEX "Product_discountPrice_idx" ON "Product"("discountPrice" ASC);

-- CreateIndex
CREATE INDEX "Product_isHidden_isPromoted_createdAt_idx" ON "Product"("isHidden" ASC, "isPromoted" ASC, "createdAt" DESC);

-- CreateIndex
CREATE INDEX "Product_sellerId_createdAt_idx" ON "Product"("sellerId" ASC, "createdAt" DESC);

-- CreateIndex
CREATE INDEX "Product_slug_idx" ON "Product"("slug" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "Product_slug_key" ON "Product"("slug" ASC);

-- CreateIndex
CREATE INDEX "RefreshToken_expiresAt_idx" ON "RefreshToken"("expiresAt" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "RefreshToken_tokenHash_key" ON "RefreshToken"("tokenHash" ASC);

-- CreateIndex
CREATE INDEX "RefreshToken_userId_idx" ON "RefreshToken"("userId" ASC);

-- CreateIndex
CREATE INDEX "User_city_idx" ON "User"("city" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email" ASC);

-- CreateIndex
CREATE INDEX "User_phoneNumber_idx" ON "User"("phoneNumber" ASC);

-- AddForeignKey
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CartItem" ADD CONSTRAINT "CartItem_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CartItem" ADD CONSTRAINT "CartItem_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Favorite" ADD CONSTRAINT "Favorite_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Favorite" ADD CONSTRAINT "Favorite_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Order" ADD CONSTRAINT "Order_buyerId_fkey" FOREIGN KEY ("buyerId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrderItem" ADD CONSTRAINT "OrderItem_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrderItem" ADD CONSTRAINT "OrderItem_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Product" ADD CONSTRAINT "Product_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "Category"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Product" ADD CONSTRAINT "Product_sellerId_fkey" FOREIGN KEY ("sellerId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RefreshToken" ADD CONSTRAINT "RefreshToken_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

