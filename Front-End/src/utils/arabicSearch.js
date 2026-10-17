/**
 * Mirrors backend/src/utils/arabicNormalize.js so client-side filters
 * use whole-word style matching (no short substring stems).
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

function tokenVariants(token) {
  const base = normalizeArabic(token);
  if (!base || base.length < 2) return [];
  const variants = new Set([base]);
  if (base.startsWith('ال') && base.length > 4) variants.add(base.slice(2));
  for (const v of [...variants]) {
    if (v.endsWith('ات') && v.length > 4) variants.add(`${v.slice(0, -2)}ه`);
    if (v.endsWith('ه') && v.length >= 3) variants.add(`${v.slice(0, -1)}ات`);
  }
  return [...variants];
}

/** True when every query word matches a whole word in the haystack (or a plural/singular form). */
export function matchesSearch(query, ...fields) {
  const words = normalizeArabic(query).split(' ').filter(Boolean);
  if (words.length === 0) return true;
  const haystack = ` ${normalizeArabic(fields.filter(Boolean).join(' '))} `;
  return words.every((word) => {
    const variants = tokenVariants(word);
    return variants.some((v) => haystack.includes(` ${v} `));
  });
}
