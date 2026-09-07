const prisma = require('../prismaClient');
const { randomUUID } = require('crypto');

// Valid enum values (mirror Prisma schema)
const VALID_TYPES  = ['TEXT', 'NUMBER', 'BOOLEAN', 'SELECT', 'MULTI_SELECT'];
const VALID_SCOPES = ['PRODUCT', 'VARIANT', 'BOTH'];

/**
 * Convert a name to a URL-safe slug.
 * e.g. "Fragrance Family" → "fragrance-family"
 */
function toSlug(name) {
  return name
    .toLowerCase()
    .trim()
    .replace(/[\u0600-\u06FF]+/g, (m) => m) // keep Arabic chars
    .replace(/[^a-z0-9\u0600-\u06FF]+/gi, '-')
    .replace(/^-+|-+$/g, '')
    .replace(/-{2,}/g, '-');
}

/**
 * Ensure a slug is unique within the given category.
 * If the base slug is taken (by a different record), appends -2, -3, etc.
 */
async function ensureUniqueSlug(categoryId, baseSlug, excludeId = null) {
  let slug = baseSlug;
  let attempt = 1;
  while (true) {
    const existing = await prisma.categoryAttribute.findFirst({
      where: {
        categoryId,
        slug,
        ...(excludeId ? { id: { not: excludeId } } : {}),
      },
      select: { id: true },
    });
    if (!existing) return slug;
    attempt++;
    slug = `${baseSlug}-${attempt}`;
  }
}

/**
 * Parse and validate the options field for SELECT/MULTI_SELECT.
 * Accepts a JSON array string or a comma-separated string.
 * Returns a JSON string or null.
 */
function parseOptions(type, options) {
  if (!['SELECT', 'MULTI_SELECT'].includes(type)) return null;
  if (!options) return null;

  // Already a JSON array string
  if (typeof options === 'string' && options.trim().startsWith('[')) {
    try {
      const parsed = JSON.parse(options);
      if (!Array.isArray(parsed)) throw new Error('options must be an array');
      return JSON.stringify(parsed.map(String).filter(Boolean));
    } catch {
      throw new Error('حقل الخيارات يجب أن يكون مصفوفة JSON أو قيم مفصولة بفاصلة');
    }
  }

  // Comma-separated string
  if (typeof options === 'string') {
    const arr = options.split(',').map(s => s.trim()).filter(Boolean);
    if (arr.length === 0) throw new Error('يجب توفير خيار واحد على الأقل');
    return JSON.stringify(arr);
  }

  // Already an array (from JSON body)
  if (Array.isArray(options)) {
    const arr = options.map(String).filter(Boolean);
    return JSON.stringify(arr);
  }

  return null;
}

class CategoryAttributeService {

  /**
   * Fetch all attributes for a category, ordered by sortOrder.
   * Optionally filter by scope (e.g. 'PRODUCT,BOTH' for seller form).
   */
  async getByCategory(categoryId, { scopeFilter } = {}) {
    const where = { categoryId };
    if (scopeFilter) {
      const scopes = scopeFilter.split(',').map(s => s.trim().toUpperCase()).filter(s => VALID_SCOPES.includes(s));
      if (scopes.length > 0) where.scope = { in: scopes };
    }
    return prisma.categoryAttribute.findMany({
      where,
      orderBy: { sortOrder: 'asc' },
    });
  }

  /**
   * Create a new CategoryAttribute.
   * Validates category exists, generates slug, enforces uniqueness.
   */
  async create(categoryId, data) {
    const category = await prisma.category.findUnique({ where: { id: categoryId }, select: { id: true } });
    if (!category) {
      const err = new Error('التصنيف غير موجود');
      err.statusCode = 404;
      throw err;
    }

    const { name, type = 'TEXT', scope = 'PRODUCT', isRequired = false,
            isFilterable = false, isSearchable = false, sortOrder = 0, options } = data;

    if (!name || !name.trim()) throw new Error('اسم الخاصية مطلوب');
    if (!VALID_TYPES.includes(type))  throw new Error(`نوع الخاصية غير صالح: ${type}`);
    if (!VALID_SCOPES.includes(scope)) throw new Error(`نطاق الخاصية غير صالح: ${scope}`);

    const baseSlug = data.slug ? toSlug(data.slug) : toSlug(name);
    const slug = await ensureUniqueSlug(categoryId, baseSlug);
    const parsedOptions = parseOptions(type, options);

    return prisma.categoryAttribute.create({
      data: {
        id: randomUUID(),
        categoryId,
        name: name.trim(),
        slug,
        type,
        scope,
        isRequired,
        isFilterable,
        isSearchable,
        sortOrder: parseInt(sortOrder) || 0,
        options: parsedOptions,
      },
    });
  }

  /**
   * Update an existing CategoryAttribute.
   * Verifies the attribute belongs to the given category.
   */
  async update(categoryId, attrId, data) {
    const existing = await prisma.categoryAttribute.findFirst({
      where: { id: attrId, categoryId },
    });
    if (!existing) {
      const err = new Error('الخاصية غير موجودة أو لا تنتمي لهذا التصنيف');
      err.statusCode = 404;
      throw err;
    }

    const { name, type, scope, isRequired, isFilterable, isSearchable, sortOrder, options } = data;
    const updates = {};

    if (name !== undefined) {
      updates.name = name.trim();
      // Regenerate slug only if name changed and no explicit slug provided
      if (data.slug !== undefined) {
        updates.slug = await ensureUniqueSlug(categoryId, toSlug(data.slug), attrId);
      } else if (name.trim() !== existing.name) {
        updates.slug = await ensureUniqueSlug(categoryId, toSlug(name), attrId);
      }
    }
    if (data.slug !== undefined && name === undefined) {
      updates.slug = await ensureUniqueSlug(categoryId, toSlug(data.slug), attrId);
    }

    if (type !== undefined) {
      if (!VALID_TYPES.includes(type)) throw new Error(`نوع الخاصية غير صالح: ${type}`);
      updates.type = type;
    }
    if (scope !== undefined) {
      if (!VALID_SCOPES.includes(scope)) throw new Error(`نطاق الخاصية غير صالح: ${scope}`);
      updates.scope = scope;
    }
    if (isRequired  !== undefined) updates.isRequired  = Boolean(isRequired);
    if (isFilterable !== undefined) updates.isFilterable = Boolean(isFilterable);
    if (isSearchable !== undefined) updates.isSearchable = Boolean(isSearchable);
    if (sortOrder   !== undefined) updates.sortOrder   = parseInt(sortOrder) || 0;

    const effectiveType = type ?? existing.type;
    const effectiveOptions = options !== undefined ? options : existing.options;
    updates.options = parseOptions(effectiveType, effectiveOptions);

    return prisma.categoryAttribute.update({ where: { id: attrId }, data: updates });
  }

  /**
   * Delete a CategoryAttribute.
   * ProductAttributes cascade-delete automatically (onDelete: Cascade in schema).
   * Returns the count of affected products for the caller to communicate to the admin.
   */
  async delete(categoryId, attrId) {
    const existing = await prisma.categoryAttribute.findFirst({
      where: { id: attrId, categoryId },
      include: { _count: { select: { productAttributes: true } } },
    });
    if (!existing) {
      const err = new Error('الخاصية غير موجودة أو لا تنتمي لهذا التصنيف');
      err.statusCode = 404;
      throw err;
    }

    const affectedProducts = existing._count.productAttributes;
    await prisma.categoryAttribute.delete({ where: { id: attrId } });

    return { deleted: true, attrId, affectedProducts };
  }

  /**
   * Reorder attributes for a category by updating sortOrder.
   * orderedIds: string[] — attribute IDs in desired display order (index 0 = first).
   */
  async reorder(categoryId, orderedIds) {
    if (!Array.isArray(orderedIds) || orderedIds.length === 0) return [];

    const existing = await prisma.categoryAttribute.findMany({
      where: { categoryId },
      select: { id: true },
    });
    const existingIdSet = new Set(existing.map(a => a.id));
    const invalidIds = orderedIds.filter(id => !existingIdSet.has(id));
    if (invalidIds.length > 0) {
      const err = new Error('بعض معرّفات الخصائص لا تنتمي لهذا التصنيف');
      err.statusCode = 400;
      throw err;
    }

    await prisma.$transaction(
      orderedIds.map((id, index) =>
        prisma.categoryAttribute.update({ where: { id }, data: { sortOrder: index } })
      )
    );

    return this.getByCategory(categoryId);
  }
}

module.exports = new CategoryAttributeService();
