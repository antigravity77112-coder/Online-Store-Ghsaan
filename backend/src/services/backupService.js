const fs = require('fs');
const path = require('path');
const zlib = require('zlib');
const { Prisma } = require('@prisma/client');
const prisma = require('../prismaClient');
const exchangeRatesService = require('./exchangeRatesService');
const siteConfigService = require('./siteConfigService');

const BACKUP_APP_NAME = 'SmartShoperStore';
/**
 * Current export format.
 * 2.0 — catalog + orders (pre-notifications)
 * 2.1 — + push notification tables
 * 2.2 — + coupons (percent / fixed-amount) + redemptions
 */
const BACKUP_VERSION = '2.2';
const SUPPORTED_BACKUP_VERSIONS = new Set(['2.0', '2.1', '2.2']);
const LEGACY_BACKUP_VERSION = '1.0';

/** Tables required in a v2+ backup payload (excluding sidecar exchangeRates). */
const REQUIRED_TABLES_V2 = [
  'users',
  'brands',
  'scents',
  'categories',
  'categoryAttributes',
  'products',
  'productCategories',
  'productImages',
  'productVariants',
  'variantAttributes',
  'productAttributes',
  'productSpecs',
  'productScents',
  'reviews',
  'branches',
  'systemSettings',
  'banners',
  'orders',
  'orderItems',
  'cartItems',
  'favorites',
  'deviceTokens',
  'notificationPreferences',
  'notifications',
  'notificationCampaigns',
  'notificationDeliveries',
  'coupons',
  'couponRedemptions',
];

/**
 * Missing keys in older exports are treated as [].
 * Includes catalog tables added mid-v2, push-notification tables (v2.1),
 * and coupons / redemptions (v2.2 — also tolerated on 2.0/2.1 restores).
 */
const OPTIONAL_V2_TABLES = new Set([
  'productCategories',
  'productSpecs',
  'deviceTokens',
  'notificationPreferences',
  'notifications',
  'notificationCampaigns',
  'notificationDeliveries',
  'coupons',
  'couponRedemptions',
]);

/** Maps backup restore tx delegate names to Prisma model names. */
const TX_TO_PRISMA_MODEL = {
  user: 'User',
  brand: 'Brand',
  scent: 'Scent',
  category: 'Category',
  categoryAttribute: 'CategoryAttribute',
  branch: 'Branch',
  systemSetting: 'SystemSetting',
  banner: 'Banner',
  product: 'Product',
  productCategory: 'ProductCategory',
  productImage: 'ProductImage',
  productVariant: 'ProductVariant',
  variantAttribute: 'VariantAttribute',
  productAttribute: 'ProductAttribute',
  productSpec: 'ProductSpec',
  productScent: 'ProductScent',
  review: 'Review',
  order: 'Order',
  orderItem: 'OrderItem',
  cartItem: 'CartItem',
  favorite: 'Favorite',
  auditLog: 'AuditLog',
  deviceToken: 'DeviceToken',
  notificationPreference: 'NotificationPreference',
  notification: 'Notification',
  notificationCampaign: 'NotificationCampaign',
  notificationDelivery: 'NotificationDelivery',
  coupon: 'Coupon',
  couponRedemption: 'CouponRedemption',
};

const scalarFieldsCache = new Map();

function getScalarFields(prismaModelName) {
  if (scalarFieldsCache.has(prismaModelName)) {
    return scalarFieldsCache.get(prismaModelName);
  }

  const model = Prisma.dmmf.datamodel.models.find((entry) => entry.name === prismaModelName);
  if (!model) {
    throw new Error(`Unknown Prisma model: ${prismaModelName}`);
  }

  const fields = new Set(
    model.fields
      .filter((field) => field.kind === 'scalar' || field.kind === 'enum')
      .map((field) => field.name),
  );
  scalarFieldsCache.set(prismaModelName, fields);
  return fields;
}

/** Keep only fields the running Prisma client knows about (backup may be from a newer app). */
function sanitizeRowsForModel(txModel, rows) {
  if (!rows?.length) return rows || [];
  const prismaModel = TX_TO_PRISMA_MODEL[txModel];
  if (!prismaModel) return rows;
  const allowed = getScalarFields(prismaModel);
  return rows.map((row) => {
    const out = {};
    for (const [key, value] of Object.entries(row || {})) {
      if (allowed.has(key) && value !== undefined) {
        out[key] = value;
      }
    }
    return out;
  });
}

function toPlain(value) {
  if (value === null || value === undefined) return value;
  if (value instanceof Date) return value.toISOString();
  if (typeof value === 'object' && typeof value.toFixed === 'function') {
    return value.toString();
  }
  if (Array.isArray(value)) return value.map(toPlain);
  if (typeof value === 'object') {
    const out = {};
    for (const [k, v] of Object.entries(value)) {
      out[k] = toPlain(v);
    }
    return out;
  }
  return value;
}

function sortCategoriesParentsFirst(categories) {
  const byId = new Map(categories.map((c) => [c.id, c]));
  const sorted = [];
  const visiting = new Set();
  const visited = new Set();

  function visit(id) {
    if (!id || visited.has(id) || !byId.has(id)) return;
    if (visiting.has(id)) return;
    visiting.add(id);
    const node = byId.get(id);
    if (node.parentId) visit(node.parentId);
    visiting.delete(id);
    visited.add(id);
    sorted.push(node);
  }

  for (const c of categories) visit(c.id);
  return sorted;
}

async function readExchangeRatesForBackup() {
  return exchangeRatesService.getExchangeRates();
}

async function writeExchangeRatesFromBackup(rates) {
  return exchangeRatesService.updateExchangeRates(rates);
}

/**
 * Full store snapshot (Layer 2). Sequential queries for Supabase pooler connection_limit=1.
 * Includes passwordHash for authentic restore — treat the file as a secret.
 */
async function collectBackupData() {
  const users = await prisma.user.findMany();
  const brands = await prisma.brand.findMany();
  const scents = await prisma.scent.findMany();
  const categories = await prisma.category.findMany();
  const categoryAttributes = await prisma.categoryAttribute.findMany();
  const products = await prisma.product.findMany();
  const productCategories = await prisma.productCategory.findMany();
  const productImages = await prisma.productImage.findMany();
  const productVariants = await prisma.productVariant.findMany();
  const variantAttributes = await prisma.variantAttribute.findMany();
  const productAttributes = await prisma.productAttribute.findMany();
  const productSpecs = await prisma.productSpec.findMany();
  const productScents = await prisma.productScent.findMany();
  const reviews = await prisma.review.findMany();
  const branches = await prisma.branch.findMany();
  const systemSettings = await prisma.systemSetting.findMany();
  const banners = await prisma.banner.findMany();
  const orders = await prisma.order.findMany();
  const orderItems = await prisma.orderItem.findMany();
  const cartItems = await prisma.cartItem.findMany();
  const favorites = await prisma.favorite.findMany();
  const deviceTokens = await prisma.deviceToken.findMany();
  const notificationPreferences = await prisma.notificationPreference.findMany();
  const notifications = await prisma.notification.findMany();
  const notificationCampaigns = await prisma.notificationCampaign.findMany();
  const notificationDeliveries = await prisma.notificationDelivery.findMany();
  const coupons = await prisma.coupon.findMany();
  const couponRedemptions = await prisma.couponRedemption.findMany();
  const exchangeRates = await readExchangeRatesForBackup();

  return toPlain({
    users,
    brands,
    scents,
    categories,
    categoryAttributes,
    products,
    productCategories,
    productImages,
    productVariants,
    variantAttributes,
    productAttributes,
    productSpecs,
    productScents,
    reviews,
    branches,
    systemSettings,
    banners,
    coupons,
    orders,
    orderItems,
    couponRedemptions,
    cartItems,
    favorites,
    deviceTokens,
    notificationPreferences,
    notifications,
    notificationCampaigns,
    notificationDeliveries,
    exchangeRates,
  });
}

async function buildBackupPayload(generatedBy = 'Unknown') {
  const data = await collectBackupData();
  return {
    metadata: {
      appName: BACKUP_APP_NAME,
      version: BACKUP_VERSION,
      generatedAt: new Date().toISOString(),
      generatedBy,
      tablesExported: REQUIRED_TABLES_V2.length,
      includesExchangeRates: true,
      note: 'Compressed store snapshot (not encrypted). Keep this file secret — it includes password hashes.',
    },
    data,
  };
}

function gzipJson(payload) {
  return zlib.gzipSync(Buffer.from(JSON.stringify(payload), 'utf8'));
}

function parseBackupBuffer(buffer) {
  let jsonString;
  try {
    jsonString = zlib.gunzipSync(buffer).toString('utf8');
  } catch {
    jsonString = buffer.toString('utf8');
  }
  return JSON.parse(jsonString);
}

function validateBackupPayload(backupPayload, { allowEmpty = false } = {}) {
  const { metadata, data } = backupPayload || {};
  if (!metadata || !data) {
    const err = new Error('هيكل ملف النسخ الاحتياطي غير صالح');
    err.statusCode = 400;
    throw err;
  }
  if (metadata.appName && metadata.appName !== BACKUP_APP_NAME) {
    const err = new Error('هذا الملف لا يخص هذا التطبيق (تطبيق غير متطابق)');
    err.statusCode = 400;
    throw err;
  }
  if (metadata.version === LEGACY_BACKUP_VERSION) {
    const err = new Error(
      'هذه نسخة قديمة (v1.0) ناقصة جداول الكتالوج. صدّر نسخة جديدة v2.2 أو استعد عبر pg_dump.',
    );
    err.statusCode = 400;
    throw err;
  }
  if (!SUPPORTED_BACKUP_VERSIONS.has(metadata.version)) {
    const err = new Error('إصدار ملف النسخ الاحتياطي غير متوافق');
    err.statusCode = 400;
    throw err;
  }
  for (const table of REQUIRED_TABLES_V2) {
    if (!Array.isArray(data[table])) {
      if (OPTIONAL_V2_TABLES.has(table) && data[table] == null) {
        data[table] = [];
        continue;
      }
      const err = new Error(`الجدول المطلوب مفقود أو غير صالح: ${table}`);
      err.statusCode = 400;
      throw err;
    }
  }

  const usersEmpty = !data.users?.length;
  const productsEmpty = !data.products?.length;
  if (!allowEmpty && usersEmpty && productsEmpty) {
    const err = new Error(
      'ملف النسخ الاحتياطي فارغ (لا مستخدمين ولا منتجات). ارفض الاستعادة لتجنب مسح المتجر. للاختبار فقط أضف ?allowEmpty=1',
    );
    err.statusCode = 400;
    throw err;
  }
}

async function writePreRestoreSnapshot(generatedBy = 'SYSTEM_PRE_RESTORE') {
  try {
    const backupsDir = path.join(__dirname, '../../uploads/backups');
    if (!fs.existsSync(backupsDir)) {
      fs.mkdirSync(backupsDir, { recursive: true });
    }
    const payload = await buildBackupPayload(generatedBy);
    const gzip = gzipJson(payload);
    const backupPath = path.join(backupsDir, `pre-restore-${Date.now()}.json.gz`);
    fs.writeFileSync(backupPath, gzip);
    return backupPath;
  } catch (err) {
    console.warn('[backup] Pre-restore snapshot skipped:', err.message);
    return null;
  }
}

async function wipeStoreTables(tx) {
  await tx.notificationDelivery.deleteMany();
  await tx.notification.deleteMany();
  await tx.notificationCampaign.deleteMany();
  await tx.notificationPreference.deleteMany();
  await tx.deviceToken.deleteMany();
  await tx.couponRedemption.deleteMany();
  await tx.orderItem.deleteMany();
  await tx.cartItem.deleteMany();
  await tx.favorite.deleteMany();
  await tx.review.deleteMany();
  await tx.productScent.deleteMany();
  await tx.variantAttribute.deleteMany();
  await tx.productAttribute.deleteMany();
  await tx.productSpec.deleteMany();
  await tx.productCategory.deleteMany();
  await tx.productImage.deleteMany();
  await tx.productVariant.deleteMany();
  await tx.order.deleteMany();
  await tx.coupon.deleteMany();
  await tx.product.deleteMany();
  await tx.categoryAttribute.deleteMany();
  await tx.banner.deleteMany();
  await tx.refreshToken.deleteMany();
  await tx.rateLimit.deleteMany();
  await tx.auditLog.deleteMany();
  await tx.user.deleteMany();
  await tx.category.deleteMany();
  await tx.brand.deleteMany();
  await tx.scent.deleteMany();
  await tx.branch.deleteMany();
  await tx.systemSetting.deleteMany();
}

async function insertMany(tx, model, rows) {
  const sanitized = sanitizeRowsForModel(model, rows);
  if (!sanitized?.length) return;
  const chunkSize = 500;
  for (let i = 0; i < sanitized.length; i += chunkSize) {
    await tx[model].createMany({ data: sanitized.slice(i, i + chunkSize) });
  }
}

/**
 * Product.sellerId was removed from the Prisma schema (single-store catalog) but older
 * databases still require it on insert. Drop the legacy column before product restore.
 */
async function dropLegacyProductSellerIdIfPresent(tx) {
  const [{ exists }] = await tx.$queryRaw`
    SELECT EXISTS (
      SELECT 1
      FROM information_schema.columns
      WHERE table_schema = 'public'
        AND table_name = 'Product'
        AND column_name = 'sellerId'
    ) AS "exists"
  `;

  if (!exists) return;

  await tx.$executeRawUnsafe(`
    ALTER TABLE "Product" DROP CONSTRAINT IF EXISTS "Product_sellerId_fkey";
    DROP INDEX IF EXISTS "Product_sellerId_createdAt_idx";
    DROP INDEX IF EXISTS "Product_sellerId_idx";
    ALTER TABLE "Product" DROP COLUMN IF EXISTS "sellerId";
  `);
}

/** Create Postgres enum if missing (safe to re-run). */
async function ensureEnumType(tx, typeName, valuesSql) {
  await tx.$executeRawUnsafe(`
    DO $$ BEGIN
      CREATE TYPE "${typeName}" AS ENUM (${valuesSql});
    EXCEPTION
      WHEN duplicate_object THEN NULL;
    END $$;
  `);
}

/**
 * Ensure coupon enums/tables/columns exist before wipe+restore.
 * Covers DBs that never ran the coupon migrations, and upgrades
 * early Coupon rows that only had discountPercent.
 */
async function ensureCouponSchema(tx) {
  await ensureEnumType(tx, 'CouponAdminStatus', "'Draft', 'Active', 'Disabled'");
  await ensureEnumType(tx, 'CouponDiscountType', "'Percent', 'Amount'");

  await tx.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS "Coupon" (
      "id" UUID NOT NULL DEFAULT gen_random_uuid(),
      "name" TEXT NOT NULL,
      "code" TEXT NOT NULL,
      "discountType" "CouponDiscountType" NOT NULL DEFAULT 'Percent',
      "discountPercent" INTEGER,
      "discountFixedAmount" DECIMAL(18,2),
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
  `);

  await tx.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS "CouponRedemption" (
      "id" UUID NOT NULL DEFAULT gen_random_uuid(),
      "couponId" UUID NOT NULL,
      "orderId" UUID NOT NULL,
      "discountAmount" DECIMAL(18,2) NOT NULL,
      "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT "CouponRedemption_pkey" PRIMARY KEY ("id")
    );
  `);

  await tx.$executeRawUnsafe(`CREATE UNIQUE INDEX IF NOT EXISTS "Coupon_code_key" ON "Coupon"("code")`);
  await tx.$executeRawUnsafe(
    `CREATE INDEX IF NOT EXISTS "Coupon_adminStatus_expiresAt_idx" ON "Coupon"("adminStatus", "expiresAt")`,
  );
  await tx.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "Coupon_code_idx" ON "Coupon"("code")`);
  await tx.$executeRawUnsafe(
    `CREATE UNIQUE INDEX IF NOT EXISTS "CouponRedemption_orderId_key" ON "CouponRedemption"("orderId")`,
  );
  await tx.$executeRawUnsafe(
    `CREATE INDEX IF NOT EXISTS "CouponRedemption_couponId_idx" ON "CouponRedemption"("couponId")`,
  );
  await tx.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "Order_couponId_idx" ON "Order"("couponId")`);

  // Upgrade Coupon rows created before fixed-amount support.
  await tx.$executeRawUnsafe(`
    ALTER TABLE "Coupon" ADD COLUMN IF NOT EXISTS "discountType" "CouponDiscountType" NOT NULL DEFAULT 'Percent'
  `);
  await tx.$executeRawUnsafe(`
    ALTER TABLE "Coupon" ADD COLUMN IF NOT EXISTS "discountFixedAmount" DECIMAL(18,2)
  `);
  // Percent may be null for Amount coupons; ignore if already nullable.
  await tx.$executeRawUnsafe(`
    DO $$ BEGIN
      ALTER TABLE "Coupon" ALTER COLUMN "discountPercent" DROP NOT NULL;
    EXCEPTION
      WHEN others THEN NULL;
    END $$;
  `);

  // Order coupon snapshot columns (incl. discountType enum).
  await tx.$executeRawUnsafe(`ALTER TABLE "Order" ADD COLUMN IF NOT EXISTS "couponId" UUID`);
  await tx.$executeRawUnsafe(`ALTER TABLE "Order" ADD COLUMN IF NOT EXISTS "couponCode" TEXT`);
  await tx.$executeRawUnsafe(
    `ALTER TABLE "Order" ADD COLUMN IF NOT EXISTS "discountType" "CouponDiscountType"`,
  );
  await tx.$executeRawUnsafe(`ALTER TABLE "Order" ADD COLUMN IF NOT EXISTS "discountPercent" INTEGER`);
  await tx.$executeRawUnsafe(
    `ALTER TABLE "Order" ADD COLUMN IF NOT EXISTS "discountAmount" DECIMAL(18,2)`,
  );
  await tx.$executeRawUnsafe(
    `ALTER TABLE "Order" ADD COLUMN IF NOT EXISTS "subtotalBeforeDiscount" DECIMAL(18,2)`,
  );

  // FKs — ignore if already present.
  await tx.$executeRawUnsafe(`
    DO $$ BEGIN
      ALTER TABLE "CouponRedemption"
        ADD CONSTRAINT "CouponRedemption_couponId_fkey"
        FOREIGN KEY ("couponId") REFERENCES "Coupon"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    EXCEPTION WHEN duplicate_object THEN NULL;
    END $$;
  `);
  await tx.$executeRawUnsafe(`
    DO $$ BEGIN
      ALTER TABLE "CouponRedemption"
        ADD CONSTRAINT "CouponRedemption_orderId_fkey"
        FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    EXCEPTION WHEN duplicate_object THEN NULL;
    END $$;
  `);
  await tx.$executeRawUnsafe(`
    DO $$ BEGIN
      ALTER TABLE "Order"
        ADD CONSTRAINT "Order_couponId_fkey"
        FOREIGN KEY ("couponId") REFERENCES "Coupon"("id") ON DELETE SET NULL ON UPDATE CASCADE;
    EXCEPTION WHEN duplicate_object THEN NULL;
    END $$;
  `);
}

/**
 * Add newer catalog / settings columns when the DB was created from older migrations.
 * Safe to run on every restore; uses IF NOT EXISTS.
 */
async function ensureOptionalRestoreColumns(tx) {
  await ensureCouponSchema(tx);

  const optionalColumns = [
    { table: 'CategoryAttribute', column: 'options', ddl: 'TEXT' },
    { table: 'ProductVariant', column: 'imageUrl', ddl: 'TEXT' },
    { table: 'Product', column: 'isTrending', ddl: 'BOOLEAN NOT NULL DEFAULT false' },
    { table: 'Product', column: 'showStock', ddl: 'BOOLEAN NOT NULL DEFAULT true' },
    { table: 'Product', column: 'searchKeywords', ddl: 'TEXT' },
    { table: 'Product', column: 'searchText', ddl: 'TEXT' },
    { table: 'Banner', column: 'peekProductIds', ddl: 'JSONB' },
    { table: 'Banner', column: 'textColor', ddl: 'TEXT' },
    { table: 'Banner', column: 'scrollSpeed', ddl: 'INTEGER NOT NULL DEFAULT 40' },
    { table: 'Brand', column: 'isActive', ddl: 'BOOLEAN NOT NULL DEFAULT true' },
    { table: 'Order', column: 'idempotencyKey', ddl: 'TEXT' },
    { table: 'SystemSetting', column: 'telegramUrl', ddl: 'TEXT' },
    { table: 'SystemSetting', column: 'linkedinUrl', ddl: 'TEXT' },
    { table: 'SystemSetting', column: 'threadsUrl', ddl: 'TEXT' },
    { table: 'SystemSetting', column: 'privacyPolicyText', ddl: 'TEXT' },
    { table: 'SystemSetting', column: 'exchangeRates', ddl: 'JSONB' },
    { table: 'SystemSetting', column: 'whatsappContacts', ddl: 'JSONB' },
  ];

  for (const { table, column, ddl } of optionalColumns) {
    const [{ exists }] = await tx.$queryRaw`
      SELECT EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name = ${table}
          AND column_name = ${column}
      ) AS "exists"
    `;

    if (!exists) {
      await tx.$executeRawUnsafe(
        `ALTER TABLE "${table}" ADD COLUMN IF NOT EXISTS "${column}" ${ddl}`,
      );
    }
  }
}

/** Normalize coupon rows from older backups (percent-only) for current schema. */
function normalizeCouponRows(rows) {
  return (rows || []).map((row) => {
    const discountType = row.discountType === 'Amount' ? 'Amount' : 'Percent';
    if (discountType === 'Amount') {
      return {
        ...row,
        discountType,
        discountFixedAmount: row.discountFixedAmount != null ? row.discountFixedAmount : null,
        discountPercent: row.discountPercent != null ? row.discountPercent : null,
      };
    }
    return {
      ...row,
      discountType: 'Percent',
      discountPercent: row.discountPercent != null ? row.discountPercent : 1,
      discountFixedAmount: null,
    };
  });
}

/**
 * WARNING: Destructive. Wipes listed store tables then reloads from backup.
 * Never run against production unless you intend a full replace.
 */
async function restoreFromPayload(
  backupPayload,
  { adminUserId = null, ipAddress = null, allowEmpty = false } = {},
) {
  validateBackupPayload(backupPayload, { allowEmpty });
  const { data } = backupPayload;

  await writePreRestoreSnapshot();

  const existingAuditLogs = await prisma.auditLog.findMany();
  const categories = sortCategoriesParentsFirst(data.categories || []);

  await prisma.$transaction(
    async (tx) => {
      // Coupon tables/enums must exist before wipe (deleteMany) and reload.
      await ensureCouponSchema(tx);
      await wipeStoreTables(tx);
      await ensureOptionalRestoreColumns(tx);
      await dropLegacyProductSellerIdIfPresent(tx);

      await insertMany(tx, 'user', data.users);
      await insertMany(tx, 'brand', data.brands);
      await insertMany(tx, 'scent', data.scents);
      await insertMany(tx, 'category', categories);
      await insertMany(tx, 'categoryAttribute', data.categoryAttributes);
      await insertMany(tx, 'branch', data.branches);
      await insertMany(tx, 'systemSetting', data.systemSettings);
      await insertMany(tx, 'banner', data.banners);
      const coupons = normalizeCouponRows(data.coupons);
      const validCouponIds = new Set(coupons.map((c) => c.id));
      await insertMany(tx, 'coupon', coupons);
      await insertMany(tx, 'product', data.products);
      await insertMany(tx, 'productCategory', data.productCategories);
      await insertMany(tx, 'productImage', data.productImages);
      await insertMany(tx, 'productVariant', data.productVariants);
      await insertMany(tx, 'variantAttribute', data.variantAttributes);
      await insertMany(tx, 'productAttribute', data.productAttributes);
      await insertMany(tx, 'productSpec', data.productSpecs);
      await insertMany(tx, 'productScent', data.productScents);
      await insertMany(tx, 'review', data.reviews);
      // Drop dangling coupon FKs (e.g. older backups missing coupons, or filtered rows).
      const orders = (data.orders || []).map((row) => ({
        ...row,
        couponId: row.couponId && validCouponIds.has(row.couponId) ? row.couponId : null,
        discountType:
          row.discountType === 'Amount' || row.discountType === 'Percent'
            ? row.discountType
            : null,
      }));
      await insertMany(tx, 'order', orders);
      await insertMany(tx, 'orderItem', data.orderItems);
      const validOrderIds = new Set(orders.map((o) => o.id));
      await insertMany(
        tx,
        'couponRedemption',
        (data.couponRedemptions || []).filter(
          (row) => validOrderIds.has(row.orderId) && validCouponIds.has(row.couponId),
        ),
      );
      await insertMany(tx, 'cartItem', data.cartItems);
      await insertMany(tx, 'favorite', data.favorites);

      const validUserIds = new Set((data.users || []).map((u) => u.id));

      // Push notifications — only rows whose user/token FKs exist in this restore.
      const deviceTokens = (data.deviceTokens || []).filter((row) => validUserIds.has(row.userId));
      const validDeviceTokenIds = new Set(deviceTokens.map((row) => row.id));
      await insertMany(tx, 'deviceToken', deviceTokens);
      await insertMany(
        tx,
        'notificationPreference',
        (data.notificationPreferences || []).filter((row) => validUserIds.has(row.userId)),
      );
      const notifications = (data.notifications || []).filter((row) => validUserIds.has(row.userId));
      const validNotificationIds = new Set(notifications.map((row) => row.id));
      await insertMany(tx, 'notification', notifications);
      await insertMany(
        tx,
        'notificationCampaign',
        (data.notificationCampaigns || []).filter((row) => validUserIds.has(row.createdById)),
      );
      await insertMany(
        tx,
        'notificationDelivery',
        (data.notificationDeliveries || []).filter(
          (row) =>
            validNotificationIds.has(row.notificationId)
            && validDeviceTokenIds.has(row.deviceTokenId),
        ),
      );

      if (existingAuditLogs.length > 0) {
        const adjustedLogs = existingAuditLogs.map((log) => ({
          ...toPlain(log),
          userId: log.userId && validUserIds.has(log.userId) ? log.userId : null,
        }));
        await insertMany(tx, 'auditLog', adjustedLogs);
      }

      // adminUserId is the live session user — often missing from the backup after wipe.
      // Only attach a userId that exists in the restored User rows (FK AuditLog_userId_fkey).
      let restoreActorId = null;
      if (adminUserId && validUserIds.has(adminUserId)) {
        restoreActorId = adminUserId;
      } else {
        const adminFromBackup = (data.users || []).find((u) => u.role === 'Admin');
        restoreActorId = adminFromBackup?.id || null;
      }

      await tx.auditLog.create({
        data: {
          action: 'DATABASE_RESTORED',
          userId: restoreActorId,
          details: 'Admin restored database from backup file (v2.2)',
          ipAddress: ipAddress || null,
        },
      });
    },
    { timeout: 180000 },
  );

  if (data.exchangeRates && typeof data.exchangeRates === 'object') {
    await writeExchangeRatesFromBackup(data.exchangeRates);
  }

  siteConfigService.invalidateCache();
}

module.exports = {
  BACKUP_APP_NAME,
  BACKUP_VERSION,
  SUPPORTED_BACKUP_VERSIONS,
  REQUIRED_TABLES_V2,
  OPTIONAL_V2_TABLES,
  buildBackupPayload,
  gzipJson,
  parseBackupBuffer,
  validateBackupPayload,
  restoreFromPayload,
  writePreRestoreSnapshot,
  collectBackupData,
  getExchangeRates: exchangeRatesService.getExchangeRates,
};
