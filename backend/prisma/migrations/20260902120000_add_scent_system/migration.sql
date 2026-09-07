-- Additive migration: Scent catalog + ProductScent junction (many-to-many).
-- Does NOT modify or delete any existing data.

CREATE TABLE "Scent" (
    "id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "imageUrl" TEXT,
    "description" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Scent_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ProductScent" (
    "productId" UUID NOT NULL,
    "scentId" UUID NOT NULL,

    CONSTRAINT "ProductScent_pkey" PRIMARY KEY ("productId","scentId")
);

CREATE UNIQUE INDEX "Scent_slug_key" ON "Scent"("slug");
CREATE INDEX "Scent_isActive_sortOrder_idx" ON "Scent"("isActive", "sortOrder");
CREATE INDEX "Scent_name_idx" ON "Scent"("name");
CREATE INDEX "ProductScent_scentId_idx" ON "ProductScent"("scentId");

ALTER TABLE "ProductScent" ADD CONSTRAINT "ProductScent_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ProductScent" ADD CONSTRAINT "ProductScent_scentId_fkey" FOREIGN KEY ("scentId") REFERENCES "Scent"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
