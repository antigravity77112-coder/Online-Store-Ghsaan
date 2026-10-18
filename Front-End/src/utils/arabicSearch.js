/**
 * Client-side Arabic-aware filter helpers for admin/storefront pickers.
 * Product catalog search precision lives on the backend; these helpers are for
 * typing into local lists (categories, brands) where substring match is expected.
 */

export function normalizeArabic(value) {
  if (value == null) return '';
  return String(value)
    .toLowerCase()
    .replace(/[\u0610-\u061A\u064B-\u065F\u0670\u06D6-\u06ED]/g, '')
    .replace(/\u0640/g, '')
    .replace(/[أإآٱ]/g, 'ا')
    .replace(/ة/g, 'ه')
    .replace(/ى/g, 'ي')
    .replace(/ؤ/g, 'و')
    .replace(/ئ/g, 'ي')
    .replace(/[^\p{L}\p{N}]+/gu, ' ')
    .trim()
    .replace(/\s+/g, ' ');
}

/**
 * True when every query word is a substring of the normalized haystack.
 * Empty / whitespace-only query matches everything (show full list).
 */
export function matchesSearch(query, ...fields) {
  const words = normalizeArabic(query).split(' ').filter(Boolean);
  if (words.length === 0) return true;
  const haystack = normalizeArabic(fields.filter(Boolean).join(' '));
  if (!haystack) return false;
  return words.every((word) => haystack.includes(word));
}
