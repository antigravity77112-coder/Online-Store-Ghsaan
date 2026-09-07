/**
 * slugify.js — Arabic-aware URL slug generator
 *
 * Converts Arabic/English product titles into clean, URL-safe slugs.
 * Used for SEO-friendly product URLs: /product/3tr-dyor-sawfaj-100-ml
 *
 * Features:
 * - Transliterates Arabic to Latin equivalents
 * - Handles special chars, numbers, hyphens
 * - Supports collision resolution with -2, -3 suffixes
 */

/** Arabic to Latin character transliteration table */
const ARABIC_MAP = {
  'ا': 'a', 'أ': 'a', 'إ': 'i', 'آ': 'aa', 'ب': 'b', 'ت': 't', 'ث': 'th',
  'ج': 'j', 'ح': 'h', 'خ': 'kh', 'د': 'd', 'ذ': 'z', 'ر': 'r', 'ز': 'z',
  'س': 's', 'ش': 'sh', 'ص': 's', 'ض': 'd', 'ط': 't', 'ظ': 'z', 'ع': '3',
  'غ': 'gh', 'ف': 'f', 'ق': 'q', 'ك': 'k', 'ل': 'l', 'م': 'm', 'ن': 'n',
  'ه': 'h', 'و': 'w', 'ي': 'y', 'ى': 'a', 'ة': 'h', 'ء': '', 'ئ': 'y',
  'ؤ': 'w', 'لا': 'la', 'لأ': 'la', 'لإ': 'li', 'لآ': 'laa',
  // Diacritics (tashkeel) — strip them
  'َ': '', 'ُ': '', 'ِ': '', 'ً': '', 'ٌ': '', 'ٍ': '', 'ّ': '', 'ْ': '',
};

/**
 * Converts a product title to a URL-safe slug.
 *
 * @param {string} text - Raw product title (Arabic/English/mixed)
 * @returns {string} URL-safe slug, e.g. "3tr-dyor-sawfaj-100-ml"
 */
function slugify(text) {
  if (!text || typeof text !== 'string') return '';

  let result = text;

  // Replace Arabic characters with Latin equivalents
  for (const [arabic, latin] of Object.entries(ARABIC_MAP)) {
    result = result.split(arabic).join(latin);
  }

  return result
    .toLowerCase()
    .replace(/[^\w\s-]/g, '')     // Remove non-word chars (except spaces and hyphens)
    .replace(/[\s_]+/g, '-')     // Replace spaces and underscores with hyphen
    .replace(/-+/g, '-')         // Collapse multiple hyphens
    .replace(/^-+|-+$/g, '')     // Trim leading/trailing hyphens
    .substring(0, 100);          // Max 100 chars
}

/**
 * Generates a unique slug by appending -2, -3 etc. if the base slug exists.
 *
 * @param {string} title - Product title
 * @param {import('@prisma/client').PrismaClient} prisma - Prisma client instance
 * @param {string|null} excludeId - Product ID to exclude from uniqueness check (for updates)
 * @returns {Promise<string>} Unique slug
 */
async function generateUniqueSlug(title, prisma, excludeId = null) {
  const baseSlug = slugify(title) || 'product';

  // Check if the base slug is available
  const whereClause = { slug: baseSlug };
  if (excludeId) whereClause.id = { not: excludeId };

  const existing = await prisma.product.findFirst({ where: whereClause, select: { id: true } });

  if (!existing) return baseSlug;

  // Find a unique suffix
  let counter = 2;
  while (true) {
    const candidate = `${baseSlug}-${counter}`;
    const candidateWhere = { slug: candidate };
    if (excludeId) candidateWhere.id = { not: excludeId };

    const collision = await prisma.product.findFirst({
      where: candidateWhere,
      select: { id: true }
    });

    if (!collision) return candidate;
    counter++;
  }
}

/**
 * Category slugs use the same Arabic→Latin transliteration as products
 * (e.g. "عساف" → "3saf"), so URLs stay readable and are not percent-encoded Arabic.
 */
function categorySlugFromName(name) {
  return slugify(name) || 'category';
}

async function generateUniqueCategorySlug(name, prisma, excludeId = null) {
  const baseSlug = categorySlugFromName(name);
  if (!baseSlug) return 'category';

  const whereClause = { slug: baseSlug };
  if (excludeId) whereClause.id = { not: excludeId };

  const existing = await prisma.category.findFirst({ where: whereClause, select: { id: true } });
  if (!existing) return baseSlug;

  let counter = 2;
  while (true) {
    const candidate = `${baseSlug}-${counter}`;
    const candidateWhere = { slug: candidate };
    if (excludeId) candidateWhere.id = { not: excludeId };

    const collision = await prisma.category.findFirst({
      where: candidateWhere,
      select: { id: true },
    });

    if (!collision) return candidate;
    counter++;
  }
}

module.exports = { slugify, generateUniqueSlug, categorySlugFromName, generateUniqueCategorySlug };
