/**
 * Live DB acceptance checks for search precision.
 *   node src/scripts/testSearchAcceptance.js
 */
require('dotenv').config();
const prisma = require('../prismaClient');
const { wordSearchIds, fuzzySearchIds } = require('../services/productService');

async function titlesFor(ids) {
  if (!ids.length) return [];
  const rows = await prisma.product.findMany({
    where: { id: { in: ids.slice(0, 10) } },
    select: { title: true, searchKeywords: true },
  });
  const order = new Map(ids.map((id, i) => [id, i]));
  return rows.sort((a, b) => (order.get(a.id) ?? 0) - (order.get(b.id) ?? 0));
}

async function runQuery(q) {
  let ids = await wordSearchIds(q, { layer: 'core', limit: 40 });
  let layer = 'core';
  if (!ids.length) {
    ids = await wordSearchIds(q, { layer: 'full', limit: 40 });
    layer = 'full';
  }
  let kind = 'exact';
  if (!ids.length) {
    ids = await fuzzySearchIds(q);
    kind = ids.length ? 'similar' : 'none';
    layer = 'fuzzy';
  }
  const rows = await titlesFor(ids);
  console.log(`\n=== ${q} (${kind}/${layer}, ${ids.length}) ===`);
  rows.forEach((r) => console.log(` - ${r.title}`));
  return { ids, rows, kind };
}

async function main() {
  const watchish = /ساع|watch|smart/i;
  for (const q of ['ساعة', 'ساعه', 'ساعات', 'ساعة ذكية', 'ساعات ذكية', 'ساعة سمارت']) {
    const { rows, kind } = await runQuery(q);
    if (kind === 'exact' && rows.length) {
      const bad = rows.filter((r) => !watchish.test(`${r.title} ${r.searchKeywords || ''}`));
      if (bad.length) {
        console.warn('WARN unrelated titles:', bad.map((b) => b.title));
      }
    }
  }
  const empty = await runQuery('xyzzyqqqnotfoundzz');
  if (empty.kind !== 'none') {
    throw new Error('expected none for nonsense query');
  }
  console.log('\nAcceptance script finished.');
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
