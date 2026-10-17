/**
 * Quick unit checks for search normalization (no DB).
 *   node src/scripts/testSearchNormalize.js
 */
const {
  normalizeArabic,
  tokenVariants,
  searchTokens,
  stripSearchNoise,
  composeStoredSearchText,
} = require('../utils/arabicNormalize');

function assert(cond, msg) {
  if (!cond) throw new Error(msg);
}

// Plural / singular full words — never short stem «ساع»
const watchVars = tokenVariants('ساعة');
assert(watchVars.includes('ساعه'), 'ساعة → ساعه');
assert(watchVars.includes('ساعات'), 'ساعة → ساعات');
assert(!watchVars.includes('ساع'), 'must NOT stem to ساع');

const watchesVars = tokenVariants('ساعات');
assert(watchesVars.includes('ساعه'), 'ساعات → ساعه');

const hayHelp = ` ${normalizeArabic('مساعدة في الاستخدام')} `;
assert(!watchVars.some((v) => hayHelp.includes(` ${v} `)), 'مساعدة must not whole-word match ساعة variants');

// Smart watch synonyms
const smartTokens = searchTokens('ساعة سمارت');
assert(smartTokens.length === 2, 'two tokens');
assert(smartTokens[1].includes('ذكي') || smartTokens[1].includes('ذكيه'), 'سمارت → ذكي');

// Duration noise strip (shipping + battery «ساعات»)
const cleaned = stripSearchNoise('منتج رائع. التوصيل خلال ساعة');
assert(!normalizeArabic(cleaned).includes('ساعه'), 'strip خلال ساعة');
const battery = stripSearchNoise('وقت التشغيل 5 8 ساعات الجهد 7 4v');
assert(!normalizeArabic(battery).includes('ساعات'), 'strip battery ساعات');

const stored = composeStoredSearchText(
  ['ساعة رجالية ذهبية'],
  [stripSearchNoise('خلال ساعة توصيل')],
);
assert(stored.includes('|||'), 'core|||desc format');
assert(stored.split('|||')[0].includes('ساعه'), 'core has watch');
assert(!stored.split('|||')[1].includes('ساعه'), 'desc noise stripped');

console.log('OK — search normalize checks passed');
console.log('ساعة variants:', watchVars);
console.log('ساعة سمارت tokens:', smartTokens);
