/** Mirrors backend/src/utils/arabicNormalize.js so client-side filters match like server search. */
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

/** True when every word of `query` appears in one of `fields` (after normalization). */
export function matchesSearch(query, ...fields) {
  const words = normalizeArabic(query).split(' ').filter(Boolean);
  if (words.length === 0) return true;
  const haystack = normalizeArabic(fields.filter(Boolean).join(' '));
  return words.every((word) => haystack.includes(word)
    || (word.startsWith('ال') && word.length > 4 && haystack.includes(word.slice(2))));
}
