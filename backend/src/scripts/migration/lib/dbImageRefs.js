/**
 * Discover all image URL references in the GISAah Postgres schema.
 */

const { PrismaClient } = require('@prisma/client');
const {
  isCloudinaryUrl,
  stripCloudinaryTransforms,
  extractPublicId,
  extractResourceType,
} = require('./urlNormalize');

const IMAGE_FIELDS = [
  { table: 'ProductImage', model: 'productImage', idField: 'id', fields: ['url'] },
  { table: 'ProductVariant', model: 'productVariant', idField: 'id', fields: ['imageUrl'] },
  { table: 'Category', model: 'category', idField: 'id', fields: ['imageUrl', 'iconUrl'] },
  { table: 'Brand', model: 'brand', idField: 'id', fields: ['logoUrl'] },
  { table: 'Scent', model: 'scent', idField: 'id', fields: ['imageUrl'] },
  { table: 'Banner', model: 'banner', idField: 'id', fields: ['imageUrl', 'mobileImageUrl'] },
  {
    table: 'SystemSetting',
    model: 'systemSetting',
    idField: 'id',
    fields: [
      'logoUrl',
      'logoDarkUrl',
      'logoMobileUrl',
      'logoMobileDarkUrl',
      'faviconUrl',
      'ogImageUrl',
    ],
  },
  { table: 'OrderItem', model: 'orderItem', idField: 'id', fields: ['productImageUrl'] },
];

/**
 * @param {import('@prisma/client').PrismaClient} [prisma]
 */
async function collectDbImageRefs(prisma) {
  const client = prisma || new PrismaClient();
  const owned = !prisma;
  /** @type {Array<{ table: string, id: string, field: string, url: string, normalizedUrl: string, publicId: string|null, resourceType: string }>} */
  const refs = [];

  try {
    for (const spec of IMAGE_FIELDS) {
      const select = { [spec.idField]: true };
      for (const f of spec.fields) select[f] = true;
      const rows = await client[spec.model].findMany({ select });
      for (const row of rows) {
        for (const field of spec.fields) {
          const url = row[field];
          if (!url || typeof url !== 'string' || !url.trim()) continue;
          const trimmed = url.trim();
          refs.push({
            table: spec.table,
            id: row[spec.idField],
            field,
            url: trimmed,
            normalizedUrl: isCloudinaryUrl(trimmed) ? stripCloudinaryTransforms(trimmed) : trimmed,
            publicId: isCloudinaryUrl(trimmed) ? extractPublicId(trimmed) : null,
            resourceType: isCloudinaryUrl(trimmed) ? extractResourceType(trimmed) : 'external',
            isCloudinary: isCloudinaryUrl(trimmed),
          });
        }
      }
    }
  } finally {
    if (owned) await client.$disconnect();
  }

  return refs;
}

module.exports = {
  IMAGE_FIELDS,
  collectDbImageRefs,
};
