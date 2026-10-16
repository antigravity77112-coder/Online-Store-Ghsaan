/**
 * Arabic-aware text normalization for search.
 * Both the stored Product.searchText and the user's query go through normalizeArabic,
 * so «لعبة» / «لعبه» and «أحمر» / «احمر» match each other.
 */

const DIACRITICS = /[\u0610-\u061A\u064B-\u065F\u0670\u06D6-\u06ED]/g;
const TATWEEL = /\u0640/g;

/** Substring stems shorter than this over-match the catalog. */
const MIN_VARIANT_LENGTH = 3;

function normalizeArabic(value) {
  if (value == null) return '';
  return String(value)
    .toLowerCase()
    .replace(DIACRITICS, '')
    .replace(TATWEEL, '')
    .replace(/[أإآٱ]/g, 'ا')
    .replace(/ة/g, 'ه')
    .replace(/ى/g, 'ي')
    .replace(/ؤ/g, 'و')
    .replace(/ئ/g, 'ي')
    .replace(/[٠-٩]/g, (d) => String(d.charCodeAt(0) - 0x0660))
    .replace(/[^\p{L}\p{N}]+/gu, ' ')
    .trim()
    .replace(/\s+/g, ' ');
}

const SUFFIXES = ['ات', 'ين', 'ون', 'ان', 'ه'];

/**
 * Spellings of one normalized query word that should still match it:
 * with / without the article «ال» and common plural / feminine suffixes.
 * Short stems (&lt; 3 chars) are dropped — they match too broadly via contains.
 */
function tokenVariants(token) {
  const variants = new Set();
  if (!token || token.length < MIN_VARIANT_LENGTH) return [];

  const stems = [token];
  if (token.startsWith('ال') && token.length > 4) stems.push(token.slice(2));
  for (const stem of stems) {
    if (stem.length >= MIN_VARIANT_LENGTH) variants.add(stem);
    for (const suffix of SUFFIXES) {
      if (stem.endsWith(suffix) && stem.length - suffix.length >= MIN_VARIANT_LENGTH) {
        variants.add(stem.slice(0, -suffix.length));
      }
    }
  }
  return [...variants].filter((v) => v.length >= MIN_VARIANT_LENGTH);
}

/** Normalized query words (max 6), each with its accepted spellings (non-empty only). */
function searchTokens(query) {
  return normalizeArabic(query)
    .split(' ')
    .filter(Boolean)
    .slice(0, 6)
    .map(tokenVariants)
    .filter((variants) => variants.length > 0);
}

function buildSearchText(parts) {
  return normalizeArabic(parts.filter(Boolean).join(' '));
}

module.exports = {
  normalizeArabic,
  tokenVariants,
  searchTokens,
  buildSearchText,
  MIN_VARIANT_LENGTH,
};
