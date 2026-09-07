const fs = require('fs');
const path = require('path');
const zlib = require('zlib');
const { Prisma } = require('@prisma/client');
const prisma = require('../prismaClient');
const exchangeRatesService = require('./exchangeRatesService');

const BACKUP_APP_NAME = 'Gisaah_Store';
const BACKUP_VERSION = '2.0';
const LEGACY_BACKUP_VERSION = '1.0';

/** Tables required in a v2 backup payload (excluding sidecar exchangeRates). */
const REQUIRED_TABLES_V2 = [
  'users',
  'brands',
  'scents',
  'categories',
  'categoryAttributes',
  'products',
  'productImages',
  'productVariants',
  'variantAttributes',
  'productAttributes',
  'productScents',
  'reviews',
  'branches',
  'systemSettings',
  'banners',
  'orders',
  'orderItems',
  'cartItems',
  'favorites',
];

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
  productImage: 'ProductImage',
  productVariant: 'ProductVariant',
  variantAttribute: 'VariantAttribute',
  productAttribute: 'ProductAttribute',
  productScent: 'ProductScent',
  review: 'Review',
  order: 'Order',
  orderItem: 'OrderItem',
  cartItem: 'CartItem',
  favorite: 'Favorite',
  auditLog: 'AuditLog',
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
  const productImages = await prisma.productImage.findMany();
  const productVariants = await prisma.productVariant.findMany();
  const variantAttributes = await prisma.variantAttribute.findMany();
  const productAttributes = await prisma.productAttribute.findMany();
  const productScents = await prisma.productScent.findMany();
  const reviews = await prisma.review.findMany();
  const branches = await prisma.branch.findMany();
  const systemSettings = await prisma.systemSetting.findMany();
  const banners = await prisma.banner.findMany();
  const orders = await prisma.order.findMany();
  const orderItems = await prisma.orderItem.findMany();
  const cartItems = await prisma.cartItem.findMany();
  const favorites = await prisma.favorite.findMany();
  const exchangeRates = await readExchangeRatesForBackup();

  return toPlain({
    users,
    brands,
    scents,
    categories,
    categoryAttributes,
    products,
    productImages,
    productVariants,
    variantAttributes,
    productAttributes,
    productScents,
    reviews,
    branches,
    systemSettings,
    banners,
    orders,
    orderItems,
    cartItems,
    favorites,
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

function validateBackupPayload(backupPayload) {
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
      'هذه نسخة قديمة (v1.0) ناقصة جداول الكتالوج. صدّر نسخة جديدة v2.0 أو استعد عبر pg_dump.',
    );
    err.statusCode = 400;
    throw err;
  }
  if (metadata.version !== BACKUP_VERSION) {
    const err = new Error('إصدار ملف النسخ الاحتياطي غير متوافق');
    err.statusCode = 400;
    throw err;
  }
  for (const table of REQUIRED_TABLES_V2) {
    if (!Array.isArray(data[table])) {
      const err = new Error(`الجدول المطلوب مفقود أو غير صالح: ${table}`);
      err.statusCode = 400;
      throw err;
    }
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
  await tx.orderItem.deleteMany();
  await tx.cartItem.deleteMany();
  await tx.favorite.deleteMany();
  await tx.review.deleteMany();
  await tx.productScent.deleteMany();
  await tx.variantAttribute.deleteMany();
  await tx.productAttribute.deleteMany();
  await tx.productImage.deleteMany();
  await tx.productVariant.deleteMany();
  await tx.order.deleteMany();
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

/**
 * Add newer catalog columns when the DB was created from older migrations.
 * Safe to run on every restore; uses IF NOT EXISTS.
 */
async function ensureOptionalRestoreColumns(tx) {
  const optionalColumns = [
    { table: 'CategoryAttribute', column: 'options', ddl: 'TEXT' },
    { table: 'ProductVariant', column: 'imageUrl', ddl: 'TEXT' },
    { table: 'Product', column: 'isTrending', ddl: 'BOOLEAN NOT NULL DEFAULT false' },
    { table: 'Banner', column: 'peekProductIds', ddl: 'JSONB' },
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

/**
 * WARNING: Destructive. Wipes listed store tables then reloads from backup.
 * Never run against production unless you intend a full replace.
 */
async function restoreFromPayload(backupPayload, { adminUserId = null, ipAddress = null } = {}) {
  validateBackupPayload(backupPayload);
  const { data } = backupPayload;

  await writePreRestoreSnapshot();

  const existingAuditLogs = await prisma.auditLog.findMany();
  const categories = sortCategoriesParentsFirst(data.categories || []);

  await prisma.$transaction(
    async (tx) => {
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
      await insertMany(tx, 'product', data.products);
      await insertMany(tx, 'productImage', data.productImages);
      await insertMany(tx, 'productVariant', data.productVariants);
      await insertMany(tx, 'variantAttribute', data.variantAttributes);
      await insertMany(tx, 'productAttribute', data.productAttributes);
      await insertMany(tx, 'productScent', data.productScents);
      await insertMany(tx, 'review', data.reviews);
      await insertMany(tx, 'order', data.orders);
      await insertMany(tx, 'orderItem', data.orderItems);
      await insertMany(tx, 'cartItem', data.cartItems);
      await insertMany(tx, 'favorite', data.favorites);

      if (existingAuditLogs.length > 0) {
        const validUserIds = new Set((data.users || []).map((u) => u.id));
        const adjustedLogs = existingAuditLogs.map((log) => ({
          ...toPlain(log),
          userId: log.userId && validUserIds.has(log.userId) ? log.userId : null,
        }));
        await insertMany(tx, 'auditLog', adjustedLogs);
      }

      await tx.auditLog.create({
        data: {
          action: 'DATABASE_RESTORED',
          userId: adminUserId || null,
          details: 'Admin restored database from backup file (v2.0)',
          ipAddress: ipAddress || null,
        },
      });
    },
    { timeout: 120000 },
  );

  if (data.exchangeRates && typeof data.exchangeRates === 'object') {
    await writeExchangeRatesFromBackup(data.exchangeRates);
  }
}

module.exports = {
  BACKUP_APP_NAME,
  BACKUP_VERSION,
  REQUIRED_TABLES_V2,
  buildBackupPayload,
  gzipJson,
  parseBackupBuffer,
  validateBackupPayload,
  restoreFromPayload,
  writePreRestoreSnapshot,
  collectBackupData,
  getExchangeRates: exchangeRatesService.getExchangeRates,
};
