const { Client } = require('pg');
const dotenv = require('dotenv');

dotenv.config();

const statements = [
  'CREATE TYPE "Role" AS ENUM (\'Admin\', \'Seller\', \'Buyer\')',
  'CREATE TYPE "Condition" AS ENUM (\'New\', \'Used\', \'Refurbished\')',
  'CREATE TYPE "Currency" AS ENUM (\'YER_Sanaa\', \'YER_Aden\', \'USD\', \'SAR\', \'EUR\')',
  'DROP TYPE IF EXISTS "OrderStatus" CASCADE',
  'CREATE TYPE "OrderStatus" AS ENUM (\'Pending\', \'Processing\', \'Shipped\', \'Delivered\', \'Cancelled\')',
  'CREATE TYPE "PaymentMethod" AS ENUM (\'COD\', \'BankTransfer\', \'CreditCard\', \'CashOnDelivery\')',
  
  `CREATE TABLE "User" (
      "id" UUID NOT NULL,
      "fullName" TEXT NOT NULL,
      "phoneNumber" TEXT NOT NULL,
      "email" TEXT NOT NULL,
      "passwordHash" TEXT NOT NULL,
      "role" "Role" NOT NULL DEFAULT 'Buyer',
      "city" TEXT,
      "isVerified" BOOLEAN NOT NULL DEFAULT false,
      "isBlocked" BOOLEAN NOT NULL DEFAULT false,
      "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" TIMESTAMP(3) NOT NULL,
      CONSTRAINT "User_pkey" PRIMARY KEY ("id")
  )`,

  `CREATE TABLE "Category" (
      "id" UUID NOT NULL,
      "name" TEXT NOT NULL,
      "iconUrl" TEXT,
      "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" TIMESTAMP(3) NOT NULL,
      CONSTRAINT "Category_pkey" PRIMARY KEY ("id")
  )`,

  `CREATE TABLE "Product" (
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
      CONSTRAINT "Product_pkey" PRIMARY KEY ("id")
  )`,

  `CREATE TABLE "Order" (
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
  )`,

  `CREATE TABLE "OrderItem" (
      "id" UUID NOT NULL,
      "quantity" INTEGER NOT NULL,
      "unitPrice" DECIMAL(18,2) NOT NULL,
      "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "orderId" UUID NOT NULL,
      "productId" UUID NOT NULL,
      CONSTRAINT "OrderItem_pkey" PRIMARY KEY ("id")
  )`,

  'CREATE UNIQUE INDEX "User_phoneNumber_key" ON "User"("phoneNumber")',
  'CREATE INDEX "User_phoneNumber_idx" ON "User"("phoneNumber")',
  'CREATE INDEX "Category_name_idx" ON "Category"("name")',
  'CREATE INDEX "Product_categoryId_idx" ON "Product"("categoryId")',
  'CREATE INDEX "Product_sellerId_idx" ON "Product"("sellerId")',
  'CREATE INDEX "Product_isHidden_idx" ON "Product"("isHidden")',
  'CREATE INDEX "Order_buyerId_idx" ON "Order"("buyerId")',
  'CREATE INDEX "Order_status_idx" ON "Order"("status")',
  'CREATE INDEX "Order_orderDate_idx" ON "Order"("orderDate")',
  'CREATE INDEX "OrderItem_orderId_idx" ON "OrderItem"("orderId")',
  'CREATE INDEX "OrderItem_productId_idx" ON "OrderItem"("productId")',

  'ALTER TABLE "Product" ADD CONSTRAINT "Product_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "Category"("id") ON DELETE RESTRICT ON UPDATE CASCADE',
  'ALTER TABLE "Product" ADD CONSTRAINT "Product_sellerId_fkey" FOREIGN KEY ("sellerId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE',
  'ALTER TABLE "Order" ADD CONSTRAINT "Order_buyerId_fkey" FOREIGN KEY ("buyerId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE',
  'ALTER TABLE "OrderItem" ADD CONSTRAINT "OrderItem_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE RESTRICT ON UPDATE CASCADE',
  'ALTER TABLE "OrderItem" ADD CONSTRAINT "OrderItem_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE RESTRICT ON UPDATE CASCADE'
];

async function main() {
  const connectionString = process.env.DATABASE_URL;
  const client = new Client({ connectionString, ssl: { rejectUnauthorized: false } });

  try {
    console.log('Connecting to Supabase...');
    await client.connect();
    console.log('Connected! Applying schema...');

    for (const sql of statements) {
      try {
        await client.query(sql);
        console.log(`Executed: ${sql.substring(0, 50)}...`);
      } catch (err) {
        if (err.code === '42P07' || err.code === '42710' || err.code === '23505') {
          console.log(`Already exists: ${sql.substring(0, 50)}...`);
        } else {
          console.error(`Error in: ${sql.substring(0, 100)}...`);
          console.error(err.message);
          // throw err; // Continue on error for enums maybe
        }
      }
    }
    console.log('Done!');
  } catch (error) {
    console.error('Connection error:', error);
  } finally {
    await client.end();
  }
}

main();
