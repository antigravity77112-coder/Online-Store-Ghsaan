/**
 * Arabic-aware text normalization for search.
 * Matching uses whole words + full plural/singular forms (never short stems like «ساع»).
 */

const DIACRITICS = /[\u0610-\u061A\u064B-\u065F\u0670\u06D6-\u06ED]/g;
const TATWEEL = /\u0640/g;

/** Minimum length for a searchable whole-word variant. */
const MIN_WORD_LENGTH = 2;

/** Separator between core index and description index inside Product.searchText. */
const SEARCH_TEXT_SEP = '|||';

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

/**
 * Commerce synonym groups (normalized forms).
 * Any member expands to the whole group for matching.
 */
const SYNONYM_GROUPS = [
  ['ساعه', 'ساعات'],
  ['ذكي', 'ذكيه', 'سمارت', 'smart'],
  ['شاشه', 'شاشات', 'screen'],
  ['لعبه', 'العاب', 'toys', 'toy'],
];

const SYNONYM_LOOKUP = (() => {
  const map = new Map();
  for (const group of SYNONYM_GROUPS) {
    const normalizedGroup = [...new Set(group.map((w) => normalizeArabic(w)).filter(Boolean))];
    for (const word of normalizedGroup) {
      map.set(word, normalizedGroup);
    }
  }
  return map;
})();

/**
 * Strip duration/time noise before indexing (display fields untouched).
 * Prevents «خلال ساعة» / «5-8 ساعات» (battery runtime) from matching watch queries.
 */
function stripSearchNoise(text) {
  if (!text) return '';
  return String(text)
    .replace(/خلال\s*ساع[ةه](?:\s*واحدة)?/gi, ' ')
    .replace(/في\s*ساع[ةه](?:\s*واحدة)?/gi, ' ')
    .replace(/within\s*an?\s*hour/gi, ' ')
    .replace(/\b\d+\s*hours?\b/gi, ' ')
    // Spec durations: «2 3 ساعات», «5-8 ساعات», «99 ساعة»
    .replace(/\d+\s*[-–ـ]?\s*\d*\s*ساع(?:ة|ه|ات)/gi, ' ')
    .replace(/وقت\s*(?:التشغيل|الشحن|الاستخدام)\s*[:：]?\s*[^\n|]*/gi, ' ');
}

/** @deprecated use stripSearchNoise */
function stripDescriptionSearchNoise(text) {
  return stripSearchNoise(text);
}

/**
 * Full-word spellings for one normalized token:
 * article ال, plural↔singular (ات ↔ ه), synonym group — never 3-letter stems.
 */
function tokenVariants(token) {
  const base = normalizeArabic(token);
  if (!base || base.length < MIN_WORD_LENGTH) return [];

  const variants = new Set();

  const add = (word) => {
    const w = normalizeArabic(word);
    if (w && w.length >= MIN_WORD_LENGTH) variants.add(w);
  };

  add(base);
  if (base.startsWith('ال') && base.length > 4) add(base.slice(2));
  else if (base.length >= 3) add(`ال${base}`);

  for (const v of [...variants]) {
    if (v.endsWith('ات') && v.length > 4) {
      add(`${v.slice(0, -2)}ه`); // ساعات → ساعه
    }
    if (v.endsWith('ه') && v.length >= 3) {
      add(`${v.slice(0, -1)}ات`); // ساعه → ساعات
    }
  }

  for (const v of [...variants]) {
    const group = SYNONYM_LOOKUP.get(v);
    if (group) group.forEach(add);
  }

  return [...variants];
}

/** Query tokens → each is a list of accepted whole-word spellings. Max 6 words. */
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

/** Space-padded normalized text for whole-word matching. */
function padSearchText(normalized) {
  const n = normalizeArabic(normalized);
  if (!n) return '';
  return ` ${n} `;
}

/**
 * Build stored searchText: `paddedCore|||paddedDescription`
 * Core = title, keywords, sku, brand, categories, attribute values, specs.
 */
function composeStoredSearchText(coreParts, descriptionParts = []) {
  const core = padSearchText(buildSearchText(coreParts));
  const desc = padSearchText(buildSearchText(descriptionParts));
  if (!core && !desc) return null;
  return `${core || ' '}${SEARCH_TEXT_SEP}${desc || ' '}`;
}

function splitStoredSearchText(stored) {
  if (!stored || typeof stored !== 'string') {
    return { core: '', full: '', raw: '' };
  }
  if (!stored.includes(SEARCH_TEXT_SEP)) {
    const padded = stored.startsWith(' ') ? stored : padSearchText(stored);
    return { core: padded, full: padded, raw: stored };
  }
  const [corePart, descPart = ''] = stored.split(SEARCH_TEXT_SEP);
  const core = corePart || '';
  const desc = descPart || '';
  const full = padSearchText(`${core} ${desc}`);
  return { core, full, raw: stored };
}

module.exports = {
  normalizeArabic,
  tokenVariants,
  searchTokens,
  buildSearchText,
  stripSearchNoise,
  stripDescriptionSearchNoise,
  padSearchText,
  composeStoredSearchText,
  splitStoredSearchText,
  SEARCH_TEXT_SEP,
  MIN_WORD_LENGTH,
};
