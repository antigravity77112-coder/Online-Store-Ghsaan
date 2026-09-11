const prisma = require('../prismaClient');
const { randomUUID } = require('crypto');
const { uploadBuffer, deleteByUrl } = require('../utils/cloudinaryClient');
const { generateUniqueSlug } = require('../utils/slugify');
const notificationService = require('./notificationService');
const { withOptionGroups } = require('../utils/variantOptions');

const SCENT_INCLUDE = {
  scents: {
    include: {
      scent: { select: { id: true, name: true, slug: true, imageUrl: true } },
    },
  },
};

const VARIANT_ATTRIBUTES_INCLUDE = {
  attributes: {
    include: {
      categoryAttribute: {
        select: {
          id: true,
          name: true,
          slug: true,
          type: true,
          scope: true,
          sortOrder: true,
        },
      },
    },
  },
};

const PRODUCT_VARIANTS_INCLUDE = {
  orderBy: { sortOrder: 'asc' },
  include: VARIANT_ATTRIBUTES_INCLUDE,
};

const PRODUCT_ATTRIBUTES_INCLUDE = {
  include: {
    categoryAttribute: {
      select: { id: true, name: true, slug: true, type: true, scope: true, isFilterable: true, sortOrder: true },
    },
  },
  orderBy: { categoryAttribute: { sortOrder: 'asc' } },
};

/** Blank / whitespace SKUs become null so Postgres unique allows multiple empties. */
function normalizeSkuValue(sku) {
  if (sku == null) return null;
  const trimmed = String(sku).trim();
  return trimmed ? trimmed : null;
}

function normalizeProductSkus(productData, variants = []) {
  const hasVariants = Boolean(productData.hasVariants) && Array.isArray(variants) && variants.length > 0;
  const normalizedVariants = variants.map((v) => ({
    ...v,
    sku: normalizeSkuValue(v.sku),
  }));
  return {
    productSku: hasVariants ? null : normalizeSkuValue(productData.sku),
    variants: normalizedVariants,
  };
}

function mapProductWithScents(product) {
  if (!product) return product;
  const scents = (product.scents || []).map((ps) => ps.scent).filter(Boolean);
  const { scents: _junction, ...rest } = product;
  return { ...rest, scents };
}

/**
 * Validate scent IDs exist and deduplicate.
 * @param {string[]} scentIds
 */
async function validateScentIds(scentIds) {
  if (!Array.isArray(scentIds) || scentIds.length === 0) return [];

  const unique = [...new Set(scentIds.filter(Boolean))];
  if (unique.length !== scentIds.filter(Boolean).length) {
    throw new Error('لا يمكن تعيين نفس الرائحة أكثر من مرة');
  }

  const found = await prisma.scent.findMany({
    where: { id: { in: unique } },
    select: { id: true },
  });

  if (found.length !== unique.length) {
    throw new Error('واحدة أو أكثر من الروائح المحددة غير موجودة');
  }

  return unique;
}

/**
 * Replace all ProductScent links for a product.
 * @param {string} productId
 * @param {string[]|undefined} scentIds
 */
async function syncProductScents(productId, scentIds) {
  if (!Array.isArray(scentIds)) return;

  const unique = await validateScentIds(scentIds);

  await prisma.productScent.deleteMany({ where: { productId } });

  if (unique.length > 0) {
    await prisma.productScent.createMany({
      data: unique.map((scentId) => ({ productId, scentId })),
      skipDuplicates: true,
    });
  }
}

// ─── Attribute Helpers ────────────────────────────────────────────────────────

/**
 * Validate an array of {categoryAttributeId, value} entries against the product's category.
 * Rules enforced:
 *   1. Each categoryAttributeId must belong to the product's categoryId.
 *   2. Scope must be PRODUCT or BOTH (not VARIANT).
 *   3. Value must satisfy the attribute's type.
 *   4. Required attributes for the category must be present.
 *
 * @param {string} categoryId - The product's categoryId
 * @param {Array}  attributes - [{categoryAttributeId, value}]
 * @throws {Error} with descriptive Arabic message on validation failure
 */
async function validateProductAttributes(categoryId, attributes) {
  if (!Array.isArray(attributes) || attributes.length === 0) {
    // Still need to check required attributes — done separately below
    attributes = [];
  }

  // Load all PRODUCT/BOTH-scoped category attributes for this category
  const catAttrs = await prisma.categoryAttribute.findMany({
    where: { categoryId, scope: { in: ['PRODUCT', 'BOTH'] } },
  });
  const catAttrMap = new Map(catAttrs.map(a => [a.id, a]));

  // Check each submitted attribute
  for (const { categoryAttributeId, value } of attributes) {
    const def = catAttrMap.get(categoryAttributeId);
    if (!def) {
      throw new Error(`الخاصية "${categoryAttributeId}" لا تنتمي لتصنيف هذا المنتج أو نطاقها غير مدعوم`);
    }
    if (value === undefined || value === null || String(value).trim() === '') {
      throw new Error(`قيمة الخاصية "${def.name}" مطلوبة`);
    }
    // Type validation
    if (def.type === 'NUMBER' && isNaN(Number(value))) {
      throw new Error(`قيمة الخاصية "${def.name}" يجب أن تكون رقماً`);
    }
    if (def.type === 'BOOLEAN' && !['true', 'false', '1', '0'].includes(String(value).toLowerCase())) {
      throw new Error(`قيمة الخاصية "${def.name}" يجب أن تكون true أو false`);
    }
  }

  // Check required attributes
  const submittedIds = new Set(attributes.map(a => a.categoryAttributeId));
  for (const def of catAttrs) {
    if (def.isRequired && !submittedIds.has(def.id)) {
      throw new Error(`الخاصية "${def.name}" مطلوبة لهذا التصنيف`);
    }
  }
}

function normalizeBooleanValue(v) {
  if (v === true || String(v).toLowerCase() === 'true' || String(v) === '1') return 'true';
  return 'false';
}

/**
 * Validate variant attributes and configurations.
 * Rules enforced:
 *   1. categoryAttributeId must belong to product's categoryId.
 *   2. Scope must be VARIANT or BOTH.
 *   3. Value must satisfy type.
 *   4. Required attributes must be present.
 *   5. Duplicate configurations (identical values for all attributes) are not allowed.
 */
async function validateVariantAttributes(categoryId, variants) {
  if (!Array.isArray(variants) || variants.length === 0) return;

  // Load all VARIANT/BOTH-scoped category attributes for this category
  const catAttrs = await prisma.categoryAttribute.findMany({
    where: { categoryId, scope: { in: ['VARIANT', 'BOTH'] } },
  });
  const catAttrMap = new Map(catAttrs.map(a => [a.id, a]));

  const configSignatures = new Set();

  for (const variant of variants) {
    const rawAttrs = Array.isArray(variant.attributes) ? variant.attributes : [];

    // Check required attributes
    const submittedIds = new Set(rawAttrs.map(a => a.categoryAttributeId));
    for (const def of catAttrs) {
      if (def.isRequired && !submittedIds.has(def.id)) {
        throw new Error(`الخاصية "${def.name}" مطلوبة لجميع المتغيرات`);
      }
    }

    const signatureParts = [];

    // Check each submitted attribute
    for (const attr of rawAttrs) {
      const def = catAttrMap.get(attr.categoryAttributeId);
      if (!def) {
        throw new Error(`الخاصية "${attr.categoryAttributeId}" لا تنتمي لتصنيف هذا المنتج أو نطاقها غير مدعوم للمتغيرات`);
      }
      if (attr.value === undefined || attr.value === null || String(attr.value).trim() === '') {
        throw new Error(`قيمة الخاصية "${def.name}" مطلوبة`);
      }
      // Type validation
      if (def.type === 'NUMBER' && isNaN(Number(attr.value))) {
        throw new Error(`قيمة الخاصية "${def.name}" يجب أن تكون رقماً`);
      }
      if (def.type === 'BOOLEAN' && !['true', 'false', '1', '0'].includes(String(attr.value).toLowerCase())) {
        throw new Error(`قيمة الخاصية "${def.name}" يجب أن تكون true أو false`);
      }

      // Prepare for duplicate config check
      let normalizedValue = String(attr.value).trim();
      if (def.type === 'BOOLEAN') normalizedValue = normalizeBooleanValue(attr.value);

      // Store in array for deterministic sorting
      signatureParts.push(`${attr.categoryAttributeId}:${normalizedValue}`);
    }

    // Sort to ensure order doesn't affect signature
    signatureParts.sort();
    const signature = signatureParts.join('|');

    // Only enforce duplicate-config check when there are actual variant attributes to compare.
    // If the category has no VARIANT/BOTH attributes defined yet, the signature is always "" for
    // every variant — do not block the seller; rely on SKU uniqueness instead.
    if (catAttrs.length > 0 && signatureParts.length > 0) {
      if (configSignatures.has(signature)) {
        throw new Error(`لا يمكن إضافة متغيرين متطابقين في المواصفات تماماً`);
      }
      configSignatures.add(signature);
    }
  }
}

/** Coerce attribute value to the canonical string form. */
function coerceAttributeValue(type, value) {
  if (type === 'BOOLEAN') return normalizeBooleanValue(value);
  if (type === 'NUMBER') return String(Number(value));
  return String(value);
}
// ─────────────────────────────────────────────────────────────────────────────

class ProductService {
  constructor() { }

  async createProduct(productData) {
    productData.id = randomUUID();
    productData.createdAt = new Date();
    productData.status = productData.status || 'Active';

    // Legacy support: if isHidden is true, map to Draft (if status not explicitly set to something else)
    if (productData.isHidden === true && !productData.status) {
      productData.status = 'Draft';
    }
    delete productData.isHidden;

    productData.slug = await generateUniqueSlug(productData.title, prisma);

    const conditionMap = { 1: 'New', 2: 'Used', 3: 'Refurbished' };
    if (productData.condition) {
      productData.condition = conditionMap[productData.condition] || productData.condition;
    }

    if (productData.isPromoted === undefined) productData.isPromoted = false;
    if (productData.isTrending === undefined) productData.isTrending = false;
    if (productData.discountPrice !== undefined && productData.discountPrice !== null) {
      productData.discountPrice = parseFloat(productData.discountPrice);
      if (productData.price && productData.discountPrice >= parseFloat(productData.price)) {
        throw new Error('سعر الخصم يجب أن يكون أقل من السعر الأصلي');
      }
    } else {
      productData.discountPrice = null;
    }
    if (!productData.promotionLabel) productData.promotionLabel = null;

    // Extract images — supports both legacy imageUrls (string[]) and structured images ([{url,altText}])
    const rawImages = (() => {
      if (Array.isArray(productData.images) && productData.images.length > 0) {
        return productData.images.map((img, idx) => ({
          url: typeof img === 'string' ? img : img.url,
          altText: (typeof img === 'object' && img.altText) ? img.altText : null,
          isPrimary: idx === 0,
          sortOrder: idx,
        }));
      }
      const urls = Array.isArray(productData.imageUrls) ? productData.imageUrls : [];
      return urls.map((url, idx) => ({ url, altText: null, isPrimary: idx === 0, sortOrder: idx }));
    })();
    delete productData.images;
    delete productData.imageUrls;

    // Extract variants
    let variants = productData.variants || [];
    delete productData.variants;

    const { productSku, variants: normalizedVariants } = normalizeProductSkus(productData, variants);
    productData.sku = productSku;
    variants = normalizedVariants;

    // Extract & validate product attributes
    const rawAttributes = Array.isArray(productData.attributes) ? productData.attributes : [];
    delete productData.attributes;

    const scentIds = Array.isArray(productData.scentIds) ? productData.scentIds : undefined;
    delete productData.scentIds;

    await validateProductAttributes(productData.categoryId, rawAttributes);

    // Validate variant attributes if product has variants
    if (productData.hasVariants && variants.length > 0) {
      await validateVariantAttributes(productData.categoryId, variants);
    }

    let product;
    try {
      product = await prisma.product.create({
        data: {
          ...productData,
          sku: productSku,
          // Auto-create ProductImage rows if images provided
          images: rawImages.length > 0
            ? { create: rawImages }
            : undefined,
          variants: productData.hasVariants && variants.length > 0
            ? {
              create: variants.map(v => ({
                sku: v.sku,
                price: parseFloat(v.price),
                discountPrice: v.discountPrice ? parseFloat(v.discountPrice) : null,
                stockQuantity: parseInt(v.stockQuantity),
                isActive: v.isActive !== undefined ? v.isActive : true,
                sortOrder: v.sortOrder || 0,
                imageUrl: v.imageUrl ? String(v.imageUrl).trim() || null : null,
                attributes: v.attributes && v.attributes.length > 0
                  ? {
                    create: v.attributes.map(attr => ({
                      categoryAttributeId: attr.categoryAttributeId,
                      value: String(attr.value),
                    }))
                  }
                  : undefined
              }))
            }
            : undefined,
          // Product-level attribute values (validated + coerced above)
          attributes: rawAttributes.length > 0
            ? {
              create: rawAttributes.map(({ categoryAttributeId, value }) => ({
                categoryAttributeId,
                value: String(value),
              }))
            }
            : undefined,
        },
        include: {
          category: { select: { name: true } },
          images: { orderBy: { sortOrder: 'asc' } },
          brand: { select: { name: true, slug: true, logoUrl: true } },
          variants: PRODUCT_VARIANTS_INCLUDE,
          attributes: PRODUCT_ATTRIBUTES_INCLUDE,
          ...SCENT_INCLUDE,
        },
      });

      if (scentIds) {
        await syncProductScents(product.id, scentIds);
        product = await prisma.product.findUnique({
          where: { id: product.id },
          include: {
            category: { select: { name: true } },
            images: { orderBy: { sortOrder: 'asc' } },
            brand: { select: { name: true, slug: true, logoUrl: true } },
            variants: PRODUCT_VARIANTS_INCLUDE,
            attributes: PRODUCT_ATTRIBUTES_INCLUDE,
            ...SCENT_INCLUDE,
          },
        });
      }
    } catch (error) {
      if (error.code === 'P2002' && error.meta?.target?.includes('sku')) {
        throw new Error('رقم الصنف (SKU) مستخدم بالفعل، يرجى اختيار رقم آخر.');
      }
      throw error;
    }

    const mapped = withOptionGroups(mapProductWithScents({ ...product, categoryName: product.category?.name || null }));
    try {
      await notificationService.notifyEngagementNewProduct(mapped);
    } catch (err) {
      console.error('[products] new product notify:', err.message);
    }
    return mapped;
  }

  async getProducts(filters, pagination) {
    const { maxPriceUsd, condition, specialOffers, trending, search, categoryName, categoryId, brandId, scentId, scentSlug, attributes: attrFilters } = filters;
    const { pageNumber = 1, pageSize = 10 } = pagination;

    // Use status instead of deprecated isHidden
    const where = { status: 'Active' };

    const conditionMap = { 1: 'New', 2: 'Used', 3: 'Refurbished' };
    if (condition !== undefined) {
      where.condition = conditionMap[condition] || condition;
    }

    if (specialOffers) {
      where.discountPrice = { not: null };
    }

    if (trending) {
      where.isTrending = true;
    }

    if (categoryName) {
      where.category = { name: { equals: categoryName } };
    }

    if (categoryId) {
      where.categoryId = categoryId;
    }

    if (brandId) {
      where.brandId = brandId;
    }

    if (scentId) {
      where.scents = { some: { scentId } };
    } else if (scentSlug) {
      where.scents = { some: { scent: { slug: scentSlug, isActive: true } } };
    }

    if (search) {
      where.OR = [
        { title: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
        // Searchable attributes
        {
          attributes: {
            some: {
              categoryAttribute: { isSearchable: true },
              value: { contains: search, mode: 'insensitive' },
            },
          },
        },
      ];
    }

    // Attribute-based filtering: ?attr[slug]=value
    // Each entry adds an AND condition requiring a ProductAttribute match
    if (attrFilters && typeof attrFilters === 'object') {
      const attrConditions = Object.entries(attrFilters)
        .filter(([, v]) => v)
        .map(([slug, value]) => ({
          attributes: {
            some: {
              categoryAttribute: { slug },
              value: { equals: value, mode: 'insensitive' },
            },
          },
        }));
      if (attrConditions.length > 0) {
        where.AND = attrConditions;
      }
    }

    // Card payload only — full gallery/scents/description load on detail endpoints
    // Skip total count (was unused) to avoid an extra DB round-trip per page
    const products = await prisma.product.findMany({
      where,
      select: {
        id: true,
        title: true,
        slug: true,
        price: true,
        discountPrice: true,
        currency: true,
        condition: true,
        status: true,
        stockQuantity: true,
        hasVariants: true,
        isPromoted: true,
        isTrending: true,
        promotionLabel: true,
        createdAt: true,
        categoryId: true,
        brandId: true,
        category: { select: { name: true } },
        images: {
          orderBy: [{ isPrimary: 'desc' }, { sortOrder: 'asc' }],
          take: 1,
          select: { id: true, url: true, isPrimary: true, sortOrder: true },
        },
        brand: { select: { name: true, slug: true } },
        variants: {
          where: { isActive: true },
          select: { stockQuantity: true },
        },
      },
      orderBy: trending
        ? [{ createdAt: 'desc' }]
        : [{ isPromoted: 'desc' }, { isTrending: 'desc' }, { createdAt: 'desc' }],
      skip: (pageNumber - 1) * pageSize,
      take: pageSize,
    });

    let filtered = products;
    if (maxPriceUsd !== undefined) {
      filtered = products.filter(p => p.currency !== 'USD' || Number(p.price) <= maxPriceUsd);
    }

    return filtered.map((p) => {
      const { variants, ...rest } = p;
      const variantStockTotal = Array.isArray(variants)
        ? variants.reduce((sum, v) => sum + (Number(v.stockQuantity) || 0), 0)
        : 0;
      const remainingStock = p.hasVariants ? variantStockTotal : (Number(p.stockQuantity) || 0);
      return {
        ...rest,
        categoryName: p.category?.name || null,
        imageUrl: p.images?.[0]?.url ?? null,
        scents: [],
        remainingStock,
      };
    });
  }

  async getProductById(id) {
    const p = await prisma.product.findUnique({
      where: { id },
      include: {
        category: { select: { name: true, slug: true } },
        images: { orderBy: { sortOrder: 'asc' } },
        brand: { select: { name: true, slug: true, logoUrl: true } },
        ...SCENT_INCLUDE,
        attributes: PRODUCT_ATTRIBUTES_INCLUDE,
        variants: PRODUCT_VARIANTS_INCLUDE,
      },
    });
    if (!p) return null;
    return withOptionGroups(mapProductWithScents({
      ...p,
      categoryName: p.category?.name || null,
      imageUrl: p.images?.[0]?.url ?? null,
    }));
  }

  async getProductBySlug(slug) {
    const p = await prisma.product.findUnique({
      where: { slug },
      include: {
        category: {
          select: {
            id: true, name: true, slug: true,
            parent: { select: { name: true, slug: true } },
          },
        },

        images: { orderBy: { sortOrder: 'asc' } },
        brand: { select: { name: true, slug: true, logoUrl: true } },
        ...SCENT_INCLUDE,
        attributes: PRODUCT_ATTRIBUTES_INCLUDE,
        variants: {
          where: { isActive: true },
          ...PRODUCT_VARIANTS_INCLUDE,
        },
        reviews: {
          where: { isApproved: true },
          orderBy: { createdAt: 'desc' },
          take: 10,
          include: { user: { select: { fullName: true } } },
        },
      },
    });
    if (!p) return null;
    return withOptionGroups(mapProductWithScents({
      ...p,
      categoryName: p.category?.name || null,
      imageUrl: p.images?.[0]?.url ?? null,
    }));
  }

  async updateProduct(id, updateData) {
    const { id: _, createdAt: __, variants, scentIds, ...dataToUpdate } = updateData;

    const existing = await prisma.product.findUnique({
      where: { id },
      select: { stockQuantity: true, title: true },
    });
    if (!existing) throw new Error('Product not found');
    const previousStock = existing.stockQuantity;

    if (dataToUpdate.title) {
      dataToUpdate.slug = await generateUniqueSlug(dataToUpdate.title, prisma, id);
    }

    // Legacy support: if isHidden is provided, map to Draft/Active
    if (dataToUpdate.isHidden !== undefined) {
      if (!dataToUpdate.status) {
        dataToUpdate.status = dataToUpdate.isHidden ? 'Draft' : 'Active';
      }
      delete dataToUpdate.isHidden;
    }

    const conditionMap = { 1: 'New', 2: 'Used', 3: 'Refurbished' };
    if (dataToUpdate.condition) {
      dataToUpdate.condition = conditionMap[dataToUpdate.condition] || dataToUpdate.condition;
    }

    if (dataToUpdate.discountPrice !== undefined) {
      if (dataToUpdate.discountPrice !== null && dataToUpdate.discountPrice !== '') {
        dataToUpdate.discountPrice = parseFloat(dataToUpdate.discountPrice);
        const originalPrice = dataToUpdate.price !== undefined
          ? parseFloat(dataToUpdate.price)
          : (await prisma.product.findUnique({ where: { id }, select: { price: true } }))?.price;
        if (originalPrice && dataToUpdate.discountPrice >= parseFloat(originalPrice)) {
          throw new Error('سعر الخصم يجب أن يكون أقل من السعر الأصلي');
        }
      } else {
        dataToUpdate.discountPrice = null;
      }
    }
    if (dataToUpdate.promotionLabel === '') dataToUpdate.promotionLabel = null;

    if (Object.prototype.hasOwnProperty.call(dataToUpdate, 'sku') || dataToUpdate.hasVariants) {
      const { productSku } = normalizeProductSkus(
        { sku: dataToUpdate.sku, hasVariants: dataToUpdate.hasVariants },
        Array.isArray(variants) ? variants : [],
      );
      dataToUpdate.sku = productSku;
    }

    // Sync images if provided — supports both legacy imageUrls (string[]) and structured images ([{url,altText}])
    const hasNewImages = dataToUpdate.images !== undefined || dataToUpdate.imageUrls !== undefined;
    if (hasNewImages) {
      const incomingImages = dataToUpdate.images;
      const incomingImageUrls = dataToUpdate.imageUrls;
      const rawImgs = (() => {
        if (Array.isArray(incomingImages) && incomingImages.length > 0) {
          return incomingImages.map((img, idx) => ({
            url: typeof img === 'string' ? img : img.url,
            altText: (typeof img === 'object' && img.altText) ? img.altText : null,
            isPrimary: idx === 0,
            sortOrder: idx,
          }));
        }
        const urls = Array.isArray(incomingImageUrls) ? incomingImageUrls : [];
        return urls.map((url, idx) => ({ url, altText: null, isPrimary: idx === 0, sortOrder: idx }));
      })();
      delete dataToUpdate.images;
      delete dataToUpdate.imageUrls;

      const explicitClear =
        (Array.isArray(incomingImages) && incomingImages.length === 0)
        || (Array.isArray(incomingImageUrls) && incomingImageUrls.length === 0);

      if (rawImgs.length > 0 || explicitClear) {
        const existingImages = await prisma.productImage.findMany({ where: { productId: id }, select: { url: true } });
        
        // Find which images were actually removed by the user
        const newImageUrls = new Set(rawImgs.map(img => img.url));
        const imagesToDeleteFromCloud = existingImages.filter(img => !newImageUrls.has(img.url));

        await prisma.productImage.deleteMany({ where: { productId: id } });
        
        // Only delete from Cloudinary the images that are no longer in the product gallery
        Promise.all(imagesToDeleteFromCloud.map(img => deleteByUrl(img.url))).catch(err =>
          console.error('[Cloudinary] Batch delete on product update failed:', err.message)
        );
        if (rawImgs.length > 0) {
          await prisma.productImage.createMany({
            data: rawImgs.map(img => ({ productId: id, ...img }))
          });
        }
      }
    }

    const effectiveCategoryId = dataToUpdate.categoryId ||
      (await prisma.product.findUnique({ where: { id }, select: { categoryId: true } }))?.categoryId;

    if (variants && Array.isArray(variants)) {
      if (dataToUpdate.hasVariants) {
        if (variants.length === 0) {
          throw new Error('يجب إضافة متغير واحد على الأقل عند تفعيل المتغيرات.');
        }

        // Normalize blank variant SKUs before uniqueness checks
        for (const v of variants) {
          v.sku = normalizeSkuValue(v.sku);
        }

        // Validate before processing
        await validateVariantAttributes(effectiveCategoryId, variants);

        // Identify incoming SKUs
        const incomingSkus = variants.map(v => v.sku).filter(Boolean);
        if (incomingSkus.length === 0) {
          throw new Error('كل متغير يحتاج رقم صنف (SKU) صالحاً.');
        }
        // Guard: Prisma `notIn: []` matches every row and would wipe all variants.
        if (incomingSkus.length !== variants.length) {
          throw new Error('كل متغير يحتاج رقم صنف (SKU) صالحاً.');
        }

        // Delete variants that were removed in the UI
        await prisma.productVariant.deleteMany({
          where: { productId: id, sku: { notIn: incomingSkus } }
        });

        // Upsert variants
        for (const v of variants) {
          const variantData = {
            price: parseFloat(v.price),
            discountPrice: v.discountPrice ? parseFloat(v.discountPrice) : null,
            stockQuantity: parseInt(v.stockQuantity),
            isActive: v.isActive !== undefined ? v.isActive : true,
            sortOrder: v.sortOrder || 0,
            imageUrl: v.imageUrl ? String(v.imageUrl).trim() || null : null,
          };

          const existingVariant = await prisma.productVariant.findUnique({ where: { sku: v.sku } });

          if (existingVariant) {
            if (existingVariant.productId !== id) {
              throw new Error(`SKU ${v.sku} مستخدم في منتج آخر.`);
            }
            await prisma.productVariant.update({
              where: { id: existingVariant.id },
              data: variantData,
            });
            // Update attributes
            if (v.attributes && Array.isArray(v.attributes)) {
              // Delete old attributes for this variant
              await prisma.variantAttribute.deleteMany({ where: { variantId: existingVariant.id } });
              // Create new attributes
              if (v.attributes.length > 0) {
                await prisma.variantAttribute.createMany({
                  data: v.attributes.map(attr => ({
                    variantId: existingVariant.id,
                    categoryAttributeId: attr.categoryAttributeId,
                    value: String(attr.value),
                  }))
                });
              }
            }
          } else {
            await prisma.productVariant.create({
              data: {
                productId: id,
                sku: v.sku,
                ...variantData,
                attributes: v.attributes && v.attributes.length > 0
                  ? {
                    create: v.attributes.map(attr => ({
                      categoryAttributeId: attr.categoryAttributeId,
                      value: String(attr.value),
                    }))
                  }
                  : undefined
              }
            });
          }
        }
      } else if (dataToUpdate.hasVariants === false) {
        // If hasVariants was toggled to false, do not delete existing variants to preserve history.
        // Instead, just mark them inactive so they don't show up on the storefront.
        await prisma.productVariant.updateMany({
          where: { productId: id },
          data: { isActive: false }
        });
      }
    }

    // Sync product attributes if provided
    if (Array.isArray(dataToUpdate.attributes)) {
      const newAttributes = dataToUpdate.attributes
        .filter((a) => a && a.categoryAttributeId && a.value !== undefined && a.value !== null && String(a.value).trim() !== '')
        .map((a) => ({
          categoryAttributeId: a.categoryAttributeId,
          value: String(a.value).trim(),
        }));
      delete dataToUpdate.attributes;

      await validateProductAttributes(effectiveCategoryId, newAttributes);

      const incomingIds = newAttributes.map((a) => a.categoryAttributeId);
      await prisma.productAttribute.deleteMany({
        where: {
          productId: id,
          ...(incomingIds.length > 0
            ? { categoryAttributeId: { notIn: incomingIds } }
            : {}),
        },
      });

      for (const { categoryAttributeId, value } of newAttributes) {
        await prisma.productAttribute.upsert({
          where: { productId_categoryAttributeId: { productId: id, categoryAttributeId } },
          create: { productId: id, categoryAttributeId, value },
          update: { value },
        });
      }
    } else {
      delete dataToUpdate.attributes;
    }

    if (Array.isArray(scentIds)) {
      await syncProductScents(id, scentIds);
    }

    let product;
    try {
      product = await prisma.product.update({
        where: { id },
        data: dataToUpdate,
        include: {
          category: { select: { name: true, slug: true } },
          brand: { select: { name: true, slug: true, logoUrl: true } },
          images: { orderBy: { sortOrder: 'asc' } },
          variants: PRODUCT_VARIANTS_INCLUDE,
          attributes: PRODUCT_ATTRIBUTES_INCLUDE,
          ...SCENT_INCLUDE,
        },
      });
    } catch (error) {
      if (error.code === 'P2002' && error.meta?.target?.includes('sku')) {
        throw new Error('رقم الصنف (SKU) مستخدم بالفعل، يرجى اختيار رقم آخر.');
      }
      throw error;
    }

    try {
      await notificationService.notifyAdminsLowStock(product, previousStock);
    } catch (err) {
      console.error('[products] low stock notify:', err.message);
    }

    return withOptionGroups(mapProductWithScents(product));
  }

  async deleteProduct(id) {
    // OrderItems: productId SET NULL (DB-level FK, automatic)
    // CartItems, Favorites, Images, Variants, Attributes, Reviews: CASCADE (automatic)
    // No manual cleanup needed anymore.
    return await prisma.product.delete({ where: { id } });
  }

  async toggleVisibility(id) {
    const product = await prisma.product.findUnique({ where: { id } });
    if (!product) throw new Error('Product not found');

    // Toggle between Active ↔ Archived using the new status field.
    const newStatus = product.status === 'Active' ? 'Archived' : 'Active';

    return await prisma.product.update({
      where: { id },
      data: { status: newStatus },
    });
  }



  async addProductImage(productId, { url, altText, isPrimary = false, sortOrder }) {
    if (isPrimary) {
      await prisma.productImage.updateMany({
        where: { productId, isPrimary: true },
        data: { isPrimary: false },
      });
    }
    let resolvedSortOrder = sortOrder;
    if (resolvedSortOrder === undefined || resolvedSortOrder === null) {
      const last = await prisma.productImage.findFirst({
        where: { productId },
        orderBy: { sortOrder: 'desc' },
        select: { sortOrder: true },
      });
      resolvedSortOrder = (last?.sortOrder ?? -1) + 1;
    }
    return prisma.productImage.create({
      data: { productId, url, altText, isPrimary, sortOrder: resolvedSortOrder },
    });
  }

  async getProductImages(productId) {
    return prisma.productImage.findMany({
      where: { productId },
      orderBy: { sortOrder: 'asc' },
    });
  }

  /**
   * Delete a product image by ID.
   * Verifies the image belongs to the given productId (security check).
   * Promotes the next remaining image to primary if the deleted one was primary.
   * Attempts to delete the asset from Cloudinary (non-fatal if it fails).
   */
  async deleteProductImage(productId, imageId) {
    // Security: verify the image actually belongs to this product
    const image = await prisma.productImage.findFirst({
      where: { id: imageId, productId },
    });
    if (!image) {
      const err = new Error('Image not found or does not belong to this product');
      err.statusCode = 404;
      throw err;
    }

    // Delete from DB
    await prisma.productImage.delete({ where: { id: imageId } });

    // If deleted image was primary, promote the lowest-sortOrder remaining image
    if (image.isPrimary) {
      const next = await prisma.productImage.findFirst({
        where: { productId },
        orderBy: { sortOrder: 'asc' },
      });
      if (next) {
        await prisma.productImage.update({ where: { id: next.id }, data: { isPrimary: true } });
      }
    }

    // Async Cloudinary cleanup (non-blocking)
    deleteByUrl(image.url).catch(err =>
      console.error(`[Cloudinary] deleteByUrl on image delete failed:`, err.message)
    );

    return { deleted: true, imageId, wasPrimary: image.isPrimary };
  }

  /**
   * Atomically set a specific image as primary for a product.
   * Clears isPrimary on all other images of the same product.
   */
  async setImagePrimary(productId, imageId) {
    const image = await prisma.productImage.findFirst({ where: { id: imageId, productId } });
    if (!image) {
      const err = new Error('Image not found or does not belong to this product');
      err.statusCode = 404;
      throw err;
    }
    // Atomic swap via transaction
    const [, updated] = await prisma.$transaction([
      prisma.productImage.updateMany({ where: { productId, isPrimary: true }, data: { isPrimary: false } }),
      prisma.productImage.update({ where: { id: imageId }, data: { isPrimary: true } }),
    ]);
    return updated;
  }

  /**
   * Reorder images by updating sortOrder for each imageId in the given ordered array.
   * orderedIds: string[] — image IDs in the desired display order (index 0 = first).
   */
  async reorderImages(productId, orderedIds) {
    if (!Array.isArray(orderedIds) || orderedIds.length === 0) return [];
    // Verify all images belong to this product
    const existing = await prisma.productImage.findMany({
      where: { productId },
      select: { id: true },
    });
    const existingIdSet = new Set(existing.map(i => i.id));
    const invalidIds = orderedIds.filter(id => !existingIdSet.has(id));
    if (invalidIds.length > 0) {
      const err = new Error('One or more image IDs do not belong to this product');
      err.statusCode = 400;
      throw err;
    }
    // Update sortOrder in a transaction
    await prisma.$transaction(
      orderedIds.map((id, index) =>
        prisma.productImage.update({ where: { id }, data: { sortOrder: index } })
      )
    );
    return this.getProductImages(productId);
  }

  async uploadImage(file) {
    if (!file || !file.buffer) throw new Error('No file uploaded');
    return uploadBuffer(file.buffer, 'products');
  }
}

module.exports = ProductService;