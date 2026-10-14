/**
 * Shared client-side product sort for listing pages.
 */

/** FNV-1a hash — works for UUID/string seeds (Number(uuid) is NaN). */
export function hashSeed(seed) {
  const str = seed == null ? '' : String(seed);
  if (!str) return (Math.random() * 0xffffffff) >>> 0 || 1;
  let h = 2166136261;
  for (let i = 0; i < str.length; i += 1) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return (h >>> 0) || 1;
}

/** Stable rank from product id + session shuffle seed. */
export function seededRank(id, seed) {
  return hashSeed(`${seed}:${id}`);
}

/** Deterministic PRNG from any seed (string UUID, number, or float). */
export function createSeededRandom(seed) {
  let s = hashSeed(seed);
  return () => {
    s = (Math.imul(s, 1664525) + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

/** Sort products by seed+id so order survives remount / API reorder / Back. */
export function rankProductsBySeed(products, seed) {
  const list = products || [];
  if (!seed) return [...list];
  return [...list].sort((a, b) => {
    const ra = seededRank(String(a.id), seed);
    const rb = seededRank(String(b.id), seed);
    if (ra !== rb) return ra - rb;
    return String(a.id).localeCompare(String(b.id));
  });
}

/**
 * Infinite-scroll friendly order: keep already-shown products in place,
 * rank only newly arrived items and append them at the bottom.
 * Prevents cards jumping among existing rows when the next page loads.
 *
 * @param {Array} products - flat list (all loaded pages)
 * @param {string|number} seed
 * @param {string[]} previousOrderedIds - ids already shown (mutated caller ref)
 * @returns {{ products: Array, orderedIds: string[] }}
 */
export function appendRankedProducts(products, seed, previousOrderedIds = []) {
  const list = products || [];
  const byId = new Map(list.map((p) => [String(p.id), p]));
  const keptIds = (previousOrderedIds || []).filter((id) => byId.has(String(id))).map(String);
  const keptSet = new Set(keptIds);
  const newcomers = list.filter((p) => !keptSet.has(String(p.id)));
  const rankedNew = seed
    ? rankProductsBySeed(newcomers, seed)
    : shuffleProducts(newcomers);
  const ordered = [...keptIds.map((id) => byId.get(id)), ...rankedNew];
  return {
    products: ordered,
    orderedIds: ordered.map((p) => String(p.id)),
  };
}

/** Fisher–Yates shuffle (new array). Optional random() for seeded shuffles. */
export function shuffleProducts(products, random = Math.random) {
  const result = [...(products || [])];
  const rand = typeof random === 'function' ? random : Math.random;
  for (let i = result.length - 1; i > 0; i -= 1) {
    const j = Math.floor(rand() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

export function sortProducts(products, sortOrder = 'default') {
  const result = [...(products || [])];

  if (sortOrder === 'price-asc') {
    result.sort((a, b) => (a.discountPrice || a.price) - (b.discountPrice || b.price));
  } else if (sortOrder === 'price-desc') {
    result.sort((a, b) => (b.discountPrice || b.price) - (a.discountPrice || a.price));
  } else if (sortOrder === 'rating') {
    result.sort((a, b) => (b.rating ?? 0) - (a.rating ?? 0));
  } else if (sortOrder === 'newest') {
    result.sort((a, b) => {
      const dateA = a.createdAt ? new Date(a.createdAt).getTime() : (a.id || 0);
      const dateB = b.createdAt ? new Date(b.createdAt).getTime() : (b.id || 0);
      return dateB - dateA;
    });
  } else if (sortOrder === 'trending') {
    result.sort((a, b) => {
      if (a.isTrending && !b.isTrending) return -1;
      if (!a.isTrending && b.isTrending) return 1;
      return 0;
    });
  } else {
    // default: keep API order here — use useListingProducts for refresh shuffle
    result.sort((a, b) => {
      if (a.isPromoted && !b.isPromoted) return -1;
      if (!a.isPromoted && b.isPromoted) return 1;
      if (a.isTrending && !b.isTrending) return -1;
      if (!a.isTrending && b.isTrending) return 1;
      return 0;
    });
  }

  return result;
}
